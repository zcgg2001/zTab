<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  Download,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next';
import { Solar } from 'lunar-typescript';
import { state, now, timerLabel, toggleTimer, resetTimer, notify, openLink } from '../state';
import theme from '../data/theme.json';
import weather from '../data/weather.json';
import WeatherIcon from './WeatherIcon.vue';
defineProps<{ kind: string }>();
const todoInput = ref('');
function addTodo() {
  const text = todoInput.value.trim();
  if (text) {
    state.todos.push({ id: crypto.randomUUID(), text, done: false });
    todoInput.value = '';
  }
}
const food = ref('今天吃什么？');
const meals = [
  '番茄鸡蛋面',
  '牛肉饭',
  '馄饨',
  '饺子',
  '寿司',
  '麻辣烫',
  '炒饭',
  '三明治',
  '清蒸鱼',
  '重庆小面',
  '煲仔饭',
  '蔬菜沙拉',
  '烤肉饭',
  '螺蛳粉',
  '小笼包',
  '咖喱鸡饭',
];
function chooseFood() {
  food.value = meals[Math.floor(Math.random() * meals.length)];
}
const monthOffset = ref(0);
const calendarDate = computed(
  () => new Date(now.value.getFullYear(), now.value.getMonth() + monthOffset.value, 1),
);
const calendarDays = computed(() => {
  const d = calendarDate.value;
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
});
function lunarDay(day: number) {
  return Solar.fromYmd(calendarDate.value.getFullYear(), calendarDate.value.getMonth() + 1, day)
    .getLunar()
    .getDayInChinese();
}
const amount = ref('');
const uppercase = computed(() => {
  const text = amount.value.trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text))
    return text ? '请输入不超过 12 位、最多两位小数的非负金额' : '';
  const digits = '零壹贰叁肆伍陆柒捌玖',
    units = ['', '拾', '佰', '仟'],
    groups = ['', '万', '亿'];
  const [whole, decimal = ''] = text.split('.');
  let n = Number(whole),
    result = '',
    pendingZero = false;
  const chunks: number[] = [];
  while (n > 0) {
    chunks.push(n % 10000);
    n = Math.floor(n / 10000);
  }
  for (let index = chunks.length - 1; index >= 0; index--) {
    const chunk = chunks[index];
    if (!chunk) {
      if (result) pendingZero = true;
      continue;
    }
    if (result && (pendingZero || chunk < 1000)) result += '零';
    pendingZero = false;
    let part = '',
      zero = false;
    for (let power = 3; power >= 0; power--) {
      const digit = Math.floor(chunk / 10 ** power) % 10;
      if (digit) {
        if (zero && part) part += '零';
        part += digits[digit] + units[power];
        zero = false;
      } else if (part) zero = true;
    }
    result += part + groups[index];
  }
  result = (result || '零') + '元';
  const jiao = Number(decimal[0] || 0),
    fen = Number(decimal[1] || 0);
  return (
    result +
    (jiao ? digits[jiao] + '角' : '') +
    (fen ? (!jiao && Number(whole) > 0 ? '零' : '') + digits[fen] + '分' : '') +
    (!jiao && !fen ? '整' : '')
  );
});
function copyAmount() {
  navigator.clipboard
    .writeText(uppercase.value)
    .then(() => notify('已复制大写金额'))
    .catch(() => notify('复制失败，请手动选择文字复制'));
}
const imageFile = ref<File | null>(null);
const imageFormat = ref('image/png');
const converting = ref(false);
async function convertImage() {
  if (!imageFile.value) return;
  converting.value = true;
  const url = URL.createObjectURL(imageFile.value);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.width * image.height > 40000000)
      throw new Error('图片尺寸过大，请选择 4000 万像素以内的图片');
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    if (imageFormat.value === 'image/jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, imageFormat.value, 0.92),
    );
    if (!blob) throw new Error('当前浏览器不支持转换成此格式');
    const converted = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = converted;
    a.download =
      imageFile.value.name.replace(/\.[^.]+$/, '') + '.' + imageFormat.value.split('/')[1];
    a.click();
    setTimeout(() => URL.revokeObjectURL(converted), 1000);
    notify('图片已转换并下载');
  } catch (error) {
    notify(error instanceof Error ? error.message : '图片转换失败');
  } finally {
    URL.revokeObjectURL(url);
    converting.value = false;
  }
}
function pickImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) imageFile.value = file;
}
const aiPrompt = ref('');
const aiSites = [
  { name: 'ChatGPT', letter: 'C', color: '#10a37f', url: 'https://chatgpt.com/' },
  { name: 'DeepSeek', letter: 'D', color: '#4d6bfe', url: 'https://chat.deepseek.com/' },
  { name: '豆包', letter: '豆', color: '#8c6de8', url: 'https://www.doubao.com/chat/' },
  { name: 'Kimi', letter: 'K', color: '#202126', url: 'https://www.kimi.com/' },
];
</script>

