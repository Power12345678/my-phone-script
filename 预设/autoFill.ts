/**
 * 自动填充工具函数
 * 用于在调用AI生成内容时自动填充预设中的各个部分
 */

import _ from 'lodash';
import stickersJson from '../数据/表情包.json';
import { loadModuleFromHistory } from '../store';

// ========== 表情包和图片库 ==========

/** 表情包类型 */
interface Sticker {
  name: string;
  url: string;
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

/** 获取表情包名称列表 */
function getStickerNames(): string[] {
  const stickers = stickersJson as Sticker[];
  return stickers.map(s => s.name);
}

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

/** 获取指定角色的图片名称列表 */
function getCharacterImageNames(characterName: string): string[] {
  const imageData = getCharacterImageData();
  const images = imageData[characterName];
  if (!images || !Array.isArray(images)) return [];
  return images.map(img => img.name);
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

/** 获取指定角色的直播图片名称列表 */
function getLiveImageNames(characterName: string): string[] {
  const imageData = getLiveImageData();
  const images = imageData[characterName];
  if (!images || !Array.isArray(images)) return [];
  return images.map(img => img.name);
}

// ========== 类型定义 ==========

/** 世界书条目标签解析结果 */
interface WorldbookEntryTag {
  /** 条目类型: 前置/后置 */
  type: 'before' | 'after';
  /** 变量路径 (如 "角色.好感度") */
  variablePath?: string;
  /** 范围条件 (如 "0-50" 或 ">30") */
  range?: string;
}

/** 人物世界书条目标签解析结果 */
interface CharacterEntryTag {
  /** 条目类型: 人物 */
  type: 'character';
  /** 人物姓名 */
  characterName: string;
  /** 变量路径 (如 "好感度") */
  variablePath?: string;
  /** 范围条件 (如 "0-50" 或 ">30") */
  range?: string;
}

/** 页面世界书条目标签解析结果 */
interface PageEntryTag {
  /** 条目类型: 页面 */
  type: 'page';
  /** 页面名称 */
  pageName: string;
  /** 变量路径 */
  variablePath?: string;
  /** 范围条件 */
  range?: string;
}

/** 标准页面名称映射 */
const PAGE_NAME_MAP: Record<string, string> = {
  '私聊': 'privateChat',
  '群聊': 'groupChat',
  '通话': 'voiceCall',
  '动态': 'dynamic',
  '动态主页': 'dynamicHome',
  '论坛': 'forum',
  '论坛帖子': 'forumPost',
  '直播列表': 'liveList',
  '直播': 'live',
  '地图': 'map',
  '邮箱': 'email',
  '浏览器': 'browser',
  '音乐': 'music',
  '日历': 'calendar',
  '日记': 'diary',
};

// ========== 基础数据类型定义 ==========

/** 用户信息 */
interface UserInfo {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  email: string;
  bio: string;
  state: string;
  phoneBg: string;
}

/** 角色信息 */
interface CharacterInfo {
  id: string;
  name: string;
  avatar: string;
  nickname: string;
  email: string;
  chatBg: string;
  dynamicBg: string;
  onlineStyle?: string;
}

/** 子地点 */
interface SubLocation {
  position: number;
  name: string;
  icon: string;
}

/** 地区 */
interface District {
  position: number;
  name: string;
  icon: string;
  subLocations: SubLocation[];
}

/** 地图数据 */
interface MapInfo {
  name: string;
  districts: District[];
}

/** 群聊信息 */
interface GroupInfo {
  id: string;
  name: string;
  avatar: string;
  mainMembers: string[];
  otherMembers: string;
  description: string;
  chatBg: string;
}

/** 手机数据 */
interface PhoneData {
  user: UserInfo;
  characters: CharacterInfo[];
  groups?: GroupInfo[];
  randomAvatars: string[];
  backgrounds: string[];
  map: MapInfo;
}

/** 预设块 */
interface PromptBlock {
  id: string;
  name: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  fixed: boolean;
  placeholder?: string;
}

/** 格式指导数据 */
interface FormatGuideData {
  privateChat: string;
  groupChat: string;
  voiceCall: string;
  dynamic: string;
  dynamicHome: string;
  browser: string;
  forum: string;
  forumPost: string;
  liveList: string;
  live: string;
  map: string;
  email: string;
  calendar: string;
  diary: string;
}

/** 对话历史配置 */
export interface HistoryConfig {
  /** 最大消息数量，0表示无上限 */
  maxMessages: number;
  /** 是否包含系统消息 */
  includeSystem: boolean;
}

/** 自动填充上下文 */
interface AutoFillContext {
  /** 当前界面类型 */
  currentView?: keyof FormatGuideData;
  /** 当前页面名称 (用于页面指导) */
  currentPage?: string;
  /** 当前角色名称 (角色卡名称) */
  characterName?: string;
  /** 目标人物列表 (当前操作涉及的人物姓名) */
  targetCharacters?: string[];
  /** 所有角色列表 (用于直播列表获取所有角色的直播图片) */
  allCharacters?: string[];
  /** 用户输入 */
  userInput?: string;
  /** 格式指导配置 */
  formatGuide?: FormatGuideData;
  /** 对话历史配置 */
  historyConfig?: HistoryConfig;
}

// ========== 基础数据获取与格式化 ==========

/**
 * 从角色变量获取手机基础数据
 */
export function getPhoneBaseData(): PhoneData | null {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data') as PhoneData | undefined;
    if (phoneData && phoneData.user && phoneData.characters) {
      return phoneData;
    }
  } catch (e) {
    console.warn('[AutoFill] 获取手机基础数据失败:', e);
  }
  return null;
}

/**
 * 格式化基础数据为提示词内容
 * 不包含头像、背景等图片URL
 */
export function formatBaseDataContent(): string {
  const phoneData = getPhoneBaseData();
  if (!phoneData) return '';

  const parts: string[] = [];

  // 用户数据
  const user = phoneData.user;
  // 如果用户姓名为空，使用酒馆中的 User 名字
  const userName = user.name || SillyTavern.name1 || '用户';
  parts.push(`【用户信息】
姓名: ${userName}
网名: ${user.nickname}
邮箱: ${user.email}
状态: ${user.state}
个人简介: ${user.bio}`);

  // 角色数据
  if (phoneData.characters && phoneData.characters.length > 0) {
    const charLines = phoneData.characters.map(char => {
      const lines = [`- ${char.name} (网名: ${char.nickname})`];
      if (char.email) lines.push(`  邮箱: ${char.email}`);
      if (char.onlineStyle) lines.push(`  线上风格: ${char.onlineStyle.trim()}`);
      return lines.join('\n');
    });
    parts.push(`【角色列表】\n${charLines.join('\n')}`);
  }

  // 地图数据
  if (phoneData.map && phoneData.map.districts) {
    const mapLines = phoneData.map.districts.map(district => {
      const subLocs = district.subLocations && district.subLocations.length > 0
        ? district.subLocations.map(sub => sub.name).join('、')
        : '';
      return subLocs
        ? `- ${district.name}: ${subLocs}`
        : `- ${district.name}`;
    });
    parts.push(`【地图: ${phoneData.map.name}】\n${mapLines.join('\n')}`);
  }

  // 群聊数据
  if (phoneData.groups && phoneData.groups.length > 0) {
    const groupLines = phoneData.groups.map(group => {
      const lines = [`- ${group.name}`];
      if (group.mainMembers && group.mainMembers.length > 0) {
        lines.push(`  重要成员: ${group.mainMembers.join('、')}`);
      }
      if (group.otherMembers) {
        lines.push(`  其他成员: ${group.otherMembers}`);
      }
      if (group.description) {
        lines.push(`  简介: ${group.description}`);
      }
      return lines.join('\n');
    });
    parts.push(`【群聊列表】\n${groupLines.join('\n')}`);
  }

  return parts.join('\n\n');
}

// ========== 世界书条目解析 ==========

/**
 * 解析世界书条目标题中的标签
 * 支持格式:
 * - <前置>
 * - <前置|变量路径>
 * - <前置|变量路径|范围>
 * - <后置>
 * - <后置|变量路径>
 * - <后置|变量路径|范围>
 *
 * @param title 世界书条目标题
 * @returns 解析结果，如果不是有效标签则返回 null
 */
export function parseWorldbookEntryTag(title: string): WorldbookEntryTag | null {
  // 匹配 <前置...> 或 <后置...> 格式
  const match = title.match(/<(前置|后置)(?:\|([^|>]+))?(?:\|([^>]+))?>/);
  if (!match) return null;

  const [, typeStr, variablePath, range] = match;

  return {
    type: typeStr === '前置' ? 'before' : 'after',
    variablePath: variablePath?.trim(),
    range: range?.trim(),
  };
}

/**
 * 解析世界书条目标题中的人物标签
 * 支持格式:
 * - <人物|姓名>
 * - <人物|姓名|变量路径>
 * - <人物|姓名|变量路径|范围>
 *
 * @param title 世界书条目标题
 * @returns 解析结果，如果不是有效标签则返回 null
 */
export function parseCharacterEntryTag(title: string): CharacterEntryTag | null {
  // 匹配 <人物|姓名...> 格式
  const match = title.match(/<人物\|([^|>]+)(?:\|([^|>]+))?(?:\|([^>]+))?>/);
  if (!match) return null;

  const [, characterName, variablePath, range] = match;

  return {
    type: 'character',
    characterName: characterName.trim(),
    variablePath: variablePath?.trim(),
    range: range?.trim(),
  };
}

/**
 * 解析世界书条目标题中的页面标签
 * 支持格式:
 * - <页面|页面名>
 * - <页面|页面名|变量路径>
 * - <页面|页面名|变量路径|范围>
 *
 * @param title 世界书条目标题
 * @returns 解析结果，如果不是有效标签则返回 null
 */
export function parsePageEntryTag(title: string): PageEntryTag | null {
  // 匹配 <页面|页面名...> 格式
  const match = title.match(/<页面\|([^|>]+)(?:\|([^|>]+))?(?:\|([^>]+))?>/);
  if (!match) return null;

  const [, pageName, variablePath, range] = match;

  return {
    type: 'page',
    pageName: pageName.trim(),
    variablePath: variablePath?.trim(),
    range: range?.trim(),
  };
}

/**
 * 检查范围条件是否满足
 * 支持格式:
 * - "0-50": 范围 0 到 50
 * - ">30": 大于 30
 * - ">=30": 大于等于 30
 * - "<30": 小于 30
 * - "<=30": 小于等于 30
 * - "=30": 等于 30
 *
 * @param value 实际值
 * @param range 范围表达式
 * @returns 是否满足范围条件
 */
export function checkRange(value: number, range: string): boolean {
  // 范围格式: "0-50"
  const rangeMatch = range.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const [, min, max] = rangeMatch;
    return value >= parseFloat(min) && value <= parseFloat(max);
  }

