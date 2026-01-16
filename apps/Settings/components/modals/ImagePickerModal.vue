<template>
  <div v-if="visible" class="image-picker-overlay" @click="handleClose">
    <div class="image-picker-modal" @click.stop>
      <div class="image-picker-header">
        <h2 class="image-picker-title">选择{{ type === 'avatar' ? '头像' : '背景' }}</h2>
        <button class="image-picker-close" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 输入URL -->
      <div class="image-picker-input-section">
        <label class="image-picker-label">输入图片链接</label>
        <div class="image-picker-input-row">
          <input
            v-model="urlInput"
            type="text"
            class="image-picker-input"
            placeholder="请输入图片URL..."
          />
          <button class="image-picker-confirm-btn" @click="handleConfirmUrl" :disabled="!urlInput.trim()">
            <i class="fas fa-check"></i>
          </button>
        </div>
      </div>

      <!-- 或从库中选择 -->
      <div class="image-picker-library">
        <label class="image-picker-label">或从库中选择</label>
        <div class="image-picker-grid" :class="type === 'background' ? 'bg-grid' : ''">
          <template v-if="type === 'avatar'">
            <div
              v-for="(avatar, index) in avatars"
              :key="'lib-avatar-' + index"
              class="image-picker-item"
              @click="handleSelectFromLibrary(avatar)"
            >
              <img :src="avatar" alt="avatar" />
            </div>
          </template>
          <template v-else>
            <div
              v-for="(bg, index) in backgrounds"
              :key="'lib-bg-' + index"
              class="image-picker-item bg-item"
              @click="handleSelectFromLibrary(bg)"
            >
              <img :src="bg" alt="background" />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  type: 'avatar' | 'background';
  avatars: string[];
  backgrounds: string[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', url: string): void;
}>();

const urlInput = ref('');

// 重置输入框
watch(() => props.visible, (newVal) => {
  if (newVal) {
    urlInput.value = '';
  }
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleSelectFromLibrary = (url: string) => {
  emit('select', url);
  emit('update:visible', false);
};

const handleConfirmUrl = () => {
  if (urlInput.value.trim()) {
    emit('select', urlInput.value.trim());
    emit('update:visible', false);
  }
};
</script>

<style scoped>
/* 图片选择弹窗 */
.image-picker-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.image-picker-modal {
  width: 90%;
  max-width: 340px;
  max-height: 80vh;
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.image-picker-title {
  font-size: 18px;
  font-weight: 600;
  color: #475569;
}

.image-picker-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.image-picker-close:active {
  background: rgba(143, 184, 237, 0.2);
  color: #8FB8ED;
}

.image-picker-input-section {
  margin-bottom: 16px;
}

.image-picker-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #64748B;
  margin-bottom: 8px;
}

.image-picker-input-row {
  display: flex;
  gap: 8px;
}

.image-picker-input {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  font-size: 14px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.image-picker-input:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.image-picker-confirm-btn {
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
}

.image-picker-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-picker-confirm-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.image-picker-library {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.image-picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  overflow-y: auto;
  max-height: 200px;
  padding: 4px;
  box-sizing: border-box;
}

.image-picker-grid.bg-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  align-items: start;
}

.image-picker-item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  min-width: 0;
  box-sizing: border-box;
}

.image-picker-item:hover {
  border-color: #8FB8ED;
  transform: scale(1.02);
}

.image-picker-item:active {
  transform: scale(0.98);
}

.image-picker-item.bg-item {
  aspect-ratio: 16 / 9;
}

.image-picker-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
