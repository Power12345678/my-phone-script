<template>
  <div class="settings-container">
    <!-- 主菜单页面 -->
    <MainMenu
      v-if="!currentView"
      :character-count="baseInfo.characters.length"
      :avatar-count="baseInfo.randomAvatars.length"
      :background-count="baseInfo.backgrounds.length"
      :music-count="musicData.songs.length"
      :map-name="baseInfo.map.name"
      :district-count="baseInfo.map.districts.length"
      @navigate="currentView = $event"
      @refresh="handleRefresh"
      @import-data="handleImportData"
      @export-data="handleExportData"
    />

    <!-- 用户数据详情 -->
    <UserSettings
      v-else-if="currentView === 'user'"
      :editable-data="editableData"
      @back="currentView = null"
      @save="saveEditableData(true)"
      @open-image-picker="openImagePicker"
    />

    <!-- 角色数据列表 -->
    <CharacterList
      v-else-if="currentView === 'characters'"
      :editable-data="editableData"
      @back="currentView = null"
      @select-character="viewCharacterDetailByIndex"
      @select-group="viewGroupDetailByIndex"
      @add-character="addNewCharacter"
      @add-group="addNewGroup"
    />

    <!-- 角色详情页面 -->
    <CharacterDetail
      v-else-if="currentView === 'characterDetail' && editableData && selectedCharacterIndex >= 0"
      :character="editableData.characters[selectedCharacterIndex]"
      @back="backFromCharacterDetail"
      @save="saveEditableData(true)"
      @delete="deleteCharacter(selectedCharacterIndex)"
      @update-field="updateCharacterField"
      @open-image-picker="openImagePicker"
    />

    <!-- 群聊详情页面 -->
    <GroupDetail
      v-else-if="currentView === 'groupDetail' && editableData && selectedGroupIndex >= 0"
      :group="editableData.groups[selectedGroupIndex]"
      :characters="editableData.characters"
      @back="backFromGroupDetail"
      @save="saveEditableData(true)"
      @delete="deleteGroup(selectedGroupIndex)"
      @update-field="updateGroupField"
      @toggle-member="(name) => toggleGroupMember(selectedGroupIndex, name)"
      @open-image-picker="openImagePicker"
    />

    <!-- 头像背景库详情 -->
    <AvatarLibrary
      v-else-if="currentView === 'avatars' || currentView === 'avatarDetail'"
      :avatars="editableData?.randomAvatars || []"
      :backgrounds="editableData?.backgrounds || []"
      @back="currentView = null"
      @save="saveEditableData(true)"
      @delete-avatar="deleteAvatar"
      @delete-background="deleteBackground"
      @add-avatar="openUrlInputModal('avatar')"
      @add-background="openUrlInputModal('background')"
      @batch-import-avatars="batchImportAvatars"
      @batch-import-backgrounds="batchImportBackgrounds"
    />

    <!-- 音乐库详情 -->
    <MusicLibrary
      v-else-if="currentView === 'music'"
      :editable-data="editableData"
      @back="currentView = null"
      @save="saveEditableData(true)"
      @open-music-search="openMusicSearchPanel"
      @open-music-url="openMusicUrlModal"
    />

    <!-- 表情包库 -->
    <StickerLibrary v-else-if="currentView === 'sticker'" @back="currentView = null" />

    <!-- 角色图片库 -->
    <CharacterImageLibrary
      v-else-if="currentView === 'characterImages'"
      :characters="baseInfo.characters"
      @back="currentView = null"
      @save="saveEditableData(true)"
    />

    <!-- 地图数据详情 -->
    <MapSettings
      v-else-if="currentView === 'map'"
      :editable-data="editableData"
      @back="currentView = null"
      @save="saveEditableData(true)"
      @open-icon-picker="openIconPicker"
    />

    <!-- API 配置页面 -->
    <ApiSettings
      v-else-if="currentView === 'api'"
      @back="currentView = null"
    />

    <!-- 预设配置页面 -->
    <PresetSettings
      v-else-if="currentView === 'preset'"
      @back="currentView = null"
      @open-auto-fill="currentView = 'autoFill'"
    />

    <!-- 自动填充管理页面 -->
    <AutoFillSettings
      v-else-if="currentView === 'autoFill'"
      @back="currentView = 'preset'"
    />

    <!-- 自动回复设置页面 -->
    <AutoReplySettings
      v-else-if="currentView === 'autoReply'"
      @back="currentView = null"
    />

    <!-- 其他设置页面 -->
    <OtherSettings
      v-else-if="currentView === 'other'"
      @back="currentView = null"
    />

    <!-- 图片选择弹窗 -->
    <ImagePickerModal
      v-model:visible="showImagePicker"
      :type="imagePickerType"
      :avatars="editableData?.randomAvatars || []"
      :backgrounds="editableData?.backgrounds || []"
      @select="handleImageSelect"
    />

    <!-- URL输入弹窗（用于头像背景库添加） -->
    <UrlInputModal
      v-model:visible="showUrlInputModal"
      :type="urlInputType"
      @confirm="handleUrlInputConfirm"
    />

    <!-- 图标选择弹窗 -->
    <IconPickerModal
      v-model:visible="showIconPicker"
      @select="handleIconSelect"
    />

    <!-- 音乐搜索弹窗 -->
    <MusicSearchModal
      v-model:visible="showMusicSearch"
      :results="musicSearchResults"
      :is-searching="isMusicSearching"
      :search-error="musicSearchError"
      :has-searched="hasMusicSearched"
      @search="handleMusicSearch"
      @select="addSearchResultToLibrary"
    />

    <!-- 音乐URL输入弹窗 -->
    <MusicUrlModal
      v-model:visible="showMusicUrlModal"
      @confirm="handleMusicUrlConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { store } from '../../store';
