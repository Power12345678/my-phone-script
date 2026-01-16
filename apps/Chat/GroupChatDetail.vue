<template>
  <div class="chat-detail" :style="currentChat?.chatBg ? { backgroundImage: `url(${currentChat.chatBg})` } : {}">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-left" @click="goBack">
        <i class="fas fa-chevron-left"></i>
        <div v-if="currentChat" class="header-info">
          <img :src="currentChat.avatar" class="header-avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" />
          <div class="header-text">
            <h2>{{ currentChat.name }}</h2>
            <div class="header-status">
              <span>{{ currentChat.members }} 位成员</span>
            </div>
          </div>
        </div>
      </div>
      <div class="header-icons">
        <div class="header-icon"><i class="fas fa-users"></i></div>
        <div class="header-icon"><i class="fas fa-ellipsis-v"></i></div>
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="chat-messages">
      <GroupMessageItem v-for="msg in messages" :key="msg.id" :msg="msg" :user-avatar="userAvatar" @recall="handleRecallMessage" />
      <!-- 打字指示器 -->
      <div v-if="isTyping" class="message received typing-message">
        <div class="avatar-wrapper">
          <img :src="typingUser?.avatar || currentChat?.avatar || ''" class="avatar" />
        </div>
        <div class="message-wrapper">
          <div v-if="typingUser?.name" class="message-sender-name">
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
      <div class="function-item disabled">
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
      <div class="function-item disabled">
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import _ from 'lodash';
import YAML from 'yaml';
import { store } from '../../store';
import { getGroupChatHistoryFromTavern, convertYamlMessage, getAvatarByName, type YamlMessage, type FloorGroupChatData } from '../../数据';
import { fetchGroupChatDataFromAi } from '../../预设/aiService';
import { getDisplaySettings } from '../Settings/composables/useDisplaySettings';
import GroupMessageItem, { type GroupMessage } from './components/GroupMessageItem.vue';
import stickersJson from '../../数据/表情包.json';

// 群聊信息接口
interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  members: number;
  mainMembers?: string[];
  chatBg?: string;
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

// 加载用户数据
const chatUser = loadUserFromChat();
const userAvatar = computed(() => chatUser?.avatar || '');

const goBack = () => {
  store.chat.activeConversationId = null;
  emit('back');
};

// 从 store 获取当前群聊数据
const currentChat = computed<GroupChat | null>(() => {
  const id = store.chat.activeConversationId;
  if (!id) return null;

  // 从 chatList 中查找群聊
  const chatItem = store.chat.chatList.find(c => c.id === id && c.type === 'group');
  if (!chatItem) {
    console.warn('[GroupChatDetail] 未在 chatList 中找到群聊:', id);
    return null;
  }

  // 从聊天变量获取群聊配置（包含 mainMembers）
  let mainMembers: string[] = [];
  let members = 0;
  let chatBg = '';
  try {
    const charVars = getVariables({ type: 'character' });
    const groups = charVars?.phone_group_chats || charVars?.phone_data?.groups || [];
    const groupConfig = groups.find((g: any) => g.name === chatItem.name);
    if (groupConfig) {
      mainMembers = groupConfig.mainMembers || [];
      members = groupConfig.mainMembers?.length || 0;
      chatBg = groupConfig.chatBg || '';
    }
  } catch (e) {
    console.warn('[GroupChatDetail] 无法获取群聊配置:', e);
  }

  console.info('[GroupChatDetail] currentChat:', chatItem.name, 'mainMembers:', mainMembers);

  return {
    id: chatItem.id,
    name: chatItem.name,
    avatar: chatItem.avatar,
    members,
    mainMembers,
    chatBg,
  };
});

const messages = ref<GroupMessage[]>([]);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isTyping = ref(false);
const typingUser = ref<{ name: string; avatar: string } | null>(null);

