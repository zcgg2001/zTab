<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue';
import { Solar } from 'lunar-typescript';
import {
  Search,
  ChevronDown,
  X,
  Plus,
  Settings,
  UserCircle,
  Leaf,
  Globe2,
  Pencil,
  Trash2,
  FolderPlus,
  Image,
  Check,
  ExternalLink,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from 'lucide-vue-next';
import {
  state,
  groups,
  childrenOf,
  now,
  toast,
  notify,
  openLink,
  safeUrl,
  removeBookmark,
  restoreBookmark,
} from './state';
import type { Bookmark } from './types';
import theme from './data/theme.json';
import NavTile from './components/NavTile.vue';
import Modal from './components/Modal.vue';
const SettingsPanel = defineAsyncComponent(() => import('./components/SettingsPanel.vue'));
const UtilityPanel = defineAsyncComponent(() => import('./components/UtilityPanel.vue'));

const activeGroup = ref(groups.value[0].id);
const editing = ref(false);
const zen = ref(false);
const modal = ref('');
const settingsTab = ref('general');
const selected = ref<Bookmark | null>(null);
const workspace = ref<HTMLElement>();
const searchInput = ref<HTMLInputElement>();
const query = ref('');
const searchFocused = ref(false);
const engineMenu = ref(false);
const context = ref<{ x: number; y: number } | null>(null);
const engines = [
  { id: 'metaso', name: '秘塔 AI', letter: 'M', color: '#2861da', url: 'https://metaso.cn/?q=' },
  { id: 'baidu', name: '百度', letter: '百', color: '#346cf9', url: 'https://www.baidu.com/s?wd=' },
  {
    id: 'google',
    name: 'Google',
    letter: 'G',
    color: '#4285f4',
    url: 'https://www.google.com/search?q=',
  },
  {
    id: 'bing',
    name: '必应',
    letter: 'b',
    color: '#0794ba',
    url: 'https://www.bing.com/search?q=',
  },
  {
    id: 'scholar',
    name: 'Google 学术',
    letter: 'G',
    color: '#4285f4',
    url: 'https://scholar.google.com/scholar?q=',
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    letter: 'P',
    color: '#32638b',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=',
  },
];
const engine = computed(() => engines.find((x) => x.id === state.engine) || engines[0]);
const clock = computed(() =>
  now.value.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    ...(state.preferences.showSeconds ? { second: '2-digit' } : {}),
  }),
);
const lunar = computed(() => Solar.fromDate(now.value).getLunar());
const dateLabel = computed(() => `${now.value.getMonth() + 1}月${now.value.getDate()}日`);
const weekday = computed(() => `星期${'日一二三四五六'[now.value.getDay()]}`);
const lunarLabel = computed(
  () => `${lunar.value.getMonthInChinese()}月${lunar.value.getDayInChinese()}`,
);
const visibleItems = computed(() =>
  state.links
    .filter((x) => x.pageGroup === activeGroup.value && !x.pid && x.type !== 'pageGroup')
    .sort((a, b) => a.sort - b.sort),
);
const folderItems = computed(() => (selected.value ? childrenOf(selected.value.id) : []));
const suggestions = computed(() => {
  if (!query.value.trim()) return [];
  const seen = new Set<string>();
  return state.links
    .filter((x) => {
      const matches =
        x.type === 'icon' &&
        safeUrl(x.url || '') &&
        `${x.name} ${x.url}`.toLowerCase().includes(query.value.toLowerCase()) &&
        !seen.has(x.url!);
      if (matches) seen.add(x.url!);
      return matches;
    })
    .slice(0, 7);
});
const gradients: Record<string, string> = {
  ocean: 'linear-gradient(140deg,#66bad0,#b1dcdf 50%,#e4eac8)',
  dusk: 'linear-gradient(145deg,#847da4,#d6a6a0 55%,#efd2b1)',
  forest: 'linear-gradient(135deg,#346967,#8eaa8f 55%,#cfcead)',
};
const backgroundStyle = computed(() => ({
  backgroundImage:
    gradients[state.preferences.background] || `url("${state.preferences.background}")`,
  filter: `blur(${state.preferences.blur}px)`,
}));
const cssVars = computed(() => ({ '--grid-gap': `${state.preferences.gap}px` }));
const modalTitle = computed(
  () =>
    ({
      folder: selected.value?.name,
      settings: '设置',
      bookmark: selected.value ? '编辑标签' : '添加标签',
      category: selected.value ? '编辑分类' : '新建分类',
      trash: '回收站',
      todo: '待办事项',
      noteApp: '记事本',
      pomodoro: '番茄钟',
      calendar: '日历',
      weather: '北京天气',
      ai: 'AI 助手',
      food: '今天吃什么',
      muyu: '电子木鱼',
      imageConversion: '图片格式转换',
      amountConversion: '金额换算',
    })[modal.value] || '学术生活导航',
);

