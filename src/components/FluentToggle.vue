<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();
</script>

<template>
  <button
    type="button"
    class="fl-switch"
    :class="{ on: modelValue }"
    :disabled="disabled"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="thumb"></span>
  </button>
</template>

<style scoped>
.fl-switch {
  position: relative;
  width: 40px;
  height: 20px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: #fff;
  cursor: pointer;
  padding: 0;
  flex: none;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.fl-switch .thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-2);
  transition: left 0.15s ease, background 0.15s ease;
}
.fl-switch.on {
  background: var(--accent);
  border-color: var(--accent);
}
.fl-switch.on .thumb {
  left: 22px;
  background: #fff;
}
.fl-switch:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
