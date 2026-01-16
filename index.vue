<template>
  <div v-show="store.phone.show" class="phone-wrapper" ref="phoneWrapperRef" :style="phoneWrapperStyle">
    <!-- 关闭按钮 -->
    <button class="phone-close-btn" @click="hidePhone" title="隐藏手机">
      <i class="fas fa-times"></i>
    </button>
    <!-- 拖拽按钮 -->
    <button
      class="phone-drag-btn"
      @mousedown="startDrag"
      @touchstart="startDrag"
      title="按住拖拽移动手机"
    >
      <i class="fas fa-arrows-alt"></i>
    </button>
    <div class="phone-charm"></div>
    <div class="phone-container" :style="phoneContainerStyle">
      <div class="phone-notch">
      <div class="notch-sensor"></div>
      <div class="notch-speaker"></div>
      <div class="notch-forum"></div>
    </div>
    <div class="phone-screen">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-bar-left">
          <span class="status-time">{{ store.phone.time }}</span>
        </div>
        <div class="status-bar-right">
          <!-- Signal Icon -->
          <i class="fas fa-signal status-icon-svg"></i>
          <!-- Wifi Icon -->
          <i class="fas fa-wifi status-icon-svg"></i>
          <!-- Battery Icon -->
          <i class="fas fa-battery-three-quarters status-icon-svg"></i>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content-area">
        <Home v-show="store.activeApp === 'home'" />
        <Chat v-show="store.activeApp === 'chat'" />
        <User v-show="store.activeApp === 'user'" />
        <Forum v-if="store.activeApp === 'forum'" />
        <Settings v-show="store.activeApp === 'settings'" />
        <Dynamic v-if="store.activeApp === 'dynamic'" />
        <Browser v-if="store.activeApp === 'browser'" @back="goHome" />
        <Phone v-if="store.activeApp === 'phone'" @back="goHome" />
        <Email v-if="store.activeApp === 'email'" @back="goHome" />
        <Map v-if="store.activeApp === 'map'" @back="goHome" />
        <Music v-if="store.activeApp === 'music'" @back="goHome" />
        <LiveList v-if="store.activeApp === 'live'" @back="goHome" @enter-room="enterLiveRoom" />
        <LiveRoom
          v-if="store.activeApp === 'liveroom'"
          :streamer-name="selectedLiveRoom?.name"
          :room-title="selectedLiveRoom?.title"
          @back="backToLiveList"
        />
        <Calendar v-if="store.activeApp === 'calendar'" @back="goHome" />
        <Diary v-if="store.activeApp === 'diary'" />
      </div>

      <!-- Navigation Bar / Home Indicator for iPhone style -->
      <div v-if="store.activeApp !== 'home'" class="home-indicator-area">
        <div class="home-indicator"></div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue';
import _ from 'lodash';
import Browser from './apps/Browser/index.vue';
import Calendar from './apps/Calendar/index.vue';
import Chat from './apps/Chat/index.vue';
import Diary from './apps/Diary/index.vue';
import Dynamic from './apps/Dynamic/index.vue';
import Email from './apps/Email/index.vue';
import Forum from './apps/Forum/index.vue';
import Home from './apps/Home/index.vue';
import LiveList from './apps/Live/LiveList.vue';
import LiveRoom from './apps/Live/LiveRoom.vue';
import Map from './apps/Map/index.vue';
import Music from './apps/Music/index.vue';
import Phone from './apps/Phone/index.vue';
import Settings from './apps/Settings/index.vue';
import User from './apps/User/index.vue';
import { store, initUserFont } from './store';

// 默认空用户数据
const defaultUser = {
  id: 'user',
  name: '用户',
  nickname: '',
  avatar: '',
  email: '',
  bio: '',
  state: '在线',
};

// 从角色变量加载用户数据
const loadUserFromChat = () => {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData?.user) {
      return phoneData.user;
    }
  } catch (e) {
    console.warn('无法从角色变量加载用户数据:', e);
  }
  return null;
};

const chatUser = loadUserFromChat();
const baseInfo = ref({
  user: chatUser || defaultUser,
});

// 加载字体 CSS 到父文档
const loadFontStyles = () => {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    const fonts = phoneData?.fonts || [];

    const parentDoc = window.parent.document;

    // 移除旧的字体样式
    parentDoc.querySelectorAll('link[data-phone-font]').forEach(el => el.remove());

    // 添加新的字体样式到父文档
    fonts.forEach((font: { name: string; url: string }) => {
      if (font.url) {
        const link = parentDoc.createElement('link');
        link.rel = 'stylesheet';
        link.href = font.url;
        link.setAttribute('data-phone-font', font.name);
        parentDoc.head.appendChild(link);
        console.info('[Font] 已加载字体 CSS 到父文档:', font.name, font.url);
      }
    });
  } catch (e) {
    console.warn('无法加载字体样式:', e);
  }
};

