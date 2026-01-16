<template>
  <div class="calendar-app">
    <!-- 头部 -->
    <div class="calendar-header">
      <div class="header-left">
        <i class="fas fa-arrow-left back-icon" @click="$emit('back')"></i>
        <button class="nav-save" @click="saveChanges" :disabled="isSaving || !hasChanges" title="保存">
          <i :class="['fas', isSaving ? 'fa-spinner fa-spin' : 'fa-save']"></i>
        </button>
      </div>
      <span class="header-title">日历</span>
      <div class="header-right">
        <button class="refresh-btn" @click="refreshCalendar" :disabled="isLoading">
          <i :class="['fas', 'fa-sync-alt', { 'fa-spin': isLoading }]"></i>
        </button>
        <button class="view-toggle-btn" @click="toggleView">
          <i :class="['fas', viewMode === 'calendar' ? 'fa-list' : 'fa-calendar']"></i>
        </button>
        <button class="today-btn" @click="goToToday">今天</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <span>加载日历数据...</span>
      <button class="abort-btn" @click="handleAbort">
        <i class="fas fa-stop"></i>
        <span>终止生成</span>
      </button>
    </div>

    <!-- 可滚动内容区域（无论是否有数据都显示日历框架） -->
    <div v-else class="calendar-content">
      <!-- 事件类型筛选器 -->
      <div class="event-filter">
        <div
          class="filter-item"
          :class="{ active: filters.world }"
          @click="toggleFilter('world')"
        >
          <span class="filter-dot" :style="{ background: EVENT_COLORS.world }"></span>
          <span>世界</span>
        </div>
        <div
          class="filter-item"
          :class="{ active: filters.major }"
          @click="toggleFilter('major')"
        >
          <span class="filter-dot" :style="{ background: EVENT_COLORS.major }"></span>
          <span>大型</span>
        </div>
        <div
          class="filter-item"
          :class="{ active: filters.user }"
          @click="toggleFilter('user')"
        >
          <span class="filter-dot" :style="{ background: EVENT_COLORS.user }"></span>
          <span>个人</span>
        </div>
        <div
          class="filter-item"
          :class="{ active: filters.character }"
          @click="toggleFilter('character')"
        >
          <span class="filter-dot" :style="{ background: EVENT_COLORS.character }"></span>
          <span>角色</span>
        </div>
      </div>

      <!-- 日历视图 -->
      <template v-if="viewMode === 'calendar'">
        <!-- 月份导航 -->
        <div class="month-nav">
          <button class="nav-btn" @click="prevMonth">
            <i class="fas fa-chevron-left"></i>
          </button>
          <div class="month-display">
            <span class="year">{{ currentYear }}年</span>
            <span class="month">{{ currentMonth }}月</span>
          </div>
          <button class="nav-btn" @click="nextMonth">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <!-- 星期标题 -->
        <div class="weekday-header">
          <div v-for="day in weekdays" :key="day" class="weekday-cell">{{ day }}</div>
        </div>

        <!-- 日历网格 -->
        <div class="calendar-grid">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            class="day-cell"
            :class="{
              'other-month': !day.isCurrentMonth,
              'today': day.isToday,
              'selected': isSelected(day),
              'has-event': hasEvents(day)
            }"
            @click="selectDate(day)"
          >
            <span class="day-number">{{ day.date }}</span>
            <div v-if="hasEvents(day)" class="event-dots">
              <span v-if="hasEventType(day, 'world')" class="dot world"></span>
              <span v-if="hasEventType(day, 'major')" class="dot major"></span>
              <span v-if="hasEventType(day, 'user')" class="dot user"></span>
              <span v-if="hasEventType(day, 'character')" class="dot character"></span>
            </div>
          </div>
        </div>

        <!-- 选中日期的日程 -->
        <div class="schedule-section">
          <div class="schedule-header">
            <i class="fas fa-calendar-check"></i>
            <span>{{ formatSelectedDate }}的日程</span>
            <button class="add-event-btn" @click="addNewEvent">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="schedule-list">
            <div v-if="selectedDateEvents.length === 0" class="no-events">
              <i class="fas fa-coffee"></i>
              <span>今日暂无日程安排</span>
            </div>
            <div
              v-for="event in selectedDateEvents"
              :key="event.id"
              class="event-item"
              :style="{ borderLeftColor: getEventColor(event.type) }"
            >
              <div class="event-header">
                <div class="event-type-badge" :style="{ background: getEventColor(event.type) }">
                  <i v-if="event.icon" :class="['fas', event.icon]"></i>
                  {{ getEventTypeName(event.type) }}
                </div>
                <div class="event-time">
                  <i class="fas fa-clock"></i>
                  {{ event.time }}
                </div>
              </div>
              <div class="event-title">{{ event.title }}</div>
              <div v-if="event.description" class="event-desc">{{ event.description }}</div>
              <div class="event-footer">
                <div v-if="event.location" class="event-location">
                  <i class="fas fa-map-marker-alt"></i>
                  {{ event.location }}
                </div>
                <button class="delete-event-btn" @click="deleteEvent(event)">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 日程列表视图 -->
      <template v-else>
        <div class="all-events-section">
          <div class="all-events-header">
            <i class="fas fa-list-ul"></i>
            <span>所有日程</span>
            <span class="event-count">{{ sortedAllEvents.length }}项</span>
          </div>
          <div class="all-events-list">
            <div v-if="sortedAllEvents.length === 0" class="no-events">
              <i class="fas fa-calendar-times"></i>
              <span>暂无日程安排</span>
            </div>
            <div
              v-for="event in sortedAllEvents"
              :key="event.id"
              class="event-item"
              :style="{ borderLeftColor: getEventColor(event.type) }"
            >
              <div class="event-date-badge">
                {{ formatEventDate(event.date) }}
              </div>
              <div class="event-header">
                <div class="event-type-badge" :style="{ background: getEventColor(event.type) }">
                  <i v-if="event.icon" :class="['fas', event.icon]"></i>
                  {{ getEventTypeName(event.type) }}
                </div>
                <div class="event-time">
                  <i class="fas fa-clock"></i>
                  {{ event.time }}
                </div>
              </div>
              <div class="event-title">{{ event.title }}</div>
              <div v-if="event.description" class="event-desc">{{ event.description }}</div>
              <div class="event-footer">
                <div v-if="event.location" class="event-location">
                  <i class="fas fa-map-marker-alt"></i>
                  {{ event.location }}
                </div>
                <button class="delete-event-btn" @click="deleteEvent(event)">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 创建日程弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="create-modal">
        <div class="modal-header">
          <span class="modal-title">创建日程</span>
          <i class="fas fa-times close-icon" @click="closeCreateModal"></i>
        </div>

        <div class="modal-body">
          <!-- 事件类型选择 -->
          <div class="form-group">
            <label class="form-label">类型</label>
            <div class="type-selector">
              <div
                v-for="typeOption in eventTypeOptions"
                :key="typeOption.value"
                class="type-option"
                :class="{ active: newEventForm.type === typeOption.value }"
                :style="{ '--type-color': typeOption.color }"
                @click="newEventForm.type = typeOption.value"
              >
                <span class="type-dot" :style="{ background: typeOption.color }"></span>
                <span>{{ typeOption.label }}</span>
              </div>
            </div>
          </div>

          <!-- 标题 -->
          <div class="form-group">
            <label class="form-label">标题</label>
            <input
              type="text"
              v-model="newEventForm.title"
              class="form-input"
              placeholder="请输入日程标题"
            />
          </div>

          <!-- 时间 -->
          <div class="form-group">
            <label class="form-label">时间</label>
            <div class="time-inputs">
              <input
                type="time"
                v-model="newEventForm.startTime"
                class="form-input time-input"
              />
              <span class="time-separator">至</span>
              <input
                type="time"
                v-model="newEventForm.endTime"
                class="form-input time-input"
              />
            </div>
          </div>

          <!-- 地点 -->
          <div class="form-group">
            <label class="form-label">地点</label>
            <input
              type="text"
              v-model="newEventForm.location"
              class="form-input"
              placeholder="请输入地点（可选）"
            />
          </div>

          <!-- 描述 -->
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea
              v-model="newEventForm.description"
              class="form-textarea"
              placeholder="请输入描述（可选）"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeCreateModal">取消</button>
          <button class="btn-confirm" @click="confirmCreateEvent" :disabled="!newEventForm.title.trim()">
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import yaml from 'yaml';
import { loadModuleFromHistoryAsync, calendarState, loadCalendarDataFromAi, updateModuleInMessage, findModuleMessageId, abortCurrentRequest, store } from '../../store';

