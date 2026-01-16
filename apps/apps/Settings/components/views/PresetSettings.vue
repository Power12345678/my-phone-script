<template>
  <div class="preset-settings">
    <div class="detail-page">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" @click="handleBack">
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
        <span class="nav-title">预设配置</span>
        <div class="nav-actions">
          <button class="nav-btn" @click="$emit('openAutoFill')" title="自动填充管理">
            <i class="fas fa-magic"></i>
          </button>
          <button class="nav-btn" @click="addPromptBlock" title="添加提示词块">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <div class="detail-content preset-content">
        <!-- 预设管理工具栏 -->
        <div class="preset-toolbar">
          <!-- 第一行：预设选择下拉框 -->
          <div class="preset-selector" @click.stop>
            <div class="preset-select-trigger" @click="togglePresetDropdown">
              <span class="preset-select-text">{{ activePreset?.name || '未选择预设' }}</span>
              <i :class="['fas', 'fa-chevron-down', { 'rotate': showPresetDropdown }]"></i>
            </div>
            <div v-if="showPresetDropdown" class="preset-dropdown">
              <div class="preset-dropdown-item default" @click="resetToDefault">
                <i class="fas fa-undo"></i>
                <span>默认配置</span>
              </div>
              <div class="preset-dropdown-divider" v-if="presetList.length > 0"></div>
              <div
                v-for="preset in presetList"
                :key="preset.id"
                class="preset-dropdown-item"
                :class="{ 'is-active': preset.id === activePresetId }"
                @click="handleSelectPreset(preset)"
              >
                <i class="fas fa-file-alt"></i>
                <span>{{ preset.name }}</span>
              </div>
              <div v-if="presetList.length === 0" class="preset-dropdown-empty">
                暂无保存的预设
              </div>
            </div>
          </div>
          <!-- 第二行：操作按钮 -->
          <div class="preset-actions">
            <button class="preset-action-btn" @click="openCreatePresetModal" title="新建预设">
              <i class="fas fa-plus"></i>
            </button>
            <button class="preset-action-btn" @click="updateCurrentPreset" title="保存更新">
              <i class="fas fa-save"></i>
            </button>
            <button class="preset-action-btn" @click="openRenamePresetModal" :disabled="!activePresetId" title="重命名">
              <i class="fas fa-edit"></i>
            </button>
            <button class="preset-action-btn danger" @click="deleteCurrentPreset" :disabled="!activePresetId" title="删除">
              <i class="fas fa-trash"></i>
            </button>
            <div class="preset-action-divider"></div>
            <button class="preset-action-btn" @click="handleImportPreset" title="导入">
              <i class="fas fa-file-import"></i>
            </button>
            <button class="preset-action-btn" @click="exportPreset" :disabled="!activePresetId" title="导出">
              <i class="fas fa-file-export"></i>
            </button>
          </div>
        </div>

        <!-- 预设名称弹窗 -->
        <PresetNameModal
          v-model:visible="showPresetNameModal"
          :mode="presetModalMode"
          :initial-name="presetNameInput"
          @confirm="handlePresetNameConfirm"
        />

        <div class="preset-list">
          <div
            v-for="(block, index) in presetBlocks"
            :key="block.id"
            class="preset-block"
            :class="{ 'is-fixed': block.fixed, 'is-dragging': dragState.draggingIndex === index, 'drag-over': dragState.dragOverIndex === index }"
            :draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragend="handleDragEnd"
            @dragover="handleDragOver($event, index)"
            @dragenter="handleDragEnter($event, index)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, index)"
            @touchstart="handleTouchStart($event, index)"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <div class="block-header">
              <div class="block-drag">
                <i class="fas fa-grip-vertical"></i>
              </div>
              <div class="block-icon" :class="getRoleClass(block.role)">
                <i :class="getRoleIcon(block.role)"></i>
              </div>
              <template v-if="!block.fixed">
                <input
                  v-model="block.name"
                  class="block-name-input"
                  placeholder="提示词名称"
                />
                <select v-model="block.role" class="role-select">
                  <option value="system">系统</option>
                  <option value="assistant">AI</option>
                  <option value="user">用户</option>
                </select>
                <button
                  class="block-action-btn delete"
                  @click="deleteBlock(index)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </template>
              <template v-else>
                <div class="block-name">{{ block.name }}</div>
                <div class="block-role">{{ getRoleName(block.role) }}</div>
              </template>
            </div>

            <textarea
              v-if="!block.fixed"
              v-model="block.content"
              class="block-content"
              placeholder="输入提示词内容..."
              rows="3"
            ></textarea>
            <div v-else class="block-content-fixed">
              <i class="fas fa-lock"></i>
              <span>{{ block.placeholder }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import PresetNameModal from '../modals/PresetNameModal.vue';
import { usePresets } from '../../composables/usePresets';
import type { PresetConfig } from '../../types';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'openAutoFill'): void;
}>();

// 使用预设管理 composable
const {
  presetList,
  activePresetId,
  presetBlocks,
  showPresetDropdown,
  presetNameInput,
  showPresetNameModal,
  presetModalMode,
  activePreset,
  dragState,
  savePresetsToStorage,
  loadPresetsFromStorage,
  togglePresetDropdown,
  selectPreset: selectPresetBase,
  openCreatePresetModal,
  openRenamePresetModal,
  handlePresetNameConfirm,
  updateCurrentPreset,
  deleteCurrentPreset,
  resetToDefault,
  exportPreset,
  importPreset: importPresetBase,
  addPromptBlock,
  deleteBlock,
  // 拖拽事件
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  // 触摸拖拽事件
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  // 辅助函数
  getRoleClass,
  getRoleIcon,
  getRoleName,
} = usePresets();

