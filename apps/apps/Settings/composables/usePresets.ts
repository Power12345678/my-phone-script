import { ref, computed } from 'vue';
import type { PresetConfig, PromptBlock, FormatGuideData } from '../types';
import defaultPresetData from '../../../数据/默认预设.json';

const STORAGE_KEY = 'phone_presets';

// 默认的固定提示词块
const getDefaultBlocks = (): PromptBlock[] => [
  {
    id: 'worldbook-before',
    name: '前置世界书',
    role: 'system',
    content: '',
    fixed: true,
    placeholder: '此处将自动填充前置世界书内容',
  },
  {
    id: 'history',
    name: '对话历史',
    role: 'system',
    content: '',
    fixed: true,
    placeholder: '此处将自动填充对话历史',
  },
  {
    id: 'worldbook-after',
    name: '后置世界书',
    role: 'system',
    content: '',
    fixed: true,
    placeholder: '此处将自动填充后置世界书内容',
  },
  {
    id: 'character',
    name: '角色指导',
    role: 'system',
    content: '',
    fixed: true,
    placeholder: '此处将自动填充角色指导内容',
  },
  {
    id: 'format',
    name: '格式指导',
    role: 'system',
    content: '',
    fixed: true,
    placeholder: '此处将自动填充格式指导内容',
  },
  {
    id: 'input',
    name: '用户输入',
    role: 'user',
    content: '',
    fixed: true,
    placeholder: '此处将自动填充用户输入',
  },
];

// ========== 模块级别共享状态 ==========
// 将状态提升到模块级别，确保所有组件共享同一份状态
const presetList = ref<PresetConfig[]>([]);
const activePresetId = ref<string | null>(null);
const presetBlocks = ref<PromptBlock[]>(getDefaultBlocks());
const showPresetDropdown = ref(false);
const presetNameInput = ref('');
const showPresetNameModal = ref(false);
const presetModalMode = ref<'create' | 'rename'>('create');

