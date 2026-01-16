/**
 * AI 调用服务
 * 用于调用 AI API 生成内容
 */

import yaml from 'yaml';
import _ from 'lodash';
import {
  autoFillBlocks,
  blocksToMessages,
  getFormatGuide,
  type HistoryConfig,
} from './autoFill';
import { getStickerUrlByName, getCharacterImageUrlByName } from '../数据/index';
import { getAbortController, resetAbortController } from '../store';
import defaultPresetJson from '../数据/默认预设.json';

// ========== 类型定义 ==========

/** API 配置 */
export interface ApiConfig {
  url: string;
  key: string;
  model: string;
  streaming: boolean;
  temperature: number;
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

/** 预设配置 */
interface PresetConfig {
  id: string;
  name: string;
  blocks: PromptBlock[];
  formatGuide?: FormatGuideData;
  historyConfig?: HistoryConfig;
  createdAt: number;
  updatedAt: number;
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

/** AI 请求消息 */
interface AiMessage {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

/** AI 响应 */
interface AiResponse {
  success: boolean;
  content: string;
  error?: string;
}

// ========== 工具函数 ==========

/**
 * 检查表情包或图片是否存在于库中
 * @param type 消息类型 (sticker/image)
 * @param content 内容（名称或URL）
 * @returns 是否有效
 */
function isMediaValid(type: string, content: string | undefined): boolean {
  if (!content) return false;

  // 如果是URL，认为有效
  if (content.startsWith('http://') || content.startsWith('https://')) {
    return true;
  }

  if (type === 'sticker') {
    const url = getStickerUrlByName(content);
    if (!url) {
      console.info(`[AI Service] 表情包不存在于库中: ${content}`);
      return false;
    }
    return true;
  }

  if (type === 'image') {
    const url = getCharacterImageUrlByName(content);
    if (!url) {
      console.info(`[AI Service] 图片不存在于库中: ${content}`);
      return false;
    }
    return true;
  }

  return true;
}

/**
 * 过滤聊天消息中无效的表情包和图片
 * @param messages 消息列表
 * @returns 过滤后的消息列表
 */
function filterInvalidMediaMessages(messages: any[]): any[] {
  if (!Array.isArray(messages)) return messages;

  const originalCount = messages.length;
  const filtered = messages.filter(msg => {
    // 获取消息类型（支持 t 和 type 两种格式）
    const msgType = msg.t || msg.type || '';
    // 获取消息内容（支持 c 和 content 两种格式）
    const msgContent = msg.c || msg.content;
    const contentStr = msgContent != null ? String(msgContent) : '';

    // 如果是表情包或图片类型，检查是否有效
    if (msgType === 'sticker' || msgType === 'image') {
      const isValid = isMediaValid(msgType, contentStr);
      if (!isValid) {
        console.warn(`[AI Service] 过滤无效媒体消息: type=${msgType}, content=${contentStr}`);
      }
      return isValid;
    }

    return true;
  });

  if (filtered.length < originalCount) {
    console.info(`[AI Service] 消息过滤完成: 原始${originalCount}条, 保留${filtered.length}条`);
  }

  return filtered;
}

/**
 * 过滤聊天数据中的无效媒体消息
 * @param data AI返回的聊天数据
 * @returns 过滤后的数据
 */
function filterChatData(data: any): any {
  if (!data) return data;

  // 克隆数据避免修改原对象
  const filtered = _.cloneDeep(data);

  // 过滤 messages 数组
  if (Array.isArray(filtered.messages)) {
    filtered.messages = filterInvalidMediaMessages(filtered.messages);
  }

  return filtered;
}

/**
 * 从 localStorage 加载 API 配置
 */
export function loadApiConfig(): ApiConfig {
  const saved = localStorage.getItem('phone_api_config');
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      url: parsed.url || '',
      key: parsed.key || '',
      model: parsed.model || '',
      streaming: parsed.streaming ?? false,
      temperature: parsed.temperature ?? 1.0,
    };
  }
  return {
    url: '',
    key: '',
    model: '',
    streaming: false,
    temperature: 1.0,
  };
}

/** 直播图片库存储键 */
const LIVE_IMAGES_KEY = 'phone_character_live_images';

/**
 * 获取直播图片库中的所有角色名
 */
function getLiveImageCharacterNames(): string[] {
  try {
    const charVars = getVariables({ type: 'character' });
    const saved = _.get(charVars, LIVE_IMAGES_KEY) as Record<string, unknown> | undefined;
    if (saved && typeof saved === 'object') {
      return Object.keys(saved);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 获取默认预设配置
 */
function getDefaultPreset(): PresetConfig {
  return {
    id: 'default',
    name: defaultPresetJson.name,
    blocks: defaultPresetJson.blocks as PromptBlock[],
    formatGuide: defaultPresetJson.formatGuide as FormatGuideData,
    createdAt: defaultPresetJson.exportedAt || Date.now(),
    updatedAt: defaultPresetJson.exportedAt || Date.now(),
  };
}

/**
 * 从 localStorage 加载预设配置，如果没有则使用默认预设
 */
export function loadActivePreset(): PresetConfig {
  const presetsStr = localStorage.getItem('phone_presets');
  if (!presetsStr) return getDefaultPreset();

  try {
    const data = JSON.parse(presetsStr);
    // Settings界面保存格式: { presets: [...], activePresetId: '...' }
    const presets: PresetConfig[] = data.presets || [];
    const activeId = data.activePresetId;

    if (!activeId) return getDefaultPreset();
    return presets.find(p => p.id === activeId) || getDefaultPreset();
  } catch {
    return getDefaultPreset();
  }
}

/**
 * 构建 API URL
 */
function buildApiUrl(baseUrl: string): string {
  let url = baseUrl.trim();
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // 如果已经包含完整路径，直接返回
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  // 如果以 /v1 结尾，添加 /chat/completions
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }
  // 否则添加 /v1/chat/completions
  return `${url}/v1/chat/completions`;
}

// ========== AI 调用函数 ==========

/**
 * 调用 AI API
 *
 * @param messages 消息列表
 * @param config API 配置
 * @returns AI 响应
 */
export async function callAi(
  messages: AiMessage[],
  config?: Partial<ApiConfig>,
): Promise<AiResponse> {
  const apiConfig = { ...loadApiConfig(), ...config };

  if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
    return {
      success: false,
      content: '',
      error: '请先配置 API URL、API Key 和模型',
    };
  }

  const apiUrl = buildApiUrl(apiConfig.url);
  const abortController = getAbortController();

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages,
        temperature: apiConfig.temperature,
        stream: false, // 目前不支持流式
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        content: '',
        error: `API 请求失败: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
    };
  } catch (error) {
    // 检查是否是用户主动终止
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        content: '',
        error: '请求已被用户终止',
      };
    }
    return {
      success: false,
      content: '',
      error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  } finally {
    resetAbortController();
  }
}

/**
 * 使用预设调用 AI
 *
 * @param userInput 用户输入
 * @param viewType 当前界面类型（用于格式指导）
 * @param additionalContext 额外上下文
 * @returns AI 响应
 */
export async function callAiWithPreset(
  userInput: string,
  viewType: keyof FormatGuideData,
  additionalContext?: {
    targetCharacters?: string[];
    characterName?: string;
    currentPage?: string;
  },
): Promise<AiResponse> {
  const preset = loadActivePreset();

  // 构建填充上下文
  const context = {
    currentView: viewType,
    currentPage: additionalContext?.currentPage || viewType,
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    ...additionalContext,
  };

  // 自动填充预设块
  const filledBlocks = await autoFillBlocks(preset.blocks, context);

  // 转换为消息格式
  const messages = blocksToMessages(filledBlocks);

  // 调用 AI
  return callAi(messages);
}

/**
 * 获取用户名称，格式为"用户XXX"
 */
function getUserName(): string {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData?.user?.name) {
      return `用户${phoneData.user.name}`;
    }
  } catch (e) {
    console.warn('[AI Service] 无法读取用户姓名:', e);
  }
  return '用户';
}

/**
 * 从内容中提取 XML 标签内的内容
 * 支持 <map>, <dynamic>, <homepage>, <forum>, <forum_post>, <live_list>, <message>, <calendar> 等标签
 */
function extractXmlTagContent(content: string): string {
  const xmlTags = ['message', 'group_message', 'chat_history', 'map', 'dynamic', 'homepage', 'forum', 'forum_post', 'live_list', 'live', 'email', 'browser', 'music', 'phone_module', 'call', 'calendar', 'diary'];

  for (const tag of xmlTags) {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
    const match = content.match(regex);
    if (match) {
      console.info(`[AI Service] 从 <${tag}> 标签中提取内容`);
      return match[1].trim();
    }
  }
  return content;
}

/**
 * 修复 YAML 中未引用的特殊字符串值
 * 处理如 title: [xxx] yyy 这种被误认为数组的情况
 */
function fixUnquotedYamlValues(content: string): string {
  const lines = content.split('\n');
  const fixedLines: string[] = [];
  let inMultilineString = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测多行字符串开始
    if (trimmed.endsWith('|') || trimmed.endsWith('>')) {
      inMultilineString = true;
      fixedLines.push(line);
      continue;
    }

    // 检测多行字符串结束
    if (inMultilineString) {
      if (trimmed && !line.startsWith(' ') && !line.startsWith('\t')) {
        inMultilineString = false;
      } else {
        fixedLines.push(line);
        continue;
      }
    }

    // 匹配 key: [xxx] 或 key: [xxx] yyy 模式（方括号被误认为数组）
    // 使用更宽松的匹配：任意key名（包括中文）后跟冒号和方括号内容
    const bracketMatch = line.match(/^(\s*[\w\u4e00-\u9fa5]+:\s*)\[([^\]]*)\](.*)$/);
    if (bracketMatch) {
      const [, prefix, bracketContent, suffix] = bracketMatch;
      // 如果方括号后有内容，或者方括号内容不像数组元素（包含中文等），则加引号
      if (suffix.trim() || /[\u4e00-\u9fa5]/.test(bracketContent)) {
        fixedLines.push(`${prefix}"[${bracketContent}]${suffix}"`);
        continue;
      }
    }

    // 匹配 key: value 中 value 包含冒号的情况（如 title: Re: xxx）
    // 但排除已经引用的情况和多行字符串标记
    const colonMatch = line.match(/^(\s*[\w\u4e00-\u9fa5]+:\s*)([^"'|>\n][^"\n]*:.*)$/);
    if (colonMatch && !colonMatch[2].startsWith('"') && !colonMatch[2].startsWith("'")) {
      const [, prefix, value] = colonMatch;
      // 检查是否是 URL（包含 :// 的不处理）
      if (!value.includes('://')) {
        fixedLines.push(`${prefix}"${value}"`);
        continue;
      }
    }

    // 匹配 key: @xxx 模式（@ 是 YAML 保留字符）
    const atMatch = line.match(/^(\s*[\w\u4e00-\u9fa5]+:\s*)(@.*)$/);
    if (atMatch) {
      const [, prefix, value] = atMatch;
      fixedLines.push(`${prefix}"${value}"`);
      continue;
    }

    fixedLines.push(line);
  }

  return fixedLines.join('\n');
}

/**
 * 解析 AI 响应中的 YAML 数据
 *
 * @param content AI 响应内容
 * @returns 解析后的数据
 */
export function parseYamlFromResponse<T>(content: string): T | null {
  console.info('[AI Service] parseYamlFromResponse 输入长度:', content.length);

  let extracted = content;

  // 0. 如果有 </think> 标签，只取其后的内容
  const thinkEndIndex = extracted.indexOf('</think>');
  if (thinkEndIndex !== -1) {
    extracted = extracted.substring(thinkEndIndex + 8).trim();
    console.info('[AI Service] 移除think标签后长度:', extracted.length);
  }

  // 1. 先尝试从代码块中提取（支持 ```yaml 或 ``` 后可选换行）
  const codeBlockMatch = extracted.match(/```ya?ml?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    extracted = codeBlockMatch[1].trim();
    console.info('[AI Service] 代码块提取后长度:', extracted.length);
  }

  // 2. 尝试从 XML 标签中提取（代码块内部可能还有 XML 标签）
  const xmlExtracted = extractXmlTagContent(extracted);
  if (xmlExtracted !== extracted) {
    extracted = xmlExtracted;
    console.info('[AI Service] XML提取后长度:', extracted.length);
  }

  // 3. 移除 YAML 注释行（以 # 开头的行，但保留多行字符串中的 #）
  // 只移除顶层的注释行
  const lines = extracted.split('\n');
  const filteredLines: string[] = [];
  let inMultilineString = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // 检测多行字符串开始（以 | 或 > 结尾）
    if (trimmed.endsWith('|') || trimmed.endsWith('>')) {
      inMultilineString = true;
      filteredLines.push(line);
      continue;
    }
    // 如果在多行字符串中，检测是否结束（遇到非缩进行）
    if (inMultilineString && trimmed && !line.startsWith(' ') && !line.startsWith('\t')) {
      inMultilineString = false;
    }
    // 跳过顶层注释行（不在多行字符串中且以 # 开头）
    if (!inMultilineString && trimmed.startsWith('#')) {
      continue;
    }
    filteredLines.push(line);
  }
  extracted = filteredLines.join('\n').trim();

