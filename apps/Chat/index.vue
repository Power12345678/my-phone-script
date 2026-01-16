<template>
  <div class="app-chat-container">
    <div v-show="!store.chat.activeConversationId" class="chat-list-view" :style="chatListBgStyle">
      <div class="nav-bar" style="display: flex !important; opacity: 1 !important; visibility: visible !important">
        <div class="nav-left" @click="goHome">
          <i class="fas fa-chevron-left"></i>
          <span>返回</span>
        </div>
        <div class="nav-title">消息</div>
        <div class="nav-right">
          <i class="fas fa-ellipsis-h"></i>
        </div>
      </div>
      <div class="chat-list">
        <div v-for="chat in sortedMessages" :key="chat.id" class="chat-list-item" @click="openChat(chat)">
          <img :src="chat.avatar" class="chat-avatar" />
          <div class="chat-info">
            <div class="chat-header">
              <span class="chat-name">{{ chat.name }}</span>
            </div>
            <div class="chat-preview">{{ chat.preview }}</div>
          </div>
          <div class="chat-right">
            <span class="chat-time">{{ chat.time }}</span>
            <div v-if="chat.unread > 0" class="unread-badge">{{ chat.unread }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 根据聊天类型显示不同详情页 -->
    <ChatDetail v-if="store.chat.activeConversationId && activeChatType === 'single' && !store.chat.showProfile" />
    <GroupChatDetail
      v-else-if="store.chat.activeConversationId && activeChatType === 'group' && !store.chat.showProfile"
    />

    <!-- 个人主页 -->
    <Profile
      v-if="store.chat.showProfile && activeChat"
      :user-name="activeChat.name"
      :avatar-url="activeChat.avatar"
      @back="handleProfileBack"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { store, initChatData, getActiveChatType } from '../../store';
import ChatDetail from './ChatDetail.vue';
import GroupChatDetail from './GroupChatDetail.vue';
import Profile from '../Dynamic/Profile.vue';
import type { ChatListItem } from '../../数据/schema';
import _ from 'lodash';

// 获取聊天列表背景
const chatListBgStyle = computed(() => {
  try {
    const charVars = getVariables({ type: 'character' });
    const chatListBg = _.get(charVars, 'phone_data.user.chatListBg');
    if (chatListBg) {
      return { backgroundImage: `url(${chatListBg})` };
    }
  } catch (e) {
    console.warn('[Chat] 获取聊天列表背景失败:', e);
  }
  return {};
});

const goHome = () => {
  store.activeApp = 'home';
};

// 初始化数据
onMounted(() => {
  initChatData();
  console.info('[Chat] Mounted, chat list count:', store.chat.chatList.length);
});

// 监听返回消息列表时自动刷新
watch(
  () => store.chat.activeConversationId,
  (newVal, oldVal) => {
    // 从聊天详情返回到消息列表时刷新
    if (!newVal && oldVal) {
      console.info('[Chat] 返回消息列表，刷新数据');
      initChatData();
    }
  },
);

// 使用 store 中的聊天列表数据
const sortedMessages = computed(() => {
  return [...store.chat.chatList].sort((a, b) => {
    // 1. Unread status (messages with unread count > 0 come first)
    const isUnreadA = a.unread > 0;
    const isUnreadB = b.unread > 0;

    if (isUnreadA && !isUnreadB) return -1;
    if (!isUnreadA && isUnreadB) return 1;

    // 2. Unread count (descending - more unread first)
    if (a.unread !== b.unread) {
      return b.unread - a.unread;
    }

    // 3. Time (descending - newer first)
    return b.time.localeCompare(a.time);
  });
});

// 当前激活的聊天类型
const activeChatType = computed(() => {
  return getActiveChatType();
});

// 当前激活的聊天对象
const activeChat = computed(() => {
  const id = store.chat.activeConversationId;
  if (!id) return null;
  return store.chat.chatList.find(c => c.id === id) || null;
});

const openChat = (chat: ChatListItem) => {
  console.info('[Chat] Open chat:', chat.name, chat.id);
  store.chat.activeConversationId = chat.id;
};

const handleProfileBack = () => {
  store.chat.showProfile = false;
  console.info('[Chat] Profile closed');
};
</script>

<style scoped>
.app-chat-container {
  height: 100%;
  position: relative;
  /* background managed by children or globally */
}

.chat-list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  background-size: cover;
  background-position: center;
  position: relative;
}

/* 白色半透明遮罩 */
.chat-list-view::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  pointer-events: none;
  z-index: 0;
}

.chat-list-view > * {
  position: relative;
  z-index: 1;
}

.nav-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  position: relative;
  z-index: 100; /* Ensure it is on top */
}

.nav-left,
.nav-right {
  width: 60px;
  display: flex;
  align-items: center;
  color: #6c8cd5;
  cursor: pointer;
  font-size: 16px;
}

.nav-left i {
  margin-right: 4px;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
}

.nav-right {
  justify-content: flex-end;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
  padding-top: 0; /* Ensure no extra padding pushes content down unnecessarily */
}

.chat-list::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track {
  background: transparent;
}

.chat-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.chat-list-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.chat-list-item:hover {
  background: rgba(108, 140, 213, 0.1);
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.chat-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.chat-time {
  font-size: 12px;
  color: #999;
}

.chat-preview {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  height: 48px;
  flex-shrink: 0;
  min-width: 50px;
}

.unread-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #6c8cd5;
  color: white;
  font-size: 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
