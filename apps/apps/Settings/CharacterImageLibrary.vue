<template>
  <div class="image-library">
    <!-- 角色列表视图 -->
    <template v-if="!selectedCharacter">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" @click="$emit('back')">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button class="nav-save" @click="$emit('save')" title="保存">
            <i class="fas fa-save"></i>
          </button>
        </div>
        <span class="nav-title">角色图片库</span>
        <div class="nav-actions">
          <button class="nav-btn" @click="handleImportAll" title="导入全部">
            <i class="fas fa-file-import"></i>
          </button>
          <button class="nav-btn" @click="handleExportAll" title="导出全部">
            <i class="fas fa-file-export"></i>
          </button>
        </div>
      </div>

      <!-- 提示词注入开关 -->
      <div class="inject-toggle">
        <div class="inject-label">
          <i class="fas fa-syringe"></i>
          <span>注入提示词</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="injectEnabled" @change="saveInjectSetting">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- 重名警告 -->
      <div v-if="duplicateInfo.length > 0" class="duplicate-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <span>
          发现重名图片：
          <template v-for="(info, idx) in duplicateInfo" :key="info.character">
            {{ info.character }}({{ info.names.join('、') }})<template v-if="idx < duplicateInfo.length - 1">；</template>
          </template>
        </span>
      </div>

      <!-- 标签页切换 -->
      <div class="tab-bar">
        <button
          :class="['tab-btn', { active: activeTab === 'chat' }]"
          @click="activeTab = 'chat'"
        >
          <i class="fas fa-comment"></i>
          聊天图片
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'live' }]"
          @click="activeTab = 'live'"
        >
          <i class="fas fa-video"></i>
          直播图片
        </button>
      </div>

      <div class="character-list">
        <!-- 通用图片库入口 -->
        <div
          class="character-card common-card"
          @click="selectCharacter('__common__')"
        >
          <div class="char-avatar common-avatar">
            <i class="fas fa-globe"></i>
          </div>
          <div class="char-info">
            <div class="char-name">通用图片库</div>
            <div class="char-count">{{ getImageCount('__common__') }} 张图片</div>
          </div>
          <i class="fas fa-chevron-right char-arrow"></i>
        </div>

        <!-- 角色列表 -->
        <div
          v-for="char in characters"
          :key="char.name"
          class="character-card"
          @click="selectCharacter(char.name)"
        >
          <div class="char-avatar">
            <img :src="char.avatar" :alt="char.name" @error="handleImageError" />
          </div>
          <div class="char-info">
            <div class="char-name">{{ char.name }}</div>
            <div class="char-count">{{ getImageCount(char.name) }} 张图片</div>
          </div>
          <i class="fas fa-chevron-right char-arrow"></i>
        </div>
      </div>
    </template>

    <!-- 角色图片详情视图 -->
    <template v-else>
      <div class="nav-bar">
        <button class="nav-back" @click="selectedCharacter = null">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">{{ selectedCharacter === '__common__' ? '通用' : selectedCharacter }} 的{{ activeTab === 'chat' ? '聊天' : '直播' }}图片</span>
        <div class="nav-actions">
          <button class="nav-btn" @click="showBatchImportDialog = true" title="批量导入">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <div class="image-content">
        <div class="image-grid">
          <!-- 添加按钮 -->
          <div class="image-item add-item" @click="showAddDialog = true">
            <div class="add-icon">
              <i class="fas fa-plus"></i>
            </div>
            <span class="add-text">添加</span>
          </div>

          <!-- 图片列表 -->
          <div
            v-for="(img, index) in currentImages"
            :key="index"
            class="image-item"
            @click="openEditDialog(index)"
          >
            <div class="image-preview">
              <img :src="img.url" :alt="img.name" @error="handleImageError" />
            </div>
            <div class="image-name">{{ img.name }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- 批量导入对话框 -->
    <div v-if="showBatchImportDialog" class="dialog-overlay" @click.self="showBatchImportDialog = false">
      <div class="dialog-box">
        <div class="dialog-header">
          <span>批量导入图片</span>
          <button class="dialog-close" @click="showBatchImportDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>每行格式：链接 图片名</label>
            <textarea
              v-model="batchImportText"
              placeholder="https://example.com/img1.jpg 图片1&#10;https://example.com/img2.jpg 图片2"
              rows="8"
            ></textarea>
          </div>
          <div class="import-hint">
            <i class="fas fa-info-circle"></i>
            <span>每行一条，链接和名称用空格分隔</span>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="showBatchImportDialog = false">取消</button>
          <button class="btn-confirm" @click="handleBatchImport" :disabled="!batchImportText.trim()">
            导入
          </button>
        </div>
      </div>
    </div>

    <!-- 添加图片对话框 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="showAddDialog = false">
      <div class="dialog-box">
        <div class="dialog-header">
          <span>添加图片</span>
          <button class="dialog-close" @click="showAddDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>图片URL</label>
            <input v-model="newImage.url" type="text" placeholder="输入图片链接" />
          </div>
          <div v-if="newImage.url" class="preview-box">
            <img :src="newImage.url" alt="预览" @error="previewError = true" @load="previewError = false" />
            <span v-if="previewError" class="preview-error">图片加载失败</span>
          </div>
          <div class="form-group">
            <label>图片名称</label>
            <input v-model="newImage.name" type="text" placeholder="输入图片名称（用于消息引用）" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="showAddDialog = false">取消</button>
          <button class="btn-confirm" @click="addImage" :disabled="!newImage.url || !newImage.name">
            添加
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑图片对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click.self="showEditDialog = false">
      <div class="dialog-box">
        <div class="dialog-header">
          <span>编辑图片</span>
          <button class="dialog-close" @click="showEditDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="preview-box large">
            <img :src="editImage.url" alt="预览" />
          </div>
          <div class="form-group">
            <label>图片名称</label>
            <input v-model="editImage.name" type="text" placeholder="输入图片名称" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-delete" @click="deleteImage">
            <i class="fas fa-trash"></i> 删除
          </button>
          <button class="btn-confirm" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import _ from 'lodash';

defineEmits(['back', 'save']);

interface CharacterImage {
  url: string;
  name: string;
}

interface CharacterImageData {
  [characterName: string]: CharacterImage[];
}

interface Character {
  name: string;
  avatar: string;
}

const CHAT_IMAGES_KEY = 'phone_character_images';
const LIVE_IMAGES_KEY = 'phone_character_live_images';
const INJECT_SETTING_KEY = 'phone_image_inject_enabled';

const props = defineProps<{
  characters: Character[];
}>();

// 标签页状态
const activeTab = ref<'chat' | 'live'>('chat');

// 注入开关
const injectEnabled = ref(true); // 默认开启注入

// 聊天图片数据
const chatImageData = ref<CharacterImageData>({});
// 直播图片数据
const liveImageData = ref<CharacterImageData>({});

// 当前激活的图片数据（根据标签页）
const imageData = computed({
  get: () => activeTab.value === 'chat' ? chatImageData.value : liveImageData.value,
  set: (val) => {
    if (activeTab.value === 'chat') {
      chatImageData.value = val;
    } else {
      liveImageData.value = val;
    }
  },
});

const selectedCharacter = ref<string | null>(null);
const showAddDialog = ref(false);
const showBatchImportDialog = ref(false);
const showEditDialog = ref(false);
const editIndex = ref(-1);
const previewError = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const newImage = ref<CharacterImage>({ url: '', name: '' });
const batchImportText = ref('');
const editImage = ref<CharacterImage>({ url: '', name: '' });

// 检测跨所有角色的重名图片（分别检查聊天图片和直播图片）
const duplicateInfo = computed(() => {
  const result: Array<{ character: string; names: string[] }> = [];

  // 检查聊天图片库中跨所有角色的重名
  const chatNameCount = new Map<string, number>();
  for (const images of Object.values(chatImageData.value)) {
    if (!Array.isArray(images)) continue;
    for (const img of images) {
      const count = chatNameCount.get(img.name) || 0;
      chatNameCount.set(img.name, count + 1);
    }
  }
  const chatDuplicates = Array.from(chatNameCount.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  if (chatDuplicates.length > 0) {
    result.push({ character: '聊天图片库', names: chatDuplicates });
  }

  // 检查直播图片库中跨所有角色的重名
  const liveNameCount = new Map<string, number>();
  for (const images of Object.values(liveImageData.value)) {
    if (!Array.isArray(images)) continue;
    for (const img of images) {
      const count = liveNameCount.get(img.name) || 0;
      liveNameCount.set(img.name, count + 1);
    }
  }
  const liveDuplicates = Array.from(liveNameCount.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  if (liveDuplicates.length > 0) {
    result.push({ character: '直播图片库', names: liveDuplicates });
  }

  return result;
});

// 当前角色的图片列表
const currentImages = computed(() => {
  if (!selectedCharacter.value) return [];
  return imageData.value[selectedCharacter.value] || [];
});

// 获取角色图片数量
function getImageCount(charName: string): number {
  return (imageData.value[charName] || []).length;
}

// 从角色变量加载图片库
function loadImageData() {
  try {
    const charVars = getVariables({ type: 'character' });
    // 加载聊天图片
    const savedChat = _.get(charVars, CHAT_IMAGES_KEY) as CharacterImageData | undefined;
    if (savedChat && typeof savedChat === 'object') {
      chatImageData.value = savedChat;
    }
    // 加载直播图片
    const savedLive = _.get(charVars, LIVE_IMAGES_KEY) as CharacterImageData | undefined;
    if (savedLive && typeof savedLive === 'object') {
      liveImageData.value = savedLive;
    }
  } catch (e) {
    console.error('加载角色图片库失败:', e);
  }
}

// 保存图片库到角色变量
function saveImageData() {
  try {
    const key = activeTab.value === 'chat' ? CHAT_IMAGES_KEY : LIVE_IMAGES_KEY;
    const data = activeTab.value === 'chat' ? chatImageData.value : liveImageData.value;
    insertOrAssignVariables({ [key]: data }, { type: 'character' });
  } catch (e) {
    console.error('保存角色图片库失败:', e);
  }
}

// 加载注入设置
function loadInjectSetting() {
  try {
    const charVars = getVariables({ type: 'character' });
    const saved = _.get(charVars, INJECT_SETTING_KEY);
    injectEnabled.value = saved !== false; // 默认为 true
  } catch (e) {
    console.error('加载注入设置失败:', e);
  }
}

// 保存注入设置
function saveInjectSetting() {
  try {
    insertOrAssignVariables({ [INJECT_SETTING_KEY]: injectEnabled.value }, { type: 'character' });
  } catch (e) {
    console.error('保存注入设置失败:', e);
  }
}

// 选择角色
function selectCharacter(name: string) {
  selectedCharacter.value = name;
  // 确保该角色有图片数组
  if (!imageData.value[name]) {
    imageData.value[name] = [];
  }
}

// 图片加载错误处理
function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
}

// 添加单个图片
function addImage() {
  if (!newImage.value.url || !newImage.value.name || !selectedCharacter.value) return;

  if (!imageData.value[selectedCharacter.value]) {
    imageData.value[selectedCharacter.value] = [];
  }

  imageData.value[selectedCharacter.value].unshift({ ...newImage.value });
  saveImageData();
  newImage.value = { url: '', name: '' };
  showAddDialog.value = false;
}

// 批量导入图片
function handleBatchImport() {
  if (!batchImportText.value.trim() || !selectedCharacter.value) return;

  const lines = batchImportText.value.trim().split('\n');
  const newImages: CharacterImage[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 找到第一个空格的位置，分割链接和名称
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex === -1) continue;

    const url = trimmed.substring(0, spaceIndex).trim();
    const name = trimmed.substring(spaceIndex + 1).trim();

    if (url && name) {
      newImages.push({ url, name });
    }
  }

  if (newImages.length === 0) {
    alert('没有有效的图片数据');
    return;
  }

  if (!imageData.value[selectedCharacter.value]) {
    imageData.value[selectedCharacter.value] = [];
  }

  // 将新图片添加到列表前面
  imageData.value[selectedCharacter.value] = [...newImages, ...imageData.value[selectedCharacter.value]];
  saveImageData();

  batchImportText.value = '';
  showBatchImportDialog.value = false;
  alert(`成功导入 ${newImages.length} 张图片`);
}

// 打开编辑对话框
function openEditDialog(index: number) {
  if (!selectedCharacter.value) return;
  editIndex.value = index;
  editImage.value = { ...currentImages.value[index] };
  showEditDialog.value = true;
}

// 保存编辑
function saveEdit() {
  if (!selectedCharacter.value || editIndex.value < 0 || !editImage.value.name) return;

  imageData.value[selectedCharacter.value][editIndex.value] = { ...editImage.value };
  saveImageData();
  showEditDialog.value = false;
}

// 删除图片
function deleteImage() {
  if (!selectedCharacter.value || editIndex.value < 0) return;

  imageData.value[selectedCharacter.value].splice(editIndex.value, 1);
  saveImageData();
  showEditDialog.value = false;
}

// 导出全部（聊天图片和直播图片一起导出）
function handleExportAll() {
  const exportData = {
    chat: chatImageData.value,
    live: liveImageData.value,
  };
  const data = JSON.stringify(exportData, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'character_images.json';
  a.click();
  URL.revokeObjectURL(url);
}

// 触发文件选择
function handleImportAll() {
  fileInput.value?.click();
}

// 处理文件选择（聊天图片和直播图片一起导入，替换模式）
function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const rawData = JSON.parse(event.target?.result as string);

      // 检查是否是新格式（包含 chat 和 live 字段）
      if (rawData && typeof rawData === 'object' && ('chat' in rawData || 'live' in rawData)) {
        // 新格式：{ chat: {...}, live: {...} }，替换模式
        let importCount = 0;

        // 导入聊天图片（替换）
        if (rawData.chat && typeof rawData.chat === 'object') {
          const newChatData: CharacterImageData = {};
          for (const [charName, images] of Object.entries(rawData.chat)) {
            if (Array.isArray(images)) {
              const validImages = (images as CharacterImage[]).filter(img => img.url && img.name);
              if (validImages.length > 0) {
                newChatData[charName] = validImages;
                importCount += validImages.length;
              }
            }
          }
          chatImageData.value = newChatData;
        }

        // 导入直播图片（替换）
        if (rawData.live && typeof rawData.live === 'object') {
          const newLiveData: CharacterImageData = {};
          for (const [charName, images] of Object.entries(rawData.live)) {
            if (Array.isArray(images)) {
              const validImages = (images as CharacterImage[]).filter(img => img.url && img.name);
              if (validImages.length > 0) {
                newLiveData[charName] = validImages;
                importCount += validImages.length;
              }
            }
          }
          liveImageData.value = newLiveData;
        }

        // 保存两种数据
        insertOrAssignVariables({ [CHAT_IMAGES_KEY]: chatImageData.value }, { type: 'character' });
        insertOrAssignVariables({ [LIVE_IMAGES_KEY]: liveImageData.value }, { type: 'character' });
        alert(`成功导入 ${importCount} 张图片（已替换原有数据）`);
      } else {
        // 旧格式：直接是角色图片数据，替换当前标签页
        const data = rawData as CharacterImageData;
        if (typeof data === 'object' && data !== null) {
          const newData: CharacterImageData = {};
          let importCount = 0;
          for (const [charName, images] of Object.entries(data)) {
            if (Array.isArray(images)) {
              const validImages = images.filter(img => img.url && img.name);
              if (validImages.length > 0) {
                newData[charName] = validImages;
                importCount += validImages.length;
              }
            }
          }
          imageData.value = newData;
          saveImageData();
          alert(`导入成功（旧格式，已替换当前标签页，共 ${importCount} 张图片）`);
        }
      }
    } catch (err) {
      alert('JSON 文件格式错误');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

onMounted(() => {
  loadImageData();
  loadInjectSetting();
});
</script>

<style scoped lang="scss">
/* MistyGlass 风格 */
.image-library {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #e8f4fd 0%, #f0f7fc 100%);
  overflow: hidden;
}

.duplicate-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 16px;
  background: #fff0f0;
  border-bottom: 1px solid #ffcdd2;
  color: #c62828;
  font-size: 13px;
  flex-shrink: 0;

  i {
    color: #e53935;
    margin-top: 2px;
  }
}

/* 注入开关 */
.inject-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
  flex-shrink: 0;
}

