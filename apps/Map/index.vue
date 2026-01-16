<template>
  <div class="map-app">
    <!-- 返回按钮（始终显示） -->
    <button class="back-button" @click="handleBack">
      <i class="fas fa-arrow-left"></i>
    </button>

    <!-- 刷新按钮 -->
    <button class="refresh-button" @click="refreshMapData">
      <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
    </button>

    <!-- 人物列表按钮 -->
    <button class="characters-button" @click="toggleCharactersList">
      <i class="fas fa-users"></i>
    </button>

    <!-- 人物列表弹窗 -->
    <Transition name="slide">
      <div v-if="showCharacters" class="characters-list">
        <div class="characters-list-title">人物列表</div>
        <div class="characters-list-content">
          <div
            v-for="(charData, charName) in mapData.characters"
            :key="charName"
            class="character-item"
            @click="showCharacterDetail(charName as string, charData)"
          >
            <img class="character-avatar" :src="getCharacterAvatar(charName as string)" :alt="charName as string" />
            <div class="character-info">
              <div class="character-name">{{ charName }}</div>
              <div class="character-location">{{ charData.location }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 地图内容 -->
    <div class="map-container">
      <div class="map-title">{{ currentMapTitle }}</div>

      <!-- 动态渲染3x3网格 -->
      <template v-for="row in 3" :key="'row-' + row">
        <div class="map-row">
          <template v-for="col in 3" :key="'col-' + col">
            <!-- 地点格子 -->
            <div
              v-if="getLocationAtPosition(row, col)"
              class="location-button"
              :class="{
                'school-button': hasSubLocations(getLocationAtPosition(row, col)!.name),
                'empty-location': false,
              }"
              @click="handleLocationClick(getLocationAtPosition(row, col)!)"
            >
              <!-- 人物标注 -->
              <div class="character-markers">
                <div
                  v-for="(char, idx) in getCharactersAt(getLocationAtPosition(row, col)!.name)"
                  :key="char.name"
                  class="character-marker"
                  :style="getMarkerStyle(idx, getCharactersAt(getLocationAtPosition(row, col)!.name).length)"
                  @click.stop="showCharacterDetail(char.name, { location: char.location, status: char.status })"
                >
                  <img :src="char.avatar" :alt="char.name" />
                  <div class="marker-pin"></div>
                </div>
              </div>
              <i class="fas" :class="getLocationAtPosition(row, col)!.icon"></i>
              <span>{{ getLocationAtPosition(row, col)!.name }}</span>
            </div>
            <!-- 空位置 -->
            <div v-else class="location-button empty-location">
              <i class="fas fa-question"></i>
              <span>暂时留空</span>
            </div>
            <!-- 竖向道路（非最后一列） -->
            <div v-if="col < 3" class="road-vertical"></div>
          </template>
        </div>
        <!-- 横向道路（非最后一行） -->
        <div v-if="row < 3" class="map-row road-row">
          <div class="road-horizontal"></div>
        </div>
      </template>
    </div>

    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="phoneMapState.isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在获取地图数据...</span>
          <button class="abort-btn" @click="handleAbort">
            <i class="fas fa-stop"></i>
            <span>终止生成</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-down">
      <div v-if="phoneMapState.error" class="error-toast" @click="clearMapError">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ phoneMapState.error }}</span>
        <button class="error-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </Transition>

    <!-- 背景遮罩 -->
    <Transition name="fade">
      <div v-if="showBackdrop" class="backdrop" @click="closeAllPopups"></div>
    </Transition>

    <!-- 地点信息弹窗 -->
    <Transition name="popup">
      <div v-if="selectedLocation" class="location-popup">
        <div class="location-popup-header">
          <h2 class="location-popup-title">{{ selectedLocation.name }}</h2>
          <div class="location-popup-actions">
            <button class="location-popup-goto-btn" @click="goToLocation">
              <i class="fas fa-walking"></i> 前往
            </button>
            <button class="location-popup-close" @click="closeLocationPopup">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="location-popup-section">
          <h3 class="location-popup-section-title">人物</h3>
          <div class="location-popup-characters-container">
            <div class="location-popup-characters-group">
              <div class="location-popup-characters-label">主要人物</div>
              <div class="location-popup-characters main-characters">
                <template v-if="selectedLocation.mainCharacters.length > 0">
                  <div
                    v-for="char in selectedLocation.mainCharacters"
                    :key="char.name"
                    class="location-character"
                    @click.stop="showCharacterDetail(char.name, { location: char.location, status: char.status })"
                  >
                    <img :src="char.avatar" :alt="char.name" />
                    <span>{{ char.name }}</span>
                  </div>
                </template>
                <div v-else class="location-popup-empty-message">
                  <i class="fas fa-user-slash"></i>
                  <span>当前没有主要人物在此地点</span>
                </div>
              </div>
            </div>
            <div class="location-popup-characters-group">
              <div class="location-popup-characters-label">其他人物</div>
              <div class="location-popup-characters other-characters">
                <div v-if="selectedLocation.otherCharacters" class="location-popup-empty-message normal">
                  <i class="fas fa-users"></i>
                  <span>{{ selectedLocation.otherCharacters }}</span>
                </div>
                <div v-else class="location-popup-empty-message">
                  <i class="fas fa-users-slash"></i>
                  <span>无其他人物</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="location-popup-section">
          <h3 class="location-popup-section-title">当前位置状态</h3>
          <p class="location-popup-content">{{ selectedLocation.status }}</p>
        </div>

        <div class="location-popup-section">
          <h3 class="location-popup-section-title">重要事件</h3>
          <p class="location-popup-content">{{ selectedLocation.events }}</p>
        </div>
      </div>
    </Transition>

    <!-- 人物详情弹窗 -->
    <Transition name="popup">
      <div v-if="selectedCharacter" class="character-detail-popup">
        <button class="character-detail-close" @click="closeCharacterDetail">
          <i class="fas fa-times"></i>
        </button>
        <div class="character-detail-header">
          <img class="character-detail-avatar" :src="selectedCharacter.avatar" :alt="selectedCharacter.name" />
          <div class="character-detail-info">
            <div class="character-detail-name">{{ selectedCharacter.name }}</div>
            <div class="character-detail-location">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ selectedCharacter.location }}</span>
            </div>
          </div>
        </div>
        <div class="character-detail-status">
          {{ selectedCharacter.status }}
        </div>
        <div class="character-detail-actions">
          <button class="character-detail-message-btn" @click="sendMessageToCharacter">
            <i class="fas fa-comment-dots"></i> 发送消息
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import _ from 'lodash';
import yaml from 'yaml';
import { store, phoneMapState, loadMapDataFromAi, abortCurrentRequest } from '../../store';

