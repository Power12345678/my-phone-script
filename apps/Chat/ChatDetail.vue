<template>
  <div class="chat-detail" :style="chatInfo?.chatBg ? { backgroundImage: `url(${chatInfo.chatBg})` } : {}">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-left">
        <i class="fas fa-chevron-left" @click="goBack"></i>
        <div v-if="currentChat" class="header-info" @click="showProfileModal = true">
          <img :src="currentChat.avatar" class="header-avatar" />
          <div class="header-text">
            <h2>{{ currentChat.name }}</h2>
            <div class="header-status">
              <template v-if="currentChat.type === 'group'">
                <span>{{ currentChat.members }} 位成员</span>
              </template>
              <template v-else>
                <div class="status-dot"></div>
                <span>在线</span>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="header-icons">
        <div class="header-icon" @click="handleStartCall"><i class="fas fa-phone-alt"></i></div>
        <div class="header-icon" @click="showProfile"><i class="fas fa-user"></i></div>
        <div class="header-icon"><i class="fas fa-ellipsis-v"></i></div>
      </div>
    </div>

    <!-- Profile Modal -->
    <div v-if="showProfileModal && chatInfo" class="profile-modal-overlay" @click.self="showProfileModal = false">
      <div class="profile-modal">
        <div class="profile-header">
          <div class="profile-avatar" :style="{ backgroundImage: `url(${chatInfo.avatar})` }"></div>
          <div class="profile-name">{{ chatInfo.name }}</div>
          <div v-if="chatInfo.emotion" class="profile-emotion">
            <i class="fas fa-heart"></i>
            <span class="profile-emotion-value">{{ chatInfo.emotion }}</span>
          </div>
          <div v-if="chatInfo.location" class="profile-location">
            <i class="fas fa-map-marker-alt"></i>
            <span>{{ chatInfo.location }}</span>
          </div>
        </div>
        <div class="profile-content">
          <div v-if="chatInfo.state" class="profile-section">
            <div class="profile-section-title">当前状态</div>
            <div class="profile-section-content">{{ chatInfo.state }}</div>
          </div>
          <div v-if="chatInfo.thought" class="profile-section">
            <div class="profile-section-title">内心想法</div>
            <div class="profile-section-content">{{ chatInfo.thought }}</div>
          </div>
        </div>
        <div class="profile-buttons">
          <button class="profile-button secondary" @click="showProfileModal = false">关闭</button>
          <button class="profile-button primary" @click="goToProfile">查看个人主页</button>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="chat-messages">
      <MessageItem
        v-for="msg in messages"
        :key="msg.id"
        :ref="el => setMessageItemRef(msg.id, el)"
        :msg="msg"
        :current-chat-avatar="currentChat?.avatar || ''"
        :is-group="currentChat?.type === 'group'"
        :user-avatar="userAvatar"
        :partner-name="currentChat?.name || ''"
        @transfer-click="handleTransferClick"
        @recall="handleRecallMessage"
        @poke="sendPoke"
      />
      <!-- 打字指示器 -->
      <div v-if="isTyping" class="message received typing-message">
        <div class="avatar-wrapper">
          <img :src="typingUser?.avatar || currentChat?.avatar || ''" class="avatar" />
        </div>
        <div class="message-wrapper">
          <div v-if="currentChat?.type === 'group' && typingUser?.name" class="message-sender-name">
            {{ typingUser.name }}
          </div>
          <div class="message-content typing-content">
            <div class="typing-indicator">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Function Bar -->
    <div v-if="showFunctionBar" class="function-bar">
      <div class="function-item" :class="{ active: activeFunction === 'sticker' }" @click="toggleFunction('sticker')">
        <i class="fas fa-face-grin-squint-tears"></i>
        <span>表情包</span>
      </div>
      <div class="function-item" :class="{ active: activeFunction === 'emoji' }" @click="toggleFunction('emoji')">
        <i class="fas fa-face-smile"></i>
        <span>Emoji</span>
      </div>
      <div class="function-item" :class="{ active: activeFunction === 'voice' }" @click="toggleFunction('voice')">
        <i class="fas fa-microphone"></i>
        <span>语音</span>
      </div>
      <div class="function-item" :class="{ active: activeFunction === 'image' }" @click="toggleFunction('image')">
        <i class="fas fa-image"></i>
        <span>图片</span>
      </div>
      <div class="function-item" :class="{ active: activeFunction === 'file' }" @click="toggleFunction('file')">
        <i class="fas fa-file"></i>
        <span>文件</span>
      </div>
      <div class="function-item" :class="{ active: activeFunction === 'transfer' }" @click="toggleFunction('transfer')">
        <i class="fas fa-yen-sign"></i>
        <span>转账</span>
      </div>
    </div>

    <!-- Sticker Picker -->
    <div v-if="showStickerPicker" class="sticker-picker">
      <div class="sticker-grid">
        <div
          v-for="sticker in stickerList"
          :key="sticker.name"
          class="sticker-item"
          @click="sendSticker(sticker.name)"
        >
          <img :src="sticker.url" :alt="sticker.name" :title="sticker.name" />
        </div>
      </div>
    </div>

    <!-- Emoji Picker -->
    <div v-if="showEmojiPicker" class="emoji-picker-container">
      <div class="emoji-grid">
        <span
          v-for="emoji in emojiList"
          :key="emoji"
          class="emoji-item"
          @click="insertEmoji(emoji)"
        >{{ emoji }}</span>
      </div>
    </div>

    <!-- Voice Input Panel -->
    <div v-if="showVoiceInput" class="extend-input-panel">
      <div class="extend-input-header">
        <i class="fas fa-microphone"></i>
        <span>语音转文字</span>
      </div>
      <div class="extend-input-body">
        <textarea
          v-model="voiceInputText"
          class="extend-textarea"
          placeholder="输入语音内容..."
          rows="1"
        ></textarea>
      </div>
      <div class="extend-input-footer">
        <button class="extend-send-btn" @click="sendVoiceMessage">发送</button>
      </div>
    </div>

    <!-- Image Input Panel -->
    <div v-if="showImageInput" class="extend-input-panel">
      <div class="extend-input-header">
        <i class="fas fa-image"></i>
        <span>图片描述</span>
      </div>
      <div class="extend-input-body">
        <textarea
          v-model="imageInputText"
          class="extend-textarea"
          placeholder="描述图片内容..."
          rows="1"
        ></textarea>
      </div>
      <div class="extend-input-footer">
        <button class="extend-send-btn" @click="sendImageMessage">发送</button>
      </div>
    </div>

    <!-- Transfer Input Panel -->
    <div v-if="showTransferInput" class="extend-input-panel transfer-panel">
      <div class="extend-input-header transfer-header">
        <i class="fas fa-yen-sign"></i>
        <span>转账</span>
      </div>
      <div class="transfer-input-group">
        <div class="transfer-field">
          <label class="transfer-label">金额</label>
          <div class="transfer-amount-wrapper">
            <span class="currency-symbol">¥</span>
            <input
              v-model="transferAmount"
              type="number"
              class="transfer-amount-input"
              placeholder="0.00"
            />
          </div>
        </div>
        <div class="transfer-field">
          <label class="transfer-label">备注</label>
          <input
            v-model="transferNote"
            type="text"
            class="transfer-note-input"
            placeholder="添加转账备注（可选）"
          />
        </div>
      </div>
      <div class="extend-input-footer">
        <button class="extend-send-btn transfer-send-btn" @click="sendTransferMessage">转账</button>
      </div>
    </div>

    <!-- File Input Panel -->
    <div v-if="showFileInput" class="extend-input-panel file-panel">
      <div class="extend-input-header file-header">
        <i class="fas fa-file"></i>
        <span>发送文件</span>
      </div>
      <div class="file-input-group">
        <div class="file-field">
          <label class="file-label">文件名</label>
          <input
            v-model="fileInputName"
            type="text"
            class="file-name-input"
            placeholder="例如：报告.pdf"
          />
        </div>
        <div class="file-field">
          <label class="file-label">文件大小</label>
          <input
            v-model="fileInputSize"
            type="text"
            class="file-size-input"
            placeholder="例如：2.5MB"
          />
        </div>
        <div class="file-field">
          <label class="file-label">文件简介</label>
          <input
            v-model="fileInputDesc"
            type="text"
            class="file-desc-input"
            placeholder="简单描述文件内容（可选）"
          />
        </div>
      </div>
      <div class="extend-input-footer">
        <button class="extend-send-btn file-send-btn" @click="sendFileMessage">发送</button>
      </div>
    </div>

    <!-- Input Area -->
    <div class="chat-input">
      <button class="more-btn" :class="{ active: showFunctionBar }" @click="toggleFunctionBar">
        <i class="fas fa-plus"></i>
      </button>
      <input
        v-model="newMessage"
        type="text"
        class="input-field"
        placeholder="发送消息..."
        @keyup.enter="sendMessage"
      />
      <button class="action-btn send-btn" @click="sendMessage">
        <i class="fas fa-paper-plane"></i>
      </button>
      <button class="action-btn refresh-btn" @click="handleRefresh">
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>

    <!-- Voice Call Overlay -->
    <VoiceCall
      v-if="store.call.active && store.call.data"
      :call-data="store.call.data"
      :is-connecting="store.call.isConnecting"
      :is-waiting-reply="store.call.isWaitingReply"
      @end="handleCallEnd"
      @reply="handleCallReply"
    />

    <!-- Transfer Modal -->
    <div v-if="showTransferModal" class="transfer-modal-overlay" @click.self="closeTransferModal">
      <div class="transfer-modal">
        <div class="transfer-modal-header">
          <div class="transfer-modal-icon">
            <i class="fas fa-yen-sign"></i>
          </div>
          <span>转账</span>
        </div>
        <div class="transfer-modal-amount">￥{{ currentTransferMsg?.amount }}</div>
        <div v-if="currentTransferMsg?.note" class="transfer-modal-note">
          <span class="note-label">备注：</span>
          <span class="note-content">{{ currentTransferMsg.note }}</span>
        </div>
        <div class="transfer-modal-buttons">
          <button class="transfer-btn reject" @click="handleTransferReject">拒绝</button>
          <button class="transfer-btn accept" @click="handleTransferAccept">收款</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import _ from 'lodash';