import StickerLibrary from './StickerLibrary.vue';
import CharacterImageLibrary from './CharacterImageLibrary.vue';
import ImagePickerModal from './components/modals/ImagePickerModal.vue';
import UrlInputModal from './components/modals/UrlInputModal.vue';
import IconPickerModal from './components/modals/IconPickerModal.vue';
import MusicSearchModal from './components/modals/MusicSearchModal.vue';
import MusicUrlModal from './components/modals/MusicUrlModal.vue';
import MainMenu from './components/views/MainMenu.vue';
import UserSettings from './components/views/UserSettings.vue';
import CharacterList from './components/views/CharacterList.vue';
import CharacterDetail from './components/views/CharacterDetail.vue';
import GroupDetail from './components/views/GroupDetail.vue';
import AvatarLibrary from './components/views/AvatarLibrary.vue';
import MapSettings from './components/views/MapSettings.vue';
import MusicLibrary from './components/views/MusicLibrary.vue';
import ApiSettings from './components/views/ApiSettings.vue';
import AutoFillSettings from './components/views/AutoFillSettings.vue';
import PresetSettings from './components/views/PresetSettings.vue';
import AutoReplySettings from './components/views/AutoReplySettings.vue';
import OtherSettings from './components/views/OtherSettings.vue';
import { useApiConfig } from './composables/useApiConfig';
import { useMusicSearch } from './composables/useMusicSearch';
import { useDataLoader } from './composables/useDataLoader';

// 类型导入
import type {
  Song,
  MusicData,
  MusicSearchResult,
  User,
  Character,
  GroupChat,
  SubLocation,
  District,
  MapData,
  BaseInfo,
  PhoneData,
  ApiConfig,
  FormatGuideData,
  HistoryConfig,
  ViewType,
  IconCategoryKey,
} from './types';
import { standardPageNames, iconCategories } from './types';

// 视图状态
const currentView = ref<ViewType>(null);
const selectedCharacter = ref<Character | null>(null);
const selectedCharacterIndex = ref<number>(-1);
const selectedGroupIndex = ref<number>(-1);
const showAddDropdown = ref<boolean>(false);
const previewAvatar = ref<string | null>(null);

// 图片选择弹窗状态
const showImagePicker = ref(false);
const imagePickerType = ref<'avatar' | 'background'>('avatar');
const imagePickerCallback = ref<((url: string) => void) | null>(null);

// 打开图片选择弹窗
const openImagePicker = (type: 'avatar' | 'background', callback: (url: string) => void) => {
  imagePickerType.value = type;
  imagePickerCallback.value = callback;
  showImagePicker.value = true;
};

// 处理图片选择（从 ImagePickerModal 组件接收）
const handleImageSelect = (url: string) => {
  if (imagePickerCallback.value) {
    imagePickerCallback.value(url);
  }
  imagePickerCallback.value = null;
};

// URL输入弹窗状态（用于头像背景库添加）
const showUrlInputModal = ref(false);
const urlInputType = ref<'avatar' | 'background'>('avatar');

// 打开URL输入弹窗
const openUrlInputModal = (type: 'avatar' | 'background') => {
  urlInputType.value = type;
  showUrlInputModal.value = true;
};

// 处理URL输入确认（从 UrlInputModal 组件接收）
const handleUrlInputConfirm = (url: string) => {
  if (urlInputType.value === 'avatar') {
    addAvatar(url);
  } else {
    addBackground(url);
  }
};

// 图标选择弹窗状态
const showIconPicker = ref(false);
const iconPickerCallback = ref<((icon: string) => void) | null>(null);

