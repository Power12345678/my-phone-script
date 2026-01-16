<template>
  <div class="detail-page">
    <div class="nav-bar">
      <button class="nav-back" @click="$emit('back')">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="nav-title">API 配置</span>
      <div style="width: 28px;"></div>
    </div>

    <div class="detail-content">
      <div class="api-section">
        <div class="section-title">接口设置</div>

        <div class="input-group">
          <label class="input-label">API URL</label>
          <input
            v-model="apiConfig.url"
            type="text"
            class="input-field"
            placeholder="请输入 API 地址"
          />
        </div>

        <div class="input-group">
          <label class="input-label">API Key</label>
          <div class="password-input">
            <input
              v-model="apiConfig.key"
              :type="showApiKey ? 'text' : 'password'"
              class="input-field"
              placeholder="请输入 API 密钥"
            />
            <button class="toggle-visibility" @click="showApiKey = !showApiKey">
              <i :class="['fas', showApiKey ? 'fa-eye-slash' : 'fa-eye']"></i>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">选择模型</label>
          <div class="model-select-row">
            <div class="model-selector" @click.stop>
              <div class="model-select-trigger" @click="toggleModelDropdown">
                <span class="model-select-text">{{ apiConfig.model || '请选择模型' }}</span>
                <i :class="['fas', 'fa-chevron-down', { 'rotate': showModelDropdown }]"></i>
              </div>
              <div v-if="showModelDropdown" class="model-dropdown">
                <input
                  v-model="modelFilter"
                  class="model-filter-input"
                  placeholder="输入关键字筛选..."
                  @click.stop
                />
                <div class="model-list">
                  <div
                    v-for="model in filteredModels"
                    :key="model"
                    class="model-option"
                    :class="{ 'is-selected': model === apiConfig.model }"
                    @click="selectModel(model)"
                  >
                    {{ model }}
                  </div>
                  <div v-if="modelList.length === 0" class="model-empty">
                    <i class="fas fa-cloud-download-alt"></i>
                    <span>请先获取模型列表</span>
                  </div>
                  <div v-else-if="filteredModels.length === 0" class="model-empty">
                    <i class="fas fa-search"></i>
                    <span>没有匹配的模型</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              class="fetch-models-btn"
              :disabled="isLoadingModels"
              @click="fetchModels"
            >
              <i :class="['fas', isLoadingModels ? 'fa-spinner fa-spin' : 'fa-sync-alt']"></i>
            </button>
          </div>
        </div>

        <div class="section-divider-line">
          <span>高级设置</span>
        </div>

        <!-- 温度 -->
        <div class="input-group">
          <div class="input-label-row">
            <label class="input-label">温度 (Temperature)</label>
            <span class="temperature-value">{{ apiConfig.temperature.toFixed(2) }}</span>
          </div>
          <div class="temperature-slider-row">
            <input
              v-model.number="apiConfig.temperature"
              type="range"
              class="temperature-slider"
              min="0"
              max="2"
              step="0.01"
            />
            <div class="temperature-labels">
              <span>精确</span>
              <span>平衡</span>
              <span>创意</span>
            </div>
          </div>
        </div>

        <!-- 流式传输 -->
        <div class="input-group streaming-group">
          <div class="streaming-label">
            <label class="input-label">流式传输</label>
            <span class="input-hint">启用后实时显示生成内容</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="apiConfig.streaming" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <button class="save-btn" @click="saveApiConfig">
          <i class="fas fa-save"></i>
          <span>保存配置</span>
        </button>
      </div>

      <div class="api-note">
        <i class="fas fa-info-circle"></i>
        <span>配置将保存到本地存储，用于聊天功能调用</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApiConfig } from '../../composables/useApiConfig';

defineEmits<{
  (e: 'back'): void;
}>();

const {
  apiConfig,
  showApiKey,
  modelList,
  modelFilter,
  showModelDropdown,
  isLoadingModels,
  filteredModels,
  saveApiConfig,
  fetchModels,
  toggleModelDropdown,
  selectModel,
} = useApiConfig();
</script>