import YAML from 'yaml';
import { store, startCall, endCall, replyInCall } from '../../store';
import { getPrivateChatHistoryFromTavern, convertYamlMessage, findCharacterByName, parseBasicInfo, type FloorChatData, type YamlPrivateChatInfo, type YamlMessage } from '../../数据';
import { fetchPrivateChatDataFromAi } from '../../预设/aiService';
import { getDisplaySettings } from '../Settings/composables/useDisplaySettings';
import MessageItem from './components/MessageItem.vue';
import VoiceCall from './VoiceCall.vue';
import stickersJson from '../../数据/表情包.json';

// Define Message Interface
export interface Message {
  id: string;
  type:
    | 'text'
    | 'image'
    | 'voice'
    | 'transfer'
    | 'location'
    | 'news'
    | 'call-missed'
    | 'call-ended'
    | 'recalled'
    | 'browser-share'
    | 'file'
    | 'text-image'
    | 'sticker'
    | 'transfer-accepted'
    | 'transfer-rejected'
    | 'date-separator'
    | 'poke';
  content?: string;
  time: string;
  isMe: boolean;
  sender?: {
    name: string;
    avatar: string;
  };

  // Specific fields
  avatar?: string;

  // Voice
  audioFile?: string;
  duration?: string;
  voiceText?: string;

