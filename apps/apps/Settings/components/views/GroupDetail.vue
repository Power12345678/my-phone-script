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
      <span class="nav-title">{{ group?.name || '群聊详情' }}</span>
      <button class="nav-btn delete-btn" @click="$emit('delete')" title="删除群聊">
        <i class="fas fa-trash"></i>
      </button>
    </div>

    <div class="detail-content" v-if="group">
      <!-- 群聊头像和名称 -->
      <div class="char-detail-card">
        <div class="avatar-wrapper">
          <div
            class="char-detail-avatar"
            @click="$emit('openImagePicker', 'avatar', (url: string) => $emit('updateField', 'avatar', url))"
          >
            <img :src="group.avatar" alt="avatar" />
          </div>
          <div class="avatar-camera-icon">
            <i class="fas fa-camera"></i>
          </div>
        </div>
        <div class="profile-input-item">
          <div class="info-label" style="text-align: center;">群聊名称</div>
          <input
            :value="group.name"
            @input="$emit('updateField', 'name', ($event.target as HTMLInputElement).value)"
            class="editable-input"
            style="text-align: center; font-size: 20px; font-weight: 600; max-width: 200px;"
            placeholder="群聊名称"
          />
        </div>
      </div>

      <!-- 重要人物选择 -->
      <div class="member-section">
        <div class="member-section-title">
          <i class="fas fa-star"></i>
          <span>重要人物</span>
          <span class="member-count">{{ group.mainMembers?.length || 0 }}人</span>
        </div>
        <div class="member-select-grid">
          <div
            v-for="char in characters"
            :key="char.id"
            class="member-select-item"
            :class="{ selected: group.mainMembers?.includes(char.name) }"
            @click="$emit('toggleMember', char.name)"
          >
            <img :src="char.avatar" class="member-avatar" />
            <span class="member-name">{{ char.name }}</span>
            <i v-if="group.mainMembers?.includes(char.name)" class="fas fa-check member-check"></i>
          </div>
        </div>
      </div>

      <!-- 其他成员 -->
      <div class="info-section">
        <div class="info-item bio-item">
          <div class="info-label">其他成员</div>
          <input
            :value="group.otherMembers"
            @input="$emit('updateField', 'otherMembers', ($event.target as HTMLInputElement).value)"
            class="editable-input"
            placeholder="如：3班的其他学生和老师"
          />
        </div>
      </div>

      <!-- 群聊简介 -->
      <div class="info-section">
        <div class="info-item bio-item">
          <div class="info-label">群聊简介</div>
          <textarea
            :value="group.description"
            @input="$emit('updateField', 'description', ($event.target as HTMLTextAreaElement).value)"
            class="editable-textarea"
            rows="3"
            placeholder="群聊简介..."
          ></textarea>
        </div>
      </div>

      <!-- 聊天背景 -->
      <div class="bg-section">
        <div class="bg-title">聊天背景</div>
        <div
          class="bg-preview editable-bg-preview"
          @click="$emit('openImagePicker', 'background', (url: string) => $emit('updateField', 'chatBg', url))"
        >
          <img :src="group.chatBg" alt="聊天背景" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GroupChat, Character } from '../../types';

defineProps<{
  group: GroupChat | null;
  characters: Character[];
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'save'): void;
  (e: 'delete'): void;
  (e: 'updateField', field: keyof GroupChat, value: string): void;
  (e: 'toggleMember', memberName: string): void;
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

/* 群聊详情卡片 */
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

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 14px;
  cursor: pointer;
}

.char-detail-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid rgba(143, 184, 237, 0.3);
  box-shadow: 0 4px 20px rgba(143, 184, 237, 0.25);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatar-camera-icon {
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
  pointer-events: none;
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

/* 重要人物选择区块 */
.member-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
  margin-bottom: 16px;
}

.member-section-title {
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
    font-size: 14px;
  }
}

.member-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
}

.member-select-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
}

.member-select-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: transparent;

  &:active {
    transform: scale(0.95);
  }

  &.selected {
    background: rgba(143, 184, 237, 0.15);

    .member-avatar {
      border-color: #8fb8ed;
    }
  }
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.member-name {
  font-size: 11px;
  color: #475569;
  text-align: center;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #8fb8ed, #7aa8e0);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
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
  align-items: stretch;
  gap: 8px;

  .info-label {
    margin-right: 0;
  }

  .editable-input,
  .editable-textarea {
    text-align: left;
  }
}

.editable-textarea {
  width: 100%;
  padding: 14px 16px !important;
  font-size: 14px !important;
  color: #475569 !important;
  background-color: rgba(255, 255, 255, 0.5) !important;
  border: none !important;
  border-radius: 10px !important;
  outline: none !important;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.6;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  &:focus {
    background-color: rgba(255, 255, 255, 0.7) !important;
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
</style>
