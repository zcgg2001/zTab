import { computed, reactive, ref, watch } from 'vue';
import navigation from './data/navigation.json';
import theme from './data/theme.json';
import type { Bookmark, Preferences, Todo } from './types';

const STORAGE_KEY = 'academic-navigation:v1';
export const toast = ref('');
let toastTimer: ReturnType<typeof setTimeout>;
export function notify(message: string) {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 3200);
}

export const defaultPreferences: Preferences = {
  background: theme.wallpaper!,
  dim: 0.1,
  blur: 0,
  showSeconds: true,
  showDock: true,
  showNames: true,
  newTab: true,
  gap: 35,
};
export const state = reactive({
  links: structuredClone(navigation.links) as Bookmark[],
  dock: structuredClone(navigation.dock) as Bookmark[],
  trash: [] as Bookmark[],
  todos: [] as Todo[],
  note: '',
  preferences: { ...defaultPreferences },
  timer: { duration: 25, remaining: 1500, endAt: 0, count: 0 },
  engine: 'metaso',
  woodCount: 0,
});

export function safeUrl(value: string, allowInternal = false): boolean {
  if (allowInternal && (value.startsWith('tab://') || value === '/noteApp')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
function validImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('/assets/') ||
      value === '/favicon.svg' ||
      /^data:image\/(png|jpeg|webp|gif);base64,/.test(value) ||
      safeUrl(value))
  );
}
function validateBookmarks(value: unknown): value is Bookmark[] {
  return (
    Array.isArray(value) &&
    value.length <= 5000 &&
    value.every(
      (x) =>
        x &&
        typeof x.id === 'string' &&
        typeof x.name === 'string' &&
        x.name.length <= 300 &&
        ['icon', 'component', 'pageGroup'].includes(x.type) &&
        Number.isFinite(x.sort) &&
        (!x.url || x.type === 'component' || safeUrl(x.url, true)) &&
        (!x.src || validImage(x.src)) &&
        (!x.size || /^[12]x[124]$/.test(x.size)),
    ) &&
    new Set(value.map((x) => x.id)).size === value.length
  );
}
export function importBackup(raw: string) {
  const data = JSON.parse(raw);
  if (data.version !== 1 || !validateBookmarks(data.links) || !validateBookmarks(data.dock)) {
    throw new Error('请选择本导航导出的有效 JSON 备份文件');
  }
  if (!data.links.some((x: Bookmark) => x.type === 'pageGroup')) throw new Error('备份中缺少分类');
  if (
    !Array.isArray(data.todos) ||
    data.todos.some(
      (x: Todo) =>
        typeof x.id !== 'string' || typeof x.text !== 'string' || typeof x.done !== 'boolean',
    )
  ) {
    throw new Error('备份中的待办数据不完整');
  }
  const p = data.preferences || {};
  const preferences = { ...defaultPreferences };
  if (validImage(p.background) || ['ocean', 'dusk', 'forest'].includes(p.background))
    preferences.background = p.background;
  for (const key of ['showSeconds', 'showDock', 'showNames', 'newTab'] as const) {
    if (typeof p[key] === 'boolean') preferences[key] = p[key];
  }
  for (const [key, min, max] of [
    ['dim', 0, 0.8],
    ['blur', 0, 20],
    ['gap', 16, 45],
  ] as const) {
    if (typeof p[key] === 'number') preferences[key] = Math.min(max, Math.max(min, p[key]));
  }
  const timer = data.timer || { duration: 25, remaining: 1500, endAt: 0, count: 0 };
  if (
    !Number.isFinite(timer.duration) ||
    timer.duration < 1 ||
    timer.duration > 180 ||
    !Number.isFinite(timer.remaining) ||
    timer.remaining < 0 ||
    timer.remaining > 10800 ||
    !Number.isFinite(timer.endAt) ||
    timer.endAt < 0 ||
    !Number.isInteger(timer.count) ||
    timer.count < 0
  ) {
    throw new Error('备份中的计时数据无效');
  }
  state.links = data.links;
  state.dock = data.dock;
  state.todos = data.todos;
  state.note = typeof data.note === 'string' ? data.note.slice(0, 200000) : '';
  state.trash = validateBookmarks(data.trash) ? data.trash : [];
  state.preferences = preferences;
  state.timer = {
    duration: timer.duration,
    remaining: timer.remaining,
    endAt: timer.endAt,
    count: timer.count,
  };
  state.woodCount = Number.isInteger(data.woodCount) && data.woodCount >= 0 ? data.woodCount : 0;
  if (['metaso', 'baidu', 'google', 'bing', 'scholar', 'pubmed'].includes(data.engine))
    state.engine = data.engine;
}

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    importBackup(saved);
  }
} catch {
  notify('未能读取上次的数据，已载入默认导航');
}

