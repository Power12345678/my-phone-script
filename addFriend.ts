/**
 * AI主动加好友模块
 * 解析AI输出中的 <add_friend> 标签，将新角色保存到角色变量中
 */
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import YAML from 'yaml';
import { getAvatarForName, parseBasicInfo, type CharacterInfo } from './数据';
import { showAddFriendSuccess } from './autoMessageNotification';

// ========== 类型定义 ==========

/** 加好友命令数据 */
export interface AddFriendCommand {
  /** 角色真实姓名 */
  姓名: string;
  /** 角色网名/昵称 */
  网名: string;
  /** 角色线上聊天风格描述 */
  线上聊天风格: string;
}

/** 加好友设置 */
export interface AddFriendSettings {
  /** 是否启用加好友功能 */
  enabled: boolean;
  /** 是否在添加好友后更新基本信息世界书条目 */
  updateBasicInfo: boolean;
}

// ========== 常量 ==========

const ADD_FRIEND_ENTRY_NAME = '[add_friend]AI主动加好友指令';
const BASIC_INFO_ENTRY_NAME = '[basic_info]角色与群聊信息';
const SETTINGS_KEY = 'addFriend';

// ========== 辅助函数 ==========

/** 获取随机背景列表 */
function getRandomBackgrounds(): string[] {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    const phoneData = _.get(charVars, 'phone_data') || {};
    return phoneData.backgrounds || [];
  } catch (e) {
    console.warn('[AddFriend] 获取背景列表失败:', e);
    return [];
  }
}

/** 根据名称获取随机背景（基于名称哈希，保证同名同背景） */
function getBackgroundForName(name: string, offset: number = 0): string {
  const backgrounds = getRandomBackgrounds();
  if (backgrounds.length === 0) return '';
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + offset;
  return backgrounds[hash % backgrounds.length];
}

// ========== 设置管理 ==========

/** 加载加好友设置 */
export function loadAddFriendSettings(): AddFriendSettings {
  try {
    const chatVars = getVariables({ type: 'chat' }) || {};
    const settings = _.get(chatVars, SETTINGS_KEY) as AddFriendSettings | undefined;
    return {
      enabled: settings?.enabled ?? false,
      updateBasicInfo: settings?.updateBasicInfo ?? true,
    };
  } catch (e) {
    console.warn('[AddFriend] 加载设置失败:', e);
    return { enabled: false, updateBasicInfo: true };
  }
}

/** 保存加好友设置 */
export function saveAddFriendSettings(settings: AddFriendSettings): void {
  try {
    insertOrAssignVariables({ [SETTINGS_KEY]: settings }, { type: 'chat' });
    console.info('[AddFriend] 设置已保存:', settings);
  } catch (e) {
    console.error('[AddFriend] 保存设置失败:', e);
  }
}

// ========== 解析功能 ==========

/**
 * 清理YAML内容，移除可能的说明文字
 * @param content 原始内容
 * @returns 清理后的YAML内容
 */
function cleanYamlContent(content: string): string {
  // 按行分割
  const lines = content.split('\n');
  const yamlLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过空行
    if (!trimmed) continue;

    // 检查是否是有效的YAML键值对（包含冒号）
    // 匹配模式: 键名: 值 或 键名:值
    if (/^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]*\s*[:：]/.test(trimmed)) {
      // 将中文冒号替换为英文冒号
      yamlLines.push(line.replace('：', ':'));
    }
  }

  return yamlLines.join('\n');
}

/**
 * 尝试使用正则表达式直接提取字段
 * @param content 原始内容
 * @returns 提取的字段对象，如果失败则返回null
 */
function extractFieldsWithRegex(content: string): AddFriendCommand | null {
  // 支持中英文冒号，同时支持"线上风格"和"线上聊天风格"
  const nameMatch = content.match(/姓名\s*[:：]\s*(.+?)(?:\n|$)/);
  const nicknameMatch = content.match(/网名\s*[:：]\s*(.+?)(?:\n|$)/);
  const styleMatch = content.match(/线上(?:聊天)?风格\s*[:：]\s*(.+?)(?:\n|$)/);

  if (nameMatch && nicknameMatch && styleMatch) {
    return {
      姓名: nameMatch[1].trim(),
      网名: nicknameMatch[1].trim(),
      线上聊天风格: styleMatch[1].trim(),
    };
  }

  return null;
}

/**
 * 解析AI输出中的 <add_friend> 标签
 * @param text AI输出的文本
 * @returns 解析到的加好友命令数组
 */
