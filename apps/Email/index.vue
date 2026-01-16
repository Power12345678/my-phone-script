<template>
  <div class="email-app">
    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="emailState.isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在获取邮件...</span>
          <button class="abort-btn" @click="handleAbort">
            <i class="fas fa-stop"></i>
            <span>终止生成</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-down">
      <div v-if="emailState.error" class="error-toast" @click="clearError">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ emailState.error }}</span>
      </div>
    </Transition>

    <!-- 邮件详情页 -->
    <template v-if="selectedEmail">
      <div class="email-header">
        <div class="email-title">
          <i class="fas fa-arrow-left back-icon" @click="selectedEmail = null"></i>
          邮件详情
        </div>
      </div>
      <div class="email-detail">
        <div class="detail-card">
          <div class="detail-sender">
            <div class="sender-avatar">
              <img :src="getAvatar(selectedEmail.sender.name)" :alt="selectedEmail.sender.name" />
            </div>
            <div class="sender-info">
              <div class="sender-name">{{ selectedEmail.sender.name }}</div>
              <div class="sender-email">{{ selectedEmail.sender.email }}</div>
            </div>
            <i
              class="fas fa-star star-icon"
              :class="{ starred: selectedEmail.starred }"
              @click="selectedEmail.starred = !selectedEmail.starred"
            ></i>
          </div>
          <div class="detail-subject">{{ selectedEmail.title }}</div>
          <div class="detail-time">{{ selectedEmail.date }} {{ selectedEmail.time }}</div>
        </div>
        <div class="detail-content-card">
          <div class="detail-text">{{ selectedEmail.content }}</div>
        </div>
        <div v-if="selectedEmail.attachment" class="attachment-card">
          <i class="fas fa-paperclip"></i>
          <div class="attachment-info">
            <div class="attachment-name">{{ selectedEmail.attachment.name }}</div>
            <div class="attachment-size">{{ selectedEmail.attachment.size }}</div>
          </div>
          <button class="download-btn" @click="downloadAttachment">
            <i class="fas fa-download"></i>
            下载附件
          </button>
        </div>

        <!-- 下载成功提示 -->
        <transition name="toast">
          <div v-if="showToast" class="toast-message">
            <i class="fas fa-check-circle"></i>
            下载成功
          </div>
        </transition>
      </div>
    </template>

    <!-- 邮件列表页 -->
    <template v-else>
      <div class="email-header">
        <div class="email-title">
          <i class="fas fa-arrow-left back-icon" @click="$emit('back')"></i>
          邮箱
        </div>
        <div class="header-actions">
          <i class="fas fa-sync-alt refresh-icon" :class="{ 'fa-spin': isRefreshing }" @click="refresh"></i>
          <input v-model="searchQuery" type="text" class="email-search" placeholder="搜索..." />
        </div>
      </div>

      <div class="email-list">
        <div
          v-for="(email, index) in filteredEmails"
          :key="email.id"
          class="email-item"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="openEmail(email)"
        >
          <div class="email-sender">
            {{ email.sender.name }}
            <span v-if="email.attachment" class="attachment-icon">
              <i class="fas fa-paperclip"></i>
            </span>
          </div>
          <div class="email-address">{{ email.sender.email }}</div>
          <div class="email-subject">{{ email.title }}</div>
          <div class="email-preview">{{ email.preview }}</div>
          <div class="email-time">{{ email.time }}</div>
        </div>
      </div>

      <!-- 写邮件按钮 -->
      <div class="compose-button" @click="showCompose = true">+</div>

      <!-- 写邮件弹窗 -->
      <div v-if="showCompose" class="compose-dialog" @click.self="showCompose = false">
        <div class="compose-dialog-content">
          <div class="compose-dialog-title">新邮件</div>
          <div class="form-group">
            <label>收件人</label>
            <input v-model="composeData.to" type="text" class="form-control" placeholder="请输入收件人..." />
          </div>
          <div class="form-group">
            <label>主题</label>
            <input v-model="composeData.subject" type="text" class="form-control" placeholder="请输入邮件主题..." />
          </div>
          <div class="form-group">
            <label>内容</label>
            <textarea v-model="composeData.content" class="form-control form-textarea" placeholder="请输入邮件内容..."></textarea>
          </div>
          <div class="compose-dialog-buttons">
            <button class="compose-dialog-button cancel-button" @click="showCompose = false">取消</button>
            <button
              class="compose-dialog-button send-button"
              :disabled="!composeData.to.trim() || !composeData.subject.trim() || isSending"
              @click="sendEmail"
            >
              <i v-if="isSending" class="fas fa-spinner fa-spin"></i>
              <span v-else>发送</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部导航 -->
      <div class="email-nav">
        <div class="nav-item">
          <i class="fas fa-inbox nav-icon"></i>
          收件箱
        </div>
        <div class="nav-item">
          <i class="fas fa-users nav-icon"></i>
          联系人
        </div>
        <div class="nav-item">
          <i class="fas fa-archive nav-icon"></i>
          归档
        </div>
        <div class="nav-item">
          <i class="fas fa-cog nav-icon"></i>
          设置
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import yaml from 'yaml';
import { findCharacterByName } from '../../数据/index';
import { emailState, loadEmailDataFromAi, saveToTavernMessage, abortCurrentRequest, store } from '../../store';

