/**
 * UI Helper Utilities
 * Toast notifications, modals, loading states, etc.
 */
const TOAST_TIMERS = Object.freeze({
  success: 2500,
  info: 2500,
  warning: 4500,
  error: 4500
});

let appAlertsPromise;

function moduleAssetUrl(relativePath) {
  return new URL(relativePath, import.meta.url).href;
}

function loadAlertStyle(href, name) {
  const selector = `link[data-madis-alert-asset="${name}"]`;
  if (document.querySelector(selector)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    style.dataset.madisAlertAsset = name;
    style.onload = resolve;
    style.onerror = () => {
      style.remove();
      reject(new Error(`Gagal memuat ${name}.`));
    };
    document.head.appendChild(style);
  });
}

function loadAlertScript(href) {
  if (window.Swal) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-madis-alert-asset="script"]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = href;
    script.dataset.madisAlertAsset = 'script';
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error('Gagal memuat SweetAlert2.'));
    };
    document.head.appendChild(script);
  });
}

export function ensureAppAlerts() {
  if (appAlertsPromise) return appAlertsPromise;

  const vendorStyle = moduleAssetUrl('../../assets/vendor/sweetalert2/sweetalert2.min.css');
  const appStyle = moduleAssetUrl('../../css/alerts.css');
  const script = moduleAssetUrl('../../assets/vendor/sweetalert2/sweetalert2.all.min.js');

  appAlertsPromise = Promise.all([
    loadAlertStyle(vendorStyle, 'vendor-style'),
    loadAlertStyle(appStyle, 'app-style'),
    loadAlertScript(script)
  ]).then(() => {
    if (!window.Swal) throw new Error('SweetAlert2 tidak tersedia.');
    return window.Swal.mixin({
      buttonsStyling: false,
      customClass: {
        popup: 'madis-alert-popup',
        icon: 'madis-alert-icon',
        title: 'madis-alert-title',
        htmlContainer: 'madis-alert-body',
        actions: 'madis-alert-actions',
        confirmButton: 'madis-alert-button madis-alert-button-confirm',
        cancelButton: 'madis-alert-button madis-alert-button-cancel'
      }
    });
  }).catch(error => {
    appAlertsPromise = null;
    throw error;
  });

  return appAlertsPromise;
}

// SECURITY: fallback uses textContent for all user-facing text.
function showFallbackToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  const icon = iconMap[type] || 'ℹ';

  // Create elements using DOM API instead of innerHTML to prevent XSS
  const container = document.createElement('div');
  container.className = 'flex items-start gap-3';

  // Icon container
  const iconContainer = document.createElement('div');
  const iconBgClass =
    type === 'success' ? 'bg-success text-white' :
    type === 'error' ? 'bg-danger text-white' :
    type === 'warning' ? 'bg-warning text-white' :
    'bg-primary-500 text-white';
  iconContainer.className = `flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${iconBgClass}`;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'text-sm font-bold';
  iconSpan.textContent = icon;  // textContent auto-escapes
  iconContainer.appendChild(iconSpan);

  // Message container
  const messageDiv = document.createElement('div');
  messageDiv.className = 'flex-1';
  const messageP = document.createElement('p');
  messageP.className = 'text-sm font-medium text-gray-900';
  messageP.textContent = String(message ?? '');  // SAFE: textContent auto-escapes HTML
  messageDiv.appendChild(messageP);

  // Close button
  const closeButton = document.createElement('button');
  closeButton.className = 'flex-shrink-0 text-gray-400 hover:text-gray-600';
  closeButton.setAttribute('aria-label', 'Close notification');
  closeButton.innerHTML = `
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
    </svg>
  `;
  closeButton.onclick = () => toast.remove();

  // Assemble
  container.appendChild(iconContainer);
  container.appendChild(messageDiv);
  container.appendChild(closeButton);
  toast.appendChild(container);

  document.body.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

export function showToast(message, type = 'info') {
  const icon = TOAST_TIMERS[type] ? type : 'info';
  const timer = TOAST_TIMERS[icon];

  void ensureAppAlerts().then(Swal => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      showCloseButton: true,
      timer,
      timerProgressBar: true,
      customClass: {
        popup: 'madis-alert-popup madis-alert-toast',
        icon: 'madis-alert-toast-icon',
        title: 'madis-alert-toast-title',
        closeButton: 'madis-alert-toast-close',
        timerProgressBar: 'madis-alert-progress'
      },
      didOpen: toast => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
        toast.addEventListener('focusin', Swal.stopTimer);
        toast.addEventListener('focusout', Swal.resumeTimer);
      }
    });
    return Toast.fire({ icon, title: String(message ?? '') });
  }).catch(() => showFallbackToast(message, icon));
}

// Modal Management
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    // Focus trap
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto';
  }
}

// Loading State
export function showLoading(containerId = 'main-content') {
  const container = document.getElementById(containerId);
  if (container) {
    const loader = document.createElement('div');
    loader.id = 'loading-spinner';
    loader.className = 'flex items-center justify-center py-12';
    loader.innerHTML = `
      <div class="spinner"></div>
    `;
    container.appendChild(loader);
  }
}

export function hideLoading() {
  const loader = document.getElementById('loading-spinner');
  if (loader) {
    loader.remove();
  }
}