defineEmits(['back']);

// YAML数据类型定义
interface DistrictConfig {
  position: number;
  name: string;
  icon: string;
  subLocations?: DistrictConfig[];
}

interface MapConfig {
  name: string;
  districts: DistrictConfig[];
}

interface CharacterConfig {
  name: string;
  avatar: string;
}

interface BaseInfo {
  characters: CharacterConfig[];
  map: MapConfig;
  randomAvatars?: string[];
}

interface LocationData {
  position: number;
  icon: string;
  description: string;
  status: string;
  events: string;
  otherCharacters: string;
  subLocations?: Record<string, LocationData>;
}

interface CharacterMapData {
  location: string;
  status: string;
}

interface MapData {
  date: string;
  time: string;
  locations: Record<string, LocationData>;
  characters: Record<string, CharacterMapData>;
}

// 从角色变量加载数据
const loadPhoneDataFromChat = () => {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData) {
      return phoneData;
    }
  } catch (e) {
    console.warn('无法从角色变量加载数据:', e);
  }
  return null;
};

// 默认空数据
const defaultBaseInfo: BaseInfo = {
  characters: [],
  map: { name: '', districts: [] },
  randomAvatars: [],
};
const fallbackMapData: MapData = {
  date: '',
  time: '',
  locations: {},
  characters: {},
};