  // Transfer
  amount?: string;
  note?: string;
  transferTime?: string;

  // Location
  partnerLocation?: string;
  userLocation?: string;
  distance?: string;

  // News / Browser Share
  title?: string;
  source?: string;
  publishDate?: string;
  views?: string;
  description?: string;
  url?: string;
  keyData?: string;
  likes?: string;
  comments?: string;

  // File
  filename?: string;
  filesize?: string;

  // Recalled
  originalContent?: string;

  // 标记是否为本次会话新发送的消息
  isNewMessage?: boolean;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  type: 'single' | 'group';
  members?: number;
}

const emit = defineEmits(['back']);

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

// 加载用户数据 - 优先从聊天变量读取
const basicInfo = parseBasicInfo();
const chatUser = loadUserFromChat();
const userAvatar = computed(() => chatUser?.avatar || basicInfo.user?.avatar || '');

const goBack = () => {
  store.chat.activeConversationId = null;
  emit('back');
};

// 从 chatList 获取当前聊天基本信息
const currentChat = computed<Chat | null>(() => {
  const id = store.chat.activeConversationId;
  if (!id) return null;

  const chatItem = store.chat.chatList.find(c => c.id === id);
  if (!chatItem || chatItem.type !== 'single') return null;

  return {
    id: chatItem.id,
    name: chatItem.name,
    avatar: chatItem.avatar,
    type: 'single',
  };
});

const messages = ref<Message[]>([]);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isTyping = ref(false);
const typingUser = ref<{ name: string; avatar: string } | null>(null);
const showProfileModal = ref(false);

// 最新楼层的元数据（用于弹窗显示）
const latestFloorInfo = ref<YamlPrivateChatInfo | null>(null);

// 功能栏相关
const showFunctionBar = ref(false);
const showStickerPicker = ref(false);
const showEmojiPicker = ref(false);
const showVoiceInput = ref(false);
const showImageInput = ref(false);
const showTransferInput = ref(false);
const showFileInput = ref(false);
const voiceInputText = ref('');
const imageInputText = ref('');
const transferAmount = ref('');
const transferNote = ref('');
const fileInputName = ref('');
const fileInputSize = ref('');
const fileInputDesc = ref('');
const activeFunction = ref<string | null>(null);

// Emoji 列表
const emojiList = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
  '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
  '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠',
  '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁',
  '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
  '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
  '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
  '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘',
];

// 表情包列表
interface Sticker {
  name: string;
  url: string;
}
const stickerList = ref<Sticker[]>(stickersJson as Sticker[]);

// 获取当前聊天的详细信息（优先使用最新楼层元数据）
const chatInfo = computed(() => {
  if (!currentChat.value) return null;

  const character = findCharacterByName(currentChat.value.name);
  const floorInfo = latestFloorInfo.value;

  return {
    name: floorInfo?.name || character?.name || currentChat.value.name,
    avatar: character?.avatar || currentChat.value.avatar,
    chatBg: character?.chatBg,
    emotion: floorInfo?.emotion || character?.emotion,
    location: floorInfo?.location || character?.location,
    state: floorInfo?.state || character?.state,
    thought: floorInfo?.thought || character?.thought,
  };
});

// 滚动到底部 - 必须在 watch 之前定义
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 监听会话切换，从酒馆历史加载消息
watch(
  () => store.chat.activeConversationId,
  newId => {
    if (newId && currentChat.value) {
      const chatName = currentChat.value.name;
      const floors = getPrivateChatHistoryFromTavern(chatName, 100);

      if (floors.length > 0) {
        // 存储最新楼层的元数据
        latestFloorInfo.value = floors[floors.length - 1].info;

        // 构建消息列表，在每个楼层开头添加日期分隔符
        const allMessages: Message[] = [];
        let msgIndex = 0;

        for (const floor of floors) {
          // 添加日期分隔符
          if (floor.info.date) {
            allMessages.push({
              id: `date-${floor.messageId}`,
              type: 'date-separator',
              content: floor.info.date,
              time: floor.info.time || '',
              isMe: false,
            });
          }

          // 添加该楼层的消息
          for (const msg of floor.messages) {
            allMessages.push(convertYamlMessage(msg, msgIndex++) as Message);
          }
        }

        messages.value = allMessages;
        console.info('[ChatDetail] Loaded', floors.length, 'floors,', allMessages.length, 'messages for', chatName);
      } else {
        messages.value = [];
        latestFloorInfo.value = null;
        console.info('[ChatDetail] No messages found for', chatName);
      }

      // 检查是否有待发送的分享消息
      if (store.pendingShareMessage) {
        messages.value.push(store.pendingShareMessage as Message);
        console.info('[ChatDetail] Added pending share message:', store.pendingShareMessage);
        store.pendingShareMessage = null;
      }
    } else {
      messages.value = [];
      latestFloorInfo.value = null;
    }
    scrollToBottom();
  },
  { immediate: true },
);

