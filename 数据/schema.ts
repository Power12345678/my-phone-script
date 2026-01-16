/**
 * 手机界面数据格式定义
 * AI应输出JSON格式，方便解析和类型校验
 */
import { z } from 'zod';

// ========== 通用类型 ==========

// 头像格式：可以是完整URL或 "描述+catboxID.ext" 格式
const AvatarSchema = z.string().describe('头像，如 "猫猫吐舌头flrjca.JPG" 或完整URL');

// 时间格式
const TimeSchema = z.string().describe('时间，格式 HH:MM');
const DateSchema = z.string().describe('日期，格式 X年X月X日');

// ========== 消息类型 ==========

// 基础消息
const BaseMessage = z.object({
  id: z.string(),
  time: TimeSchema,
  isMe: z.boolean().default(false),
  sender: z
    .object({
      name: z.string(),
      avatar: AvatarSchema,
    })
    .optional(),
});

// 文本消息
const TextMessage = BaseMessage.extend({
  type: z.literal('text'),
  content: z.string(),
});

// 图片消息
const ImageMessage = BaseMessage.extend({
  type: z.literal('image'),
  content: AvatarSchema.describe('图片链接'),
});

// 表情包消息
const StickerMessage = BaseMessage.extend({
  type: z.literal('sticker'),
  content: z.string().describe('表情包名称（在表情包库中查找对应URL）或完整URL'),
});

// 语音消息
const VoiceMessage = BaseMessage.extend({
  type: z.literal('voice'),
  duration: z.string().describe('语音时长，如 0:15'),
  voiceText: z.string().optional().describe('语音转文字内容'),
  audioFile: z.string().optional(),
});

// 转账消息
const TransferMessage = BaseMessage.extend({
  type: z.literal('transfer'),
  amount: z.string().describe('转账金额'),
  note: z.string().optional().describe('转账备注'),
  transferTime: z.string().optional(),
});

// 位置消息
const LocationMessage = BaseMessage.extend({
  type: z.literal('location'),
  partnerLocation: z.string().describe('对方位置'),
  userLocation: z.string().optional().describe('我方位置'),
  distance: z.string().describe('双方距离'),
});

// 撤回消息
const RecalledMessage = BaseMessage.extend({
  type: z.literal('recalled'),
  originalContent: z.string().optional().describe('原始消息内容'),
});

// 未接通话
const CallMissedMessage = BaseMessage.extend({
  type: z.literal('call-missed'),
});

// 通话结束
const CallEndedMessage = BaseMessage.extend({
  type: z.literal('call-ended'),
  duration: z.string().describe('通话时长'),
});

// 系统消息 - 红包/转账相关
const TransferAcceptedMessage = BaseMessage.extend({
  type: z.literal('transfer-accepted'),
  amount: z.string().describe('转账金额'),
});

const TransferRejectedMessage = BaseMessage.extend({
  type: z.literal('transfer-rejected'),
  amount: z.string().describe('转账金额'),
});

// 文件消息
const FileMessage = BaseMessage.extend({
  type: z.literal('file'),
  filename: z.string(),
  filesize: z.string(),
  description: z.string().optional(),
});

// 新闻消息
const NewsMessage = BaseMessage.extend({
  type: z.literal('news'),
  title: z.string(),
  source: z.string(),
  publishDate: z.string(),
  content: z.string().optional(),
  views: z.string().optional(),
  likes: z.string().optional(),
  comments: z.string().optional(),
});

// 链接分享消息
const BrowserShareMessage = BaseMessage.extend({
  type: z.literal('browser-share'),
  title: z.string(),
  source: z.string(),
  description: z.string().optional(),
  url: z.string(),
});

// 私聊消息（支持所有类型）
export const PrivateMessageSchema = z.discriminatedUnion('type', [
  TextMessage,
  ImageMessage,
  StickerMessage,
  VoiceMessage,
  TransferMessage,
  LocationMessage,
  RecalledMessage,
  CallMissedMessage,
  CallEndedMessage,
  TransferAcceptedMessage,
  TransferRejectedMessage,
  FileMessage,
  NewsMessage,
  BrowserShareMessage,
]);

