<template>
  <div class="detail-page">
    <!-- 头部 -->
    <div class="nav-bar">
      <div class="nav-left">
        <button class="nav-back" @click="$emit('back')">
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>
      <span class="nav-title">自动回复设置</span>
      <div class="nav-right"></div>
    </div>

    <div class="detail-content">
      <!-- AI主动发送信息 -->
      <div class="settings-section">
        <div class="section-title">AI主动发送信息</div>
        <div class="info-note" style="margin-bottom: 12px;">
          <i class="fas fa-paper-plane"></i>
          <span>开启后，AI可以主动向你发送对应类型的消息</span>
        </div>

        <!-- 应用开关 -->
        <div class="config-item" v-for="app in apps" :key="app.key">
          <div class="config-label">
            <div class="config-icon" :class="app.iconClass">
              <i :class="app.icon"></i>
            </div>
            <div class="config-text">
              <span class="config-name">{{ app.name }}</span>
              <span class="config-desc">{{ app.desc }}</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings[app.key]" @change="saveSettings">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- 世界书条目状态 -->
        <div class="worldbook-status" style="margin-top: 12px;">
          <div class="status-row">
            <span class="status-label">世界书条目</span>
            <span class="status-value" :class="{ 'status-active': worldbookEntryExists }">
              {{ worldbookEntryExists ? '已添加' : '未添加' }}
            </span>
          </div>
          <div class="status-hint">
            {{ worldbookEntryExists
              ? '世界书条目已添加，AI可以识别发消息指令'
              : '需要添加世界书条目，AI才能输出发消息指令'
            }}
          </div>
        </div>
        <button class="action-btn" :class="{ 'btn-danger': worldbookEntryExists }" @click="toggleWorldbookEntry">
          <i :class="worldbookEntryExists ? 'fas fa-trash' : 'fas fa-plus'"></i>
          {{ worldbookEntryExists ? '移除发消息条目' : '添加发消息条目' }}
        </button>
      </div>

      <!-- 基本信息世界书条目 -->
      <div class="settings-section">
        <div class="section-title">基本信息世界书条目</div>
        <div class="worldbook-status">
          <div class="status-row">
            <span class="status-label">条目状态</span>
            <span class="status-value" :class="{ 'status-active': basicInfoEntryExists }">
              {{ basicInfoEntryExists ? '已添加' : '未添加' }}
            </span>
          </div>
          <div class="status-hint">
            {{ basicInfoEntryExists
              ? '基本信息已添加到世界书，AI可获取角色和群聊列表'
              : '将角色和群聊信息添加到世界书供AI参考'
            }}
          </div>
        </div>
        <button class="action-btn" :class="{ 'btn-danger': basicInfoEntryExists }" @click="toggleBasicInfoEntry">
          <i :class="basicInfoEntryExists ? 'fas fa-trash' : 'fas fa-plus'"></i>
          {{ basicInfoEntryExists ? '移除基本信息条目' : '添加基本信息条目' }}
        </button>
      </div>

      <!-- AI主动加好友 -->
      <div class="settings-section">
        <div class="section-title">AI主动加好友</div>
        <div class="info-note" style="margin-bottom: 12px;">
          <i class="fas fa-user-plus"></i>
          <span>开启后，AI可以在剧情中自动添加新角色为好友</span>
        </div>
        <div class="config-item">
          <div class="config-label">
            <div class="config-icon icon-friend">
              <i class="fas fa-user-plus"></i>
            </div>
            <div class="config-text">
              <span class="config-name">自动加好友</span>
              <span class="config-desc">解析AI输出中的加好友指令</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="addFriendSettings.enabled" @change="saveAddFriendSettings">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="config-item">
          <div class="config-label">
            <div class="config-icon icon-sync">
              <i class="fas fa-sync"></i>
            </div>
            <div class="config-text">
              <span class="config-name">自动更新基本信息</span>
              <span class="config-desc">添加好友后自动更新世界书条目</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="addFriendSettings.updateBasicInfo" @change="saveAddFriendSettings">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="worldbook-status" style="margin-top: 12px;">
          <div class="status-row">
            <span class="status-label">世界书条目</span>
            <span class="status-value" :class="{ 'status-active': addFriendEntryExists }">
              {{ addFriendEntryExists ? '已添加' : '未添加' }}
            </span>
          </div>
          <div class="status-hint">
            {{ addFriendEntryExists
              ? 'AI会在角色成为好友时输出加好友指令'
              : '添加世界书条目后AI才能识别加好友场景'
            }}
          </div>
        </div>
        <button class="action-btn" :class="{ 'btn-danger': addFriendEntryExists }" @click="toggleAddFriendEntry">
          <i :class="addFriendEntryExists ? 'fas fa-trash' : 'fas fa-plus'"></i>
          {{ addFriendEntryExists ? '移除加好友条目' : '添加加好友条目' }}
        </button>
      </div>

      <!-- 使用说明 -->
      <div class="settings-section">
        <div class="section-title">使用说明</div>
        <div class="help-content">
          <p>1. 添加世界书条目后，AI会在合适时机输出发消息指令</p>
          <p>2. 开启对应应用的开关，系统才会处理该类型的消息</p>
          <p>3. 触发时会在酒馆显示提示，并自动生成消息内容</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import _ from 'lodash';
