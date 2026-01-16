<template>
  <div class="detail-page">
    <div class="nav-bar">
      <div class="nav-left">
        <button class="nav-back" @click="$emit('back')">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="nav-save" @click="$emit('save')" title="保存">
          <i class="fas fa-save"></i>
        </button>
      </div>
      <span class="nav-title">用户数据</span>
      <div class="nav-right"></div>
    </div>

    <div class="detail-content" v-if="editableData">
      <div class="user-profile-card">
        <div
          class="user-avatar-large editable-avatar"
          @click="$emit('openImagePicker', 'avatar', (url: string) => { if(editableData) editableData.user.avatar = url })"
        >
          <img :src="editableData.user.avatar" alt="avatar" />
        </div>
        <div class="profile-input-item">
          <div class="info-label" style="text-align: center;">姓名</div>
          <input
            v-model="editableData.user.name"
            class="editable-input"
            style="text-align: center; font-size: 18px; font-weight: 600; max-width: 200px;"
            placeholder="姓名"
          />
        </div>
        <div class="profile-input-item">
          <div class="info-label" style="text-align: center;">网名</div>
          <input
            v-model="editableData.user.nickname"
            class="editable-input"
            style="text-align: center; font-size: 14px; max-width: 150px;"
            placeholder="网名"
          />
        </div>
      </div>

      <div class="info-section">
        <div class="info-item">
          <div class="info-label">用户ID</div>
          <input v-model="editableData.user.id" class="editable-input" style="max-width: 150px;" />
        </div>
        <div class="info-item">
          <div class="info-label">邮箱</div>
          <input v-model="editableData.user.email" class="editable-input" style="max-width: 200px;" />
        </div>
        <div class="info-item">
          <div class="info-label">状态</div>
          <input v-model="editableData.user.state" class="editable-input" style="max-width: 100px;" />
        </div>
        <div class="info-item bio-item">
          <div class="info-label">个人简介</div>
          <textarea v-model="editableData.user.bio" class="editable-textarea" rows="3"></textarea>
        </div>
      </div>

      <!-- 手机屏幕背景 -->
      <div class="bg-section">
        <div class="bg-title">手机屏幕背景</div>
        <div
          class="bg-preview editable-bg-preview"
          @click="$emit('openImagePicker', 'background', (url: string) => { if(editableData) editableData.user.phoneBg = url })"
        >
          <img :src="editableData.user.phoneBg" alt="手机屏幕背景" />
        </div>
      </div>

      <!-- 聊天列表背景 -->
      <div class="bg-section">
        <div class="bg-title">聊天列表背景</div>
        <div
          class="bg-preview editable-bg-preview"
          @click="$emit('openImagePicker', 'background', (url: string) => { if(editableData) editableData.user.chatListBg = url })"
        >
          <img v-if="editableData.user.chatListBg" :src="editableData.user.chatListBg" alt="聊天列表背景" />
          <div v-else class="bg-placeholder">
            <i class="fas fa-image"></i>
            <span>点击设置背景</span>
          </div>
        </div>
      </div>

      <!-- 字体设置 -->
      <div class="font-section">
        <div class="font-header" @click="showFontPicker = !showFontPicker">
          <div class="font-title">
            <i class="fas fa-font"></i>
            <span>界面字体</span>
          </div>
          <div class="font-current">
            <span :style="{ fontFamily: editableData.user.font || 'inherit' }">
              {{ editableData.user.font || '默认字体' }}
            </span>
            <i class="fas" :class="showFontPicker ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </div>
        </div>
        <div v-if="showFontPicker" class="font-list">
          <!-- 默认字体选项 -->
          <div
            class="font-item"
            :class="{ active: !editableData.user.font }"
            @click="selectFont('')"
          >
            <span class="font-preview">默认字体</span>
            <i v-if="!editableData.user.font" class="fas fa-check"></i>
          </div>
          <!-- 已添加的字体 -->
          <div
            v-for="font in availableFonts"
            :key="font.name"
            class="font-item"
            :class="{ active: editableData.user.font === font.name }"
          >
            <span class="font-preview" :style="{ fontFamily: font.name }" @click="selectFont(font.name)">
              {{ font.name }}
            </span>
            <div class="font-actions">
              <i v-if="editableData.user.font === font.name" class="fas fa-check"></i>
              <i class="fas fa-trash delete-font" @click.stop="deleteFont(font.name)" title="删除字体"></i>
            </div>
          </div>
          <!-- 添加字体按钮 -->
          <div class="font-item add-font-item" @click="showAddFontDialog = true">
            <i class="fas fa-plus"></i>
            <span>添加字体</span>
          </div>
        </div>
      </div>

      <!-- 添加字体弹窗 -->
      <div v-if="showAddFontDialog" class="font-dialog-overlay" @click.self="showAddFontDialog = false">
        <div class="font-dialog">
          <div class="font-dialog-header">
            <span>添加字体</span>
            <i class="fas fa-times" @click="showAddFontDialog = false"></i>
          </div>
          <div class="font-dialog-content">
            <div class="font-input-group">
              <label>字体名称 (font-family)</label>
              <input v-model="newFontName" placeholder="如：MuzaiPixel" class="font-input" />
              <div class="font-input-hint">必须与 CSS 中定义的 font-family 一致</div>
            </div>
            <div class="font-input-group">
              <label>CSS 链接</label>
              <input v-model="newFontUrl" placeholder="https://..." class="font-input" />
            </div>
            <div class="font-dialog-tip">
              <i class="fas fa-info-circle"></i>
              <span>打开 CSS 链接查看 font-family 的值</span>
            </div>
          </div>
          <div class="font-dialog-actions">
            <button class="font-btn cancel" @click="showAddFontDialog = false">取消</button>
            <button class="font-btn confirm" @click="addFont">添加</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PhoneData, FontItem } from '../../types';