<style scoped lang="scss">
/* MistyGlass 风格 */
.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #e8f4fd 0%, #f0f7fc 100%);
  overflow: hidden;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.nav-back {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(143, 184, 237, 0.1);
  color: #8fb8ed;
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
  padding: 20px;
}

/* API 配置页面 */
.api-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 20px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 16px;
}

.input-group {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #64748B;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.input-field:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.input-field::placeholder {
  color: #94A3B8;
}

.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input .input-field {
  padding-right: 44px;
}

.toggle-visibility {
  position: absolute;
  right: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  transition: color 0.2s;
}

.toggle-visibility:active {
  color: #8FB8ED;
}

.save-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.3);
}

.save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(143, 184, 237, 0.2);
}

.api-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 12px;
  color: #8FB8ED;
  font-size: 13px;
}

/* 高级设置分隔线 */
.section-divider-line {
  display: flex;
  align-items: center;
  margin: 20px 0 16px;
  gap: 12px;
}

.section-divider-line::before,
.section-divider-line::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(143, 184, 237, 0.3), transparent);
}

.section-divider-line span {
  font-size: 12px;
  color: #94A3B8;
  white-space: nowrap;
}

/* 输入标签行 */
.input-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.input-hint {
  font-size: 12px;
  color: #94A3B8;
}

/* 上下文长度输入 */
.context-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.context-input {
  flex: 1;
  text-align: center;
}

.context-unit {
  font-size: 13px;
  color: #64748B;
  min-width: 50px;
}

/* 温度滑块 */
.temperature-value {
  font-size: 14px;
  font-weight: 600;
  color: #8FB8ED;
  background: rgba(143, 184, 237, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
}

.temperature-slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.temperature-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, #60A5FA, #A8D8B9, #FFC8DD);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.temperature-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid #8FB8ED;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.temperature-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(143, 184, 237, 0.4);
}

.temperature-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid #8FB8ED;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.temperature-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94A3B8;
}

/* 流式传输开关 */
.streaming-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.streaming-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.streaming-label .input-label {
  margin-bottom: 0;
}

.streaming-label .input-hint {
  font-size: 11px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(148, 163, 184, 0.3);
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

/* 模型选择样式 */
.model-select-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.model-selector {
  flex: 1;
  position: relative;
}

.model-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.model-select-trigger:hover {
  border-color: #8FB8ED;
}

.model-select-text {
  font-size: 14px;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.model-select-trigger .fa-chevron-down {
  font-size: 12px;
  color: #94A3B8;
  transition: transform 0.2s;
}

.model-select-trigger .fa-chevron-down.rotate {
  transform: rotate(180deg);
}

.model-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  overflow: hidden;
}

.model-filter-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.6) !important;
  border: none !important;
  border-bottom: 1px solid rgba(143, 184, 237, 0.3) !important;
  outline: none;
  box-sizing: border-box;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.model-filter-input:focus {
  background-color: rgba(255, 255, 255, 0.8) !important;
  border-bottom-color: rgba(143, 184, 237, 0.5) !important;
}

.model-filter-input::placeholder {
  color: #94A3B8;
}

.model-list {
  max-height: 200px;
  overflow-y: auto;
}

.model-list::-webkit-scrollbar {
  width: 4px;
}

.model-list::-webkit-scrollbar-track {
  background: transparent;
}

.model-list::-webkit-scrollbar-thumb {
  background: rgba(143, 184, 237, 0.3);
  border-radius: 2px;
}

.model-option {
  padding: 10px 14px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-option:hover {
  background: rgba(143, 184, 237, 0.1);
}

.model-option:active {
  background: rgba(143, 184, 237, 0.2);
}

.model-option.is-selected {
  background: rgba(143, 184, 237, 0.15);
  color: #8FB8ED;
  font-weight: 500;
}

.model-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 14px;
  color: #94A3B8;
  font-size: 13px;
}

.model-empty i {
  font-size: 20px;
  opacity: 0.6;
}

.fetch-models-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.3);
}

.fetch-models-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.fetch-models-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
