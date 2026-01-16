/**
 * 自动回复通知模块 - 自定义提示框
 * 在酒馆页面顶端显示生成状态
 */

// 应用类型到中文名称的映射
const APP_NAMES: Record<string, string> = {
  private_chat: '私聊',
  group_chat: '群聊',
  dynamic: '动态',
  live_list: '直播',
};

// 应用类型到路由路径的映射
const APP_ROUTES: Record<string, string> = {
  private_chat: '/chat',
  group_chat: '/chat',
  dynamic: '/dynamic',
  live_list: '/live',
};

// 当前通知的状态
interface NotificationState {
  container: HTMLElement | null;
  currentId: number;
}

const state: NotificationState = {
  container: null,
  currentId: 0,
};

// 样式定义
const STYLES = `
.auto-message-notification {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(30, 30, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #fff;
  animation: slideDown 0.3s ease-out;
  max-width: 400px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}

.auto-message-notification.hiding {
  animation: slideUp 0.3s ease-out forwards;
}

.auto-message-notification__icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.auto-message-notification__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auto-message-notification__icon--success {
  color: #4ade80;
  font-size: 20px;
}

.auto-message-notification__icon--error {
  color: #f87171;
  font-size: 20px;
}

.auto-message-notification__icon--warning {
  color: #fbbf24;
  font-size: 20px;
}

.auto-message-notification__content {
  flex: 1;
  min-width: 0;
}

.auto-message-notification__title {
  font-weight: 600;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auto-message-notification__message {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auto-message-notification__message--small {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.auto-message-notification__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.auto-message-notification__btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.auto-message-notification__btn--primary {
  background: #3b82f6;
  color: #fff;
}

.auto-message-notification__btn--primary:hover {
  background: #2563eb;
}

.auto-message-notification__btn--close {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  padding: 6px 8px;
}

.auto-message-notification__btn--close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.auto-message-notification__checkboxes {
  display: flex;
  flex-direction: row;
  gap: 16px;
  margin-top: 8px;
}

.auto-message-notification__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

.auto-message-notification__checkbox input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #3b82f6;
  cursor: pointer;
  flex-shrink: 0;
  order: -1;
  margin: 0;
}

.auto-message-notification__checkbox span {
  user-select: none;
}
`;

/**
 * 获取父页面的 document（脚本运行在 iframe 中，通知需要显示在父页面）
 */
function getParentDocument(): Document {
  try {
    return window.parent.document;
  } catch {
    // 如果无法访问父页面，回退到当前 document
    return document;
  }
}

/**
 * 初始化样式
 */
function initStyles(): void {
  const doc = getParentDocument();
  if (doc.getElementById('auto-message-notification-styles')) return;

  const styleEl = doc.createElement('style');
  styleEl.id = 'auto-message-notification-styles';
  styleEl.textContent = STYLES;
  doc.head.appendChild(styleEl);
}

/**
 * 创建通知容器
 */
