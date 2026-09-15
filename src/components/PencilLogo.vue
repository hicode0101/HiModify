<script setup lang="ts">
defineProps<{ size?: number }>();
</script>

<template>
  <!-- 渐变铅笔 Logo：几何与 scripts/generate-icons.mjs 保持一致 -->
  <svg
    viewBox="0 0 128 128"
    :width="size ?? 54"
    :height="size ?? 54"
    aria-hidden="true"
    class="pencil-logo"
  >
    <defs>
      <linearGradient id="hm-pencil-grad" x1="20" y1="108" x2="108" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#22C55E" />
        <stop offset="0.3" stop-color="#F59E0B" />
        <stop offset="0.55" stop-color="#EF4444" />
        <stop offset="0.78" stop-color="#A855F7" />
        <stop offset="1" stop-color="#3B82F6" />
      </linearGradient>
    </defs>
    <g fill="url(#hm-pencil-grad)">
      <path d="M20 108 L50.41 101.64 L26.36 77.59 Z" />
      <path d="M53.23 98.81 L97.08 54.97 L73.03 30.93 L29.19 66.28 Z" />
      <path d="M75.86 28.10 L99.90 52.14 L108.39 43.65 A17 17 0 0 0 84.35 19.61 Z" />
    </g>
  </svg>
</template>

<style scoped>
.pencil-logo {
  display: block;
  flex: none;
}
</style>