const sendMessage = () => {
  if (!newMessage.value.trim()) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const messageContent = newMessage.value;

  messages.value.push({
    id: Date.now().toString(),
    content: messageContent,
    time: timeString,
    isMe: true,
    type: 'text',
    isNewMessage: true,
  });

  newMessage.value = '';
  scrollToBottom();

  // 检查是否开启了自动推进正文功能
  const displaySettings = getDisplaySettings();
  if (displaySettings.autoTriggerStory && currentChat.value) {
    const targetName = currentChat.value.name;
    const sendText = `给${targetName}发送消息:${messageContent}`;
    // 使用 SillyTavern 的斜杠命令推进正文
    triggerSlash(`/send ${sendText}|/trigger`);
    console.info('[ChatDetail] 自动推进正文:', sendText);
  }
};

// 通话功能
const handleStartCall = async () => {
  const result = await startCall();
  if (result) {
    console.info('[ChatDetail] Call started');
  } else {
    console.warn('[ChatDetail] Failed to start call');
  }
};

const handleCallEnd = (duration: string) => {
  endCall();

  // 添加通话结束消息
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'call-ended',
    time: timeString,
    isMe: false,
    duration: duration,
  } as Message);

  scrollToBottom();
  console.info('[ChatDetail] Call ended, duration:', duration);
};

const handleCallReply = async (message: string) => {
  console.info('[ChatDetail] User said during call:', message);
  await replyInCall(message);
};

// 转账弹窗相关
const showTransferModal = ref(false);
const currentTransferMsg = ref<Message | null>(null);
const messageItemRefs = new Map<string, any>();

const setMessageItemRef = (id: string, el: any) => {
  if (el) {
    messageItemRefs.set(id, el);
  }
};

const handleTransferClick = (msg: Message) => {
  currentTransferMsg.value = msg;
  showTransferModal.value = true;
};

const closeTransferModal = () => {
  showTransferModal.value = false;
};

const handleTransferAccept = () => {
  if (!currentTransferMsg.value) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'transfer-accepted',
    time: timeString,
    isMe: true,
    isNewMessage: true,
    amount: currentTransferMsg.value.amount,
  } as Message);

  // 标记消息已处理
  const ref = messageItemRefs.get(currentTransferMsg.value.id);
  if (ref?.markProcessed) {
    ref.markProcessed();
  }

  closeTransferModal();
  scrollToBottom();
  console.info('[ChatDetail] Transfer accepted:', currentTransferMsg.value.amount);
};

const handleTransferReject = () => {
  if (!currentTransferMsg.value) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'transfer-rejected',
    time: timeString,
    isMe: true,
    isNewMessage: true,
    amount: currentTransferMsg.value.amount,
  } as Message);

  // 标记消息已处理
  const ref = messageItemRefs.get(currentTransferMsg.value.id);
  if (ref?.markProcessed) {
    ref.markProcessed();
  }

  closeTransferModal();
  scrollToBottom();
  console.info('[ChatDetail] Transfer rejected:', currentTransferMsg.value.amount);
};

// 显示个人主页
const showProfile = () => {
  store.chat.showProfile = true;
  console.info('[ChatDetail] Show profile page');
};

// 从弹窗跳转到个人主页
const goToProfile = () => {
  showProfileModal.value = false;
  store.chat.showProfile = true;
  console.info('[ChatDetail] Navigate to profile page from modal');
};

// 功能栏切换
const toggleFunctionBar = () => {
  showFunctionBar.value = !showFunctionBar.value;
  if (!showFunctionBar.value) {
    showStickerPicker.value = false;
    showEmojiPicker.value = false;
    showVoiceInput.value = false;
    showImageInput.value = false;
    showTransferInput.value = false;
    activeFunction.value = null;
  }
};

// 刷新按钮 - 收集用户消息、调用AI、保存到楼层
const isRefreshing = ref(false);