// 优先从聊天变量读取baseInfo
const phoneData = loadPhoneDataFromChat();
const baseInfo: BaseInfo = {
  characters: phoneData?.characters || defaultBaseInfo.characters,
  map: phoneData?.map || defaultBaseInfo.map,
  randomAvatars: phoneData?.randomAvatars || defaultBaseInfo.randomAvatars,
};

// 计算属性：获取地图数据（优先使用AI获取的数据，否则使用后备数据）
const mapData = computed<MapData>(() => {
  if (phoneMapState.data) {
    // 确保数据结构完整，防止 undefined 导致渲染错误
    return {
      date: phoneMapState.data.date || '',
      time: phoneMapState.data.time || '',
      locations: phoneMapState.data.locations || {},
      characters: phoneMapState.data.characters || {},
    };
  }
  return fallbackMapData;
});

// 组件挂载时触发AI加载
onMounted(() => {
  // 如果还没有加载过数据，则触发AI加载
  if (!phoneMapState.loaded && !phoneMapState.isLoading) {
    loadMapDataFromAi();
  }
});

// 刷新状态
const isRefreshing = ref(false);

// 刷新 - 强制调用AI重新生成地图数据
const refreshMapData = async () => {
  isRefreshing.value = true;
  // 重置状态以便重新加载
  phoneMapState.loaded = false;
  // 传入 true 强制刷新，跳过历史读取，直接调用AI生成
  await loadMapDataFromAi(true);
  isRefreshing.value = false;
};

// 当前显示的父级地区（用于子地点地图）
const currentParentDistrict = ref<DistrictConfig | null>(null);

// 弹窗状态
const showCharacters = ref(false);

interface LocationInfo {
  name: string;
  description: string;
  mainCharacters: { name: string; avatar: string; location: string; status: string }[];
  otherCharacters: string;
  status: string;
  events: string;
}

interface CharacterInfo {
  name: string;
  avatar: string;
  location: string;
  status: string;
}

const selectedLocation = ref<LocationInfo | null>(null);
const selectedCharacter = ref<CharacterInfo | null>(null);

// 背景遮罩
const showBackdrop = computed(() => selectedLocation.value !== null || selectedCharacter.value !== null);

// 当前地图标题
const currentMapTitle = computed(() => {
  if (currentParentDistrict.value) {
    return currentParentDistrict.value.name + '地图';
  }
  // 优先使用 AI 返回的 mapName，其次使用 baseInfo 中的配置
  return mapData.value.mapName || baseInfo.map.name || '地图';
});

// 当前显示的地点列表（从历史楼层数据读取）
const currentLocations = computed<DistrictConfig[]>(() => {
  // 如果在子地点视图
  if (currentParentDistrict.value && currentParentDistrict.value.subLocations) {
    return currentParentDistrict.value.subLocations;
  }

  // 从 mapData.locations 转换为 DistrictConfig 格式
  const locations = mapData.value.locations;
  if (!locations || Object.keys(locations).length === 0) {
    return [];
  }

  return Object.entries(locations).map(([name, data]) => ({
    position: data.position || 1,
    name,
    icon: data.icon || 'fa-map-marker-alt',
    subLocations: data.subLocations
      ? Object.entries(data.subLocations).map(([subName, subData]) => ({
          position: subData.position || 1,
          name: subName,
          icon: subData.icon || 'fa-map-marker-alt',
        }))
      : undefined,
  }));
});

// 根据位置获取地点
const getLocationAtPosition = (row: number, col: number): DistrictConfig | null => {
  const position = (row - 1) * 3 + col;
  return currentLocations.value.find(loc => loc.position === position) || null;
};

// 检查地点是否有子地点（从历史楼层数据读取）
const hasSubLocations = (locationName: string): boolean => {
  const locationData = mapData.value.locations[locationName];
  return !!(locationData && locationData.subLocations && Object.keys(locationData.subLocations).length > 0);
};

// 用于存储已分配的随机头像映射（确保同一角色始终使用同一头像）
const randomAvatarMap = new Map<string, string>();

// 获取用户信息
const getUserInfo = () => {
  try {
    const charVars = getVariables({ type: 'character' });
    const user = _.get(charVars, 'phone_data.user');
    return user || null;
  } catch {
    return null;
  }
};