defineEmits(['back']);

// ========== 数据类型定义 ==========
// 统一事件类型
type EventType = 'world' | 'major' | 'user' | 'character';

interface CalendarData {
  date: string;
  time: string;
  weekday: string;
  worldEvents?: any[];
  majorEvents?: any[];
  userEvents?: any[];
  characterEvents?: any[];
}

interface UnifiedEvent {
  id: string;
  type: EventType;
  date: string;
  title: string;
  time?: string;
  location?: string;
  description?: string;
  icon?: string;
}

// ========== 状态管理 ==========
const isLoading = ref(true);
const isSaving = ref(false);
const hasChanges = ref(false);
const calendarData = ref<CalendarData | null>(null);
const originalDataSnapshot = ref<string>(''); // 用于检测变化

// 创建日程弹窗状态
const showCreateModal = ref(false);
const newEventForm = reactive({
  type: 'user' as EventType,
  title: '',
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  description: '',
});

// 事件类型选项
const eventTypeOptions = [
  { value: 'user' as EventType, label: '个人', color: '#8FB8ED' },
  { value: 'character' as EventType, label: '角色', color: '#FFC8DD' },
  { value: 'major' as EventType, label: '大型', color: '#FFB347' },
  { value: 'world' as EventType, label: '世界', color: '#FF6B6B' },
];

