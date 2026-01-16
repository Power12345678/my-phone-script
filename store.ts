import _ from 'lodash';
import { reactive, ref } from 'vue';
import yaml from 'yaml';
import {
  getChatListFromTavern,
  type CharacterInfo,
} from './数据';
import type { ChatListItem, GroupChat, PrivateChat } from './数据/schema';
import { getDisplaySettings } from './apps/Settings/composables/useDisplaySettings';

// ========== 全局 AI 请求终止控制 ==========

/** 当前活跃的 AbortController */
let currentAbortController: AbortController | null = null;

/** 获取当前的 AbortController，如果没有则创建一个新的 */
export function getAbortController(): AbortController {
  if (!currentAbortController) {
    currentAbortController = new AbortController();
  }
  return currentAbortController;
}

/** 终止当前的 AI 请求 */
export function abortCurrentRequest(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    console.info('[Store] AI 请求已终止');
  }
}

/** 重置 AbortController（在请求完成后调用） */
export function resetAbortController(): void {
  currentAbortController = null;
}

/** 检查请求是否被终止 */
export function isRequestAborted(): boolean {
  return currentAbortController?.signal.aborted ?? false;
}

// ========== 模块缓存工具函数 ==========

/** 模块缓存数据结构 */
export interface ModuleCache<T = any> {
  /** 缓存的数据 */
  data: T;
  /** 缓存时间戳 */
  timestamp: number;
  /** 关联的楼层ID（可选） */
  messageId?: number;
}

/** 模块类型 */
export type ModuleType = 'map' | 'dynamic' | 'forum' | 'forumPost' | 'live' | 'liveList' | 'email' | 'browser' | 'music' | 'calendar';

/** 人物相关模块类型 */
export type CharacterModuleType = 'dynamicHome' | 'privateChat' | 'profile' | 'call';

/** 获取缓存键名 */
function getCacheKey(module: ModuleType): string {
  return `phone_cache_${module}`;
}

/** 保存模块缓存到 localStorage */
export function saveModuleCache<T>(module: ModuleType, data: T, messageId?: number): void {
  const cache: ModuleCache<T> = {
    data,
    timestamp: Date.now(),
    messageId,
  };
  try {
    localStorage.setItem(getCacheKey(module), JSON.stringify(cache));
    console.info(`[Cache] 已保存 ${module} 缓存`);
  } catch (e) {
    console.error(`[Cache] 保存 ${module} 缓存失败:`, e);
  }
}

/** 读取模块缓存 */
export function loadModuleCache<T>(module: ModuleType): ModuleCache<T> | null {
  try {
    const cacheStr = localStorage.getItem(getCacheKey(module));
    if (!cacheStr) return null;
    return JSON.parse(cacheStr) as ModuleCache<T>;
  } catch (e) {
    console.error(`[Cache] 读取 ${module} 缓存失败:`, e);
    return null;
  }
}

/** 检查是否有模块缓存 */
export function hasModuleCache(module: ModuleType): boolean {
  return localStorage.getItem(getCacheKey(module)) !== null;
}

/** 清除模块缓存 */
export function clearModuleCache(module: ModuleType): void {
  localStorage.removeItem(getCacheKey(module));
  console.info(`[Cache] 已清除 ${module} 缓存`);
}

/** 清除所有模块缓存 */
export function clearAllModuleCache(): void {
  const modules: ModuleType[] = ['map', 'dynamic', 'forum', 'forumPost', 'live', 'liveList', 'email', 'browser', 'music', 'calendar'];
  modules.forEach(module => clearModuleCache(module));
  console.info('[Cache] 已清除所有模块缓存');
}

/** 保存数据到酒馆楼层（创建AI消息或追加到最后楼层） */
export async function saveToTavernMessage(module: ModuleType, data: any): Promise<number | null> {
  try {
    // 将数据转换为YAML格式
    const yamlContent = yaml.stringify(data);
    // 使用XML标签包裹
    const messageContent = `<phone_module type="${module}" timestamp="${Date.now()}">\n${yamlContent}</phone_module>`;

    // 检查是否需要追加到最后楼层
    const displaySettings = getDisplaySettings();
    if (displaySettings.appendToLastMessage) {
      const lastMessageId = getLastMessageId();
      if (lastMessageId >= 0) {
        // 获取最后楼层的内容
        const messages = getChatMessages(String(lastMessageId));
        if (messages && messages.length > 0) {
          const originalMessage = messages[0].message;
          // 追加新内容到末尾
          const newMessage = originalMessage + '\n\n' + messageContent;
          await setChatMessages([{ message_id: lastMessageId, message: newMessage }]);
          console.info(`[Cache] 已追加 ${module} 数据到楼层 ${lastMessageId}`);
          return lastMessageId;
        }
      }
    }

    // 创建AI消息楼层
    await createChatMessages([
      {
        role: 'assistant',
        message: messageContent,
        is_hidden: false, // 不隐藏，让酒馆提示词可见
      },
    ]);

    // 获取新创建的楼层ID
    const lastMessageId = getLastMessageId();
    console.info(`[Cache] 已保存 ${module} 数据到楼层 ${lastMessageId}`);
    return lastMessageId;
  } catch (e) {
    console.error(`[Cache] 保存 ${module} 数据到楼层失败:`, e);
    return null;
  }
}

/**
 * 从聊天历史楼层中读取模块数据（异步版本，避免阻塞主线程）
 *
 * @param module 模块类型
 * @returns Promise，最近一次保存的模块数据，如果没有则返回 null
 */