// 获取角色头像
const getCharacterAvatar = (name: string): string => {
  // 0. 检查是否是用户（"我"或用户姓名）
  const userInfo = getUserInfo();
  if (userInfo) {
    const userName = userInfo.name || '';
    if (name === '我' || name === userName) {
      return userInfo.avatar || '';
    }
  }

  // 1. 优先从角色列表中查找
  const char = baseInfo.characters.find(c => c.name === name);
  if (char?.avatar) {
    return char.avatar;
  }

  // 2. 如果没有找到，使用随机头像库
  const randomAvatars = baseInfo.randomAvatars;
  if (!randomAvatars || randomAvatars.length === 0) {
    return '';
  }

  // 3. 检查是否已经为该角色分配过随机头像
  if (randomAvatarMap.has(name)) {
    return randomAvatarMap.get(name)!;
  }

  // 4. 基于角色名生成稳定的索引
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % randomAvatars.length;
  const avatar = randomAvatars[index];

  // 5. 缓存分配结果
  randomAvatarMap.set(name, avatar);

  return avatar;
};

// 构建地点层级关系
const buildLocationHierarchy = (): Record<string, string> => {
  const hierarchy: Record<string, string> = {};
  for (const district of baseInfo.map.districts) {
    if (district.subLocations) {
      for (const subLoc of district.subLocations) {
        hierarchy[subLoc.name] = district.name;
      }
    }
  }
  return hierarchy;
};

const locationHierarchy = buildLocationHierarchy();

// 获取某个地点包含的所有子地点
const getChildLocations = (locationName: string): string[] => {
  const children: string[] = [];
  for (const [child, parent] of Object.entries(locationHierarchy)) {
    if (parent === locationName) {
      children.push(child);
    }
  }
  return children;
};

// 从location路径中提取子地点名称
const getSubLocationName = (locationPath: string): string => {
  if (locationPath.includes('/')) {
    return locationPath.split('/')[1];
  }
  return locationPath;
};

// 获取某个地点的角色列表（包括子地点的角色）
const getCharactersAt = (
  locationName: string,
): { name: string; avatar: string; location: string; status: string }[] => {
  const childLocations = getChildLocations(locationName);
  const result: { name: string; avatar: string; location: string; status: string }[] = [];

  // 防御性检查：确保 characters 存在
  const characters = mapData.value.characters;
  if (!characters || typeof characters !== 'object') {
    return result;
  }

  for (const [charName, charData] of Object.entries(characters)) {
    // 防御性检查：确保 charData 存在且有 location 属性
    if (!charData || typeof charData.location !== 'string') {
      continue;
    }

    const subLocName = getSubLocationName(charData.location);

    // 角色直接在该地点
    if (subLocName === locationName) {
      result.push({
        name: charName,
        avatar: getCharacterAvatar(charName),
        location: charData.location,
        status: charData.status || '',
      });
    }
    // 角色在该地点的子地点
    else if (childLocations.includes(subLocName)) {
      result.push({
        name: charName,
        avatar: getCharacterAvatar(charName),
        location: charData.location,
        status: charData.status || '',
      });
    }
  }

  return result;
};

// 根据角色数量和索引计算标注位置样式（防止重叠）
const getMarkerStyle = (index: number, total: number): Record<string, string> => {
  if (total === 1) {
    return { left: '50%', top: '15%' };
  }

  if (total === 2) {
    const positions = [
      { left: '30%', top: '15%' },
      { left: '70%', top: '15%' },
    ];
    return positions[index];
  }

  // 3个或更多
  const positions = [
    { left: '50%', top: '8%' },
    { left: '25%', top: '25%' },
    { left: '75%', top: '25%' },
    { left: '35%', top: '40%' },
    { left: '65%', top: '40%' },
  ];
  return positions[index % positions.length];
};

// 获取地点的动态数据
const getLocationDynamicData = (locationName: string): LocationData | null => {
  // 防御性检查：确保 locations 存在
  const locations = mapData.value.locations;
  if (!locations || typeof locations !== 'object') {
    return null;
  }

  // 先在顶层locations中查找
  if (locations[locationName]) {
    return locations[locationName];
  }

  // 在子地点中查找
  for (const [, locData] of Object.entries(locations)) {
    if (locData && locData.subLocations && locData.subLocations[locationName]) {
      return locData.subLocations[locationName];
    }
  }

  return null;
};

