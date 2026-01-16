<template>
  <div class="browser-container">
    <!-- Header -->
    <div class="browser-header">
      <div class="browser-tabs">
        <div class="browser-tab active">
          <span class="tab-dot"></span>
          <span class="tab-title">{{ currentTitle }}</span>
        </div>
        <div class="browser-tab" @click="goHome">
          <span class="tab-dot"></span>
          <span>新标签页</span>
        </div>
      </div>
      <div class="url-bar">
        <i class="fas fa-globe url-bar-icon"></i>
        <span class="url-text">{{ currentUrl }}</span>
      </div>
    </div>

    <!-- Search Homepage -->
    <div v-if="view === 'home'" class="home-search-container">
      <div class="abstract-logo">
        <span v-for="(letter, i) in 'ABSTRACT'" :key="i" class="abstract-letter" :style="{ animationDelay: `${i * 0.12}s` }">
          {{ letter }}
        </span>
      </div>
      <form class="search-form" @submit.prevent="handleSearch">
        <div class="search-input-container">
          <input v-model="searchQuery" type="text" class="search-input" placeholder="输入搜索内容..." />
          <button type="submit" class="search-btn" :disabled="isLoading">
            <i v-if="isLoading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-search"></i>
          </button>
        </div>
      </form>
    </div>

    <!-- Loading State -->
    <div v-else-if="view === 'loading'" class="loading-container">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div class="loading-text">正在搜索 "{{ searchQuery }}"...</div>
      <div class="loading-hint">AI 正在生成搜索结果</div>
      <button class="abort-btn" @click="handleAbort">
        <i class="fas fa-stop"></i>
        <span>终止生成</span>
      </button>
    </div>

    <!-- Error State -->
    <div v-else-if="view === 'error'" class="error-container">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="error-text">{{ errorMessage }}</div>
      <button class="retry-btn" @click="goHome">
        <i class="fas fa-redo"></i>
        返回首页
      </button>
    </div>

    <!-- Search Results List -->
    <div v-else-if="view === 'results'" class="browser-content">
      <div class="search-header">
        <div class="search-query-display">
          <i class="fas fa-search"></i>
          <span>{{ browserData?.query }}</span>
        </div>
        <div class="results-count">找到 {{ browserData?.results?.length || 0 }} 个结果</div>
      </div>
      <div
        v-for="(result, index) in browserData?.results"
        :key="index"
        class="result-card"
        :style="{ animationDelay: `${index * 0.1}s` }"
        @click="openDetail(index)"
      >
        <div class="result-url">{{ result.url }}</div>
        <div class="result-title">{{ result.title }}</div>
        <div class="result-preview">{{ result.preview }}</div>
      </div>
    </div>

    <!-- Detail Page -->
    <div v-else-if="view === 'detail'" class="browser-content">
      <div class="detail-header" @click="backToResults">
        <i class="fas fa-arrow-left"></i>
        <span>返回搜索结果</span>
      </div>
      <div class="detail-content">
        <div class="detail-title">{{ currentResult?.title }}</div>
        <div class="detail-url">{{ currentResult?.url }}</div>
        <div class="detail-body" v-html="formatContent(currentResult?.content || '')"></div>
      </div>
      <!-- 分享按钮 -->
      <div class="share-float-btn" @click="showShareModal = true">
        <i class="fas fa-share-alt"></i>
      </div>
    </div>

    <!-- 分享联系人选择弹窗 -->
    <div v-if="showShareModal" class="share-modal-overlay" @click.self="showShareModal = false">
      <div class="share-modal">
        <div class="share-modal-header">
          <span>分享给</span>
          <i class="fas fa-times" @click="showShareModal = false"></i>
        </div>
        <div class="share-modal-body">
          <div
            v-for="contact in privateContacts"
            :key="contact.id"
            class="share-contact-item"
            @click="shareToContact(contact)"
          >
            <img :src="contact.avatar" class="share-contact-avatar" />
            <span class="share-contact-name">{{ contact.name }}</span>
          </div>
          <div v-if="privateContacts.length === 0" class="share-empty">
            暂无联系人
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="browser-footer">
      <div class="footer-button" @click="goHome">
        <i class="fas fa-home"></i>
        <span class="footer-text">首页</span>
      </div>
      <div v-if="view === 'detail'" class="footer-button" @click="backToResults">
        <i class="fas fa-list"></i>
        <span class="footer-text">结果</span>
      </div>
      <div class="footer-button">
        <i class="fas fa-bookmark"></i>
        <span class="footer-text">收藏</span>
      </div>
      <div class="footer-button" @click="$emit('back')">
        <i class="fas fa-times"></i>
        <span class="footer-text">关闭</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { browserState, searchBrowserFromAi, type BrowserDataState, abortCurrentRequest, store } from '../../store';
