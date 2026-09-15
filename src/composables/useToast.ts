import { ref } from 'vue';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const toasts = ref<Toast[]>([]);
let seq = 1;

export function useToasts() {
  return toasts;
}

export function toast(message: string, type: Toast['type'] = 'info', duration = 3500) {
  const id = seq++;
  toasts.value.push({ id, type, message });
  setTimeout(() => {
    const i = toasts.value.findIndex((t) => t.id === id);
    if (i >= 0) toasts.value.splice(i, 1);
  }, duration);
}
