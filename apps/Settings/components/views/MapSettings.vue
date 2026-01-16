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
      <span class="nav-title">地图数据</span>
      <button class="nav-btn" @click="addDistrict">
        <i class="fas fa-plus"></i>
      </button>
    </div>

    <div class="detail-content" v-if="editableData">
      <div class="map-overview">
        <input
          v-model="editableData.map.name"
          class="editable-input"
          style="text-align: center; font-size: 18px; font-weight: 600; max-width: 200px;"
          placeholder="地图名称"
        />
        <div class="map-stats">共 {{ editableData.map.districts.length }} 个地区</div>
      </div>

      <div
        v-for="(district, dIndex) in editableData.map.districts"
        :key="'district-' + dIndex"
        class="district-card"
      >
        <div class="district-header">
          <div
            class="district-icon icon-selectable"
            @click="$emit('openIconPicker', (icon: string) => { district.icon = icon })"
            title="点击选择图标"
          >
            <i :class="['fas', district.icon]"></i>
          </div>
          <input
            v-model="district.name"
            class="editable-input district-name-input"
            placeholder="地区名称"
          />
          <div class="move-btns">
            <button class="move-btn" @click="moveDistrict(dIndex, 'up')" :disabled="dIndex === 0" title="上移">
              <i class="fas fa-chevron-up"></i>
            </button>
            <button class="move-btn" @click="moveDistrict(dIndex, 'down')" :disabled="dIndex === editableData.map.districts.length - 1" title="下移">
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
          <button class="block-action-btn delete" @click="deleteDistrict(dIndex)" title="删除地区">
            <i class="fas fa-trash"></i>
          </button>
        </div>

        <!-- 子地点列表 -->
        <div class="sub-locations" v-if="district.subLocations">
          <div
            v-for="(sub, sIndex) in district.subLocations"
            :key="'sub-' + sIndex"
            class="sub-location-item"
          >
            <i
              :class="['fas', sub.icon, 'sub-icon', 'icon-selectable']"
              @click="$emit('openIconPicker', (icon: string) => { sub.icon = icon })"
              title="点击选择图标"
            ></i>
            <input
              v-model="sub.name"
              class="editable-input sub-name-input"
              placeholder="子地点名称"
            />
            <div class="move-btns move-btns-sub">
              <button class="move-btn move-btn-sub" @click="moveSubLocation(dIndex, sIndex, 'up')" :disabled="sIndex === 0" title="上移">
                <i class="fas fa-chevron-up"></i>
              </button>
              <button class="move-btn move-btn-sub" @click="moveSubLocation(dIndex, sIndex, 'down')" :disabled="sIndex === district.subLocations.length - 1" title="下移">
                <i class="fas fa-chevron-down"></i>
              </button>
            </div>
            <button class="block-action-btn delete" @click="deleteSubLocation(dIndex, sIndex)" title="删除子地点">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <!-- 添加子地点按钮 -->
          <button
            v-if="district.subLocations.length < 9"
            class="add-sub-btn"
            @click="addSubLocation(dIndex)"
          >
            <i class="fas fa-plus"></i>
            <span>添加子地点</span>
          </button>
          <div v-else class="limit-hint">
            <i class="fas fa-info-circle"></i>
            <span>子地点已达上限(9个)</span>
          </div>
        </div>
        <div v-else class="sub-locations">
          <button class="add-sub-btn" @click="initSubLocations(dIndex)">
            <i class="fas fa-plus"></i>
            <span>添加子地点</span>
          </button>
        </div>
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
  (e: 'openIconPicker', callback: (icon: string) => void): void;
}>();

// 地区操作
const addDistrict = () => {
  if (!props.editableData) return;
  // 检查上限
  if (props.editableData.map.districts.length >= 9) {
    alert('地区数量已达上限(9个)');
    return;
  }
  const existingPositions = props.editableData.map.districts.map(d => d.position);
  let newPosition = 1;
  for (let i = 1; i <= 9; i++) {
    if (!existingPositions.includes(i)) {
      newPosition = i;
      break;
    }
  }
  props.editableData.map.districts.push({
    position: newPosition,
    name: '新地区',
    icon: 'fa-map-marker-alt',
    subLocations: [],
  });
};

const deleteDistrict = (index: number) => {
  if (!props.editableData) return;
  if (!confirm('确定要删除这个地区吗？')) return;
  props.editableData.map.districts.splice(index, 1);
};