// 初始化时加载字体
loadFontStyles();

// 计算手机容器样式（仅背景图）
const phoneContainerStyle = computed(() => {
  const style: Record<string, string> = {};
  if (baseInfo.value.user.phoneBg) {
    style.backgroundImage = `url(${baseInfo.value.user.phoneBg})`;
  }
  return style;
});

// 动态注入字体样式到父文档（使用 !important 覆盖酒馆主题）
const updateFontStyle = () => {
  const font = store.userFont || baseInfo.value.user.font;
  const styleId = 'phone-custom-font-style';

  // 在父文档中查找或创建样式元素
  const parentDoc = window.parent.document;
  let styleEl = parentDoc.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = parentDoc.createElement('style');
    styleEl.id = styleId;
    parentDoc.head.appendChild(styleEl);
  }

  if (font) {
    // 排除图标元素（FontAwesome 等）
    styleEl.textContent = `
      .phone-container,
      .phone-container *:not(i):not([class*="fa-"]):not([class*="fas"]):not([class*="far"]):not([class*="fab"]):not([class*="icon"]) {
        font-family: "${font}", "Microsoft YaHei", sans-serif !important;
      }
    `;
    console.info('[Font] 已应用字体样式:', font);
  } else {
    styleEl.textContent = '';
  }
};

// 监听字体变化并更新样式
watchEffect(() => {
  updateFontStyle();
});

// 初始化用户字体
initUserFont();

const goHome = () => {
  store.activeApp = 'home';
};

// 选中的直播间信息
const selectedLiveRoom = ref<{ name: string; title: string } | null>(null);

const enterLiveRoom = (room: { name: string; title: string }) => {
  selectedLiveRoom.value = room;
  store.activeApp = 'liveroom';
};

const backToLiveList = () => {
  store.activeApp = 'live';
};

// 隐藏手机
const hidePhone = () => {
  store.phone.show = false;
};

// ========== 拖拽功能 ==========
const phoneWrapperRef = ref<HTMLElement | null>(null);

// localStorage 键名
const DRAG_POSITION_KEY = 'phone_drag_position';

// 从 localStorage 加载位置
const loadDragPosition = (): { x: number; y: number } => {
  try {
    const saved = localStorage.getItem(DRAG_POSITION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Drag] 无法加载位置:', e);
  }
  return { x: 0, y: 0 };
};

// 保存位置到 localStorage
const saveDragPosition = (position: { x: number; y: number }) => {
  try {
    localStorage.setItem(DRAG_POSITION_KEY, JSON.stringify(position));
  } catch (e) {
    console.warn('[Drag] 无法保存位置:', e);
  }
};

// 拖拽位置状态（从 localStorage 初始化）
const dragPosition = ref(loadDragPosition());
const isDragging = ref(false);
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;
let isTouchEvent = false;

// 获取父文档（因为脚本运行在 iframe 中）
const getParentDocument = () => {
  try {
    return window.parent.document;
  } catch {
    return document;
  }
};

// 计算手机包装器样式
const phoneWrapperStyle = computed(() => {
  if (dragPosition.value.x === 0 && dragPosition.value.y === 0) {
    return {};
  }
  return {
    transform: `translate(${dragPosition.value.x}px, ${dragPosition.value.y}px)`,
  };
});

// 开始拖拽
const startDrag = (e: MouseEvent | TouchEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  isTouchEvent = e.type === 'touchstart';

  if (isTouchEvent && (e as TouchEvent).touches.length > 0) {
    startX = (e as TouchEvent).touches[0].clientX;
    startY = (e as TouchEvent).touches[0].clientY;
  } else {
    startX = (e as MouseEvent).clientX;
    startY = (e as MouseEvent).clientY;
  }

  initialX = dragPosition.value.x;
  initialY = dragPosition.value.y;

  // 绑定到父文档的全局事件
  const parentDoc = getParentDocument();
  if (isTouchEvent) {
    parentDoc.addEventListener('touchmove', onDrag as EventListener, { passive: false });
    parentDoc.addEventListener('touchend', stopDrag);
  } else {
    parentDoc.addEventListener('mousemove', onDrag as EventListener);
    parentDoc.addEventListener('mouseup', stopDrag);
  }
};

