<template>
  <div class="sticker-library">
    <!-- 导航栏 -->
    <div class="nav-bar">
      <div class="nav-left">
        <button class="nav-back" @click="$emit('back')">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="nav-save" @click="saveStickers" title="保存">
          <i class="fas fa-save"></i>
        </button>
      </div>
      <span class="nav-title">表情包库</span>
      <div class="nav-actions">
        <button class="nav-btn" @click="showBatchImportDialog = true" title="批量添加">
          <i class="fas fa-plus"></i>
        </button>
        <button class="nav-btn" @click="triggerFileImport" title="导入">
          <i class="fas fa-file-import"></i>
        </button>
        <button class="nav-btn" @click="handleExport" title="导出">
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
    <div v-if="duplicateNames.length > 0" class="duplicate-warning">
      <i class="fas fa-exclamation-triangle"></i>
      <span>发现重名表情包：{{ duplicateNames.join('、') }}</span>
    </div>

    <!-- 表情包网格 -->
    <div class="sticker-content">
      <div class="sticker-grid">
        <!-- 添加按钮 -->
        <div class="sticker-item add-item" @click="showAddDialog = true">
          <div class="add-icon">
            <i class="fas fa-plus"></i>
          </div>
          <span class="add-text">添加</span>
        </div>

        <!-- 表情包列表 -->
        <div
          v-for="(sticker, index) in stickers"
          :key="index"
          class="sticker-item"
          @click="openEditDialog(index)"
        >
          <div class="sticker-image">
            <img :src="sticker.url" :alt="sticker.name" @error="handleImageError" />
          </div>
          <div class="sticker-name">{{ sticker.name }}</div>
        </div>
      </div>

      <!-- 底部恢复默认按钮 -->
      <div class="bottom-actions">
        <button class="btn-restore-default" @click="useDefaultStickers">
          <i class="fas fa-undo"></i>
          恢复默认表情包
        </button>
      </div>
    </div>

    <!-- 添加表情包对话框 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="showAddDialog = false">
      <div class="dialog-box">
        <div class="dialog-header">
          <span>添加表情包</span>
          <button class="dialog-close" @click="showAddDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>图片URL</label>
            <input
              v-model="newSticker.url"
              type="text"
              placeholder="输入表情包图片链接"
              @input="previewNewSticker"
            />
          </div>
          <div v-if="newSticker.url" class="preview-box">
            <img :src="newSticker.url" alt="预览" @error="previewError = true" @load="previewError = false" />
            <span v-if="previewError" class="preview-error">图片加载失败</span>
          </div>
          <div class="form-group">
            <label>名称</label>
            <input v-model="newSticker.name" type="text" placeholder="输入表情包名称" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="showAddDialog = false">取消</button>
          <button class="btn-confirm" @click="addSticker" :disabled="!newSticker.url || !newSticker.name">
            添加
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑表情包对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click.self="showEditDialog = false">
      <div class="dialog-box">
        <div class="dialog-header">
          <span>编辑表情包</span>
          <button class="dialog-close" @click="showEditDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="preview-box large">
            <img :src="editSticker.url" alt="预览" />
          </div>
          <div class="form-group">
            <label>名称</label>
            <input v-model="editSticker.name" type="text" placeholder="输入表情包名称" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-delete" @click="deleteSticker">
            <i class="fas fa-trash"></i> 删除
          </button>
          <button class="btn-confirm" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 批量导入对话框 -->
    <div v-if="showBatchImportDialog" class="dialog-overlay" @click.self="showBatchImportDialog = false">
      <div class="dialog-box">
        <div class="dialog-header">
          <span>批量添加表情包</span>
          <button class="dialog-close" @click="showBatchImportDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>每行格式：链接 名称</label>
            <textarea
              v-model="batchImportText"
              placeholder="https://example.com/sticker1.gif 开心&#10;https://example.com/sticker2.gif 难过"
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
import { ref, onMounted } from 'vue';
import _ from 'lodash';
import defaultStickersJson from '../../数据/表情包.json';

defineEmits(['back']);

interface Sticker {
  url: string;
  name: string;
}

const VARIABLE_KEY = 'phone_sticker_library';
const INJECT_SETTING_KEY = 'phone_sticker_inject_enabled';

const stickers = ref<Sticker[]>([]);
const injectEnabled = ref(true); // 默认开启注入
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showBatchImportDialog = ref(false);
const editIndex = ref(-1);
const previewError = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const newSticker = ref<Sticker>({ url: '', name: '' });
const editSticker = ref<Sticker>({ url: '', name: '' });
const batchImportText = ref('');

// 检测重名的表情包
const duplicateNames = computed(() => {
  const nameCount = new Map<string, number>();
  for (const sticker of stickers.value) {
    const count = nameCount.get(sticker.name) || 0;
    nameCount.set(sticker.name, count + 1);
  }
  return Array.from(nameCount.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
});

// 从角色变量加载表情包库
function loadStickers() {
  try {
    const charVars = getVariables({ type: 'character' });
    const saved = _.get(charVars, VARIABLE_KEY) as Sticker[] | undefined;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      stickers.value = saved;
    } else {
      // 没有保存的数据时使用默认表情包
      stickers.value = [...defaultStickersJson] as Sticker[];
      saveStickers();
    }
  } catch (e) {
    console.error('加载表情包库失败:', e);
    stickers.value = [...defaultStickersJson] as Sticker[];
  }
}