// 星期偏移量（虚构星期 - 现实星期）
const weekdayOffset = ref(0);

// 视图模式：calendar 日历视图，list 列表视图
const viewMode = ref<'calendar' | 'list'>('calendar');

// 切换视图
function toggleView() {
  viewMode.value = viewMode.value === 'calendar' ? 'list' : 'calendar';
}

// ========== 从历史楼层加载数据 ==========
async function loadCalendarData() {
  isLoading.value = true;

  try {
    // 使用异步版本避免阻塞主线程
    const data = await loadModuleFromHistoryAsync<CalendarData>('calendar');
    if (data) {
      calendarData.value = data;
      // 计算星期偏移量
      calculateWeekdayOffset(data);
      // 设置显示的年月和选中日期为虚构世界的"今天"
      initializeToFictionalToday(data);
      // 更新数据快照
      updateSnapshot();
      console.info('[Calendar] 从历史楼层加载数据成功');
    } else {
      console.info('[Calendar] 未找到历史数据，自动刷新');
      calendarData.value = null;
      // 自动调用 AI 刷新
      await refreshCalendar();
    }
  } catch (e) {
    console.error('[Calendar] 加载数据失败:', e);
    calendarData.value = null;
  } finally {
    isLoading.value = false;
  }
}

// 刷新日历数据（调用 AI 生成）
async function refreshCalendar() {
  isLoading.value = true;

  try {
    await loadCalendarDataFromAi(true); // 强制刷新

    if (calendarState.data) {
      calendarData.value = calendarState.data;
      calculateWeekdayOffset(calendarState.data);
      initializeToFictionalToday(calendarState.data);
      // 更新数据快照
      updateSnapshot();
      console.info('[Calendar] AI 刷新成功');
    } else if (calendarState.error) {
      console.error('[Calendar] AI 刷新失败:', calendarState.error);
    }
  } catch (e) {
    console.error('[Calendar] 刷新异常:', e);
  } finally {
    isLoading.value = false;
  }
}

// 初始化显示为虚构世界的"今天"
function initializeToFictionalToday(data: CalendarData) {
  if (!data.date) return;

  const dateMatch = data.date.match(/(\d+)年(\d+)月(\d+)日/);
  if (!dateMatch) return;

  const year = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]) - 1;
  const day = parseInt(dateMatch[3]);
  const fictionalToday = new Date(year, month, day);

  displayYear.value = year;
  displayMonth.value = month;
  selectedDate.value = fictionalToday;
}

// 计算星期偏移量
function calculateWeekdayOffset(data: CalendarData) {
  if (!data.date || !data.weekday) {
    weekdayOffset.value = 0;
    return;
  }

  // 解析传入的日期（格式：X年X月X日）
  const dateMatch = data.date.match(/(\d+)年(\d+)月(\d+)日/);
  if (!dateMatch) {
    weekdayOffset.value = 0;
    return;
  }

  const year = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]) - 1;
  const day = parseInt(dateMatch[3]);
  const realDate = new Date(year, month, day);
  const realWeekday = realDate.getDay(); // 0-6

  // 解析传入的星期（格式：星期一、星期二...）
  const weekdayMap: Record<string, number> = {
    '星期日': 0, '星期天': 0,
    '星期一': 1,
    '星期二': 2,
    '星期三': 3,
    '星期四': 4,
    '星期五': 5,
    '星期六': 6
  };

  const fictionalWeekday = weekdayMap[data.weekday];
  if (fictionalWeekday === undefined) {
    weekdayOffset.value = 0;
    return;
  }

  // 计算偏移量
  weekdayOffset.value = fictionalWeekday - realWeekday;
  console.info(`[Calendar] 星期偏移量: ${weekdayOffset.value} (虚构:${data.weekday} 现实:${realWeekday})`);
}