const handleRefresh = async () => {
  if (!currentChat.value) {
    toastr.warning('请先选择聊天对象');
    return;
  }

  if (isRefreshing.value) {
    toastr.info('正在生成中，请稍候...');
    return;
  }

  const targetName = currentChat.value.name;
  console.info('[ChatDetail] 开始刷新，目标:', targetName);

  // 1. 收集本次会话用户发送的消息（isNewMessage: true 且 isMe: true）
  const newUserMessages = messages.value.filter(
    msg => msg.isNewMessage && msg.isMe && msg.type !== 'date-separator',
  );

  // 2. 格式化用户消息为提示词
  const formattedUserMessages = newUserMessages.map(msg => {
    return formatMessageForPrompt(msg);
  });

  console.info('[ChatDetail] 用户消息:', formattedUserMessages);

  // 3. 调用 AI
  isRefreshing.value = true;
  isTyping.value = true;

  try {
    const result = await fetchPrivateChatDataFromAi(targetName, formattedUserMessages);

    if (!result.success) {
      toastr.error(result.error || 'AI 生成失败');
      return;
    }

    const aiData = result.data;
    console.info('[ChatDetail] AI 返回数据:', aiData);

    // 4. 解析 AI 返回的消息
    const aiMessages: YamlMessage[] = aiData.messages || [];
    if (aiMessages.length === 0) {
      toastr.warning('AI 未返回有效消息');
      return;
    }

    // 5. 构建要保存的完整数据（包含用户消息和AI回复）
    const allMessagesToSave: YamlMessage[] = [];

    // 添加用户发送的消息
    for (const msg of newUserMessages) {
      allMessagesToSave.push(convertMessageToYaml(msg));
    }

    // 添加 AI 回复的消息
    allMessagesToSave.push(...aiMessages);

    // 6. 构建保存到楼层的内容（使用AI返回的时间，而非系统时间）
    const dateStr = aiData.date || (() => {
      const now = new Date();
      return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    })();
    const timeStr = aiData.time || (() => {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    })();

    // 更新用户消息的时间为AI返回的时间
    for (const msg of allMessagesToSave) {
      if (msg.me) {
        msg.time = timeStr;
      }
    }

    const chatHistoryData = {
      name: aiData.name || targetName,
      date: dateStr,
      time: timeStr,
      emotion: aiData.emotion,
      location: aiData.location,
      state: aiData.state,
      thought: aiData.thought,
      messages: allMessagesToSave,
    };

    const yamlContent = YAML.stringify(chatHistoryData);
    const floorContent = `<chat_history target="${targetName}" type="private">\n${yamlContent}</chat_history>`;

    // 7. 保存到酒馆楼层（检查是否需要追加到最后楼层）
    const displaySettings = getDisplaySettings();
    if (displaySettings.chatAppendToLastMessage) {
      const lastMessageId = getLastMessageId();
      if (lastMessageId >= 0) {
        const existingMessages = getChatMessages(String(lastMessageId));
        if (existingMessages && existingMessages.length > 0) {
          const originalMessage = existingMessages[0].message;
          const newMessage = originalMessage + '\n\n' + floorContent;
          await setChatMessages([{ message_id: lastMessageId, message: newMessage }]);
          console.info('[ChatDetail] 已追加到楼层', lastMessageId);
        }
      }
    } else {
      await createChatMessages([
        {
          role: 'assistant',
          message: floorContent,
          is_hidden: false,
        },
      ]);
      console.info('[ChatDetail] 已保存到新楼层');
    }

    // 8. 从楼层重新读取数据刷新界面
    const floors = getPrivateChatHistoryFromTavern(targetName, 100);

    if (floors.length > 0) {
      // 更新最新楼层元数据
      latestFloorInfo.value = floors[floors.length - 1].info;

      // 重建消息列表
      const allMessages: Message[] = [];
      let msgIndex = 0;

      for (const floor of floors) {
        // 添加日期分隔符
        if (floor.info.date) {
          allMessages.push({
            id: `date-${floor.messageId}`,
            type: 'date-separator',
            content: floor.info.date,
            time: floor.info.time || '',
            isMe: false,
          });
        }

        // 添加该楼层的消息
        for (const msg of floor.messages) {
          allMessages.push(convertYamlMessage(msg, msgIndex++) as Message);
        }
      }

      messages.value = allMessages;
      console.info('[ChatDetail] 重新加载了', floors.length, '层消息');
    }

    scrollToBottom();
    toastr.success('生成完成');
  } catch (e) {
    console.error('[ChatDetail] 刷新失败:', e);
    toastr.error('生成失败: ' + (e instanceof Error ? e.message : '未知错误'));
  } finally {
    isRefreshing.value = false;
    isTyping.value = false;
  }
};

// 撤回消息
const handleRecallMessage = (msgId: string) => {
  const index = messages.value.findIndex(m => m.id === msgId);
  if (index !== -1) {
    messages.value.splice(index, 1);
    console.info('[ChatDetail] Message recalled:', msgId);
  }
};

// 切换功能
const toggleFunction = (func: string) => {
  // 先关闭所有面板
  const closeAll = () => {
    showStickerPicker.value = false;
    showEmojiPicker.value = false;
    showVoiceInput.value = false;
    showImageInput.value = false;
    showTransferInput.value = false;
    showFileInput.value = false;
  };

  if (func === 'sticker') {
    const isActive = activeFunction.value === 'sticker';
    closeAll();
    showStickerPicker.value = !isActive;
    activeFunction.value = !isActive ? 'sticker' : null;
  } else if (func === 'emoji') {
    const isActive = activeFunction.value === 'emoji';
    closeAll();
    showEmojiPicker.value = !isActive;
    activeFunction.value = !isActive ? 'emoji' : null;
  } else if (func === 'voice') {
    const isActive = activeFunction.value === 'voice';
    closeAll();
    showVoiceInput.value = !isActive;
    activeFunction.value = !isActive ? 'voice' : null;
    if (!isActive) voiceInputText.value = '';
  } else if (func === 'image') {
    const isActive = activeFunction.value === 'image';
    closeAll();
    showImageInput.value = !isActive;
    activeFunction.value = !isActive ? 'image' : null;
    if (!isActive) imageInputText.value = '';
  } else if (func === 'transfer') {
    const isActive = activeFunction.value === 'transfer';
    closeAll();
    showTransferInput.value = !isActive;
    activeFunction.value = !isActive ? 'transfer' : null;
    if (!isActive) {
      transferAmount.value = '';
      transferNote.value = '';
    }
  } else if (func === 'file') {
    const isActive = activeFunction.value === 'file';
    closeAll();
    showFileInput.value = !isActive;
    activeFunction.value = !isActive ? 'file' : null;
    if (!isActive) {
      fileInputName.value = '';
      fileInputSize.value = '';
      fileInputDesc.value = '';
    }
  } else {
    closeAll();
    activeFunction.value = null;
    console.info('[ChatDetail] Function not implemented:', func);
  }
};

