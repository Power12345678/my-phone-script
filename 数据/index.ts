/**
 * 数据加载模块
 * 负责从 YAML 文件加载和解析私聊/群聊数据
 */
import YAML from 'yaml';
import _ from 'lodash';
import type { ChatListItem, PrivateChat, GroupChat } from './schema';
import stickersJson from './表情包.json';
import defaultDataJson from './示例数据.json';
import { getDisplaySettings } from '../apps/Settings/composables/useDisplaySettings';

/** 通话数据类型 */
export interface CallYamlData {
  name: string;
  thought: string;
  content: string;
}

// ========== 类型定义 ==========

/** 角色基本信息 */
export interface CharacterInfo {
  id: string;
  name: string;
  avatar: string;
  nickname?: string;
  email?: string;
  chatBg?: string;
  dynamicBg?: string;
  onlineStyle?: string;
}

/** YAML 消息格式 */
export interface YamlMessage {
  t: 'text' | 'image' | 'imgdesc' | 'sticker' | 'link' | 'recalled' | 'voice' | 'transfer' | 'news' | 'location' | 'file' | 'call-ended' | 'transfer-accepted' | 'transfer-rejected' | 'poke';
  c?: string;
  time: string;
  date?: string;
  me?: boolean;
  sender?: {
    name: string;
    avatar: string;
  };
  audio?: string;
  title?: string;
  source?: string;
  preview?: string;
  url?: string;
  orig?: string;
  amt?: number;
  note?: string;
  transferTime?: string;
  publishDate?: string;
  views?: string;
  content?: string;
  keyData?: string;
  likes?: string;
  comments?: string;
  myLoc?: string;
  partnerLoc?: string;
  dist?: string;
  name?: string;
  size?: string;
  desc?: string;
  duration?: string;
}

/** YAML 私聊信息格式 */
export interface YamlPrivateChatInfo {
  name: string;
  date?: string;
  time?: string;
  emotion?: string;
  location?: string;
  state?: string;
  thought?: string;
}

/** YAML 消息列表格式 */
export interface YamlMessageList {
  messages?: YamlMessage[];
}

/** 楼层聊天记录（包含元数据） */
export interface FloorChatData {
  info: YamlPrivateChatInfo;
  messages: YamlMessage[];
  messageId: number;
}

/** YAML 群聊信息格式 */
export interface YamlGroupChatInfo {
  id: string;
  name: string;
  avatar: string;
  members: number;
  date?: string;
  time?: string;
}

/** 群聊楼层数据（包含元数据） */
export interface FloorGroupChatData {
  info: YamlGroupChatInfo;
  messages: YamlMessage[];
  messageId: number;
}

/** YAML 基本信息格式 */
export interface YamlBasicInfo {
  characters: CharacterInfo[];
  randomAvatars?: string[];
}

// ========== 数据解析函数 ==========

/** 解析基本信息（从角色变量 phone_data 读取，无数据时使用示例数据） */
export function parseBasicInfo(): YamlBasicInfo {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData && Array.isArray(phoneData.characters)) {
      return {
        characters: phoneData.characters,
        randomAvatars: phoneData.randomAvatars || [],
      };
    }
  } catch (e) {
    console.warn('[Data] 无法从角色变量读取基本信息:', e);
  }
  // 回退到示例数据
  console.info('[Data] 使用示例数据');
  return {
    characters: defaultDataJson.characters || [],
    randomAvatars: defaultDataJson.randomAvatars || [],
  };
}

/** 获取随机头像列表 */
export function getRandomAvatars(): string[] {
  return parseBasicInfo().randomAvatars || [];
}

/** 根据名称获取随机头像（基于名称哈希，保证同名同头像） */
export function getAvatarForName(name: string): string {
  const avatars = getRandomAvatars();
  if (avatars.length === 0) return '';
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatars[hash % avatars.length];
}

/** 根据名称获取头像：优先匹配角色，其次匹配用户，最后使用随机头像 */
export function getAvatarByName(name: string): string {
  // 优先匹配角色（支持姓名和网名）
  const character = findCharacterByName(name);
  if (character?.avatar) {
    return character.avatar;
  }
  // 其次匹配用户（支持姓名和网名）
  const user = findUserByName(name);
  if (user?.avatar) {
    return user.avatar;
  }
  // 最后使用随机头像
  return getAvatarForName(name);
}

/** 根据名称或网名查找角色信息 */
export function findCharacterByName(name: string): CharacterInfo | undefined {
  const { characters } = parseBasicInfo();
  // 优先匹配真实姓名，其次匹配网名
  return characters?.find(c => c.name === name) || characters?.find(c => c.nickname === name);
}

