import $ from 'jquery';
import _ from 'lodash';
import { createApp } from 'vue';
import { createScriptIdDiv, destroyScriptIdDiv, deteleportStyle, teleportStyle } from '../util/script';
import App from './index.vue';
import { store, clearAllModuleCache } from './store';
import { initAutoMessage } from './autoMessage';
import { showPhoneInitializing, showPhoneInitialized, showNoDataPrompt } from './autoMessageNotification';
import defaultDataJson from './数据/示例数据.json';
import stickersJson from './数据/表情包.json';
import { getDisplaySettings } from './apps/Settings/composables/useDisplaySettings';

/** 检测是否已打开角色卡 */
function hasOpenedCharacter(): boolean {
  try {
    const chatId = SillyTavern.getCurrentChatId?.();
    return !!(chatId && chatId !== '');
  } catch {
    return false;
  }
}

/** 检测是否有角色卡数据 */
function hasPhoneData(): boolean {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    const phoneData = _.get(charVars, 'phone_data');
    return !!(phoneData && (Array.isArray(phoneData.characters) || phoneData.user));
  } catch {
    return false;
  }
}

/** 加载默认数据到角色变量 */
async function loadDefaultData(): Promise<void> {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    const phoneData = _.get(charVars, 'phone_data') || {};

    // 合并默认数据
    const newPhoneData = {
      ...phoneData,
      user: defaultDataJson.user,
      characters: defaultDataJson.characters,
      randomAvatars: defaultDataJson.randomAvatars,
      backgrounds: defaultDataJson.backgrounds,
      music: defaultDataJson.music,
      map: defaultDataJson.map,
      groups: defaultDataJson.groups,
      fonts: defaultDataJson.fonts,
    };

    _.set(charVars, 'phone_data', newPhoneData);
    await replaceVariables(charVars, { type: 'character' });
    console.info('[Improved Phone] 已加载默认数据');
  } catch (e) {
    console.error('[Improved Phone] 加载默认数据失败:', e);
  }
}

/** 加载默认表情包到角色变量 */
async function loadDefaultStickers(): Promise<void> {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    _.set(charVars, 'phone_stickers', stickersJson);
    await replaceVariables(charVars, { type: 'character' });
    console.info('[Improved Phone] 已加载默认表情包');
  } catch (e) {
    console.error('[Improved Phone] 加载默认表情包失败:', e);
  }
}

/** 主初始化函数 */
async function initPhone(): Promise<void> {
  console.log('[Improved Phone] Initializing...');

  // 显示初始化弹窗
  const initNotificationId = showPhoneInitializing();

  try {
    // Clean up previous instances
    deteleportStyle();
    destroyScriptIdDiv();
  } catch (e) {
    console.warn('[Improved Phone] Cleanup error:', e);
  }

  // Load Font Awesome
  if (!$('link[href*="font-awesome"]').length) {
    $('head').append(
      '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">',
    );
  }

  // 只有在打开了角色卡且没有数据时才显示提示框
  if (hasOpenedCharacter() && !hasPhoneData()) {
    // 先显示初始化完成，再显示数据提示
    showPhoneInitialized(initNotificationId);

    // 等待一小段时间让初始化提示消失
    await new Promise(resolve => setTimeout(resolve, 500));

    const { loadData, loadStickers } = await showNoDataPrompt();

    if (loadData) {
      await loadDefaultData();
    }
    if (loadStickers) {
      await loadDefaultStickers();
    }
  } else {
    showPhoneInitialized(initNotificationId);
  }

  // Create a new mount point using standard helper
  const $app = createScriptIdDiv();
  $('body').append($app);

  // Create and mount the Vue application
  const app = createApp(App);
  app.mount($app[0]);

  // Apply styles
  teleportStyle();

  // Initialize Store State - 根据设置决定是否自动显示手机
  const displaySettings = getDisplaySettings();
  store.phone.show = displaySettings.showOnInit;

  // Add Toggle Button and Delete Button
  const toggleBtnName = '显示/隐藏手机';
  const deleteBtnName = '删除最后一层';
  replaceScriptButtons([
    { name: toggleBtnName, visible: true },
    { name: deleteBtnName, visible: true },
  ]);

  // Handle Toggle Button Click
  const toggleEventName = getButtonEvent(toggleBtnName);
  eventOn(toggleEventName, () => {
    store.phone.show = !store.phone.show;
    console.log(`[Improved Phone] Toggled visibility: ${store.phone.show}`);
  });

  // Handle Delete Button Click
  const deleteEventName = getButtonEvent(deleteBtnName);
  eventOn(deleteEventName, async () => {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) {
      toastr.warning('当前没有可删除的消息楼层');
      return;
    }

    // Show confirmation popup
    const result = await SillyTavern.callGenericPopup(
      `确定要删除最后一层消息吗？（楼层 #${lastMessageId}）`,
      SillyTavern.POPUP_TYPE.CONFIRM,
      undefined,
      {
        okButton: '确认删除',
        cancelButton: '取消',
      },
    );

    // Check if user confirmed (AFFIRMATIVE = 1)
    if (result === SillyTavern.POPUP_RESULT.AFFIRMATIVE) {
      try {
        await deleteChatMessages([lastMessageId]);
        toastr.success('已删除最后一层消息');
        console.log(`[Improved Phone] Deleted message #${lastMessageId}`);
      } catch (e) {
        console.error('[Improved Phone] Failed to delete message:', e);
        toastr.error('删除失败');
      }
    }
  });

  // Initialize Auto Message Module
  initAutoMessage();

  console.log('[Improved Phone] Mounted successfully.');
}

// 监听聊天切换事件 - 必须在全局作用域注册
eventOn(tavern_events.CHAT_CHANGED, (newChatId: string) => {
  console.log('[Improved Phone] CHAT_CHANGED event fired:', newChatId);
  clearAllModuleCache();
  window.location.reload();
});

$(() => {
  const initialChatId = SillyTavern.getCurrentChatId() || '';
  console.log('[Improved Phone] Script loaded, initial chat_id:', initialChatId);

  // 如果已经打开了角色卡，立即初始化
  if (initialChatId) {
    initPhone();
  }
});