function createContainer(): HTMLElement {
  const doc = getParentDocument();

  // 移除旧的容器（包括 DOM 中已存在的）
  if (state.container) {
    state.container.remove();
  }
  // 同时移除 DOM 中可能残留的通知元素
  const existingNotification = doc.querySelector('.auto-message-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const container = doc.createElement('div');
  container.className = 'auto-message-notification';
  doc.body.appendChild(container);

  state.container = container;
  state.currentId++;

  return container;
}

/**
 * 隐藏通知
 */
function hideNotification(id: number): void {
  if (state.currentId !== id || !state.container) return;

  state.container.classList.add('hiding');
  setTimeout(() => {
    if (state.container && state.currentId === id) {
      state.container.remove();
      state.container = null;
    }
  }, 300);
}

/**
 * 显示生成中状态
 */
export function showGenerating(appType: string, sender: string): number {
  initStyles();
  const container = createContainer();
  const id = state.currentId;

  const appName = APP_NAMES[appType] || appType;

  container.innerHTML = `
    <div class="auto-message-notification__icon">
      <div class="auto-message-notification__spinner"></div>
    </div>
    <div class="auto-message-notification__content">
      <div class="auto-message-notification__title">正在生成${appName}消息</div>
      <div class="auto-message-notification__message">${sender} 发起的消息生成中...</div>
    </div>
    <div class="auto-message-notification__actions">
      <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // 绑定关闭事件
  const closeBtn = container.querySelector('#auto-msg-close');
  closeBtn?.addEventListener('click', () => {
    hideNotification(id);
  });

  return id;
}

/**
 * 显示生成成功状态
 */
export function showSuccess(
  id: number,
  appType: string,
  sender: string,
): void {
  if (state.currentId !== id || !state.container) return;

  const appName = APP_NAMES[appType] || appType;
  const container = state.container;

  container.innerHTML = `
    <div class="auto-message-notification__icon auto-message-notification__icon--success">
      <i class="fas fa-check-circle"></i>
    </div>
    <div class="auto-message-notification__content">
      <div class="auto-message-notification__title">生成完成</div>
      <div class="auto-message-notification__message">${sender} 的${appName}消息已生成，进入${appName}页面查看</div>
    </div>
    <div class="auto-message-notification__actions">
      <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // 绑定关闭事件
  const closeBtn = container.querySelector('#auto-msg-close');
  closeBtn?.addEventListener('click', () => {
    hideNotification(id);
  });

  // 5秒后自动隐藏
  setTimeout(() => {
    hideNotification(id);
  }, 5000);
}

/**
 * 显示生成失败状态
 */
export function showError(id: number, errorMessage: string): void {
  if (state.currentId !== id || !state.container) return;

  const container = state.container;

  container.innerHTML = `
    <div class="auto-message-notification__icon auto-message-notification__icon--error">
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <div class="auto-message-notification__content">
      <div class="auto-message-notification__title">生成失败</div>
      <div class="auto-message-notification__message" title="${errorMessage}">${errorMessage}</div>
    </div>
    <div class="auto-message-notification__actions">
      <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // 绑定关闭事件
  const closeBtn = container.querySelector('#auto-msg-close');
  closeBtn?.addEventListener('click', () => {
    hideNotification(id);
  });

  // 8秒后自动隐藏
  setTimeout(() => {
    hideNotification(id);
  }, 8000);
}

/**
 * 获取应用路由路径
 */
export function getAppRoute(appType: string): string {
  return APP_ROUTES[appType] || '/';
}

/**
 * 显示添加好友成功通知
 */
export function showAddFriendSuccess(name: string, nickname: string): void {
  initStyles();
  const container = createContainer();
  const id = state.currentId;

  container.innerHTML = `
    <div class="auto-message-notification__icon auto-message-notification__icon--success">
      <i class="fas fa-user-plus"></i>
    </div>
    <div class="auto-message-notification__content">
      <div class="auto-message-notification__title">添加好友成功</div>
      <div class="auto-message-notification__message">已添加 ${name} (${nickname}) 为好友</div>
    </div>
    <div class="auto-message-notification__actions">
      <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // 绑定关闭事件
  const closeBtn = container.querySelector('#auto-msg-close');
  closeBtn?.addEventListener('click', () => {
    hideNotification(id);
  });

  // 5秒后自动隐藏
  setTimeout(() => {
    hideNotification(id);
  }, 5000);
}

/**
 * 显示手机初始化通知
 */
export function showPhoneInitializing(): number {
  initStyles();
  const container = createContainer();
  const id = state.currentId;

  container.innerHTML = `
    <div class="auto-message-notification__icon">
      <div class="auto-message-notification__spinner"></div>
    </div>
    <div class="auto-message-notification__content">
      <div class="auto-message-notification__title">正在初始化外置小手机</div>
      <div class="auto-message-notification__message auto-message-notification__message--small">作者：Abstract 发布于discord类脑/旅程</div>
    </div>
    <div class="auto-message-notification__actions">
      <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // 绑定关闭事件
  const closeBtn = container.querySelector('#auto-msg-close');
  closeBtn?.addEventListener('click', () => {
    hideNotification(id);
  });

  return id;
}

/**
 * 显示手机初始化完成通知
 */
export function showPhoneInitialized(id: number): void {
  if (state.currentId !== id || !state.container) return;

  const container = state.container;

  container.innerHTML = `
    <div class="auto-message-notification__icon auto-message-notification__icon--success">
      <i class="fas fa-mobile-alt"></i>
    </div>
    <div class="auto-message-notification__content">
      <div class="auto-message-notification__title">外置小手机已就绪</div>
      <div class="auto-message-notification__message auto-message-notification__message--small">作者：Abstract 发布于discord类脑/旅程</div>
    </div>
    <div class="auto-message-notification__actions">
      <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // 绑定关闭事件
  const closeBtn = container.querySelector('#auto-msg-close');
  closeBtn?.addEventListener('click', () => {
    hideNotification(id);
  });

  // 3秒后自动隐藏
  setTimeout(() => {
    hideNotification(id);
  }, 3000);
}

/**
 * 显示无数据提示框，让用户选择是否加载默认数据
 * @returns Promise，resolve 时返回用户选择 { loadData: boolean, loadStickers: boolean }
 */
export function showNoDataPrompt(): Promise<{ loadData: boolean; loadStickers: boolean }> {
  return new Promise((resolve) => {
    initStyles();
    const container = createContainer();
    const id = state.currentId;

    container.innerHTML = `
      <div class="auto-message-notification__icon auto-message-notification__icon--warning">
        <i class="fas fa-database"></i>
      </div>
      <div class="auto-message-notification__content">
        <div class="auto-message-notification__title">未检测到角色卡数据</div>
        <div class="auto-message-notification__message">是否加载示例数据？</div>
        <div class="auto-message-notification__checkboxes">
          <label class="auto-message-notification__checkbox">
            <input type="checkbox" id="load-default-data" checked />
            <span>加载默认数据</span>
          </label>
          <label class="auto-message-notification__checkbox">
            <input type="checkbox" id="load-default-stickers" checked />
            <span>加载默认表情包</span>
          </label>
        </div>
      </div>
      <div class="auto-message-notification__actions">
        <button class="auto-message-notification__btn auto-message-notification__btn--primary" id="auto-msg-confirm">
          确认
        </button>
        <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-skip">
          跳过
        </button>
      </div>
    `;

    // 绑定确认事件
    const confirmBtn = container.querySelector('#auto-msg-confirm');
    confirmBtn?.addEventListener('click', () => {
      const loadData = (container.querySelector('#load-default-data') as HTMLInputElement)?.checked ?? false;
      const loadStickers = (container.querySelector('#load-default-stickers') as HTMLInputElement)?.checked ?? false;
      hideNotification(id);
      resolve({ loadData, loadStickers });
    });

    // 绑定跳过事件
    const skipBtn = container.querySelector('#auto-msg-skip');
    skipBtn?.addEventListener('click', () => {
      hideNotification(id);
      resolve({ loadData: false, loadStickers: false });
    });
  });
}

/**
 * 显示角色卡切换通知
 */
export function showCharacterChanged(hasData: boolean): void {
  initStyles();
  const container = createContainer();
  const id = state.currentId;

  const icon = hasData ? 'fa-check-circle' : 'fa-exclamation-circle';
  const iconClass = hasData ? 'auto-message-notification__icon--success' : 'auto-message-notification__icon--warning';
  const title = hasData ? '角色卡数据已加载' : '未找到角色卡数据';
  const message = hasData
    ? '已成功读取手机数据'
    : '当前角色卡没有手机数据，请先配置';

  container.innerHTML = `
    <div class="auto-message-notification__icon ${iconClass}">
      <i class="fas ${icon}"></i>
    </div>
    <div class="auto-message-notification__content">
      <div class="auto-message-notification__title">${title}</div>
      <div class="auto-message-notification__message">${message}</div>
    </div>
    <div class="auto-message-notification__actions">
      <button class="auto-message-notification__btn auto-message-notification__btn--close" id="auto-msg-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // 绑定关闭事件
  const closeBtn = container.querySelector('#auto-msg-close');
  closeBtn?.addEventListener('click', () => {
    hideNotification(id);
  });

  // 4秒后自动隐藏
  setTimeout(() => {
    hideNotification(id);
  }, 4000);
}
