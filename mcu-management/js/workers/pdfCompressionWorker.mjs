import * as pdfjsLib from '../../assets/vendor/pdfjs/pdf.min.mjs';
import { PDFDocument } from '../../assets/vendor/pdf-lib/pdf-lib.esm.min.js';
import {
  PDF_COMPRESSION_PROFILES,
  PDF_ERROR_CODES,
  PDF_STORED_MAX_BYTES,
  classifyPdfPage,
  estimateImageCoverage,
  getPdfSizePolicy,
  hasPdfHeader,
  shouldAcceptPdfCandidate
} from '../services/pdfCompressionPolicy.mjs';

const PDFJS_ROOT = new URL('../../assets/vendor/pdfjs/', import.meta.url);
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', PDFJS_ROOT).href;

class WorkerCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) throw new Error('Ukuran canvas PDF tidak valid.');
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }

  reset(canvasAndContext, width, height) {
    if (!canvasAndContext?.canvas || width <= 0 || height <= 0) {
      throw new Error('Canvas PDF tidak dapat di-reset.');
    }
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    if (!canvasAndContext?.canvas) return;
    canvasAndContext.canvas.width = 1;
    canvasAndContext.canvas.height = 1;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function report(data) {
  self.postMessage({ type: 'progress', ...data });
}

function textLength(textContent) {
  return (textContent?.items || []).reduce(
    (total, item) => total + String(item?.str || '').trim().length,
    0
  );
}

function effectivePdfLibSize(page) {
  const angle = ((page.getRotation().angle % 360) + 360) % 360;
  const width = page.getWidth();
  const height = page.getHeight();
  return angle === 90 || angle === 270
    ? { width: height, height: width }
    : { width, height };
}

function dimensionsMatch(left, right) {
  const tolerance = 0.5;
  return Math.abs(left.width - right.width) <= tolerance
    && Math.abs(left.height - right.height) <= tolerance;
}

async function renderPageAsJpeg(page, outputDocument, profile) {
  if (typeof OffscreenCanvas === 'undefined') {
    fail(PDF_ERROR_CODES.WORKER_UNAVAILABLE, 'Browser tidak mendukung pemrosesan PDF aman.');
  }

  const displayViewport = page.getViewport({ scale: 1 });
  let renderScale = profile.dpi / 72;
  let viewport = page.getViewport({ scale: renderScale });
  const maxPixels = 16 * 1024 * 1024;
  const pixels = viewport.width * viewport.height;
  if (pixels > maxPixels) {
    renderScale *= Math.sqrt(maxPixels / pixels);
    viewport = page.getViewport({ scale: renderScale });
  }

  const canvas = new OffscreenCanvas(
    Math.max(1, Math.ceil(viewport.width)),
    Math.max(1, Math.ceil(viewport.height))
  );
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    fail(PDF_ERROR_CODES.WORKER_UNAVAILABLE, 'Canvas pemrosesan PDF tidak tersedia.');
  }

  await page.render({
    canvasContext: context,
    viewport,
    background: 'rgb(255,255,255)'
  }).promise;

  const jpegBlob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: profile.quality
  });
  const jpeg = await outputDocument.embedJpg(await jpegBlob.arrayBuffer());
  const outputPage = outputDocument.addPage([displayViewport.width, displayViewport.height]);
  outputPage.drawImage(jpeg, {
    x: 0,
    y: 0,
    width: displayViewport.width,
    height: displayViewport.height
  });
  canvas.width = 1;
  canvas.height = 1;
}

async function classifyPage(page) {
  const viewport = page.getViewport({ scale: 1 });
  const [textContent, operatorList] = await Promise.all([
    page.getTextContent(),
    page.getOperatorList()
  ]);
  const imageMetrics = estimateImageCoverage(
    operatorList,
    pdfjsLib.OPS,
    viewport.width,
    viewport.height
  );
  return classifyPdfPage({
    textCharacters: textLength(textContent),
    ...imageMetrics
  });
}

async function buildCandidate(renderDocument, sourceDocument, profile) {
  const outputDocument = await PDFDocument.create();
  const totalPages = renderDocument.numPages;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await renderDocument.getPage(pageNumber);
    try {
      const classification = profile.rasterizeAll ? 'scan' : await classifyPage(page);
      if (classification === 'scan') {
        await renderPageAsJpeg(page, outputDocument, profile);
      } else {
        const [copiedPage] = await outputDocument.copyPages(sourceDocument, [pageNumber - 1]);
        outputDocument.addPage(copiedPage);
      }
      report({
        phase: profile.id,
        page: pageNumber,
        totalPages,
        classification
      });
    } finally {
      page.cleanup();
    }
  }

  return outputDocument.save({
    addDefaultPage: false,
    useObjectStreams: true,
    updateFieldAppearances: false,
    objectsPerTick: 25
  });
}