export function backupJson() {
  return JSON.stringify({ version: 1, ...state }, null, 2);
}
let storageTimer: ReturnType<typeof setTimeout>;
let storageDirty = false;
function flushStorage() {
  if (!storageDirty) return;
  try {
    localStorage.setItem(STORAGE_KEY, backupJson());
    storageDirty = false;
  } catch {
    notify('浏览器存储空间不足，请导出备份后清理空间');
  }
}
const stopPersistence = watch(
  state,
  () => {
    storageDirty = true;
    clearTimeout(storageTimer);
    storageTimer = setTimeout(flushStorage, 200);
  },
  { deep: true },
);
window.addEventListener('pagehide', flushStorage);

export const groups = computed(() =>
  state.links.filter((x) => x.type === 'pageGroup').sort((a, b) => a.sort - b.sort),
);
export function childrenOf(id: string) {
  return state.links.filter((x) => x.pid === id).sort((a, b) => a.sort - b.sort);
}
export function removeBookmark(item: Bookmark) {
  const ids = new Set([item.id]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const x of state.links) {
      if (x.pid && ids.has(x.pid) && !ids.has(x.id)) {
        ids.add(x.id);
        expanded = true;
      }
    }
  }
  state.trash.push(...state.links.filter((x) => ids.has(x.id)));
  state.links = state.links.filter((x) => !ids.has(x.id));
  notify('已移到回收站，可以随时恢复');
}
export function restoreBookmark(item: Bookmark) {
  // Restore the folder containing a child when necessary, then its whole subtree.
  let root = item;
  const seen = new Set<string>();
  while (root.pid && !seen.has(root.id)) {
    seen.add(root.id);
    const parent = state.trash.find((x) => x.id === root.pid);
    if (!parent) break;
    root = parent;
  }
  const ids = new Set([root.id]);
  for (let i = 0; i < state.trash.length; i++) {
    for (const x of state.trash) if (x.pid && ids.has(x.pid)) ids.add(x.id);
  }
  state.links.push(...state.trash.filter((x) => ids.has(x.id)));
  state.trash = state.trash.filter((x) => !ids.has(x.id));
  notify('已恢复书签');
}
export function openLink(url: string) {
  if (!safeUrl(url)) {
    notify('这个地址暂时无法打开');
    return;
  }
  if (state.preferences.newTab) window.open(url, '_blank', 'noopener,noreferrer');
  else window.location.assign(url);
}

export const now = ref(new Date());
const clockInterval = setInterval(() => {
  now.value = new Date();
  if (state.timer.endAt) {
    state.timer.remaining = Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
    if (!state.timer.remaining) {
      state.timer.endAt = 0;
      state.timer.count++;
      notify('完成一个番茄钟，休息一下吧！');
    }
  }
}, 1000);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    flushStorage();
    stopPersistence();
    clearTimeout(storageTimer);
    clearInterval(clockInterval);
    window.removeEventListener('pagehide', flushStorage);
  });
}
export const timerLabel = computed(
  () =>
    `${Math.floor(state.timer.remaining / 60)
      .toString()
      .padStart(2, '0')}:${(state.timer.remaining % 60).toString().padStart(2, '0')}`,
);
export function toggleTimer() {
  if (state.timer.endAt) state.timer.endAt = 0;
  else {
    if (!state.timer.remaining) state.timer.remaining = state.timer.duration * 60;
    state.timer.endAt = Date.now() + state.timer.remaining * 1000;
  }
}
export function resetTimer() {
  state.timer.endAt = 0;
  state.timer.remaining = state.timer.duration * 60;
}