export function loadModuleFromHistoryAsync<T>(module: ModuleType): Promise<T | null> {
  return new Promise(resolve => {
    // 使用 setTimeout 延迟执行，避免阻塞主线程
    setTimeout(() => {
      resolve(loadModuleFromHistory<T>(module));
    }, 0);
  });
}

/**
 * 从聊天历史楼层中读取模块数据
 * 根据设置的 historyReadCount 控制读取范围
 *
 * @param module 模块类型
 * @returns 最近一次保存的模块数据，如果没有则返回 null
 */
export function loadModuleFromHistory<T>(module: ModuleType): T | null {
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) {
      console.info(`[History] ${module} - 没有楼层消息`);
      return null;
    }

    // 获取读取设置，计算起始楼层
    const settings = getDisplaySettings();
    const historyReadCount = settings.historyReadCount;
    const startId = historyReadCount === 0 ? 0 : Math.max(0, lastMessageId - historyReadCount + 1);

    // 获取楼层消息
    const messages = getChatMessages(`${startId}-${lastMessageId}`);
    if (!messages || messages.length === 0) {
      console.info(`[History] ${module} - 没有楼层消息`);
      return null;
    }

    // 构建正则匹配
    const regex = new RegExp(`<phone_module\\s+type="${module}"[^>]*>([\\s\\S]*?)</phone_module>`);

    // 从最新楼层开始查找，找到第一个匹配的就返回
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const match = regex.exec(msg.message);
      if (match) {
        try {
          const yamlContent = match[1].trim();
          const data = yaml.parse(yamlContent);
          console.info(`[History] ${module} - 从楼层 ${msg.message_id} 读取到数据`);
          return data as T;
        } catch (e) {
          console.warn(`[History] ${module} - 解析楼层 ${msg.message_id} 数据失败:`, e);
        }
      }
    }

    console.info(`[History] ${module} - 未在楼层历史中找到数据`);
    return null;
  } catch (e) {
    console.error(`[History] ${module} - 读取楼层历史失败:`, e);
    return null;
  }
}

/**
 * 查找模块数据所在的楼层ID
 * 根据设置的 historyReadCount 控制读取范围
 *
 * @param module 模块类型
 * @returns 楼层ID，如果没找到则返回 null
 */
export function findModuleMessageId(module: ModuleType): number | null {
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) {
      return null;
    }

    // 获取读取设置，计算起始楼层
    const settings = getDisplaySettings();
    const historyReadCount = settings.historyReadCount;
    const startId = historyReadCount === 0 ? 0 : Math.max(0, lastMessageId - historyReadCount + 1);

    const messages = getChatMessages(`${startId}-${lastMessageId}`);
    if (!messages || messages.length === 0) {
      return null;
    }

    const regex = new RegExp(`<phone_module\\s+type="${module}"[^>]*>`);

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (regex.test(msg.message)) {
        console.info(`[History] ${module} - 找到楼层 ${msg.message_id}`);
        return msg.message_id;
      }
    }

    return null;
  } catch (e) {
    console.error(`[History] ${module} - 查找楼层ID失败:`, e);
    return null;
  }
}

/**
 * 更新指定楼层的模块数据（原地更新，不创建新楼层）
 *
 * @param module 模块类型
 * @param data 新的模块数据
 * @param messageId 楼层ID（如果不传则自动查找）
 * @returns 是否更新成功
 */
export async function updateModuleInMessage(
  module: ModuleType,
  data: any,
  messageId?: number,
): Promise<boolean> {
  try {
    // 如果没传楼层ID，自动查找
    const targetMessageId = messageId ?? findModuleMessageId(module);
    if (targetMessageId === null) {
      console.warn(`[History] ${module} - 未找到目标楼层，无法更新`);
      return false;
    }

    // 获取原消息
    const messages = getChatMessages(String(targetMessageId));
    if (!messages || messages.length === 0) {
      console.warn(`[History] ${module} - 楼层 ${targetMessageId} 不存在`);
      return false;
    }

    const originalMessage = messages[0].message;

    // 构建新的模块内容
    const yamlContent = yaml.stringify(data);
    const newModuleContent = `<phone_module type="${module}" timestamp="${Date.now()}">\n${yamlContent}</phone_module>`;

    // 替换原消息中的模块内容
    const regex = new RegExp(`<phone_module\\s+type="${module}"[^>]*>[\\s\\S]*?</phone_module>`);
    const newMessage = originalMessage.replace(regex, newModuleContent);

    // 更新楼层
    await setChatMessages([{ message_id: targetMessageId, message: newMessage }]);

    console.info(`[History] ${module} - 已更新楼层 ${targetMessageId}`);
    return true;
  } catch (e) {
    console.error(`[History] ${module} - 更新楼层失败:`, e);
    return false;
  }
}

/**
 * 从聊天历史楼层中读取人物相关模块数据
 * 根据设置的 historyReadCount 控制读取范围
 */