const props = defineProps<{
  editableData: PhoneData | null;
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'save'): void;
  (e: 'openImagePicker', type: 'avatar' | 'background', callback: (url: string) => void): void;
}>();

// 字体选择器状态
const showFontPicker = ref(false);
const showAddFontDialog = ref(false);
const newFontName = ref('');
const newFontUrl = ref('');

// 可用字体列表（从 editableData.fonts 获取）
const availableFonts = computed(() => {
  return props.editableData?.fonts || [];
});

// 选择字体
const selectFont = (font: string) => {
  if (props.editableData) {
    props.editableData.user.font = font;
  }
  showFontPicker.value = false;
};

// 添加字体
const addFont = () => {
  if (!props.editableData || !newFontName.value.trim() || !newFontUrl.value.trim()) {
    return;
  }

  // 初始化 fonts 数组
  if (!props.editableData.fonts) {
    props.editableData.fonts = [];
  }

  // 检查是否已存在
  const exists = props.editableData.fonts.some(f => f.name === newFontName.value.trim());
  if (exists) {
    alert('该字体已存在');
    return;
  }

  // 添加字体
  const fontItem: FontItem = {
    name: newFontName.value.trim(),
    url: newFontUrl.value.trim(),
  };
  props.editableData.fonts.push(fontItem);

  // 动态加载字体 CSS 到父文档
  const parentDoc = window.parent.document;
  const link = parentDoc.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontItem.url;
  link.setAttribute('data-phone-font', fontItem.name);
  parentDoc.head.appendChild(link);

  // 重置输入
  newFontName.value = '';
  newFontUrl.value = '';
  showAddFontDialog.value = false;
};

// 删除字体
const deleteFont = (fontName: string) => {
  if (!props.editableData?.fonts) return;

  const index = props.editableData.fonts.findIndex(f => f.name === fontName);
  if (index > -1) {
    props.editableData.fonts.splice(index, 1);

    // 从父文档移除对应的 CSS link
    const parentDoc = window.parent.document;
    const link = parentDoc.querySelector(`link[data-phone-font="${fontName}"]`);
    if (link) link.remove();

    // 如果当前使用的是被删除的字体，重置为默认
    if (props.editableData.user.font === fontName) {
      props.editableData.user.font = '';
    }
  }
};
</script>

<style scoped lang="scss">
/* MistyGlass 风格 - 与角色详情页保持一致 */
.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #E8F4FD 0%, #F0F7FC 100%);
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

.nav-save {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 10px;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(76, 175, 80, 0.2);
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

/* 用户资料卡片 - 与角色详情卡片风格一致 */
.user-profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 20px rgba(143, 184, 237, 0.15);
  margin-bottom: 16px;
}

.user-avatar-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid rgba(143, 184, 237, 0.3);
  box-shadow: 0 4px 20px rgba(143, 184, 237, 0.25);
  margin-bottom: 14px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
}

