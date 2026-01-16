<template>
  <!-- 日期分隔符 -->
  <div v-if="msg.type === 'date-separator'" class="date-separator">
    <span class="date-separator-text">{{ msg.content }}</span>
  </div>

  <!-- 系统消息 - 居中显示 -->
  <!-- 通话结束 -->
  <div v-else-if="msg.type === 'call-ended'" class="system-message">
    <div class="system-message-content">
      <i class="fas fa-phone-alt"></i>
      通话已结束，时长 {{ msg.duration }}
    </div>
  </div>

  <!-- 接受转账 -->
  <div v-else-if="msg.type === 'transfer-accepted'" class="system-message">
    <div class="system-message-content">
      <i class="fas fa-check-circle"></i>
      {{ msg.isMe ? '你' : '对方' }}已领取转账 ￥{{ msg.amount }}
    </div>
  </div>

  <!-- 拒绝转账 -->
  <div v-else-if="msg.type === 'transfer-rejected'" class="system-message">
    <div class="system-message-content">
      <i class="fas fa-times-circle"></i>
      {{ msg.isMe ? '你' : '对方' }}已拒绝转账 ￥{{ msg.amount }}
    </div>
  </div>

  <!-- 戳一戳 -->
  <div v-else-if="msg.type === 'poke'" class="system-message poke-message">
    <div class="poke-wrapper">
      <button
        v-if="msg.isMe && msg.isNewMessage"
        class="recall-btn poke-recall-btn"
        title="撤回"
        @click="handleRecall"
      >
        <i class="fas fa-undo-alt"></i>
      </button>
      <div class="system-message-content">
        <i class="fas fa-hand-pointer"></i>
        {{ msg.isMe ? '你' : partnerName }} 戳了戳 {{ msg.isMe ? partnerName : '你' }}
      </div>
    </div>
  </div>

  <!-- 普通消息 -->
  <div v-else class="message" :class="{ sent: msg.isMe, received: !msg.isMe, 'group-message': isGroup && !msg.isMe }">
    <!-- 撤回按钮 - 仅本次发送的消息显示 -->
    <button
      v-if="msg.isMe && msg.isNewMessage"
      class="recall-btn"
      title="撤回"
      @click="handleRecall"
    >
      <i class="fas fa-undo-alt"></i>
    </button>
    <div v-if="!msg.isMe" class="avatar-wrapper" @click="handlePoke" title="戳一戳">
      <img :src="msg.sender?.avatar || currentChatAvatar || ''" class="avatar" />
    </div>
    <div v-if="msg.isMe && userAvatar" class="avatar-wrapper user-avatar">
      <img :src="userAvatar" class="avatar" />
    </div>
    <div class="message-wrapper">
      <div v-if="!msg.isMe && isGroup && msg.sender?.name" class="message-sender-name">
        {{ msg.sender?.name }}
      </div>
      <div v-if="msg.isMe && isGroup" class="message-sender-name sent-name">我</div>

      <!-- Text Message -->
      <div v-if="msg.type === 'text'" class="message-content">
        {{ msg.content }}
      </div>

      <!-- Image Message -->
      <div
        v-else-if="msg.type === 'image'"
        class="message-content"
        style="padding: 0; background: none; box-shadow: none"
      >
        <img v-if="imageUrl" :src="imageUrl" class="image-message" />
      </div>

      <!-- Sticker Message -->
      <div
        v-else-if="msg.type === 'sticker'"
        class="message-content"
        style="padding: 0; background: none; box-shadow: none"
      >
        <img v-if="stickerUrl" :src="stickerUrl" style="max-width: 120px; border-radius: 8px" />
      </div>

      <!-- Recalled Message -->
      <div v-else-if="msg.type === 'recalled'" class="message-content recalled">
        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle">
          <path
            fill="currentColor"
            d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
          />
        </svg>
        此消息已撤回
        <div v-if="msg.originalContent" class="recalled-tooltip">
          <div style="font-weight: bold; margin-bottom: 4px">原始消息内容：</div>
          <div>{{ msg.originalContent }}</div>
        </div>
      </div>

      <!-- Transfer Message -->
      <div
        v-else-if="msg.type === 'transfer'"
        class="transfer-card"
        :class="{ processed: transferProcessed, sent: msg.isMe }"
        @click="!msg.isMe && !transferProcessed && openTransferModal()"
      >
        <div class="transfer-card-icon">
          <i class="fas fa-yen-sign"></i>
        </div>
        <div class="transfer-card-info">
          <div class="transfer-card-label">{{ msg.isMe ? '已转账' : (transferProcessed ? '已收款' : '转账') }}</div>
          <div class="transfer-card-amount">￥{{ msg.amount }}</div>
        </div>
      </div>

      <!-- Voice Message -->
      <div v-else-if="msg.type === 'voice'" class="message-content voice-message">
        <div class="voice-message-container" :class="{ playing: isPlaying }" @click="toggleVoice">
          <div class="voice-play-btn">
            <i v-if="!isPlaying" class="fas fa-play"></i>
            <i v-else class="fas fa-pause"></i>
          </div>
          <div class="voice-duration">{{ formattedTime }}</div>
          <div class="voice-wave-bars">
            <span v-for="i in 5" :key="i"></span>
          </div>
        </div>
        <!-- 下方扩展的文字区域 -->
        <div v-if="showVoiceText" class="voice-text-expand">
          <span class="voice-text-content">{{ displayedText }}</span>
        </div>
      </div>

      <!-- Location Message -->
      <div v-else-if="msg.type === 'location'" class="message-content location-content" style="padding: 0">
        <div class="location-preview">
          <div class="location-left">
            <div class="location-icon">📍</div>
          </div>
          <div class="location-right">
            <div class="location-title">位置共享中</div>
            <div class="location-address">{{ msg.partnerLocation || '未知位置' }}</div>
            <div class="location-distance">距离你 {{ msg.distance }}</div>
          </div>
          <div class="location-arrow">›</div>
        </div>
      </div>

      <!-- News Message -->
      <div v-else-if="msg.type === 'news'" class="message-content" style="padding: 0; background: none">
        <div class="news-preview">
          <div class="news-card">
            <div class="news-title">{{ msg.title }}</div>
            <div class="news-meta">
              <div class="news-source">
                <span class="news-source-name">{{ msg.source }}</span>
              </div>
              <div class="news-date">{{ msg.publishDate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Browser Share -->
      <div v-else-if="msg.type === 'browser-share'" class="message-content">
        <div class="browser-share">
          <div class="browser-share-header">
            <svg class="browser-share-icon" viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M17.9 17.39c-.26-.8-1.01-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39M11 19.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
              />
            </svg>
            <span class="browser-share-title">浏览分享</span>
          </div>
          <div class="browser-share-preview">
            <div class="preview-content">
              <div class="preview-title">{{ msg.title }}</div>
              <div class="preview-meta">
                <span class="preview-source">{{ msg.source }}</span>
                <span class="preview-time">刚刚浏览</span>
              </div>
              <div class="preview-description">{{ msg.description }}</div>
              <div class="preview-url">{{ msg.url }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- File Message -->
      <div v-else-if="msg.type === 'file'" class="message-content file-message-content" style="padding: 0">
        <div class="file-container">
          <div class="file-icon" :class="getFileExtension(msg.filename)">
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <div class="file-info">
            <div class="file-name">{{ msg.filename }}</div>
            <div class="file-size">{{ msg.filesize }}</div>
          </div>
        </div>
      </div>

      <!-- Text Image Message (imgdesc) - 带遮罩的图片描述 -->
      <div v-else-if="msg.type === 'text-image'" class="message-content text-image-content" style="padding: 0; overflow: hidden">
        <div class="text-image-container" @click="toggleTextImageReveal">
          <!-- 遮罩层 -->
          <div class="text-image-mask" :class="{ revealed: textImageRevealed }">
            <div class="text-image-icon">
              <i class="fas fa-image"></i>
            </div>
            <div class="text-image-hint">{{ textImageRevealed ? '点击隐藏' : '点击查看图片描述' }}</div>
          </div>
          <!-- 文字内容 -->
          <div class="text-image-text" :class="{ revealed: textImageRevealed }">
            {{ msg.content || msg.description }}
          </div>
        </div>
      </div>

      <!-- Call Missed -->
      <div v-else-if="msg.type === 'call-missed'" class="call-message-wrapper">
        <div
          style="
            background-color: #edf1fb;
            border: 1px solid #c8d4ed;
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            box-shadow: 0 2px 6px rgba(108, 140, 213, 0.15);
          "
        >
          <div
            style="
              background-color: #dfe7f7;
              border-radius: 50%;
              padding: 10px;
              margin-right: 12px;
              border: 1px solid #6c8cd5;
              display: flex;
              justify-content: center;
              align-items: center;
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4A6FBF"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
              ></path>
              <line x1="22" y1="2" x2="2" y2="22"></line>
            </svg>
          </div>
          <div style="flex: 1">
            <p
              style="
                margin: 0 0 4px 0;
                font-family: -apple-system, sans-serif;
                color: #4a6fbf;
                font-size: 14px;
                font-weight: 500;
              "
            >
              未接听通话
            </p>
          </div>
        </div>
      </div>

      <!-- Fallback -->
      <div v-else class="message-content">[未知消息类型]</div>

      <div class="message-time">{{ msg.time }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { getStickerUrlByName, getCharacterImageUrlByName } from '../../../数据';

const props = defineProps<{
  msg: any;
  currentChatAvatar: string;
  isGroup: boolean;
  userAvatar?: string;
  partnerName?: string;
}>();

const emit = defineEmits<{
  (e: 'transfer-accept', amount: string): void;
  (e: 'transfer-reject', amount: string): void;
  (e: 'transfer-click', msg: any): void;
  (e: 'recall', msgId: string): void;
  (e: 'poke'): void;
}>();

// 撤回消息
const handleRecall = () => {
  emit('recall', props.msg.id);
};

// 戳一戳
const handlePoke = () => {
  emit('poke');
};

// 文字图片消息的显示/隐藏状态
const textImageRevealed = ref(false);

const toggleTextImageReveal = () => {
  textImageRevealed.value = !textImageRevealed.value;
};

// 获取表情包的实际URL
const stickerUrl = computed(() => {
  if (props.msg.type !== 'sticker' || !props.msg.content) return '';
  if (props.msg.content.startsWith('http://') || props.msg.content.startsWith('https://')) {
    return props.msg.content;
  }
  return getStickerUrlByName(props.msg.content) || props.msg.content;
});

// 获取图片的实际URL（支持名称解析）
const imageUrl = computed(() => {
  if (props.msg.type !== 'image' || !props.msg.content) return '';
  return getCharacterImageUrlByName(props.msg.content) || props.msg.content;
});

// 转账状态
const transferProcessed = ref(false);

const openTransferModal = () => {
  if (!transferProcessed.value) {
    emit('transfer-click', props.msg);
  }
};

// 标记转账已处理
const markProcessed = () => {
  transferProcessed.value = true;
};

// 暴露方法给父组件
defineExpose({ markProcessed });

const isPlaying = ref(false);
const isTyping = ref(false);
const showVoiceText = ref(false);
const displayedText = ref('');
const currentTime = ref(0);
let typingTimer: ReturnType<typeof setInterval> | null = null;

// 计算总时长（基于文字数量，每秒5个字）
const totalDuration = computed(() => {
  const fullText = props.msg.voiceText || props.msg.content || '';
  return Math.ceil(fullText.length / 5); // 每秒5个字
});

// 格式化时间显示 mm:ss
const formattedTime = computed(() => {
  const time = isPlaying.value ? currentTime.value : totalDuration.value;
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

const toggleVoice = () => {
  if (isPlaying.value) {
    // 暂停
    isPlaying.value = false;
    isTyping.value = false;
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
  } else {
    // 播放
    isPlaying.value = true;
    showVoiceText.value = true;
    startTypingEffect();
  }
};

const startTypingEffect = () => {
  const fullText = props.msg.voiceText || props.msg.content || '';
  if (!fullText) {
    isPlaying.value = false;
    return;
  }

  displayedText.value = '';
  isTyping.value = true;
  currentTime.value = 0;
  let index = 0;
  let charCount = 0;

  // 每秒5个字 = 每200ms一个字
  typingTimer = setInterval(() => {
    if (index < fullText.length) {
      displayedText.value += fullText[index];
      index++;
      charCount++;

      // 每5个字增加1秒
      if (charCount >= 5) {
        currentTime.value++;
        charCount = 0;
      }
    } else {
      // 打字完成
      isTyping.value = false;
      isPlaying.value = false;
      currentTime.value = totalDuration.value;
      if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
      }
    }
  }, 200); // 每200ms一个字 = 每秒5个字
};

// 清理定时器
onUnmounted(() => {
  if (typingTimer) {
    clearInterval(typingTimer);
  }
});

// 当消息变化时重置状态
watch(
  () => props.msg.id,
  () => {
    isPlaying.value = false;
    isTyping.value = false;
    showVoiceText.value = false;
    displayedText.value = '';
    currentTime.value = 0;
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
  },
);

const getFileExtension = (filename: string) => {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext;
};
</script>

<style scoped>
/* Common Message Styles */
.message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 85%;
  animation: message-pop 0.3s ease-out;
  margin-bottom: 8px;
  position: relative;
}

@keyframes message-pop {
  0% {
    transform: translateY(10px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.message.sent {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.received {
  align-self: flex-start;
}

/* 群聊消息特殊样式 */
.message.group-message {
  margin-bottom: 12px;
}

.avatar-wrapper {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid #fff;
  flex-shrink: 0;
  align-self: flex-start;
}

.avatar-wrapper.user-avatar {
  border-color: #fff;
}

.avatar-wrapper:hover {
  transform: scale(1.1);
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar:hover {
  transform: scale(1.1);
}

/* 图片消息样式 */
.image-message {
  max-width: 200px;
  max-height: 300px;
  border-radius: 12px;
  object-fit: contain;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 46px);
}

.message-content {
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  word-break: break-word;
  position: relative;
  transition: transform 0.2s;
}

.message-content:hover {
  transform: translateY(-2px);
}

.sent .message-content {
  background: linear-gradient(135deg, #6c8cd5, #4a6fbf);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.received .message-content {
  background: #fff;
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
  margin-left: 4px;
  margin-right: 4px;
}

.sent .message-time {
  text-align: right;
}

.message-sender-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
  font-weight: 500;
}

/* Recalled Message */
.message-content.recalled {
  background: #e0e0e0;
  color: #666;
  font-style: italic;
  font-size: 13px;
  position: relative;
}

.recalled-tooltip {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  width: 200px;
  margin-bottom: 8px;
  z-index: 10;
  font-style: normal;
}

.message-content.recalled:hover .recalled-tooltip {
  display: block;
}

/* Transfer Card - 支付宝/微信风格 */
.transfer-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #fdf6ec 0%, #fef9f3 100%);
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #f5e6d3;
  min-width: 140px;
}

.transfer-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.2);
}

.transfer-card-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #e6a23c 0%, #d4912a 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  flex-shrink: 0;
}

.transfer-card-info {
  flex: 1;
  min-width: 0;
}

.transfer-card-label {
  font-size: 12px;
  color: #a08060;
  margin-bottom: 2px;
}

.transfer-card-amount {
  font-size: 16px;
  font-weight: 600;
  color: #c8a060;
}

/* Transfer Card - 已处理状态 */
.transfer-card.processed {
  background: linear-gradient(135deg, #f5f5f5 0%, #ebebeb 100%);
  border-color: #e0e0e0;
  cursor: default;
}

.transfer-card.processed:hover {
  transform: none;
  box-shadow: none;
}

.transfer-card.processed .transfer-card-icon {
  background: linear-gradient(135deg, #bbb 0%, #999 100%);
}

.transfer-card.processed .transfer-card-label,
.transfer-card.processed .transfer-card-amount {
  color: #999;
}

/* Transfer Card - 我方发送样式 */
.transfer-card.sent {
  cursor: default;
}

.transfer-card.sent:hover {
  transform: none;
  box-shadow: none;
}

/* Transfer Modal */
.transfer-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.transfer-modal {
  width: 280px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  animation: modal-pop 0.3s ease-out;
}

@keyframes modal-pop {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.transfer-modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 20px 16px;
  background: linear-gradient(135deg, #fdf6ec 0%, #fef9f3 100%);
  color: #c8a060;
  font-size: 15px;
  font-weight: 500;
}

.transfer-modal-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #e6a23c 0%, #d4912a 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.transfer-modal-amount {
  padding: 16px 20px;
  text-align: center;
  font-size: 32px;
  font-weight: 600;
  color: #c8a060;
}

.transfer-modal-note {
  padding: 0 20px 20px;
  text-align: center;
  font-size: 14px;
}

.transfer-modal-note .note-label {
  color: #999;
}

.transfer-modal-note .note-content {
  color: #666;
}

.transfer-modal-buttons {
  display: flex;
  border-top: 1px solid #f0f0f0;
}

.transfer-btn {
  flex: 1;
  padding: 14px;
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.transfer-btn.reject {
  background: white;
  color: #999;
  border-right: 1px solid #f0f0f0;
}

.transfer-btn.reject:hover {
  background: #f5f5f5;
}

.transfer-btn.accept {
  background: linear-gradient(135deg, #e6a23c 0%, #d4912a 100%);
  color: white;
}

.transfer-btn.accept:hover {
  background: linear-gradient(135deg, #d4912a 0%, #c88020 100%);
}

/* Voice Message */
.voice-message {
  padding: 10px 14px !important;
  min-width: 180px;
}

.voice-message-container {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
  padding: 4px;
}

.voice-message-container:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.voice-play-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6c8cd5;
  border-radius: 50%;
  flex-shrink: 0;
  color: white;
  font-size: 12px;
  transition: transform 0.2s, background-color 0.2s;
}

.voice-play-btn:hover {
  transform: scale(1.1);
}

.voice-play-btn i {
  margin-left: 2px;
}

.voice-play-btn .fa-pause {
  margin-left: 0;
}

.sent .voice-play-btn {
  background: white;
  color: #6c8cd5;
}

.voice-duration {
  font-size: 14px;
  font-weight: 500;
  min-width: 36px;
}

.voice-text-expand {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #555;
  line-height: 1.5;
  animation: fadeIn 0.3s ease;
}

.sent .voice-text-expand {
  border-top-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.85);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.voice-text-content {
  word-break: break-word;
}

.voice-wave-bars {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 24px;
  flex-shrink: 0;
}

.voice-wave-bars span {
  width: 3px;
  height: 8px;
  background: #6c8cd5;
  border-radius: 2px;
  transition: height 0.1s ease;
}

.sent .voice-wave-bars span {
  background: rgba(255, 255, 255, 0.7);
}

.voice-wave-bars span:nth-child(1) {
  height: 10px;
}
.voice-wave-bars span:nth-child(2) {
  height: 16px;
}
.voice-wave-bars span:nth-child(3) {
  height: 12px;
}
.voice-wave-bars span:nth-child(4) {
  height: 18px;
}
.voice-wave-bars span:nth-child(5) {
  height: 8px;
}

/* 播放时声浪动画 */
.voice-message-container.playing .voice-wave-bars span {
  animation: wave-random 0.4s infinite ease-in-out alternate;
}

.voice-message-container.playing .voice-wave-bars span:nth-child(1) {
  animation-delay: 0s;
  animation-duration: 0.3s;
}
.voice-message-container.playing .voice-wave-bars span:nth-child(2) {
  animation-delay: 0.1s;
  animation-duration: 0.35s;
}
.voice-message-container.playing .voice-wave-bars span:nth-child(3) {
  animation-delay: 0.05s;
  animation-duration: 0.4s;
}
.voice-message-container.playing .voice-wave-bars span:nth-child(4) {
  animation-delay: 0.15s;
  animation-duration: 0.32s;
}
.voice-message-container.playing .voice-wave-bars span:nth-child(5) {
  animation-delay: 0.08s;
  animation-duration: 0.38s;
}

@keyframes wave-random {
  0% {
    height: 6px;
  }
  100% {
    height: 20px;
  }
}

/* Location Message */
.location-preview {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  min-width: 200px;
  background: white; /* Ensure white bg even for sent messages if specific design requires */
  border-radius: 12px;
  color: #333; /* Force text color */
}

/* Override sent styles for location content wrapper */
.sent .location-content {
  background: white;
  color: #333;
}

.location-left {
  flex-shrink: 0;
  margin-right: 12px;
}

.location-icon {
  font-size: 24px;
}

.location-right {
  flex: 1;
  min-width: 0;
}

.location-title {
  font-weight: 600;
  margin-bottom: 2px;
  font-size: 14px;
}

.location-address {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-distance {
  color: #6c8cd5;
  font-size: 12px;
  font-weight: 500;
}

.location-arrow {
  color: #999;
  font-size: 18px;
  margin-left: 4px;
}

/* News Message */
.news-card {
  width: 190px;
  padding: 12px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Override sent styles for news */
.sent .news-preview {
  background: white;
  color: #333;
  border-radius: 12px;
  overflow: hidden;
}

.news-title {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
  font-weight: 500;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #999;
}

.news-source-name {
  color: #666;
}

/* Browser Share */
.browser-share {
  min-width: 180px;
  max-width: 200px;
}

.browser-share-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #5b89ff;
  font-weight: 500;
}

.sent .browser-share-header {
  color: #fff;
}

.browser-share-preview {
  background: #f0f2f5;
  border-radius: 8px;
  padding: 10px;
}

.sent .browser-share-preview {
  background: rgba(255, 255, 255, 0.2);
}

.preview-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.preview-meta {
  font-size: 10px;
  opacity: 0.7;
  margin-bottom: 4px;
}

.preview-description {
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-url {
  font-size: 10px;
  color: #5b89ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sent .preview-url {
  color: white;
  text-decoration: underline;
}

/* File Message */
.file-container {
  display: flex;
  padding: 10px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  width: 200px;
  align-items: center;
}

/* Override sent */
.sent .file-container {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
.sent .file-name {
  color: white !important;
}
.sent .file-size {
  color: rgba(255, 255, 255, 0.8) !important;
}

.file-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
}

.file-icon.docx {
  background: #4285f4;
}
.file-icon.pptx {
  background: #f4511e;
}
.file-icon.xlsx {
  background: #0f9d58;
}
.file-icon.zip {
  background: #8d6e63;
}
.file-icon.pdf {
  background: #db4437;
}
.file-icon.unknown {
  background: #999;
}

.file-icon svg {
  width: 20px;
  height: 20px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: #666;
}

/* 打字指示器样式 */
.typing-indicator {
  display: inline-flex;
  gap: 2px;
  padding: 2px 4px;
  margin-top: 2px;
}

.typing-dot {
  width: 3px;
  height: 3px;
  background: #999;
  border-radius: 50%;
  animation: subtle-typing 1.5s infinite;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes subtle-typing {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-1px);
    opacity: 0.8;
  }
}

/* 表情包和图片消息样式 */
.message-content img {
  transition: all 0.3s ease;
  animation: img-load 0.5s ease-in;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.message-content img:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@keyframes img-load {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 日期分隔符样式 */
.date-separator {
  display: flex;
  justify-content: center;
  padding: 12px 16px;
  margin: 8px 0;
}

.date-separator-text {
  background: rgba(0, 0, 0, 0.06);
  color: #666;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

/* 系统消息样式 - 居中灰色圆角块 */
.system-message {
  display: flex;
  justify-content: center;
  padding: 8px 16px;
  margin: 4px 0;
}

.system-message-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.06);
  color: #888;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 12px;
}

.system-message-content i {
  font-size: 11px;
  color: #999;
}

/* 撤回按钮 */
.recall-btn {
  position: absolute;
  left: -28px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: all 0.2s;
}

.recall-btn i {
  font-size: 10px;
}

.message:hover .recall-btn,
.recall-btn:hover {
  opacity: 1;
}

.recall-btn:hover {
  background: rgba(0, 0, 0, 0.15);
  color: #666;
}

/* 戳一戳消息 */
.poke-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.poke-recall-btn {
  position: static;
  transform: none;
  flex-shrink: 0;
}

.poke-message:hover .poke-recall-btn {
  opacity: 1;
}

/* 文字图片消息 (imgdesc) 样式 */
.text-image-content {
  border-radius: 12px !important;
  overflow: hidden;
}

.text-image-container {
  position: relative;
  min-width: 180px;
  min-height: 120px;
  cursor: pointer;
  background: #f5f5f5;
}

.sent .text-image-container {
  background: rgba(255, 255, 255, 0.15);
}

.text-image-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  z-index: 2;
}

.sent .text-image-mask {
  background: linear-gradient(135deg, rgba(108, 140, 213, 0.8) 0%, rgba(74, 111, 191, 0.8) 100%);
}

.text-image-mask.revealed {
  opacity: 0;
  visibility: hidden;
}

.text-image-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.text-image-icon i {
  font-size: 20px;
  color: #6c8cd5;
}

.sent .text-image-icon {
  background: rgba(255, 255, 255, 0.95);
}

.text-image-hint {
  font-size: 12px;
  color: #666;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 12px;
  border-radius: 12px;
}

.sent .text-image-hint {
  color: #4a6fbf;
}

.text-image-text {
  padding: 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
  opacity: 0;
  transition: opacity 0.3s ease;
  min-height: 92px;
  display: flex;
  align-items: center;
}

.sent .text-image-text {
  color: #fff;
}

.text-image-text.revealed {
  opacity: 1;
}
</style>
