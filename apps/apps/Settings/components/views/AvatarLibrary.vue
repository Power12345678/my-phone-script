<template>
  <div class="detail-page" v-if="!previewImage">
    <!-- 头像背景库列表 -->
    <div class="nav-bar">
      <div class="nav-left">
        <button class="nav-back" @click="$emit('back')">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="nav-save" @click="$emit('save')" title="保存">
          <i class="fas fa-save"></i>
        </button>
      </div>
      <span class="nav-title">头像背景库</span>
      <div class="nav-right">
        <button class="nav-import" @click="showBatchImport = true" title="批量导入">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="detail-content">
      <!-- 头像部分 -->
      <div class="section-header">
        <i class="fas fa-user-circle"></i>
        <span>随机头像</span>
        <span class="section-count">{{ avatars.length }}</span>
      </div>
      <div class="avatars-grid">
        <div
          v-for="(avatar, index) in avatars"
          :key="'avatar-' + index"
          class="avatar-item-wrapper"
        >
          <div class="avatar-item" @click="viewPreview(avatar)">
            <img :src="avatar" alt="avatar" />
          </div>
          <button class="delete-overlay" @click.stop="$emit('deleteAvatar', index)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <!-- 添加按钮 -->
        <div class="avatar-item add-item-btn" @click="$emit('addAvatar')">
          <i class="fas fa-plus"></i>
        </div>
      </div>
      <div class="avatars-note">
        <i class="fas fa-info-circle"></i>
        <span>用于不在联系人列表中的随机人物</span>
      </div>

      <!-- 背景部分 -->
      <div class="section-header" style="margin-top: 20px;">
        <i class="fas fa-image"></i>
        <span>背景图片</span>
        <span class="section-count">{{ backgrounds.length }}</span>
      </div>
      <div class="backgrounds-grid">
        <div
          v-for="(bg, index) in backgrounds"
          :key="'bg-' + index"
          class="background-item-wrapper"
        >
          <div class="background-item" @click="viewPreview(bg)">
            <img :src="bg" alt="background" />
          </div>
          <button class="delete-overlay" @click.stop="$emit('deleteBackground', index)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <!-- 添加按钮 -->
        <div class="background-item add-item-btn" @click="$emit('addBackground')">
          <i class="fas fa-plus"></i>
        </div>
      </div>
      <div class="avatars-note">
        <i class="fas fa-info-circle"></i>
        <span>用于聊天、动态等界面的背景</span>
      </div>
    </div>
  </div>

  <!-- 头像预览页面 -->
  <div v-else class="detail-page avatar-detail-page">
    <div class="nav-bar">
      <button class="nav-back" @click="previewImage = null">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="nav-title">图片预览</span>
      <div style="width: 28px;"></div>
    </div>

    <div class="avatar-preview-content">
      <div class="avatar-preview-large">
        <img :src="previewImage" alt="preview" />
      </div>
      <div class="avatar-preview-url">
        <div class="url-label">图片地址</div>
        <div class="url-value">{{ previewImage }}</div>
      </div>
    </div>
  </div>

  <!-- 批量导入弹窗 -->
  <div v-if="showBatchImport" class="batch-import-overlay" @click.self="showBatchImport = false">
    <div class="batch-import-modal">
      <div class="batch-import-header">
        <span>批量导入</span>
        <button class="batch-import-close" @click="showBatchImport = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="batch-import-body">
        <div class="import-type-selector">
          <label class="import-type-option" :class="{ active: importType === 'avatar' }">
            <input type="radio" v-model="importType" value="avatar" />
            <i class="fas fa-user-circle"></i>
            <span>头像</span>
          </label>
          <label class="import-type-option" :class="{ active: importType === 'background' }">
            <input type="radio" v-model="importType" value="background" />
            <i class="fas fa-image"></i>
            <span>背景</span>
          </label>
        </div>
        <div class="import-textarea-label">每行一个链接：</div>
        <textarea
          v-model="importUrls"
          class="import-textarea"
          placeholder="https://example.com/image1.jpg
https://example.com/image2.jpg
..."
          rows="8"
        ></textarea>
        <div class="import-preview-count" v-if="parsedUrls.length > 0">
          <i class="fas fa-check-circle"></i>
          <span>识别到 {{ parsedUrls.length }} 个有效链接</span>
        </div>
      </div>
      <div class="batch-import-footer">
        <button class="batch-import-btn cancel" @click="showBatchImport = false">取消</button>
        <button class="batch-import-btn confirm" @click="confirmBatchImport" :disabled="parsedUrls.length === 0">
          导入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