  // 比较格式: ">30", ">=30", "<30", "<=30", "=30"
  const compareMatch = range.match(/^(>=?|<=?|=)\s*(-?\d+(?:\.\d+)?)$/);
  if (compareMatch) {
    const [, operator, numStr] = compareMatch;
    const num = parseFloat(numStr);
    switch (operator) {
      case '>': return value > num;
      case '>=': return value >= num;
      case '<': return value < num;
      case '<=': return value <= num;
      case '=': return value === num;
    }
  }

  // 无法解析则默认满足
  console.warn(`[AutoFill] 无法解析范围表达式: ${range}`);
  return true;
}

/**
 * 检查世界书条目是否应该被包含
 *
 * @param tag 解析后的标签
 * @param variables 变量表
 * @returns 是否应该包含该条目
 */
export function shouldIncludeEntry(tag: WorldbookEntryTag, variables: Record<string, any>): boolean {
  // 没有变量条件，直接包含
  if (!tag.variablePath) return true;

  // 获取变量值
  const value = _.get(variables, tag.variablePath);

  // 变量不存在，不包含
  if (value === undefined || value === null) {
    return false;
  }

  // 没有范围条件，只要变量存在就包含
  if (!tag.range) return true;

  // 检查范围条件
  if (typeof value === 'number') {
    return checkRange(value, tag.range);
  }

  // 非数值类型，无法检查范围
  console.warn(`[AutoFill] 变量 ${tag.variablePath} 不是数值类型，无法检查范围`);
  return true;
}