export function usePresets() {
  // 当前激活的预设
  const activePreset = computed(() => {
    if (!activePresetId.value) return null;
    return presetList.value.find(p => p.id === activePresetId.value) || null;
  });

  // 拖拽状态
  const dragState = ref({
    draggingIndex: -1,
    dragOverIndex: -1,
    touchStartY: 0,
    touchCurrentY: 0,
    isTouchDragging: false,
  });

  // 预设管理方法
  const savePresetsToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      presets: presetList.value,
      activePresetId: activePresetId.value,
    }));
  };

  const loadPresetsFromStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        presetList.value = data.presets || [];
        activePresetId.value = data.activePresetId || null;
        // 如果有激活的预设，加载它的 blocks
        if (activePresetId.value) {
          const preset = presetList.value.find(p => p.id === activePresetId.value);
          if (preset) {
            presetBlocks.value = JSON.parse(JSON.stringify(preset.blocks));
          }
        }
      } catch {
        presetList.value = [];
        activePresetId.value = null;
      }
    }
  };

  // 切换预设下拉框
  const togglePresetDropdown = () => {
    showPresetDropdown.value = !showPresetDropdown.value;
  };

  // 选择预设
  const selectPreset = (preset: PresetConfig, onFormatGuideLoad?: (formatGuide: FormatGuideData) => void) => {
    activePresetId.value = preset.id;
    presetBlocks.value = JSON.parse(JSON.stringify(preset.blocks));
    showPresetDropdown.value = false;
    savePresetsToStorage();
    // 加载格式指导数据
    if (preset.formatGuide && onFormatGuideLoad) {
      onFormatGuideLoad(preset.formatGuide);
    }
  };

  // 打开新建预设弹窗
  const openCreatePresetModal = () => {
    presetNameInput.value = '';
    presetModalMode.value = 'create';
    showPresetNameModal.value = true;
  };

  // 打开重命名预设弹窗
  const openRenamePresetModal = () => {
    if (!activePreset.value) return;
    presetNameInput.value = activePreset.value.name;
    presetModalMode.value = 'rename';
    showPresetNameModal.value = true;
  };

  // 确认预设名称（新建或重命名）
  const handlePresetNameConfirm = (name: string) => {
    if (presetModalMode.value === 'create') {
      // 创建新预设
      const newPreset: PresetConfig = {
        id: `preset_${Date.now()}`,
        name,
        blocks: JSON.parse(JSON.stringify(presetBlocks.value)),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      presetList.value.push(newPreset);
      activePresetId.value = newPreset.id;
    } else {
      // 重命名预设
      const preset = presetList.value.find(p => p.id === activePresetId.value);
      if (preset) {
        preset.name = name;
        preset.updatedAt = Date.now();
      }
    }

    savePresetsToStorage();
  };

  // 更新当前预设
  const updateCurrentPreset = () => {
    if (!activePresetId.value) {
      // 如果没有选中预设，提示创建新预设
      openCreatePresetModal();
      return;
    }

    const preset = presetList.value.find(p => p.id === activePresetId.value);
    if (preset) {
      preset.blocks = JSON.parse(JSON.stringify(presetBlocks.value));
      preset.updatedAt = Date.now();
      savePresetsToStorage();
      alert('预设已更新');
    }
  };

  // 删除当前预设
  const deleteCurrentPreset = () => {
    if (!activePresetId.value) {
      alert('请先选择一个预设');
      return;
    }

    if (!confirm('确定要删除当前预设吗？')) {
      return;
    }

    const index = presetList.value.findIndex(p => p.id === activePresetId.value);
    if (index !== -1) {
      presetList.value.splice(index, 1);
      activePresetId.value = null;
      presetBlocks.value = getDefaultBlocks();
      savePresetsToStorage();
    }
  };

  // 重置为默认（使用默认预设文件）
  const resetToDefault = () => {
    // 从默认预设文件加载 blocks
    presetBlocks.value = JSON.parse(JSON.stringify(defaultPresetData.blocks)) as PromptBlock[];
    activePresetId.value = null;
    showPresetDropdown.value = false;
    savePresetsToStorage();
  };

  // 获取默认预设的格式指导
  const getDefaultFormatGuide = (): FormatGuideData | undefined => {
    return defaultPresetData.formatGuide as FormatGuideData | undefined;
  };

  // 导出预设
  const exportPreset = () => {
    if (!activePreset.value) {
      alert('请先选择一个预设');
      return;
    }

    const exportData = {
      name: activePreset.value.name,
      blocks: activePreset.value.blocks,
      formatGuide: activePreset.value.formatGuide,
      historyConfig: activePreset.value.historyConfig,
      exportedAt: Date.now(),
      version: '1.1',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preset_${activePreset.value.name}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入预设
  const importPreset = (onSuccess?: () => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.blocks || !Array.isArray(data.blocks)) {
          throw new Error('无效的预设文件格式');
        }

        // 创建新预设
        const newPreset: PresetConfig = {
          id: `preset_${Date.now()}`,
          name: data.name || `导入的预设 ${new Date().toLocaleDateString()}`,
          blocks: data.blocks,
          formatGuide: data.formatGuide,
          historyConfig: data.historyConfig,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        presetList.value.push(newPreset);
        activePresetId.value = newPreset.id;
        presetBlocks.value = JSON.parse(JSON.stringify(newPreset.blocks));
        savePresetsToStorage();

        if (onSuccess) {
          onSuccess();
        }

        alert(`成功导入预设: ${newPreset.name}`);
      } catch (error) {
        console.error('导入预设失败:', error);
        alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    };
    input.click();
  };

  // 提示词块操作
  const addPromptBlock = () => {
    const newBlock: PromptBlock = {
      id: `custom_${Date.now()}`,
      name: '新提示词',
      role: 'system',
      content: '',
      fixed: false,
    };
    presetBlocks.value.push(newBlock);
  };

  const deleteBlock = (index: number) => {
    if (!presetBlocks.value[index].fixed) {
      presetBlocks.value.splice(index, 1);
    }
  };

  const moveBlock = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < presetBlocks.value.length) {
      const blocks = presetBlocks.value;
      [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
    }
  };

  // 鼠标拖拽事件
  const handleDragStart = (e: DragEvent, index: number) => {
    dragState.value.draggingIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  };

  const handleDragEnd = () => {
    dragState.value.draggingIndex = -1;
    dragState.value.dragOverIndex = -1;
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (dragState.value.draggingIndex !== index) {
      dragState.value.dragOverIndex = index;
    }
  };

  const handleDragLeave = () => {
    // dragOverIndex 会在 dragEnter 时更新
  };

  const handleDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = dragState.value.draggingIndex;
    if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
      const blocks = presetBlocks.value;
      const [movedBlock] = blocks.splice(sourceIndex, 1);
      blocks.splice(targetIndex, 0, movedBlock);
    }
    dragState.value.draggingIndex = -1;
    dragState.value.dragOverIndex = -1;
  };

  // 触摸拖拽事件
  let touchDragElement: HTMLElement | null = null;
  let touchDragClone: HTMLElement | null = null;
  let touchDragSourceIndex = -1;

  const handleTouchStart = (e: TouchEvent, index: number) => {
    const target = e.currentTarget as HTMLElement;
    const touch = e.touches[0];

    // 检查是否点击在拖动手柄上
    const dragHandle = target.querySelector('.block-drag');
    if (dragHandle) {
      const rect = dragHandle.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        e.preventDefault();
        touchDragSourceIndex = index;
        dragState.value.draggingIndex = index;
        dragState.value.touchStartY = touch.clientY;
        dragState.value.isTouchDragging = true;
        touchDragElement = target;

        // 创建拖拽克隆元素
        touchDragClone = target.cloneNode(true) as HTMLElement;
        touchDragClone.style.position = 'fixed';
        touchDragClone.style.left = `${target.getBoundingClientRect().left}px`;
        touchDragClone.style.top = `${touch.clientY - 30}px`;
        touchDragClone.style.width = `${target.offsetWidth}px`;
        touchDragClone.style.opacity = '0.8';
        touchDragClone.style.zIndex = '9999';
        touchDragClone.style.pointerEvents = 'none';
        touchDragClone.style.transform = 'scale(1.02)';
        touchDragClone.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
        document.body.appendChild(touchDragClone);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!dragState.value.isTouchDragging || !touchDragClone) return;

    e.preventDefault();
    const touch = e.touches[0];
    dragState.value.touchCurrentY = touch.clientY;

    // 更新克隆元素位置
    touchDragClone.style.top = `${touch.clientY - 30}px`;

    // 找到当前悬停的目标元素
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const targetBlock = elements.find(el => el.classList.contains('preset-block') && el !== touchDragClone);

    if (targetBlock) {
      const blocks = document.querySelectorAll('.preset-block');
      const targetIndex = Array.from(blocks).indexOf(targetBlock as Element);
      if (targetIndex !== -1 && targetIndex !== touchDragSourceIndex) {
        dragState.value.dragOverIndex = targetIndex;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!dragState.value.isTouchDragging) return;

    const sourceIndex = touchDragSourceIndex;
    const targetIndex = dragState.value.dragOverIndex;

    if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
      const blocks = presetBlocks.value;
      const [movedBlock] = blocks.splice(sourceIndex, 1);
      blocks.splice(targetIndex, 0, movedBlock);
    }

    // 清理
    if (touchDragClone && touchDragClone.parentNode) {
      touchDragClone.parentNode.removeChild(touchDragClone);
    }
    touchDragClone = null;
    touchDragElement = null;
    touchDragSourceIndex = -1;
    dragState.value.draggingIndex = -1;
    dragState.value.dragOverIndex = -1;
    dragState.value.isTouchDragging = false;
  };

  // 角色相关辅助函数
  const getRoleClass = (role: string) => {
    return {
      'role-system': role === 'system',
      'role-assistant': role === 'assistant',
      'role-user': role === 'user',
    };
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      system: 'fas fa-cog',
      assistant: 'fas fa-robot',
      user: 'fas fa-user',
    };
    return icons[role] || 'fas fa-comment';
  };

  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      system: '系统',
      assistant: 'AI',
      user: '用户',
    };
    return names[role] || role;
  };

  return {
    // 状态
    presetList,
    activePresetId,
    presetBlocks,
    showPresetDropdown,
    presetNameInput,
    showPresetNameModal,
    presetModalMode,
    activePreset,
    dragState,
    // 预设管理
    savePresetsToStorage,
    loadPresetsFromStorage,
    togglePresetDropdown,
    selectPreset,
    openCreatePresetModal,
    openRenamePresetModal,
    handlePresetNameConfirm,
    updateCurrentPreset,
    deleteCurrentPreset,
    resetToDefault,
    exportPreset,
    importPreset,
    // 提示词块操作
    addPromptBlock,
    deleteBlock,
    moveBlock,
    getDefaultBlocks,
    // 拖拽事件
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    // 触摸拖拽事件
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // 辅助函数
    getRoleClass,
    getRoleIcon,
    getRoleName,
    getDefaultFormatGuide,
  };
}