async function validateCandidate(candidate, sourceDocument) {
  const validated = await PDFDocument.load(candidate, { updateMetadata: false });
  const expectedPages = sourceDocument.getPageCount();
  if (!shouldAcceptPdfCandidate(candidate.length, validated.getPageCount(), expectedPages)) {
    return false;
  }

  const sourcePages = sourceDocument.getPages();
  const candidatePages = validated.getPages();
  return candidatePages.every((page, index) => dimensionsMatch(
    effectivePdfLibSize(page),
    effectivePdfLibSize(sourcePages[index])
  ));
}

function normalizeError(error) {
  if (error?.code && Object.values(PDF_ERROR_CODES).includes(error.code)) {
    return { code: error.code, message: error.message };
  }
  if (error?.name === 'PasswordException' || /encrypted|password/i.test(error?.message || '')) {
    return { code: PDF_ERROR_CODES.ENCRYPTED, message: 'PDF terkunci dengan kata sandi.' };
  }
  if (['InvalidPDFException', 'FormatError', 'EncryptedPDFError'].includes(error?.name)) {
    return { code: PDF_ERROR_CODES.CORRUPT, message: 'PDF rusak atau tidak dapat dibaca.' };
  }
  return { code: PDF_ERROR_CODES.PROCESSING_FAILED, message: 'PDF gagal diproses.' };
}

async function preparePdf(buffer, fileName) {
  const original = new Uint8Array(buffer);
  if (!hasPdfHeader(original)) {
    fail(PDF_ERROR_CODES.CORRUPT, 'File tidak memiliki struktur PDF yang valid.');
  }

  const sizePolicy = getPdfSizePolicy(original.length);
  if (sizePolicy === 'reject') {
    fail(PDF_ERROR_CODES.SOURCE_TOO_LARGE, 'Ukuran PDF melebihi 25 MB.');
  }
  if (sizePolicy === 'invalid') {
    fail(PDF_ERROR_CODES.CORRUPT, 'PDF kosong atau tidak valid.');
  }

  report({ phase: 'analyzing', page: 0, totalPages: 0 });
  const sourceDocument = await PDFDocument.load(original.slice(), { updateMetadata: false });
  if (sourceDocument.isEncrypted) {
    fail(PDF_ERROR_CODES.ENCRYPTED, 'PDF terkunci dengan kata sandi.');
  }

  const loadingTask = pdfjsLib.getDocument({
    data: original.slice(),
    cMapUrl: new URL('cmaps/', PDFJS_ROOT).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('standard_fonts/', PDFJS_ROOT).href,
    wasmUrl: new URL('wasm/', PDFJS_ROOT).href,
    CanvasFactory: WorkerCanvasFactory,
    disableFontFace: true,
    useWorkerFetch: false,
    useSystemFonts: false
  });

  let renderDocument;
  try {
    renderDocument = await loadingTask.promise;
    if (renderDocument.numPages < 1 || renderDocument.numPages !== sourceDocument.getPageCount()) {
      fail(PDF_ERROR_CODES.CORRUPT, 'Jumlah halaman PDF tidak valid.');
    }

    if (sizePolicy === 'passthrough') {
      return {
        bytes: original,
        compressed: false,
        method: 'passthrough',
        pageCount: renderDocument.numPages,
        fileName
      };
    }

    for (const profile of PDF_COMPRESSION_PROFILES) {
      const candidate = await buildCandidate(renderDocument, sourceDocument, profile);
      if (candidate.length <= PDF_STORED_MAX_BYTES
        && await validateCandidate(candidate, sourceDocument)) {
        if (original.length <= PDF_STORED_MAX_BYTES && candidate.length >= original.length) {
          return {
            bytes: original,
            compressed: false,
            method: 'passthrough',
            pageCount: renderDocument.numPages,
            fileName
          };
        }
        return {
          bytes: candidate,
          compressed: true,
          method: profile.id,
          pageCount: renderDocument.numPages,
          fileName
        };
      }
    }

    fail(
      PDF_ERROR_CODES.RESULT_TOO_LARGE,
      'PDF tetap melebihi 5 MB pada batas kualitas yang aman.'
    );
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}

self.addEventListener('message', async (event) => {
  if (event.data?.action !== 'prepare') return;

  try {
    const result = await preparePdf(event.data.buffer, event.data.fileName);
    report({ phase: 'validating', page: result.pageCount, totalPages: result.pageCount });
    const bytes = result.bytes instanceof Uint8Array ? result.bytes : new Uint8Array(result.bytes);
    self.postMessage({
      type: 'complete',
      compressed: result.compressed,
      method: result.method,
      pageCount: result.pageCount,
      fileName: result.fileName,
      buffer: bytes.buffer
    }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({ type: 'error', ...normalizeError(error) });
  }
});