import { parseBasicInfo, type CharacterInfo } from '../../数据';

defineEmits(['back']);

type ViewType = 'home' | 'loading' | 'results' | 'detail' | 'error';

const view = ref<ViewType>('home');
const searchQuery = ref('');
const selectedIndex = ref<number | null>(null);
const errorMessage = ref('');
const showShareModal = ref(false);

const isLoading = computed(() => browserState.isLoading);
const browserData = computed(() => browserState.data);

const currentResult = computed(() =>
  selectedIndex.value !== null && browserData.value?.results
    ? browserData.value.results[selectedIndex.value]
    : null
);

const currentTitle = computed(() => {
  if (view.value === 'home') return '搜索';
  if (view.value === 'loading') return '搜索中...';
  if (view.value === 'error') return '错误';
  if (view.value === 'results') return `${browserData.value?.query || searchQuery.value} - 搜索结果`;
  return currentResult.value?.title || '详情';
});

const currentUrl = computed(() => {
  if (view.value === 'home') return 'search://homepage';
  if (view.value === 'loading') return `search://loading?q=${searchQuery.value}`;
  if (view.value === 'error') return 'search://error';
  if (view.value === 'results') return `search://results?q=${browserData.value?.query || searchQuery.value}`;
  return currentResult.value?.url || '';
});

const goHome = () => {
  view.value = 'home';
  selectedIndex.value = null;
  errorMessage.value = '';
};

// 终止生成并返回主页
const handleAbort = () => {
  abortCurrentRequest();
  view.value = 'home';
  store.activeApp = 'home';
};

const handleSearch = async () => {
  if (!searchQuery.value.trim() || isLoading.value) return;

  view.value = 'loading';
  errorMessage.value = '';

  try {
    await searchBrowserFromAi(searchQuery.value.trim());

    if (browserState.error) {
      errorMessage.value = browserState.error;
      view.value = 'error';
    } else if (browserState.data) {
      view.value = 'results';
    } else {
      errorMessage.value = '未获取到搜索结果';
      view.value = 'error';
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '搜索时发生错误';
    view.value = 'error';
  }
};

const openDetail = (index: number) => {
  selectedIndex.value = index;
  view.value = 'detail';
};

const backToResults = () => {
  view.value = 'results';
  selectedIndex.value = null;
};

const formatContent = (content: string) => {
  return content
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br>');
};

// 获取私聊联系人列表（只包含私聊角色，不含群聊）
const privateContacts = computed(() => {
  const basicInfo = parseBasicInfo();
  return (basicInfo.characters || []).map(char => ({
    id: char.id || `char_${char.name}`,
    name: char.name,
    avatar: char.avatar,
  }));
});

// 分享到指定联系人
const shareToContact = (contact: { id: string; name: string; avatar: string }) => {
  if (!currentResult.value) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 创建链接消息
  const linkMessage = {
    id: Date.now().toString(),
    type: 'browser-share' as const,
    title: currentResult.value.title,
    source: new URL(currentResult.value.url).hostname || 'ABSTRACT',
    description: currentResult.value.preview,
    url: currentResult.value.url,
    time: timeString,
    isMe: true,
    isNewMessage: true,
  };

  // 查找或创建聊天会话
  const chatItem = store.chat.chatList.find(c => c.name === contact.name && c.type === 'single');
  if (chatItem) {
    // 设置活跃会话
    store.chat.activeConversationId = chatItem.id;
  } else {
    // 如果没有找到对应的聊天项，添加一个临时的
    const newChatItem = {
      id: contact.id,
      type: 'single' as const,
      name: contact.name,
      avatar: contact.avatar,
      preview: '[链接]',
      time: timeString,
      unread: 0,
    };
    store.chat.chatList.unshift(newChatItem);
    store.chat.activeConversationId = contact.id;
  }

  // 存储待发送的链接消息到 store（供 ChatDetail 读取）
  store.pendingShareMessage = linkMessage;

  // 关闭弹窗并跳转到聊天界面
  showShareModal.value = false;
  store.activeApp = 'chat';

  console.info('[Browser] 分享链接到:', contact.name, linkMessage);
};
</script>

<style scoped>
.browser-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  position: relative;
}

.browser-header {
  padding: 8px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.browser-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  overflow-x: auto;
}