function switchGroup(id: string) {
  activeGroup.value = id;
  editing.value = false;
  workspace.value?.scrollTo({ top: 0 });
  context.value = null;
}
function openSettings(tab = 'general') {
  settingsTab.value = tab;
  modal.value = 'settings';
  context.value = null;
}
function search() {
  const key = query.value.trim();
  if (key) {
    openLink(engine.value.url + encodeURIComponent(key));
    searchFocused.value = false;
    engineMenu.value = false;
  }
}
function blurSearch() {
  setTimeout(() => {
    searchFocused.value = false;
  }, 150);
}
function activate(item: Bookmark) {
  context.value = null;
  if (item.component === 'iconGroup') {
    selected.value = item;
    modal.value = 'folder';
    return;
  }
  if (item.type === 'component') {
    selected.value = item;
    modal.value = item.name_en || '';
    return;
  }
  switch (item.url) {
    case 'tab://setting':
      openSettings();
      return;
    case 'tab://background':
      openSettings('wallpaper');
      return;
    case 'tab://editAll':
      editing.value = !editing.value;
      return;
    case 'tab://addicon':
      addBookmark();
      return;
    case '/noteApp':
      modal.value = 'noteApp';
      return;
    default:
      if (item.url) openLink(item.url);
  }
}
const form = ref({
  name: '',
  url: '',
  src: '',
  size: '1x1',
  pageGroup: '',
  pid: null as string | null,
  folder: false,
});
const formError = ref('');
function addBookmark(folder = false, parent?: string) {
  selected.value = null;
  form.value = {
    name: '',
    url: '',
    src: '',
    size: folder ? '2x2' : '1x1',
    pageGroup: activeGroup.value,
    pid: parent || null,
    folder,
  };
  formError.value = '';
  modal.value = 'bookmark';
  context.value = null;
}
function editBookmark(item: Bookmark) {
  selected.value = item;
  form.value = {
    name: item.name,
    url: item.url || '',
    src: item.src || '',
    size: item.size || '1x1',
    pageGroup: item.pageGroup || activeGroup.value,
    pid: item.pid || null,
    folder: item.component === 'iconGroup',
  };
  formError.value = '';
  modal.value = 'bookmark';
}
function saveBookmark() {
  if (!form.value.name.trim()) {
    formError.value = '请输入标签名称';
    return;
  }
  const component = selected.value?.type === 'component' || form.value.folder;
  let url = form.value.url.trim();
  if (!component) {
    if (url && !/^[a-z][a-z\d+.-]*:/i.test(url) && !url.startsWith('/')) url = 'https://' + url;
    if (!safeUrl(url, true)) {
      formError.value = '请输入有效的网址，例如 https://example.com';
      return;
    }
  }
  if (
    form.value.src &&
    !form.value.src.startsWith('/assets/') &&
    form.value.src !== '/favicon.svg' &&
    !safeUrl(form.value.src)
  ) {
    formError.value = '图标地址需要是有效的 HTTP 或 HTTPS 链接';
    return;
  }
  if (selected.value) {
    const item = state.links.find((x) => x.id === selected.value!.id);
    if (item) {
      const previousGroup = item.pageGroup;
      Object.assign(item, {
        name: form.value.name.trim(),
        size: form.value.size,
        pageGroup: form.value.pageGroup,
      });
      if (previousGroup !== item.pageGroup) {
        item.pid = null;
        for (const child of childrenOf(item.id)) child.pageGroup = item.pageGroup;
      }
      if (!component) {
        item.url = url;
        item.src = form.value.src || '/favicon.svg';
      }
    }
  } else
    state.links.push({
      id: crypto.randomUUID(),
      name: form.value.name.trim(),
      url: form.value.folder ? 'iconGroup' : url,
      src: form.value.src || '/favicon.svg',
      size: form.value.size,
      type: form.value.folder ? 'component' : 'icon',
      ...(form.value.folder ? { component: 'iconGroup' } : {}),
      pageGroup: form.value.pageGroup,
      pid: form.value.pid,
      sort:
        Math.max(
          -1,
          ...state.links
            .filter((x) => x.pageGroup === form.value.pageGroup && x.pid === form.value.pid)
            .map((x) => x.sort),
        ) + 1,
      bgColor: '#fff',
    });
  modal.value = '';
  notify(selected.value ? '标签已更新' : '标签已添加');
}
const categoryName = ref('');
const categoryIcon = ref('');
function addCategory(item?: Bookmark) {
  selected.value = item || null;
  categoryName.value = item?.name || '';
  categoryIcon.value = item?.src || groups.value[0].src || '';
  modal.value = 'category';
}
function saveCategory() {
  if (!categoryName.value.trim()) return;
  if (selected.value) {
    const g = state.links.find((x) => x.id === selected.value!.id);
    if (g) {
      g.name = categoryName.value.trim();
      g.src = categoryIcon.value;
    }
  } else {
    const id = crypto.randomUUID();
    state.links.push({
      id,
      name: categoryName.value.trim(),
      src: categoryIcon.value,
      type: 'pageGroup',
      sort: groups.value.length,
    });
    switchGroup(id);
  }
  modal.value = '';
  notify('分类已保存');
}
function moveBookmark(source: string, target: string) {
  const items = [...visibleItems.value];
  const from = items.findIndex((x) => x.id === source);
  const to = items.findIndex((x) => x.id === target);
  if (from < 0 || to < 0 || from === to) return;
  items.splice(to, 0, items.splice(from, 1)[0]);
  items.forEach((item, index) => {
    const stored = state.links.find((x) => x.id === item.id);
    if (stored) stored.sort = index;
  });
}
function moveSelected(direction: number) {
  if (!selected.value) return;
  const items = selected.value.pid ? childrenOf(selected.value.pid) : visibleItems.value;
  const index = items.findIndex((x) => x.id === selected.value!.id);
  const target = items[index + direction];
  if (target) {
    const a = state.links.find((x) => x.id === selected.value!.id)!;
    const b = state.links.find((x) => x.id === target.id)!;
    [a.sort, b.sort] = [b.sort, a.sort];
    notify('顺序已更新');
  }
}
function showContext(event: MouseEvent) {
  context.value = {
    x: Math.min(event.clientX, innerWidth - 195),
    y: Math.min(event.clientY, innerHeight - 240),
  };
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    context.value = null;
    engineMenu.value = false;
    searchFocused.value = false;
    editing.value = false;
  }
  const target = event.target as HTMLElement;
  if (
    event.key === '/' &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
    !modal.value
  ) {
    event.preventDefault();
    searchInput.value?.focus();
  }
}
function clickAway() {
  context.value = null;
  engineMenu.value = false;
}
onMounted(() => {
  window.addEventListener('keydown', keydown);
  window.addEventListener('click', clickAway);
});
onUnmounted(() => {
  window.removeEventListener('keydown', keydown);
  window.removeEventListener('click', clickAway);
});
function imported() {
  switchGroup(groups.value[0].id);
}
</script>