// 功能栏相关
const showFunctionBar = ref(false);
const showStickerPicker = ref(false);
const showEmojiPicker = ref(false);
const showImageInput = ref(false);
const showFileInput = ref(false);
const imageInputText = ref('');
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
      const groupName = currentChat.value.name;
      const floors = getGroupChatHistoryFromTavern(groupName, 100);

      if (floors.length > 0) {
        // 构建消息列表，每层前添加日期分隔符
        const allMessages: GroupMessage[] = [];
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

          for (const msg of floor.messages) {
            allMessages.push(convertYamlMessage(msg, msgIndex++) as GroupMessage);
          }
        }

        messages.value = allMessages;
        console.info('[GroupChatDetail] Loaded', floors.length, 'floors,', allMessages.length, 'messages for', groupName);
      } else {
        messages.value = [];
        console.info('[GroupChatDetail] No messages found for', groupName);
      }
    } else {
      messages.value = [];
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
    const groupName = currentChat.value.name;
    const sendText = `在群聊${groupName}中发送消息:${messageContent}`;
    // 使用 SillyTavern 的斜杠命令推进正文
    triggerSlash(`/send ${sendText}|/trigger`);
    console.info('[GroupChatDetail] 自动推进正文:', sendText);
  }
};

// 功能栏切换
const toggleFunctionBar = () => {
  showFunctionBar.value = !showFunctionBar.value;
  if (!showFunctionBar.value) {
    showStickerPicker.value = false;
    showEmojiPicker.value = false;
    showImageInput.value = false;
    showFileInput.value = false;
    activeFunction.value = null;
  }
};

// 刷新按钮 - 收集用户消息、调用AI、保存到楼层
const isRefreshing = ref(false);

const handleRefresh = async () => {
  if (!currentChat.value) {
    toastr.warning('请先选择群聊');
    return;
  }

  if (isRefreshing.value) {
    toastr.info('正在生成中，请稍候...');
    return;
  }

  const groupName = currentChat.value.name;
  const mainMembers = currentChat.value.mainMembers || [];
  console.info('[GroupChatDetail] 开始刷新，群聊:', groupName, '主要成员:', mainMembers);

  // 1. 收集本次会话用户发送的消息（排除日期分隔符）
  const newUserMessages = messages.value.filter(
    msg => msg.isNewMessage && msg.isMe && msg.type !== 'date-separator',
  );

  // 2. 格式化用户消息为提示词
  const formattedUserMessages = newUserMessages.map(msg => formatMessageForPrompt(msg));
  console.info('[GroupChatDetail] 用户消息:', formattedUserMessages);

  // 3. 调用 AI
  isRefreshing.value = true;
  isTyping.value = true;

  try {
    const result = await fetchGroupChatDataFromAi(groupName, mainMembers, formattedUserMessages);

    if (!result.success) {
      toastr.error(result.error || 'AI 生成失败');
      return;
    }

    const aiData = result.data;
    console.info('[GroupChatDetail] AI 返回数据:', aiData);

    // 4. 解析 AI 返回的消息（支持 group_message 包装或直接 messages）
    const messagesData = aiData.group_message?.messages || aiData.messages || [];
    const aiMessages: YamlMessage[] = messagesData.filter((msg: YamlMessage) => !msg.me);
    if (aiMessages.length === 0) {
      toastr.warning('AI 未返回有效消息');
      return;
    }

    // 5. 构建要保存的完整数据
    const allMessagesToSave: YamlMessage[] = [];

    // 添加用户发送的消息
    console.info('[GroupChatDetail] 用户消息数量:', newUserMessages.length);
    for (const msg of newUserMessages) {
      const yamlMsg = convertMessageToYaml(msg);
      console.info('[GroupChatDetail] 转换用户消息:', msg, '->', yamlMsg);
      allMessagesToSave.push(yamlMsg);
    }

    // 添加 AI 回复的消息
    console.info('[GroupChatDetail] AI消息数量:', aiMessages.length);
    allMessagesToSave.push(...aiMessages);
    console.info('[GroupChatDetail] 总消息数量:', allMessagesToSave.length);

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
      id: aiData.id || currentChat.value.id,
      name: aiData.name || groupName,
      avatar: aiData.avatar || currentChat.value.avatar,
      members: aiData.members || currentChat.value.members,
      date: aiData.date || dateStr,
      time: aiData.time || timeStr,
      messages: allMessagesToSave,
    };

    const yamlContent = YAML.stringify(chatHistoryData);
    const floorContent = `<chat_history target="${groupName}" type="group">\n${yamlContent}</chat_history>`;

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
          console.info('[GroupChatDetail] 已追加到楼层', lastMessageId);
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
      console.info('[GroupChatDetail] 已保存到新楼层');
    }

    // 8. 从楼层重新读取数据刷新界面
    const floors = getGroupChatHistoryFromTavern(groupName, 100);

    if (floors.length > 0) {
      const allMessages: GroupMessage[] = [];
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

        for (const msg of floor.messages) {
          allMessages.push(convertYamlMessage(msg, msgIndex++) as GroupMessage);
        }
      }

      messages.value = allMessages;
      console.info('[GroupChatDetail] 重新加载了', floors.length, '层消息');
    }

    scrollToBottom();
    toastr.success('生成完成');
  } catch (e) {
    console.error('[GroupChatDetail] 刷新失败:', e);
    toastr.error('生成失败: ' + (e instanceof Error ? e.message : '未知错误'));
  } finally {
    isRefreshing.value = false;
    isTyping.value = false;
  }
};