// 格式化消息为提示词（用于发送给AI）
const formatMessageForPrompt = (msg: Message): string => {
  switch (msg.type) {
    case 'text':
      return `[文字] ${msg.content}`;
    case 'voice':
      return `[语音] ${msg.voiceText || msg.content}`;
    case 'image':
      return `[图片] ${msg.content}`;
    case 'text-image':
      return `[图片描述] ${msg.content}`;
    case 'sticker':
      return `[表情包] ${msg.content}`;
    case 'transfer':
      return `[转账] ¥${msg.amount}${msg.note ? ` 备注: ${msg.note}` : ''}`;
    case 'transfer-accepted':
      return `[系统]我方接受转账`;
    case 'transfer-rejected':
      return `[系统]我方拒绝转账`;
    case 'file':
      return `[文件] ${msg.filename}${msg.description ? ` - ${msg.description}` : ''}`;
    case 'browser-share':
      return `[链接] ${msg.title}${msg.url ? ` - ${msg.url}` : ''}`;
    case 'call-ended':
      return `[通话结束] 时长: ${msg.duration}`;
    case 'poke':
      return `[系统]用户对${currentChat.value?.name || '对方'}发送戳一戳`;
    default:
      return msg.content || '';
  }
};

// 将 Message 转换为 YamlMessage 格式（用于保存到楼层）
const convertMessageToYaml = (msg: Message): YamlMessage => {
  const base: YamlMessage = {
    t: 'text',
    time: msg.time,
    me: msg.isMe,
  };

  switch (msg.type) {
    case 'text':
      return { ...base, t: 'text', c: msg.content };
    case 'voice':
      return { ...base, t: 'voice', c: msg.voiceText || msg.content };
    case 'image':
      return { ...base, t: 'image', c: msg.content };
    case 'text-image':
      return { ...base, t: 'imgdesc', c: msg.content };
    case 'sticker':
      return { ...base, t: 'sticker', c: msg.content };
    case 'transfer':
      return { ...base, t: 'transfer', amt: parseFloat(msg.amount || '0'), note: msg.note };
    case 'transfer-accepted':
      return { ...base, t: 'transfer-accepted', amt: parseFloat(msg.amount || '0') };
    case 'transfer-rejected':
      return { ...base, t: 'transfer-rejected', amt: parseFloat(msg.amount || '0') };
    case 'call-ended':
      return { ...base, t: 'call-ended', duration: msg.duration };
    case 'file':
      return { ...base, t: 'file', name: msg.filename, size: msg.filesize, desc: msg.description };
    case 'browser-share':
      return { ...base, t: 'link', title: msg.title, source: msg.source, preview: msg.description, url: msg.url };
    case 'poke':
      return { ...base, t: 'poke' };
    default:
      return { ...base, t: 'text', c: msg.content };
  }
};

// 插入 emoji 到输入框
const insertEmoji = (emoji: string) => {
  newMessage.value += emoji;
};

// 发送语音消息
const sendVoiceMessage = () => {
  if (!voiceInputText.value.trim()) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'voice',
    content: voiceInputText.value,
    voiceText: voiceInputText.value,
    time: timeString,
    isMe: true,
    isNewMessage: true,
  });

  voiceInputText.value = '';
  scrollToBottom();
};

// 发送图片描述消息
const sendImageMessage = () => {
  if (!imageInputText.value.trim()) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'text-image',
    content: imageInputText.value,
    time: timeString,
    isMe: true,
    isNewMessage: true,
  });

  imageInputText.value = '';
  scrollToBottom();
};

// 发送转账消息
const sendTransferMessage = () => {
  if (!transferAmount.value) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'transfer',
    amount: String(transferAmount.value),
    note: transferNote.value || undefined,
    time: timeString,
    isMe: true,
    isNewMessage: true,
  });

  transferAmount.value = '';
  transferNote.value = '';
  showTransferInput.value = false;
  activeFunction.value = null;
  scrollToBottom();
};

// 发送文件消息
const sendFileMessage = () => {
  if (!fileInputName.value.trim()) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'file',
    filename: fileInputName.value.trim(),
    filesize: fileInputSize.value.trim() || '未知大小',
    description: fileInputDesc.value.trim() || undefined,
    time: timeString,
    isMe: true,
    isNewMessage: true,
  });

  fileInputName.value = '';
  fileInputSize.value = '';
  fileInputDesc.value = '';
  showFileInput.value = false;
  activeFunction.value = null;
  scrollToBottom();
};

