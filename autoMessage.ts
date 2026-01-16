/**
 * 自动回复模块 - 监听AI输出并触发手机消息生成
 * 复用 aiService 中已有的功能
 */
import YAML from 'yaml';
import _ from 'lodash';
import { saveToTavernMessage, saveCharacterModuleToMessage } from './store';
import { showGenerating, showSuccess, showError } from './autoMessageNotification';
import { initAddFriend } from './addFriend';
import { getDisplaySettings } from './apps/Settings/composables/useDisplaySettings';

// 调试开关
const DEBUG = true;

function debug(...args: unknown[]) {
  if (DEBUG) {
    console.log('[AutoMessage]', ...args);
  }
}

function debugWarn(...args: unknown[]) {
  if (DEBUG) {
    console.warn('[AutoMessage]', ...args);
  }
}

// 应用类型
type AppType = 'private_chat' | 'group_chat' | 'dynamic' | 'live_list';

// 发送消息命令接口
interface SendMessageCommand {
  app: AppType;
  sender: string;
  reason: string;
  content: string;
  group?: string;
}

// 应用名称映射
const APP_NAMES: Record<AppType, string> = {
  private_chat: '私聊',
  group_chat: '群聊',
  dynamic: '动态',
  live_list: '直播',
};

// 已处理的消息ID集合（防重复）
const processedMessageIds = new Set<number>();

/**
 * 修复 YAML 中未引用的特殊字符串值
 */
function fixYamlContent(content: string): string {
  const lines = content.split('\n');
  const fixedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      fixedLines.push(line);
      continue;
    }

    // 匹配 key: value 格式
    const match = line.match(/^(\s*)([\w\u4e00-\u9fa5]+):\s*(.*)$/);
    if (match) {
      const [, indent, key, value] = match;

      // 如果值为空或已经被引号包裹，跳过
      if (!value || value.startsWith('"') || value.startsWith("'")) {
        fixedLines.push(line);
        continue;
      }

      // 检查是否包含需要引号的特殊字符
      const needsQuotes = /[\[\]{}:@#!|>&*?`]/.test(value) ||
                          /[\u4e00-\u9fa5].*[\[\]]/.test(value) ||
                          value.includes('://');

      if (needsQuotes) {
        // 转义值中的双引号
        const escapedValue = value.replace(/"/g, '\\"');
        fixedLines.push(`${indent}${key}: "${escapedValue}"`);
      } else {
        fixedLines.push(line);
      }
    } else {
      fixedLines.push(line);
    }
  }

  return fixedLines.join('\n');
}

/**
 * 清理并修复 YAML 内容
 */
function cleanYamlContent(rawContent: string): string {
  // 1. 去除首尾空白
  let content = rawContent.trim();

  // 2. 只保留有效的 YAML 行（key: value 格式）
  const validKeys = ['app', 'sender', 'reason', 'content', 'group'];
  const lines = content.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检查是否是有效的 key: value 格式
    const keyMatch = trimmed.match(/^([\w\u4e00-\u9fa5]+):\s*(.*)/);
    if (keyMatch) {
      const [, key, value] = keyMatch;
      // 只保留已知的字段
      if (validKeys.includes(key)) {
        // 处理值中的特殊字符
        let fixedValue = value;
        if (value && !value.startsWith('"') && !value.startsWith("'")) {
          // 检查是否需要引号
          if (/[\[\]{}:@#!|>&*?`]/.test(value) || value.includes('://')) {
            fixedValue = `"${value.replace(/"/g, '\\"')}"`;
          }
        }
        cleanedLines.push(`${key}: ${fixedValue}`);
      }
    }
  }

  return cleanedLines.join('\n');
}

/**
 * 解析消息中的发送命令
 */
function parseSendMessageCommands(text: string): SendMessageCommand[] {
  debug('开始解析消息，长度:', text.length);

  const regex = /<send_message>([\s\S]*?)<\/send_message>/g;
  const commands: SendMessageCommand[] = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    debug('找到 send_message 标签，原始内容:', match[1].substring(0, 100));
    try {
      // 清理并修复 YAML 内容
      const cleanedContent = cleanYamlContent(match[1]);
      debug('清理后的YAML:\n', cleanedContent);

      if (!cleanedContent) {
        debugWarn('清理后内容为空，跳过');
        continue;
      }

      const yaml = YAML.parse(cleanedContent);
      debug('YAML 解析结果:', yaml);

      if (yaml && yaml.sender) {
        commands.push({
          app: yaml.app || 'private_chat',
          sender: yaml.sender,
          reason: yaml.reason || '',
          content: yaml.content || '',
          group: yaml.group,
        });
      }
    } catch (e) {
      console.error('[AutoMessage] 解析send_message失败:', e);
      debug('失败的原始内容:', match[1]);
    }
  }

  debug('解析完成，共找到', commands.length, '条命令');
  return commands;
}