// 返回上一页
const handleBack = () => {
  emit('back');
};

// 选择预设
const handleSelectPreset = (preset: PresetConfig) => {
  selectPresetBase(preset);
};

// 导入预设
const handleImportPreset = () => {
  importPresetBase();
};

// 点击外部关闭预设下拉框
const handlePresetClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.preset-selector')) {
    showPresetDropdown.value = false;
  }
};

onMounted(() => {
  loadPresetsFromStorage();
  document.addEventListener('click', handlePresetClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handlePresetClickOutside);
});
</script>

<style scoped lang="scss">
.preset-settings {
  height: 100%;
}

.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
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
  position: relative;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 8px;
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

.nav-actions {
  display: flex;
  gap: 8px;
  min-width: 72px;
  justify-content: flex-end;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  color: #8FB8ED;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(143, 184, 237, 0.2);
  }
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.preset-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-block {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
  transition: all 0.2s, transform 0.15s;
  cursor: default;
}

.preset-block.is-dragging {
  opacity: 0.5;
  transform: scale(0.98);
  border-color: rgba(143, 184, 237, 0.5);
}

.preset-block.drag-over {
  border-color: #8FB8ED;
  background: rgba(143, 184, 237, 0.15);
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3);
}

.preset-block.is-fixed {
  background: rgba(143, 184, 237, 0.08);
  border-color: rgba(143, 184, 237, 0.2);
}

.block-header {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 10px;
}

.block-drag {
  color: #94A3B8;
  font-size: 14px;
  cursor: grab;
  padding: 8px 4px;
  margin: -8px 0;
  touch-action: none;
  user-select: none;
  transition: color 0.2s;
}

.block-drag:hover {
  color: #8FB8ED;
}

.block-drag:active {
  cursor: grabbing;
}

.block-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.block-icon.role-system {
  background: linear-gradient(135deg, #A78BFA, #8B5CF6);
}

.block-icon.role-assistant {
  background: linear-gradient(135deg, #60A5FA, #3B82F6);
}

.block-icon.role-user {
  background: linear-gradient(135deg, #34D399, #10B981);
}

.block-name-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
  height: 32px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.block-name-input:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.block-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  line-height: 32px;
}

.role-select {
  padding: 6px 10px;
  font-size: 12px;
  color: #475569;
  background: rgba(143, 184, 237, 0.15) !important;
  border: 1px solid rgba(143, 184, 237, 0.4) !important;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  height: 32px;
  flex-shrink: 0;
}

.role-select:focus {
  background: rgba(143, 184, 237, 0.25) !important;
  border-color: #8FB8ED !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.2);
}

.block-role {
  font-size: 12px;
  color: #94A3B8;
  padding: 6px 10px;
  height: 32px;
  line-height: 20px;
  flex-shrink: 0;
}

.block-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(143, 184, 237, 0.2);
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  flex-shrink: 0;
}

.block-action-btn:active:not(:disabled) {
  background: rgba(143, 184, 237, 0.2);
  color: #8FB8ED;
}

.block-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.block-action-btn.delete {
  color: #F87171;
}

.block-action-btn.delete:active {
  background: rgba(248, 113, 113, 0.1);
  color: #EF4444;
}

.block-content {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  font-size: 13px;
  color: #475569;
  background: rgba(143, 184, 237, 0.1) !important;
  border: none !important;
  resize: vertical;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
}

.block-content:focus {
  background: rgba(143, 184, 237, 0.18) !important;
  box-shadow: inset 0 0 0 1px rgba(143, 184, 237, 0.3);
}

.block-content::placeholder {
  color: #94A3B8;
}

.block-content-fixed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  font-size: 13px;
  color: #94A3B8;
  background: rgba(143, 184, 237, 0.05);
}

.block-content-fixed i {
  font-size: 12px;
}

/* 预设管理工具栏 */
.preset-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.preset-selector {
  width: 100%;
  position: relative;
}

.preset-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-select-trigger:hover {
  border-color: #8FB8ED;
}

.preset-select-text {
  font-size: 14px;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preset-select-trigger .fa-chevron-down {
  font-size: 12px;
  color: #94A3B8;
  transition: transform 0.2s;
  margin-left: 8px;
}

.preset-select-trigger .fa-chevron-down.rotate {
  transform: rotate(180deg);
}

.preset-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.preset-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-dropdown-item:hover {
  background: rgba(143, 184, 237, 0.1);
}

.preset-dropdown-item.is-active {
  background: rgba(143, 184, 237, 0.15);
  color: #8FB8ED;
  font-weight: 500;
}

.preset-dropdown-item.default {
  color: #94A3B8;
}

.preset-dropdown-item.default:hover {
  color: #8FB8ED;
}

.preset-dropdown-item i {
  font-size: 12px;
  width: 16px;
  text-align: center;
}

.preset-dropdown-divider {
  height: 1px;
  background: rgba(143, 184, 237, 0.15);
  margin: 4px 0;
}

.preset-dropdown-empty {
  padding: 16px;
  text-align: center;
  color: #94A3B8;
  font-size: 13px;
}

.preset-actions {
  display: flex;
  gap: 6px;
  width: 100%;
  justify-content: space-between;
}

.preset-action-btn {
  flex: 1;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 10px;
  color: #64748B;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-action-btn:hover:not(:disabled) {
  background: rgba(143, 184, 237, 0.15);
  border-color: #8FB8ED;
  color: #8FB8ED;
}

.preset-action-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.preset-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.preset-action-btn.danger:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.1);
  border-color: #F87171;
  color: #EF4444;
}

.preset-action-divider {
  width: 1px;
  height: 24px;
  background: rgba(143, 184, 237, 0.2);
  align-self: center;
  flex-shrink: 0;
  margin: 6px 4px;
}
</style>
