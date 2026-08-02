import { authService } from './authService.js';

const API_URL = '/api/workflow';

export class WorkflowApiError extends Error {
  constructor(payload = {}, status = 500) {
    super(payload.message || 'Terjadi kesalahan saat memproses workflow.');
    this.name = 'WorkflowApiError';
    this.code = payload.code || 'WORKFLOW_INTERNAL_ERROR';
    this.status = status;
    this.requestId = payload.requestId || null;
    this.details = payload.details || null;
  }
}

class WorkflowService {
  constructor() {
    this.pendingMutations = new Map();
  }

  async request(action, payload = {}, method = 'GET') {
    const token = authService.getAccessToken();
    if (!token) {
      throw new WorkflowApiError({
        code: 'WORKFLOW_UNAUTHORIZED',
        message: 'Sesi tidak valid atau sudah berakhir.'
      }, 401);
    }

    const options = {
      method,
      headers: { Authorization: `Bearer ${token}` }
    };
    let url = API_URL;

    if (method === 'GET') {
      const query = new URLSearchParams({ action });
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value));
        }
      });
      url += `?${query}`;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify({ action, ...payload });
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (cause) {
      throw new WorkflowApiError({
        code: 'WORKFLOW_NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'
      }, 0);
    }

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      throw new WorkflowApiError(result || {
        code: 'WORKFLOW_INTERNAL_ERROR',
        message: 'Respons server tidak dapat dibaca.'
      }, response.status);
    }
    return result.data;
  }

  get(action, payload = {}) {
    return this.request(action, payload, 'GET');
  }

  mutate(action, payload, pendingKey = action) {
    if (this.pendingMutations.has(pendingKey)) {
      return this.pendingMutations.get(pendingKey);
    }
    const promise = this.request(action, payload, 'POST')
      .finally(() => this.pendingMutations.delete(pendingKey));
    this.pendingMutations.set(pendingKey, promise);
    return promise;
  }

  isPending(pendingKey) {
    return this.pendingMutations.has(pendingKey);
  }

  bootstrap() { return this.get('bootstrap'); }
  doctorQueue() { return this.get('doctor-queue'); }
  petugasQueue() { return this.get('petugas-queue'); }
  reviewDetail(mcuId) { return this.get('review-detail', { mcuId }); }
  reviewHistory(mcuId) { return this.get('review-history', { mcuId }); }
  joiningQueue(history = false) {
    return this.get(history ? 'joining-history' : 'joining-queue');
  }
  doctorProfile() { return this.get('doctor-profile'); }
  settings() { return this.get('settings'); }
  expiryPreview(expiryMonths) { return this.get('expiry-preview', { expiryMonths }); }
}

export const workflowService = new WorkflowService();
