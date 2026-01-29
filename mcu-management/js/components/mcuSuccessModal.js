/**
 * MCU Success Modal Component
 * Displays success message with MCU details after adding new MCU
 * Auto-dismisses after configurable timeout
 */

class MCUSuccessModal {
  constructor() {
    this.modalId = 'mcu-success-modal';
    this.autoDismissTimeout = null;
  }

  getResultColor(result) {
    const colorMap = {
      'Fit': 'bg-green-100 text-green-800 border-green-200',
      'Fit with Note': 'bg-blue-100 text-blue-800 border-blue-200',
      'Follow Up': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Unfit': 'bg-red-100 text-red-800 border-red-200',
      'Temporary Unfit': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colorMap[result] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getResultIcon(result) {
    const iconMap = {
      'Fit': '✅',
      'Fit with Note': '📝',
      'Follow Up': '⚠️',
      'Unfit': '❌',
      'Temporary Unfit': '🚫'
    };
    return iconMap[result] || 'ℹ️';
  }

  show(employeeName, mcuType, mcuResult, autoDismissSeconds = 3) {
    if (this.autoDismissTimeout) clearTimeout(this.autoDismissTimeout);

    const existingModal = document.getElementById(this.modalId);
    if (existingModal) existingModal.remove();

    const resultColor = this.getResultColor(mcuResult);
    const resultIcon = this.getResultIcon(mcuResult);

    const modalHTML = `
      <div id="${this.modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
           style="animation: fadeIn 0.2s ease-out;">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 transform"
             style="animation: slideUp 0.3s ease-out;">

          <!-- Success Icon -->
          <div class="flex justify-center mb-6">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
                 style="animation: scaleIn 0.5s ease-out;">
              <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-2xl font-bold text-center text-gray-900 mb-2">
            MCU Berhasil Disimpan!
          </h3>

          <!-- Details Card -->
          <div class="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
            <!-- Employee Name -->
            <div class="flex items-start gap-3">
              <span class="text-2xl">👤</span>
              <div class="flex-1">
                <p class="text-xs text-gray-500 font-medium mb-1">Nama Karyawan</p>
                <p class="text-base font-semibold text-gray-900">${employeeName}</p>
              </div>
            </div>

            <!-- MCU Type -->
            <div class="flex items-start gap-3">
              <span class="text-2xl">📋</span>
              <div class="flex-1">
                <p class="text-xs text-gray-500 font-medium mb-1">Jenis MCU</p>
                <p class="text-base font-semibold text-gray-900">${mcuType}</p>
              </div>
            </div>

            <!-- MCU Result -->
            <div class="flex items-start gap-3">
              <span class="text-2xl">${resultIcon}</span>
              <div class="flex-1">
                <p class="text-xs text-gray-500 font-medium mb-2">Hasil MCU</p>
                <span class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold border-2 ${resultColor}">
                  ${mcuResult}
                </span>
              </div>
            </div>
          </div>

          <!-- Auto-close message -->
          <p class="text-center text-sm text-gray-500 mb-4">
            Popup akan tertutup otomatis dalam ${autoDismissSeconds} detik
          </p>

          <!-- Close Button -->
          <button onclick="window.mcuSuccessModal.hide()"
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
            Tutup
          </button>
        </div>
      </div>

      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    this.autoDismissTimeout = setTimeout(() => {
      this.hide();
    }, autoDismissSeconds * 1000);
  }

  hide() {
    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }

    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.style.animation = 'fadeOut 0.2s ease-out';
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = 'auto';
      }, 200);
    }
  }
}

export const mcuSuccessModal = new MCUSuccessModal();
window.mcuSuccessModal = mcuSuccessModal;
export default MCUSuccessModal;
