<template>
  <div class="live-room-container">
    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在加载直播内容...</span>
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

    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="$emit('back')">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="streamer-info">
        <img :src="getStreamerAvatar(liveData.streamer)" class="streamer-avatar" alt="avatar" />
        <div class="streamer-detail">
          <span class="streamer-name">{{ liveData.streamer }}</span>
          <span class="follower-count">{{ formatNumber(liveData.followers) }} 粉丝</span>
        </div>
      </div>
      <button class="follow-btn" :class="{ following: isFollowing }" @click="toggleFollow">
        {{ isFollowing ? '已关注' : '+ 关注' }}
      </button>
    </div>

    <!-- 直播视频区域 -->
    <div class="video-area" style="position: relative; width: 100%; min-height: 200px; background: #000;">
      <img
        :src="getLiveImage(liveData.image)"
        alt="直播画面"
        style="width: 100%; height: 100%; object-fit: cover; display: block;"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      <div class="live-indicator">
        <i class="fas fa-circle"></i>
        直播中
      </div>
      <div class="viewer-badge">
        <i class="fas fa-eye"></i>
        {{ formatNumber(liveData.viewers) }}
      </div>

      <!-- 弹幕区域 - 在图片上滑过 -->
      <div class="barrage-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none;">
        <!-- 普通弹幕 - 使用轨道 0, 2, 4, 6 -->
        <div
          v-for="(item, index) in visibleBarrage"
          :key="'normal-' + index"
          class="barrage-item"
          :style="{
            position: 'absolute',
            top: `${index * 2 * 32 + 12}px`,
            left: '100%',
            whiteSpace: 'nowrap',
            padding: '3px 10px',
            borderRadius: '15px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            fontSize: '13px',
            color: '#fff',
            animation: `barrageScroll ${8 + index * 2}s linear infinite`,
            animationDelay: `${index * 2.5}s`
          }"
        >
          <span style="color: #7dd3fc; margin-right: 6px;">{{ item.name }}</span>
          <span>{{ item.c }}</span>
        </div>
        <!-- 醒目留言弹幕 - 使用轨道 1, 3 -->
        <div
          v-for="(sc, index) in liveData.superchat"
          :key="'sc-' + index"
          :style="{
            position: 'absolute',
            top: `${(index * 2 + 1) * 32 + 12}px`,
            left: '100%',
            whiteSpace: 'nowrap',
            padding: '3px 10px',
            borderRadius: '15px',
            background: sc.amount >= 100 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : sc.amount >= 50 ? 'linear-gradient(135deg, #ec4899, #f472b6)' : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            fontSize: '13px',
            color: '#fff',
            animation: `barrageScroll ${10 + index * 2}s linear infinite`,
            animationDelay: `${index * 4 + 1}s`
          }"
        >
          <span style="margin-right: 6px;">{{ sc.name }}</span>
          <span style="background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; font-size: 11px; margin-right: 6px;">¥{{ sc.amount }}</span>
          <span>{{ sc.c }}</span>
        </div>
      </div>
    </div>

    <!-- 直播间信息 -->
    <div class="room-info">
      <div class="room-title">{{ liveData.roomTitle }}</div>
      <div class="room-desc">{{ liveData.roomDesc }}</div>
      <div class="room-stats">
        <span class="stat"><i class="fas fa-eye"></i> {{ formatNumber(liveData.viewers) }} 观看</span>
        <span class="stat"><i class="fas fa-heart"></i> {{ formatNumber(liveData.likes) }} 喜欢</span>
      </div>
    </div>

    <!-- 直播内容区域 -->
    <div class="live-content-section" @click="nextContent">
      <div class="section-title">
        <i class="fas fa-video"></i>
        直播内容
        <span class="content-indicator">{{ currentContentIndex + 1 }}/{{ liveData.contents.length }}</span>
      </div>
      <div class="live-content-box">
        <div class="content-dialogue">「{{ currentContent.dialogue }}」</div>
        <div class="content-state">{{ currentContent.state }}</div>
      </div>
      <div class="content-hint">点击切换下一条</div>
    </div>

    <!-- 想法区域 -->
    <div class="thought-section" @click="toggleThoughtBlur">
      <div class="section-title">
        <i class="fas fa-heart"></i>
        内心想法
        <span class="thought-hint">{{ isThoughtBlurred ? '点击查看' : '点击隐藏' }}</span>
      </div>
      <div class="thought-box" :class="{ blurred: isThoughtBlurred }">
        <i class="fas fa-quote-left"></i>
        {{ liveData.thought }}
        <i class="fas fa-quote-right"></i>
      </div>
    </div>

    <!-- 醒目留言 -->
    <div class="superchat-section" v-if="liveData.superchat.length > 0">
      <div class="section-title">
        <i class="fas fa-gift"></i>
        醒目留言
      </div>
      <div class="superchat-list">
        <div v-for="(sc, index) in liveData.superchat" :key="index" class="superchat-item">
          <img :src="getStreamerAvatar(sc.name)" class="sc-avatar" alt="avatar" />
          <div class="sc-content">
            <div class="sc-header">
              <span class="sc-name">{{ sc.name }}</span>
              <span class="sc-amount">¥{{ sc.amount }}</span>
            </div>
            <div class="sc-text">{{ sc.c }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 贡献榜 -->
    <div class="ranking-section">
      <div class="section-title">
        <i class="fas fa-trophy"></i>
        贡献榜
      </div>
      <div class="ranking-list">
        <div v-for="(user, index) in liveData.ranking" :key="index" class="ranking-item">
          <span class="rank-number" :class="{ top: index < 3 }">{{ index + 1 }}</span>
          <img :src="getStreamerAvatar(user.name)" class="rank-avatar" alt="avatar" />
          <span class="rank-name">{{ user.name }}</span>
          <span class="rank-score">{{ formatNumber(user.score) }}</span>
        </div>
      </div>
    </div>

    <!-- 最近弹幕 -->
    <div class="chat-section">
      <div class="section-title">
        <i class="fas fa-comments"></i>
        弹幕
      </div>
      <div class="chat-list">
        <div v-for="(msg, index) in liveData.barrage.slice(0, 8)" :key="index" class="chat-item">
          <span class="chat-name">{{ msg.name }}:</span>
          <span class="chat-text">{{ msg.c }}</span>
        </div>
      </div>
    </div>

    <!-- 底部互动栏 -->
    <div class="bottom-bar">
      <div class="input-area">
        <input type="text" v-model="messageInput" placeholder="发送弹幕..." />
        <button class="send-btn" @click="sendMessage">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
      <div class="action-buttons">
        <button class="action-btn" @click="toggleLike">
          <i class="fas fa-heart" :class="{ liked: isLiked }"></i>
        </button>
        <button class="action-btn gift-btn" @click="showGiftPanel = true">
          <i class="fas fa-gift"></i>
        </button>
        <button class="action-btn superchat-btn" @click="showSuperchatPanel = true">
          <i class="fas fa-comment-dollar"></i>
        </button>
      </div>
    </div>

    <!-- 礼物面板 -->
    <div class="gift-panel" v-if="showGiftPanel" @click.self="showGiftPanel = false">
      <div class="gift-content">
        <div class="gift-header">
          <span>送礼物</span>
          <button class="close-btn" @click="showGiftPanel = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="anonymous-toggle">
          <label class="toggle-label">
            <input type="checkbox" v-model="isAnonymous" />
            <span class="toggle-text">匿名发送</span>
          </label>
        </div>
        <div class="gift-grid">
          <div v-for="(gift, index) in gifts" :key="index" class="gift-item" @click="sendGift(gift)">
            <div class="gift-icon">{{ gift.icon }}</div>
            <div class="gift-name">{{ gift.name }}</div>
            <div class="gift-price">{{ gift.price }}币</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 醒目留言面板 -->
    <div class="superchat-panel" v-if="showSuperchatPanel" @click.self="showSuperchatPanel = false">
      <div class="superchat-content">
        <div class="superchat-header">
          <span>发送醒目留言</span>
          <button class="close-btn" @click="showSuperchatPanel = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="superchat-form">
          <div class="anonymous-toggle">
            <label class="toggle-label">
              <input type="checkbox" v-model="isAnonymous" />
              <span class="toggle-text">匿名发送</span>
            </label>
          </div>
          <div class="amount-section">
            <label>金额</label>
            <div class="amount-options">
              <button
                v-for="amt in [30, 50, 100, 200]"
                :key="amt"
                :class="['amount-btn', { active: superchatAmount === amt }]"
                @click="superchatAmount = amt"
              >
                ¥{{ amt }}
              </button>
            </div>
          </div>
          <div class="message-section">
            <label>留言内容</label>
            <textarea
              v-model="superchatMessage"
              placeholder="输入你想说的话..."
              maxlength="50"
            ></textarea>
            <span class="char-count">{{ superchatMessage.length }}/50</span>
          </div>
          <button class="send-superchat-btn" @click="sendSuperchat">
            <i class="fas fa-paper-plane"></i>
            发送 ¥{{ superchatAmount }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import yaml from 'yaml';
import _ from 'lodash';
import { getAvatarByName, getLiveImageUrlByName } from '../../数据';
import { saveCharacterModuleToMessage, abortCurrentRequest } from '../../store';
import { fetchLiveDataFromAi } from '../../预设/aiService';

// 获取用户名称
function getUserName(): string {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    return _.get(charVars, 'phone_data.user.name') || '我';
  } catch {
    return '我';
  }
}

// Props - 从直播列表传入
const props = defineProps<{
  streamerName?: string;
  roomTitle?: string;
}>();

defineEmits(['back']);

// 终止生成并返回
const handleAbort = () => {
  abortCurrentRequest();
  isLoading.value = false;
};

// 后备数据（空）
const fallbackData = {
  streamer: '',
  roomTitle: '',
  roomDesc: '',
  viewers: 0,
  likes: 0,
  followers: 0,
  image: '',
  thought: '',
  contents: [{ dialogue: '', state: '' }],
  barrage: [],
  superchat: [],
  ranking: [],
};

// 加载状态
const isLoading = ref(false);
const loadError = ref<string | null>(null);

// 直播数据
const liveData = ref(fallbackData);

// 礼物列表（12个，从便宜到昂贵）
const gifts = ref([
  { icon: '🌹', name: '玫瑰', price: 1 },
  { icon: '💖', name: '爱心', price: 5 },
  { icon: '🍬', name: '糖果', price: 10 },
  { icon: '🎁', name: '礼盒', price: 20 },
  { icon: '🌟', name: '星星', price: 50 },
  { icon: '🚀', name: '火箭', price: 100 },
  { icon: '💎', name: '钻石', price: 200 },
  { icon: '👑', name: '皇冠', price: 500 },
  { icon: '🦄', name: '独角兽', price: 1000 },
  { icon: '🏰', name: '城堡', price: 2000 },
  { icon: '🌈', name: '彩虹', price: 5000 },
  { icon: '🚢', name: '游艇', price: 10000 },
]);

// 状态
const isFollowing = ref(false);
const isLiked = ref(false);
const messageInput = ref('');
const showGiftPanel = ref(false);
const showSuperchatPanel = ref(false);
const superchatAmount = ref(30);
const superchatMessage = ref('');
const currentContentIndex = ref(0);
const isThoughtBlurred = ref(true);
const isAnonymous = ref(false);

// 当前显示的直播内容
const currentContent = computed(() => {
  return liveData.value.contents[currentContentIndex.value];
});

// 切换到下一条直播内容
const nextContent = () => {
  currentContentIndex.value = (currentContentIndex.value + 1) % liveData.value.contents.length;
};

// 切换想法模糊状态
const toggleThoughtBlur = () => {
  isThoughtBlurred.value = !isThoughtBlurred.value;
};

// 显示的弹幕（滚动效果）
const visibleBarrage = computed(() => {
  return liveData.value.barrage.slice(0, 4);
});

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

// 获取头像
const getStreamerAvatar = (name: string): string => {
  return getAvatarByName(name);
};

// 获取直播图片：优先从直播图片库查找，否则使用原始值
const getLiveImage = (image: string): string => {
  return getLiveImageUrlByName(image) || image;
};

// 获取醒目留言的颜色等级
const getSuperChatClass = (amount: number): string => {
  if (amount >= 100) return 'sc-gold';
  if (amount >= 50) return 'sc-pink';
  return 'sc-blue';
};

// 关注/取关
const toggleFollow = () => {
  isFollowing.value = !isFollowing.value;
};

// 点赞
const toggleLike = () => {
  isLiked.value = !isLiked.value;
  if (isLiked.value) {
    liveData.value.likes++;
  } else {
    liveData.value.likes--;
  }
};

// AI回复加载状态
const isAiLoading = ref(false);

// 触发AI回复
async function triggerAiResponse(userAction: string) {
  if (!props.streamerName || !props.roomTitle) {
    console.warn('[LiveRoom] 无法触发AI回复：缺少主播信息');
    return;
  }

  isAiLoading.value = true;
  try {
    console.info('[LiveRoom] 触发AI回复，用户行为:', userAction);
    const result = await fetchLiveDataFromAi(props.streamerName, props.roomTitle, userAction);

    if (result.success && result.data) {
      // 更新直播数据
      liveData.value = result.data;
      // 保存到楼层历史
      await saveCharacterModuleToMessage('live', props.streamerName, result.data);
      console.info('[LiveRoom] AI回复成功');
    } else {
      console.error('[LiveRoom] AI回复失败:', result.error);
    }
  } catch (e) {
    console.error('[LiveRoom] AI回复异常:', e);
  } finally {
    isAiLoading.value = false;
  }
}

// 发送弹幕
const sendMessage = async () => {
  if (messageInput.value.trim()) {
    const userName = getUserName();
    const content = messageInput.value.trim();

    // 添加到弹幕列表
    liveData.value.barrage.unshift({
      name: userName,
      c: content,
    });

    // 构建用户行为描述
    const userAction = `${userName}发送弹幕：${content}`;
    messageInput.value = '';

    // 触发AI回复
    await triggerAiResponse(userAction);
  }
};

// 送礼物
const sendGift = async (gift: { icon: string; name: string; price: number }) => {
  const userName = isAnonymous.value ? '匿名用户' : getUserName();

  // 构建用户行为描述
  const userAction = `${userName}赠送礼物：${gift.name}价值${gift.price}币`;
  console.log('[LiveRoom]', userAction);

  showGiftPanel.value = false;

  // 触发AI回复
  await triggerAiResponse(userAction);
};

// 发送醒目留言
const sendSuperchat = async () => {
  if (superchatMessage.value.trim() && superchatAmount.value > 0) {
    const userName = isAnonymous.value ? '匿名用户' : getUserName();
    const content = superchatMessage.value.trim();
    const amount = superchatAmount.value;

    // 添加到醒目留言列表
    liveData.value.superchat.unshift({
      name: userName,
      amount: amount,
      c: content,
    });

    // 构建用户行为描述
    const userAction = `${userName}发送醒目留言：${content}（¥${amount}）`;

    superchatMessage.value = '';
    superchatAmount.value = 30;
    showSuperchatPanel.value = false;

    // 触发AI回复
    await triggerAiResponse(userAction);
  }
};

// 图片加载调试
const handleImageError = (e: Event) => {
  console.error('[LiveRoom] 图片加载失败:', liveData.value.image, e);
};

const handleImageLoad = () => {
  console.log('[LiveRoom] 图片加载成功:', liveData.value.image);
};

// 加载直播数据
async function loadLiveData() {
  if (!props.streamerName || !props.roomTitle) {
    console.info('[LiveRoom] 未传入主播信息，使用默认数据');
    return;
  }

  isLoading.value = true;
  loadError.value = null;

  try {
    const { fetchLiveDataFromAi, loadApiConfig } = await import('../../预设/aiService');

    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      loadError.value = '请先在设置中配置 API';
      return;
    }

    const result = await fetchLiveDataFromAi(props.streamerName, props.roomTitle);

    if (result.success && result.data) {
      liveData.value = result.data;
      // 保存到楼层
      await saveCharacterModuleToMessage('live' as any, props.streamerName, result.data);
    } else {
      loadError.value = result.error || '加载失败';
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载时发生未知错误';
  } finally {
    isLoading.value = false;
  }
}

// 组件挂载时加载数据（使用 setTimeout 延迟执行，避免阻塞主线程）
onMounted(() => {
  setTimeout(() => {
    loadLiveData();
  }, 0);
});
</script>

<style>
/* 全局弹幕动画 - 必须在非 scoped 样式中 */
@keyframes barrageScroll {
  0% {
    left: 100%;
    transform: translateX(0);
  }
  100% {
    left: 0;
    transform: translateX(-100%);
  }
}
</style>

<style scoped>
.live-room-container {
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow-y: auto;
  position: relative;
}

/* 顶部导航 */
.top-bar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.4);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
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