defineProps<{
  avatars: string[];
  backgrounds: string[];
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'save'): void;
  (e: 'deleteAvatar', index: number): void;
  (e: 'deleteBackground', index: number): void;
  (e: 'addAvatar'): void;
  (e: 'addBackground'): void;
  (e: 'batchImportAvatars', urls: string[]): void;
  (e: 'batchImportBackgrounds', urls: string[]): void;
}>();

const previewImage = ref<string | null>(null);
const showBatchImport = ref(false);
const importType = ref<'avatar' | 'background'>('avatar');
const importUrls = ref('');

const viewPreview = (url: string) => {
  previewImage.value = url;
};

// 解析输入的链接
const parsedUrls = computed(() => {
  return importUrls.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));
});

// 确认批量导入
const confirmBatchImport = () => {
  if (parsedUrls.value.length === 0) return;

  if (importType.value === 'avatar') {
    emit('batchImportAvatars', parsedUrls.value);
  } else {
    emit('batchImportBackgrounds', parsedUrls.value);
  }

  // 重置状态
  importUrls.value = '';
  showBatchImport.value = false;
};
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
  padding: 20px;
}

/* 区块头部 */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;

  i {
    color: #8fb8ed;
    font-size: 16px;
  }
}

.section-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
  background: rgba(143, 184, 237, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
}

/* 头像网格 */
.avatars-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.avatar-item-wrapper {
  position: relative;
}

.avatar-item {
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.15);
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.delete-overlay {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(100, 100, 100, 0.5);
  border: none;
  color: white;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:active {
    transform: scale(0.9);
    background: rgba(100, 100, 100, 0.7);
  }
}

.add-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(143, 184, 237, 0.1);
  border: 2px dashed rgba(143, 184, 237, 0.3);
  color: #8fb8ed;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    background: rgba(143, 184, 237, 0.2);
  }
}

.avatars-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;

  i {
    font-size: 12px;
  }
}

/* 背景网格 */
.backgrounds-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.background-item-wrapper {
  position: relative;
}

.background-item {
  aspect-ratio: 16/9;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.15);
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* 头像预览页面 */
.avatar-detail-page {
  background: #1a1a2e;
}

.avatar-detail-page .nav-bar {
  background: rgba(26, 26, 46, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.avatar-detail-page .nav-back {
  background: rgba(255, 255, 255, 0.1);
  color: white;

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }
}

.avatar-detail-page .nav-title {
  color: white;
}

.avatar-preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.avatar-preview-large {
  width: 80%;
  max-width: 300px;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: rgba(255, 255, 255, 0.05);
  }
}

.avatar-preview-url {
  margin-top: 24px;
  width: 100%;
  max-width: 300px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px 16px;
}

.url-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}

.url-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  word-break: break-all;
  line-height: 1.4;
}

/* 导入按钮 */
.nav-import {
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

/* 批量导入弹窗 */
.batch-import-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.batch-import-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.batch-import-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.batch-import-close {
  width: 28px;
  height: 28px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:active {
    background: #e0e0e0;
  }
}

.batch-import-body {
  padding: 20px;
}

.import-type-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.import-type-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #666;

  input {
    display: none;
  }

  i {
    font-size: 16px;
  }

  &.active {
    border-color: #8fb8ed;
    background: rgba(143, 184, 237, 0.1);
    color: #5a9bd5;
  }
}

.import-textarea-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.import-textarea {
  width: 100%;
  border: 1px solid #e0e0e0 !important;
  border-radius: 10px !important;
  padding: 12px !important;
  font-size: 13px !important;
  color: #333 !important;
  background-color: #fff !important;
  resize: none;
  font-family: inherit;
  line-height: 1.5;

  &:focus {
    outline: none !important;
    border-color: #8fb8ed !important;
  }

  &::placeholder {
    color: #aaa;
  }
}

.import-preview-count {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: #4CAF50;

  i {
    font-size: 14px;
  }
}

.batch-import-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.batch-import-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.cancel {
    background: #f5f5f5;
    color: #666;
  }

  &.confirm {
    background: #8fb8ed;
    color: white;

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }
}
</style>