/**
 * 检查人物世界书条目是否应该被包含
 *
 * @param tag 解析后的人物标签
 * @param targetCharacters 目标人物列表
 * @param variables 变量表
 * @returns 是否应该包含该条目
 */
export function shouldIncludeCharacterEntry(
  tag: CharacterEntryTag,
  targetCharacters: string[],
  variables: Record<string, any>,
): boolean {
  // 检查人物是否在目标列表中
  if (!targetCharacters.includes(tag.characterName)) {
    return false;
  }

  // 没有变量条件，直接包含
  if (!tag.variablePath) return true;

  // 获取变量值
  const value = _.get(variables, tag.variablePath);

  // 变量不存在，不包含
  if (value === undefined || value === null) {
    return false;
  }

  // 没有范围条件，只要变量存在就包含
  if (!tag.range) return true;

  // 检查范围条件
  if (typeof value === 'number') {
    return checkRange(value, tag.range);
  }

  // 非数值类型，无法检查范围
  console.warn(`[AutoFill] 变量 ${tag.variablePath} 不是数值类型，无法检查范围`);
  return true;
}

/**
 * 检查页面世界书条目是否应该被包含
 *
 * @param tag 解析后的页面标签
 * @param currentPage 当前页面名称
 * @param variables 变量表
 * @returns 是否应该包含该条目
 */