// 获取应用偏移后的星期
function getOffsetWeekday(date: Date): number {
  const realWeekday = date.getDay();
  let offsetWeekday = (realWeekday + weekdayOffset.value) % 7;
  if (offsetWeekday < 0) offsetWeekday += 7;
  return offsetWeekday;
}

// 终止生成
function handleAbort() {
  abortCurrentRequest();
  isLoading.value = false;
  store.activeApp = 'home';
  console.info('[Calendar] 用户终止了 AI 生成');
}

onMounted(() => {
  loadCalendarData();
});

// 星期标题
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

// 当前显示的年月
const displayYear = ref(new Date().getFullYear());
const displayMonth = ref(new Date().getMonth()); // 0-11

// 选中的日期
const selectedDate = ref(new Date());

// 计算属性：当前年
const currentYear = computed(() => displayYear.value);

// 计算属性：当前月
const currentMonth = computed(() => displayMonth.value + 1);

// 事件类型颜色配置
const EVENT_COLORS = {
  world: '#FF6B6B',
  major: '#FFB347',
  user: '#8FB8ED',
  character: '#FFC8DD'
};

const EVENT_TYPE_NAMES = {
  world: '世界事件',
  major: '大型事件',
  user: '用户事件',
  character: '角色事件'
};

// 筛选器状态
const filters = reactive({
  world: true,
  major: true,
  user: true,
  character: true
});

// 切换筛选器
function toggleFilter(type: keyof typeof filters) {
  filters[type] = !filters[type];
}

// 从 calendarData 读取事件数据
const worldEvents = computed(() => {
  if (!calendarData.value?.worldEvents) return [];
  return calendarData.value.worldEvents.map(e => ({
    ...e,
    type: 'world' as const
  }));
});

const majorEvents = computed(() => {
  if (!calendarData.value?.majorEvents) return [];
  return calendarData.value.majorEvents.map(e => ({
    ...e,
    type: 'major' as const
  }));
});

const userEvents = computed(() => {
  if (!calendarData.value?.userEvents) return [];
  return calendarData.value.userEvents.map(e => ({
    ...e,
    type: 'user' as const
  }));
});

const characterEvents = computed(() => {
  if (!calendarData.value?.characterEvents) return [];
  return calendarData.value.characterEvents.map(e => ({
    ...e,
    type: 'character' as const
  }));
});

// 辅助函数：格式化日期为 key
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 合并所有事件并根据筛选器过滤
const allEvents = computed<UnifiedEvent[]>(() => {
  const events: UnifiedEvent[] = [];

  if (filters.world) {
    worldEvents.value.forEach(e => events.push({
      ...e,
      time: '全天'
    }));
  }

  if (filters.major) {
    majorEvents.value.forEach(e => events.push({
      ...e,
      time: `${e.startTime} - ${e.endTime}`
    }));
  }

  if (filters.user) {
    userEvents.value.forEach(e => events.push({
      ...e,
      time: `${e.startTime} - ${e.endTime}`
    }));
  }

  if (filters.character) {
    characterEvents.value.forEach(e => events.push({
      ...e,
      time: e.time
    }));
  }

  return events;
});

// 按日期排序的所有事件
const sortedAllEvents = computed<UnifiedEvent[]>(() => {
  return [...allEvents.value].sort((a, b) => {
    // 先按日期排序
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    // 同一天按时间排序（全天事件排在前面）
    if (a.time === '全天') return -1;
    if (b.time === '全天') return 1;
    return (a.time || '').localeCompare(b.time || '');
  });
});

// 格式化事件日期显示（使用星期偏移）
function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const offsetWeekday = getOffsetWeekday(date);
  const weekday = weekdays[offsetWeekday];

  // 获取"今天"：优先使用虚构日期，否则使用现实日期
  const fictionalToday = getFictionalToday();
  const today = fictionalToday || new Date();

  if (dateStr === formatDateKey(today)) {
    return `今天 ${month}/${day}`;
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === formatDateKey(tomorrow)) {
    return `明天 ${month}/${day}`;
  }

  return `${month}月${day}日 周${weekday}`;
}

