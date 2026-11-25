<script setup lang="ts">
defineProps<{ type?: string; size?: number }>();
</script>
<template>
  <svg :width="size || 28" :height="size || 28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <g v-if="type !== 'fog'">
      <g stroke="#ffcf00" stroke-width="1.5">
        <path d="M24 3v5M24 40v5M3 24h5M40 24h5M9 9l4 4M35 35l4 4M9 39l4-4M35 13l4-4" />
      </g>
      <circle cx="24" cy="24" r="11" fill="#ffca24" stroke="#ffad13" stroke-width="2" />
    </g>
    <g v-if="type === 'cloud' || type === 'fog'">
      <path
        d="M11 33a8 8 0 0 1-1-16 10 10 0 0 1 19-3 7 7 0 0 1 10 10 5 5 0 0 1-2 9Z"
        fill="#99e1f4"
      />
      <path d="M10 27a5 5 0 0 1 1-10 9 9 0 0 1 16-3c-4 0-7 5-5 9a5 5 0 0 1-4 4Z" fill="#d7f3ff" />
    </g>
    <path
      v-if="type === 'fog'"
      d="M4 31h40M9 36h29M14 41h18"
      stroke="#56c7e8"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>