defineEmits(['back']);

interface Email {
  id: string;
  sender: {
    name: string;
    email: string;
  };
  time: string;
  date: string;
  title: string;
  preview: string;
  read: boolean;
  starred: boolean;
  content: string;
  attachment?: {
    name: string;
    size: string;
    desc: string;
  } | null;
}

// 后备数据（空）
const fallbackEmailData = { emails: [] };

// 计算属性：获取邮箱数据
const emailData = computed(() => {
  if (emailState.data) {
    return emailState.data;
  }
  return fallbackEmailData;
});

// 邮件列表
const emails = computed<Email[]>(() => emailData.value.emails || []);

const searchQuery = ref('');
const selectedEmail = ref<Email | null>(null);
const showCompose = ref(false);
const showToast = ref(false);
const isRefreshing = ref(false);
const composeData = ref({
  to: '',
  subject: '',
  content: '',
});
const isSending = ref(false);

// 组件挂载时加载数据
onMounted(() => {
  if (!emailState.loaded && !emailState.isLoading) {
    loadEmailDataFromAi();
  }
});

const filteredEmails = computed(() => {
  if (!searchQuery.value) return emails.value;
  const query = searchQuery.value.toLowerCase();
  return emails.value.filter(
    e =>
      e.sender.name.toLowerCase().includes(query) ||
      e.title.toLowerCase().includes(query) ||
      e.preview.toLowerCase().includes(query)
  );
});

// 刷新数据
const refresh = async () => {
  isRefreshing.value = true;
  emailState.loaded = false;
  await loadEmailDataFromAi(true);
  isRefreshing.value = false;
};

// 清除错误
const clearError = () => {
  emailState.error = null;
};

// 终止生成并返回主页
const handleAbort = () => {
  abortCurrentRequest();
  emailState.isLoading = false;
  store.activeApp = 'home';
};

const getAvatar = (name: string): string => {
  const character = findCharacterByName(name);
  return character?.avatar || 'https://files.catbox.moe/arh2ub.JPG';
};

const openEmail = (email: Email) => {
  email.read = true;
  selectedEmail.value = email;
};