.streamer-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 10px;
}

.streamer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ff6b6b;
}

.streamer-detail {
  display: flex;
  flex-direction: column;
}

.streamer-name {
  font-size: 14px;
  font-weight: 500;
}

.follower-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.follow-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;
}

.follow-btn.following {
  background: rgba(255, 255, 255, 0.2);
}

/* 视频区域 */
.video-area {
  position: relative;
  width: 100%;
  min-height: 200px;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
  flex-shrink: 0;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  position: relative;
}

.video-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.live-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 5;
}

.live-indicator i {
  font-size: 8px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.viewer-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 5;
}

/* 弹幕 - 在图片上滑过 */
.barrage-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 4;
}

.barrage-item {
  position: absolute;
  white-space: nowrap;
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 15px;
  background-color: rgba(0, 0, 0, 0.3);
  animation: barrageScroll 10s linear forwards;
  display: flex;
  align-items: center;
  gap: 6px;
}

@keyframes barrageScroll {
  0% {
    left: 100%;
    transform: translateX(0);
  }
  100% {
    left: 0;
    transform: translateX(-100%);
  }
}

.barrage-name {
  color: #7dd3fc;
  font-weight: 500;
}

.barrage-text {
  color: #fff;
}

/* 醒目留言弹幕样式 */
.superchat-barrage {
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.superchat-barrage .barrage-name {
  color: #fff;
}

.sc-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* 醒目留言颜色等级 */
.sc-blue {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
}

.sc-pink {
  background: linear-gradient(135deg, #ec4899, #f472b6);
}

.sc-gold {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

/* 直播间信息 */
.room-info {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
}

.room-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.room-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  line-height: 1.4;
}

.room-stats {
  display: flex;
  gap: 16px;
}

.stat {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 通用区块标题 */
.section-title {
  font-size: 14px;
  font-weight: 500;
  padding: 10px 12px 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.9);
}

.section-title i {
  color: #ff8e53;
}

/* 直播内容区域 */
.live-content-section {
  background: rgba(0, 0, 0, 0.2);
  margin-top: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.live-content-section:active {
  background: rgba(0, 0, 0, 0.3);
}

.content-indicator {
  margin-left: auto;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: normal;
}

.live-content-box {
  padding: 0 12px 8px;
}

.content-dialogue {
  font-size: 14px;
  color: #fff;
  line-height: 1.5;
  margin-bottom: 8px;
}

.content-state {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  font-style: italic;
}

.content-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
  padding-bottom: 8px;
}

/* 想法区域 */
.thought-section {
  background: rgba(0, 0, 0, 0.15);
  margin-top: 8px;
  cursor: pointer;
}

.thought-hint {
  margin-left: auto;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: normal;
}

.thought-box {
  padding: 0 12px 12px;
  font-size: 13px;
  color: #f9a8d4;
  line-height: 1.6;
  font-style: italic;
  transition: filter 0.3s, opacity 0.3s;
}

.thought-box i {
  color: rgba(249, 168, 212, 0.5);
  font-size: 10px;
  margin: 0 4px;
}

.thought-box.blurred {
  filter: blur(6px);
  opacity: 0.6;
  user-select: none;
}

/* 醒目留言 */
.superchat-section {
  background: rgba(0, 0, 0, 0.15);
  margin-top: 8px;
}

.superchat-list {
  padding: 0 12px 12px;
}

.superchat-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(255, 142, 83, 0.2));
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #ff6b6b;
}

