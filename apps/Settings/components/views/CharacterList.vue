<template>
  <div class="detail-page">
    <div class="nav-bar">
      <div class="nav-left">
        <button class="nav-back" @click="$emit('back')">
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>
      <span class="nav-title">角色数据</span>
      <div class="nav-dropdown-wrapper">
        <button class="nav-btn" @click="showAddDropdown = !showAddDropdown">
          <i class="fas fa-plus"></i>
        </button>
        <div v-if="showAddDropdown" class="nav-dropdown-menu">
          <div class="dropdown-item" @click="handleAddCharacter">
            <i class="fas fa-user"></i>
            <span>添加角色</span>
          </div>
          <div class="dropdown-item" @click="handleAddGroup">
            <i class="fas fa-users"></i>
            <span>添加群聊</span>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-content" v-if="editableData">
      <!-- 角色列表 -->
      <div class="section-header">
        <i class="fas fa-user"></i>
        <span>角色 ({{ editableData.characters.length }})</span>
      </div>
      <div
        v-for="(char, index) in editableData.characters"
        :key="char.id"
        class="character-card"
        @click="$emit('selectCharacter', index)"
      >
        <div class="char-avatar">
          <img :src="char.avatar" alt="avatar" />
        </div>
        <div class="char-info">
          <div class="char-name">{{ char.name }}</div>
          <div class="char-nickname">@{{ char.nickname }}</div>
        </div>
        <i class="fas fa-chevron-right char-arrow"></i>
      </div>

      <!-- 群聊列表 -->
      <div class="section-header" style="margin-top: 16px;">
        <i class="fas fa-users"></i>
        <span>群聊 ({{ editableData.groups?.length || 0 }})</span>
      </div>
      <div
        v-for="(group, index) in editableData.groups || []"
        :key="group.id"
        class="character-card"
        @click="$emit('selectGroup', index)"
      >
        <div class="char-avatar">
          <img :src="group.avatar" alt="avatar" />
        </div>
        <div class="char-info">
          <div class="char-name">{{ group.name }}</div>
          <div class="char-nickname">{{ group.mainMembers?.length || 0 }}位成员</div>
        </div>
        <i class="fas fa-chevron-right char-arrow"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PhoneData } from '../../types';

defineProps<{
  editableData: PhoneData | null;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'selectCharacter', index: number): void;
  (e: 'selectGroup', index: number): void;
  (e: 'addCharacter'): void;
  (e: 'addGroup'): void;
}>();

const showAddDropdown = ref(false);

function handleAddCharacter() {
  emit('addCharacter');
  showAddDropdown.value = false;
}

function handleAddGroup() {
  emit('addGroup');
  showAddDropdown.value = false;
}
</script>

<style scoped lang="scss">
/* MistyGlass 风格 - 与角色详情页保持一致 */
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

.nav-dropdown-wrapper {
  position: relative;
  z-index: 1000;
  min-width: 72px;
  display: flex;
  justify-content: flex-end;
}

.nav-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 1001;
  min-width: 120px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #475569;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(143, 184, 237, 0.1);
  }

  i {
    color: #8fb8ed;
    width: 16px;
    text-align: center;
  }
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #475569;
  font-size: 15px;
  font-weight: 600;

  i {
    color: #8fb8ed;
    font-size: 16px;
  }
}

/* 角色列表卡片 */
.character-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 12px rgba(143, 184, 237, 0.1);
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
  }
}

.char-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.8);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.char-info {
  flex: 1;
  margin-left: 12px;
}

.char-name {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 2px;
}

.char-nickname {
  font-size: 13px;
  color: #94a3b8;
}

.char-arrow {
  color: #94a3b8;
  font-size: 14px;
}
</style>