const sendEmail = async () => {
  if (!composeData.value.to.trim() || !composeData.value.subject.trim() || isSending.value) return;

  isSending.value = true;

  try {
    const { sendUserEmail } = await import('../../预设/aiService');

    const result = await sendUserEmail(
      composeData.value.to.trim(),
      composeData.value.subject.trim(),
      composeData.value.content.trim(),
      emails.value,
    );

    if (result.success && result.data) {
      // 更新邮箱数据
      emailState.data = result.data;
      // 保存到酒馆楼层
      await saveToTavernMessage('email', result.data);
      // 关闭弹窗并清空表单
      showCompose.value = false;
      composeData.value = { to: '', subject: '', content: '' };
    } else {
      emailState.error = result.error || '发送失败';
    }
  } catch (e) {
    emailState.error = e instanceof Error ? e.message : '发送时发生错误';
  } finally {
    isSending.value = false;
  }
};

const downloadAttachment = () => {
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 2000);
};
</script>

<style scoped>
.email-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fef6f6;
  position: relative;
}

.email-header {
  padding: 15px;
  background: linear-gradient(to right, #ffebeb, #fef6f6);
  border-bottom: 1px solid #ffd1d1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.email-title {
  font-size: 20px;
  color: #ff6b6b;
  font-weight: bold;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-icon {
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.back-icon:hover {
  transform: translateX(-2px);
}

.email-search {
  padding: 6px 12px;
  border-radius: 15px;
  border: 1px solid #ffd1d1;
  background: white;
  width: 120px;
  font-size: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  outline: none;
}

.email-search:focus {
  box-shadow: 0 1px 4px rgba(255, 107, 107, 0.2);
  width: 140px;
}

/* 邮件列表 */
.email-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.email-list::-webkit-scrollbar {
  width: 4px;
}

.email-list::-webkit-scrollbar-track {
  background: #fff;
}

.email-list::-webkit-scrollbar-thumb {
  background: #ffd1d1;
  border-radius: 10px;
}

.email-list::-webkit-scrollbar-thumb:hover {
  background: #ffb0b0;
}

.email-item {
  background: white;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(255, 209, 209, 0.5);
  transition: all 0.3s ease;
  cursor: pointer;
  animation: fadeIn 0.5s ease forwards;
  opacity: 0;
  transform: translateY(10px);
  position: relative;
  overflow: hidden;
}

.email-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, #ff6b6b, transparent);
  transform: scaleX(0);
  transition: transform 0.4s ease;
}

.email-item:hover::after {
  transform: scaleX(1);
}

.email-item:nth-child(odd)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: linear-gradient(to bottom, transparent, #ff6b6b, transparent);
}

.email-item:nth-child(even)::before {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: linear-gradient(to bottom, transparent, #ff6b6b, transparent);
}

.email-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.email-sender {
  font-size: 14px;
  color: #ff6b6b;
  font-weight: bold;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.attachment-icon {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  opacity: 0.7;
  transition: all 0.3s ease;
  color: #888;
}

.email-item:hover .attachment-icon {
  opacity: 1;
  transform: scale(1.1);
}

.email-address {
  font-size: 10px;
  color: #888;
  margin-bottom: 6px;
  font-style: italic;
  transition: color 0.3s ease;
}

.email-item:hover .email-address {
  color: #666;
}

.email-subject {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
  font-weight: 500;
}

.email-preview {
  font-size: 12px;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.email-time {
  font-size: 11px;
  color: #999;
  text-align: right;
  margin-top: 6px;
  font-weight: 300;
}

/* 写邮件按钮 */
.compose-button {
  position: absolute;
  bottom: 90px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #ff6b6b, #ff8787);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 10px rgba(255, 107, 107, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
}

.compose-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 15px rgba(255, 107, 107, 0.4);
}

/* 写邮件弹窗 */
.compose-dialog {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.compose-dialog-content {
  background: #fff;
  border-radius: 20px;
  width: 90%;
  max-width: 320px;
  padding: 25px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 2px solid #ffd1d1;
}

.compose-dialog-title {
  font-size: 1.4em;
  color: #ff6b6b;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 600;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-size: 0.9em;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ffd1d1 !important;
  border-radius: 10px;
  font-size: 0.9em;
  transition: all 0.3s ease;
  outline: none !important;
  background: #fff !important;
  color: #333 !important;
}

.form-control:focus {
  border-color: #ff6b6b !important;
  box-shadow: 0 0 10px rgba(255, 107, 107, 0.2);
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

.compose-dialog-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.compose-dialog-button {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.cancel-button {
  background: #f0f0f0;
  color: #666;
}

.cancel-button:hover {
  background: #e0e0e0;
}

.send-button {
  background: linear-gradient(135deg, #ff6b6b, #ff8787);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
}

.send-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
}

/* 底部导航 */
.email-nav {
  display: flex;
  justify-content: space-around;
  padding: 12px 10px;
  background: linear-gradient(to right, #ffebeb, #fef6f6);
  border-top: 1px solid #ffd1d1;
  border-radius: 12px 12px 0 0;
}

.nav-item {
  color: #ff6b6b;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 6px 10px;
  border-radius: 10px;
  position: relative;
}

.nav-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 60%;
  height: 2px;
  background: #ff6b6b;
  transition: transform 0.3s ease;
  border-radius: 2px;
}

.nav-item:hover::after {
  transform: translateX(-50%) scaleX(1);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.5);
}

.nav-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.nav-item:hover .nav-icon {
  transform: scale(1.1);
}

/* 邮件详情 */
.email-detail {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.detail-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(255, 209, 209, 0.5);
}

.detail-sender {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.sender-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  border: 2px solid #ffd1d1;
}

.sender-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sender-info {
  flex: 1;
}

.sender-name {
  font-size: 14px;
  color: #ff6b6b;
  font-weight: bold;
}

.sender-email {
  font-size: 10px;
  color: #888;
  font-style: italic;
}

.star-icon {
  font-size: 18px;
  color: #ddd;
  cursor: pointer;
  transition: all 0.2s;
}

.star-icon.starred {
  color: #ffc107;
}

.detail-subject {
  font-size: 16px;
  color: #333;
  font-weight: 600;
  margin-bottom: 8px;
}

.detail-time {
  font-size: 11px;
  color: #999;
}

.detail-content-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(255, 209, 209, 0.5);
}

.detail-text {
  font-size: 13px;
  color: #444;
  line-height: 1.7;
  white-space: pre-wrap;
}

.attachment-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(255, 209, 209, 0.5);
}

.attachment-card > i:first-child {
  font-size: 20px;
  color: #ff6b6b;
  margin-right: 12px;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.attachment-size {
  font-size: 11px;
  color: #999;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #ffd4d4, #ffe0e0);
  border: none;
  border-radius: 20px;
  color: #ff9999;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(255, 153, 153, 0.2);
}

.download-btn i {
  font-size: 12px;
  opacity: 0.85;
}

.download-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(255, 153, 153, 0.3);
  background: linear-gradient(135deg, #ffc8c8, #ffd4d4);
}

.download-btn:active {
  transform: scale(0.96);
}

/* Toast 提示 */
.toast-message {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 107, 107, 0.95);
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
  z-index: 1000;
}

.toast-message i {
  font-size: 16px;
}

.toast-enter-active {
  animation: toastIn 0.3s ease;
}

.toast-leave-active {
  animation: toastOut 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(254, 246, 246, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #ff6b6b;
}

.loading-spinner i {
  font-size: 28px;
}

.loading-spinner span {
  font-size: 14px;
  color: #666;
}

/* 终止按钮 */
.abort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 20px;
  border: none;
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.abort-btn:active {
  transform: scale(0.95);
  background: linear-gradient(135deg, #e55a5a, #e57d7d);
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
  top: 60px;
  left: 12px;
  right: 12px;
  background: rgba(255, 107, 107, 0.95);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 13px;
  z-index: 101;
  cursor: pointer;
}

/* 头部操作区 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-icon {
  font-size: 14px;
  color: #ff6b6b;
  cursor: pointer;
  padding: 6px;
  transition: all 0.2s;
}

.refresh-icon:hover {
  transform: rotate(30deg);
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