export function loadCharacterModuleFromHistory<T>(
  module: CharacterModuleType,
  characterName: string,
): T | null {
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) {
      console.info(`[History] ${module}:${characterName} - 没有楼层消息`);
      return null;
    }

    // 获取读取设置，计算起始楼层
    const settings = getDisplaySettings();
    const historyReadCount = settings.historyReadCount;
    const startId = historyReadCount === 0 ? 0 : Math.max(0, lastMessageId - historyReadCount + 1);

    const messages = getChatMessages(`${startId}-${lastMessageId}`);
    if (!messages || messages.length === 0) {
      console.info(`[History] ${module}:${characterName} - 没有楼层消息`);
      return null;
    }

    // 匹配特定人物的模块数据
    const regex = new RegExp(
      `<phone_module\\s+type="${module}"\\s+character="${characterName}"[^>]*>([\\s\\S]*?)</phone_module>`,
    );

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const match = regex.exec(msg.message);
      if (match) {
        try {
          const yamlContent = match[1].trim();
          const data = yaml.parse(yamlContent);
          console.info(`[History] ${module}:${characterName} - 从楼层 ${msg.message_id} 读取到数据`);
          return data as T;
        } catch (e) {
          console.warn(`[History] ${module}:${characterName} - 解析楼层 ${msg.message_id} 数据失败:`, e);
        }
      }
    }

    console.info(`[History] ${module}:${characterName} - 未在楼层历史中找到数据`);
    return null;
  } catch (e) {
    console.error(`[History] ${module}:${characterName} - 读取楼层历史失败:`, e);
    return null;
  }
}

/**
 * 异步版本：从聊天历史楼层中读取人物相关模块数据
 * 使用 setTimeout 延迟执行，避免阻塞主线程
 */
export function loadCharacterModuleFromHistoryAsync<T>(
  module: CharacterModuleType,
  characterName: string,
): Promise<T | null> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(loadCharacterModuleFromHistory<T>(module, characterName));
    }, 0);
  });
}

// 通话数据类型
export interface CallData {
  name: string;
  avatar: string;
  thought: string;
  content: string;
}

// 歌曲类型
export interface Song {
  url: string;
  artist: string;
  title: string;
}

// 音乐播放状态
export interface MusicState {
  /** 歌曲列表 */
  songs: Song[];
  /** 当前播放索引 */
  currentIndex: number;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前播放时间 */
  currentTime: number;
  /** 总时长 */
  duration: number;
  /** 音量 0-1 */
  volume: number;
  /** 播放模式 */
  playMode: 'sequence' | 'random';
}

export interface AppState {
  activeApp:
    | 'home'
    | 'chat'
    | 'user'
    | 'forum'
    | 'settings'
    | 'browser'
    | 'phone'
    | 'map'
    | 'email'
    | 'music'
    | 'dynamic'
    | 'live'
    | 'liveroom'
    | 'calendar'
    | 'diary';
  /** 用户字体设置 */
  userFont: string;
  phone: {
    show: boolean;
    time: string;
    date: string;
    weather: {
      temp: string;
      condition: string;
    };
    battery: number;
    wifi: boolean;
    signal: boolean;
  };
  chat: {
    activeConversationId: string | null;
    /** 聊天列表 */
    chatList: ChatListItem[];
    /** 私聊详情缓存 */
    privateChats: Map<string, PrivateChat>;
    /** 群聊详情缓存 */
    groupChats: Map<string, GroupChat>;
    /** 角色信息缓存 */
    characters: Map<string, CharacterInfo>;
    /** 是否显示个人主页 */
    showProfile: boolean;
  };
  /** 通话状态 */
  call: {
    /** 是否正在通话中 */
    active: boolean;
    /** 是否正在首次接通（拨号中） */
    isConnecting: boolean;
    /** 是否正在等待回复 */
    isWaitingReply: boolean;
    /** 错误信息 */
    error: string | null;
    /** 通话数据 */
    data: CallData | null;
  };
  /** 音乐播放状态 */
  music: MusicState;
  /** 待发送的分享消息（从浏览器分享到聊天） */
  pendingShareMessage: {
    id: string;
    type: 'browser-share';
    title: string;
    source: string;
    description?: string;
    url: string;
    time: string;
    isMe: boolean;
    isNewMessage: boolean;
  } | null;
}

export const store = reactive<AppState>({
  activeApp: 'home',
  userFont: '',
  phone: {
    show: true,
    time: '12:00',
    date: '2025年1月1日',
    weather: {
      temp: '20°C',
      condition: '晴朗',
    },
    battery: 80,
    wifi: true,
    signal: true,
  },
  chat: {
    activeConversationId: null,
    chatList: [],
    privateChats: new Map(),
    groupChats: new Map(),
    characters: new Map(),
    showProfile: false,
  },
  call: {
    active: false,
    isConnecting: false,
    isWaitingReply: false,
    error: null,
    data: null,
  },
  music: {
    songs: [],
    currentIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playMode: 'sequence',
  },
  pendingShareMessage: null,
});

/** 初始化聊天数据 */
export function initChatData(): void {
  // 使用 setTimeout 延迟执行，避免阻塞主线程
  setTimeout(() => {
    // 从酒馆历史加载聊天列表（会自动回退到基本信息中的角色）
    store.chat.chatList = getChatListFromTavern();
    console.info('[Store] 聊天列表已加载:', store.chat.chatList.length);
  }, 0);
}

/** 初始化用户字体设置 */
export function initUserFont(): void {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData?.user?.font) {
      store.userFont = phoneData.user.font;
      console.info('[Store] 用户字体已加载:', store.userFont);
    }
  } catch (e) {
    console.warn('[Store] 无法加载用户字体:', e);
  }
}

/** 更新用户字体设置 */
export function updateUserFont(font: string): void {
  store.userFont = font;
  console.info('[Store] 用户字体已更新:', font);
}