export function parseAddFriendCommands(text: string): AddFriendCommand[] {
  const commands: AddFriendCommand[] = [];
  const regex = /<add_friend>([\s\S]*?)<\/add_friend>/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawContent = match[1].trim();
    console.info('[AddFriend] 原始标签内容:', rawContent);

    // 首先尝试使用正则表达式直接提取字段
    const regexResult = extractFieldsWithRegex(rawContent);
    if (regexResult) {
      commands.push(regexResult);
      console.info('[AddFriend] 通过正则解析到加好友命令:', regexResult.姓名);
      continue;
    }

    // 如果正则失败，尝试清理后用YAML解析
    try {
      const cleanedContent = cleanYamlContent(rawContent);
      if (!cleanedContent) {
        console.warn('[AddFriend] 清理后内容为空，跳过');
        continue;
      }

      console.info('[AddFriend] 清理后的YAML内容:', cleanedContent);
      const parsed = YAML.parse(cleanedContent);

      // 验证必需字段（同时支持"线上风格"和"线上聊天风格"）
      const onlineStyle = parsed.线上聊天风格 || parsed.线上风格;
      if (parsed && parsed.姓名 && parsed.网名 && onlineStyle) {
        commands.push({
          姓名: String(parsed.姓名).trim(),
          网名: String(parsed.网名).trim(),
          线上聊天风格: String(onlineStyle).trim(),
        });
        console.info('[AddFriend] 通过YAML解析到加好友命令:', parsed.姓名);
      } else {
        console.warn('[AddFriend] 加好友命令缺少必需字段:', parsed);
      }
    } catch (e) {
      console.warn('[AddFriend] 解析加好友命令失败:', e);

      // 最后尝试：即使YAML解析失败，也尝试用正则从原始内容提取
      // 这是为了处理AI输出格式混乱的情况
      const fallbackResult = extractFieldsWithRegex(rawContent);
      if (fallbackResult) {
        commands.push(fallbackResult);
        console.info('[AddFriend] 通过备用正则解析到加好友命令:', fallbackResult.姓名);
      }
    }
  }

  return commands;
}

// ========== 保存功能 ==========

/**
 * 将新好友保存到角色变量中
 * @param command 加好友命令
 * @returns 是否保存成功
 */
export function saveNewFriend(command: AddFriendCommand): boolean {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    const phoneData = _.get(charVars, 'phone_data') || {};
    const characters: CharacterInfo[] = phoneData.characters || [];

    // 检查是否已存在同名角色
    const existingIndex = characters.findIndex(c => c.name === command.姓名 || c.nickname === command.网名);

    if (existingIndex >= 0) {
      console.info('[AddFriend] 角色已存在，更新信息:', command.姓名);
      // 更新现有角色信息（更新网名和线上聊天风格）
      characters[existingIndex] = {
        ...characters[existingIndex],
        nickname: command.网名,
        onlineStyle: command.线上聊天风格,
      };
    } else {
      // 添加新角色，随机分配头像和背景
      const newCharacter: CharacterInfo = {
        id: `char_${uuidv4().slice(0, 8)}`,
        name: command.姓名,
        nickname: command.网名,
        avatar: getAvatarForName(command.姓名), // 使用随机头像库
        chatBg: getBackgroundForName(command.姓名, 0), // 聊天背景
        dynamicBg: getBackgroundForName(command.姓名, 1), // 动态背景（使用不同偏移以获取不同背景）
        onlineStyle: command.线上聊天风格, // 线上聊天风格
      };
      characters.push(newCharacter);
      console.info('[AddFriend] 添加新角色:', command.姓名, '头像:', newCharacter.avatar, '聊天背景:', newCharacter.chatBg);
    }

    // 保存到角色变量
    const updatedPhoneData = {
      ...phoneData,
      characters,
    };
    insertOrAssignVariables({ phone_data: updatedPhoneData }, { type: 'character' });

    console.info('[AddFriend] 已保存角色到 phone_data.characters:', command.姓名);

    return true;
  } catch (e) {
    console.error('[AddFriend] 保存新好友失败:', e);
    return false;
  }
}

// ========== 世界书管理 ==========

/**
 * 检查加好友世界书条目是否存在
 */
export async function checkAddFriendEntryExists(): Promise<boolean> {
  try {
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookName = charWorldbooks.primary;
    if (!worldbookName) return false;

    const entries = await getWorldbook(worldbookName);
    return entries.some(entry => entry.name === ADD_FRIEND_ENTRY_NAME);
  } catch (e) {
    console.warn('[AddFriend] 检查世界书条目失败:', e);
    return false;
  }
}

/**
 * 获取加好友世界书条目内容
 */
