<template>
  <!-- 日期分隔符 -->
  <div v-if="msg.type === 'date-separator'" class="date-separator">
    <span class="date-separator-text">{{ msg.content }}</span>
  </div>

  <div v-else class="message" :class="{ sent: msg.isMe, received: !msg.isMe }">
    <!-- 撤回按钮 - 仅本次发送的消息显示 -->
    <button
      v-if="msg.isMe && msg.isNewMessage"
      class="recall-btn"
      title="撤回"
      @click="handleRecall"
    >
      <i class="fas fa-undo-alt"></i>
    </button>
    <div v-if="!msg.isMe" class="avatar-wrapper">
      <img :src="msg.sender?.avatar || ''" class="avatar" />
    </div>
    <div v-if="msg.isMe && userAvatar" class="avatar-wrapper user-avatar">
      <img :src="userAvatar" class="avatar" />
    </div>
    <div class="message-wrapper">
      <div v-if="!msg.isMe" class="message-sender-name">
        {{ msg.sender?.name }}
      </div>
      <div v-if="msg.isMe" class="message-sender-name sent-name">我</div>

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
            {{ msg.content }}
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

      <!-- Fallback -->
      <div v-else class="message-content">[未知消息类型]</div>

      <div class="message-time">{{ msg.time }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getStickerUrlByName, getCharacterImageUrlByName } from '../../../数据';

// 群聊消息接口定义（支持 text、image、sticker、text-image、file、date-separator）
export interface GroupMessage {
  id: string;
  type: 'text' | 'image' | 'sticker' | 'text-image' | 'file' | 'date-separator';
  content?: string;
  time: string;
  isMe: boolean;
  sender?: {
    name: string;
    avatar: string;
  };
  isNewMessage?: boolean;
  // 文件消息字段
  filename?: string;
  filesize?: string;
  description?: string;
}

const props = defineProps<{
  msg: GroupMessage;
  userAvatar?: string;
}>();

const emit = defineEmits<{
  (e: 'recall', msgId: string): void;
}>();

// 撤回消息
const handleRecall = () => {
  emit('recall', props.msg.id);
};

// 文字图片消息的显示/隐藏状态
const textImageRevealed = ref(false);

const toggleTextImageReveal = () => {
  textImageRevealed.value = !textImageRevealed.value;
};

// 获取表情包的实际URL
const stickerUrl = computed(() => {
  if (props.msg.type !== 'sticker' || !props.msg.content) return '';
  // 如果已经是URL，直接返回
  if (props.msg.content.startsWith('http://') || props.msg.content.startsWith('https://')) {
    return props.msg.content;
  }
  // 否则通过名称查找URL
  return getStickerUrlByName(props.msg.content) || props.msg.content;
});

// 获取图片的实际URL（支持名称解析）
const imageUrl = computed(() => {
  if (props.msg.type !== 'image' || !props.msg.content) return '';
  return getCharacterImageUrlByName(props.msg.content) || props.msg.content;
});

// 获取文件扩展名
const getFileExtension = (filename: string | undefined) => {
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
  gap: 8px;
  max-width: 85%;
  animation: fadeIn 0.3s ease;
  margin-bottom: 16px;
  position: relative;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.sent {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.received {
  align-self: flex-start;
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

.avatar-wrapper:hover {
  transform: scale(1.1);
}

.avatar-wrapper.user-avatar {
  border-color: #fff;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  gap: 4px;
}

.received .message-wrapper {
  max-width: 75%;
}

.sent .message-wrapper {
  max-width: 100%;
}

.message-content {
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.4;
  position: relative;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  max-width: 100%;
}

.sent .message-content {
  background: #6c8cd5;
  color: white;
  border-bottom-right-radius: 4px;
}

.received .message-content {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  margin: 0 4px;
}

.sent .message-time {
  text-align: right;
}

.message-sender-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
  margin-left: 2px;
}

.sent .message-sender-name.sent-name {
  text-align: right;
  margin-right: 2px;
  margin-left: 0;
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

/* 日期分隔符 */
.date-separator {
  display: flex;
  justify-content: center;
  padding: 12px 16px;
  margin-bottom: 8px;
}

.date-separator-text {
  background: rgba(0, 0, 0, 0.06);
  color: #666;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
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
</style>