/** 获取当前聊天的类型 */
export function getActiveChatType(): 'single' | 'group' | null {
  const id = store.chat.activeConversationId;
  if (!id) return null;
  const chat = store.chat.chatList.find(c => c.id === id);
  return chat?.type || null;
}

/** 获取当前私聊详情 */
export function getActivePrivateChat(): PrivateChat | null {
  const id = store.chat.activeConversationId;
  if (!id) return null;
  return store.chat.privateChats.get(id) || null;
}

/** 获取当前群聊详情 */
export function getActiveGroupChat(): GroupChat | null {
  const id = store.chat.activeConversationId;
  if (!id) return null;
  return store.chat.groupChats.get(id) || null;
}

/** 开始通话 - 使用当前私聊对象的数据，并调用AI生成通话内容 */
export async function startCall(chatId?: string): Promise<boolean> {
  const id = chatId || store.chat.activeConversationId;
  console.info('[Store] startCall - id:', id);
  if (!id) {
    console.warn('[Store] startCall - 没有会话ID');
    return false;
  }

  // 从 chatList 获取聊天对象信息
  const chatItem = store.chat.chatList.find(c => c.id === id);
  console.info('[Store] startCall - chatItem:', chatItem);
  if (!chatItem || chatItem.type !== 'single') {
    console.warn('[Store] startCall - 找不到私聊数据或不是私聊');
    return false;
  }

  // 设置通话状态为接通中
  store.call.active = true;
  store.call.isConnecting = true;
  store.call.isWaitingReply = false;
  store.call.error = null;
  store.call.data = {
    name: chatItem.name,
    avatar: chatItem.avatar,
    thought: '正在接通中...',
    content: '请稍候...',
  };

  console.info('[Store] Call starting with:', chatItem.name);

  try {
    // 调用AI生成通话内容
    const { fetchVoiceCallDataFromAi, loadApiConfig } = await import('./预设/aiService');

    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      store.call.error = '请先在设置中配置 API';
      store.call.data.thought = '无法接通';
      store.call.data.content = '请先在设置中配置 API';
      store.call.isConnecting = false;
      return false;
    }

    const result = await fetchVoiceCallDataFromAi(chatItem.name);

    if (result.success && result.data) {
      const callData = result.data as CallData;
      store.call.data = {
        name: callData.name || chatItem.name,
        avatar: chatItem.avatar, // 始终从角色变量获取头像
        thought: callData.thought || '通话中...',
        content: callData.content || '通话已接通...',
      };
      console.info('[Store] Call data loaded:', store.call.data);

      // 保存通话数据到楼层（不保存头像，头像从角色变量获取）
      await saveCharacterModuleToMessage('call', chatItem.name, {
        name: store.call.data.name,
        thought: store.call.data.thought,
        content: store.call.data.content,
      });
    } else {
      store.call.error = result.error || '获取通话数据失败';
      store.call.data.thought = '通话连接失败';
      store.call.data.content = result.error || '无法获取通话内容';
      console.error('[Store] Call data load failed:', result.error);
    }
  } catch (e) {
    store.call.error = e instanceof Error ? e.message : '通话时发生未知错误';
    store.call.data.thought = '通话出错';
    store.call.data.content = '通话时发生错误，请重试';
    console.error('[Store] Call error:', e);
  } finally {
    store.call.isConnecting = false;
  }

  return true;
}

/** 通话中回复 - 调用AI生成回复内容 */
export async function replyInCall(userMessage: string): Promise<void> {
  if (!store.call.active || !store.call.data) return;

  const characterName = store.call.data.name;
  store.call.isWaitingReply = true;

  try {
    const { fetchVoiceCallDataFromAi } = await import('./预设/aiService');
    const result = await fetchVoiceCallDataFromAi(characterName, userMessage);

    if (result.success && result.data) {
      const callData = result.data as CallData;
      // 追加新内容到现有内容
      store.call.data.thought = callData.thought || store.call.data.thought;
      store.call.data.content = callData.content || '';
      console.info('[Store] Call reply loaded');

      // 保存更新后的通话数据（不保存头像）
      await saveCharacterModuleToMessage('call', characterName, {
        name: store.call.data.name,
        thought: store.call.data.thought,
        content: store.call.data.content,
      });
    }
  } catch (e) {
    console.error('[Store] Call reply error:', e);
  } finally {
    store.call.isWaitingReply = false;
  }
}

/** 结束通话 */
export function endCall(): void {
  store.call.active = false;
  store.call.isConnecting = false;
  store.call.isWaitingReply = false;
  store.call.error = null;
  store.call.data = null;
  console.info('[Store] Call ended');
}

// ========== 音乐播放器全局控制 ==========

/** 全局音频实例 */
let globalAudio: HTMLAudioElement | null = null;

/** 获取全局音频实例 */
export function getGlobalAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.volume = store.music.volume;

    // 监听时间更新
    globalAudio.addEventListener('timeupdate', () => {
      store.music.currentTime = globalAudio!.currentTime;
    });

    // 监听加载完成
    globalAudio.addEventListener('loadedmetadata', () => {
      store.music.duration = globalAudio!.duration;
    });

    // 监听播放结束
    globalAudio.addEventListener('ended', () => {
      musicNext();
    });
  }
  return globalAudio;
}

/** 初始化音乐数据 */
export function initMusicData(): void {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData && Array.isArray(phoneData.music)) {
      store.music.songs = phoneData.music;
    }
  } catch (e) {
    console.warn('[Store] 无法加载音乐数据:', e);
  }
}

