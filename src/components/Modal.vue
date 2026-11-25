<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { X } from 'lucide-vue-next';
import { toast } from '../state';
defineProps<{ title: string; wide?: boolean; drawer?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
onMounted(() => dialog.value?.showModal());
function outside(event: MouseEvent) {
  if (event.target === dialog.value) {
    const b = dialog.value!.getBoundingClientRect();
    if (
      event.clientX < b.left ||
      event.clientX > b.right ||
      event.clientY < b.top ||
      event.clientY > b.bottom
    )
      emit('close');
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal"
    :class="{ wide, drawer }"
    aria-labelledby="dialog-title"
    @cancel.prevent="emit('close')"
    @click="outside"
  >
    <header class="modal-header">
      <h2 id="dialog-title">{{ title }}</h2>
      <button class="icon-button close-button" aria-label="关闭弹窗" @click="emit('close')">
        <X :size="22" />
      </button>
    </header>
    <div class="modal-body"><slot /></div>
    <div v-if="toast" class="modal-toast" role="status">{{ toast }}</div>
  </dialog>
</template>
