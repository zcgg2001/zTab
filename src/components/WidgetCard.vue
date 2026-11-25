<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ClipboardList,
  Eye,
  Feather,
  LocateFixed,
  Sparkles,
  Image,
  ArrowLeftRight,
} from 'lucide-vue-next';
import { Solar } from 'lunar-typescript';
import theme from '../data/theme.json';
import feeds from '../data/feeds.json';
import weather from '../data/weather.json';
import { now, state, timerLabel } from '../state';
import WeatherIcon from './WeatherIcon.vue';
import type { Bookmark } from '../types';
const props = defineProps<{ item: Bookmark }>();
const emit = defineEmits<{ activate: [] }>();
const channel = ref('baidu');
const channels = [
  { id: 'baidu', name: '百度' },
  { id: 'weibo', name: '微博' },
  { id: 'bilibili', name: '哔站' },
  { id: 'zhihu', name: '知乎' },
  { id: 'douyin', name: '抖音' },
  { id: 'toutiao', name: '头条' },
];
const headlines = computed(
  () =>
    (feeds.channels as Record<string, { title: string; url: string; hot?: string | number }[]>)[
      channel.value
    ] || [],
);
const lunar = computed(() => Solar.fromDate(now.value).getLunar());
const lunarLabel = computed(
  () => `${lunar.value.getMonthInChinese()}月${lunar.value.getDayInChinese()}`,
);
const dayOfYear = computed(() =>
  Math.floor(
    (Date.UTC(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()) -
      Date.UTC(now.value.getFullYear(), 0, 0)) /
      86400000,
  ),
);
const forecasts = computed(() => weather.data.slice(1, 6));
const todos = computed(() => state.todos.filter((x) => !x.done).slice(0, 3));
const hot = (value: string | number | undefined) =>
  Number.isFinite(Number(value)) ? `${(Number(value) / 10000).toFixed(1)}万` : String(value || '');
</script>

<template>
  <div
    v-if="item.name_en === 'topSearch'"
    class="widget hot-widget"
    :style="{ backgroundImage: `url(${theme.hotBackground})` }"
  >
    <div class="hot-tabs" role="group" aria-label="热搜平台">
      <button
        v-for="c in channels"
        :key="c.id"
        :aria-pressed="channel === c.id"
        :class="{ selected: channel === c.id }"
        :title="`${c.name} · ${feeds.capturedAt} 热搜快照`"
        @click="channel = c.id"
      >
        {{ c.name }}
      </button>
    </div>
    <ol v-if="headlines.length" class="hot-list">
      <li v-for="(entry, index) in headlines" :key="index">
        <span class="hot-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</span
        ><a :href="entry.url" target="_blank" rel="noopener noreferrer" :title="entry.title">{{
          entry.title
        }}</a
        ><span v-if="entry.hot" class="hot-count">{{ hot(entry.hot) }}</span>
      </li>
    </ol>
    <div v-else class="hot-empty">
      暂无榜单数据
      <a href="https://www.zhihu.com/hot" target="_blank" rel="noopener noreferrer"
        >查看知乎热榜 ↗</a
      >
    </div>
  </div>
  <button
    v-else-if="item.name_en === 'weather'"
    class="widget weather-widget"
    :title="`天气快照 · ${weather.update_time}，点击查看详情`"
    @click="emit('activate')"
  >
    <div class="weather-city">北京 · 北京 <LocateFixed :size="12" /></div>
    <div class="weather-now">
      <strong>{{ weather.data[0].tem }}°</strong>
      <div class="weather-high">
        <WeatherIcon type="fog" :size="32" /><span
          >最高{{ weather.data[0].tem1 }}°C ～ 最低{{ weather.data[0].tem2 }}°C</span
        >
      </div>
    </div>
    <div class="weather-forecast">
      <div v-for="(day, i) in forecasts" :key="day.date">
        <span>{{ i === 0 ? '明天' : day.week.replace('星期', '周') }}</span
        ><WeatherIcon :type="i < 2 ? 'cloud' : 'sun'" :size="24" /><span
          >{{ day.tem1 }}° {{ day.tem2 }}°</span
        >
      </div>
    </div>
  </button>
  <button
    v-else-if="item.name_en === 'pomodoro'"
    class="widget pomodoro-widget"
    @click="emit('activate')"
  >
    <div class="pomodoro-info">
      <b>番茄钟</b>
      <div>
        <strong>{{ state.timer.count }}</strong
        ><span> 个番茄</span>
      </div>
      <span class="pomodoro-status">{{
        state.timer.endAt
          ? '专注中'
          : state.timer.remaining < state.timer.duration * 60
            ? '已暂停'
            : '待开始'
      }}</span
      ><small>POMODORO TIMER</small>
    </div>
    <div class="pomodoro-clock">
      <span>{{ timerLabel }}</span>
    </div>
  </button>
  <button v-else-if="item.name_en === 'ai'" class="widget ai-widget" @click="emit('activate')">
    <div class="ai-heading">
      <b>AI助手</b><img v-if="theme.aiIcon" :src="theme.aiIcon" alt="" /><Sparkles
        v-else
        :size="21"
      />
    </div>
    <div class="ai-message">写周报，写方案，做攻略，起名字...</div>
  </button>
  <button
    v-else-if="item.name_en === 'todo'"
    class="widget todo-widget"
    :style="{ backgroundImage: `url(${theme.todoBackground})` }"
    @click="emit('activate')"
  >
    <b><ClipboardList :size="16" /> 待办</b>
    <div v-if="!todos.length" class="todo-empty"><span>暂无待办事项</span></div>
    <ul v-else class="todo-preview">
      <li v-for="todo in todos" :key="todo.id">○ {{ todo.text }}</li>
    </ul>
  </button>
  <button
    v-else-if="item.name_en === 'noteApp'"
    class="widget note-widget"
    @click="emit('activate')"
  >
    <div class="note-heading"><Feather :size="20" /><b>记事本</b><Eye :size="17" /></div>
    <p>{{ state.note }}</p>
  </button>
  <button
    v-else-if="item.name_en === 'calendar'"
    class="widget calendar-widget"
    @click="emit('activate')"
  >
    <div class="calendar-month">{{ now.getFullYear() }}年{{ now.getMonth() + 1 }}月</div>
    <strong>{{ now.getDate() }}</strong
    ><span
      >第{{ dayOfYear }}天 第{{
        Math.ceil((dayOfYear + new Date(now.getFullYear(), 0, 1).getDay()) / 7)
      }}周</span
    >
    <p>{{ lunarLabel }} 周{{ '日一二三四五六'[now.getDay()] }}</p>
  </button>
  <button v-else-if="item.name_en === 'food'" class="widget food-widget" @click="emit('activate')">
    <b>今天吃什么？</b><span class="food-illustration">🍜</span><span class="food-start">开始</span>
  </button>
  <button v-else-if="item.name_en === 'muyu'" class="widget wood-widget" @click="emit('activate')">
    <img :src="theme.wood || item.src" alt="电子木鱼" /><span>心静 · 自然安</span>
  </button>
  <button v-else class="widget utility-widget" @click="emit('activate')">
    <Image v-if="item.name_en === 'imageConversion'" :size="42" /><ArrowLeftRight
      v-else
      :size="32"
    /><span>{{ item.name }}</span>
  </button>
</template>
