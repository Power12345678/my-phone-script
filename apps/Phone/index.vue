<template>
  <div class="phone-app">
    <!-- Voice Call Overlay (全屏显示) -->
    <VoiceCall
      v-if="callState.active && callState.data"
      :call-data="callState.data"
      :is-loading="callState.isLoading"
      @end="handleCallEnd"
      @reply="handleCallReply"
    />

    <!-- 联系人列表 (通话时隐藏) -->
    <template v-else>
      <!-- Header -->
      <div class="phone-header">
        <div class="header-top">
          <i class="fas fa-arrow-left back-btn" @click="$emit('back')"></i>
          <h1>电话</h1>
        </div>
        <div class="search-bar">
          <i class="fas fa-search"></i>
          <input v-model="searchQuery" type="text" placeholder="搜索联系人..." />
        </div>
      </div>

      <!-- Contact List -->
      <div class="contact-list">
        <div
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="contact-item"
          @click="handleStartCall(contact)"
        >
          <div class="contact-avatar">
            <img :src="contact.avatar" :alt="contact.name" />
          </div>
          <div class="contact-info">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-nickname">{{ contact.nickname }}</div>
          </div>
          <div class="call-button">
            <i class="fas fa-phone-alt"></i>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import _ from 'lodash';
import yaml from 'yaml';
import VoiceCall from '../Chat/VoiceCall.vue';
import { fetchVoiceCallDataFromAi, loadApiConfig } from '../../预设/aiService';
import { saveCharacterModuleToMessage } from '../../store';

defineEmits(['back']);

interface Contact {
  id: string;
  name: string;
  avatar: string;
  nickname: string;
}

interface CallData {
  name: string;
  avatar: string;
  thought: string;
  content: string;
}

// 从角色变量加载角色数据
const loadCharactersFromChat = () => {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData && Array.isArray(phoneData.characters)) {
      return phoneData.characters;
    }
  } catch (e) {
    console.warn('无法从角色变量加载角色数据:', e);
  }
  return null;
};

// 优先从聊天变量读取
const chatCharacters = loadCharactersFromChat();
const charactersSource = chatCharacters || [];

const contacts = ref<Contact[]>(
  charactersSource.map((c: any) => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    nickname: c.nickname || c.name,
  }))
);

const searchQuery = ref('');

// 通话状态
const callState = reactive<{
  active: boolean;
  isLoading: boolean;
  error: string | null;
  data: CallData | null;
}>({
  active: false,
  isLoading: false,
  error: null,
  data: null,
});

const filteredContacts = computed(() => {
  if (!searchQuery.value) return contacts.value;
  const query = searchQuery.value.toLowerCase();
  return contacts.value.filter(
    c => c.name.toLowerCase().includes(query) || c.nickname.toLowerCase().includes(query)
  );
});

// 开始通话 - 调用AI生成
const handleStartCall = async (contact: Contact) => {
  callState.active = true;
  callState.isLoading = true;
  callState.error = null;
  callState.data = {
    name: contact.name,
    avatar: contact.avatar,
    thought: '正在接通中...',
    content: '请稍候...',
  };

  try {
    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      callState.error = '请先在设置中配置 API';
      callState.data.thought = '无法接通';
      callState.data.content = '请先在设置中配置 API';
      callState.isLoading = false;
      return;
    }

    const result = await fetchVoiceCallDataFromAi(contact.name);

    if (result.success && result.data) {
      const data = result.data as CallData;
      callState.data = {
        name: data.name || contact.name,
        avatar: contact.avatar, // 始终从联系人获取头像
        thought: data.thought || '通话中...',
        content: data.content || '通话已接通...',
      };

      // 保存通话数据到楼层
      await saveCharacterModuleToMessage('call', contact.name, {
        name: callState.data.name,
        thought: callState.data.thought,
        content: callState.data.content,
      });
    } else {
      callState.error = result.error || '获取通话数据失败';
      callState.data.thought = '通话连接失败';
      callState.data.content = result.error || '无法获取通话内容';
    }
  } catch (e) {
    callState.error = e instanceof Error ? e.message : '通话时发生未知错误';
    callState.data.thought = '通话出错';
    callState.data.content = '通话时发生错误，请重试';
  } finally {
    callState.isLoading = false;
  }
};

const handleCallEnd = (duration: string) => {
  console.info('[Phone] Call ended, duration:', duration);
  callState.active = false;
  callState.isLoading = false;
  callState.error = null;
  callState.data = null;
};

const handleCallReply = async (message: string) => {
  console.info('[Phone] User said:', message);
  if (!callState.data) return;

  const characterName = callState.data.name;
  callState.isLoading = true;

  try {
    const result = await fetchVoiceCallDataFromAi(characterName, message);
    if (result.success && result.data) {
      const data = result.data as CallData;
      callState.data.thought = data.thought || callState.data.thought;
      callState.data.content = data.content || '';

      // 保存通话数据到楼层
      await saveCharacterModuleToMessage('call', characterName, {
        name: callState.data.name,
        thought: callState.data.thought,
        content: callState.data.content,
      });
    }
  } catch (e) {
    console.error('[Phone] Call reply error:', e);
  } finally {
    callState.isLoading = false;
  }
};
</script>

<style scoped>
.phone-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #F0F6FC;
}

.phone-header {
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
}

.phone-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #475569;
  margin: 0;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.back-btn {
  font-size: 18px;
  color: #8FB8ED;
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s;
}

.back-btn:hover {
  color: #6a9de0;
}

.search-bar {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 9999px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.search-bar i {
  color: #8FB8ED;
  margin-right: 10px;
}

.search-bar input {
  flex: 1;
  border: none !important;
  background: transparent !important;
  font-size: 14px;
  outline: none !important;
  color: #475569 !important;
}

.search-bar input::placeholder {
  color: #94A3B8 !important;
}

.contact-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  margin-bottom: 10px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.15);
}

.contact-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(143, 184, 237, 0.25);
  background: rgba(255, 255, 255, 0.75);
}

.contact-item:active {
  transform: scale(0.98);
}

.contact-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 14px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 3px 10px rgba(143, 184, 237, 0.2);
}

.contact-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.contact-info {
  flex: 1;
}

.contact-name {
  font-size: 16px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 3px;
}

.contact-nickname {
  font-size: 12px;
  color: #94A3B8;
}

.call-button {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8FB8ED, #a8c9f0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.4);
}

.call-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 18px rgba(143, 184, 237, 0.5);
}

.call-button i {
  font-size: 16px;
}
</style>