// SECURITY: fallback uses textContent and defaults to cancellation.
function showFallbackDialog({
  title,
  text,
  confirmButtonText,
  cancelButtonText,
  destructive,
  showCancelButton
}) {
  return new Promise(resolve => {
    document.getElementById('confirm-dialog')?.remove();
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'confirm-dialog';

    const modal = document.createElement('div');
    modal.className = 'modal max-w-md';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'modal-header';
    const heading = document.createElement('h3');
    heading.className = 'text-lg font-semibold text-gray-900';
    heading.textContent = title;
    header.appendChild(heading);

    const body = document.createElement('div');
    body.className = 'modal-body';
    const messageP = document.createElement('p');
    messageP.className = 'text-gray-700';
    messageP.textContent = text;
    body.appendChild(messageP);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'confirm-cancel';
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = cancelButtonText;

    const okButton = document.createElement('button');
    okButton.id = 'confirm-ok';
    okButton.className = `btn ${destructive ? 'btn-danger' : 'btn-primary'}`;
    okButton.textContent = confirmButtonText;

    if (showCancelButton) footer.appendChild(cancelButton);
    footer.appendChild(okButton);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    let settled = false;
    const finish = isConfirmed => {
      if (settled) return;
      settled = true;
      overlay.remove();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      previousFocus?.focus?.();
      resolve({ isConfirmed, isDismissed: !isConfirmed });
    };

    okButton.addEventListener('click', () => finish(true));
    cancelButton.addEventListener('click', () => finish(false));

    function handleEscape(event) {
      if (event.key === 'Escape') {
        finish(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    (showCancelButton ? cancelButton : okButton).focus();
  });
}

export async function showAlert({
  icon = 'info',
  title = 'Informasi',
  text = '',
  confirmButtonText = 'Tutup',
  allowOutsideClick = false
} = {}) {
  try {
    const Swal = await ensureAppAlerts();
    return await Swal.fire({
      icon,
      title,
      text: String(text ?? ''),
      confirmButtonText,
      allowOutsideClick,
      focusConfirm: true
    });
  } catch (error) {
    return showFallbackDialog({
      title,
      text: String(text ?? ''),
      confirmButtonText,
      cancelButtonText: 'Batal',
      destructive: false,
      showCancelButton: false
    });
  }
}

export async function showConfirm({
  icon = 'warning',
  title = 'Konfirmasi',
  text = '',
  confirmButtonText = 'Ya, Lanjutkan',
  cancelButtonText = 'Batal',
  destructive = true
} = {}) {
  try {
    const Swal = await ensureAppAlerts();
    const result = await Swal.fire({
      icon,
      title,
      text: String(text ?? ''),
      confirmButtonText,
      cancelButtonText,
      showCancelButton: true,
      allowOutsideClick: false,
      focusCancel: true,
      customClass: {
        popup: 'madis-alert-popup',
        icon: 'madis-alert-icon',
        title: 'madis-alert-title',
        htmlContainer: 'madis-alert-body',
        actions: 'madis-alert-actions',
        confirmButton: `madis-alert-button ${destructive ? 'madis-alert-button-danger' : 'madis-alert-button-confirm'}`,
        cancelButton: 'madis-alert-button madis-alert-button-cancel'
      }
    });
    return result.isConfirmed;
  } catch (error) {
    const result = await showFallbackDialog({
      title,
      text: String(text ?? ''),
      confirmButtonText,
      cancelButtonText,
      destructive,
      showCancelButton: true
    });
    return result.isConfirmed;
  }
}

export function confirmDialog(message, onConfirm, onCancel = null) {
  void showConfirm({ text: message }).then(confirmed => {
    if (confirmed) onConfirm?.();
    else onCancel?.();
  }).catch(() => onCancel?.());
}

// Format numbers
export function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('id-ID').format(num);
}

// Escape HTML
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Get status badge HTML
export function getStatusBadge(status) {
  const badges = {
    'Fit': '<span class="badge badge-success">Fit</span>',
    'Follow-Up': '<span class="badge badge-warning">Follow-Up</span>',
    'Unfit': '<span class="badge badge-danger">Unfit</span>',
    'Active': '<span class="badge badge-success">Active</span>',
    'Inactive': '<span class="badge badge-danger">Inactive</span>'
  };
  return badges[status] || `<span class="badge badge-primary">${status}</span>`;
}

// Pagination helper
export function paginate(array, page, perPage) {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    data: array.slice(start, end),
    total: array.length,
    page: page,
    perPage: perPage,
    totalPages: Math.ceil(array.length / perPage)
  };
}

// Sort array of objects
export function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Export to CSV
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'warning');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const cell = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        return typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
          ? `"${cell.replace(/"/g, '""')}"`
          : cell;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();

  showToast('Data berhasil diekspor', 'success');
}

// Generate table HTML
export function generateTable(data, columns, actions = null) {
  if (!data || data.length === 0) {
    return '<div class="text-center py-8 text-gray-500">Tidak ada data</div>';
  }

  let html = '<div class="table-container"><table class="table"><thead><tr>';

  // Headers
  columns.forEach(col => {
    html += `<th>${col.label}</th>`;
  });
  if (actions) {
    html += '<th>Aksi</th>';
  }
  html += '</tr></thead><tbody>';

  // Rows
  data.forEach((row, index) => {
    html += '<tr>';
    columns.forEach(col => {
      let value = row[col.field];
      if (col.format) {
        value = col.format(value, row);
      }
      html += `<td>${value || '-'}</td>`;
    });

    if (actions) {
      html += `<td>${actions(row, index)}</td>`;
    }
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// Hide admin-only menu items based on user role
export function hideAdminMenuForNonAdmin(user) {
  if (!user) return;

  // Hide admin menus for non-Admin users
  if (user.role !== 'Admin') {
    const kelolaUserMenu = document.getElementById('menu-kelola-user');
    if (kelolaUserMenu) {
      kelolaUserMenu.style.display = 'none';
    }

    const activityLogMenu = document.getElementById('menu-activity-log');
    if (activityLogMenu) {
      activityLogMenu.style.display = 'none';
    }
  }
}
