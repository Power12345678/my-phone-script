<template>
  <div v-if="visible" class="preset-modal-overlay" @click="handleClose">
    <div class="preset-modal" @click.stop>
      <div class="preset-modal-title">
        {{ mode === 'create' ? '新建预设' : '重命名预设' }}
      </div>
      <input
        ref="inputRef"
        v-model="nameValue"
        class="preset-modal-input"
        placeholder="请输入预设名称"
        @keyup.enter="handleConfirm"
      />
      <div class="preset-modal-actions">
        <button class="preset-modal-btn cancel" @click="handleClose">取消</button>
        <button class="preset-modal-btn confirm" @click="handleConfirm" :disabled="!nameValue.trim()">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', name: string): void;
}>();

const nameValue = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

// 当弹窗打开时，设置初始值并聚焦输入框
watch(() => props.visible, (newVal) => {
  if (newVal) {
    nameValue.value = props.initialName || '';
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleConfirm = () => {
  const name = nameValue.value.trim();
  if (name) {
    emit('confirm', name);
    emit('update:visible', false);
  }
};
</script>

<style scoped>
/* 预设名称弹窗 */
.preset-modal-overlay {
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
  padding: 20px;
  box-sizing: border-box;
}

.preset-modal {
  width: 280px;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.preset-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  text-align: center;
  margin-bottom: 16px;
}

.preset-modal-input {
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
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.preset-modal-input:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.preset-modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.preset-modal-btn {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-modal-btn.cancel {
  background: #F1F5F9;
  color: #64748B;
}

.preset-modal-btn.cancel:hover {
  background: #E2E8F0;
}

.preset-modal-btn.confirm {
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
}

.preset-modal-btn.confirm:hover {
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.3);
}

.preset-modal-btn.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preset-modal-btn:active {
  transform: scale(0.98);
}
</style>
