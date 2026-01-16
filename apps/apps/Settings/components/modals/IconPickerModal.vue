<template>
  <div v-if="visible" class="icon-picker-overlay" @click="handleClose">
    <div class="icon-picker-modal" @click.stop>
      <div class="icon-picker-header">
        <h2 class="icon-picker-title">选择图标</h2>
        <button class="icon-picker-close" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <!-- 分类选项卡 -->
      <div class="icon-category-tabs">
        <button
          v-for="(cat, key) in iconCategories"
          :key="key"
          class="icon-category-tab"
          :class="{ active: selectedCategory === key }"
          @click="selectedCategory = key as IconCategoryKey"
        >
          {{ cat.name }}
        </button>
      </div>
      <!-- 图标网格 -->
      <div class="icon-picker-grid">
        <div
          v-for="icon in iconCategories[selectedCategory].icons"
          :key="icon"
          class="icon-picker-item"
          @click="handleSelect(icon)"
        >
          <i :class="['fas', icon]"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { iconCategories, type IconCategoryKey } from '../../types';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', icon: string): void;
}>();

const selectedCategory = ref<IconCategoryKey>('location');

// 重置分类
watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedCategory.value = 'location';
  }
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleSelect = (icon: string) => {
  emit('select', icon);
  emit('update:visible', false);
};
</script>

<style scoped>
/* 图标选择弹窗样式 */
.icon-picker-overlay {
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

.icon-picker-modal {
  width: 100%;
  max-width: 320px;
  max-height: 70vh;
  background: white;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.icon-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.icon-picker-title {
  font-size: 18px;
  font-weight: 600;
  color: #475569;
}

.icon-picker-close {
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

.icon-picker-close:active {
  background: rgba(143, 184, 237, 0.2);
  color: #8FB8ED;
}

.icon-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
}

.icon-category-tab {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-category-tab.active {
  background: linear-gradient(135deg, #8FB8ED, #A8D0F0);
  color: white;
}

.icon-category-tab:not(.active):active {
  background: rgba(143, 184, 237, 0.2);
}

.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  overflow-y: auto;
  max-height: 200px;
  padding: 4px;
}

.icon-picker-item {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(143, 184, 237, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 18px;
  color: #64748B;
}

.icon-picker-item:hover {
  background: rgba(143, 184, 237, 0.15);
  color: #8FB8ED;
  transform: scale(1.05);
}

.icon-picker-item:active {
  transform: scale(0.95);
  background: rgba(143, 184, 237, 0.25);
}
</style>