import { store } from '../../../../store';
import {
  loadAddFriendSettings as loadAddFriendSettingsFromModule,
  saveAddFriendSettings as saveAddFriendSettingsToModule,
  checkAddFriendEntryExists,
  toggleAddFriendEntry as toggleAddFriendEntryFromModule,
  type AddFriendSettings,
} from '../../../../addFriend';

defineEmits<{
  (e: 'back'): void;
}>();

// 应用配置列表
const apps = [
  { key: 'private_chat', name: '私聊', desc: '角色发送私聊消息', icon: 'fas fa-comment', iconClass: 'icon-chat' },
  { key: 'group_chat', name: '群聊', desc: '角色在群聊中发消息', icon: 'fas fa-comments', iconClass: 'icon-group' },
  { key: 'dynamic', name: '动态', desc: '角色发布个人动态', icon: 'fas fa-stream', iconClass: 'icon-dynamic' },
  { key: 'live_list', name: '直播列表', desc: '角色开启直播', icon: 'fas fa-video', iconClass: 'icon-live' },
];

// 设置状态
const settings = ref<Record<string, boolean>>({
  private_chat: false,
  group_chat: false,
  dynamic: false,
  live_list: false,
});

// 世界书条目状态
const worldbookEntryExists = ref(false);

// 基本信息条目状态
const basicInfoEntryExists = ref(false);

// 加好友设置状态
const addFriendSettings = ref<AddFriendSettings>({
  enabled: false,
  updateBasicInfo: true,
});

// 加好友条目状态
const addFriendEntryExists = ref(false);

// 世界书条目名称
const AUTO_MESSAGE_ENTRY_NAME = '[auto_message]主动发消息指令';
const BASIC_INFO_ENTRY_NAME = '[basic_info]角色与群聊信息';

// 各应用的提示词模板
const APP_PROMPTS: Record<string, { type: string; desc: string; action: string }> = {
  private_chat: { type: 'private_chat', desc: '私聊消息', action: '发私聊给{{user}}' },
  group_chat: { type: 'group_chat', desc: '群聊消息（需要group字段指定群名）', action: '发送群聊' },
  dynamic: { type: 'dynamic', desc: '发布个人动态', action: '发动态' },
  live_list: { type: 'live_list', desc: '开启直播', action: '开启直播' },
};