export function shouldIncludePageEntry(
  tag: PageEntryTag,
  currentPage: string,
  variables: Record<string, any>,
): boolean {
  // 将中文页面名转换为英文键名进行比较
  const tagPageKey = PAGE_NAME_MAP[tag.pageName] || tag.pageName;
  const currentPageKey = PAGE_NAME_MAP[currentPage] || currentPage;

  // 检查页面是否匹配
  if (tagPageKey !== currentPageKey) {
    return false;
  }

  // 没有变量条件，直接包含
  if (!tag.variablePath) return true;

  // 获取变量值
  const value = _.get(variables, tag.variablePath);

  // 变量不存在，不包含
  if (value === undefined || value === null) {
    return false;
  }

  // 没有范围条件，只要变量存在就包含
  if (!tag.range) return true;

  // 检查范围条件
  if (typeof value === 'number') {
    return checkRange(value, tag.range);
  }

  // 非数值类型，无法检查范围
  console.warn(`[AutoFill] 变量 ${tag.variablePath} 不是数值类型，无法检查范围`);
  return true;
}

// ========== 世界书内容获取 ==========

/**
 * 从角色卡绑定的世界书中获取前置/后置内容
 * 注意：不检查条目的 enabled 状态，无论条目在酒馆中是否开启都会被填充
 * 只要标签正确（<前置>或<后置>）且变量条件满足即可
 *
 * @param type 'before' | 'after'
 * @param variables 变量表（用于条件判断）
 * @returns 世界书内容数组
 */
export async function getWorldbookContent(
  type: 'before' | 'after',
  variables: Record<string, any> = {},
): Promise<string[]> {
  // 收集符合条件的条目（包含 order 用于排序）
  const matchedEntries: Array<{ order: number; content: string }> = [];

  try {
    // 获取角色卡绑定的世界书
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookNames: string[] = [];

    if (charWorldbooks.primary) {
      worldbookNames.push(charWorldbooks.primary);
    }
    worldbookNames.push(...charWorldbooks.additional);

    // 遍历所有世界书
    for (const worldbookName of worldbookNames) {
      try {
        const entries = await getWorldbook(worldbookName);

        // 调试日志：显示读取到的所有条目及其 enabled 状态
        console.info(`[AutoFill] 世界书 "${worldbookName}" 共 ${entries.length} 个条目:`,
          entries.map(e => ({ name: e.name, enabled: e.enabled })));

        for (const entry of entries) {
          // 解析标题标签
          const tag = parseWorldbookEntryTag(entry.name);
          if (!tag) continue;

          // 检查类型是否匹配
          if (tag.type !== type) continue;

          // 检查条件是否满足
          if (!shouldIncludeEntry(tag, variables)) continue;

          // 注意：不检查 entry.enabled，无论条目在酒馆中是否开启都会被填充
          // 只要标签正确且变量条件满足即可

          // 添加到匹配列表
          if (entry.content.trim()) {
            matchedEntries.push({
              order: entry.position.order,
              content: entry.content,
            });
            console.info(`[AutoFill] 匹配条目: "${entry.name}" (enabled=${entry.enabled})`);
          }
        }
      } catch (e) {
        console.warn(`[AutoFill] 读取世界书 "${worldbookName}" 失败:`, e);
      }
    }
  } catch (e) {
    console.error('[AutoFill] 获取世界书内容失败:', e);
  }

  // 按 order 排序后返回内容
  return _.sortBy(matchedEntries, 'order').map(e => e.content);
}

/**
 * 获取前置世界书内容
 */
export async function getBeforeWorldbookContent(variables?: Record<string, any>): Promise<string> {
  const parts: string[] = [];

  // 首先添加基础数据
  const baseDataContent = formatBaseDataContent();
  if (baseDataContent) {
    parts.push(baseDataContent);
  }

  // 然后添加世界书内容
  const contents = await getWorldbookContent('before', variables);
  if (contents.length > 0) {
    parts.push(...contents);
  }

  return parts.join('\n\n');
}

/**
 * 获取后置世界书内容
 */
export async function getAfterWorldbookContent(variables?: Record<string, any>): Promise<string> {
  const contents = await getWorldbookContent('after', variables);
  return contents.join('\n\n');
}

/**
 * 从角色卡绑定的世界书中获取页面指导内容
 * 注意：不检查条目的 enabled 状态，无论条目在酒馆中是否开启都会被填充
 * 只要标签正确（<页面|页面名>）且变量条件满足即可
 *
 * @param currentPage 当前页面名称
 * @param variables 变量表（用于条件判断）
 * @returns 页面指导内容数组
 */