  // 4. 修复包含特殊字符的未引用字符串值
  // 处理 key: [xxx] 这种被误认为数组的情况，将其转为 key: "[xxx]"
  extracted = fixUnquotedYamlValues(extracted);

  // 5. 修复 key:value 缺少空格的问题（AI常见错误）
  // 例如 state:看着屏幕 -> state: 看着屏幕
  extracted = extracted.replace(/^(\s*)(\w+):([^\s\n])/gm, '$1$2: $3');

  // 6. 尝试解析
  try {
    const result = yaml.parse(extracted);
    if (result) return result as T;
  } catch (e) {
    console.error('[AI Service] YAML 解析失败:', e);
    console.error('[AI Service] 实际内容长度:', extracted.length);
    console.error('[AI Service] 内容预览(前500字):', extracted.substring(0, 500));
  }

  return null;
}

/**
 * 解析 AI 响应中的 JSON 数据
 *
 * @param content AI 响应内容
 * @returns 解析后的数据
 */
export function parseJsonFromResponse<T>(content: string): T | null {
  try {
    // 尝试直接解析
    const result = JSON.parse(content);
    if (result) return result as T;
  } catch {
    // 尝试从代码块中提取
    const jsonMatch = content.match(/```json?\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as T;
      } catch {
        console.error('[AI Service] 无法解析 JSON 代码块');
      }
    }
  }
  return null;
}

// ========== 专用 AI 调用函数 ==========

/**
 * 调用 AI 获取地图数据
 *
 * @param locationName 地点名称（可选，用于获取特定地点详情）
 * @returns 地图数据
 */
export async function fetchMapDataFromAi(locationName?: string): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  const preset = loadActivePreset();

  // 构建用户输入提示
  let userInput = '请根据当前剧情生成地图数据，包括各地点的状态、事件和人物位置。';
  if (locationName) {
    userInput = `请详细描述"${locationName}"这个地点的当前状态、正在发生的事件、在场人物等信息。`;
  }

  // 构建填充上下文 - 仅使用地图格式指导
  const context = {
    currentView: 'map' as keyof FormatGuideData,
    currentPage: '地图',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  // 自动填充预设块
  const filledBlocks = await autoFillBlocks(preset.blocks, context);

  // 转换为消息格式
  const messages = blocksToMessages(filledBlocks);

  // 调试：打印发送的消息
  console.info('[AI Service] 发送的消息:', messages);

  // 调用 AI
  const response = await callAi(messages);

  // 调试：打印AI响应
  console.info('[AI Service] AI响应:', response);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  // 调试：打印原始响应内容
  console.info('[AI Service] AI响应原始内容:', response.content);

  // 解析响应
  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);

  // 调试：打印解析结果
  console.info('[AI Service] YAML解析结果:', yamlData);
  console.info('[AI Service] JSON解析结果:', jsonData);

  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 无法解析响应，原始内容:', response.content);
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取动态数据
 *
 * @returns 动态数据
 */
export async function fetchDynamicDataFromAi(): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchDynamicDataFromAi 被调用');

  const preset = loadActivePreset();
  console.info('[AI Service] 动态 - 加载的预设:', preset);

  // 检查格式指导
  console.info('[AI Service] 动态 - 格式指导配置:', preset.formatGuide);
  console.info('[AI Service] 动态 - dynamic格式指导:', preset.formatGuide?.dynamic);

  // 构建用户输入提示
  const userInput = `请按照格式生成动态界面数据，包括多个用户发布的动态帖子及评论。禁止主动发送用户${getUserName()}的动态。`;

  // 构建填充上下文 - 仅使用动态格式指导
  const context = {
    currentView: 'dynamic' as keyof FormatGuideData,
    currentPage: '动态',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  // 自动填充预设块
  const filledBlocks = await autoFillBlocks(preset.blocks, context);

  // 转换为消息格式
  const messages = blocksToMessages(filledBlocks);

  // 调试：打印发送的消息
  console.info('[AI Service] 动态 - 发送的消息:', messages);

  // 调用 AI
  const response = await callAi(messages);

  // 调试：打印AI响应
  console.info('[AI Service] 动态 - AI响应:', response);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  // 调试：打印原始响应内容
  console.info('[AI Service] 动态 - AI响应原始内容:', response.content);

  // 解析响应
  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);

  // 调试：打印解析结果
  console.info('[AI Service] 动态 - YAML解析结果:', yamlData);
  console.info('[AI Service] 动态 - JSON解析结果:', jsonData);

  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 动态 - 无法解析响应，原始内容:', response.content);
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取个人动态主页数据
 *
 * @param characterName 人物名称
 * @returns 动态主页数据
 */
export async function fetchDynamicHomeDataFromAi(characterName: string): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchDynamicHomeDataFromAi 被调用，人物:', characterName);

  const preset = loadActivePreset();

  // 构建用户输入提示
  const userInput = `请按照格式生成${characterName}的个人动态主页`;

  // 构建填充上下文 - 使用 dynamicHome 格式指导，并传入目标人物
  const context = {
    currentView: 'dynamicHome' as keyof FormatGuideData,
    currentPage: '动态主页',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    targetCharacters: [characterName], // 传入目标人物，用于获取人物世界书条目
  };

  // 自动填充预设块
  const filledBlocks = await autoFillBlocks(preset.blocks, context);

  // 转换为消息格式
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 动态主页 - 发送的消息:', messages);

  // 调用 AI
  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 动态主页 - AI响应原始内容:', response.content);

  // 解析响应
  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 动态主页 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取论坛数据
 *
 * @returns 论坛数据
 */
export async function fetchForumDataFromAi(): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchForumDataFromAi 被调用');

  const preset = loadActivePreset();

  const userInput = '请按照格式生成论坛';

  const context = {
    currentView: 'forum' as keyof FormatGuideData,
    currentPage: '论坛',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 论坛 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 论坛 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 论坛 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取论坛帖子详情数据
 *
 * @param postTitle 帖子标题
 * @returns 帖子详情数据
 */
export async function fetchForumPostDataFromAi(postTitle: string): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchForumPostDataFromAi 被调用，帖子:', postTitle);

  const preset = loadActivePreset();

  const userInput = `请按照格式生成${postTitle}的帖子具体内容`;

  const context = {
    currentView: 'forumPost' as keyof FormatGuideData,
    currentPage: '论坛帖子',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 论坛帖子 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 论坛帖子 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 论坛帖子 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取直播列表数据
 */
export async function fetchLiveListDataFromAi(): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchLiveListDataFromAi 被调用');

  const preset = loadActivePreset();

  const userInput = '按照格式要求生成直播列表';

  // 获取直播图片库中的所有角色名
  const allCharacters = getLiveImageCharacterNames();

  const context = {
    currentView: 'liveList' as keyof FormatGuideData,
    currentPage: '直播列表',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    allCharacters,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 直播列表 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 直播列表 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 直播列表 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取直播详情数据
 *
 * @param streamerName 主播名称
 * @param roomTitle 直播标题
 * @param userAction 用户行为描述（可选，用于互动后触发AI回复）
 * @returns 直播详情数据
 */
export async function fetchLiveDataFromAi(
  streamerName: string,
  roomTitle: string,
  userAction?: string,
): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchLiveDataFromAi 被调用，主播:', streamerName, '标题:', roomTitle, '用户行为:', userAction);

  const preset = loadActivePreset();

  // 构建用户输入提示
  let userInput: string;
  if (userAction) {
    userInput = `${userAction}\n\n请按照格式生成${streamerName}的直播"${roomTitle}"的最新状态`;
  } else {
    userInput = `按照格式生成${streamerName}的直播"${roomTitle}"`;
  }

  // 构建填充上下文 - 使用 live 格式指导，并传入目标人物
  const context = {
    currentView: 'live' as keyof FormatGuideData,
    currentPage: '直播',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    targetCharacters: [streamerName], // 传入目标人物，用于获取人物世界书条目
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 直播详情 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 直播详情 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 直播详情 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 发布用户动态
 * 在保持现有动态的基础上，在顶部添加用户的动态并生成回复
 */
export async function postUserDynamic(
  content: string,
  image: string | null,
  existingPosts: any[],
): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] postUserDynamic 被调用');

  const preset = loadActivePreset();

  // 构建现有动态的简要描述
  const existingPostsSummary = existingPosts
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.name}: ${p.content.substring(0, 50)}...`)
    .join('\n');

  // 构建用户输入
  const imageDesc = image ? `，配图为：${image}` : '';
  const userName = getUserName();
  const userInput = `${userName}发布了一条动态，内容为：${content}${imageDesc}。
请在保持以下现有动态不变的同时，在最顶部生成${userName}的这条动态（isMyPost: true），并为${userName}的动态生成3-5条来自主要角色的评论回复。

现有动态列表：
${existingPostsSummary}`;

  const context = {
    currentView: 'dynamic' as keyof FormatGuideData,
    currentPage: '动态',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 发布动态 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 发布动态 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 发布动态 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 发布用户论坛帖子
 * 生成帖子内容并返回帖子详情数据
 */
export async function postUserForumPost(
  title: string,
  category: string,
  content: string,
  existingPosts: any[],
): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] postUserForumPost 被调用');

  const preset = loadActivePreset();

  // 构建现有帖子的简要描述
  const existingPostsSummary = existingPosts
    .slice(0, 5)
    .map((p, i) => `${i + 1}. [${p.category || '未知'}] ${p.title}`)
    .join('\n');

  // 构建用户输入
  const userName = getUserName();
  const userInput = `${userName}在论坛发布了一个新帖子，分类：${category}，标题：${title}，正文内容大意：${content}。
请生成这个帖子的详情内容，包括完整的正文和3-5条来自主要角色的评论回复。帖子作者是${userName}。

现有帖子列表：
${existingPostsSummary}`;

  const context = {
    currentView: 'forumPost' as keyof FormatGuideData,
    currentPage: '论坛帖子',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 发布帖子 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 发布帖子 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 发布帖子 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 发送用户邮件并获取回信
 * 在保持现有邮件的基础上，生成一封回信
 */
export async function sendUserEmail(
  to: string,
  subject: string,
  content: string,
  existingEmails: any[],
): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] sendUserEmail 被调用');

  const preset = loadActivePreset();

  // 构建现有邮件的简要描述
  const existingEmailsSummary = existingEmails
    .slice(0, 5)
    .map((e, i) => `${i + 1}. ${e.sender?.name || '未知'}: ${e.title}`)
    .join('\n');

  // 构建用户输入
  const userName = getUserName();
  const userInput = `${userName}发送了一封邮件，收件人：${to}，主题：${subject}，内容：${content}。
请在保持以下现有邮件不变的同时，在最顶部生成一封来自收件人的回信邮件。回信应该是收件人对${userName}邮件的回复。

现有邮件列表：
${existingEmailsSummary}`;

  const context = {
    currentView: 'email' as keyof FormatGuideData,
    currentPage: '邮箱',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    targetCharacters: [to], // 传入收件人，用于获取人物世界书条目
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 发送邮件 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 发送邮件 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 发送邮件 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取邮箱数据
 */
export async function fetchEmailDataFromAi(): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchEmailDataFromAi 被调用');

  const preset = loadActivePreset();

  // 从角色变量中读取用户姓名
  let userName = '用户';
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData?.user?.name) {
      userName = phoneData.user.name;
    }
  } catch (e) {
    console.warn('[AI Service] 无法读取用户姓名:', e);
  }

  const userInput = `按照格式要求生成${userName}的邮箱内容`;

  const context = {
    currentView: 'email' as keyof FormatGuideData,
    currentPage: '邮箱',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 邮箱 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 邮箱 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 邮箱 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取浏览器搜索结果
 *
 * @param query 搜索关键词
 * @returns 浏览器搜索结果数据
 */
export async function fetchBrowserDataFromAi(query: string): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchBrowserDataFromAi 被调用，搜索词:', query);

  const preset = loadActivePreset();

  const userInput = `用户搜索：${query}，按照格式要求生成浏览器内容`;

  const context = {
    currentView: 'browser' as keyof FormatGuideData,
    currentPage: '浏览器',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 浏览器 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 浏览器 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 浏览器 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取私聊回复
 *
 * @param targetName 聊天对象名称
 * @param userMessages 用户发送的消息列表
 * @returns 私聊回复数据
 */
export async function fetchPrivateChatDataFromAi(
  targetName: string,
  userMessages: string[],
): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchPrivateChatDataFromAi 被调用，对象:', targetName);

  const preset = loadActivePreset();

  // 构建用户输入提示
  let userInput: string;
  if (userMessages.length === 0) {
    userInput = `和${targetName}的私聊\n我方没有回复，让对方继续发送消息，请按照格式要求生成回复内容`;
  } else {
    const formattedMessages = userMessages.join('\n');
    userInput = `和${targetName}的私聊\n${getUserName()}（我方）发送：\n${formattedMessages}\n请按照格式要求生成回复内容`;
  }

  // 构建填充上下文
  const context = {
    currentView: 'privateChat' as keyof FormatGuideData,
    currentPage: '私聊',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    targetCharacters: [targetName],
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 私聊 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 私聊 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 私聊 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  // 过滤无效的表情包和图片消息
  const filteredData = filterChatData(data);

  return {
    success: true,
    data: filteredData,
  };
}

/**
 * 调用 AI 获取群聊回复
 *
 * @param groupName 群聊名称
 * @param mainMembers 群聊主要成员列表
 * @param userMessages 用户发送的消息列表
 * @returns 群聊回复数据
 */
export async function fetchGroupChatDataFromAi(
  groupName: string,
  mainMembers: string[],
  userMessages: string[],
): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchGroupChatDataFromAi 被调用，群聊:', groupName, '成员:', mainMembers);

  const preset = loadActivePreset();

  // 构建用户输入提示
  let userInput: string;
  if (userMessages.length === 0) {
    userInput = `群聊"${groupName}"中\n我方没有发言，让群成员继续聊天，请按照格式要求生成群聊消息`;
  } else {
    const formattedMessages = userMessages.join('\n');
    userInput = `群聊"${groupName}"中\n${getUserName()}（我方）发送：\n${formattedMessages}\n请按照格式要求生成群聊消息`;
  }

  // 构建填充上下文 - 传入所有主要成员作为 targetCharacters
  const context = {
    currentView: 'groupChat' as keyof FormatGuideData,
    currentPage: '群聊',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    targetCharacters: mainMembers,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 群聊 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 群聊 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 群聊 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  // 过滤无效的表情包和图片消息
  const filteredData = filterChatData(data);

  return {
    success: true,
    data: filteredData,
  };
}

/**
 * 调用 AI 获取语音通话数据
 *
 * @param characterName 通话对象名称
 * @param userReply 用户回复内容（可选，用于通话中回复）
 * @returns 语音通话数据
 */
export async function fetchVoiceCallDataFromAi(
  characterName: string,
  userReply?: string,
): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchVoiceCallDataFromAi 被调用，对象:', characterName);

  const preset = loadActivePreset();

  // 构建用户输入提示
  let userInput: string;
  const userName = getUserName();
  if (userReply) {
    userInput = `${userName}正在与${characterName}进行语音通话，${userName}说：${userReply}\n请按照格式要求生成${characterName}的通话回复`;
  } else {
    userInput = `${userName}向${characterName}发起语音通话，按照格式要求生成语音通话内容`;
  }

  // 构建填充上下文
  const context = {
    currentView: 'voiceCall' as keyof FormatGuideData,
    currentPage: '通话',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    targetCharacters: [characterName],
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 语音通话 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 语音通话 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 语音通话 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取日历数据
 *
 * @returns 日历数据
 */
export async function fetchCalendarDataFromAi(): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchCalendarDataFromAi 被调用');

  const preset = loadActivePreset();

  const userInput = '根据历史聊天内容，生成符合剧情走向和世界观的日历事件表。包括世界事件、大型事件、用户事件和角色事件。请确保日期、时间和星期的一致性。';

  const context = {
    currentView: 'calendar' as keyof FormatGuideData,
    currentPage: '日历',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 日历 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 日历 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 日历 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 调用 AI 获取日记数据
 *
 * @param characterName 角色名称
 * @returns 日记数据
 */
export async function fetchDiaryDataFromAi(characterName: string): Promise<{
  success: boolean;
  data: any;
  error?: string;
}> {
  console.info('[AI Service] fetchDiaryDataFromAi 被调用，角色:', characterName);

  const preset = loadActivePreset();

  const userInput = `请按照格式生成${characterName}的最新日记，第一人称视角书写，包含日期、天气、日记内容以及可能收集到的纪念品。`;

  const context = {
    currentView: 'diary' as keyof FormatGuideData,
    currentPage: '日记',
    userInput,
    formatGuide: preset.formatGuide,
    historyConfig: preset.historyConfig,
    targetCharacters: [characterName],
  };

  const filledBlocks = await autoFillBlocks(preset.blocks, context);
  const messages = blocksToMessages(filledBlocks);

  console.info('[AI Service] 日记 - 发送的消息:', messages);

  const response = await callAi(messages);

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error,
    };
  }

  console.info('[AI Service] 日记 - AI响应原始内容:', response.content);

  const yamlData = parseYamlFromResponse(response.content);
  const jsonData = parseJsonFromResponse(response.content);
  const data = yamlData || jsonData;

  if (!data) {
    console.error('[AI Service] 日记 - 无法解析响应');
    return {
      success: false,
      data: null,
      error: '无法解析 AI 响应数据',
    };
  }

  return {
    success: true,
    data,
  };
}

export default {
  loadApiConfig,
  loadActivePreset,
  callAi,
  callAiWithPreset,
  parseYamlFromResponse,
  parseJsonFromResponse,
  fetchMapDataFromAi,
  fetchDynamicDataFromAi,
  fetchDynamicHomeDataFromAi,
  fetchForumDataFromAi,
  fetchForumPostDataFromAi,
  fetchLiveListDataFromAi,
  fetchLiveDataFromAi,
  postUserDynamic,
  postUserForumPost,
  fetchEmailDataFromAi,
  fetchBrowserDataFromAi,
  fetchPrivateChatDataFromAi,
  fetchGroupChatDataFromAi,
  fetchVoiceCallDataFromAi,
  fetchCalendarDataFromAi,
  fetchDiaryDataFromAi,
};
