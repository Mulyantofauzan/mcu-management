const test = require('node:test');
const assert = require('node:assert/strict');
const { read, tokens, ratio } = require('./_lib');

const css = read('sehatra.css');

const TEXT_PAIRS = [
  ['--fg', '--bg'],
  ['--fg', '--surface'],
  ['--muted', '--bg'],
  ['--muted', '--surface'],
  ['--muted', '--surface-2'],
  ['--faint', '--surface'],
  ['--accent-ink', '--accent'],
  ['--accent-strong', '--accent-soft'],
  ['--accent-strong', '--surface'],
  ['--good', '--good-bg'],
  ['--info', '--info-bg'],
  ['--warn', '--warn-bg'],
  ['--crit', '--crit-bg'],
  ['--crit-ink', '--crit']
];

for (const theme of ['light', 'dark']) {
  const t = tokens(css, theme);
  for (const [fg, bg] of TEXT_PAIRS) {
    test(`${theme}: ${fg} on ${bg} meets WCAG AA text contrast (4.5)`, () => {
      assert.ok(t[fg] && t[bg], `missing token ${fg} or ${bg} in ${theme} theme`);
      const value = ratio(t[fg], t[bg]);
      assert.ok(value >= 4.5, `${fg} ${t[fg]} on ${bg} ${t[bg]} = ${value.toFixed(2)}`);
    });
  }
  test(`${theme}: --accent on --surface meets non-text contrast (3)`, () => {
    assert.ok(t['--accent'] && t['--surface'], `missing token in ${theme} theme`);
    const value = ratio(t['--accent'], t['--surface']);
    assert.ok(value >= 3, `--accent ${t['--accent']} on --surface ${t['--surface']} = ${value.toFixed(2)}`);
  });
}