// 根据开启的应用生成世界书内容
const generateWorldbookContent = (): string => {
  const enabledApps = Object.entries(settings.value)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  if (enabledApps.length === 0) {
    return '';
  }

  // 获取角色和群聊信息
  const characters = Array.from(store.chat.characters.values()).map(c => c.name);
  const groupChats = Array.from(store.chat.groupChats.values()).map(g => g.name);

  // 生成角色和群聊列表
  let infoSection = '';
  if (characters.length > 0) {
    infoSection += `当前角色列表：${characters.join('、')}\n`;
  }
  if (enabledApps.includes('group_chat') && groupChats.length > 0) {
    infoSection += `当前群聊列表：${groupChats.join('、')}\n`;
  }
  if (infoSection) {
    infoSection += '\n';
  }

  // 生成动作描述
  const actions = enabledApps.map(key => APP_PROMPTS[key].action);
  const actionText = actions.join('/');

  // 生成应用类型说明
  const appTypeList = enabledApps
    .map(key => `- ${APP_PROMPTS[key].type}: ${APP_PROMPTS[key].desc}`)
    .join('\n');

  // 检查是否需要group字段
  const needsGroup = enabledApps.includes('group_chat');

  // 生成数量限制说明
  const limitRules: string[] = [];
  if (enabledApps.includes('private_chat')) {
    limitRules.push('每个角色最多生成一条私聊，场景内的用户{{User}}身边的角色不可直接发送消息，因为可以直接交流，可以适当引入非场景中重要角色');
  }
  if (enabledApps.includes('group_chat')) {
    limitRules.push('每个群聊最多生成一条消息');
  }
  if (enabledApps.includes('dynamic')) {
    limitRules.push('动态最多生成一条');
  }
  if (enabledApps.includes('live_list')) {
    limitRules.push('直播最多生成一条');
  }
  const limitText = limitRules.length > 0
    ? `- 数量限制：通常只生成一条，特殊情况下${limitRules.join('，')}\n`
    : '';

  let content = `${infoSection}当你认为有角色（不含{{user}}）需要主动${actionText}时，必须在正文结束后的末尾添加：

<send_message>
app: 应用类型
sender: 发送者姓名
reason: 发消息原因
content: 一句话消息大意${needsGroup ? '\ngroup: 群聊名称（仅group_chat需要）' : ''}
</send_message>

可用的应用类型：
${appTypeList}

注意：
- sender必须是已存在的角色名
${limitText}- 只允许生成以上格式，表明角色行动意向，禁止直接生成具体内容
- 禁止使用可用类型之外的应用类型
- 只允许角色使用，禁止代替{{user}}发送消息`;

  return content;
};

// 加载设置
const loadSettings = () => {
  try {
    const chatVars = getVariables({ type: 'chat' }) || {};
    const autoReply = chatVars.autoReply || {};
    if (autoReply.settings) {
      Object.assign(settings.value, autoReply.settings);
    }
    worldbookEntryExists.value = autoReply.worldbookEntryAdded || false;
    basicInfoEntryExists.value = autoReply.basicInfoEntryAdded || false;
  } catch (e) {
    console.error('加载自动回复设置失败:', e);
  }
};

// 保存设置
const saveSettings = async () => {
  try {
    const chatVars = getVariables({ type: 'chat' }) || {};
    chatVars.autoReply = {
      ...chatVars.autoReply,
      settings: { ...settings.value },
    };
    replaceVariables(chatVars, { type: 'chat' });

    // 如果世界书条目已存在，更新其内容
    if (worldbookEntryExists.value) {
      await updateWorldbookEntry();
    }
  } catch (e) {
    console.error('保存自动回复设置失败:', e);
  }
};

// 更新世界书条目内容
const updateWorldbookEntry = async () => {
  try {
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookName = charWorldbooks.primary;
    if (!worldbookName) return;

    const content = generateWorldbookContent();
    if (!content) {
      // 没有开启任何应用，删除条目
      await deleteWorldbookEntries(worldbookName, entry => entry.name === AUTO_MESSAGE_ENTRY_NAME);
      worldbookEntryExists.value = false;
      return;
    }

    // 先删除旧条目再创建新条目
    await deleteWorldbookEntries(worldbookName, entry => entry.name === AUTO_MESSAGE_ENTRY_NAME);
    await createWorldbookEntries(worldbookName, [{
      name: AUTO_MESSAGE_ENTRY_NAME,
      enabled: true,
      strategy: { type: 'constant' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 100 },
      content,
    }]);
  } catch (e) {
    console.error('更新世界书条目失败:', e);
  }
};