.sc-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.sc-content {
  flex: 1;
}

.sc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.sc-name {
  font-size: 13px;
  font-weight: 500;
}

.sc-amount {
  font-size: 12px;
  color: #ffcc00;
  font-weight: 600;
}

.sc-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

/* 贡献榜 */
.ranking-section {
  background: rgba(0, 0, 0, 0.15);
  margin-top: 8px;
}

.ranking-list {
  padding: 0 12px 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.rank-number.top {
  background: linear-gradient(135deg, #ffcc00, #ff8e53);
  color: #000;
}

.rank-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.rank-name {
  flex: 1;
  font-size: 13px;
}

.rank-score {
  font-size: 12px;
  color: #ffcc00;
}

/* 弹幕列表 */
.chat-section {
  background: rgba(0, 0, 0, 0.15);
  margin-top: 8px;
}

.chat-list {
  padding: 0 12px 12px;
}

.chat-item {
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.chat-item:last-child {
  border-bottom: none;
}

.chat-name {
  color: #ff8e53;
  margin-right: 6px;
}

.chat-text {
  color: rgba(255, 255, 255, 0.8);
}

/* 底部互动栏 */
.bottom-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(26, 26, 46, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
  flex-shrink: 0;
}

.input-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 4px 4px 4px 14px;
}

.input-area input {
  flex: 1;
  border: none !important;
  background: transparent !important;
  color: #fff !important;
  font-size: 13px;
  outline: none !important;
}

.input-area input::placeholder {
  color: rgba(255, 255, 255, 0.4) !important;
}

.send-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
}

.action-btn .liked {
  color: #ff6b6b;
}

.gift-btn {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
}

/* 礼物面板 */
.gift-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.gift-content {
  width: 90%;
  max-width: 320px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.gift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.close-btn {
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
}

/* 匿名开关 */
.anonymous-toggle {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #94a3b8;
}

.toggle-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #f59e0b;
}

.toggle-text {
  user-select: none;
}

.gift-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.gift-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s;
}

.gift-item:active {
  transform: scale(0.95);
}

.gift-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.gift-name {
  font-size: 10px;
  margin-bottom: 2px;
}

.gift-price {
  font-size: 9px;
  color: #ffcc00;
}

/* 醒目留言按钮 */
.superchat-btn {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

/* 醒目留言面板 */
.superchat-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.superchat-content {
  width: 90%;
  max-width: 320px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.superchat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.superchat-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.amount-section label,
.message-section label {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.amount-options {
  display: flex;
  gap: 8px;
}

.amount-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.amount-btn.active {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  border-color: transparent;
  color: #000;
  font-weight: 600;
}

.message-section {
  position: relative;
}

.message-section textarea {
  width: 100%;
  height: 80px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05) !important;
  color: #fff !important;
  font-size: 14px;
  resize: none;
  outline: none !important;
  box-sizing: border-box;
}

.message-section textarea::placeholder {
  color: rgba(255, 255, 255, 0.4) !important;
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.send-superchat-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: #000;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.send-superchat-btn:active {
  transform: scale(0.98);
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
