const listeners = new Set();

export function subscribeToToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitToast(toast) {
  listeners.forEach((fn) => fn(toast));
}