// 获取虚构世界的"今天"日期
function getFictionalToday(): Date | null {
  if (!calendarData.value?.date) return null;
  const dateMatch = calendarData.value.date.match(/(\d+)年(\d+)月(\d+)日/);
  if (!dateMatch) return null;
  return new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
}

// 获取事件颜色
function getEventColor(type: EventType): string {
  return EVENT_COLORS[type];
}

// 获取事件类型名称
function getEventTypeName(type: EventType): string {
  return EVENT_TYPE_NAMES[type];
}

// 计算日历天数
interface CalendarDay {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  fullDate: Date;
}

const calendarDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = [];
  const year = displayYear.value;
  const month = displayMonth.value;

  // 获取当月第一天
  const firstDay = new Date(year, month, 1);
  // 获取当月最后一天
  const lastDay = new Date(year, month + 1, 0);

  // 获取当月第一天是星期几（应用偏移）
  const firstDayOfWeek = getOffsetWeekday(firstDay);

  // 获取上月最后几天
  const prevMonthLastDay = new Date(year, month, 0);
  const prevMonthDays = prevMonthLastDay.getDate();

  // 获取"今天"：优先使用虚构日期，否则使用现实日期
  const fictionalToday = getFictionalToday();
  const today = fictionalToday || new Date();
  const todayKey = formatDateKey(today);

  // 填充上月的天数
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthDays - i;
    const fullDate = new Date(year, month - 1, date);
    days.push({
      date,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
      isToday: formatDateKey(fullDate) === todayKey,
      fullDate
    });
  }

  // 填充当月的天数
  for (let date = 1; date <= lastDay.getDate(); date++) {
    const fullDate = new Date(year, month, date);
    days.push({
      date,
      month,
      year,
      isCurrentMonth: true,
      isToday: formatDateKey(fullDate) === todayKey,
      fullDate
    });
  }

  // 填充下月的天数（补满6行）
  const remainingDays = 42 - days.length;
  for (let date = 1; date <= remainingDays; date++) {
    const fullDate = new Date(year, month + 1, date);
    days.push({
      date,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
      isToday: formatDateKey(fullDate) === todayKey,
      fullDate
    });
  }

  return days;
});

// 格式化选中日期显示（使用星期偏移）
const formatSelectedDate = computed(() => {
  const date = selectedDate.value;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const offsetWeekday = getOffsetWeekday(date);
  const weekday = weekdays[offsetWeekday];
  return `${month}月${day}日 周${weekday}`;
});

// 获取选中日期的事件
const selectedDateEvents = computed(() => {
  const dateKey = formatDateKey(selectedDate.value);
  return allEvents.value.filter(e => e.date === dateKey);
});

// 检查某天是否有特定类型事件
function hasEventType(day: CalendarDay, type: EventType): boolean {
  const dateKey = formatDateKey(day.fullDate);
  switch (type) {
    case 'world':
      return filters.world && worldEvents.value.some(e => e.date === dateKey);
    case 'major':
      return filters.major && majorEvents.value.some(e => e.date === dateKey);
    case 'user':
      return filters.user && userEvents.value.some(e => e.date === dateKey);
    case 'character':
      return filters.character && characterEvents.value.some(e => e.date === dateKey);
    default:
      return false;
  }
}

// 检查某天是否有事件（任意类型）
function hasEvents(day: CalendarDay): boolean {
  const dateKey = formatDateKey(day.fullDate);
  return allEvents.value.some(e => e.date === dateKey);
}

// 检查是否选中
function isSelected(day: CalendarDay): boolean {
  return formatDateKey(day.fullDate) === formatDateKey(selectedDate.value);
}

// 选择日期
function selectDate(day: CalendarDay) {
  selectedDate.value = day.fullDate;
}

// 上一月
function prevMonth() {
  if (displayMonth.value === 0) {
    displayMonth.value = 11;
    displayYear.value--;
  } else {
    displayMonth.value--;
  }
}

// 下一月
function nextMonth() {
  if (displayMonth.value === 11) {
    displayMonth.value = 0;
    displayYear.value++;
  } else {
    displayMonth.value++;
  }
}