export async function getPageWorldbookContent(
  currentPage: string,
  variables: Record<string, any> = {},
): Promise<string[]> {
  // 收集符合条件的条目（包含 order 用于排序）
  const matchedEntries: Array<{ order: number; content: string }> = [];

  if (!currentPage) return [];

  try {
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookNames: string[] = [];

    if (charWorldbooks.primary) {
      worldbookNames.push(charWorldbooks.primary);
    }
    worldbookNames.push(...charWorldbooks.additional);

    for (const worldbookName of worldbookNames) {
      try {
        const entries = await getWorldbook(worldbookName);

        for (const entry of entries) {
          const tag = parsePageEntryTag(entry.name);
          if (!tag) continue;

          if (!shouldIncludePageEntry(tag, currentPage, variables)) continue;

          // 注意：不检查 entry.enabled，无论条目在酒馆中是否开启都会被填充
          // 只要标签正确且变量条件满足即可

          if (entry.content.trim()) {
            matchedEntries.push({
              order: entry.position.order,
              content: entry.content,
            });
            console.info(`[AutoFill] 页面条目匹配: "${entry.name}" (enabled=${entry.enabled})`);
          }
        }
      } catch (e) {
        console.warn(`[AutoFill] 读取世界书 "${worldbookName}" 失败:`, e);
      }
    }
  } catch (e) {
    console.error('[AutoFill] 获取页面世界书内容失败:', e);
  }

  // 按 order 排序后返回内容
  return _.sortBy(matchedEntries, 'order').map(e => e.content);
}

/**
 * 获取格式化的页面指导内容
 */
export async function getFormattedPageGuide(
  currentPage: string,
  variables?: Record<string, any>,
): Promise<string> {
  if (!currentPage) return '';

  const contents = await getPageWorldbookContent(currentPage, variables || {});
  if (contents.length === 0) return '';

  return `# 页面指导\n\n${contents.join('\n\n')}`;
}

/**
 * 从角色卡绑定的世界书中获取人物指导内容
 * 只包含目标人物列表中的人物条目
 * 注意：不检查条目的 enabled 状态，无论条目在酒馆中是否开启都会被填充
 * 只要标签正确（<人物|姓名>）且变量条件满足即可
 *
 * @param targetCharacters 目标人物列表
 * @param variables 变量表（用于条件判断）
 * @returns 人物指导内容（按人物分组）
 */
export async function getCharacterWorldbookContent(
  targetCharacters: string[],
  variables: Record<string, any> = {},
): Promise<Map<string, string[]>> {
  // 收集符合条件的条目（包含 order 用于排序）
  const characterEntries = new Map<string, Array<{ order: number; content: string }>>();

  // 初始化每个目标人物的条目数组
  for (const name of targetCharacters) {
    characterEntries.set(name, []);
  }

  try {
    // 获取角色卡绑定的世界书
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookNames: string[] = [];

    if (charWorldbooks.primary) {
      worldbookNames.push(charWorldbooks.primary);
    }
    worldbookNames.push(...charWorldbooks.additional);

    // 遍历所有世界书
    for (const worldbookName of worldbookNames) {
      try {
        const entries = await getWorldbook(worldbookName);

        for (const entry of entries) {
          // 解析人物标签
          const tag = parseCharacterEntryTag(entry.name);
          if (!tag) continue;

          // 检查条件是否满足
          if (!shouldIncludeCharacterEntry(tag, targetCharacters, variables)) continue;

          // 注意：不检查 entry.enabled，无论条目在酒馆中是否开启都会被填充
          // 只要标签正确且变量条件满足即可

          // 添加到对应人物的条目列表
          if (entry.content.trim()) {
            const entryList = characterEntries.get(tag.characterName) || [];
            entryList.push({
              order: entry.position.order,
              content: entry.content,
            });
            characterEntries.set(tag.characterName, entryList);
            console.info(`[AutoFill] 人物条目匹配: "${entry.name}" (enabled=${entry.enabled})`);
          }
        }
      } catch (e) {
        console.warn(`[AutoFill] 读取世界书 "${worldbookName}" 失败:`, e);
      }
    }
  } catch (e) {
    console.error('[AutoFill] 获取人物世界书内容失败:', e);
  }

  // 按 order 排序后转换为内容数组
  const characterContents = new Map<string, string[]>();
  for (const [name, entryList] of characterEntries) {
    characterContents.set(name, _.sortBy(entryList, 'order').map(e => e.content));
  }

  return characterContents;
}

/**
 * 获取格式化的人物指导内容
 *
 * @param targetCharacters 目标人物列表
 * @param variables 变量表
 * @returns 格式化的人物指导字符串
 */
export async function getFormattedCharacterGuide(
  targetCharacters: string[],
  variables?: Record<string, any>,
): Promise<string> {
  if (!targetCharacters || targetCharacters.length === 0) {
    return '';
  }

  const characterContents = await getCharacterWorldbookContent(
    targetCharacters,
    variables || {},
  );

  const parts: string[] = [];

  for (const [characterName, contents] of characterContents) {
    if (contents.length > 0) {
      parts.push(`## ${characterName}\n\n${contents.join('\n\n')}`);
    }
  }

  if (parts.length === 0) {
    return '';
  }

  return `# 人物指导\n\n${parts.join('\n\n---\n\n')}`;
}

