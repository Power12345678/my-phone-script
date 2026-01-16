import { ref } from 'vue';
import type { DisplaySettings } from '../types';

const STORAGE_KEY = 'phone_display_settings';

// 默认设置
const defaultSettings: DisplaySettings = {
  showOnInit: true,
  appendToLastMessage: false,
  chatAppendToLastMessage: false,
  historyReadCount: 100,
  autoTriggerStory: false,
};

// 模块级别状态，实现单例模式
const displaySettings = ref<DisplaySettings>({ ...defaultSettings });

// 标记是否已加载
let isLoaded = false;

/**
 * 显示设置管理
 */
export function useDisplaySettings() {
  // 加载设置
  const loadSettings = () => {
    if (isLoaded) return displaySettings.value;
    isLoaded = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        displaySettings.value = {
          showOnInit: parsed.showOnInit ?? defaultSettings.showOnInit,
          appendToLastMessage: parsed.appendToLastMessage ?? defaultSettings.appendToLastMessage,
          chatAppendToLastMessage: parsed.chatAppendToLastMessage ?? defaultSettings.chatAppendToLastMessage,
          historyReadCount: parsed.historyReadCount ?? defaultSettings.historyReadCount,
          autoTriggerStory: parsed.autoTriggerStory ?? defaultSettings.autoTriggerStory,
        };
      }
    } catch (e) {
      console.error('[DisplaySettings] 加载设置失败:', e);
    }

    return displaySettings.value;
  };

  // 保存设置
  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(displaySettings.value));
      console.info('[DisplaySettings] 设置已保存');
    } catch (e) {
      console.error('[DisplaySettings] 保存设置失败:', e);
    }
  };

  // 更新单个设置项
  const updateSetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    displaySettings.value[key] = value;
    saveSettings();
  };

  return {
    displaySettings,
    loadSettings,
    saveSettings,
    updateSetting,
  };
}

/**
 * 获取显示设置（用于非 Vue 上下文）
 * 直接从 localStorage 读取，不依赖 Vue 响应式系统
 */
export function getDisplaySettings(): DisplaySettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        showOnInit: parsed.showOnInit ?? defaultSettings.showOnInit,
        appendToLastMessage: parsed.appendToLastMessage ?? defaultSettings.appendToLastMessage,
        chatAppendToLastMessage: parsed.chatAppendToLastMessage ?? defaultSettings.chatAppendToLastMessage,
        historyReadCount: parsed.historyReadCount ?? defaultSettings.historyReadCount,
        autoTriggerStory: parsed.autoTriggerStory ?? defaultSettings.autoTriggerStory,
      };
    }
  } catch (e) {
    console.error('[DisplaySettings] 读取设置失败:', e);
  }
  return { ...defaultSettings };
}
