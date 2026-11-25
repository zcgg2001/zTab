<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, X } from 'lucide-vue-next';
import { childrenOf, state } from '../state';
import type { Bookmark } from '../types';
import FolderPreview from './FolderPreview.vue';
import WidgetCard from './WidgetCard.vue';
const props = defineProps<{ item: Bookmark; editing?: boolean }>();
const emit = defineEmits<{
  activate: [item: Bookmark];
  edit: [item: Bookmark];
  remove: [item: Bookmark];
  move: [source: string, target: string];
}>();
const size = computed(() => props.item.size || '1x1');
const dimensions = computed(() => size.value.split('x').map(Number));
const style = computed(() => ({
  gridColumn: `span ${dimensions.value[1]}`,
  gridRow: `span ${dimensions.value[0]}`,
  height: `${dimensions.value[0] * 97 - 17}px`,
}));
function drag(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.item.id);
    event.dataTransfer.effectAllowed = 'move';
  }
}
function drop(event: DragEvent) {
  if (props.editing) emit('move', event.dataTransfer?.getData('text/plain') || '', props.item.id);
}
</script>

<template>
  <article
    class="nav-tile"
    :class="[`tile-${size}`, { editing }]"
    :style="style"
    :data-id="item.id"
    :data-name="item.name"
    :draggable="editing"
    @dragstart="drag"
    @dragover.prevent
    @drop.prevent="drop"
    @contextmenu.prevent="emit('edit', item)"
  >
    <div class="tile-surface">
      <button
        v-if="item.component === 'iconGroup'"
        class="tile-button"
        :aria-label="`打开文件夹：${item.name}`"
        @click="emit('activate', item)"
      >
        <FolderPreview :items="childrenOf(item.id)" :size="size" />
      </button>
      <WidgetCard
        v-else-if="item.type === 'component'"
        :item="item"
        @activate="emit('activate', item)"
      />
      <button
        v-else
        class="tile-button bookmark-button"
        :aria-label="item.name"
        :title="item.tips || item.name"
        @click="emit('activate', item)"
      >
        <img
          :src="item.src || '/favicon.svg'"
          alt=""
          :style="{ background: item.bgColor || 'transparent' }"
          draggable="false"
          @error="($event.target as HTMLImageElement).src = '/favicon.svg'"
        />
      </button>
    </div>
    <div v-if="state.preferences.showNames" class="tile-name" :title="item.name">
      {{ item.name }}
    </div>
    <template v-if="editing"
      ><button class="tile-edit" :aria-label="`编辑${item.name}`" @click="emit('edit', item)">
        <Pencil :size="12" /></button
      ><button class="tile-delete" :aria-label="`删除${item.name}`" @click="emit('remove', item)">
        <X :size="12" /></button
    ></template>
  </article>
</template>