// 格式化消息为提示词
const formatMessageForPrompt = (msg: GroupMessage): string => {
  switch (msg.type) {
    case 'text':
      return `[文字] ${msg.content}`;
    case 'image':
      return `[图片] ${msg.content}`;
    case 'sticker':
      return `[表情包] ${msg.content}`;
    case 'text-image':
      return `[图片描述] ${msg.content}`;
    case 'file':
      return `[文件] ${msg.filename}${msg.description ? ` - ${msg.description}` : ''}`;
    default:
      return msg.content || '';
  }
};

// 将 GroupMessage 转换为 YamlMessage 格式
const convertMessageToYaml = (msg: GroupMessage): YamlMessage => {
  const base: YamlMessage = {
    t: 'text',
    time: msg.time,
    me: msg.isMe,
  };

  switch (msg.type) {
    case 'text':
      return { ...base, t: 'text', c: msg.content };
    case 'image':
      return { ...base, t: 'image', c: msg.content };
    case 'sticker':
      return { ...base, t: 'sticker', c: msg.content };
    case 'text-image':
      return { ...base, t: 'imgdesc', c: msg.content };
    case 'file':
      return { ...base, t: 'file', name: msg.filename, size: msg.filesize, desc: msg.description };
    default:
      return { ...base, t: 'text', c: msg.content };
  }
};

// 撤回消息
const handleRecallMessage = (msgId: string) => {
  const index = messages.value.findIndex(m => m.id === msgId);
  if (index !== -1) {
    messages.value.splice(index, 1);
    console.info('[GroupChatDetail] Message recalled:', msgId);
  }
};

// 切换功能
const toggleFunction = (func: string) => {
  // 先关闭所有面板
  const closeAll = () => {
    showStickerPicker.value = false;
    showEmojiPicker.value = false;
    showImageInput.value = false;
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
  } else if (func === 'image') {
    const isActive = activeFunction.value === 'image';
    closeAll();
    showImageInput.value = !isActive;
    activeFunction.value = !isActive ? 'image' : null;
    if (!isActive) imageInputText.value = '';
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
    console.info('[GroupChatDetail] Function not implemented:', func);
  }
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

  showStickerPicker.value = false;
  activeFunction.value = null;
  scrollToBottom();
};

// 插入 emoji 到输入框
const insertEmoji = (emoji: string) => {
  newMessage.value += emoji;
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
  z-index: 101;
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
  color: #666;
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

.function-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
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

/* Extend Input Panel */
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