/** 加载歌曲 */
export function musicLoadSong(index: number): void {
  if (index < 0 || index >= store.music.songs.length) return;
  const audio = getGlobalAudio();
  store.music.currentIndex = index;
  audio.src = store.music.songs[index].url;
  audio.load();
  store.music.currentTime = 0;
}

/** 播放/暂停 */
export function musicTogglePlay(): void {
  const audio = getGlobalAudio();
  if (store.music.isPlaying) {
    audio.pause();
    store.music.isPlaying = false;
  } else {
    audio.play();
    store.music.isPlaying = true;
  }
}

/** 上一首 */
export function musicPrev(): void {
  let newIndex: number;
  if (store.music.playMode === 'sequence') {
    newIndex = (store.music.currentIndex - 1 + store.music.songs.length) % store.music.songs.length;
  } else {
    newIndex = Math.floor(Math.random() * store.music.songs.length);
  }
  musicLoadSong(newIndex);
  if (store.music.isPlaying) {
    getGlobalAudio().play();
  }
}

/** 下一首 */
export function musicNext(): void {
  let newIndex: number;
  if (store.music.playMode === 'sequence') {
    newIndex = (store.music.currentIndex + 1) % store.music.songs.length;
  } else {
    newIndex = Math.floor(Math.random() * store.music.songs.length);
  }
  musicLoadSong(newIndex);
  if (store.music.isPlaying) {
    getGlobalAudio().play();
  }
}

/** 播放指定歌曲 */
export function musicPlaySong(index: number): void {
  musicLoadSong(index);
  getGlobalAudio().play();
  store.music.isPlaying = true;
}

/** 跳转到指定时间 */
export function musicSeek(time: number): void {
  const audio = getGlobalAudio();
  audio.currentTime = time;
  store.music.currentTime = time;
}

/** 设置音量 */
export function musicSetVolume(vol: number): void {
  const audio = getGlobalAudio();
  store.music.volume = vol;
  audio.volume = vol;
}

/** 切换播放模式 */
export function musicToggleMode(): void {
  store.music.playMode = store.music.playMode === 'sequence' ? 'random' : 'sequence';
}

/** 添加歌曲到列表 */
export function musicAddSong(song: Song): void {
  store.music.songs.unshift(song);
}

// ========== 地图数据状态 ==========

/** 地图位置数据 */
export interface MapLocationData {
  description: string;
  status: string;
  events: string;
  otherCharacters: string;
  subLocations?: Record<string, MapLocationData>;
}

/** 地图人物数据 */
export interface MapCharacterData {
  location: string;
  status: string;
}

/** 地图数据 */
export interface MapDataState {
  mapName?: string;
  date: string;
  time: string;
  locations: Record<string, MapLocationData>;
  characters: Record<string, MapCharacterData>;
}

/** 地图加载状态 */
export interface MapState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 地图数据 */
  data: MapDataState | null;
  /** 是否已加载过 */
  loaded: boolean;
}

/** 地图状态 */
export const phoneMapState = reactive<MapState>({
  isLoading: false,
  error: null,
  data: null,
  loaded: false,
});

/** 加载地图数据 - 优先从楼层历史读取，否则调用AI获取
 * @param forceRefresh 是否强制刷新（跳过历史读取，直接调用AI）
 */
export async function loadMapDataFromAi(forceRefresh = false): Promise<void> {
  console.info('[Store] loadMapDataFromAi 被调用', forceRefresh ? '(强制刷新)' : '');

  // 避免重复加载
  if (phoneMapState.isLoading) return;

  // 1. 非强制刷新时，优先尝试从楼层历史读取（使用异步版本避免阻塞）
  if (!forceRefresh) {
    const historyData = await loadModuleFromHistoryAsync<MapDataState>('map');
    if (historyData) {
      console.info('[Store] 从楼层历史加载地图数据');
      phoneMapState.data = historyData;
      phoneMapState.loaded = true;
      return;
    }
  }

  phoneMapState.isLoading = true;
  phoneMapState.error = null;

  try {
    // 动态导入aiService避免循环依赖
    const { fetchMapDataFromAi, loadApiConfig } = await import('./预设/aiService');

    // 检查API配置
    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      phoneMapState.error = '请先在设置中配置 API';
      phoneMapState.isLoading = false;
      return;
    }

    console.info('[Store] 开始调用AI获取地图数据...');
    const result = await fetchMapDataFromAi();

    if (result.success && result.data) {
      const data = result.data as MapDataState;
      phoneMapState.data = data;
      phoneMapState.loaded = true;
      console.info('[Store] 地图数据加载成功:', data);

      // 2. 保存到酒馆楼层
      await saveToTavernMessage('map', data);
    } else {
      phoneMapState.error = result.error || '获取地图数据失败';
      console.error('[Store] 地图数据加载失败:', result.error);
    }
  } catch (e) {
    phoneMapState.error = e instanceof Error ? e.message : '加载地图数据时发生未知错误';
    console.error('[Store] 地图数据加载异常:', e);
  } finally {
    phoneMapState.isLoading = false;
  }
}

/** 重置地图数据（用于重新加载） */
export function resetMapData(): void {
  phoneMapState.data = null;
  phoneMapState.loaded = false;
  phoneMapState.error = null;
}

// ========== 动态数据状态 ==========

/** 动态评论数据 */
export interface DynamicComment {
  name: string;
  c: string;
}

