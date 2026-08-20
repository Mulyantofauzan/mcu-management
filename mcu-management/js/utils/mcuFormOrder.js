function directField(form, suffix) {
  return form.querySelector(`[id$="${suffix}"]`)?.closest('div') || null;
}

function appendField(form, suffix, target) {
  const field = directField(form, suffix);
  if (field && target) target.append(field);
  return field;
}

export function sortByMcuOrder(nodes) {
  return [...nodes].sort(
    (left, right) => Number(left.dataset.mcuOrder) - Number(right.dataset.mcuOrder)
  );
}

export function applyCanonicalMcuFormOrder(root = document) {
  root.querySelectorAll('form[data-mcu-canonical-order]').forEach((form) => {
    const metadata = form.querySelector('[data-mcu-target="metadata"]');
    const lab = form.querySelector('[data-mcu-target="laboratory"]');
    const supporting = form.querySelector('[data-mcu-target="supporting"]');

    appendField(form, '-doctor', metadata);
    appendField(form, '-hbsag', lab);
    appendField(form, '-napza', lab);

    const colorBlind = directField(form, '-colorblind');
    if (colorBlind) {
      colorBlind.dataset.mcuOrder = '52';
      colorBlind.classList.add('mb-4');
      form.append(colorBlind);
    }

    ['-ekg', '-treadmill', '-xray'].forEach((suffix) => {
      appendField(form, suffix, supporting);
    });

    const children = [...form.children];
    const footer = children.find((node) => node.classList.contains('modal-footer')) || null;
    const orderedNodes = children.filter((node) => node.dataset.mcuOrder);
    sortByMcuOrder(orderedNodes).forEach((node) => {
      form.insertBefore(node, footer);
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyCanonicalMcuFormOrder(), { once: true });
  } else {
    applyCanonicalMcuFormOrder();
  }
}