// 保存表情包库到角色变量
function saveStickers() {
  try {
    insertOrAssignVariables({ [VARIABLE_KEY]: stickers.value }, { type: 'character' });
  } catch (e) {
    console.error('保存表情包库失败:', e);
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

// 使用默认表情包库
function useDefaultStickers() {
  if (!confirm('确定要恢复默认表情包库吗？当前表情包将被替换。')) return;
  stickers.value = [...defaultStickersJson] as Sticker[];
  saveStickers();
  alert('已恢复默认表情包库');
}

// 预览新表情包
function previewNewSticker() {
  previewError.value = false;
}

// 图片加载错误处理
function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
}

// 添加表情包
function addSticker() {
  if (!newSticker.value.url || !newSticker.value.name) return;
  stickers.value.unshift({ ...newSticker.value });
  saveStickers();
  newSticker.value = { url: '', name: '' };
  showAddDialog.value = false;
}

// 批量导入表情包
function handleBatchImport() {
  if (!batchImportText.value.trim()) return;

  const lines = batchImportText.value.trim().split('\n');
  const newStickers: Sticker[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 找到第一个空格的位置，分割链接和名称
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex === -1) continue;

    const url = trimmed.substring(0, spaceIndex).trim();
    const name = trimmed.substring(spaceIndex + 1).trim();

    if (url && name) {
      newStickers.push({ url, name });
    }
  }

  if (newStickers.length === 0) {
    alert('没有有效的表情包数据');
    return;
  }

  // 将新表情包添加到列表前面
  stickers.value = [...newStickers, ...stickers.value];
  saveStickers();

  batchImportText.value = '';
  showBatchImportDialog.value = false;
  alert(`成功导入 ${newStickers.length} 个表情包`);
}

// 打开编辑对话框
function openEditDialog(index: number) {
  editIndex.value = index;
  editSticker.value = { ...stickers.value[index] };
  showEditDialog.value = true;
}

// 保存编辑
function saveEdit() {
  if (editIndex.value >= 0 && editSticker.value.name) {
    stickers.value[editIndex.value] = { ...editSticker.value };
    saveStickers();
  }
  showEditDialog.value = false;
}

// 删除表情包
function deleteSticker() {
  if (editIndex.value >= 0) {
    stickers.value.splice(editIndex.value, 1);
    saveStickers();
  }
  showEditDialog.value = false;
}

// 导出
function handleExport() {
  const data = JSON.stringify(stickers.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sticker_library.json';
  a.click();
  URL.revokeObjectURL(url);
}

// 触发文件选择
function triggerFileImport() {
  fileInput.value?.click();
}

// 处理文件选择（替换模式）
function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      if (Array.isArray(data)) {
        const valid = data.filter(item => item.url && item.name);
        stickers.value = valid;
        saveStickers();
        alert(`成功导入 ${valid.length} 个表情包（已替换原有数据）`);
      }
    } catch (err) {
      alert('JSON 文件格式错误');
    }
  };
  reader.readAsText(file);
  // 重置 input 以便可以再次选择同一文件
  input.value = '';
}

onMounted(() => {
  loadStickers();
  loadInjectSetting();
});
</script>

<style scoped lang="scss">
/* MistyGlass 风格 */
.sticker-library {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #e8f4fd 0%, #f0f7fc 100%);
  overflow: hidden;
}

.duplicate-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff0f0;
  border-bottom: 1px solid #ffcdd2;
  color: #c62828;
  font-size: 13px;
  flex-shrink: 0;

  i {
    color: #e53935;
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

.sticker-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sticker-item {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.15);
  min-width: 0; /* 防止内容撑开网格列 */
  overflow: hidden; /* 确保内容不溢出 */

  &:active {
    transform: scale(0.98);
  }
}

.add-item {
  border: 2px dashed rgba(143, 184, 237, 0.3);
  background: rgba(143, 184, 237, 0.05);
  min-height: 100px;
  justify-content: center;
  box-shadow: none;

  &:active {
    background: rgba(143, 184, 237, 0.1);
  }
}

.add-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(143, 184, 237, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8fb8ed;
  font-size: 16px;
}

.add-text {
  margin-top: 6px;
  font-size: 12px;
  color: #8fb8ed;
}

.sticker-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(143, 184, 237, 0.1);
}

.sticker-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sticker-name {
  margin-top: 6px;
  font-size: 11px;
  color: #64748b;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* 对话框 - 相对于手机容器居中 */
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
  padding: 16px;
}

.dialog-box {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 320px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  color: #475569;
}

.dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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
  color: #64748b;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #8fb8ed;
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
  object-fit: cover;
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
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #8fb8ed;
  color: #fff;
}

.btn-confirm:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-delete {
  background: #FEE2E2;
  color: #EF4444;
  flex: 0 0 auto;
  padding: 12px 16px;
}

/* 底部操作区域 */
.bottom-actions {
  padding: 16px;
  padding-bottom: 24px;
}

.btn-restore-default {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  background: rgba(143, 184, 237, 0.15);
  color: #8fb8ed;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    background: rgba(143, 184, 237, 0.25);
  }
}

/* textarea 样式 */
.form-group textarea {
  width: 100%;
  padding: 10px 12px !important;
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  color: #333 !important;
  background-color: #fff !important;
  box-sizing: border-box;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.5;
}

.form-group textarea:focus {
  outline: none !important;
  border-color: #8fb8ed !important;
}

/* 导入提示 */
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
</style>