/** 动态帖子数据 */
export interface DynamicPost {
  name: string;
  content: string;
  image?: string | null;
  likes: number;
  shares: number;
  commentCount: number;
  comments?: DynamicComment[];
}

/** 动态数据 */
export interface DynamicDataState {
  posts: DynamicPost[];
}

/** 动态加载状态 */
export interface DynamicState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 动态数据 */
  data: DynamicDataState | null;
  /** 是否已加载过 */
  loaded: boolean;
}

/** 动态状态 */
export const dynamicState = reactive<DynamicState>({
  isLoading: false,
  error: null,
  data: null,
  loaded: false,
});

/** 加载动态数据 - 优先从楼层历史读取，否则调用AI获取
 * @param forceRefresh 是否强制刷新（跳过历史读取，直接调用AI）
 */
export async function loadDynamicDataFromAi(forceRefresh = false): Promise<void> {
  console.info('[Store] loadDynamicDataFromAi 被调用', forceRefresh ? '(强制刷新)' : '');

  // 避免重复加载
  if (dynamicState.isLoading) {
    console.info('[Store] 动态数据正在加载中，跳过');
    return;
  }

  // 1. 非强制刷新时，优先尝试从楼层历史读取（使用异步版本避免阻塞）
  if (!forceRefresh) {
    const historyData = await loadModuleFromHistoryAsync<DynamicDataState>('dynamic');
    if (historyData) {
      console.info('[Store] 从楼层历史加载动态数据');
      dynamicState.data = historyData;
      dynamicState.loaded = true;
      return;
    }
  }

  dynamicState.isLoading = true;
  dynamicState.error = null;

  try {
    // 动态导入aiService避免循环依赖
    const { fetchDynamicDataFromAi, loadApiConfig } = await import('./预设/aiService');

    // 检查API配置
    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      dynamicState.error = '请先在设置中配置 API';
      dynamicState.isLoading = false;
      return;
    }

    console.info('[Store] 开始调用AI获取动态数据...');
    const result = await fetchDynamicDataFromAi();

    if (result.success && result.data) {
      const data = result.data as DynamicDataState;
      dynamicState.data = data;
      dynamicState.loaded = true;
      console.info('[Store] 动态数据加载成功:', data);

      // 2. 保存到酒馆楼层
      await saveToTavernMessage('dynamic', data);
    } else {
      dynamicState.error = result.error || '获取动态数据失败';
      console.error('[Store] 动态数据加载失败:', result.error);
    }
  } catch (e) {
    dynamicState.error = e instanceof Error ? e.message : '加载动态数据时发生未知错误';
    console.error('[Store] 动态数据加载异常:', e);
  } finally {
    dynamicState.isLoading = false;
  }
}

/** 重置动态数据（用于重新加载） */
export function resetDynamicData(): void {
  dynamicState.data = null;
  dynamicState.loaded = false;
  dynamicState.error = null;
}

// ========== 邮箱状态管理 ==========

/** 邮件数据 */
export interface EmailItem {
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

/** 邮箱数据状态 */
export interface EmailDataState {
  emails: EmailItem[];
}

/** 邮箱加载状态 */
export interface EmailState {
  isLoading: boolean;
  error: string | null;
  data: EmailDataState | null;
  loaded: boolean;
}

/** 邮箱状态 */
export const emailState = reactive<EmailState>({
  isLoading: false,
  error: null,
  data: null,
  loaded: false,
});

/** 加载邮箱数据 */
export async function loadEmailDataFromAi(forceRefresh = false): Promise<void> {
  console.info('[Store] loadEmailDataFromAi 被调用', forceRefresh ? '(强制刷新)' : '');

  if (emailState.isLoading) {
    console.info('[Store] 邮箱数据正在加载中，跳过');
    return;
  }

  // 非强制刷新时，优先从楼层历史读取（使用异步版本避免阻塞）
  if (!forceRefresh) {
    const historyData = await loadModuleFromHistoryAsync<EmailDataState>('email');
    if (historyData) {
      console.info('[Store] 从楼层历史加载邮箱数据');
      emailState.data = historyData;
      emailState.loaded = true;
      return;
    }
  }

  emailState.isLoading = true;
  emailState.error = null;

  try {
    const { fetchEmailDataFromAi, loadApiConfig } = await import('./预设/aiService');

    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      emailState.error = '请先在设置中配置 API';
      emailState.isLoading = false;
      return;
    }

    console.info('[Store] 开始调用AI获取邮箱数据...');
    const result = await fetchEmailDataFromAi();

    if (result.success && result.data) {
      const data = result.data as EmailDataState;
      emailState.data = data;
      emailState.loaded = true;
      console.info('[Store] 邮箱数据加载成功:', data);

      await saveToTavernMessage('email', data);
    } else {
      emailState.error = result.error || '获取邮箱数据失败';
      console.error('[Store] 邮箱数据加载失败:', result.error);
    }
  } catch (e) {
    emailState.error = e instanceof Error ? e.message : '加载邮箱数据时发生未知错误';
    console.error('[Store] 邮箱数据加载异常:', e);
  } finally {
    emailState.isLoading = false;
  }
}

/** 重置邮箱数据 */
export function resetEmailData(): void {
  emailState.data = null;
  emailState.loaded = false;
  emailState.error = null;
}

// ========== 论坛状态管理 ==========