// 群聊消息（只支持 text、image、sticker）
export const GroupMessageSchema = z.discriminatedUnion('type', [TextMessage, ImageMessage, StickerMessage]);

export type PrivateMessage = z.infer<typeof PrivateMessageSchema>;
export type GroupMessage = z.infer<typeof GroupMessageSchema>;

// ========== 聊天数据 ==========

// 私聊数据
export const PrivateChatSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: AvatarSchema,
  status: z.enum(['online', 'offline', 'busy']).default('online'),
  emotion: z.string().optional().describe('对方情绪'),
  location: z.string().optional().describe('对方地点'),
  state: z.string().optional().describe('对方状态'),
  thought: z.string().optional().describe('对方想法'),
  messages: z.array(PrivateMessageSchema).default([]),
});

// 群聊数据
export const GroupChatSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: AvatarSchema,
  members: z.number().describe('成员数量'),
  messages: z.array(GroupMessageSchema).default([]),
});

export type PrivateChat = z.infer<typeof PrivateChatSchema>;
export type GroupChat = z.infer<typeof GroupChatSchema>;

// ========== 消息列表数据 ==========

export const ChatListItemSchema = z.object({
  id: z.string(),
  type: z.enum(['single', 'group']),
  name: z.string(),
  avatar: AvatarSchema,
  preview: z.string().describe('消息预览'),
  time: TimeSchema,
  unread: z.number().default(0),
});

export type ChatListItem = z.infer<typeof ChatListItemSchema>;

// ========== 消息界面完整数据 ==========

export const MessageViewSchema = z.object({
  currentTime: TimeSchema,
  currentDate: DateSchema,
  chats: z.array(ChatListItemSchema).default([]),
  privateChats: z.record(z.string(), PrivateChatSchema).default({}),
  groupChats: z.record(z.string(), GroupChatSchema).default({}),
});

export type MessageView = z.infer<typeof MessageViewSchema>;

// ========== AI输出格式示例 ==========

/**
 * AI应该输出类似这样的JSON：
 *
 * ```json
 * {
 *   "currentTime": "14:30",
 *   "currentDate": "2025年1月2日",
 *   "chats": [
 *     {
 *       "id": "1",
 *       "type": "single",
 *       "name": "林若曦",
 *       "avatar": "猫猫吐舌头flrjca.JPG",
 *       "preview": "在忙吗？有道题想请教你...",
 *       "time": "16:33",
 *       "unread": 3
 *     }
 *   ],
 *   "privateChats": {
 *     "1": {
 *       "id": "1",
 *       "name": "林若曦",
 *       "avatar": "猫猫吐舌头flrjca.JPG",
 *       "emotion": "开心",
 *       "location": "图书馆",
 *       "state": "正在看书，偶尔抬头看看窗外",
 *       "thought": "他会不会觉得我很烦...",
 *       "messages": [
 *         { "id": "1", "type": "text", "content": "你好！", "time": "12:00", "isMe": false },
 *         { "id": "2", "type": "sticker", "content": "委屈巴巴", "time": "12:01", "isMe": false },
 *         { "id": "3", "type": "image", "content": "风景照片abc123.jpg", "time": "12:02", "isMe": true }
 *       ]
 *     }
 *   },
 *   "groupChats": {
 *     "4": {
 *       "id": "4",
 *       "name": "阳光高中交流群",
 *       "avatar": "水豚唱歌f804hai.JPG",
 *       "members": 12,
 *       "messages": [
 *         {
 *           "id": "1",
 *           "type": "text",
 *           "content": "@全体成员 紧急通知",
 *           "time": "14:00",
 *           "isMe": false,
 *           "sender": { "name": "班长", "avatar": "猫猫吐舌头flrjca.JPG" }
 *         }
 *       ]
 *     }
 *   }
 * }
 * ```
 */