// 切换世界书条目
const toggleWorldbookEntry = async () => {
  try {
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookName = charWorldbooks.primary;

    if (!worldbookName) {
      toastr.error('当前角色卡没有绑定世界书');
      return;
    }

    if (worldbookEntryExists.value) {
      // 删除条目
      await deleteWorldbookEntries(worldbookName, entry => entry.name === AUTO_MESSAGE_ENTRY_NAME);
      worldbookEntryExists.value = false;
      toastr.success('已移除世界书条目');
    } else {
      // 检查是否有开启的应用
      const content = generateWorldbookContent();
      if (!content) {
        toastr.warning('请先开启至少一个应用');
        return;
      }

      // 添加条目
      await createWorldbookEntries(worldbookName, [{
        name: AUTO_MESSAGE_ENTRY_NAME,
        enabled: true,
        strategy: { type: 'constant' },
        position: { type: 'at_depth', role: 'system', depth: 0, order: 100 },
        content,
      }]);
      worldbookEntryExists.value = true;
      toastr.success('已添加世界书条目');
    }

    // 保存状态
    const chatVars = getVariables({ type: 'chat' }) || {};
    chatVars.autoReply = { ...chatVars.autoReply, worldbookEntryAdded: worldbookEntryExists.value };
    replaceVariables(chatVars, { type: 'chat' });
  } catch (e) {
    console.error('操作世界书条目失败:', e);
    toastr.error('操作失败: ' + e);
  }
};

// 生成基本信息世界书内容
const generateBasicInfoContent = (): string => {
  try {
    const charVars = getVariables({ type: 'character' }) || {};
    const phoneData = _.get(charVars, 'phone_data');

    if (!phoneData) {
      return '';
    }

    const lines: string[] = [];

    // 角色信息
    const characters = phoneData.characters || [];
    if (characters.length > 0) {
      lines.push('角色列表:');
      characters.forEach((char: { name: string; nickname?: string }) => {
        let charLine = `  - ${char.name}`;
        if (char.nickname) {
          charLine += ` (网名: ${char.nickname})`;
        }
        lines.push(charLine);
      });
      lines.push('');
    }

    // 群聊信息
    const groups = phoneData.groups || [];
    if (groups.length > 0) {
      lines.push('群聊列表:');
      groups.forEach((group: { name: string; id?: string; avatar?: string }) => {
        lines.push(`  - ${group.name}`);
      });
      lines.push('');
    }

    // 用户信息
    const user = phoneData.user;
    if (user) {
      lines.push('用户信息:');
      let userLine = `  - ${user.name || '{{user}}'}`;
      if (user.nickname) {
        userLine += ` (网名: ${user.nickname})`;
      }
      lines.push(userLine);
    }

    if (lines.length === 0) {
      return '';
    }

    return lines.join('\n');
  } catch (e) {
    console.error('生成基本信息内容失败:', e);
    return '';
  }
};

// 切换基本信息条目
const toggleBasicInfoEntry = async () => {
  try {
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookName = charWorldbooks.primary;

    if (!worldbookName) {
      toastr.error('当前角色卡没有绑定世界书');
      return;
    }

    if (basicInfoEntryExists.value) {
      // 删除条目
      await deleteWorldbookEntries(worldbookName, entry => entry.name === BASIC_INFO_ENTRY_NAME);
      basicInfoEntryExists.value = false;
      toastr.success('已移除基本信息条目');
    } else {
      // 添加条目
      const content = generateBasicInfoContent();
      if (!content) {
        toastr.warning('未找到基本信息数据');
        return;
      }

      // 先删除旧条目再创建新条目
      await deleteWorldbookEntries(worldbookName, entry => entry.name === BASIC_INFO_ENTRY_NAME);
      await createWorldbookEntries(worldbookName, [{
        name: BASIC_INFO_ENTRY_NAME,
        enabled: true,
        strategy: { type: 'constant' },
        position: { type: 'at_depth', role: 'system', depth: 0, order: 99 },
        content: `<basic_info>\n${content}\n</basic_info>`,
      }]);
      basicInfoEntryExists.value = true;
      toastr.success('已添加基本信息条目');
    }

    // 保存状态
    const chatVars = getVariables({ type: 'chat' }) || {};
    chatVars.autoReply = {
      ...chatVars.autoReply,
      basicInfoEntryAdded: basicInfoEntryExists.value,
    };
    replaceVariables(chatVars, { type: 'chat' });
  } catch (e) {
    console.error('操作基本信息条目失败:', e);
    toastr.error('操作失败: ' + e);
  }
};