// 回到今天（虚构世界的今天）
function goToToday() {
  const fictionalToday = getFictionalToday();
  const today = fictionalToday || new Date();
  displayYear.value = today.getFullYear();
  displayMonth.value = today.getMonth();
  selectedDate.value = today;
}

// 检测数据变化
function checkForChanges() {
  if (!calendarData.value) {
    hasChanges.value = false;
    return;
  }
  const currentSnapshot = JSON.stringify(calendarData.value);
  hasChanges.value = currentSnapshot !== originalDataSnapshot.value;
}

// 更新数据快照
function updateSnapshot() {
  if (calendarData.value) {
    originalDataSnapshot.value = JSON.stringify(calendarData.value);
  }
  hasChanges.value = false;
}

// 打开创建日程弹窗
function addNewEvent() {
  // 重置表单
  newEventForm.type = 'user';
  newEventForm.title = '';
  newEventForm.startTime = '09:00';
  newEventForm.endTime = '10:00';
  newEventForm.location = '';
  newEventForm.description = '';
  showCreateModal.value = true;
}

// 关闭创建日程弹窗
function closeCreateModal() {
  showCreateModal.value = false;
}

// 确认创建日程
function confirmCreateEvent() {
  if (!calendarData.value || !newEventForm.title.trim()) return;

  const dateKey = formatDateKey(selectedDate.value);
  const eventType = newEventForm.type;

  // 根据事件类型创建不同格式的事件
  const baseEvent = {
    id: `${eventType}_${Date.now()}`,
    date: dateKey,
    title: newEventForm.title.trim(),
    description: newEventForm.description.trim() || undefined,
    location: newEventForm.location.trim() || undefined,
  };

  // 根据类型添加到对应的事件列表
  switch (eventType) {
    case 'world':
      if (!calendarData.value.worldEvents) {
        calendarData.value.worldEvents = [];
      }
      calendarData.value.worldEvents.push({
        ...baseEvent,
        // world 事件通常是全天事件
      });
      break;
    case 'major':
      if (!calendarData.value.majorEvents) {
        calendarData.value.majorEvents = [];
      }
      calendarData.value.majorEvents.push({
        ...baseEvent,
        startTime: newEventForm.startTime,
        endTime: newEventForm.endTime,
      });
      break;
    case 'user':
      if (!calendarData.value.userEvents) {
        calendarData.value.userEvents = [];
      }
      calendarData.value.userEvents.push({
        ...baseEvent,
        startTime: newEventForm.startTime,
        endTime: newEventForm.endTime,
      });
      break;
    case 'character':
      if (!calendarData.value.characterEvents) {
        calendarData.value.characterEvents = [];
      }
      calendarData.value.characterEvents.push({
        ...baseEvent,
        time: `${newEventForm.startTime} - ${newEventForm.endTime}`,
      });
      break;
  }

  checkForChanges();
  closeCreateModal();
  console.info('[Calendar] 已创建日程:', baseEvent.title);
}

// 删除日程
function deleteEvent(event: UnifiedEvent) {
  if (!calendarData.value) return;

  const eventType = event.type;
  let eventList: any[] | undefined;

  switch (eventType) {
    case 'world':
      eventList = calendarData.value.worldEvents;
      break;
    case 'major':
      eventList = calendarData.value.majorEvents;
      break;
    case 'user':
      eventList = calendarData.value.userEvents;
      break;
    case 'character':
      eventList = calendarData.value.characterEvents;
      break;
  }

  if (eventList) {
    const index = eventList.findIndex(e => e.id === event.id);
    if (index !== -1) {
      eventList.splice(index, 1);
      checkForChanges();
      console.info('[Calendar] 已删除日程:', event.title);
    }
  }
}

// 保存更改到同一楼层
async function saveChanges() {
  if (!calendarData.value || isSaving.value) return;

  isSaving.value = true;

  try {
    const success = await updateModuleInMessage('calendar', calendarData.value);

    if (success) {
      updateSnapshot();
      console.info('[Calendar] 保存成功');
    } else {
      console.error('[Calendar] 保存失败');
    }
  } catch (e) {
    console.error('[Calendar] 保存异常:', e);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.calendar-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #F0F6FC;
  overflow: hidden;
}

/* 加载状态 */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #8FB8ED;
}

.loading-state i {
  font-size: 32px;
}

.loading-state span {
  font-size: 14px;
  color: #94A3B8;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94A3B8;
}