.editable-avatar {
  cursor: pointer;
  position: relative;

  &::after {
    content: '\f030';
    font-family: 'Font Awesome 5 Free';
    font-weight: 900;
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
    z-index: 10;
  }
}

.profile-input-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.info-label {
  font-size: 14px;
  color: #94A3B8;
}

/* 可编辑输入框样式 - MistyGlass风格 */
.editable-input {
  width: 100%;
  padding: 8px 12px !important;
  font-size: 14px !important;
  color: #475569 !important;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 10px !important;
  outline: none !important;
  box-sizing: border-box;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1) !important;

  &:focus {
    background-color: rgba(255, 255, 255, 0.9) !important;
    box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1) !important;
  }
}

.info-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.1);

  &:last-child {
    border-bottom: none;
  }

  .info-label {
    flex-shrink: 0;
    margin-right: 12px;
  }

  .editable-input {
    text-align: right;
    flex: 1;
  }
}

.bio-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.editable-textarea {
  width: 100%;
  padding: 10px 12px !important;
  font-size: 14px !important;
  color: #475569 !important;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 10px !important;
  outline: none !important;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1) !important;

  &:focus {
    background-color: rgba(255, 255, 255, 0.9) !important;
    box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1) !important;
  }
}

.bg-section {
  margin-bottom: 12px;
}

.bg-title {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 6px;
  padding-left: 2px;
}

.bg-preview {
  border-radius: 10px;
  overflow: hidden;
  background: rgba(200, 200, 200, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.1);

  img {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
  }
}

.editable-bg-preview {
  cursor: pointer;
  position: relative;

  &::after {
    content: '\f030';
    font-family: 'Font Awesome 5 Free';
    font-weight: 900;
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
  }
}

.bg-placeholder {
  width: 100%;
  aspect-ratio: 16/9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94A3B8;

  i {
    font-size: 24px;
  }

  span {
    font-size: 12px;
  }
}

/* 字体设置区域 */
.font-section {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  overflow: hidden;
}

.font-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: rgba(143, 184, 237, 0.1);
  }
}

.font-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;

  i {
    color: #8FB8ED;
    font-size: 16px;
  }
}

.font-current {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748B;

  i {
    font-size: 12px;
    color: #94A3B8;
  }
}

.font-list {
  border-top: 1px solid rgba(143, 184, 237, 0.15);
  max-height: 240px;
  overflow-y: auto;
}

.font-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(143, 184, 237, 0.08);

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: rgba(143, 184, 237, 0.1);
  }

  &.active {
    background: rgba(143, 184, 237, 0.15);
  }

  i {
    color: #8FB8ED;
    font-size: 14px;
  }
}

.font-preview {
  font-size: 14px;
  color: #475569;
  flex: 1;
  cursor: pointer;
}

.font-actions {
  display: flex;
  align-items: center;
  gap: 12px;

  .delete-font {
    color: #EF4444;
    font-size: 12px;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

.add-font-item {
  justify-content: center;
  gap: 8px;
  color: #8FB8ED;
  font-size: 13px;

  i {
    font-size: 12px;
  }
}

/* 添加字体弹窗 */
.font-dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.font-dialog {
  width: 280px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.font-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
  font-size: 15px;
  font-weight: 500;

  i {
    cursor: pointer;
    padding: 4px;
  }
}

.font-dialog-content {
  padding: 16px;
}

.font-input-group {
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 12px;
    color: #64748B;
    margin-bottom: 6px;
  }
}

.font-input-hint {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 4px;
}

.font-input {
  width: 100%;
  padding: 10px 12px !important;
  font-size: 14px !important;
  color: #475569 !important;
  background-color: #fff !important;
  border: 1px solid rgba(143, 184, 237, 0.3) !important;
  border-radius: 8px !important;
  outline: none !important;
  box-sizing: border-box;

  &:focus {
    border-color: #8FB8ED !important;
    box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.2) !important;
  }
}

.font-dialog-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94A3B8;
  margin-top: 8px;

  i {
    font-size: 12px;
  }
}

.font-dialog-actions {
  display: flex;
  border-top: 1px solid rgba(143, 184, 237, 0.15);
}

.font-btn {
  flex: 1;
  padding: 12px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;

  &.cancel {
    background: #F8FAFC;
    color: #64748B;

    &:active {
      background: #F1F5F9;
    }
  }

  &.confirm {
    background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
    color: white;

    &:active {
      opacity: 0.9;
    }
  }
}
</style>