// 处理地点点击
const handleLocationClick = (location: DistrictConfig) => {
  // 检查是否有子地点（从历史楼层数据读取）
  const locationData = mapData.value.locations[location.name];
  if (locationData?.subLocations && Object.keys(locationData.subLocations).length > 0) {
    // 构建子地点的 DistrictConfig
    const subLocations = Object.entries(locationData.subLocations).map(([subName, subData]) => ({
      position: subData.position || 1,
      name: subName,
      icon: subData.icon || 'fa-map-marker-alt',
    }));
    currentParentDistrict.value = { ...location, subLocations };
  } else {
    // 显示地点信息
    showLocationInfo(location.name);
  }
};

// 切换到主地图
const showDistrictMap = () => {
  currentParentDistrict.value = null;
};

// 处理返回按钮点击
const handleBack = () => {
  if (currentParentDistrict.value) {
    // 在子地点地图中，返回主地图
    showDistrictMap();
  } else {
    // 在主地图中，返回主屏幕
    store.activeApp = 'home';
  }
};

// 终止生成并返回主页
const handleAbort = () => {
  abortCurrentRequest();
  phoneMapState.isLoading = false;
  store.activeApp = 'home';
};

// 切换人物列表
const toggleCharactersList = () => {
  showCharacters.value = !showCharacters.value;
  if (showCharacters.value) {
    closeLocationPopup();
    closeCharacterDetail();
  }
};

// 显示地点信息
const showLocationInfo = (locationName: string) => {
  const dynamicData = getLocationDynamicData(locationName);
  if (dynamicData) {
    const mainChars = getCharactersAt(locationName);

    selectedLocation.value = {
      name: locationName,
      description: dynamicData.description || '',
      mainCharacters: mainChars,
      otherCharacters: dynamicData.otherCharacters || '',
      status: dynamicData.status || '',
      events: dynamicData.events || '',
    };
    showCharacters.value = false;
  }
};

// 关闭地点弹窗
const closeLocationPopup = () => {
  selectedLocation.value = null;
};

// 清除地图错误
const clearMapError = () => {
  phoneMapState.error = null;
};

// 显示人物详情
const showCharacterDetail = (name: string, data: CharacterMapData) => {
  selectedCharacter.value = {
    name,
    avatar: getCharacterAvatar(name),
    location: data?.location || '',
    status: data?.status || '',
  };
  showCharacters.value = false;
  selectedLocation.value = null;
};

// 关闭人物详情
const closeCharacterDetail = () => {
  selectedCharacter.value = null;
};

// 关闭所有弹窗
const closeAllPopups = () => {
  closeLocationPopup();
  closeCharacterDetail();
  showCharacters.value = false;
};

// 前往地点
const goToLocation = () => {
  if (selectedLocation.value) {
    console.info('[Map] 前往:', selectedLocation.value.name);
    closeLocationPopup();
  }
};

// 发送消息给角色
const sendMessageToCharacter = () => {
  if (selectedCharacter.value) {
    const charName = selectedCharacter.value.name;

    // 从聊天列表中查找该角色的私聊
    const privateChat = store.chat.chatList.find(
      chat => chat.type === 'single' && chat.name === charName
    );

    if (privateChat) {
      // 设置当前聊天为该角色的私聊
      store.chat.activeConversationId = privateChat.id;
      // 跳转到聊天应用
      store.activeApp = 'chat';
      console.info('[Map] 跳转到私聊:', charName, privateChat.id);
    } else {
      console.info('[Map] 该角色没有私聊记录:', charName);
    }

    closeCharacterDetail();
  }
};
</script>