/** 论坛数据状态 */
export interface ForumDataState {
  pinned?: {
    title: string;
    content: string;
    views: number;
    comments: number;
  };
  posts: Array<{
    title: string;
    content: string;
    author?: string;
    category?: string;
    views: number;
    comments: number;
    likes?: number;
  }>;
}

/** 论坛状态 */
interface ForumState {
  isLoading: boolean;
  error: string | null;
  data: ForumDataState | null;
  loaded: boolean;
}

export const forumState = reactive<ForumState>({
  isLoading: false,
  error: null,
  data: null,
  loaded: false,
});

/** 加载论坛数据 */
export async function loadForumDataFromAi(forceRefresh = false): Promise<void> {
  console.info('[Store] loadForumDataFromAi 被调用', forceRefresh ? '(强制刷新)' : '');

  if (forumState.isLoading) {
    console.info('[Store] 论坛数据正在加载中，跳过');
    return;
  }

  // 使用异步版本避免阻塞
  if (!forceRefresh) {
    const historyData = await loadModuleFromHistoryAsync<ForumDataState>('forum');
    if (historyData) {
      console.info('[Store] 从楼层历史加载论坛数据');
      forumState.data = historyData;
      forumState.loaded = true;
      return;
    }
  }

  forumState.isLoading = true;
  forumState.error = null;

  try {
    const { fetchForumDataFromAi, loadApiConfig } = await import('./预设/aiService');

    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      forumState.error = '请先在设置中配置 API';
      forumState.isLoading = false;
      return;
    }

    const result = await fetchForumDataFromAi();

    if (result.success && result.data) {
      forumState.data = result.data as ForumDataState;
      forumState.loaded = true;
      console.info('[Store] 论坛数据加载成功');
      await saveToTavernMessage('forum', result.data);
    } else {
      forumState.error = result.error || '获取论坛数据失败';
    }
  } catch (e) {
    forumState.error = e instanceof Error ? e.message : '加载论坛数据时发生未知错误';
  } finally {
    forumState.isLoading = false;
  }
}

/** 重置论坛数据 */
export function resetForumData(): void {
  forumState.data = null;
  forumState.loaded = false;
  forumState.error = null;
}

// ========== 直播列表状态管理 ==========

/** 直播间数据 */
export interface LiveRoom {
  name: string;
  title: string;
  status: string;
  image: string;
  viewers: number;
  likes: number;
  followers: number;
}

/** 直播列表数据 */
export interface LiveListData {
  date?: string;
  time?: string;
  rooms: LiveRoom[];
}

/** 直播列表状态 */
export const liveListState = reactive<{
  isLoading: boolean;
  error: string | null;
  data: LiveListData | null;
  loaded: boolean;
}>({
  isLoading: false,
  error: null,
  data: null,
  loaded: false,
});

/** 从 AI 加载直播列表数据 */
export async function loadLiveListDataFromAi(forceRefresh = false): Promise<void> {
  if (liveListState.isLoading) return;

  liveListState.isLoading = true;
  liveListState.error = null;

  try {
    // 先尝试从历史楼层读取（强制刷新时跳过，使用异步版本避免阻塞）
    if (!forceRefresh) {
      const historyData = await loadModuleFromHistoryAsync<LiveListData>('liveList');
      if (historyData) {
        liveListState.data = historyData;
        liveListState.loaded = true;
        console.info('[Store] 直播列表 - 使用历史数据');
        return;
      }
    }

    // 无历史数据，调用 AI 生成
    const { fetchLiveListDataFromAi } = await import('./预设/aiService');
    const result = await fetchLiveListDataFromAi();

    if (result.success && result.data) {
      liveListState.data = result.data as LiveListData;
      liveListState.loaded = true;
      // 保存到楼层
      await saveToTavernMessage('liveList', result.data);
    } else {
      liveListState.error = result.error || '获取直播列表失败';
    }
  } catch (e) {
    liveListState.error = e instanceof Error ? e.message : '加载直播列表时发生未知错误';
  } finally {
    liveListState.isLoading = false;
  }
}

/** 重置直播列表数据 */
export function resetLiveListData(): void {
  liveListState.data = null;
  liveListState.loaded = false;
  liveListState.error = null;
}

// ========== 人物相关模块数据保存 ==========

/**
 * 保存人物相关模块数据到酒馆楼层
 */
export async function saveCharacterModuleToMessage(
  module: CharacterModuleType,
  characterName: string,
  data: any,
): Promise<void> {
  console.info(`[Store] saveCharacterModuleToMessage 开始 - module: ${module}, character: ${characterName}`);
  console.info(`[Store] saveCharacterModuleToMessage 数据:`, data);

  try {
    const yamlContent = yaml.stringify(data);
    const content = `<phone_module type="${module}" character="${characterName}" timestamp="${Date.now()}">\n${yamlContent}</phone_module>`;

    console.info(`[Store] saveCharacterModuleToMessage 准备创建楼层，内容长度: ${content.length}`);

    // 检查是否需要追加到最后楼层
    const displaySettings = getDisplaySettings();
    if (displaySettings.appendToLastMessage) {
      const lastMessageId = getLastMessageId();
      if (lastMessageId >= 0) {
        // 获取最后楼层的内容
        const messages = getChatMessages(String(lastMessageId));
        if (messages && messages.length > 0) {
          const originalMessage = messages[0].message;
          // 追加新内容到末尾
          const newMessage = originalMessage + '\n\n' + content;
          await setChatMessages([{ message_id: lastMessageId, message: newMessage }]);
          console.info(`[Store] 已追加 ${module}:${characterName} 数据到楼层 ${lastMessageId}`);
          return;
        }
      }
    }

    // 创建AI消息楼层
    await createChatMessages([
      {
        role: 'assistant',
        message: content,
        is_hidden: false,
      },
    ]);

    const lastId = getLastMessageId();
    console.info(`[Store] 保存 ${module}:${characterName} 数据到楼层 ${lastId}`);
  } catch (e) {
    console.error(`[Store] 保存 ${module}:${characterName} 数据失败:`, e);
  }
}