.empty-state i {
  font-size: 48px;
  opacity: 0.5;
}

.empty-state span {
  font-size: 16px;
}

.empty-hint {
  font-size: 12px;
  color: #CBD5E1;
  margin: 0;
}

/* 可滚动内容区域 */
.calendar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.calendar-content::-webkit-scrollbar {
  width: 4px;
}

.calendar-content::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-content::-webkit-scrollbar-thumb {
  background: rgba(143, 184, 237, 0.3);
  border-radius: 4px;
}

/* 头部 */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.back-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #8FB8ED;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 10px;
}

.nav-save {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-save:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.2);
}

.nav-save:active:not(:disabled) {
  transform: scale(0.95);
  background: rgba(76, 175, 80, 0.25);
}

.nav-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.back-icon:hover {
  transform: translateX(-2px);
  background: rgba(143, 184, 237, 0.2);
}

.header-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 17px;
  font-weight: 600;
  color: #475569;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  border-radius: 10px;
  color: #8FB8ED;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(143, 184, 237, 0.2);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.view-toggle-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  border-radius: 10px;
  color: #8FB8ED;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle-btn:hover {
  background: rgba(143, 184, 237, 0.2);
}

.today-btn {
  padding: 6px 14px;
  background: linear-gradient(135deg, #8FB8ED, #A5C8F7);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
}

.today-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.4);
}

/* 月份导航 */
.month-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(143, 184, 237, 0.1);
  border: 1px solid rgba(143, 184, 237, 0.2);
  border-radius: 12px;
  color: #8FB8ED;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: rgba(143, 184, 237, 0.2);
  transform: scale(1.05);
}

.month-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.month-display .year {
  font-size: 14px;
  color: #94A3B8;
}

.month-display .month {
  font-size: 20px;
  font-weight: 600;
  color: #475569;
}

/* 事件类型筛选器 */
.event-filter {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.5);
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 16px;
  font-size: 11px;
  color: #94A3B8;
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.filter-item:hover {
  background: rgba(255, 255, 255, 0.9);
}

.filter-item.active {
  color: #475569;
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(143, 184, 237, 0.3);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.filter-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.filter-item:not(.active) .filter-dot {
  opacity: 0.4;
}

/* 星期标题 */
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.4);
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  color: #94A3B8;
  font-weight: 500;
}

/* 日历网格 */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: rgba(255, 255, 255, 0.3);
}

.day-cell:hover {
  background: rgba(143, 184, 237, 0.15);
}

.day-cell.other-month {
  background: transparent;
}

.day-cell.other-month .day-number {
  color: #CBD5E1;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.day-cell.today {
  background: linear-gradient(135deg, #8FB8ED, #A5C8F7);
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.4);
}

.day-cell.today .day-number {
  color: white;
  font-weight: 600;
}

.day-cell.selected {
  background: rgba(143, 184, 237, 0.3);
  border: 2px solid #8FB8ED;
}

.day-cell.selected.today {
  background: linear-gradient(135deg, #8FB8ED, #A5C8F7);
  border: 2px solid white;
}

/* 多色事件点 */
.event-dots {
  display: flex;
  gap: 2px;
  position: absolute;
  bottom: 4px;
}

.event-dots .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

.event-dots .dot.world {
  background: #FF6B6B;
}

.event-dots .dot.major {
  background: #FFB347;
}

.event-dots .dot.user {
  background: #8FB8ED;
}

.event-dots .dot.character {
  background: #FFC8DD;
}

.day-cell.today .event-dots .dot {
  box-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
}

/* 日程部分 */
.schedule-section {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px 20px 0 0;
  margin-top: 8px;
  min-height: 150px;
}

.schedule-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.1);
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.schedule-header i {
  color: #8FB8ED;
}

.schedule-header span {
  flex: 1;
}

.add-event-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(143, 184, 237, 0.15);
  border: none;
  border-radius: 8px;
  color: #8FB8ED;
  cursor: pointer;
  transition: all 0.2s;
}

.add-event-btn:hover {
  background: rgba(143, 184, 237, 0.25);
  transform: scale(1.05);
}

.schedule-list {
  padding: 12px 16px;
  padding-bottom: 30px;
}

.schedule-list::-webkit-scrollbar {
  width: 4px;
}

.schedule-list::-webkit-scrollbar-track {
  background: transparent;
}

.schedule-list::-webkit-scrollbar-thumb {
  background: rgba(143, 184, 237, 0.3);
  border-radius: 4px;
}