const moveDistrict = (index: number, direction: 'up' | 'down') => {
  if (!props.editableData) return;
  const arr = props.editableData.map.districts;
  const newIdx = direction === 'up' ? index - 1 : index + 1;
  if (newIdx < 0 || newIdx >= arr.length) return;
  const temp = arr[index];
  arr.splice(index, 1);
  arr.splice(newIdx, 0, temp);
};

// 子地点操作
const addSubLocation = (districtIndex: number) => {
  if (!props.editableData) return;
  const district = props.editableData.map.districts[districtIndex];
  if (!district.subLocations) {
    district.subLocations = [];
  }
  // 检查上限
  if (district.subLocations.length >= 9) {
    alert('子地点数量已达上限(9个)');
    return;
  }
  const existingPositions = district.subLocations.map(s => s.position);
  let newPosition = 1;
  for (let i = 1; i <= 9; i++) {
    if (!existingPositions.includes(i)) {
      newPosition = i;
      break;
    }
  }
  district.subLocations.push({
    position: newPosition,
    name: '新地点',
    icon: 'fa-location-dot',
  });
};

const deleteSubLocation = (districtIndex: number, subIndex: number) => {
  if (!props.editableData) return;
  props.editableData.map.districts[districtIndex].subLocations.splice(subIndex, 1);
};

const initSubLocations = (districtIndex: number) => {
  if (!props.editableData) return;
  props.editableData.map.districts[districtIndex].subLocations = [];
  addSubLocation(districtIndex);
};

const moveSubLocation = (districtIndex: number, subIndex: number, direction: 'up' | 'down') => {
  if (!props.editableData) return;
  const arr = props.editableData.map.districts[districtIndex].subLocations;
  if (!arr) return;
  const newIdx = direction === 'up' ? subIndex - 1 : subIndex + 1;
  if (newIdx < 0 || newIdx >= arr.length) return;
  const temp = arr[subIndex];
  arr.splice(subIndex, 1);
  arr.splice(newIdx, 0, temp);
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

/* 地图概览 */
.map-overview {
  text-align: center;
  margin-bottom: 20px;
}

.map-stats {
  color: #94a3b8;
  font-size: 12px;
  margin-top: 4px;
}

/* 可编辑输入框样式 - MistyGlass风格 */
.editable-input {
  width: 100%;
  padding: 8px 12px !important;
  font-size: 14px !important;
  color: #475569 !important;
  background-color: rgba(255, 255, 255, 0.7) !important;
  border: none !important;
  border-radius: 10px !important;
  outline: none !important;
  box-sizing: border-box;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  box-shadow: inset 0 1px 2px rgba(143, 184, 237, 0.1) !important;

  &:focus {
    background-color: rgba(255, 255, 255, 0.9) !important;
    box-shadow: 0 0 0 2px rgba(143, 184, 237, 0.3), inset 0 1px 2px rgba(143, 184, 237, 0.1) !important;
  }
}

/* 地区卡片 */
.district-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
  margin-bottom: 12px;
}

.district-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.1);
}

.district-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8fb8ed, #7aa8e0);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.icon-selectable {
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

.district-name-input {
  flex: 1;
  font-weight: 600;
  font-size: 15px !important;
}

/* 移动按钮 */
.move-btns {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.move-btns-sub {
  flex-direction: row;
  gap: 4px;
}

.move-btn-sub {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

/* 删除按钮 */
.block-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;

  &.delete {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;

    &:active {
      background: rgba(239, 68, 68, 0.2);
    }
  }
}

/* 子地点 */
.sub-locations {
  padding: 12px 16px;
}

.sub-location-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(143, 184, 237, 0.05);
  border-radius: 10px;
  margin-bottom: 8px;
}

.sub-icon {
  font-size: 14px;
  color: #8fb8ed;
}

.sub-name-input {
  flex: 1;
  padding: 6px 10px !important;
  font-size: 13px !important;
}

/* 添加子地点按钮 */
.add-sub-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: rgba(143, 184, 237, 0.1);
  border: 2px dashed rgba(143, 184, 237, 0.3);
  border-radius: 10px;
  color: #8fb8ed;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    background: rgba(143, 184, 237, 0.2);
  }
}

/* 限制提示 */
.limit-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  color: #94a3b8;
  font-size: 12px;
}
</style>