/**
 * 获取自动回复设置
 */
function getAutoReplySettings(): Record<AppType, boolean> {
  try {
    const chatVars = getVariables({ type: 'chat' }) || {};
    const settings = chatVars.autoReply?.settings || {
      private_chat: false,
      group_chat: false,
      dynamic: false,
      live_list: false,
    };
    debug('当前自动回复设置:', settings);
    return settings;
  } catch (e) {
    debugWarn('获取设置失败:', e);
    return { private_chat: false, group_chat: false, dynamic: false, live_list: false };
  }
}

/**
 * 处理私聊消息 - 复用 aiService
 */
async function handlePrivateChat(cmd: SendMessageCommand) {
  debug('处理私聊消息:', cmd.sender);
  const { fetchPrivateChatDataFromAi } = await import('./预设/aiService');

  // 构建提示：包含原因和大意
  const prompt = `${cmd.sender}主动发消息给用户，原因：${cmd.reason}，大意：${cmd.content}`;
  const result = await fetchPrivateChatDataFromAi(cmd.sender, [prompt]);
  debug('私聊AI返回:', result.success);

  if (!result.success || !result.data) {
    throw new Error(result.error || '私聊生成失败');
  }
  return result.data;
}

/**
 * 处理群聊消息 - 复用 aiService
 */
async function handleGroupChat(cmd: SendMessageCommand) {
  debug('处理群聊消息:', cmd.sender, '群:', cmd.group);
  const { fetchGroupChatDataFromAi } = await import('./预设/aiService');

  const groupName = cmd.group || '默认群聊';
  const prompt = `${cmd.sender}在群里发消息，原因：${cmd.reason}，大意：${cmd.content}`;
  const result = await fetchGroupChatDataFromAi(groupName, [cmd.sender], [prompt]);
  debug('群聊AI返回:', result.success);

  if (!result.success || !result.data) {
    throw new Error(result.error || '群聊生成失败');
  }
  return result.data;
}

/**
 * 处理动态消息 - 复用 aiService
 */
async function handleDynamic(cmd: SendMessageCommand) {
  debug('处理动态消息:', cmd.sender);
  const { fetchDynamicDataFromAi } = await import('./预设/aiService');

  const result = await fetchDynamicDataFromAi();
  debug('动态AI返回:', result.success);

  if (!result.success || !result.data) {
    throw new Error(result.error || '动态生成失败');
  }
  return result.data;
}

/**
 * 处理直播列表 - 复用 aiService
 */
async function handleLiveList(cmd: SendMessageCommand) {
  debug('处理直播列表:', cmd.sender);
  const { fetchLiveListDataFromAi } = await import('./预设/aiService');

  const result = await fetchLiveListDataFromAi();
  debug('直播列表AI返回:', result.success);

  if (!result.success || !result.data) {
    throw new Error(result.error || '直播列表生成失败');
  }
  return result.data;
}

/**
 * 处理单条发送命令
 */
