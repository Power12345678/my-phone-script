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
      <span class="nav-title">{{ character?.name || '角色详情' }}</span>
      <button class="nav-btn delete-btn" @click="$emit('delete')" title="删除角色">
        <i class="fas fa-trash"></i>
      </button>
    </div>

    <div class="detail-content" v-if="character">
      <!-- 角色头像和基本信息 -->
      <div class="char-detail-card">
        <div
          class="char-detail-avatar editable-avatar"
          @click="$emit('openImagePicker', 'avatar', (url: string) => $emit('updateField', 'avatar', url))"
        >
          <img :src="character.avatar" alt="avatar" />
        </div>
        <div class="profile-input-item">
          <div class="info-label" style="text-align: center;">姓名</div>
          <input
            :value="character.name"
            @input="$emit('updateField', 'name', ($event.target as HTMLInputElement).value)"
            class="editable-input"
            style="text-align: center; font-size: 20px; font-weight: 600; max-width: 200px;"
            placeholder="角色名称"
          />
        </div>
        <div class="profile-input-item">
          <div class="info-label" style="text-align: center;">网名</div>
          <input
            :value="character.nickname"
            @input="$emit('updateField', 'nickname', ($event.target as HTMLInputElement).value)"
            class="editable-input"
            style="text-align: center; font-size: 14px; max-width: 150px;"
            placeholder="网名"
          />
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="info-section">
        <div class="info-item">
          <div class="info-label">ID</div>
          <input
            :value="character.id"
            @input="$emit('updateField', 'id', ($event.target as HTMLInputElement).value)"
            class="editable-input"
            style="max-width: 100px;"
          />
        </div>
        <div class="info-item">
          <div class="info-label">邮箱</div>
          <input
            :value="character.email"
            @input="$emit('updateField', 'email', ($event.target as HTMLInputElement).value)"
            class="editable-input"
            style="max-width: 200px;"
          />
        </div>
      </div>

      <!-- 聊天背景 -->
      <div class="bg-section">
        <div class="bg-title">聊天背景</div>
        <div
          class="bg-preview editable-bg-preview"
          @click="$emit('openImagePicker', 'background', (url: string) => $emit('updateField', 'chatBg', url))"
        >
          <img :src="character.chatBg" alt="聊天背景" />
        </div>
      </div>

      <!-- 动态背景 -->
      <div class="bg-section">
        <div class="bg-title">动态背景</div>
        <div
          class="bg-preview editable-bg-preview"
          @click="$emit('openImagePicker', 'background', (url: string) => $emit('updateField', 'dynamicBg', url))"
        >
          <img :src="character.dynamicBg" alt="动态背景" />
        </div>
      </div>

      <!-- 线上风格 -->
      <div class="style-section">
        <div class="style-title">
          <i class="fas fa-comment-dots"></i>
          <span>线上聊天风格</span>
        </div>
        <textarea
          :value="character.onlineStyle"
          @input="$emit('updateField', 'onlineStyle', ($event.target as HTMLTextAreaElement).value)"
          class="editable-textarea"
          rows="4"
          placeholder="描述该角色的线上聊天风格..."
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Character } from '../../types';

defineProps<{
  character: Character | null;
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'save'): void;
  (e: 'delete'): void;
  (e: 'updateField', field: keyof Character, value: string): void;
  (e: 'openImagePicker', type: 'avatar' | 'background', callback: (url: string) => void): void;
}>();
</script>

<style scoped lang="scss">
/* MistyGlass 风格 - 与其他页面保持一致 */
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

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  color: #8fb8ed;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;

  &:active {
    background: rgba(143, 184, 237, 0.2);
  }
}

.delete-btn {
  color: #ef4444 !important;
  background: rgba(239, 68, 68, 0.1);

  &:active {
    background: rgba(239, 68, 68, 0.2);
  }
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 角色详情卡片 */
.char-detail-card {
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

.char-detail-avatar {
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
    background: linear-gradient(135deg, #8fb8ed, #7aa8e0);
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
  color: #94a3b8;
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

/* 背景预览 */
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
    background: linear-gradient(135deg, #8fb8ed, #7aa8e0);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
  }
}

/* 线上风格区块 */
.style-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
  margin-bottom: 16px;
}

.style-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid rgba(143, 184, 237, 0.1);

  i {
    color: #8fb8ed;
    font-size: 16px;
  }
}

.editable-textarea {
  width: 100%;
  padding: 14px 16px !important;
  font-size: 14px !important;
  color: #475569 !important;
  background-color: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  outline: none !important;
  box-sizing: border-box;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.6;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  &:focus {
    background-color: rgba(255, 255, 255, 0.3) !important;
  }
}
</style>