<style scoped>
.map-app {
  height: 100%;
  background-color: #eaf4fc;
  position: relative;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

/* 返回按钮 */
.back-button {
  position: absolute;
  top: 15px;
  left: 15px;
  background-color: #3a6b99;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.back-button:active {
  transform: scale(0.95);
}

/* 刷新按钮 */
.refresh-button {
  position: absolute;
  top: 15px;
  right: 55px;
  background-color: #3a6b99;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.refresh-button:active {
  transform: scale(0.95);
}

/* 人物列表按钮 */
.characters-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: #3a6b99;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.characters-button:active {
  transform: scale(0.95);
}

/* 人物列表弹窗 */
.characters-list {
  position: absolute;
  top: 55px;
  right: 15px;
  width: 200px;
  background-color: #f0f8ff;
  border-radius: 15px;
  padding: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  z-index: 100;
  border: 2px solid #a5c5e5;
}

.characters-list-title {
  color: #3a6b99;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
}

.characters-list-content {
  max-height: 300px;
  overflow-y: auto;
}

.character-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 5px;
}

.character-item:last-child {
  margin-bottom: 0;
}

.character-item:active {
  background-color: #e6f0fa;
}

.character-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-right: 8px;
  object-fit: cover;
}

.character-info {
  flex-grow: 1;
}

.character-name {
  font-size: 14px;
  font-weight: bold;
  color: #3a6b99;
  margin-bottom: 2px;
}

.character-location {
  font-size: 12px;
  color: #5d91c3;
}

/* 地图容器 */
.map-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding-top: 45px;
}

/* 地图标题 - 固定在顶部 */
.map-title {
  position: absolute;
  top: 15px;
  left: 50px;
  right: 100px;
  text-align: center;
  color: #3a6b99;
  font-size: 16px;
  font-weight: bold;
  line-height: 30px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 地图行 */
.map-row {
  display: flex;
  flex: 1;
  margin-bottom: 5px;
}

.map-row:last-child {
  margin-bottom: 0;
}

.map-row.road-row {
  flex: 0 0 5px;
}

/* 道路 */
.road-horizontal {
  flex: 1;
  height: 5px;
  background-color: #a5c5e5;
  position: relative;
}

.road-horizontal::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #c3d9ed;
}

.road-vertical {
  width: 5px;
  background-color: #a5c5e5;
  height: 100%;
  position: relative;
}

.road-vertical::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #c3d9ed;
}

/* 地点按钮 */
.location-button {
  width: 95px;
  height: 155px;
  min-width: 95px;
  min-height: 155px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: #d6e8f7;
  border: 2px solid #a5c5e5;
  border-radius: 10px;
  margin: 0 3px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #3a6b99;
  text-align: center;
  font-size: 12px;
}

.location-button:active {
  background-color: #c0d8ee;
  transform: translateY(-2px);
}

.location-button > i {
  font-size: 22px;
  margin-bottom: 4px;
  color: #5d91c3;
  z-index: 1;
}

.location-button > span {
  z-index: 1;
}

.school-button {
  background-color: #b8d8f0;
  border-color: #7baad8;
}

.empty-location {
  background-color: #eaf4fc;
  border: 2px dashed #c0d8ee;
  color: #a5c5e5;
  cursor: default;
}

.empty-location i {
  color: #c0d8ee;
}

/* 人物标注容器 */
.character-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* 人物标注 - 倒水滴形 */
.character-marker {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  pointer-events: auto;
  z-index: 5;
  transform: translateX(-50%);
  transition: transform 0.2s ease;
}

.character-marker:active {
  transform: translateX(-50%) scale(1.15);
}

/* 头像 */
.character-marker img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #3a6b99;
  object-fit: cover;
  background-color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* 水滴形标注尖端 */
.marker-pin {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid #3a6b99;
  margin-top: -2px;
}

/* 背景遮罩 */
.backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 50;
}

/* 地点弹窗 */
.location-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 85%;
  max-width: 280px;
  max-height: 80%;
  overflow-y: auto;
  background-color: #f0f8ff;
  border-radius: 15px;
  padding: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  z-index: 100;
  border: 2px solid #a5c5e5;
}

.location-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #d6e8f7;
}