.no-events {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #94A3B8;
  gap: 10px;
}

.no-events i {
  font-size: 28px;
  opacity: 0.5;
}

.no-events span {
  font-size: 13px;
}

.event-item {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 10px;
  border-left: 4px solid #8FB8ED;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.1);
  transition: all 0.2s;
}

.event-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.15);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 10px;
  color: white;
  font-weight: 500;
}

.event-type-badge i {
  font-size: 9px;
}

.event-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #94A3B8;
}

.event-time i {
  font-size: 9px;
}

.event-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.event-desc {
  font-size: 11px;
  color: #94A3B8;
  margin-bottom: 6px;
  line-height: 1.4;
}

.event-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.event-location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #8FB8ED;
  flex: 1;
}

.event-location i {
  font-size: 10px;
}

.delete-event-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 107, 107, 0.1);
  border: none;
  border-radius: 6px;
  color: #FF6B6B;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}

.delete-event-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  opacity: 1;
}

.event-item:hover .delete-event-btn {
  opacity: 1;
}

/* 日程列表视图 */
.all-events-section {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  margin: 8px 12px;
  min-height: 200px;
}

.all-events-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.1);
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.all-events-header i {
  color: #8FB8ED;
}

.event-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #94A3B8;
  background: rgba(143, 184, 237, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.all-events-list {
  padding: 12px 16px;
  padding-bottom: 30px;
}

.event-date-badge {
  font-size: 11px;
  font-weight: 500;
  color: #8FB8ED;
  margin-bottom: 8px;
  padding: 3px 8px;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 8px;
  display: inline-block;
}

/* ========== 创建日程弹窗 ========== */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.create-modal {
  background: white;
  border-radius: 16px;
  width: calc(100% - 32px);
  max-width: 280px;
  max-height: 70%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
}

.close-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-size: 12px;
}

.close-icon:hover {
  background: rgba(143, 184, 237, 0.1);
  color: #8FB8ED;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(143, 184, 237, 0.3) !important;
  border-radius: 10px;
  font-size: 13px;
  color: #475569 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  transition: all 0.2s;
  outline: none;
}

.form-input:focus {
  border-color: #8FB8ED !important;
  background: white !important;
  box-shadow: 0 0 0 3px rgba(143, 184, 237, 0.1);
}

.form-input::placeholder {
  color: #94A3B8 !important;
  -webkit-text-stroke: 0 !important;
  text-shadow: none !important;
  font-weight: 400 !important;
  opacity: 1 !important;
}

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(143, 184, 237, 0.3) !important;
  border-radius: 10px;
  font-size: 13px;
  color: #475569 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  transition: all 0.2s;
  outline: none;
  resize: none;
  font-family: inherit;
}

.form-textarea:focus {
  border-color: #8FB8ED !important;
  background: white !important;
  box-shadow: 0 0 0 3px rgba(143, 184, 237, 0.1);
}

.form-textarea::placeholder {
  color: #94A3B8 !important;
  -webkit-text-stroke: 0 !important;
  text-shadow: none !important;
  font-weight: 400 !important;
  opacity: 1 !important;
}

/* 类型选择器 */
.type-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 11px;
  color: #64748B;
  background: rgba(143, 184, 237, 0.08);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.type-option:hover {
  background: rgba(143, 184, 237, 0.15);
}

.type-option.active {
  background: rgba(var(--type-color-rgb, 143, 184, 237), 0.15);
  border-color: var(--type-color, #8FB8ED);
  color: #475569;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 时间输入 */
.time-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-input {
  flex: 1;
  text-align: center;
}

.time-separator {
  color: #94A3B8;
  font-size: 12px;
}

/* 弹窗底部 */
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(143, 184, 237, 0.15);
}

.btn-cancel {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 10px;
  background: white;
  color: #64748B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: rgba(143, 184, 237, 0.05);
  border-color: #8FB8ED;
}

.btn-confirm {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #8FB8ED, #A5C8F7);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.4);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 终止按钮 */
.abort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 20px;
  border: none;
  background: rgba(143, 184, 237, 0.9);
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.abort-btn:hover {
  background: rgba(120, 160, 210, 1);
  transform: scale(1.05);
}

.abort-btn:active {
  transform: scale(0.95);
}

.abort-btn i {
  font-size: 12px;
  color: #fff;
}

.abort-btn span {
  color: #fff;
}
</style>