// ========== 加好友功能 ==========

// 保存加好友设置
const saveAddFriendSettings = () => {
  saveAddFriendSettingsToModule(addFriendSettings.value);
};

// 切换加好友世界书条目
const toggleAddFriendEntry = async () => {
  try {
    const success = await toggleAddFriendEntryFromModule(!addFriendEntryExists.value);
    if (success) {
      addFriendEntryExists.value = !addFriendEntryExists.value;
      toastr.success(addFriendEntryExists.value ? '已添加加好友条目' : '已移除加好友条目');
    } else {
      toastr.error('操作失败');
    }
  } catch (e) {
    console.error('操作加好友条目失败:', e);
    toastr.error('操作失败: ' + e);
  }
};

// 初始化
onMounted(async () => {
  loadSettings();
  // 加载加好友设置
  addFriendSettings.value = loadAddFriendSettingsFromModule();
  addFriendEntryExists.value = await checkAddFriendEntryExists();
});
</script>

<style scoped lang="scss">
.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #E8F4FD 0%, #F0F7FC 100%);
}

/* 导航栏 - 与用户数据页面保持一致 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 72px;
}

.nav-right {
  min-width: 72px;
}

.nav-back {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(143, 184, 237, 0.1);
  color: #8FB8ED;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 10px;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(143, 184, 237, 0.2);
  }
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #475569;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 提示信息 */
.info-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 12px;
  color: #8FB8ED;
  font-size: 13px;
  margin-bottom: 16px;
}

/* 设置区块 */
.settings-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
}

/* 配置项 */
.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(143, 184, 237, 0.1);
}

.config-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.config-item:first-child {
  padding-top: 0;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.icon-chat { background: linear-gradient(135deg, #8FB8ED, #7AA8E0); }
.icon-group { background: linear-gradient(135deg, #A8D8B9, #8BC9A0); }
.icon-dynamic { background: linear-gradient(135deg, #FFC8DD, #FFB3C6); }
.icon-live { background: linear-gradient(135deg, #F87171, #EF4444); }
.icon-friend { background: linear-gradient(135deg, #A78BFA, #8B5CF6); }
.icon-sync { background: linear-gradient(135deg, #60A5FA, #3B82F6); }

.config-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.config-name {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.config-desc {
  font-size: 12px;
  color: #94A3B8;
}

/* 开关 */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #CBD5E1;
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: #34D399;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* 世界书状态 */
.worldbook-status {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.status-label {
  font-size: 13px;
  color: #64748B;
}

.status-value {
  font-size: 13px;
  font-weight: 500;
  color: #94A3B8;
}

.status-value.status-active {
  color: #10B981;
}

.status-hint {
  font-size: 12px;
  color: #94A3B8;
  line-height: 1.5;
}

/* 操作按钮 */
.action-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #34D399, #10B981);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn.btn-danger {
  background: linear-gradient(135deg, #F87171, #EF4444);
}

/* 帮助内容 */
.help-content {
  font-size: 13px;
  color: #64748B;
  line-height: 1.8;
}

.help-content p {
  margin: 0 0 6px 0;
}

.help-content p:last-child {
  margin-bottom: 0;
}
</style>