// ========== 对话历史格式化 ==========

/**
 * 获取格式化的对话历史
 *
 * @param options 配置选项，支持 number（向后兼容）或 HistoryConfig 对象
 * @returns 格式化的对话历史字符串
 */
export function getFormattedChatHistory(options: number | HistoryConfig = 100): string {
  try {
    // 兼容旧的数字参数
    const config: HistoryConfig = typeof options === 'number'
      ? { maxMessages: options, includeSystem: false }
      : options;

    // 使用正确的 range 参数格式获取消息
    const allMessages = getChatMessages(`0-{{lastMessageId}}`);

    // 过滤系统消息
    let messages = allMessages;
    if (!config.includeSystem) {
      messages = allMessages.filter(msg => msg.role !== 'system');
    }

    // 获取最近N条消息 (0表示无上限)
    const limit = config.maxMessages === 0 ? messages.length : config.maxMessages;
    const recentMessages = messages.slice(-limit);

    const formatted = recentMessages.map(msg => {
      // 使用 role 属性判断是否为用户消息
      let role: string;
      if (msg.role === 'user') {
        role = '用户';
      } else if (msg.role === 'system') {
        role = '系统';
      } else {
        role = msg.name || 'AI';
      }
      // 使用 message 属性获取消息内容
      const content = msg.message.trim();
      return `【${role}】\n${content}`;
    });

    return formatted.join('\n\n---\n\n');
  } catch (e) {
    console.error('[AutoFill] 获取对话历史失败:', e);
    return '';
  }
}

// ========== 角色指导 ==========

/**
 * 获取角色指导内容
 * 从角色卡的描述、人格等信息中提取
 *
 * @param characterName 角色名称
 * @returns 角色指导内容
 */
export function getCharacterGuide(characterName?: string): string {
  try {
    // 使用 getCharData 获取角色卡数据
    const char = getCharData('current');
    if (!char) return '';

    const parts: string[] = [];

    // 角色名称
    if (char.name) {
      parts.push(`## 角色: ${char.name}`);
    }

    // 角色描述
    if (char.description) {
      parts.push(`### 角色描述\n${char.description}`);
    }

    // 角色人格
    if (char.personality) {
      parts.push(`### 人格特征\n${char.personality}`);
    }

    // 场景
    if (char.scenario) {
      parts.push(`### 场景设定\n${char.scenario}`);
    }

    return parts.join('\n\n');
  } catch (e) {
    console.error('[AutoFill] 获取角色指导失败:', e);
    return '';
  }
}

// ========== 格式指导 ==========

/**
 * 获取表情包库说明
 */
function getStickerLibraryContent(): string {
  const stickerNames = getStickerNames();
  if (stickerNames.length === 0) return '';

  const nameList = stickerNames.join('、');
  return `## 表情包库

以下是可用的表情包名称列表，发送表情包消息时只需填写表情包名称，无需填写链接：
${nameList}

使用规则：
- 表情包消息的 c 字段填写表情包名称即可
- 系统会自动根据名称匹配对应的图片链接
- 只能使用上面给出的表情包，不要使用列表之外的表情包
- 尽量不要重复使用过去聊天中用过的表情包`;
}

/**
 * 获取人物图片库说明
 */
function getCharacterImageLibraryContent(targetCharacters: string[]): string {
  if (!targetCharacters || targetCharacters.length === 0) return '';

  const parts: string[] = [];

  // 添加通用图片库（始终附加）
  const commonImageNames = getCharacterImageNames('__common__');
  if (commonImageNames.length > 0) {
    const nameList = commonImageNames.join('、');
    parts.push(`### 通用图片库\n${nameList}`);
  }

  // 添加各角色的图片库
  for (const charName of targetCharacters) {
    const imageNames = getCharacterImageNames(charName);
    if (imageNames.length > 0) {
      const nameList = imageNames.join('、');
      parts.push(`### ${charName}的图片库\n${nameList}`);
    }
  }

  if (parts.length === 0) return '';

  return `## 人物图片库

以下是当前聊天对象的可用图片名称列表，发送图片消息时只需填写图片名称，无需填写链接：

${parts.join('\n\n')}

使用规则：
- 图片消息的 c 字段填写图片名称即可
- 系统会自动根据名称匹配对应的图片链接
- 也可以使用 imgdesc 类型描述图片内容，让系统生成描述性图片`;
}

