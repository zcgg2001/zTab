<script setup lang="ts">
import { ref } from 'vue';
import {
  Download,
  Upload,
  Check,
  ExternalLink,
  ImagePlus,
  SlidersHorizontal,
  Images,
  Database,
  Info,
} from 'lucide-vue-next';
import { state, backupJson, importBackup, notify, defaultPreferences } from '../state';
import theme from '../data/theme.json';
const props = defineProps<{ initial?: string }>();
const tab = ref(props.initial || 'general');
const emit = defineEmits<{ imported: [] }>();
const tabs = [
  { id: 'general', name: '常规设置', icon: SlidersHorizontal },
  { id: 'wallpaper', name: '壁纸外观', icon: Images },
  { id: 'data', name: '数据管理', icon: Database },
  { id: 'about', name: '关于导航', icon: Info },
];
function exportData() {
  const url = URL.createObjectURL(new Blob([backupJson()], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `学术生活导航-${new Date().toLocaleDateString('sv-SE')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('备份已导出');
}
const pendingImport = ref('');
const importName = ref('');
async function readImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    notify('备份文件不能超过 8 MB');
    return;
  }
  pendingImport.value = await file.text();
  importName.value = file.name;
  input.value = '';
}
function confirmImport() {
  try {
    importBackup(pendingImport.value);
    pendingImport.value = '';
    emit('imported');
    notify('已恢复备份');
  } catch (error) {
    notify(error instanceof Error ? error.message : '导入失败');
  }
}
async function uploadWallpaper(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    notify('请选择 JPG、PNG、WebP 或 GIF 图片');
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2560 / image.width, 1600 / image.height);
    const canvas = document.createElement('canvas');
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    state.preferences.background = canvas.toDataURL('image/jpeg', 0.85);
    notify('壁纸已更新');
  } catch {
    notify('图片读取失败，请换一张试试');
  } finally {
    URL.revokeObjectURL(url);
  }
}
</script>

<template>
  <nav class="settings-tabs" aria-label="设置分类">
    <button v-for="t in tabs" :key="t.id" :class="{ active: tab === t.id }" @click="tab = t.id">
      <component :is="t.icon" :size="17" />{{ t.name }}
    </button>
  </nav>
  <section v-if="tab === 'general'" class="settings-section">
    <h3>让首页更合你的习惯</h3>
    <label class="setting-row"
      ><span>时钟显示秒数<small>让每一秒都清晰可见</small></span
      ><input v-model="state.preferences.showSeconds" type="checkbox" role="switch"
    /></label>
    <label class="setting-row"
      ><span>底部快捷栏<small>常用网站，随手打开</small></span
      ><input v-model="state.preferences.showDock" type="checkbox" role="switch"
    /></label>
    <label class="setting-row"
      ><span>显示书签名称</span
      ><input v-model="state.preferences.showNames" type="checkbox" role="switch"
    /></label>
    <label class="setting-row"
      ><span>在新标签页打开链接</span
      ><input v-model="state.preferences.newTab" type="checkbox" role="switch"
    /></label>
    <label class="range-setting"
      >图标间距 <output>{{ state.preferences.gap }} px</output
      ><input v-model.number="state.preferences.gap" type="range" min="16" max="45"
    /></label>
    <p class="hint">设置会自动保存在当前浏览器。</p>
  </section>
  <section v-if="tab === 'wallpaper'" class="settings-section">
    <h3>换一张壁纸，换一种心情</h3>
    <div class="wallpaper-options">
      <button
        v-for="(value, i) in [theme.wallpaper, 'ocean', 'dusk', 'forest']"
        :key="value!"
        :class="[
          'wallpaper-option',
          `wallpaper-${i}`,
          { chosen: state.preferences.background === value },
        ]"
        :style="i === 0 ? { backgroundImage: `url(${value})` } : {}"
        :aria-label="['海边假日', '晴空', '日落', '森林'][i]"
        @click="state.preferences.background = value!"
      >
        <Check v-if="state.preferences.background === value" :size="24" />
      </button>
    </div>
    <label class="upload-label"
      ><ImagePlus :size="18" />上传自己的壁纸<input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        @change="uploadWallpaper"
    /></label>
    <label class="range-setting"
      >背景遮罩 <output>{{ Math.round(state.preferences.dim * 100) }}%</output
      ><input v-model.number="state.preferences.dim" type="range" min="0" max="0.8" step="0.01"
    /></label>
    <label class="range-setting"
      >背景模糊 <output>{{ state.preferences.blur }} px</output
      ><input v-model.number="state.preferences.blur" type="range" min="0" max="20"
    /></label>
    <button
      class="secondary-button"
      @click="
        state.preferences = { ...defaultPreferences };
        notify('已恢复默认外观');
      "
    >
      恢复默认外观
    </button>
  </section>
  <section v-if="tab === 'data'" class="settings-section">
    <h3>你的收藏，由你保管</h3>
    <p class="body-copy">
      书签、待办、笔记与个性化设置保存在当前浏览器。导出一份备份，就可以在另一台设备导入继续使用。
    </p>
    <div class="data-summary">
      <strong>{{ state.links.filter((x) => x.type === 'icon').length }}<span>个书签</span></strong
      ><strong>{{ state.todos.length }}<span>条待办</span></strong
      ><strong>{{ state.note.length }}<span>字笔记</span></strong>
    </div>
    <button class="primary-button full-width" @click="exportData">
      <Download :size="17" />导出全部数据
    </button>
    <label class="upload-label"
      ><Upload :size="18" />导入 JSON 备份<input
        type="file"
        accept=".json,application/json"
        @change="readImport"
    /></label>
    <div v-if="pendingImport" class="import-confirm">
      <p>导入「{{ importName }}」会替换当前书签、待办与笔记。建议先导出当前数据。</p>
      <div class="button-row">
        <button class="secondary-button" @click="pendingImport = ''">取消</button
        ><button class="primary-button" @click="confirmImport">确认替换</button>
      </div>
    </div>
    <p class="hint">当前版本支持本地保存与手动备份，尚未接入账号和云端同步。</p>
  </section>
  <section v-if="tab === 'about'" class="settings-section about-section">
    <div class="about-logo"><img :src="theme.logo!" alt="ZTab" /></div>
    <h3>学术生活导航</h3>
    <p class="body-copy">把常用的网站、实用的工具与片刻的灵感，安放在一个舒适的首页。</p>
    <a
      href="https://github.com/tsxcw/mtab"
      target="_blank"
      rel="noopener noreferrer"
      class="source-link"
      >参考项目：mTab <ExternalLink :size="15" /></a
    ><a
      href="https://nav.peptide.ink/"
      target="_blank"
      rel="noopener noreferrer"
      class="source-link"
      >查看原始参考站 <ExternalLink :size="15"
    /></a>
    <p class="hint">天气与热搜为 2026-11-26 的参考快照。时钟、日历和你的个人数据会实时更新。</p>
  </section>
</template>