<template>
  <div
    class="navigation-app"
    :class="{ zen, 'without-dock': !state.preferences.showDock }"
    :style="cssVars"
    @contextmenu.self.prevent="showContext"
  >
    <div class="wallpaper" :style="backgroundStyle"></div>
    <div
      class="wallpaper-shade"
      :style="{ background: `rgba(0,0,0,${state.preferences.dim})` }"
    ></div>
    <aside class="sidebar" aria-label="分类导航">
      <button class="brand" aria-label="回到首页" @click="switchGroup(groups[0].id)">
        <img :src="theme.logo!" alt="NAV." />
      </button>
      <nav class="group-navigation">
        <button
          v-for="group in groups"
          :key="group.id"
          :class="{ active: activeGroup === group.id }"
          :aria-current="activeGroup === group.id ? 'page' : undefined"
          :title="group.name"
          @click="switchGroup(group.id)"
          @contextmenu.prevent="addCategory(group)"
        >
          <img :src="group.src" alt="" /><span>{{ group.name }}</span></button
        ><button class="add-category" aria-label="添加分类" @click="addCategory()">
          <Plus :size="28" :stroke-width="1.5" />
        </button>
      </nav>
      <button class="sidebar-settings" aria-label="打开设置" @click="openSettings()">
        <Settings :size="23" :stroke-width="1.5" />
      </button>
    </aside>
    <div class="top-actions">
      <button
        class="icon-button"
        title="本地数据与备份"
        aria-label="数据管理"
        @click="openSettings('data')"
      >
        <UserCircle :size="22" :stroke-width="1.5" /></button
      ><button
        class="icon-button"
        :title="zen ? '退出简约模式' : '简约模式'"
        :aria-label="zen ? '退出简约模式' : '简约模式'"
        :aria-pressed="zen"
        @click="zen = !zen"
      >
        <Leaf :size="22" :stroke-width="1.5" /></button
      ><button
        class="icon-button"
        title="关于导航"
        aria-label="关于导航"
        @click="openSettings('about')"
      >
        <Globe2 :size="22" :stroke-width="1.5" />
      </button>
    </div>
    <main id="main-content">
      <h1 class="sr-only">学术生活导航</h1>
      <header class="hero">
        <button class="clock" aria-label="查看日历" @click="modal = 'calendar'">
          <span class="clock-time">{{ clock }}</span
          ><span class="clock-date"
            ><span>{{ dateLabel }}</span
            ><span>{{ weekday }}</span
            ><span>{{ lunarLabel }}</span
            ><span>{{ lunar.getDayInGanZhi() }}</span></span
          >
        </button>
        <div class="search-area" @click.stop>
          <form class="search-bar" role="search" @submit.prevent="search">
            <button
              class="engine-button"
              type="button"
              :aria-label="`搜索引擎：${engine.name}`"
              :aria-expanded="engineMenu"
              @click="
                engineMenu = !engineMenu;
                searchFocused = false;
              "
            >
              <img v-if="engine.id === 'metaso'" :src="theme.searchIcon!" alt="" /><b
                v-else
                :style="{ color: engine.color }"
                >{{ engine.letter }}</b
              ><ChevronDown :size="16" /></button
            ><input
              ref="searchInput"
              v-model="query"
              aria-label="搜索网页或书签"
              placeholder="多方回应患者诊所内倒地离世"
              autocomplete="off"
              @focus="
                searchFocused = true;
                engineMenu = false;
              "
              @blur="blurSearch"
            /><button
              v-if="query"
              type="button"
              class="clear-search"
              aria-label="清空搜索"
              @click="
                query = '';
                searchInput?.focus();
              "
            >
              <X :size="17" /></button
            ><button type="submit" class="search-submit" aria-label="搜索">
              <Search :size="23" :stroke-width="1.6" />
            </button>
          </form>
          <div v-if="engineMenu" class="engine-menu">
            <button
              v-for="e in engines"
              :key="e.id"
              :class="{ selected: state.engine === e.id }"
              @click="
                state.engine = e.id;
                engineMenu = false;
                searchInput?.focus();
              "
            >
              <b :style="{ color: e.color }">{{ e.letter }}</b
              ><span>{{ e.name }}</span
              ><Check v-if="state.engine === e.id" :size="16" />
            </button>
          </div>
          <div v-if="searchFocused && query.trim() && !engineMenu" class="search-suggestions">
            <span class="suggestions-heading">搜索书签</span
            ><button
              v-for="item in suggestions"
              :key="item.id"
              @mousedown.prevent
              @click="
                activate(item);
                query = '';
                searchFocused = false;
              "
            >
              <img :src="item.src" alt="" /><span
                >{{ item.name }}<small>{{ item.url }}</small></span
              ><ExternalLink :size="14" />
            </button>
            <p v-if="!suggestions.length" class="no-suggestion">没有匹配的书签</p>
            <button class="web-search-option" @mousedown.prevent @click="search">
              <Search :size="18" />使用 {{ engine.name }} 搜索「{{ query }}」<span>↵</span>
            </button>
          </div>
        </div>
      </header>
      <section
        ref="workspace"
        class="workspace"
        :aria-label="`${groups.find((x) => x.id === activeGroup)?.name}书签`"
        @contextmenu.self.prevent="showContext"
      >
        <div :key="activeGroup" class="bookmark-grid" @contextmenu.self.prevent="showContext">
          <NavTile
            v-for="item in visibleItems"
            :key="item.id"
            :item="item"
            :editing="editing"
            @activate="activate"
            @edit="editBookmark"
            @remove="removeBookmark"
            @move="moveBookmark"
          /><button v-if="!visibleItems.length" class="empty-category" @click="addBookmark()">
            <Plus :size="28" /><span>添加第一个标签</span>
          </button>
        </div>
      </section>
    </main>
    <div v-if="editing" class="editing-toolbar">
      <GripVertical :size="17" /><span>拖动标签调整顺序</span
      ><button @click="addBookmark()"><Plus :size="15" />添加</button
      ><button class="edit-done" @click="editing = false"><Check :size="16" />完成</button>
    </div>
    <nav v-if="state.preferences.showDock" class="dock" aria-label="快捷访问">
      <button
        v-for="item in state.dock"
        :key="item.id"
        :aria-label="`快捷打开${item.name}`"
        :title="item.name"
        @click="activate(item)"
      >
        <img
          :src="item.src"
          alt=""
          :style="{ background: item.bgColor || '#fff' }"
          draggable="false"
        />
      </button>
      <div class="dock-divider"></div>
      <button
        class="dock-trash"
        aria-label="回收站"
        :title="`回收站 · ${state.trash.length} 个项目`"
        @click="modal = 'trash'"
      >
        <img :src="theme.trash!" alt="" /><span v-if="state.trash.length" class="trash-count">{{
          state.trash.length
        }}</span>
      </button>
    </nav>
    <footer class="site-footer">
      <button @click="openSettings('about')">学术生活导航</button>
    </footer>
    <Transition name="toast"
      ><div v-if="toast && !modal" class="toast-message" role="status">
        <Check :size="16" />{{ toast }}
      </div></Transition
    >
    <div
      v-if="context"
      class="context-menu"
      :style="{ left: context.x + 'px', top: context.y + 'px' }"
      role="menu"
      @click.stop
    >
      <button role="menuitem" @click="addBookmark()"><Plus :size="16" />添加标签</button
      ><button role="menuitem" @click="addBookmark(true)"><FolderPlus :size="16" />新文件夹</button
      ><button role="menuitem" @click="openSettings('wallpaper')">
        <Image :size="16" />更换壁纸</button
      ><button
        role="menuitem"
        @click="
          editing = !editing;
          context = null;
        "
      >
        <Pencil :size="16" />批量编辑</button
      ><button role="menuitem" @click="openSettings()"><Settings :size="16" />设置</button>
    </div>
    <Modal
      v-if="modal"
      :key="modal"
      :title="modalTitle!"
      :wide="modal === 'folder'"
      :drawer="modal === 'settings'"
      @close="modal = ''"
    >
      <template v-if="modal === 'folder'"
        ><div class="folder-toolbar">
          <span>{{ folderItems.length }} 个网站</span>
          <div>
            <button class="secondary-button" @click="editBookmark(selected!)">
              <Pencil :size="15" />编辑文件夹</button
            ><button class="primary-button" @click="addBookmark(false, selected!.id)">
              <Plus :size="15" />添加标签
            </button>
          </div>
        </div>
        <div class="folder-links">
          <div v-for="item in folderItems" :key="item.id" class="folder-link">
            <button @click="activate(item)" :title="item.tips">
              <img :src="item.src || '/favicon.svg'" alt="" /><span>{{ item.name }}</span></button
            ><button
              class="folder-link-edit"
              :aria-label="`编辑${item.name}`"
              @click="editBookmark(item)"
            >
              <Pencil :size="13" />
            </button>
          </div>
          <p v-if="!folderItems.length" class="muted">文件夹还是空的，添加几个常用网站吧。</p>
        </div></template
      >
      <SettingsPanel v-else-if="modal === 'settings'" :initial="settingsTab" @imported="imported" />
      <form v-else-if="modal === 'bookmark'" class="bookmark-form" @submit.prevent="saveBookmark">
        <label class="form-label"
          >名称<input
            v-model="form.name"
            maxlength="60"
            placeholder="例如：Google 学术"
            required
            autofocus /></label
        ><template v-if="!form.folder && selected?.type !== 'component'"
          ><label class="form-label"
            >网址<input v-model="form.url" placeholder="https://example.com" required /></label
          ><label class="form-label"
            >图标地址 <span class="muted">选填</span
            ><input v-model="form.src" placeholder="https://example.com/icon.png" /></label
        ></template>
        <div class="form-columns">
          <label class="form-label"
            >分类<select v-model="form.pageGroup">
              <option v-for="group in groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select></label
          ><label class="form-label"
            >尺寸<select v-model="form.size">
              <option value="1x1">小图标 · 1 × 1</option>
              <option v-if="selected?.type !== 'component' && !form.folder" value="1x2">
                宽图标 · 1 × 2
              </option>
              <option v-if="form.folder || selected?.type === 'component'" value="2x2">
                方形卡片 · 2 × 2
              </option>
              <option v-if="form.folder || selected?.type === 'component'" value="2x4">
                宽卡片 · 2 × 4
              </option>
            </select></label
          >
        </div>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div v-if="selected" class="bookmark-order">
          <span>排列顺序</span
          ><button type="button" class="secondary-button" @click="moveSelected(-1)">
            <ArrowLeft :size="15" />前移</button
          ><button type="button" class="secondary-button" @click="moveSelected(1)">
            后移<ArrowRight :size="15" />
          </button>
        </div>
        <div class="form-footer">
          <button
            v-if="selected"
            type="button"
            class="danger-button"
            @click="
              removeBookmark(selected!);
              modal = '';
            "
          >
            移入回收站</button
          ><button type="button" class="secondary-button" @click="modal = ''">取消</button
          ><button class="primary-button">保存标签</button>
        </div>
      </form>
      <form v-else-if="modal === 'category'" @submit.prevent="saveCategory">
        <label class="form-label"
          >分类名称<input
            v-model="categoryName"
            maxlength="10"
            placeholder="例如：工作"
            required
            autofocus
        /></label>
        <div class="category-icons">
          <button
            v-for="group in groups.slice(0, 5)"
            :key="group.id"
            type="button"
            :class="{ selected: categoryIcon === group.src }"
            :aria-label="`${group.name}图标`"
            @click="categoryIcon = group.src!"
          >
            <img :src="group.src" alt="" />
          </button>
        </div>
        <button class="primary-button full-width">保存分类</button>
      </form>
      <div v-else-if="modal === 'trash'">
        <p class="muted">移除的标签会留在这里，随时可以找回来。</p>
        <div v-if="!state.trash.length" class="empty-state">
          <Trash2 :size="42" />
          <p>回收站是空的</p>
        </div>
        <ul class="trash-list">
          <li
            v-for="item in state.trash.filter(
              (x) => !x.pid || !state.trash.some((p) => p.id === x.pid),
            )"
            :key="item.id"
          >
            <img :src="item.src || '/favicon.svg'" alt="" /><span>{{ item.name }}</span
            ><button class="secondary-button" @click="restoreBookmark(item)">
              <RotateCcw :size="14" />恢复
            </button>
          </li>
        </ul>
      </div>
      <UtilityPanel v-else :kind="modal" />
    </Modal>
  </div>
</template>