export function getAddFriendEntryContent(): string {
  return `当剧情中{{user}}与某个新角色建立好友关系/互加联系方式/交换社交账号时，在回复末尾添加：

<add_friend>
姓名: 角色的真实姓名
网名: 角色在网络上使用的昵称
线上聊天风格: 描述该角色在网络社交中的风格特点，如说话方式、用语习惯、表情使用倾向等
</add_friend>

注意事项：
- 姓名必须是角色的真实姓名，不能是代称或描述
- 网名是角色在聊天应用中显示的名称
- 线上聊天风格应简洁描述角色的网络社交特点
- 只有在双方确认建立好友关系时才输出此标签
- 已经是好友的角色不需要重复输出`;
}

/**
 * 创建或删除加好友世界书条目
 */
export async function toggleAddFriendEntry(enable: boolean): Promise<boolean> {
  try {
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookName = charWorldbooks.primary;

    if (!worldbookName) {
      console.warn('[AddFriend] 未找到角色世界书');
      return false;
    }

    if (enable) {
      // 创建条目
      await createWorldbookEntries(worldbookName, [
        {
          name: ADD_FRIEND_ENTRY_NAME,
          enabled: true,
          strategy: { type: 'constant' },
          position: { type: 'at_depth', role: 'system', depth: 0, order: 110 },
          content: getAddFriendEntryContent(),
        },
      ]);
      console.info('[AddFriend] 已创建世界书条目');
    } else {
      // 删除条目
      await deleteWorldbookEntries(worldbookName, entry => entry.name === ADD_FRIEND_ENTRY_NAME);
      console.info('[AddFriend] 已删除世界书条目');
    }

    return true;
  } catch (e) {
    console.error('[AddFriend] 操作世界书条目失败:', e);
    return false;
  }
}

/**
 * 更新基本信息世界书条目（添加新角色后调用）
 */
export async function updateBasicInfoEntry(): Promise<boolean> {
  try {
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookName = charWorldbooks.primary;

    if (!worldbookName) {
      console.warn('[AddFriend] 未找到角色世界书');
      return false;
    }

    const entries = await getWorldbook(worldbookName);
    const basicInfoEntry = entries.find(entry => entry.name === BASIC_INFO_ENTRY_NAME);

    if (!basicInfoEntry) {
      console.info('[AddFriend] 基本信息条目不存在，跳过更新');
      return false;
    }

    // 重新生成基本信息内容
    const basicInfo = parseBasicInfo();
    const characters = basicInfo.characters || [];

    const characterList = characters.map(c => `- ${c.name}${c.nickname ? ` (${c.nickname})` : ''}`).join('\n');

    const newContent = `<basic_info>
当前已注册的角色列表：
${characterList || '暂无角色'}

这些角色可以出现在聊天、动态、论坛等手机应用中。
</basic_info>`;

    // 使用 updateWorldbookWith 更新条目内容
    await updateWorldbookWith(worldbookName, worldbook => {
      return worldbook.map(entry => {
        if (entry.name === BASIC_INFO_ENTRY_NAME) {
          return { ...entry, content: newContent };
        }
        return entry;
      });
    });

    console.info('[AddFriend] 已更新基本信息条目');
    return true;
  } catch (e) {
    console.error('[AddFriend] 更新基本信息条目失败:', e);
    return false;
  }
}

// ========== 事件处理 ==========

/**
 * AI生成结束时的处理函数
 * @param text AI输出的文本
 */
export async function onGenerationEndedForAddFriend(text: string): Promise<void> {
  const settings = loadAddFriendSettings();

  if (!settings.enabled) {
    return;
  }

  // 解析加好友命令
  const commands = parseAddFriendCommands(text);

  if (commands.length === 0) {
    return;
  }

  console.info('[AddFriend] 检测到加好友命令:', commands.length);

  let hasNewFriend = false;

  // 保存每个新好友
  for (const command of commands) {
    const success = saveNewFriend(command);
    if (success) {
      hasNewFriend = true;
      showAddFriendSuccess(command.姓名, command.网名);
    }
  }

  // 如果有新好友且设置了更新基本信息，则更新世界书条目
  if (hasNewFriend && settings.updateBasicInfo) {
    await updateBasicInfoEntry();
  }
}

/**
 * 初始化加好友模块
 * 注册事件监听器
 */
export function initAddFriend(): void {
  console.info('[AddFriend] 模块初始化');

  // 注册生成结束事件监听
  eventOn(tavern_events.GENERATION_ENDED, async () => {
    try {
      // 获取最新楼层的消息内容
      const lastMessageId = getLastMessageId();
      if (lastMessageId < 0) return;

      const messages = getChatMessages(String(lastMessageId));
      if (!messages || messages.length === 0) return;

      const lastMessage = messages[0];
      await onGenerationEndedForAddFriend(lastMessage.message);
    } catch (e) {
      console.error('[AddFriend] 处理生成结束事件失败:', e);
    }
  });
}
