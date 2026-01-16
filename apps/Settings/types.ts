/**
 * Settings 模块类型定义
 * 从 index.vue 提取，供所有子组件使用
 */

// 音乐数据类型
export interface Song {
  url: string;
  artist: string;
  title: string;
}

export interface MusicData {
  songs: Song[];
}

// 搜索结果类型
export interface MusicSearchResult {
  title: string;
  artist: string;
  url: string;
  cover: string;
  source: '网易云' | 'QQ音乐';
}

// 字体数据类型
export interface FontItem {
  name: string;  // 字体名称，用于 font-family
  url: string;   // 字体 CSS 链接
}

// 用户数据类型
export interface User {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  email: string;
  bio: string;
  state: string;
  phoneBg: string;
  chatListBg?: string;
  font?: string;
}

// 角色数据类型
export interface Character {
  id: string;
  name: string;
  avatar: string;
  nickname: string;
  email: string;
  chatBg: string;
  dynamicBg: string;
  onlineStyle?: string;
}

// 群聊数据类型
export interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  /** 重要人物列表（从角色中选择的姓名） */
  mainMembers: string[];
  /** 其他成员描述 */
  otherMembers: string;
  /** 群聊简介 */
  description: string;
  /** 聊天背景 */
  chatBg: string;
}

// 地图相关类型
export interface SubLocation {
  position: number;
  name: string;
  icon: string;
}

export interface District {
  position: number;
  name: string;
  icon: string;
  subLocations: SubLocation[];
}

export interface MapData {
  name: string;
  districts: District[];
}

// 基本信息类型
export interface BaseInfo {
  randomAvatars: string[];
  backgrounds: string[];
  user: User;
  characters: Character[];
  map: MapData;
}

// 聊天变量中的手机数据格式
export interface PhoneData {
  user: User;
  characters: Character[];
  groups: GroupChat[];
  randomAvatars: string[];
  backgrounds: string[];
  music: Song[];
  map: MapData;
  fonts?: FontItem[];
  _exportMeta?: {
    version: string;
    exportedAt: number;
    source: string;
  };
}

// API 配置类型
export interface ApiConfig {
  url: string;
  key: string;
  model: string;
  /** 是否启用流式传输，默认false */
  streaming: boolean;
  /** 温度参数，默认1.0 */
  temperature: number;
}

// 预设提示词块类型
export interface PromptBlock {
  id: string;
  name: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  fixed: boolean;
  placeholder?: string;
}

// 格式指南数据类型
export interface FormatGuideData {
  privateChat: string;      // 私聊
  groupChat: string;        // 群聊
  voiceCall: string;        // 通话
  dynamic: string;          // 动态
  dynamicHome: string;      // 动态主页
  browser: string;          // 浏览器
  forum: string;            // 论坛
  forumPost: string;        // 论坛帖子
  liveList: string;         // 直播列表
  live: string;             // 直播
  map: string;              // 地图
  email: string;            // 邮件
  diary: string;            // 日记
  calendar: string;         // 日历
}

// 对话历史配置
export interface HistoryConfig {
  /** 最大消息数量，0表示无限制 */
  maxMessages: number;
  /** 是否包含系统消息 */
  includeSystem: boolean;
}

// 预设配置类型
export interface PresetConfig {
  id: string;
  name: string;
  blocks: PromptBlock[];
  formatGuide?: FormatGuideData;
  historyConfig?: HistoryConfig;
  createdAt: number;
  updatedAt: number;
}

// 视图类型
export type ViewType =
  | 'user'
  | 'characters'
  | 'characterDetail'
  | 'groupDetail'
  | 'avatars'
  | 'avatarDetail'
  | 'music'
  | 'sticker'
  | 'map'
  | 'api'
  | 'preset'
  | 'autoFill'
  | 'autoFillWorldbookPre'
  | 'autoFillHistory'
  | 'autoFillWorldbookPost'
  | 'autoFillCharGuide'
  | 'autoFillFormatGuide'
  | null;