/** 根据名称或网名查找用户信息 */
export function findUserByName(name: string): { name: string; nickname?: string; avatar?: string } | undefined {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    const user = _.get(charVars, 'phone_data.user');
    if (user) {
      // 优先匹配用户姓名，其次匹配用户网名
      if (user.name === name || user.nickname === name) {
        return user;
      }
    }
  } catch (e) {
    console.warn('[Data] 无法读取用户信息:', e);
  }
  return undefined;
}

// ========== 表情包相关 ==========

/** 表情包类型 */
interface Sticker {
  name: string;
  url: string;
}

/** 表情包列表 */
const stickerList: Sticker[] = stickersJson as Sticker[];

/** 根据表情包名称获取URL */
export function getStickerUrlByName(name: string): string | null {
  const sticker = stickerList.find(s => s.name === name);
  return sticker?.url || null;
}

/** 判断是否是表情包名称（而非URL） */
export function isStickerName(content: string): boolean {
  // 如果是URL则返回false
  if (content.startsWith('http://') || content.startsWith('https://')) {
    return false;
  }
  // 检查是否在表情包列表中
  return stickerList.some(s => s.name === content);
}

/** 角色图片类型 */
interface CharacterImage {
  name: string;
  url: string;
}

/** 角色图片库数据类型 */
interface CharacterImageData {
  [characterName: string]: CharacterImage[];
}

const CHARACTER_IMAGES_KEY = 'phone_character_images';
const LIVE_IMAGES_KEY = 'phone_character_live_images';