// 打开图标选择弹窗
const openIconPicker = (callback: (icon: string) => void) => {
  iconPickerCallback.value = callback;
  showIconPicker.value = true;
};

// 处理图标选择（从 IconPickerModal 组件接收）
const handleIconSelect = (icon: string) => {
  if (iconPickerCallback.value) {
    iconPickerCallback.value(icon);
  }
  iconPickerCallback.value = null;
};

// API 配置 (使用 composable)
const {
  apiConfig,
  showApiKey,
  modelList,
  modelFilter,
  showModelDropdown,
  isLoadingModels,
  filteredModels,
  saveApiConfig,
  loadApiConfig,
  fetchModels,
  toggleModelDropdown,
  selectModel,
  formatContextLength,
} = useApiConfig();

// 音乐搜索 (使用 composable)
const {
  showMusicSearch,
  musicSearchResults,
  isMusicSearching,
  musicSearchError,
  hasMusicSearched,
  showMusicUrlModal,
  openMusicSearchPanel,
  openMusicUrlModal,
  handleMusicSearch,
} = useMusicSearch();

// 数据加载 (使用 composable)
const {
  defaultBaseInfo,
  defaultMusicData,
  loadPhoneDataFromChat,
  savePhoneDataToChat,
  phoneData,
  baseInfo,
  musicData,
  editableData,
  isNewCharacter,
  isNewGroup,
  initPhoneData,
  initEditableData,
  saveEditableData,
} = useDataLoader();