// 标准页面名称列表
export const standardPageNames = [
  { key: 'privateChat', name: '私聊' },
  { key: 'groupChat', name: '群聊' },
  { key: 'voiceCall', name: '通话' },
  { key: 'dynamic', name: '动态' },
  { key: 'dynamicHome', name: '动态主页' },
  { key: 'forum', name: '论坛' },
  { key: 'forumPost', name: '论坛帖子' },
  { key: 'liveList', name: '直播列表' },
  { key: 'live', name: '直播' },
  { key: 'map', name: '地图' },
  { key: 'email', name: '邮箱' },
  { key: 'browser', name: '浏览器' },
  { key: 'music', name: '音乐' },
  { key: 'diary', name: '日记' },
  { key: 'calendar', name: '日历' },
] as const;

// 图标分类
export const iconCategories = {
  location: {
    name: '地点',
    icons: [
      'fa-map-marker-alt', 'fa-map-pin', 'fa-compass', 'fa-location-arrow',
      'fa-globe', 'fa-earth-asia', 'fa-mountain', 'fa-mountain-sun',
      'fa-tree', 'fa-leaf', 'fa-water', 'fa-umbrella-beach'
    ]
  },
  building: {
    name: '建筑',
    icons: [
      'fa-home', 'fa-house', 'fa-building', 'fa-city',
      'fa-store', 'fa-shop', 'fa-hospital', 'fa-school',
      'fa-church', 'fa-mosque', 'fa-landmark', 'fa-monument',
      'fa-warehouse', 'fa-industry', 'fa-hotel', 'fa-igloo'
    ]
  },
  transport: {
    name: '交通',
    icons: [
      'fa-car', 'fa-bus', 'fa-train', 'fa-subway',
      'fa-plane', 'fa-ship', 'fa-bicycle', 'fa-motorcycle',
      'fa-road', 'fa-route', 'fa-gas-pump', 'fa-parking'
    ]
  },
  nature: {
    name: '自然',
    icons: [
      'fa-sun', 'fa-moon', 'fa-star', 'fa-cloud',
      'fa-snowflake', 'fa-leaf', 'fa-seedling', 'fa-fire',
      'fa-bolt', 'fa-rainbow', 'fa-wind', 'fa-tornado'
    ]
  },
  food: {
    name: '餐饮',
    icons: [
      'fa-utensils', 'fa-mug-hot', 'fa-coffee', 'fa-wine-glass',
      'fa-beer', 'fa-cocktail', 'fa-pizza-slice', 'fa-hamburger',
      'fa-ice-cream', 'fa-cake-candles', 'fa-cookie', 'fa-apple-whole'
    ]
  },
  entertainment: {
    name: '娱乐',
    icons: [
      'fa-gamepad', 'fa-dice', 'fa-chess', 'fa-puzzle-piece',
      'fa-music', 'fa-headphones', 'fa-film', 'fa-tv',
      'fa-masks-theater', 'fa-ticket', 'fa-bowling-ball', 'fa-basketball'
    ]
  },
  service: {
    name: '服务',
    icons: [
      'fa-phone', 'fa-envelope', 'fa-bell', 'fa-clock',
      'fa-calendar', 'fa-bank', 'fa-coins', 'fa-credit-card',
      'fa-briefcase', 'fa-graduation-cap', 'fa-book', 'fa-newspaper'
    ]
  },
  other: {
    name: '其他',
    icons: [
      'fa-heart', 'fa-flag', 'fa-gem', 'fa-crown',
      'fa-gift', 'fa-key', 'fa-lock', 'fa-shield',
      'fa-anchor', 'fa-rocket', 'fa-atom', 'fa-infinity'
    ]
  }
} as const;

export type IconCategoryKey = keyof typeof iconCategories;

// 显示设置类型
export interface DisplaySettings {
  /** 初始化后是否自动显示手机，默认 true */
  showOnInit: boolean;
  /** 是否将新内容追加到最后一个楼层而非创建新楼层，默认 false */
  appendToLastMessage: boolean;
  /** 是否将聊天内容（私聊、群聊）追加到最后一个楼层，默认 false */
  chatAppendToLastMessage: boolean;
  /** 历史楼层读取数量，0 表示读取全部，默认 100 */
  historyReadCount: number;
  /** 发送消息时是否自动推进正文剧情，默认 false */
  autoTriggerStory: boolean;
}