/**
 * 获取直播图片库说明
 * @param targetCharacters 目标人物列表
 * @param isLiveRoom 是否是直播间（单人）还是直播列表（多人）
 */
function getLiveImageLibraryContent(targetCharacters: string[], isLiveRoom = false): string {
  const parts: string[] = [];

  // 添加通用直播图片库（始终附加）
  const commonImageNames = getLiveImageNames('__common__');
  if (commonImageNames.length > 0) {
    const nameList = commonImageNames.join('、');
    parts.push(`### 通用直播图片库\n${nameList}`);
  }

  // 添加各角色的直播图片库
  if (targetCharacters && targetCharacters.length > 0) {
    for (const charName of targetCharacters) {
      const imageNames = getLiveImageNames(charName);
      if (imageNames.length > 0) {
        const nameList = imageNames.join('、');
        parts.push(`### ${charName}的直播图片库\n${nameList}`);
      }
    }
  }

  if (parts.length === 0) return '';

  const desc = isLiveRoom
    ? '以下是当前主播的可用直播图片名称列表'
    : '以下是各主播的可用直播图片名称列表';

  return `## 直播图片库

${desc}，在直播内容中引用图片时只需填写图片名称：

${parts.join('\n\n')}

使用规则：
- image 字段填写图片名称即可
- 系统会自动根据名称匹配对应的图片链接`;
}

/**
 * 获取地图地点框架说明
 * 从角色变量中读取地图配置，生成地点列表
 */
function getMapLocationFramework(): string {
  const phoneData = getPhoneBaseData();
  if (!phoneData || !phoneData.map || !phoneData.map.districts) {
    return '';
  }

  const map = phoneData.map;
  const parts: string[] = [];

  parts.push(`## 地图地点框架

【重要】生成地图数据时，必须严格按照以下地点框架编写，不得自行创造新地点：

地图名称: ${map.name}`);

  // 生成地点列表
  const locationLines: string[] = [];
  for (const district of map.districts) {
    if (district.subLocations && district.subLocations.length > 0) {
      const subNames = district.subLocations.map(sub => sub.name).join('、');
      locationLines.push(`- ${district.name}（子地点：${subNames}）`);
    } else {
      locationLines.push(`- ${district.name}`);
    }
  }

  parts.push(`地点列表：
${locationLines.join('\n')}`);

  parts.push(`规则说明：
- locations 字段中的键名必须是上述地点列表中的地点名称
- characters 字段中的 location 值必须使用上述地点名称
- 如果角色在子地点，location 格式为"主地点/子地点"，如"学校/教室"
- 不要创造不存在的地点名称`);

  return parts.join('\n\n');
}

/**
 * 获取当前界面对应的格式指导（含资源库）
 *
 * @param currentView 当前界面类型
 * @param formatGuide 格式指导配置
 * @param targetCharacters 目标人物列表（用于获取人物图片库）
 * @param allCharacters 所有角色列表（用于直播列表获取所有角色的直播图片）
 * @returns 格式指导内容
 */
export function getFormatGuideWithResources(
  currentView: keyof FormatGuideData | undefined,
  formatGuide: FormatGuideData | undefined,
  targetCharacters?: string[],
  allCharacters?: string[],
): string {
  if (!currentView || !formatGuide) return '';

  const content = formatGuide[currentView];
  if (!content) return '';

  const parts: string[] = [];

  // 添加表情包库（聊天相关界面）
  if (currentView === 'privateChat' || currentView === 'groupChat') {
    const stickerContent = getStickerLibraryContent();
    if (stickerContent) {
      parts.push(stickerContent);
    }
  }

  // 添加人物图片库（私聊和群聊）
  if ((currentView === 'privateChat' || currentView === 'groupChat') && targetCharacters && targetCharacters.length > 0) {
    const imageContent = getCharacterImageLibraryContent(targetCharacters);
    if (imageContent) {
      parts.push(imageContent);
    }
  }

  // 添加直播图片库
  if (currentView === 'live') {
    // 直播间：只添加当前主播的图片
    if (targetCharacters && targetCharacters.length > 0) {
      const liveImageContent = getLiveImageLibraryContent(targetCharacters, true);
      if (liveImageContent) {
        parts.push(liveImageContent);
      }
    }
  } else if (currentView === 'liveList') {
    // 直播列表：添加所有角色的直播图片
    const chars = allCharacters || targetCharacters || [];
    if (chars.length > 0) {
      const liveImageContent = getLiveImageLibraryContent(chars, false);
      if (liveImageContent) {
        parts.push(liveImageContent);
      }
    }
  }

  // 添加地图地点框架（地图界面，仅当历史记录中有地图数据时）
  if (currentView === 'map') {
    const existingMapData = loadModuleFromHistory('map');
    // 检查历史记录中是否有地图数据（locations 不为空）
    const hasMapData = existingMapData &&
      existingMapData.locations &&
      Object.keys(existingMapData.locations).length > 0;

    if (hasMapData) {
      const mapFramework = getMapLocationFramework();
      if (mapFramework) {
        parts.push(mapFramework);
      }
    }
  }

  // 添加格式指导
  parts.push(`## 输出格式要求\n\n${content}`);

  return parts.join('\n\n');
}