.browser-tab {
  flex: 0 0 auto;
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px 12px 0 0;
  font-size: 11px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  max-width: 140px;
}

.browser-tab.active {
  background: #fff;
  color: #a8c7fa;
  border-bottom: none;
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #a8c7fa;
  opacity: 0.7;
  flex-shrink: 0;
}

.browser-tab.active .tab-dot {
  opacity: 1;
}

.tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-bar {
  height: 32px;
  background: #f5f5f5;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: #333;
}

.url-bar-icon {
  color: #a8c7fa;
  margin-right: 8px;
}

.url-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Search Homepage */
.home-search-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.abstract-logo {
  font-size: 2rem;
  color: #a8c7fa;
  margin-bottom: 40px;
  display: flex;
}

.abstract-letter {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInLetter 0.7s forwards;
}

@keyframes fadeInLetter {
  to { opacity: 1; transform: translateY(0); }
}

.search-form {
  width: 100%;
  max-width: 280px;
}

.search-input-container {
  position: relative;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 40px 0 15px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  font-size: 14px;
  background: #f5f5f5 !important;
  color: #333 !important;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(168, 199, 250, 0.3);
  background: #fff !important;
}

.search-btn {
  position: absolute;
  right: 5px;
  top: 5px;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #a8c7fa;
}

.search-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Loading State */
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-spinner {
  font-size: 3rem;
  color: #a8c7fa;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.loading-hint {
  font-size: 12px;
  color: #888;
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

.abort-btn:active {
  transform: scale(0.95);
  background: rgba(120, 160, 210, 0.95);
}

.abort-btn i {
  font-size: 12px;
  color: #fff;
}

.abort-btn span {
  color: #fff;
}

/* Error State */
.error-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.error-icon {
  font-size: 3rem;
  color: #ff6b6b;
  margin-bottom: 20px;
}

.error-text {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin-bottom: 20px;
  max-width: 250px;
}

.retry-btn {
  padding: 10px 20px;
  background: #a8c7fa;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-btn:hover {
  background: #8db4f0;
}

/* Content */
.browser-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.browser-content::-webkit-scrollbar {
  width: 3px;
}

.browser-content::-webkit-scrollbar-thumb {
  background: rgba(168, 199, 250, 0.5);
  border-radius: 3px;
}

/* Search Results */
.search-header {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.search-query-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.search-query-display i {
  color: #a8c7fa;
}

.results-count {
  font-size: 12px;
  color: #888;
}

.result-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  animation: fadeIn 0.4s ease forwards;
  opacity: 0;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

.result-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.result-card:active {
  transform: scale(0.98);
}

.result-url {
  font-size: 11px;
  color: #a8c7fa;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a0dab;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-preview {
  font-size: 12px;
  color: #555;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Detail Page */
.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 12px;
  color: #a8c7fa;
  font-size: 13px;
  cursor: pointer;
}

.detail-header:hover {
  color: #8db4f0;
}

.detail-content {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.detail-url {
  font-size: 11px;
  color: #a8c7fa;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-body {
  font-size: 14px;
  color: #444;
  line-height: 1.7;
}

.detail-body :deep(h2) {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-body :deep(h3) {
  font-size: 14px;
  font-weight: 600;
  color: #444;
  margin: 12px 0 6px;
}

.detail-body :deep(strong) {
  color: #333;
}

.detail-body :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.detail-body :deep(li) {
  margin: 4px 0;
}

/* Footer */
.browser-footer {
  padding: 8px;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-around;
  flex-shrink: 0;
}

.footer-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 12px;
}

.footer-button i {
  font-size: 18px;
  color: #a8c7fa;
}

.footer-button:hover {
  background: rgba(168, 199, 250, 0.1);
}

.footer-text {
  font-size: 10px;
  color: #666;
}

/* Share Button */
.share-float-btn {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a8c7fa 0%, #8db4f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(168, 199, 250, 0.4);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 100;
}

.share-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(168, 199, 250, 0.5);
}

.share-float-btn:active {
  transform: scale(0.95);
}

.share-float-btn i {
  font-size: 18px;
  color: #fff;
}

/* Share Modal */
.share-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.share-modal {
  width: 100%;
  max-height: 60%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.share-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.share-modal-header i {
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.share-modal-header i:hover {
  color: #666;
}

.share-modal-body {
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.share-contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.share-contact-item:hover {
  background: rgba(168, 199, 250, 0.1);
}

.share-contact-item:active {
  background: rgba(168, 199, 250, 0.2);
}

.share-contact-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.share-contact-name {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.share-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}
</style>
