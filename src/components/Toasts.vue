<script setup lang="ts">
import { useToasts } from '@/composables/useToast';

const toasts = useToasts();
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.toast {
  min-width: 220px;
  max-width: 380px;
  background: #fff;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(18, 28, 45, 0.16);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-1);
}
.toast.success {
  border-left-color: var(--success);
}
.toast.error {
  border-left-color: var(--danger);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