async function handleSendMessage(cmd: SendMessageCommand) {
  debug('开始处理发送命令:', cmd);

  // 显示生成中通知
  const notificationId = showGenerating(cmd.app, cmd.sender);

  try {
    let data: any;

    switch (cmd.app) {
      case 'private_chat': {
        data = await handlePrivateChat(cmd);
        const chatData = { name: cmd.sender, ...data };
        const floorContent = `<chat_history target="${cmd.sender}" type="private">\n${YAML.stringify(chatData)}</chat_history>`;

        // 检查是否需要追加到最后楼层
        const displaySettings = getDisplaySettings();
        if (displaySettings.chatAppendToLastMessage) {
          const lastMessageId = getLastMessageId();
          if (lastMessageId >= 0) {
            const existingMessages = getChatMessages(String(lastMessageId));
            if (existingMessages && existingMessages.length > 0) {
              const originalMessage = existingMessages[0].message;
              const newMessage = originalMessage + '\n\n' + floorContent;
              await setChatMessages([{ message_id: lastMessageId, message: newMessage }]);
              break;
            }
          }
        }
        await createChatMessages([
          {
            role: 'assistant',
            message: floorContent,
            is_hidden: false,
          },
        ]);
        break;
      }
      case 'group_chat': {
        data = await handleGroupChat(cmd);
        const groupName = cmd.group || '默认群聊';
        const floorContent = `<chat_history target="${groupName}" type="group">\n${YAML.stringify({ name: groupName, ...data })}</chat_history>`;

        // 检查是否需要追加到最后楼层
        const displaySettings = getDisplaySettings();
        if (displaySettings.chatAppendToLastMessage) {
          const lastMessageId = getLastMessageId();
          if (lastMessageId >= 0) {
            const existingMessages = getChatMessages(String(lastMessageId));
            if (existingMessages && existingMessages.length > 0) {
              const originalMessage = existingMessages[0].message;
              const newMessage = originalMessage + '\n\n' + floorContent;
              await setChatMessages([{ message_id: lastMessageId, message: newMessage }]);
              break;
            }
          }
        }
        await createChatMessages([
          {
            role: 'assistant',
            message: floorContent,
            is_hidden: false,
          },
        ]);
        break;
      }
      case 'dynamic': {
        // 动态列表是普通模块，使用 saveToTavernMessage
        data = await handleDynamic(cmd);
        await saveToTavernMessage('dynamic', data);
        break;
      }
      case 'live_list': {
        // 直播列表是普通模块，使用 saveToTavernMessage
        data = await handleLiveList(cmd);
        await saveToTavernMessage('liveList', data);
        break;
      }
      default:
        debugWarn('未知的应用类型:', cmd.app);
        return;
    }

    debug('内容已保存到楼层');

    // 显示成功通知
    showSuccess(notificationId, cmd.app, cmd.sender);
  } catch (error) {
    console.error('[AutoMessage] 处理消息失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    showError(notificationId, errorMessage);
  }
}

/**
 * 处理AI生成结束事件（实际处理逻辑）
 */
async function doProcessGeneration(messageId: number) {
  // 获取设置
  const settings = getAutoReplySettings();
  const anyEnabled = Object.values(settings).some(v => v);

  if (!anyEnabled) {
    debug('所有应用都未启用，跳过');
    return;
  }

  // 获取最新消息内容（使用 -1 获取最新楼层）
  try {
    const messages = getChatMessages(-1);
    if (messages.length === 0) {
      debugWarn('未获取到消息内容');
      return;
    }

    const latestMessage = messages[0];
    debug('消息楼层:', latestMessage.message_id);
    debug('消息内容预览:', latestMessage.message?.substring(0, 200));

    // 解析命令
    const commands = parseSendMessageCommands(latestMessage.message || '');

    if (commands.length === 0) {
      debug('未检测到 send_message 命令');
      return;
    }

    debug('检测到发送命令数量:', commands.length);

    // 处理每条命令
    for (const cmd of commands) {
      if (!settings[cmd.app]) {
        debug(`跳过 ${cmd.app}，该应用未开启`);
        continue;
      }
      await handleSendMessage(cmd);
    }

    debug('=== 所有命令处理完成 ===');
  } catch (e) {
    console.error('[AutoMessage] 获取消息失败:', e);
  }
}

/**
 * 处理AI生成结束事件
 * 使用 setTimeout 延迟执行，避免阻塞酒馆主线程
 */
function onGenerationEnded(messageId: number) {
  debug('=== GENERATION_ENDED 事件触发 ===');
  debug('消息ID:', messageId);

  // 防重复处理
  if (processedMessageIds.has(messageId)) {
    debug('消息已处理过，跳过');
    return;
  }
  processedMessageIds.add(messageId);

  // 延迟执行，让酒馆先完成渲染，避免阻塞主线程
  setTimeout(() => {
    doProcessGeneration(messageId);
  }, 100);
}

/**
 * 初始化自动回复模块
 */
export function initAutoMessage() {
  console.log('[AutoMessage] ========================================');
  console.log('[AutoMessage] 初始化自动回复模块');
  console.log('[AutoMessage] 调试模式:', DEBUG ? '开启' : '关闭');

  // 监听酒馆AI生成结束事件
  eventOn(tavern_events.GENERATION_ENDED, onGenerationEnded);

  console.log('[AutoMessage] 已注册事件: tavern_events.GENERATION_ENDED');

  // 初始化加好友模块
  initAddFriend();
  console.log('[AutoMessage] 加好友模块已初始化');

  console.log('[AutoMessage] 初始化完成');
  console.log('[AutoMessage] ========================================');
}
