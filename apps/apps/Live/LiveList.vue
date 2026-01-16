<template>
  <div class="live-list-container">
    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在加载直播列表...</span>
          <button class="abort-btn" @click="handleAbort">
            <i class="fas fa-stop"></i>
            <span>终止生成</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-down">
      <div v-if="loadError" class="error-toast" @click="loadError = null">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ loadError }}</span>
      </div>
    </Transition>

    <!-- 头部 -->
    <div class="live-header">
      <button class="back-btn" @click="$emit('back')">
        <i class="fas fa-chevron-left"></i>
      </button>
      <h1 class="header-title">直播</h1>
      <button class="refresh-btn" @click="refreshData" :disabled="isLoading">
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
      </button>
    </div>

    <!-- 分类标签 -->
    <div class="category-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 直播列表 - 单列布局 -->
    <div class="live-list">
      <div
        v-for="(room, index) in filteredRooms"
        :key="index"
        class="live-card"
        @click="enterRoom(room)"
      >
        <!-- 封面图 -->
        <div class="card-cover">
          <img :src="getCoverImage(room.image)" alt="cover" />
          <div class="live-badge" :class="{ ended: room.status === '已结束' }">
            <i class="fas fa-circle live-dot" v-if="room.status === '直播中'"></i>
            {{ room.status }}
          </div>
          <div class="viewer-count">
            <i class="fas fa-eye"></i>
            {{ formatNumber(room.viewers) }}
          </div>
        </div>
        <!-- 信息区 -->
        <div class="card-info">
          <div class="info-top">
            <img :src="getStreamerAvatar(room.name)" class="streamer-avatar" alt="avatar" />
            <div class="info-text">
              <div class="room-title">{{ room.title }}</div>
              <div class="streamer-name">{{ room.name }}</div>
            </div>
          </div>
          <div class="info-stats">
            <span class="stat-item"><i class="fas fa-heart"></i> {{ formatNumber(room.likes) }}</span>
            <span class="stat-item"><i class="fas fa-user-plus"></i> {{ formatNumber(room.followers) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import YAML from 'yaml';
import { getAvatarByName, getLiveImageUrlByName } from '../../数据';
import {
  liveListState,
  loadLiveListDataFromAi,
  resetLiveListData,
  saveToTavernMessage,
  abortCurrentRequest,
} from '../../store';

const emit = defineEmits(['back', 'enter-room']);

interface LiveRoom {
  name: string;
  title: string;
  status: string;
  image: string;
  viewers: number;
  likes: number;
  followers: number;
}

interface LiveListData {
  date?: string;
  time?: string;
  rooms: LiveRoom[];
}

// 后备数据（空）
const fallbackData: LiveListData = { rooms: [] };

// 加载状态
const isLoading = ref(false);
const loadError = ref<string | null>(null);

// 直播间数据
const rooms = computed<LiveRoom[]>(() => {
  return liveListState.data?.rooms || fallbackData.rooms || [];
});

// 分类标签
const tabs = ref([
  { key: 'all', label: '推荐' },
  { key: 'live', label: '直播中' },
  { key: 'game', label: '游戏' },
  { key: 'music', label: '音乐' },
  { key: 'chat', label: '聊天' },
]);
const activeTab = ref('all');

// 过滤直播间
const filteredRooms = computed(() => {
  if (activeTab.value === 'all') return rooms.value;
  if (activeTab.value === 'live') return rooms.value.filter(r => r.status === '直播中');
  return rooms.value;
});

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

// 获取主播头像：优先使用聊天变量中的角色头像，否则使用随机头像
const getStreamerAvatar = (name: string): string => {
  return getAvatarByName(name);
};

// 获取直播封面图片：优先从直播图片库查找，否则使用原始值
const getCoverImage = (image: string): string => {
  return getLiveImageUrlByName(image) || image;
};

// 加载直播列表数据
async function loadData() {
  isLoading.value = true;
  loadError.value = null;

  try {
    await loadLiveListDataFromAi();
    if (liveListState.error) {
      loadError.value = liveListState.error;
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    isLoading.value = false;
  }
}

// 刷新数据（强制重新从 AI 获取）
async function refreshData() {
  resetLiveListData();
  isLoading.value = true;
  loadError.value = null;

  try {
    await loadLiveListDataFromAi(true); // 强制刷新，跳过历史数据
    if (liveListState.error) {
      loadError.value = liveListState.error;
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '刷新失败';
  } finally {
    isLoading.value = false;
  }
}

// 组件挂载时加载数据
onMounted(() => {
  if (!liveListState.loaded) {
    loadData();
  }
});

// 进入直播间
const enterRoom = (room: LiveRoom) => {
  console.log('进入直播间:', room.name);
  emit('enter-room', room);
};

// 终止生成并返回
const handleAbort = () => {
  abortCurrentRequest();
  isLoading.value = false;
  emit('back');
};
</script>

<style scoped>
.live-list-container {
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  color: #fff;
  position: relative;
}

/* 头部 */
.live-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.2);
}

.back-btn,
.refresh-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.tab-item {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-item.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  font-weight: 500;
}

/* 直播列表 - 单列布局 */
.live-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  padding-bottom: 20px;
}

/* 直播卡片 */
.live-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  margin-bottom: 12px;
}

.live-card:last-child {
  margin-bottom: 0;
}

.live-card:active {
  transform: scale(0.98);
}

/* 封面区域 */
.card-cover {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 直播状态徽章 */
.live-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.live-badge.ended {
  background: rgba(0, 0, 0, 0.6);
}

.live-dot {
  font-size: 6px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 观看人数 */
.viewer-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 卡片信息区 */
.card-info {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
}

.info-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.streamer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.info-text {
  flex: 1;
  min-width: 0;
}

.room-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: #fff !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.streamer-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7) !important;
}

.info-stats {
  display: flex;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6) !important;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item i {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6) !important;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 46, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #ff6b9d;
  font-size: 14px;
}

.loading-spinner i {
  font-size: 28px;
}

/* 终止按钮 */
.abort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 20px;
  border: none;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.abort-btn:active {
  transform: scale(0.95);
  background: linear-gradient(135deg, #e55a5a, #e57d42);
}

.abort-btn i {
  font-size: 12px;
  color: #fff;
}

.abort-btn span {
  color: #fff;
}

/* 错误提示 */
.error-toast {
  position: absolute;
  top: 50px;
  left: 12px;
  right: 12px;
  background: #ff6b6b;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 300;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
