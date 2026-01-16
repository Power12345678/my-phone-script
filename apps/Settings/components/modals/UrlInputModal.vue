<template>
  <div v-if="visible" class="url-input-overlay" @click="handleClose">
    <div class="url-input-modal" @click.stop>
      <div class="url-input-header">
        <h2 class="url-input-title">添加{{ type === 'avatar' ? '头像' : '背景' }}</h2>
        <button class="url-input-close" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="url-input-body">
        <label class="url-input-label">请输入图片链接</label>
        <input
          v-model="urlValue"
          type="text"
          class="url-input-field"
          placeholder="https://example.com/image.jpg"
          @keyup.enter="handleConfirm"
        />
      </div>
      <div class="url-input-actions">
        <button class="url-input-cancel" @click="handleClose">取消</button>
        <button class="url-input-confirm" @click="handleConfirm" :disabled="!urlValue.trim()">
          <i class="fas fa-check"></i>
          <span>确认添加</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  type: 'avatar' | 'background';
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', url: string): void;
}>();

const urlValue = ref('');

// 重置输入框
watch(() => props.visible, (newVal) => {
  if (newVal) {
    urlValue.value = '';
  }
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleConfirm = () => {
  if (urlValue.value.trim()) {
    emit('confirm', urlValue.value.trim());
    emit('update:visible', false);
  }
};
</script>

<style scoped>
/* URL输入弹窗样式 - 手机界面内居中 */
.url-input-overlay {
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
  padding: 20px;
  box-sizing: border-box;
}

.url-input-modal {
  width: 100%;
  max-width: 300px;
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}

.url-input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.url-input-title {
  font-size: 18px;
  font-weight: 600;
  color: #475569;
}

.url-input-close {
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

.url-input-close:active {
  background: rgba(143, 184, 237, 0.2);
  color: #8FB8ED;
}

.url-input-body {
  margin-bottom: 20px;
}

.url-input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #64748B;
  margin-bottom: 10px;
}

.url-input-field {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 3px rgba(143, 184, 237, 0.15);
}

.url-input-field:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 3px rgba(143, 184, 237, 0.15);
}

.url-input-field::placeholder {
  color: #94A3B8;
}

.url-input-actions {
  display: flex;
  gap: 10px;
}

.url-input-cancel {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s;
}

.url-input-cancel:active {
  background: rgba(143, 184, 237, 0.2);
}

.url-input-confirm {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  background: linear-gradient(135deg, #8FB8ED, #A8D0F0);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.url-input-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.url-input-confirm:not(:disabled):active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.4);
}
</style>