// ========== 浏览器状态管理 ==========

/** 搜索结果项 */
export interface BrowserSearchResult {
  url: string;
  title: string;
  preview: string;
  content: string;
}

/** 浏览器数据状态 */
export interface BrowserDataState {
  time: string;
  query: string;
  results: BrowserSearchResult[];
}

/** 浏览器状态 */
export interface BrowserState {
  isLoading: boolean;
  error: string | null;
  data: BrowserDataState | null;
  loaded: boolean;
}

/** 浏览器状态 */
export const browserState = reactive<BrowserState>({
  isLoading: false,
  error: null,
  data: null,
  loaded: false,
});

/** 搜索浏览器内容 - 调用AI生成搜索结果 */
export async function searchBrowserFromAi(query: string): Promise<void> {
  console.info('[Store] searchBrowserFromAi 被调用，搜索词:', query);

  if (browserState.isLoading) {
    console.info('[Store] 浏览器正在加载中，跳过');
    return;
  }

  browserState.isLoading = true;
  browserState.error = null;

  try {
    const { fetchBrowserDataFromAi, loadApiConfig } = await import('./预设/aiService');

    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      browserState.error = '请先在设置中配置 API';
      browserState.isLoading = false;
      return;
    }

    console.info('[Store] 开始调用AI获取浏览器搜索结果...');
    const result = await fetchBrowserDataFromAi(query);

    if (result.success && result.data) {
      const data = result.data as BrowserDataState;
      browserState.data = data;
      browserState.loaded = true;
      console.info('[Store] 浏览器数据加载成功:', data);

      // 保存到酒馆楼层
      await saveToTavernMessage('browser', data);
    } else {
      browserState.error = result.error || '获取浏览器数据失败';
      console.error('[Store] 浏览器数据加载失败:', result.error);
    }
  } catch (e) {
    browserState.error = e instanceof Error ? e.message : '加载浏览器数据时发生未知错误';
    console.error('[Store] 浏览器数据加载异常:', e);
  } finally {
    browserState.isLoading = false;
  }
}

/** 重置浏览器数据 */
export function resetBrowserData(): void {
  browserState.data = null;
  browserState.loaded = false;
  browserState.error = null;
}

// ========== 日历状态管理 ==========

/** 日历数据状态 */
export interface CalendarDataState {
  date: string;
  time: string;
  weekday: string;
  worldEvents?: any[];
  majorEvents?: any[];
  userEvents?: any[];
  characterEvents?: any[];
}

/** 日历状态 */
export interface CalendarState {
  isLoading: boolean;
  error: string | null;
  data: CalendarDataState | null;
  loaded: boolean;
}

/** 日历状态 */
export const calendarState = reactive<CalendarState>({
  isLoading: false,
  error: null,
  data: null,
  loaded: false,
});

/** 加载日历数据 - 优先从楼层历史读取，否则调用AI获取
 * @param forceRefresh 是否强制刷新（跳过历史读取，直接调用AI）
 */
export async function loadCalendarDataFromAi(forceRefresh = false): Promise<void> {
  console.info('[Store] loadCalendarDataFromAi 被调用', forceRefresh ? '(强制刷新)' : '');

  if (calendarState.isLoading) {
    console.info('[Store] 日历数据正在加载中，跳过');
    return;
  }

  // 非强制刷新时，优先从楼层历史读取（使用异步版本避免阻塞）
  if (!forceRefresh) {
    const historyData = await loadModuleFromHistoryAsync<CalendarDataState>('calendar');
    if (historyData) {
      console.info('[Store] 从楼层历史加载日历数据');
      calendarState.data = historyData;
      calendarState.loaded = true;
      return;
    }
  }

  calendarState.isLoading = true;
  calendarState.error = null;

  try {
    const { fetchCalendarDataFromAi, loadApiConfig } = await import('./预设/aiService');

    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      calendarState.error = '请先在设置中配置 API';
      calendarState.isLoading = false;
      return;
    }

    console.info('[Store] 开始调用AI获取日历数据...');
    const result = await fetchCalendarDataFromAi();

    if (result.success && result.data) {
      const data = result.data as CalendarDataState;
      calendarState.data = data;
      calendarState.loaded = true;
      console.info('[Store] 日历数据加载成功:', data);

      // 保存到酒馆楼层
      await saveToTavernMessage('calendar', data);
    } else {
      calendarState.error = result.error || '获取日历数据失败';
      console.error('[Store] 日历数据加载失败:', result.error);
    }
  } catch (e) {
    calendarState.error = e instanceof Error ? e.message : '加载日历数据时发生未知错误';
    console.error('[Store] 日历数据加载异常:', e);
  } finally {
    calendarState.isLoading = false;
  }
}

/** 重置日历数据 */
export function resetCalendarData(): void {
  calendarState.data = null;
  calendarState.loaded = false;
  calendarState.error = null;
}