// 导出数据为聊天变量格式
const handleExportData = () => {
  // 构建符合聊天变量格式的数据
  const exportData: PhoneData = {
    // 用户数据
    user: {
      id: baseInfo.value.user.id,
      name: baseInfo.value.user.name,
      nickname: baseInfo.value.user.nickname,
      avatar: baseInfo.value.user.avatar,
      email: baseInfo.value.user.email,
      bio: baseInfo.value.user.bio,
      state: baseInfo.value.user.state,
      phoneBg: baseInfo.value.user.phoneBg,
      chatListBg: baseInfo.value.user.chatListBg,
      font: baseInfo.value.user.font || '',
    },
    // 角色数据
    characters: baseInfo.value.characters.map(char => ({
      id: char.id,
      name: char.name,
      avatar: char.avatar,
      nickname: char.nickname,
      email: char.email,
      chatBg: char.chatBg,
      dynamicBg: char.dynamicBg,
      onlineStyle: char.onlineStyle || '',
    })),
    // 头像库
    randomAvatars: baseInfo.value.randomAvatars,
    // 背景库
    backgrounds: baseInfo.value.backgrounds,
    // 音乐库
    music: musicData.value.songs.map(song => ({
      url: song.url,
      artist: song.artist,
      title: song.title,
    })),
    // 地图数据
    map: {
      name: baseInfo.value.map.name,
      districts: baseInfo.value.map.districts.map(district => ({
        position: district.position,
        name: district.name,
        icon: district.icon,
        subLocations: district.subLocations?.map(sub => ({
          position: sub.position,
          name: sub.name,
          icon: sub.icon,
        })) || [],
      })),
    },
    // 群聊数据
    groups: (editableData.value?.groups || []).map(group => ({
      id: group.id,
      name: group.name,
      avatar: group.avatar,
      mainMembers: group.mainMembers || [],
      otherMembers: group.otherMembers || '',
      description: group.description || '',
      chatBg: group.chatBg,
    })),
    // 字体数据
    fonts: (editableData.value?.fonts || []).map(font => ({
      name: font.name,
      url: font.url,
    })),
    // 导出元信息
    _exportMeta: {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'phone_settings',
    },
  };

  // 下载文件
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `phone_data_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert('数据导出成功！');
};

// 刷新数据 - 重新加载整个界面
const handleRefresh = () => {
  if (confirm('确定要刷新吗？这将重新加载整个手机界面。')) {
    window.location.reload();
  }
};

// 导入数据并保存到角色变量
const handleImportData = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as PhoneData;

      // 验证数据格式
      if (!data.user || !data.characters || !Array.isArray(data.characters)) {
        throw new Error('无效的数据格式：缺少必要的 user 或 characters 字段');
      }

      // 构建完整的 PhoneData
      const importedData: PhoneData = {
        user: data.user,
        characters: data.characters,
        groups: data.groups || [],
        randomAvatars: data.randomAvatars || [],
        backgrounds: data.backgrounds || [],
        music: data.music || [],
        map: data.map || { name: '未知', districts: [] },
        fonts: data.fonts || [],
        _exportMeta: {
          version: data._exportMeta?.version || '1.0',
          exportedAt: Date.now(),
          source: 'import',
        },
      };

      // 保存到角色变量
      savePhoneDataToChat(importedData);

      // 加载导入的字体 CSS 到父文档
      const parentDoc = window.parent.document;
      // 先移除旧的字体样式
      parentDoc.querySelectorAll('link[data-phone-font]').forEach(el => el.remove());
      // 添加新的字体样式
      (importedData.fonts || []).forEach(font => {
        if (font.url) {
          const link = parentDoc.createElement('link');
          link.rel = 'stylesheet';
          link.href = font.url;
          link.setAttribute('data-phone-font', font.name);
          parentDoc.head.appendChild(link);
        }
      });

      // 更新本地状态
      phoneData.value = importedData;

      // 更新可编辑数据（界面显示的数据）
      initEditableData();

      alert(`数据导入成功！\n- ${importedData.characters.length} 个角色\n- ${importedData.groups.length} 个群聊\n- ${importedData.randomAvatars.length} 张头像\n- ${importedData.backgrounds.length} 张背景\n- ${importedData.music.length} 首音乐\n- ${(importedData.fonts || []).length} 个字体`);
    } catch (error) {
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
  input.click();
};

// 查看角色详情
const viewCharacterDetail = (char: Character) => {
  selectedCharacter.value = char;
  currentView.value = 'characterDetail';
};

// 通过索引查看角色详情（可编辑模式）
const viewCharacterDetailByIndex = (index: number) => {
  selectedCharacterIndex.value = index;
  if (editableData.value) {
    selectedCharacter.value = editableData.value.characters[index];
  }
  currentView.value = 'characterDetail';
};

// 添加新角色
const addNewCharacter = () => {
  if (!editableData.value) return;
  const newId = String(Date.now());
  const newCharacter: Character = {
    id: newId,
    name: '新角色',
    nickname: '昵称',
    avatar: editableData.value.randomAvatars[0] || 'https://via.placeholder.com/100',
    email: `character${newId}@example.com`,
    chatBg: editableData.value.backgrounds[0] || 'https://via.placeholder.com/400x300',
    dynamicBg: editableData.value.backgrounds[0] || 'https://via.placeholder.com/400x300',
    onlineStyle: '',
  };
  editableData.value.characters.push(newCharacter);
  isNewCharacter.value = true;
  viewCharacterDetailByIndex(editableData.value.characters.length - 1);
};

// 删除角色
const deleteCharacter = (index: number) => {
  if (!editableData.value) return;
  if (!confirm('确定要删除这个角色吗？')) return;
  editableData.value.characters.splice(index, 1);
  currentView.value = 'characters';
  selectedCharacterIndex.value = -1;
  // 自动保存
  saveEditableData();
};

// 更新角色字段
const updateCharacterField = (field: keyof Character, value: string) => {
  if (!editableData.value || selectedCharacterIndex.value < 0) return;
  const character = editableData.value.characters[selectedCharacterIndex.value];
  if (character) {
    (character as any)[field] = value;
  }
};

// 添加新群聊
const addNewGroup = () => {
  if (!editableData.value) return;
  if (!editableData.value.groups) {
    editableData.value.groups = [];
  }
  const newId = String(Date.now());
  const newGroup: GroupChat = {
    id: newId,
    name: '新群聊',
    avatar: editableData.value.randomAvatars[0] || 'https://via.placeholder.com/100',
    mainMembers: [],
    otherMembers: '',
    description: '',
    chatBg: editableData.value.backgrounds[0] || 'https://via.placeholder.com/400x300',
  };
  editableData.value.groups.push(newGroup);
  isNewGroup.value = true;
  viewGroupDetailByIndex(editableData.value.groups.length - 1);
};

// 查看群聊详情
const viewGroupDetailByIndex = (index: number) => {
  selectedGroupIndex.value = index;
  currentView.value = 'groupDetail';
};

// 删除群聊
const deleteGroup = (index: number) => {
  if (!editableData.value) return;
  if (!confirm('确定要删除这个群聊吗？')) return;
  editableData.value.groups.splice(index, 1);
  currentView.value = 'characters';
  selectedGroupIndex.value = -1;
  // 自动保存
  saveEditableData();
};

// 从角色详情返回（撤销未保存的新建）
const backFromCharacterDetail = () => {
  if (isNewCharacter.value && editableData.value) {
    editableData.value.characters.pop();
    isNewCharacter.value = false;
  }
  currentView.value = 'characters';
  selectedCharacterIndex.value = -1;
};

// 从群聊详情返回（撤销未保存的新建）
const backFromGroupDetail = () => {
  if (isNewGroup.value && editableData.value) {
    editableData.value.groups.pop();
    isNewGroup.value = false;
  }
  currentView.value = 'characters';
  selectedGroupIndex.value = -1;
};

// 切换群聊成员
const toggleGroupMember = (groupIndex: number, memberName: string) => {
  if (!editableData.value || !editableData.value.groups[groupIndex]) return;
  const group = editableData.value.groups[groupIndex];
  if (!group.mainMembers) {
    group.mainMembers = [];
  }
  const idx = group.mainMembers.indexOf(memberName);
  if (idx >= 0) {
    group.mainMembers.splice(idx, 1);
  } else {
    group.mainMembers.push(memberName);
  }
};

// 更新群聊字段
const updateGroupField = (field: keyof GroupChat, value: string) => {
  if (!editableData.value || selectedGroupIndex.value < 0) return;
  const group = editableData.value.groups[selectedGroupIndex.value];
  if (group) {
    (group as any)[field] = value;
  }
};

// 查看头像详情
const viewAvatarDetail = (avatar: string) => {
  previewAvatar.value = avatar;
  currentView.value = 'avatarDetail';
};

// 添加头像到库
const addAvatar = (url: string) => {
  if (!editableData.value) return;
  editableData.value.randomAvatars.push(url);
};

// 删除头像
const deleteAvatar = (index: number) => {
  if (!editableData.value) return;
  editableData.value.randomAvatars.splice(index, 1);
};

// 添加背景到库
const addBackground = (url: string) => {
  if (!editableData.value) return;
  editableData.value.backgrounds.push(url);
};

// 删除背景
const deleteBackground = (index: number) => {
  if (!editableData.value) return;
  editableData.value.backgrounds.splice(index, 1);
};

// 批量导入头像
const batchImportAvatars = (urls: string[]) => {
  if (!editableData.value) return;
  editableData.value.randomAvatars.push(...urls);
};

// 批量导入背景
const batchImportBackgrounds = (urls: string[]) => {
  if (!editableData.value) return;
  editableData.value.backgrounds.push(...urls);
};

// 处理音乐URL确认
const handleMusicUrlConfirm = (data: { title: string; artist: string; url: string }) => {
  if (!editableData.value) return;
  editableData.value.music.push({
    url: data.url,
    title: data.title,
    artist: data.artist,
  });
};

// 将搜索结果添加到音乐库
const addSearchResultToLibrary = (result: MusicSearchResult) => {
  if (!editableData.value) return;

  editableData.value.music.push({
    url: result.url,
    title: result.title,
    artist: result.artist,
  });

  alert(`已添加：${result.title}`);
};

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.model-selector')) {
    showModelDropdown.value = false;
  }
};

// 初始化加载配置
onMounted(() => {
  initPhoneData();
  initEditableData();
  loadApiConfig();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.settings-container {
  height: 100%;
  background: linear-gradient(135deg, #F0F6FC 0%, #E8F4FD 100%);
  overflow: hidden;
}

/* 头部 - 极简版 */
.settings-header,
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.back-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 10px;
}

.back-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.8);
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-placeholder {
  width: 24px;
}

/* 头部操作按钮 */
.header-actions {
  display: flex;
  gap: 6px;
}

.header-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.header-action-btn:active {
  transform: scale(0.95);
  background: rgba(143, 184, 237, 0.2);
  color: #8FB8ED;
}

/* 详情页面 */
.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 用户详情 */
.user-profile-card {
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

.user-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.25);
  margin-bottom: 12px;
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name-large {
  font-size: 20px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.user-nickname {
  font-size: 14px;
  color: #94A3B8;
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
}

.info-item:last-child {
  border-bottom: none;
}

.bio-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.info-label {
  font-size: 14px;
  color: #94A3B8;
}

.profile-input-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.info-value {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
  word-break: break-all;
}

.status-online {
  color: #10B981;
}

.bio-text {
  line-height: 1.5;
}

/* 角色列表 */
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
}

.character-card:active {
  transform: scale(0.98);
}

.char-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.char-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  color: #94A3B8;
}

.char-arrow {
  color: #94A3B8;
  font-size: 14px;
}

/* 角色详情页面 */
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
  overflow: hidden;
  border: 3px solid rgba(143, 184, 237, 0.3);
  box-shadow: 0 4px 20px rgba(143, 184, 237, 0.25);
  margin-bottom: 14px;
}

.char-detail-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.char-detail-name {
  font-size: 22px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.char-detail-nickname {
  font-size: 14px;
  color: #94A3B8;
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
}

.bg-preview img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  display: block;
}

/* 头像网格 */
.avatars-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.avatar-item {
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 12px rgba(143, 184, 237, 0.15);
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-item:active {
  transform: scale(0.95);
}

.avatar-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatars-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 12px;
  color: #8FB8ED;
  font-size: 13px;
}

/* 头像背景库分区标题 */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #475569;
  font-size: 15px;
  font-weight: 600;
}

.section-header i {
  color: #8FB8ED;
  font-size: 16px;
}

.section-count {
  margin-left: auto;
  background: rgba(143, 184, 237, 0.15);
  color: #8FB8ED;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* 下拉菜单 */
.nav-dropdown-wrapper {
  position: relative;
  z-index: 1000;
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
}

.dropdown-item:hover {
  background: rgba(143, 184, 237, 0.1);
}

.dropdown-item i {
  color: #8FB8ED;
  width: 16px;
  text-align: center;
}

/* 成员选择区域 */
.member-section {
  margin: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
}

.member-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 10px;
}

.member-section-title i {
  color: #8FB8ED;
  font-size: 12px;
}

.member-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 500;
  color: #8FB8ED;
}

/* 成员选择网格 */
.member-select-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.member-select-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.member-select-item:hover {
  background: rgba(255, 255, 255, 0.8);
}

.member-select-item.selected {
  background: rgba(143, 184, 237, 0.2);
  border-color: #8FB8ED;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 4px;
}

.member-name {
  font-size: 11px;
  color: #475569;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.member-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  background: #8FB8ED;
  border-radius: 50%;
  color: white;
  font-size: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 背景网格 */
.backgrounds-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.background-item {
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.15);
}

.background-item:active {
  transform: scale(0.96);
}

.background-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

/* 头像预览页面 */
.avatar-detail-page {
  background: linear-gradient(135deg, #F0F6FC 0%, #E8F4FD 100%);
}

.avatar-preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  overflow-y: auto;
}

.avatar-preview-large {
  width: 80%;
  max-width: 280px;
  aspect-ratio: 1;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 30px rgba(143, 184, 237, 0.25);
  margin-bottom: 20px;
}

.avatar-preview-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-preview-url {
  width: 100%;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 14px 16px;
}

.url-label {
  font-size: 13px;
  color: #94A3B8;
  margin-bottom: 6px;
}

.url-value {
  font-size: 12px;
  color: #475569;
  word-break: break-all;
  line-height: 1.5;
}

/* 地图数据 */
.map-overview {
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}

.map-name {
  font-size: 20px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.map-stats {
  font-size: 14px;
  color: #94A3B8;
}

.district-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}

.district-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  gap: 10px;
}

/* 上下移动按钮 */
.move-btns {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.move-btn {
  width: 22px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(143, 184, 237, 0.15);
  border: none;
  border-radius: 4px;
  color: #8FB8ED;
  cursor: pointer;
  font-size: 10px;
  padding: 0;
  transition: all 0.2s;
}

.move-btn:hover:not(:disabled) {
  background: rgba(143, 184, 237, 0.3);
  color: #7AA8E0;
}

.move-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.move-btns-sub {
  gap: 1px;
}

.move-btn-sub {
  width: 18px;
  height: 14px;
  font-size: 8px;
}

.district-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 15px;
  flex-shrink: 0;
}

/* 地区名称输入框 */
.district-name-input {
  flex: 1;
  min-width: 0;
  font-size: 14px !important;
  font-weight: 600;
}

/* 子地点名称输入框 */
.sub-name-input {
  flex: 1;
  min-width: 0;
  font-size: 13px !important;
}

.district-info {
  flex: 1;
  margin-left: 12px;
}

.district-name {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
}

.district-position {
  font-size: 12px;
  color: #94A3B8;
}

.district-sub-count {
  font-size: 12px;
  color: #8FB8ED;
  background: rgba(143, 184, 237, 0.15);
  padding: 4px 10px;
  border-radius: 20px;
}

.sub-locations {
  border-top: 1px solid rgba(143, 184, 237, 0.1);
  padding: 8px 16px;
}

.sub-location-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  gap: 8px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.05);
  transition: background 0.15s;
}

.sub-location-item:last-child {
  border-bottom: none;
}

.sub-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8FB8ED;
  font-size: 13px;
  flex-shrink: 0;
}

.sub-name {
  flex: 1;
  font-size: 14px;
  color: #475569;
}

.sub-position {
  font-size: 12px;
  color: #94A3B8;
}

/* API 配置图标 */
.api-icon {
  background: linear-gradient(135deg, #A78BFA, #8B5CF6);
}

/* 预设配置图标 */
.preset-icon {
  background: linear-gradient(135deg, #60A5FA, #3B82F6);
}

/* API 配置页面 */
.api-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 20px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 16px;
}

.input-group {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #64748B;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.input-field:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.input-field::placeholder {
  color: #94A3B8;
}

.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input .input-field {
  padding-right: 44px;
}

.toggle-visibility {
  position: absolute;
  right: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  transition: color 0.2s;
}

.toggle-visibility:active {
  color: #8FB8ED;
}

.save-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.3);
}

.save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(143, 184, 237, 0.2);
}

.api-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 12px;
  color: #8FB8ED;
  font-size: 13px;
}

/* 高级设置分隔线 */
.section-divider-line {
  display: flex;
  align-items: center;
  margin: 20px 0 16px;
  gap: 12px;
}

.section-divider-line::before,
.section-divider-line::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(143, 184, 237, 0.3), transparent);
}

.section-divider-line span {
  font-size: 12px;
  color: #94A3B8;
  white-space: nowrap;
}

/* 输入标签行 */
.input-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.input-hint {
  font-size: 12px;
  color: #94A3B8;
}

/* 上下文长度输入 */
.context-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.context-input {
  flex: 1;
  text-align: center;
}

.context-unit {
  font-size: 13px;
  color: #64748B;
  min-width: 50px;
}

/* 温度滑块 */
.temperature-value {
  font-size: 14px;
  font-weight: 600;
  color: #8FB8ED;
  background: rgba(143, 184, 237, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
}

.temperature-slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.temperature-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, #60A5FA, #A8D8B9, #FFC8DD);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.temperature-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid #8FB8ED;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.temperature-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(143, 184, 237, 0.4);
}

.temperature-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid #8FB8ED;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.temperature-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94A3B8;
}

/* 流式传输开关 */
.streaming-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.streaming-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.streaming-label .input-label {
  margin-bottom: 0;
}

.streaming-label .input-hint {
  font-size: 11px;
}

/* 模型选择样式 */
.model-select-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.model-selector {
  flex: 1;
  position: relative;
}

.model-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.model-select-trigger:hover {
  border-color: #8FB8ED;
}

.model-select-text {
  font-size: 14px;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.model-select-trigger .fa-chevron-down {
  font-size: 12px;
  color: #94A3B8;
  transition: transform 0.2s;
}

.model-select-trigger .fa-chevron-down.rotate {
  transform: rotate(180deg);
}

.model-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  overflow: hidden;
}

.model-filter-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.6) !important;
  border: none !important;
  border-bottom: 1px solid rgba(143, 184, 237, 0.3) !important;
  outline: none;
  box-sizing: border-box;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.model-filter-input:focus {
  background-color: rgba(255, 255, 255, 0.8) !important;
  border-bottom-color: rgba(143, 184, 237, 0.5) !important;
}

.model-filter-input::placeholder {
  color: #94A3B8;
}

.model-list {
  max-height: 200px;
  overflow-y: auto;
}

.model-list::-webkit-scrollbar {
  width: 4px;
}

.model-list::-webkit-scrollbar-track {
  background: transparent;
}

.model-list::-webkit-scrollbar-thumb {
  background: rgba(143, 184, 237, 0.3);
  border-radius: 2px;
}

.model-option {
  padding: 10px 14px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-option:hover {
  background: rgba(143, 184, 237, 0.1);
}

.model-option:active {
  background: rgba(143, 184, 237, 0.2);
}

.model-option.is-selected {
  background: rgba(143, 184, 237, 0.15);
  color: #8FB8ED;
  font-weight: 500;
}

.model-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 14px;
  color: #94A3B8;
  font-size: 13px;
}

.model-empty i {
  font-size: 20px;
  opacity: 0.6;
}

.fetch-models-btn {
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
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.3);
}

.fetch-models-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.fetch-models-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 预设配置页面 */
.add-btn-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
}

.add-btn-small:active {
  transform: scale(0.95);
}

/* 线上风格样式 */
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
}

.style-title i {
  color: #8FB8ED;
  font-size: 16px;
}

.style-content {
  padding: 14px 16px;
  font-size: 14px;
  color: #64748B;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 可编辑输入框样式 - MistyGlass风格 */
.editable-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.editable-input:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.editable-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  color: #475569;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

.editable-textarea:focus {
  background-color: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1);
}

/* 可点击编辑的图片 */
.editable-avatar {
  position: relative;
  cursor: pointer;
}

.editable-avatar::after {
  content: '\f030';
  font-family: 'Font Awesome 5 Free';
  font-weight: 900;
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
}

.editable-bg-preview {
  position: relative;
  cursor: pointer;
}

.editable-bg-preview::after {
  content: '\f030';
  font-family: 'Font Awesome 5 Free';
  font-weight: 900;
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
}

/* 页面底部保存按钮 */
.page-save-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.3);
  margin-top: 16px;
}

.page-save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(143, 184, 237, 0.2);
}

/* 添加/删除按钮 */
.add-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: rgba(143, 184, 237, 0.1);
  border: 2px dashed rgba(143, 184, 237, 0.4);
  border-radius: 14px;
  color: #8FB8ED;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-item-btn:active {
  background: rgba(143, 184, 237, 0.2);
  border-color: #8FB8ED;
}

.delete-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-item:hover .delete-overlay,
.background-item:hover .delete-overlay {
  opacity: 1;
}

.avatar-item-wrapper,
.background-item-wrapper {
  position: relative;
}

/* 地图编辑样式 */
.district-edit-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.editable-sub {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub-delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  border: none;
  color: #F87171;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.sub-delete-btn:active {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
}

.add-sub-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  margin-top: 8px;
  background: rgba(143, 184, 237, 0.08);
  border: 1px dashed rgba(143, 184, 237, 0.4);
  border-radius: 10px;
  color: #8FB8ED;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-sub-btn:active {
  background: rgba(143, 184, 237, 0.15);
  border-color: #8FB8ED;
}

/* 可点击选择图标样式 */
.icon-selectable {
  cursor: pointer;
  transition: all 0.2s;
}

.icon-selectable:hover {
  transform: scale(1.1);
  color: #8FB8ED;
}

.icon-selectable:active {
  transform: scale(0.95);
}

.icon-hint {
  font-size: 11px;
  color: #94A3B8;
  margin-left: 8px;
}

.limit-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  margin-top: 8px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 10px;
  color: #F87171;
  font-size: 12px;
}

/* ========== 自动填充管理页面 ========== */
.autofill-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.autofill-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.autofill-card:hover {
  background: rgba(255, 255, 255, 0.85);
  transform: translateX(4px);
}

.autofill-card:active {
  transform: scale(0.98);
}

.autofill-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
  flex-shrink: 0;
}

.autofill-info {
  flex: 1;
  min-width: 0;
}

.autofill-title {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 2px;
}

.autofill-desc {
  font-size: 12px;
  color: #94A3B8;
}

.autofill-arrow {
  font-size: 12px;
  color: #94A3B8;
  flex-shrink: 0;
}

/* 自动填充介绍 */
.autofill-intro {
  background: rgba(143, 184, 237, 0.1);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin: 12px;
  margin-bottom: 0;
}

.autofill-intro p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.autofill-intro .tag-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #64748B;
}

.autofill-intro code {
  background: rgba(143, 184, 237, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: #3B82F6;
}

/* 页面名称区域 */
.page-names-section {
  margin: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 12px;
}

.section-title-small {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 10px;
}

.page-names-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.page-name-tag {
  background: rgba(156, 163, 175, 0.3);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #4B5563;
  font-weight: 500;
}

/* 对话历史配置 */
.history-config-section {
  margin: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 12px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.config-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.config-item:first-child {
  padding-top: 0;
}

.config-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.config-label > span:first-child {
  font-size: 14px;
  font-weight: 500;
  color: #1E293B;
}

.config-hint {
  font-size: 12px;
  color: #94A3B8;
}

.config-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.config-number-input {
  width: 80px;
  padding: 8px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  background: white;
  color: #1E293B;
  outline: none;
  transition: all 0.2s;
}

.config-number-input:focus {
  border-color: #A8D8B9;
  box-shadow: 0 0 0 3px rgba(168, 216, 185, 0.2);
}

.config-unit {
  font-size: 13px;
  color: #64748B;
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #CBD5E1;
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #A8D8B9;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 分隔线 */
.section-divider {
  display: flex;
  align-items: center;
  margin: 16px 12px 8px;
}

.section-divider::before,
.section-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #E2E8F0, transparent);
}

.section-divider span {
  padding: 0 12px;
  font-size: 12px;
  color: #94A3B8;
  white-space: nowrap;
}

/* ========== 格式指导页面 ========== */
.format-guide-list {
  padding: 12px;
}

.format-guide-item {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.2s;
}

.format-guide-item:last-child {
  margin-bottom: 0;
}

.format-guide-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.format-guide-header:hover {
  background: rgba(143, 184, 237, 0.05);
}

.format-guide-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 15px;
  flex-shrink: 0;
}

.format-guide-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-left: 12px;
}

.format-guide-toggle {
  color: #94A3B8;
  font-size: 12px;
  transition: transform 0.2s;
}

.format-guide-content {
  padding: 0 16px 16px;
}

.format-guide-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  font-size: 14px;
  color: #475569 !important;
  background-color: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(143, 184, 237, 0.2) !important;
  border-radius: 12px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  transition: all 0.2s;
  font-family: inherit;
  line-height: 1.6;
}

.format-guide-textarea:focus {
  background-color: white !important;
  border-color: rgba(143, 184, 237, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(143, 184, 237, 0.1) !important;
}

.format-guide-textarea::placeholder {
  color: #94A3B8 !important;
}

/* 空白占位样式 */
.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}
</style>
