<template>
  <div v-if="visible" class="music-search-overlay">
    <div class="music-search-modal">
      <div class="music-search-header">
        <div class="music-search-input-container">
          <i class="fas fa-search music-search-icon"></i>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="music-search-input"
            placeholder="搜索歌曲或歌手"
            @keyup.enter="handleSearch"
          />
          <button v-if="searchQuery" class="music-clear-search" @click="searchQuery = ''">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button class="music-close-search" @click="handleClose">取消</button>
      </div>
      <div class="music-search-content">
        <!-- 搜索状态提示 -->
        <div v-if="isSearching" class="music-search-status">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在搜索...</span>
        </div>
        <div v-else-if="searchError" class="music-search-status error">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ searchError }}</span>
        </div>
        <div v-else-if="results.length === 0 && hasSearched" class="music-search-status">
          <i class="fas fa-music"></i>
          <span>未找到相关歌曲</span>
        </div>
        <!-- 搜索结果列表 -->
        <div v-else class="music-search-results">
          <div
            v-for="(result, index) in results"
            :key="index"
            class="music-search-result-item"
            @click="handleSelect(result)"
          >
            <div class="music-result-cover" v-if="result.cover">
              <img :src="result.cover" alt="cover" />
            </div>
            <div class="music-result-cover placeholder" v-else>
              <i class="fas fa-music"></i>
            </div>
            <div class="music-result-info">
              <div class="music-result-title">{{ result.title }}</div>
              <div class="music-result-artist">{{ result.artist }}</div>
            </div>
            <div class="music-result-add">
              <i class="fas fa-plus"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { MusicSearchResult } from '../../types';

const props = defineProps<{
  visible: boolean;
  results: MusicSearchResult[];
  isSearching: boolean;
  searchError: string;
  hasSearched: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'search', query: string): void;
  (e: 'select', result: MusicSearchResult): void;
}>();

const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

// 打开时重置并聚焦
watch(() => props.visible, (newVal) => {
  if (newVal) {
    searchQuery.value = '';
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    emit('search', searchQuery.value.trim());
  }
};

const handleSelect = (result: MusicSearchResult) => {
  emit('select', result);
};
</script>

<style scoped>
/* 音乐搜索弹窗样式 */
.music-search-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.music-search-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.music-search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
  background: white;
}

.music-search-input-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.music-search-icon {
  position: absolute;
  left: 12px;
  color: #94A3B8;
  font-size: 14px;
  pointer-events: none;
}

.music-search-input {
  width: 100%;
  padding: 10px 36px;
  font-size: 14px;
  color: #475569 !important;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 20px;
  outline: none;
  box-sizing: border-box;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.music-search-input::placeholder {
  color: #94A3B8;
}

.music-search-input:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.music-clear-search {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(143, 184, 237, 0.2);
  border: none;
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
}

.music-close-search {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #8FB8ED;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.music-search-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.music-search-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #94A3B8;
  text-align: center;
}

.music-search-status i {
  font-size: 32px;
  opacity: 0.5;
}

.music-search-status.error {
  color: #EF4444;
}

.music-search-status.error i {
  opacity: 0.8;
}

.music-search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.music-search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.music-search-result-item:active {
  transform: scale(0.98);
  background: rgba(143, 184, 237, 0.05);
}

.music-result-cover {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(143, 184, 237, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.music-result-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.music-result-cover.placeholder {
  color: #8FB8ED;
  font-size: 20px;
}

.music-result-info {
  flex: 1;
  min-width: 0;
}

.music-result-title {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-result-artist {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-result-add {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8FB8ED, #A8D0F0);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}
</style>