// 发送表情包
const sendSticker = (stickerName: string) => {
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'sticker',
    content: stickerName,
    time: timeString,
    isMe: true,
    isNewMessage: true,
  });

  // 关闭表情包选择器
  showStickerPicker.value = false;
  activeFunction.value = null;
  scrollToBottom();
};

// 发送戳一戳
const sendPoke = () => {
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  messages.value.push({
    id: Date.now().toString(),
    type: 'poke',
    content: '',
    time: timeString,
    isMe: true,
    isNewMessage: true,
  });

  scrollToBottom();
};

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.chat-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  background-size: cover;
  background-position: center;
  position: relative;
  z-index: 101; /* Above list */
}

/* Header */
.chat-header {
  height: 56px;
  background: rgba(255, 255, 255, 0.95);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex: 1;
}

.header-left i {
  color: #6c8cd5;
  font-size: 20px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-text h2 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  line-height: 1.2;
  margin-bottom: 2px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #4caf50;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #4caf50;
  border-radius: 50%;
}

.header-icons {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 2;
}

.header-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  z-index: 2;
}

.header-icon i {
  color: #666;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s;
}

.header-icon i:hover {
  color: #6c8cd5;
}

/* Messages Container */
.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

/* Input Area */
.chat-input {
  height: 52px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
  position: relative;
}

.more-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: #666;
  flex-shrink: 0;
}

.more-btn:hover {
  background: #e0e0e0;
}

.more-btn.active {
  background: #6c8cd5;
  color: white;
  transform: rotate(45deg);
}

.input-field {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  height: 36px !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  border-radius: 18px !important;
  background: #fff !important;
  padding: 0 16px !important;
  outline: none !important;
  font-size: 14px !important;
  color: #333 !important;
  transition: all 0.2s;
  margin-right: 8px;
}

.input-field:focus {
  border-color: #6c8cd5 !important;
  box-shadow: 0 0 0 2px rgba(108, 140, 213, 0.2) !important;
}

.input-field::placeholder {
  color: #999 !important;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn {
  background: #6c8cd5;
  color: white;
}

.send-btn:hover {
  background: #4a6fbf;
}

.refresh-btn {
  background: #f5f5f5;
  color: #666;
}

.refresh-btn:hover {
  background: #e0e0e0;
}

/* 打字指示器样式 */
.typing-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: message-pop 0.3s ease-out;
  margin-bottom: 8px;
}

.typing-message .avatar-wrapper {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
  overflow: hidden;
  margin-top: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid #fff;
  flex-shrink: 0;
}

.typing-message .avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.typing-message .message-wrapper {
  display: flex;
  flex-direction: column;
}

.typing-message .message-sender-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
  font-weight: 500;
}