/**
 * 获取当前界面对应的格式指导
 *
 * @param currentView 当前界面类型
 * @param formatGuide 格式指导配置
 * @returns 格式指导内容
 */
export function getFormatGuide(
  currentView: keyof FormatGuideData | undefined,
  formatGuide: FormatGuideData | undefined,
): string {
  if (!currentView || !formatGuide) return '';

  const content = formatGuide[currentView];
  if (!content) return '';

  return `## 输出格式要求\n\n${content}`;
}

// ========== 主要填充函数 ==========

/**
 * 自动填充预设块
 *
 * @param blocks 预设块数组
 * @param context 填充上下文
 * @returns 填充后的预设块数组
 */
export async function autoFillBlocks(
  blocks: PromptBlock[],
  context: AutoFillContext,
): Promise<PromptBlock[]> {
  // 获取变量用于条件判断 - 从最近楼层变量读取
  let variables: Record<string, any> = {};
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId >= 0) {
      variables = getVariables({ type: 'message', message_id: lastMessageId });
      console.info(`[AutoFill] 从楼层 ${lastMessageId} 读取变量`);
    }
  } catch (e) {
    console.warn('[AutoFill] 获取楼层变量失败:', e);
  }

  const filledBlocks = await Promise.all(
    blocks.map(async block => {
      const newBlock = { ...block };

      switch (block.id) {
        case 'worldbook-before':
          // 前置世界书
          newBlock.content = await getBeforeWorldbookContent(variables);
          break;

        case 'worldbook-after':
          // 后置世界书
          newBlock.content = await getAfterWorldbookContent(variables);
          break;

        case 'history':
          // 对话历史
          newBlock.content = getFormattedChatHistory(context.historyConfig || { maxMessages: 100, includeSystem: false });
          break;

        case 'character':
          // 角色指导 - 包含角色卡基本信息和人物世界书内容
          {
            const parts: string[] = [];

            // 获取角色卡基本信息
            const cardGuide = getCharacterGuide(context.characterName);
            if (cardGuide) {
              parts.push(cardGuide);
            }

            // 获取人物世界书内容（根据目标人物列表）
            if (context.targetCharacters && context.targetCharacters.length > 0) {
              const characterGuide = await getFormattedCharacterGuide(
                context.targetCharacters,
                variables,
              );
              if (characterGuide) {
                parts.push(characterGuide);
              }
            }

            newBlock.content = parts.join('\n\n');
          }
          break;

        case 'page':
          // 页面指导
          if (context.currentPage) {
            newBlock.content = await getFormattedPageGuide(context.currentPage, variables);
          }
          break;

        case 'format':
          // 格式指导（含表情包库和人物图片库）
          newBlock.content = getFormatGuideWithResources(
            context.currentView,
            context.formatGuide,
            context.targetCharacters,
            context.allCharacters,
          );
          break;

        case 'input':
          // 用户输入
          if (context.userInput) {
            newBlock.content = context.userInput;
          }
          break;
      }

      return newBlock;
    }),
  );

  return filledBlocks;
}

/**
 * 将填充后的预设块转换为消息数组（用于API调用）
 *
 * @param blocks 填充后的预设块
 * @returns 消息数组
 */
export function blocksToMessages(blocks: PromptBlock[]): Array<{ role: string; content: string }> {
  return blocks
    .filter(block => block.content.trim()) // 过滤空内容
    .map(block => ({
      role: block.role,
      content: block.content,
    }));
}

// ========== 导出默认对象 ==========

export default {
  parseWorldbookEntryTag,
  parseCharacterEntryTag,
  parsePageEntryTag,
  checkRange,
  shouldIncludeEntry,
  shouldIncludeCharacterEntry,
  shouldIncludePageEntry,
  getWorldbookContent,
  getBeforeWorldbookContent,
  getAfterWorldbookContent,
  getPageWorldbookContent,
  getFormattedPageGuide,
  getCharacterWorldbookContent,
  getFormattedCharacterGuide,
  getFormattedChatHistory,
  getCharacterGuide,
  getFormatGuide,
  getFormatGuideWithResources,
  autoFillBlocks,
  blocksToMessages,
  PAGE_NAME_MAP,
};
