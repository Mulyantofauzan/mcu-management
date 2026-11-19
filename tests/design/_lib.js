const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../design/sehatra');

function listPages() {
  return fs.readdirSync(ROOT).filter(name => name.endsWith('.html')).sort();
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function tokens(css, theme) {
  const block = theme === 'dark'
    ? css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)
    : css.match(/:root\s*\{([^}]*)\}/);
  const out = {};
  if (!block) return out;
  for (const [, name, hex] of block[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) {
    out[name] = hex.toUpperCase();
  }
  return out;
}

function luminance(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(hexA, hexB) {
  const [a, b] = [luminance(hexA), luminance(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

module.exports = { ROOT, listPages, read, tokens, ratio };