<template>
  <div v-if="kind === 'todo'" class="todo-panel">
    <p class="muted">{{ state.todos.filter((x) => !x.done).length }} 项待完成 · 给每一天一点秩序</p>
    <form class="inline-form" @submit.prevent="addTodo">
      <input
        v-model="todoInput"
        aria-label="新的待办事项"
        placeholder="添加一件要做的事…"
        maxlength="200"
        autofocus
      /><button class="primary-button" :disabled="!todoInput.trim()" aria-label="添加待办">
        <Plus :size="18" />
      </button>
    </form>
    <div v-if="!state.todos.length" class="empty-state">
      <Check :size="36" />
      <p>暂时没有待办，享受轻松的一刻。</p>
    </div>
    <ul class="todo-list">
      <li v-for="todo in state.todos" :key="todo.id">
        <label :class="{ done: todo.done }"
          ><input v-model="todo.done" type="checkbox" />{{ todo.text }}</label
        ><button
          class="icon-button"
          :aria-label="`删除待办：${todo.text}`"
          @click="state.todos = state.todos.filter((x) => x.id !== todo.id)"
        >
          <Trash2 :size="16" />
        </button>
      </li>
    </ul>
  </div>
  <div v-else-if="kind === 'noteApp'" class="note-panel">
    <textarea
      v-model="state.note"
      aria-label="笔记内容"
      placeholder="在这里写下想法、灵感，或今天的小事…"
      autofocus
    />
    <div class="note-status">
      <span>自动保存到本机</span><span>{{ state.note.length }} 字</span>
    </div>
  </div>
  <div v-else-if="kind === 'pomodoro'" class="timer-panel">
    <p class="muted">一次只做一件事，把专注留给当下。</p>
    <div class="large-timer" :class="{ running: state.timer.endAt }">{{ timerLabel }}</div>
    <p>今天已完成 {{ state.timer.count }} 个番茄</p>
    <div class="button-row centered">
      <button class="secondary-button" aria-label="重置番茄钟" @click="resetTimer">
        <RotateCcw :size="18" /></button
      ><button class="primary-button" @click="toggleTimer">
        <Pause v-if="state.timer.endAt" :size="18" /><Play v-else :size="18" />{{
          state.timer.endAt ? '暂停专注' : '开始专注'
        }}
      </button>
    </div>
    <label class="timer-duration"
      >专注时长
      <select
        v-model.number="state.timer.duration"
        :disabled="!!state.timer.endAt"
        @change="resetTimer"
      >
        <option :value="15">15 分钟</option>
        <option :value="25">25 分钟</option>
        <option :value="45">45 分钟</option>
        <option :value="60">60 分钟</option>
      </select></label
    >
  </div>
  <div v-else-if="kind === 'calendar'" class="calendar-panel">
    <div class="calendar-toolbar">
      <button class="icon-button" aria-label="上个月" @click="monthOffset--">
        <ChevronLeft :size="20" />
      </button>
      <h3>{{ calendarDate.getFullYear() }}年 {{ calendarDate.getMonth() + 1 }}月</h3>
      <button class="icon-button" aria-label="下个月" @click="monthOffset++">
        <ChevronRight :size="20" />
      </button>
    </div>
    <div class="calendar-grid">
      <b v-for="label in ['日', '一', '二', '三', '四', '五', '六']" :key="label">{{ label }}</b>
      <div
        v-for="(day, i) in calendarDays"
        :key="i"
        :class="{ today: day === now.getDate() && monthOffset === 0 }"
      >
        <template v-if="day"
          ><strong>{{ day }}</strong
          ><small>{{ lunarDay(day) }}</small></template
        >
      </div>
    </div>
    <button class="secondary-button" @click="monthOffset = 0">回到今天</button>
  </div>
  <div v-else-if="kind === 'weather'" class="weather-panel">
    <p class="muted">参考天气快照 · {{ weather.update_time }}</p>
    <div class="weather-details">
      <WeatherIcon type="fog" :size="72" /><strong>{{ weather.data[0].tem }}°</strong>
      <div>
        北京 · {{ weather.data[0].wea }}<br /><small
          >湿度 {{ weather.data[0].humidity }} · 空气质量 {{ weather.data[0].air_level }}</small
        >
      </div>
    </div>
    <p class="body-copy">{{ weather.data[0].air_tips }}</p>
    <div class="forecast-detail">
      <div v-for="day in weather.data.slice(0, 6)" :key="day.date">
        <span>{{ day.week }}</span
        ><WeatherIcon :type="day.wea.includes('云') ? 'cloud' : 'sun'" /><span
          >{{ day.tem1 }}° / {{ day.tem2 }}°</span
        >
      </div>
    </div>
    <a
      class="primary-button"
      href="https://www.weather.com.cn/weather/101010100.shtml"
      target="_blank"
      rel="noopener noreferrer"
      >查看实时天气 <ExternalLink :size="15"
    /></a>
  </div>
  <div v-else-if="kind === 'ai'" class="ai-panel">
    <p class="body-copy">写周报、写方案、做攻略、起名字。选择你喜欢的 AI 助手，开始一段对话。</p>
    <textarea
      v-model="aiPrompt"
      aria-label="想问 AI 的问题"
      placeholder="今天想聊些什么？"
    /><button
      class="primary-button full-width"
      @click="
        openLink(
          `https://chatgpt.com/${aiPrompt.trim() ? '?q=' + encodeURIComponent(aiPrompt) : ''}`,
        )
      "
    >
      在 ChatGPT 中继续 <ExternalLink :size="16" />
    </button>
    <div class="ai-services">
      <button v-for="site in aiSites" :key="site.name" @click="openLink(site.url)">
        <span :style="{ background: site.color }">{{ site.letter }}</span
        >{{ site.name }} <ExternalLink :size="13" />
      </button>
    </div>
  </div>
  <div v-else-if="kind === 'food'" class="food-panel">
    <span class="big-food">🍜</span>
    <h3>{{ food }}</h3>
    <p class="muted">把选择交给一点点运气。</p>
    <button class="primary-button" @click="chooseFood">
      {{ food === '今天吃什么？' ? '帮我选一个' : '再换一道' }}
    </button>
  </div>
  <div v-else-if="kind === 'muyu'" class="wood-panel">
    <p class="muted">木鱼一敲，烦恼丢掉</p>
    <button class="wood-hit" aria-label="敲木鱼" @click="state.woodCount++">
      <img :src="theme.wood!" alt="木鱼" />
    </button>
    <h3>功德 +{{ state.woodCount }}</h3>
    <p class="hint">点击木鱼，留一点安静给自己。</p>
  </div>
  <div v-else-if="kind === 'imageConversion'">
    <p class="body-copy">在浏览器中转换图片格式，图片不会上传到服务器。</p>
    <label class="image-drop"
      ><ImagePlus :size="32" /><span>{{ imageFile?.name || '选择一张图片' }}</span
      ><input type="file" accept="image/*" @change="pickImage" /></label
    ><label class="form-label"
      >输出格式<select v-model="imageFormat">
        <option value="image/png">PNG · 无损</option>
        <option value="image/jpeg">JPEG · 适合照片</option>
        <option value="image/webp">WebP · 更小体积</option>
      </select></label
    ><button
      class="primary-button full-width"
      :disabled="!imageFile || converting"
      @click="convertImage"
    >
      <Download :size="17" />{{ converting ? '正在转换…' : '转换并下载' }}
    </button>
  </div>
  <div v-else-if="kind === 'amountConversion'">
    <p class="body-copy">将数字金额转换为人民币大写。</p>
    <label class="form-label"
      >金额（元）<input v-model="amount" inputmode="decimal" placeholder="例如：12345.67" /></label
    ><output class="currency-output">{{ uppercase || '请输入金额' }}</output
    ><button class="primary-button" :disabled="!amount" @click="copyAmount">复制结果</button>
  </div>
</template>