/** 获取角色图片库 */
function getCharacterImageData(): CharacterImageData {
  try {
    const charVars = getVariables({ type: 'character' });
    const saved = _.get(charVars, CHARACTER_IMAGES_KEY) as CharacterImageData | undefined;
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

/** 根据图片名称获取URL（在所有角色的图片库中查找） */
export function getCharacterImageUrlByName(name: string): string | null {
  // 如果已经是URL，直接返回
  if (name.startsWith('http://') || name.startsWith('https://')) {
    return name;
  }
  const imageData = getCharacterImageData();
  for (const images of Object.values(imageData)) {
    const found = images.find(img => img.name === name);
    if (found) return found.url;
  }
  return null;
}

/** 获取直播图片库 */
function getLiveImageData(): CharacterImageData {
  try {
    const charVars = getVariables({ type: 'character' });
    const saved = _.get(charVars, LIVE_IMAGES_KEY) as CharacterImageData | undefined;
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

/** 根据图片名称获取直播图片URL（在所有角色的直播图片库中查找） */
export function getLiveImageUrlByName(name: string): string | null {
  // 如果为空，直接返回 null
  if (!name) return null;
  // 如果已经是URL，直接返回
  if (name.startsWith('http://') || name.startsWith('https://')) {
    return name;
  }
  const imageData = getLiveImageData();
  for (const images of Object.values(imageData)) {
    const found = images.find(img => img.name === name);
    if (found) return found.url;
  }
  return null;
}

/** 将 YAML 消息转换为内部消息格式 */
export function convertYamlMessage(msg: YamlMessage, index: number): any {
  const baseMessage: any = {
    id: `${index + 1}`,
    time: msg.time,
    isMe: msg.me ?? false,
  };

  if (msg.sender) {
    baseMessage.sender = {
      name: msg.sender.name,
      avatar: getAvatarByName(msg.sender.name),
    };
  }

  switch (msg.t) {
    case 'text':
      return { ...baseMessage, type: 'text', content: msg.c };
    case 'image':
      return { ...baseMessage, type: 'image', content: msg.c };
    case 'sticker':
      return { ...baseMessage, type: 'sticker', content: msg.c };
    case 'imgdesc':
      return { ...baseMessage, type: 'text-image', content: msg.c, description: msg.c };
    case 'voice':
      return { ...baseMessage, type: 'voice', duration: '0:15', voiceText: msg.c, audioFile: msg.audio };
    case 'transfer':
      return { ...baseMessage, type: 'transfer', amount: String(msg.amt || '0'), note: msg.note, transferTime: msg.transferTime };
    case 'location':
      return { ...baseMessage, type: 'location', partnerLocation: msg.partnerLoc, userLocation: msg.myLoc, distance: msg.dist };
    case 'recalled':
      return { ...baseMessage, type: 'recalled', originalContent: msg.orig };
    case 'news':
      return { ...baseMessage, type: 'news', title: msg.title, source: msg.source, publishDate: msg.publishDate, views: msg.views, likes: msg.likes, comments: msg.comments };
    case 'link':
      return { ...baseMessage, type: 'browser-share', title: msg.title, source: msg.source, description: msg.preview, url: msg.url };
    case 'file':
      return { ...baseMessage, type: 'file', filename: msg.name, filesize: msg.size, description: msg.desc };
    case 'call-ended':
      return { ...baseMessage, type: 'call-ended', duration: msg.duration || '0:00' };
    case 'transfer-accepted':
      return { ...baseMessage, type: 'transfer-accepted', amount: String(msg.amt || '0') };
    case 'transfer-rejected':
      return { ...baseMessage, type: 'transfer-rejected', amount: String(msg.amt || '0') };
    case 'poke':
      return { ...baseMessage, type: 'poke' };
    default:
      return { ...baseMessage, type: 'text', content: msg.c || '[未知消息]' };
  }
}

// ========== 数据导出 ==========

/** 根据消息类型生成预览文本 */
function getMessagePreview(msg: YamlMessage | undefined): string {
  if (!msg) return '暂无消息';

  switch (msg.t) {
    case 'text':
      return msg.c || '暂无消息';
    case 'image':
      return '[图片]';
    case 'imgdesc':
      return '[图片]';
    case 'sticker':
      return '[表情]';
    case 'voice':
      return '[语音]';
    case 'transfer':
      return '[转账]';
    case 'location':
      return '[位置]';
    case 'recalled':
      return '[消息已撤回]';
    case 'news':
      return '[新闻分享]';
    case 'link':
      return '[链接]';
    case 'file':
      return '[文件]';
    case 'call-ended':
      return '[通话结束]';
    case 'transfer-accepted':
      return '[已领取转账]';
    case 'transfer-rejected':
      return '[已拒绝转账]';
    default:
      return msg.c || '暂无消息';
  }
}

/** 获取通话数据（返回空默认值） */
export function getCallData(): CallYamlData | null {
  return null;
}

// ========== 从酒馆历史读取聊天记录 ==========

/** 聊天历史解析结果 */
export interface ChatHistoryResult {
  target: string;
  type: 'private' | 'group';
  messages: YamlMessage[];
  messageId: number; // 所在楼层ID
}

/**
 * 从酒馆历史楼层中读取所有聊天记录
 * 按 target 和 type 分组，返回每个聊天的最新一层消息
 * 根据设置的 historyReadCount 控制读取范围
 */
export function getChatHistoryFromTavern(): Map<string, ChatHistoryResult> {
  const result = new Map<string, ChatHistoryResult>();

  try {
    const lastMsgId = getLastMessageId();
    if (lastMsgId < 0) return result;

    // 获取读取设置，计算起始楼层
    const settings = getDisplaySettings();
    const historyReadCount = settings.historyReadCount;
    const startId = historyReadCount === 0 ? 0 : Math.max(0, lastMsgId - historyReadCount + 1);

    const messages = getChatMessages(`${startId}-${lastMsgId}`);
    if (!messages || messages.length === 0) return result;

    // 正则匹配 chat_history 标签
    const regex = /<chat_history\s+target="([^"]+)"\s+type="(private|group)"[^>]*>([\s\S]*?)<\/chat_history>/g;

    // 从最新楼层开始遍历，记录每个聊天的最新消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      let match;

      while ((match = regex.exec(msg.message)) !== null) {
        const target = match[1];
        const type = match[2] as 'private' | 'group';
        const yamlContent = match[3].trim();
        const key = `${type}:${target}`;

        // 只保留最新的一条（第一次遇到的）
        if (!result.has(key)) {
          try {
            const parsed = YAML.parse(yamlContent);
            if (parsed && parsed.messages && Array.isArray(parsed.messages)) {
              result.set(key, {
                target,
                type,
                messages: parsed.messages,
                messageId: msg.message_id,
              });
            }
          } catch (e) {
            console.warn(`[Data] 解析楼层 ${msg.message_id} 的聊天记录失败:`, e);
          }
        }
      }
      // 重置正则的 lastIndex
      regex.lastIndex = 0;
    }
  } catch (e) {
    console.error('[Data] 读取酒馆聊天历史失败:', e);
  }

  return result;
}

/**
 * 获取基于酒馆历史的聊天列表
 * 优先从聊天变量读取配置，否则回退到基本信息中的角色列表
 */
export function getChatListFromTavern(): ChatListItem[] {
  const items: ChatListItem[] = [];
  const basicInfo = parseBasicInfo();
  const characters = basicInfo.characters || [];

  // 从酒馆历史读取聊天记录
  const tavernHistory = getChatHistoryFromTavern();

  // 找出最新楼层ID（只有最新楼层的消息才算未读）
  let latestMessageId = -1;
  for (const history of tavernHistory.values()) {
    if (history.messageId > latestMessageId) {
      latestMessageId = history.messageId;
    }
  }

  // 读取角色变量中的私聊和群聊配置
  let charVars: any = {};
  try {
    charVars = getVariables({ type: 'character' }) || {};
  } catch (e) {
    console.warn('[Data] 无法读取角色变量:', e);
  }

  // 获取配置的私聊列表
  // 直接从 phone_data.characters 获取所有角色名
  let privateChats: string[] = [];
  if (characters.length > 0) {
    privateChats = characters.map(c => c.name);
  }
  console.info('[Data] privateChats 来源: phone_data.characters, 数量:', privateChats.length);

  // 获取配置的群聊列表（从角色变量）
  // 支持两种格式：对象数组 或 phone_data.groups
  let groupChats: Array<{ id?: string; name: string; avatar?: string }> = [];
  if (Array.isArray(charVars.phone_group_chats)) {
    groupChats = charVars.phone_group_chats;
  } else if (charVars.phone_data?.groups) {
    groupChats = charVars.phone_data.groups;
  }

  console.info('[Data] 聊天列表配置:', {
    privateChats,
    groupChats,
    tavernHistoryKeys: Array.from(tavernHistory.keys()),
    latestMessageId,
  });

  // 处理私聊
  for (const charName of privateChats) {
    const character = characters.find(c => c.name === charName);
    // 即使没有找到完整的角色信息也显示，使用默认值填充缺失的信息

    const key = `private:${charName}`;
    const history = tavernHistory.get(key);

    let preview = '暂无消息';
    let time = '00:00';
    let unread = 0;

    if (history && history.messages.length > 0) {
      const lastMsg = history.messages[history.messages.length - 1];
      preview = getMessagePreview(lastMsg);
      time = lastMsg.time || '00:00';
      // 只有最新楼层的消息才算未读
      if (history.messageId === latestMessageId) {
        unread = history.messages.length;
      }
    }

    items.push({
      id: character?.id || `char_${charName}`,
      type: 'single',
      name: charName,
      avatar: character?.avatar || getAvatarForName(charName),
      preview,
      time,
      unread,
    });
  }

  // 处理群聊
  for (const group of groupChats) {
    const key = `group:${group.name}`;
    const history = tavernHistory.get(key);

    let preview = '暂无消息';
    let time = '00:00';
    let unread = 0;

    if (history && history.messages.length > 0) {
      const lastMsg = history.messages[history.messages.length - 1];
      preview = getMessagePreview(lastMsg);
      time = lastMsg.time || '00:00';
      // 只有最新楼层的消息才算未读
      if (history.messageId === latestMessageId) {
        unread = history.messages.length;
      }
    }

    items.push({
      id: group.id || `group_${group.name}`,
      type: 'group',
      name: group.name,
      avatar: group.avatar || getAvatarForName(group.name),
      preview,
      time,
      unread,
    });
  }

  return items;
}

/**
 * 从酒馆历史读取指定私聊对象的全部聊天记录（带楼层元数据）
 * @param targetName 聊天对象名称
 * @param maxFloors 最大读取楼层数，默认100
 * @returns 按时间顺序排列的楼层数据数组
 */
export function getPrivateChatHistoryFromTavern(targetName: string, maxFloors = 100): FloorChatData[] {
  const floors: FloorChatData[] = [];

  try {
    const lastMsgId = getLastMessageId();
    if (lastMsgId < 0) return floors;

    // 获取读取设置，计算起始楼层
    const settings = getDisplaySettings();
    const historyReadCount = settings.historyReadCount;
    const startId = historyReadCount === 0 ? 0 : Math.max(0, lastMsgId - historyReadCount + 1);

    const messages = getChatMessages(`${startId}-${lastMsgId}`);
    if (!messages || messages.length === 0) return floors;

    const regex = new RegExp(
      `<chat_history\\s+target="${targetName}"\\s+type="private"[^>]*>([\\s\\S]*?)</chat_history>`,
      'g',
    );

    // 从最新楼层开始向上读取
    for (let i = messages.length - 1; i >= 0 && floors.length < maxFloors; i--) {
      const msg = messages[i];
      let match;

      // 收集当前楼层的所有消息块（保持正则匹配的从左到右顺序）
      const floorBlocks: FloorChatData[] = [];

      while ((match = regex.exec(msg.message)) !== null) {
        try {
          const yamlContent = match[1].trim();
          const parsed = YAML.parse(yamlContent);
          if (parsed?.messages && Array.isArray(parsed.messages)) {
            const floorData: FloorChatData = {
              info: {
                name: parsed.name || targetName,
                date: parsed.date,
                time: parsed.time,
                emotion: parsed.emotion,
                location: parsed.location,
                state: parsed.state,
                thought: parsed.thought,
              },
              messages: parsed.messages,
              messageId: i,
            };
            floorBlocks.push(floorData);
          }
        } catch (e) {
          console.warn(`[Data] 解析楼层 ${i} 的私聊记录失败:`, e);
        }
      }
      regex.lastIndex = 0;

      // 将当前楼层的所有消息块按正确顺序插入到结果数组前面
      // floorBlocks 已经是正确的从早到晚顺序，需要整体插入到 floors 前面
      floors.unshift(...floorBlocks);
    }

    const totalMessages = floors.reduce((sum, f) => sum + f.messages.length, 0);
    console.info(`[Data] 读取 ${targetName} 的私聊记录: ${floors.length} 层, ${totalMessages} 条消息`);
  } catch (e) {
    console.error('[Data] 读取私聊历史失败:', e);
  }

  return floors;
}

/**
 * 从酒馆历史读取指定群聊的全部聊天记录（带楼层元数据）
 * @param groupName 群聊名称
 * @param maxFloors 最大读取楼层数，默认100
 * @returns 按时间顺序排列的楼层数据数组
 */
export function getGroupChatHistoryFromTavern(groupName: string, maxFloors = 100): FloorGroupChatData[] {
  const floors: FloorGroupChatData[] = [];

  try {
    const lastMsgId = getLastMessageId();
    console.info(`[Data] 群聊历史 - lastMsgId: ${lastMsgId}, 群名: "${groupName}"`);
    if (lastMsgId < 0) return floors;

    // 获取读取设置，计算起始楼层
    const settings = getDisplaySettings();
    const historyReadCount = settings.historyReadCount;
    const startId = historyReadCount === 0 ? 0 : Math.max(0, lastMsgId - historyReadCount + 1);

    const messages = getChatMessages(`${startId}-${lastMsgId}`);
    if (!messages || messages.length === 0) return floors;

    // 更灵活的正则：支持 target 和 type 属性任意顺序
    const regex = new RegExp(
      `<chat_history[^>]*\\btype="group"[^>]*>([\\s\\S]*?)</chat_history>`,
      'g',
    );

    // 从最新楼层开始向上读取
    for (let i = messages.length - 1; i >= 0 && floors.length < maxFloors; i--) {
      const msg = messages[i];
      let match;

      // 收集当前楼层的所有消息块（保持正则匹配的从左到右顺序）
      const floorBlocks: FloorGroupChatData[] = [];

      while ((match = regex.exec(msg.message)) !== null) {
        // 检查 target 是否匹配
        const fullTag = msg.message.substring(match.index, match.index + match[0].indexOf('>') + 1);
        const targetMatch = fullTag.match(/target="([^"]+)"/);
        const target = targetMatch ? targetMatch[1] : '';

        if (target !== groupName) {
          continue;
        }

        try {
          const yamlContent = match[1].trim();
          const parsed = YAML.parse(yamlContent);
          if (parsed?.messages && Array.isArray(parsed.messages)) {
            const floorData: FloorGroupChatData = {
              info: {
                id: parsed.id || groupName,
                name: parsed.name || groupName,
                avatar: parsed.avatar || getAvatarForName(groupName),
                members: parsed.members || 0,
                date: parsed.date,
                time: parsed.time,
              },
              messages: parsed.messages,
              messageId: i,
            };
            floorBlocks.push(floorData);
            console.info(`[Data] 群聊历史 - 找到楼层 ${i}, 消息数: ${parsed.messages.length}`);
          }
        } catch (e) {
          console.warn(`[Data] 解析楼层 ${i} 的群聊记录失败:`, e);
        }
      }
      regex.lastIndex = 0;

      // 将当前楼层的所有消息块按正确顺序插入到结果数组前面
      floors.unshift(...floorBlocks);
    }

    const totalMessages = floors.reduce((sum, f) => sum + f.messages.length, 0);
    console.info(`[Data] 读取 ${groupName} 的群聊记录: ${floors.length} 层, ${totalMessages} 条消息`);
  } catch (e) {
    console.error('[Data] 读取群聊历史失败:', e);
  }

  return floors;
}
