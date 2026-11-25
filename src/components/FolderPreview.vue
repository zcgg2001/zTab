<script setup lang="ts">
import { computed } from 'vue';
import type { Bookmark } from '../types';
const props = defineProps<{ items: Bookmark[]; size: string }>();
const capacity = computed(() => (props.size === '2x4' ? 8 : 4));
const overflow = computed(() => props.items.length > capacity.value && props.size !== '1x1');
const main = computed(() =>
  props.items.slice(0, overflow.value ? capacity.value - 1 : capacity.value),
);
const extra = computed(() => props.items.slice(capacity.value - 1, capacity.value + 3));
</script>

<template>
  <div class="folder-preview" :class="`folder-${size}`">
    <div v-for="item in main" :key="item.id" class="folder-icon">
      <img :src="item.src || '/favicon.svg'" :alt="item.name" draggable="false" />
    </div>
    <div v-if="overflow" class="folder-mini">
      <img
        v-for="item in extra"
        :key="item.id"
        :src="item.src || '/favicon.svg'"
        :alt="item.name"
        draggable="false"
      />
    </div>
  </div>
</template>