// 拖拽中
const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();

  let currentX: number, currentY: number;
  if (isTouchEvent && (e as TouchEvent).touches?.length > 0) {
    currentX = (e as TouchEvent).touches[0].clientX;
    currentY = (e as TouchEvent).touches[0].clientY;
  } else {
    currentX = (e as MouseEvent).clientX;
    currentY = (e as MouseEvent).clientY;
  }

  const dx = currentX - startX;
  const dy = currentY - startY;

  dragPosition.value = {
    x: initialX + dx,
    y: initialY + dy,
  };
};

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false;

  // 保存位置到 localStorage
  saveDragPosition(dragPosition.value);

  const parentDoc = getParentDocument();
  if (isTouchEvent) {
    parentDoc.removeEventListener('touchmove', onDrag as EventListener);
    parentDoc.removeEventListener('touchend', stopDrag);
  } else {
    parentDoc.removeEventListener('mousemove', onDrag as EventListener);
    parentDoc.removeEventListener('mouseup', stopDrag);
  }
};

// 清理事件监听
onUnmounted(() => {
  const parentDoc = getParentDocument();
  parentDoc.removeEventListener('mousemove', onDrag as EventListener);
  parentDoc.removeEventListener('mouseup', stopDrag);
  parentDoc.removeEventListener('touchmove', onDrag as EventListener);
  parentDoc.removeEventListener('touchend', stopDrag);
});
</script>

<style scoped>
/* 基本样式设置 */
* {
  box-sizing: border-box;
}

.phone-wrapper {
  position: fixed;
  top: 50px;
  right: 50px;
  z-index: 9999;
  pointer-events: none;
}

.phone-container {
  width: 360px;
  height: 600px;
  border: 8px solid #363636;
  border-radius: 36px;
  background-color: #fff; /* Fallback color */
  background-size: cover;
  background-position: center;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  font-family: inherit; /* 由动态样式控制，默认继承 */
  pointer-events: auto; /* Ensure clicks work */
}

.phone-charm {
  position: absolute;
  top: 26px;
  right: -49px;
  width: 160px;
  height: 160px;
  background-image: url('https://files.catbox.moe/7ozygy.gif');
  background-size: contain;
  background-repeat: no-repeat;
  z-index: 10000;
  pointer-events: none;
  transform-origin: top center;
  transform: rotate(-50deg);
}

/* 关闭按钮 */
.phone-close-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(120, 120, 120, 0.3);
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  pointer-events: auto;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.phone-close-btn:hover {
  background: rgba(100, 100, 100, 0.5);
  color: rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
}

.phone-close-btn:active {
  transform: scale(0.95);
  background: rgba(80, 80, 80, 0.6);
}

/* 拖拽按钮 */
.phone-drag-btn {
  position: absolute;
  top: 28px;
  right: -12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(120, 120, 120, 0.3);
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  pointer-events: auto;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  touch-action: none;
}

.phone-drag-btn:hover {
  background: rgba(100, 100, 100, 0.5);
  color: rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
}

.phone-drag-btn:active {
  cursor: grabbing;
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.6);
  color: rgba(255, 255, 255, 0.9);
}

.phone-notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 13px;
  background: #363636;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.notch-forum {
  width: 8px;
  height: 8px;
  background: #222;
  border-radius: 50%;
  border: 2px solid #444;
}

.notch-speaker {
  width: 40px;
  height: 4px;
  background: #222;
  border-radius: 2px;
}

.notch-sensor {
  width: 6px;
  height: 6px;
  background: #222;
  border-radius: 50%;
  border: 1px solid #444;
}

.phone-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.status-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  color: #fff;
  font-size: 12px;
  z-index: 1;
}

.status-bar-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon-svg {
  /* width: 14px;
  height: 14px; */
  font-size: 14px;
  /* fill: #fff; */
  color: #fff;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  position: relative;
  /* Add padding top to account for status bar */
  padding-top: 24px;
}

/* Home Indicator Area (replacing nav-bar for iPhone style) */
.home-indicator-area {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  cursor: pointer;
}

.home-indicator {
  width: 120px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 2px;
}

/* 移动端适配 - 手机水平居中，固定顶部距离 */
@media screen and (max-width: 768px) {
  .phone-wrapper {
    top: 60px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  /* 移动端隐藏挂件 */
  .phone-charm {
    display: none;
  }

  /* 移动端关闭按钮位置调整 */
  .phone-close-btn {
    top: -40px;
    right: calc(50% + 20px);
    transform: translateX(50%);
  }

  .phone-close-btn:hover {
    transform: translateX(50%) scale(1.05);
  }

  .phone-close-btn:active {
    transform: translateX(50%) scale(0.95);
  }

  /* 移动端拖拽按钮位置调整 */
  .phone-drag-btn {
    top: -40px;
    right: calc(50% - 20px);
    transform: translateX(50%);
  }

  .phone-drag-btn:hover {
    transform: translateX(50%) scale(1.05);
  }

  .phone-drag-btn:active {
    transform: translateX(50%) scale(0.95);
  }
}
</style>
