<template>
  <div class="detail-page">
    <!-- 头部 -->
    <div class="nav-bar">
      <div class="nav-left">
        <button class="nav-back" @click="$emit('back')">
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>
      <span class="nav-title">其他设置</span>
      <div class="nav-right"></div>
    </div>

    <div class="detail-content">
      <!-- 显示设置 -->
      <div class="settings-section">
        <div class="section-title">显示设置</div>
        <div class="info-note">
          <i class="fas fa-mobile-alt"></i>
          <span>控制手机界面的显示行为</span>
        </div>

        <div class="config-item">
          <div class="config-label">
            <div class="config-icon icon-display">
              <i class="fas fa-power-off"></i>
            </div>
            <div class="config-text">
              <span class="config-name">初始化时显示手机</span>
              <span class="config-desc">关闭后加载脚本时不自动弹出手机</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="showOnInit" @change="onShowOnInitChange">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="config-item">
          <div class="config-label">
            <div class="config-icon icon-append">
              <i class="fas fa-layer-group"></i>
            </div>
            <div class="config-text">
              <span class="config-name">追加到最后楼层</span>
              <span class="config-desc">新内容追加到最后楼层而非新建楼层</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="appendToLastMessage" @change="onAppendToLastMessageChange">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="config-item">
          <div class="config-label">
            <div class="config-icon icon-chat-append">
              <i class="fas fa-comments"></i>
            </div>
            <div class="config-text">
              <span class="config-name">聊天追加到最后楼层</span>
              <span class="config-desc">私聊群聊内容追加到最后楼层</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="chatAppendToLastMessage" @change="onChatAppendToLastMessageChange">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="config-item">
          <div class="config-label">
            <div class="config-icon icon-history">
              <i class="fas fa-history"></i>
            </div>
            <div class="config-text">
              <span class="config-name">历史楼层读取数量</span>
              <span class="config-desc">读取最近N层消息，0为全部，越大越慢</span>
            </div>
          </div>
          <input
            type="number"
            class="history-input"
            v-model.number="historyReadCount"
            @change="onHistoryReadCountChange"
            min="0"
            placeholder="100"
          >
        </div>

        <div class="config-item">
          <div class="config-label">
            <div class="config-icon icon-story">
              <i class="fas fa-book-open"></i>
            </div>
            <div class="config-text">
              <span class="config-name">发送消息推进正文</span>
              <span class="config-desc">发送消息时自动触发酒馆生成正文剧情</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoTriggerStory" @change="onAutoTriggerStoryChange">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="settings-section">
        <div class="section-title">说明</div>
        <div class="help-content">
          <p>• 关闭"初始化时显示手机"后，脚本加载时手机不会自动弹出</p>
          <p>• 可以通过点击酒馆助手脚本库中的"显示/隐藏手机"按钮来手动打开</p>
          <p>• 开启"追加到最后楼层"后，新生成的模块内容会追加到最后楼层末尾</p>
          <p>• 开启"聊天追加到最后楼层"后，私聊和群聊内容会追加到最后楼层末尾</p>
          <p>• "历史楼层读取数量"控制读取最近多少层消息，0为全部，默认100</p>
          <p>• 开启"发送消息推进正文"后，发送消息会自动触发酒馆生成正文剧情</p>
          <p>• 此设置保存在浏览器本地，更换浏览器需重新设置</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDisplaySettings } from '../../composables/useDisplaySettings';

defineEmits<{
  (e: 'back'): void;
}>();

// 显示设置
const { displaySettings, loadSettings, updateSetting } = useDisplaySettings();
const showOnInit = ref(true);
const appendToLastMessage = ref(false);
const chatAppendToLastMessage = ref(false);
const historyReadCount = ref(100);
const autoTriggerStory = ref(false);

onMounted(() => {
  loadSettings();
  showOnInit.value = displaySettings.value.showOnInit;
  appendToLastMessage.value = displaySettings.value.appendToLastMessage;
  chatAppendToLastMessage.value = displaySettings.value.chatAppendToLastMessage;
  historyReadCount.value = displaySettings.value.historyReadCount;
  autoTriggerStory.value = displaySettings.value.autoTriggerStory;
});

const onShowOnInitChange = () => {
  updateSetting('showOnInit', showOnInit.value);
};

const onAppendToLastMessageChange = () => {
  updateSetting('appendToLastMessage', appendToLastMessage.value);
};

const onChatAppendToLastMessageChange = () => {
  updateSetting('chatAppendToLastMessage', chatAppendToLastMessage.value);
};

const onHistoryReadCountChange = () => {
  // 确保值不为负数
  if (historyReadCount.value < 0) historyReadCount.value = 0;
  updateSetting('historyReadCount', historyReadCount.value);
};

const onAutoTriggerStoryChange = () => {
  updateSetting('autoTriggerStory', autoTriggerStory.value);
};
</script>

<style scoped lang="scss">
.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #E8F4FD 0%, #F0F7FC 100%);
}

/* 导航栏 */
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
  min-width: 36px;
  min-height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.icon-display { background: linear-gradient(135deg, #F59E0B, #D97706); }
.icon-append { background: linear-gradient(135deg, #8B5CF6, #7C3AED); }
.icon-chat-append { background: linear-gradient(135deg, #10B981, #059669); }
.icon-history { background: linear-gradient(135deg, #3B82F6, #2563EB); }
.icon-story { background: linear-gradient(135deg, #EC4899, #DB2777); }

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
  background: #F59E0B;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
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

/* 历史楼层数量输入框 */
.history-input {
  width: 70px;
  height: 32px;
  border: 1px solid rgba(143, 184, 237, 0.5) !important;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  color: #475569;
  background: white !important;
  outline: none;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
}
</style>
