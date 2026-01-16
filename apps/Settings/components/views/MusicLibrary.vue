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
      <span class="nav-title">音乐库</span>
      <div class="nav-actions">
        <button class="nav-btn" @click="$emit('openMusicSearch')" title="搜索歌曲">
          <i class="fas fa-search"></i>
        </button>
        <button class="nav-btn" @click="$emit('openMusicUrl')" title="添加歌曲">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="detail-content" v-if="editableData">
      <div class="music-list">
        <div
          v-for="(song, index) in editableData.music"
          :key="index"
          class="music-item"
        >
          <div class="music-index">{{ index + 1 }}</div>
          <div class="music-info">
            <div class="music-title">{{ song.title }}</div>
            <div class="music-artist">{{ song.artist }}</div>
          </div>
          <div class="music-actions">
            <div class="move-btns move-btns-sub">
              <button class="move-btn move-btn-sub" @click="moveSong(index, 'up')" :disabled="index === 0" title="上移">
                <i class="fas fa-chevron-up"></i>
              </button>
              <button class="move-btn move-btn-sub" @click="moveSong(index, 'down')" :disabled="index === editableData.music.length - 1" title="下移">
                <i class="fas fa-chevron-down"></i>
              </button>
            </div>
            <button class="music-action-btn delete" @click="deleteSong(index)" title="删除">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="music-note">
        <i class="fas fa-info-circle"></i>
        <span>用于手机音乐播放器的歌曲列表</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PhoneData } from '../../types';

const props = defineProps<{
  editableData: PhoneData | null;
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'save'): void;
  (e: 'openMusicSearch'): void;
  (e: 'openMusicUrl'): void;
}>();

// 歌曲上下移动
const moveSong = (index: number, direction: 'up' | 'down') => {
  if (!props.editableData) return;
  const arr = props.editableData.music;
  const newIdx = direction === 'up' ? index - 1 : index + 1;
  if (newIdx < 0 || newIdx >= arr.length) return;
  const temp = arr[index];
  arr.splice(index, 1);
  arr.splice(newIdx, 0, temp);
};

// 删除歌曲
const deleteSong = (index: number) => {
  if (!props.editableData) return;
  props.editableData.music.splice(index, 1);
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

.nav-actions {
  display: flex;
  gap: 8px;
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

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 音乐库样式 */
.music-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.music-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: all 0.2s;
}

.music-item:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.8);
}

.music-index {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #A8D4F0, #8FB8ED);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.music-info {
  flex: 1;
  min-width: 0;
}

.music-title {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-artist {
  font-size: 13px;
  color: #94A3B8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 移动按钮 */
.move-btns {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.move-btns-sub {
  flex-direction: row;
  gap: 4px;
}

.move-btn {
  width: 24px;
  height: 18px;
  border: none;
  background: rgba(143, 184, 237, 0.1);
  color: #8fb8ed;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    background: rgba(143, 184, 237, 0.2);
  }
}

.move-btn-sub {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

/* 删除按钮 */
.music-action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(143, 184, 237, 0.15);
  color: #8FB8ED;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.music-action-btn:active {
  background: rgba(143, 184, 237, 0.3);
  transform: scale(0.95);
}

.music-action-btn.delete {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.music-action-btn.delete:active {
  background: rgba(239, 68, 68, 0.2);
}

/* 提示信息 */
.music-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 12px;
  color: #8FB8ED;
  font-size: 13px;
  margin-top: 12px;
}
</style>