.location-popup-title {
  color: #3a6b99;
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.location-popup-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.location-popup-goto-btn {
  background-color: #5d91c3;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  gap: 4px;
}

.location-popup-goto-btn:active {
  background-color: #3a6b99;
}

.location-popup-close {
  width: 26px;
  height: 26px;
  background-color: #a5c5e5;
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.location-popup-close:active {
  background-color: #3a6b99;
}

.location-popup-section {
  margin-bottom: 12px;
}

.location-popup-section-title {
  color: #3a6b99;
  font-size: 15px;
  font-weight: bold;
  margin: 0 0 5px 0;
}

.location-popup-content {
  color: #4a5568;
  font-size: 14px;
  line-height: 1.4;
  background-color: #f5f9fc;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #d6e8f7;
  margin: 0;
}

.location-popup-characters-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #f5f9fc;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d6e8f7;
}

.location-popup-characters-group {
  margin-bottom: 8px;
}

.location-popup-characters-group:last-child {
  margin-bottom: 0;
}

.location-popup-characters-label {
  font-size: 13px;
  color: #5d91c3;
  margin-bottom: 4px;
  font-weight: 600;
}

.location-popup-characters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background-color: #f5f9fc;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #e6f0fa;
  min-height: 40px;
}

.location-popup-characters.other-characters {
  background-color: #f9fbfd;
  border-color: #e6f0fa;
}

.location-character {
  display: flex;
  align-items: center;
  background-color: #e6f0fa;
  padding: 5px 8px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: #3a6b99;
}

.location-character:active {
  background-color: #d6e8f7;
}

.location-character img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 5px;
  object-fit: cover;
}

.location-popup-empty-message {
  color: #8491a0;
  font-style: italic;
  font-size: 13px;
  text-align: center;
  padding: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.location-popup-empty-message.normal {
  font-style: normal;
  text-align: left;
  justify-content: flex-start;
}

.location-popup-empty-message i {
  color: #a5c5e5;
}

/* 人物详情弹窗 */
.character-detail-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 85%;
  max-width: 280px;
  background-color: #f0f8ff;
  border-radius: 15px;
  padding: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  z-index: 110;
  border: 2px solid #a5c5e5;
}

.character-detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.character-detail-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-right: 15px;
  object-fit: cover;
  border: 2px solid #a5c5e5;
}

.character-detail-info {
  flex-grow: 1;
}

.character-detail-name {
  font-size: 18px;
  font-weight: bold;
  color: #3a6b99;
  margin-bottom: 5px;
}

.character-detail-location {
  font-size: 14px;
  color: #5d91c3;
  display: flex;
  align-items: center;
}

.character-detail-location i {
  margin-right: 5px;
  font-size: 12px;
}

.character-detail-close {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 26px;
  height: 26px;
  background-color: #a5c5e5;
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.character-detail-close:active {
  background-color: #3a6b99;
}

.character-detail-status {
  margin-top: 15px;
  padding: 10px;
  background-color: #e6f0fa;
  border-radius: 10px;
  color: #6c7a89;
  font-size: 14px;
  line-height: 1.5;
}

.character-detail-actions {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}

.character-detail-message-btn {
  background-color: #5d91c3;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.character-detail-message-btn:active {
  background-color: #3a6b99;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.popup-enter-active,
.popup-leave-active {
  transition: all 0.3s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* slide-down 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* 加载状态遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(234, 244, 252, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #3a6b99;
}

.loading-spinner i {
  font-size: 32px;
}

.loading-spinner span {
  font-size: 14px;
  font-weight: 500;
}

/* 终止按钮 */
.abort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 20px;
  border: none;
  background: rgba(143, 184, 237, 0.9);
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.abort-btn:active {
  transform: scale(0.95);
  background: rgba(120, 160, 210, 0.95);
}

.abort-btn i {
  font-size: 12px;
  color: #fff;
}

.abort-btn span {
  color: #fff;
}

/* 错误提示 */
.error-toast {
  position: absolute;
  top: 55px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 150;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  cursor: pointer;
  max-width: 80%;
}

.error-toast i {
  color: #ef4444;
  font-size: 16px;
}

.error-toast span {
  color: #dc2626;
  font-size: 13px;
  flex: 1;
}

.error-close {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-close:active {
  opacity: 0.7;
}
</style>