.inject-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;

  i {
    color: #8fb8ed;
  }
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #cbd5e1;
  border-radius: 24px;
  transition: 0.3s;

  &::before {
    content: "";
    position: absolute;
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.3s;
  }
}

.toggle-switch input:checked + .toggle-slider {
  background: #34d399;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
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
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(143, 184, 237, 0.2);
  }
}

/* 标签页切换 */
.tab-bar {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #94A3B8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: #fff;
  font-weight: 500;
}

.tab-btn i {
  font-size: 12px;
}

/* 角色列表 */
.character-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.character-card {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
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
  flex-shrink: 0;
}

.char-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 通用图片库样式 */
.common-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px dashed #7dd3fc;
}

.common-avatar {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.char-info {
  flex: 1;
  margin-left: 12px;
}

.char-name {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
}

.char-count {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 2px;
}

.char-arrow {
  color: #94A3B8;
  font-size: 14px;
}

/* 图片网格 */
.image-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.image-item {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
  /* 固定卡片尺寸 */
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.image-item:active {
  transform: scale(0.98);
}

.add-item {
  border: 2px dashed rgba(143, 184, 237, 0.4);
  background: transparent;
  justify-content: center;
  /* 添加按钮与图片卡片保持相同高度 */
  aspect-ratio: 1;
}

.add-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}

.add-text {
  margin-top: 4px;
  font-size: 11px;
  color: #94A3B8;
}

.image-preview {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
  flex-shrink: 0;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-name {
  margin-top: 4px;
  font-size: 10px;
  color: #475569;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.3;
  height: 13px;
  flex-shrink: 0;
}

/* 对话框 */
.dialog-overlay {
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

.dialog-box {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 320px;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  color: #333;
}

.dialog-close {
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.dialog-body {
  padding: 16px;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px !important;
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  color: #333 !important;
  background-color: #fff !important;
  box-sizing: border-box;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.5;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none !important;
  border-color: #8FB8ED !important;
}

.import-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94A3B8;
  margin-top: 8px;
}

.import-hint i {
  font-size: 14px;
}

.preview-box {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  margin: 12px auto;
  position: relative;
}

.preview-box.large {
  width: 120px;
  height: 120px;
}

.preview-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  color: #999;
}

.btn-cancel,
.btn-confirm,
.btn-delete {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-confirm {
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: #fff;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  background: #FEE2E2;
  color: #EF4444;
  flex: 0 0 auto;
  padding: 10px 16px;
}
</style>
