export const MB = 1024 * 1024;
export const PDF_PASSTHROUGH_BYTES = 3 * MB;
export const PDF_STORED_MAX_BYTES = 5 * MB;
export const PDF_SOURCE_MAX_BYTES = 25 * MB;

export const PDF_COMPRESSION_PROFILES = Object.freeze([
  Object.freeze({ id: 'adaptive', dpi: 160, quality: 0.78, rasterizeAll: false }),
  Object.freeze({ id: 'tight-adaptive', dpi: 135, quality: 0.68, rasterizeAll: false }),
  Object.freeze({ id: 'full-raster', dpi: 120, quality: 0.60, rasterizeAll: true })
]);

export const PDF_ERROR_CODES = Object.freeze({
  CANCELLED: 'PDF_COMPRESSION_CANCELLED',
  CORRUPT: 'PDF_CORRUPT',
  ENCRYPTED: 'PDF_ENCRYPTED',
  INVALID_TYPE: 'PDF_INVALID_TYPE',
  SOURCE_TOO_LARGE: 'PDF_SOURCE_TOO_LARGE',
  RESULT_TOO_LARGE: 'PDF_RESULT_TOO_LARGE',
  WORKER_UNAVAILABLE: 'PDF_WORKER_UNAVAILABLE',
  PROCESSING_FAILED: 'PDF_PROCESSING_FAILED'
});

export function getPdfSizePolicy(size) {
  if (!Number.isFinite(size) || size <= 0) return 'invalid';
  if (size > PDF_SOURCE_MAX_BYTES) return 'reject';
  if (size <= PDF_PASSTHROUGH_BYTES) return 'passthrough';
  return 'compress';
}

export function hasPdfHeader(bytes) {
  if (!bytes || bytes.length < 5) return false;
  return bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d;
}

export function multiplyTransforms(left, right) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5]
  ];
}

export function estimateImageCoverage(operatorList, ops, pageWidth, pageHeight) {
  if (!operatorList || !ops || pageWidth <= 0 || pageHeight <= 0) {
    return { imageCount: 0, imageCoverage: 0 };
  }

  const imageOps = new Set([
    ops.paintImageMaskXObject,
    ops.paintImageXObject,
    ops.paintInlineImageXObject,
    ops.paintSolidColorImageMask
  ]);
  const stack = [];
  let transform = [1, 0, 0, 1, 0, 0];
  let imageCount = 0;
  let imageArea = 0;

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const operation = operatorList.fnArray[index];
    if (operation === ops.save) {
      stack.push(transform.slice());
      continue;
    }
    if (operation === ops.restore) {
      transform = stack.pop() || [1, 0, 0, 1, 0, 0];
      continue;
    }
    if (operation === ops.transform) {
      const args = operatorList.argsArray[index];
      if (Array.isArray(args) && args.length >= 6) {
        transform = multiplyTransforms(transform, args);
      }
      continue;
    }
    if (imageOps.has(operation)) {
      imageCount += 1;
      imageArea += Math.abs(transform[0] * transform[3] - transform[1] * transform[2]);
    }
  }

  return {
    imageCount,
    imageCoverage: Math.min(1, imageArea / (pageWidth * pageHeight))
  };
}

export function classifyPdfPage({ textCharacters = 0, imageCount = 0, imageCoverage = 0 }) {
  if (imageCount === 0 || imageCoverage < 0.35) return 'text';
  if (imageCoverage >= 0.72) return 'scan';
  if (imageCoverage >= 0.55 && textCharacters < 600) return 'scan';
  if (textCharacters >= 120) return 'text';
  return 'ambiguous';
}

export function shouldAcceptPdfCandidate(size, pageCount, expectedPageCount) {
  return Number.isInteger(size)
    && size > 0
    && size <= PDF_STORED_MAX_BYTES
    && Number.isInteger(pageCount)
    && pageCount > 0
    && pageCount === expectedPageCount;
}
