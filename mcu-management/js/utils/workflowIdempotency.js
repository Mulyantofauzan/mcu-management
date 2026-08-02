export class WorkflowIdempotencyStore {
  constructor() {
    this.keys = new Map();
  }

  get(scope) {
    if (!this.keys.has(scope)) {
      this.keys.set(scope, crypto.randomUUID());
    }
    return this.keys.get(scope);
  }

  clear(scope) {
    this.keys.delete(scope);
  }

  clearAll() {
    this.keys.clear();
  }
}

export const workflowIdempotency = new WorkflowIdempotencyStore();