.typing-content {
  padding: 10px 14px;
  background: #fff;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.typing-indicator {
  display: inline-flex;
  gap: 2px;
  padding: 2px 4px;
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

/* Profile Modal Styles */
.profile-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-modal {
  width: 85%;
  max-width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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

.profile-header {
  padding: 20px;
  text-align: center;
  position: relative;
  background: linear-gradient(to right, #f3f9ff, #e6f4ff);
  border-bottom: 1px solid #f0f0f0;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 12px;
  border: 3px solid white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-size: cover;
  background-position: center;
}

.profile-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.profile-emotion {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 4px 12px;
  border-radius: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.profile-emotion i {
  color: #ff6b9d;
  font-size: 12px;
}

.profile-emotion-value {
  color: #ff6b9d;
  font-weight: 600;
}

.profile-location {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}

.profile-location i {
  margin-right: 5px;
}

.profile-content {
  padding: 15px 20px;
  background-color: white;
}

.profile-section {
  margin-bottom: 15px;
}

.profile-section:last-child {
  margin-bottom: 0;
}

.profile-section-title {
  font-size: 13px;
  color: #999;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
}

.profile-section-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 14px;
  background-color: #4285f4;
  margin-right: 6px;
  border-radius: 2px;
}

.profile-section-content {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  max-height: 80px;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.profile-section-content::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

.profile-buttons {
  display: flex;
  border-top: 1px solid #f0f0f0;
}

.profile-button {
  flex: 1;
  padding: 12px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  background: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.profile-button::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.05);
  opacity: 0;
  transition: opacity 0.2s;
}

.profile-button:active::after {
  opacity: 1;
}

.profile-button:hover {
  background: #f9f9f9;
}

.profile-button.primary {
  color: #4285f4;
}

.profile-button.primary:hover {
  background-color: #f3f9ff;
}

.profile-button.secondary {
  color: #757575;
  border-right: 1px solid #f0f0f0;
}

.profile-button.secondary:hover {
  background-color: #f5f5f5;
}

/* Voice Call Overlay */
.voice-call {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 300;
}

/* Function Bar */
.function-bar {
  display: flex;
  justify-content: space-around;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
}

.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 52px;
  height: 52px;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.function-item:hover {
  background: rgba(108, 140, 213, 0.1);
}

.function-item.active {
  background: rgba(108, 140, 213, 0.2);
  color: #6c8cd5;
}

.function-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.function-item i {
  font-size: 18px;
  color: #666;
}

.function-item.active i {
  color: #6c8cd5;
}

.function-item span {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
}

.function-item.active span {
  color: #6c8cd5;
}

/* Sticker Picker */
.sticker-picker {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 8px;
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.sticker-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sticker-item:hover {
  transform: scale(1.1);
}

.sticker-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Extend Input Panel (Voice/Image) */
.extend-input-panel {
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 10px 16px;
}

.extend-input-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #6c8cd5;
  font-size: 13px;
  font-weight: 500;
}

.extend-input-header i {
  font-size: 14px;
}

.extend-input-body {
  display: flex;
}

.extend-textarea {
  flex: 1;
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  resize: none;
  outline: none !important;
  transition: border-color 0.2s;
  font-family: inherit;
  background: #f8f9fa !important;
  color: #333 !important;
  min-height: 32px;
}

.extend-textarea:focus {
  border-color: #6c8cd5 !important;
  background: #fff !important;
}

.extend-textarea::placeholder {
  color: #999 !important;
}

.extend-input-footer {
  margin-top: 8px;
}

.extend-send-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #6c8cd5 0%, #4a6fbf 100%);
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.extend-send-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(108, 140, 213, 0.4);
}

.extend-send-btn:active {
  transform: scale(0.98);
}

/* Emoji Picker */
.emoji-picker-container {
  max-height: 250px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 8px;
}

.emoji-item {
  font-size: 22px;
  padding: 6px;
  text-align: center;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
  user-select: none;
}

.emoji-item:hover {
  background: rgba(108, 140, 213, 0.15);
  transform: scale(1.15);
}

.emoji-item:active {
  transform: scale(0.95);
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
  z-index: 500;
}

.transfer-modal {
  width: 260px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  animation: modal-pop 0.25s ease-out;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
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
  padding: 20px 16px 12px;
  background: linear-gradient(135deg, #fdf6ec 0%, #fef9f3 100%);
  color: #c8a060;
  font-size: 14px;
  font-weight: 500;
}

.transfer-modal-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #e6a23c 0%, #d4912a 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.transfer-modal-amount {
  padding: 12px 16px;
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  color: #c8a060;
}

.transfer-modal-note {
  padding: 0 16px 16px;
  text-align: center;
  font-size: 13px;
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
  padding: 12px;
  border: none;
  font-size: 14px;
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

/* Transfer Input Panel */
.transfer-panel {
  background: linear-gradient(135deg, #fffbf5 0%, #fff9f0 100%);
  border-top: 1px solid rgba(230, 162, 60, 0.15);
}

.transfer-header {
  color: #c8a060;
}

.transfer-header i {
  color: #e6a23c;
}

.transfer-input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transfer-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.transfer-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.transfer-amount-wrapper {
  display: flex;
  align-items: center;
  background: #fff !important;
  border: 1px solid rgba(230, 162, 60, 0.3) !important;
  border-radius: 8px !important;
  padding: 0 12px !important;
  transition: all 0.2s;
}

.transfer-amount-wrapper:focus-within {
  border-color: #e6a23c !important;
  box-shadow: 0 0 0 2px rgba(230, 162, 60, 0.15) !important;
}

.currency-symbol {
  font-size: 18px;
  font-weight: 600;
  color: #c8a060;
  margin-right: 4px;
}

.transfer-amount-input {
  flex: 1;
  border: none !important;
  outline: none !important;
  font-size: 20px !important;
  font-weight: 600;
  color: #c8a060 !important;
  padding: 8px 0 !important;
  background: transparent !important;
}

.transfer-amount-input::placeholder {
  color: #ddd !important;
  font-weight: 400;
}

.transfer-amount-input::-webkit-outer-spin-button,
.transfer-amount-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.transfer-note-input {
  border: 1px solid #e8e8e8 !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  outline: none !important;
  background: #fff !important;
  color: #333 !important;
  transition: all 0.2s;
}

.transfer-note-input:focus {
  border-color: #e6a23c !important;
  box-shadow: 0 0 0 2px rgba(230, 162, 60, 0.15) !important;
}

.transfer-note-input::placeholder {
  color: #bbb !important;
}

.transfer-send-btn {
  background: linear-gradient(135deg, #e6a23c 0%, #d4912a 100%);
  padding: 8px 24px;
}

.transfer-send-btn:hover {
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.4);
}

/* File Panel */
.file-panel {
  background: linear-gradient(135deg, #f5f8ff 0%, #f0f4ff 100%);
  border-top: 1px solid rgba(108, 140, 213, 0.15);
}

.file-header {
  color: #6c8cd5;
}

.file-header i {
  color: #6c8cd5;
}

.file-input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.file-name-input,
.file-size-input,
.file-desc-input {
  border: 1px solid #e8e8e8 !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  outline: none !important;
  background: #fff !important;
  color: #333 !important;
  transition: all 0.2s;
}

.file-name-input:focus,
.file-size-input:focus,
.file-desc-input:focus {
  border-color: #6c8cd5 !important;
  box-shadow: 0 0 0 2px rgba(108, 140, 213, 0.15) !important;
}

.file-name-input::placeholder,
.file-size-input::placeholder,
.file-desc-input::placeholder {
  color: #bbb !important;
}

.file-send-btn {
  background: linear-gradient(135deg, #6c8cd5 0%, #5a7bc4 100%);
  padding: 8px 24px;
}

.file-send-btn:hover {
  box-shadow: 0 2px 8px rgba(108, 140, 213, 0.4);
}
</style>
