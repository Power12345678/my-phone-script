<template>
  <div class="autofill-settings">
    <!-- 自动填充管理主页面 -->
    <div v-if="!subView" class="detail-page">
      <div class="nav-bar">
        <button class="nav-back" @click="$emit('back')">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">自动填充管理</span>
        <button class="nav-text-btn" @click="showVariableViewer = true">变量</button>
      </div>

      <div class="detail-content">
        <div class="autofill-grid">
          <div class="autofill-card" @click="subView = 'worldbookPre'">
            <div class="autofill-icon" style="background: linear-gradient(135deg, #8FB8ED, #7AA8E0);">
              <i class="fas fa-book"></i>
            </div>
            <div class="autofill-info">
              <div class="autofill-title">前置世界书</div>
              <div class="autofill-desc">对话前的背景设定</div>
            </div>
            <i class="fas fa-chevron-right autofill-arrow"></i>
          </div>

          <div class="autofill-card" @click="subView = 'history'">
            <div class="autofill-icon" style="background: linear-gradient(135deg, #A8D8B9, #8BC9A0);">
              <i class="fas fa-history"></i>
            </div>
            <div class="autofill-info">
              <div class="autofill-title">对话历史</div>
              <div class="autofill-desc">历史消息记录格式</div>
            </div>
            <i class="fas fa-chevron-right autofill-arrow"></i>
          </div>

          <div class="autofill-card" @click="subView = 'worldbookPost'">
            <div class="autofill-icon" style="background: linear-gradient(135deg, #FFC8DD, #FFB3C6);">
              <i class="fas fa-book-open"></i>
            </div>
            <div class="autofill-info">
              <div class="autofill-title">后置世界书</div>
              <div class="autofill-desc">对话后的补充设定</div>
            </div>
            <i class="fas fa-chevron-right autofill-arrow"></i>
          </div>

          <div class="autofill-card" @click="subView = 'charGuide'">
            <div class="autofill-icon" style="background: linear-gradient(135deg, #FFD699, #FFC266);">
              <i class="fas fa-user-edit"></i>
            </div>
            <div class="autofill-info">
              <div class="autofill-title">人物指导</div>
              <div class="autofill-desc">特定人物的行为指导</div>
            </div>
            <i class="fas fa-chevron-right autofill-arrow"></i>
          </div>

          <div class="autofill-card" @click="subView = 'pageGuide'">
            <div class="autofill-icon" style="background: linear-gradient(135deg, #67E8F9, #22D3EE);">
              <i class="fas fa-mobile-alt"></i>
            </div>
            <div class="autofill-info">
              <div class="autofill-title">页面指导</div>
              <div class="autofill-desc">各页面专属输出指导</div>
            </div>
            <i class="fas fa-chevron-right autofill-arrow"></i>
          </div>

          <div class="autofill-card" @click="subView = 'formatGuide'">
            <div class="autofill-icon" style="background: linear-gradient(135deg, #C4B5FD, #A78BFA);">
              <i class="fas fa-file-alt"></i>
            </div>
            <div class="autofill-info">
              <div class="autofill-title">格式指导</div>
              <div class="autofill-desc">输出格式规范设置</div>
            </div>
            <i class="fas fa-chevron-right autofill-arrow"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 前置世界书页面 -->
    <div v-else-if="subView === 'worldbookPre'" class="detail-page">
      <div class="nav-bar">
        <button class="nav-back" @click="subView = null">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">前置世界书</span>
        <div style="width: 28px;"></div>
      </div>
      <div class="detail-content">
        <div class="autofill-intro">
          <p>前置世界书条目会在对话前注入，用于设定背景和规则。</p>
          <p class="tag-hint">在世界书条目标题中添加 <code>&lt;前置&gt;</code> 或 <code>&lt;前置|变量|范围&gt;</code> 标签</p>
        </div>
        <AutoFillPreview
          type="before"
          icon-color="#8FB8ED"
          empty-icon="fa-book"
          empty-text="暂无前置世界书条目"
          hint-text="请在世界书中添加带有 <前置> 标签的条目"
        />
      </div>
    </div>

    <!-- 对话历史页面 -->
    <div v-else-if="subView === 'history'" class="detail-page">
      <div class="nav-bar">
        <button class="nav-back" @click="subView = null">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">对话历史</span>
        <div style="width: 28px;"></div>
      </div>

      <div class="detail-content">
        <div class="history-config-section">
          <div class="config-item">
            <div class="config-label">
              <span>最大消息数</span>
              <span class="config-hint">0 表示不限制</span>
            </div>
            <div class="config-input-row">
              <input
                type="number"
                v-model.number="historyConfigData.maxMessages"
                min="0"
                max="1000"
                class="config-number-input"
              />
              <span class="config-unit">条</span>
            </div>
          </div>
          <div class="config-item">
            <div class="config-label">
              <span>包含系统消息</span>
              <span class="config-hint">是否包含 system 角色的消息</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="historyConfigData.includeSystem" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="section-divider">
          <span>预览（显示最近 {{ historyConfigData.maxMessages || '全部' }} 条）</span>
        </div>

        <HistoryPreview :max-messages="historyConfigData.maxMessages" :include-system="historyConfigData.includeSystem" />
      </div>
    </div>

    <!-- 后置世界书页面 -->
    <div v-else-if="subView === 'worldbookPost'" class="detail-page">
      <div class="nav-bar">
        <button class="nav-back" @click="subView = null">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">后置世界书</span>
        <div style="width: 28px;"></div>
      </div>
      <div class="detail-content">
        <div class="autofill-intro">
          <p>后置世界书条目会在对话后注入，用于补充设定和约束。</p>
          <p class="tag-hint">在世界书条目标题中添加 <code>&lt;后置&gt;</code> 或 <code>&lt;后置|变量|范围&gt;</code> 标签</p>
        </div>
        <AutoFillPreview
          type="after"
          icon-color="#FFC8DD"
          empty-icon="fa-book-open"
          empty-text="暂无后置世界书条目"
          hint-text="请在世界书中添加带有 <后置> 标签的条目"
        />
      </div>
    </div>

    <!-- 角色指导页面 -->
    <div v-else-if="subView === 'charGuide'" class="detail-page">
      <div class="nav-bar">
        <button class="nav-back" @click="subView = null">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">人物指导</span>
        <div style="width: 28px;"></div>
      </div>
      <div class="detail-content">
        <div class="autofill-intro">
          <p>人物指导条目用于为特定人物提供专属描述和行为规则。</p>
          <p class="tag-hint">在世界书条目标题中添加 <code>&lt;人物|姓名&gt;</code> 或 <code>&lt;人物|姓名|变量|范围&gt;</code> 标签</p>
        </div>
        <AutoFillPreview
          type="character"
          icon-color="#FFD699"
          empty-icon="fa-user-edit"
          empty-text="暂无人物指导条目"
          hint-text="请在世界书中添加带有 <人物|姓名> 标签的条目"
        />
      </div>
    </div>

    <!-- 页面指导页面 -->
    <div v-else-if="subView === 'pageGuide'" class="detail-page">
      <div class="nav-bar">
        <button class="nav-back" @click="subView = null">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">页面指导</span>
        <div style="width: 28px;"></div>
      </div>
      <div class="detail-content">
        <div class="autofill-intro">
          <p>页面指导条目用于为特定页面设置专属的输出指导。</p>
          <p class="tag-hint">在世界书条目标题中添加 <code>&lt;页面|页面名&gt;</code> 标签</p>
        </div>
        <div class="page-names-section">
          <div class="section-title-small">可用页面名称：</div>
          <div class="page-names-grid">
            <div class="page-name-tag" v-for="page in standardPageNames" :key="page.key">
              <span class="page-name-label">{{ page.name }}</span>
            </div>
          </div>
        </div>
        <AutoFillPreview
          type="page"
          icon-color="#67E8F9"
          empty-icon="fa-mobile-alt"
          empty-text="暂无页面指导条目"
          hint-text="请在世界书中添加带有 <页面|页面名> 标签的条目"
        />
      </div>
    </div>

    <!-- 格式指导页面 -->
    <div v-else-if="subView === 'formatGuide'" class="detail-page">
      <div class="nav-bar">
        <button class="nav-back" @click="handleFormatGuideBack">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="nav-title">格式指导</span>
        <div class="nav-actions">
          <button class="nav-action-btn" @click="saveFormatGuideToPreset" title="保存到预设">
            <i class="fas fa-save"></i>
          </button>
          <button class="nav-action-btn" @click="loadDefaultFormatGuide" title="恢复默认">
            <i class="fas fa-undo"></i>
          </button>
        </div>
      </div>

      <div class="detail-content">
        <div class="format-guide-list">
          <div v-for="key in formatGuideKeys" :key="key" class="format-guide-item">
            <div class="format-guide-header" @click="toggleFormatGuide(key)">
              <div class="format-guide-icon">
                <i :class="['fas', formatGuideItems[key].icon]"></i>
              </div>
              <span class="format-guide-title">{{ formatGuideItems[key].title }}</span>
              <i :class="['fas', expandedFormatGuide === key ? 'fa-chevron-up' : 'fa-chevron-down']" class="format-guide-toggle"></i>
            </div>
            <div v-show="expandedFormatGuide === key" class="format-guide-content">
              <textarea
                v-model="formatGuideData[key]"
                :placeholder="formatGuideItems[key].placeholder"
                class="format-guide-textarea"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 未保存提醒弹窗 -->
    <div v-if="showUnsavedModal" class="unsaved-modal-overlay">
      <div class="unsaved-modal">
        <div class="unsaved-modal-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="unsaved-modal-title">未保存的更改</div>
        <div class="unsaved-modal-text">格式指导有未保存的更改，是否保存？</div>
        <div class="unsaved-modal-actions">
          <button class="unsaved-btn unsaved-btn-cancel" @click="discardAndBack">不保存</button>
          <button class="unsaved-btn unsaved-btn-save" @click="saveAndBack">保存</button>
        </div>
      </div>
    </div>

    <!-- 变量查看器弹窗 -->
    <div v-if="showVariableViewer" class="variable-viewer-overlay" @click.self="showVariableViewer = false">
      <div class="variable-viewer-modal">
        <!-- 弹窗头部 -->
        <div class="variable-viewer-header">
          <div class="variable-viewer-header-icon">
            <i class="fas fa-database"></i>
          </div>
          <span class="variable-viewer-title">变量查看器</span>
          <button class="variable-viewer-close" @click="showVariableViewer = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- 变量类型选择器 -->
        <div class="variable-type-selector">
          <button
            v-for="vType in variableTypes"
            :key="vType.key"
            class="variable-type-btn"
            :class="{ active: selectedVariableType === vType.key }"
            @click="selectedVariableType = vType.key"
          >
            <i :class="['fas', vType.icon]"></i>
            <span>{{ vType.label }}</span>
          </button>
        </div>

        <!-- 变量信息提示 -->
        <div class="variable-info-bar">
          <i class="fas fa-info-circle"></i>
          <span>{{ currentVariableTypeInfo }}</span>
        </div>

        <!-- 变量内容 -->
        <div class="variable-viewer-content">
          <div v-if="!currentVariables || Object.keys(currentVariables).length === 0" class="variable-empty">
            <div class="variable-empty-icon">
              <i class="fas fa-inbox"></i>
            </div>
            <span class="variable-empty-text">暂无{{ currentVariableTypeLabel }}数据</span>
            <span class="variable-empty-hint">{{ currentVariableTypeHint }}</span>
          </div>
          <div v-else class="variable-tree">
            <VariableTreeNode
              v-for="(value, key) in currentVariables"
              :key="key"
              :name="String(key)"
              :value="value"
              :path="String(key)"
              @copy="copyVariablePath"
            />
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="variable-viewer-footer">
          <span class="variable-count">共 {{ variableCount }} 个顶级变量</span>
          <button class="variable-refresh-btn" @click="refreshVariables" title="刷新变量">
            <i class="fas fa-sync-alt"></i>
            <span>刷新</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import AutoFillPreview from '../../AutoFillPreview.vue';
import HistoryPreview from '../../HistoryPreview.vue';
import VariableTreeNode from '../VariableTreeNode.vue';
import { usePresets } from '../../composables/usePresets';
import { standardPageNames } from '../../types';
import type { FormatGuideData, HistoryConfig } from '../../types';

// Props & Emits
defineEmits<{
  back: [];
}>();

// 子视图状态
type SubViewType = null | 'worldbookPre' | 'history' | 'worldbookPost' | 'charGuide' | 'pageGuide' | 'formatGuide';
const subView = ref<SubViewType>(null);

// ========== 变量查看器 ==========
const showVariableViewer = ref(false);

// 变量类型定义
type VariableTypeKey = 'message' | 'chat' | 'character' | 'global';

interface VariableTypeOption {
  key: VariableTypeKey;
  label: string;
  icon: string;
  description: string;
  hint: string;
}

const variableTypes: VariableTypeOption[] = [
  {
    key: 'message',
    label: '楼层变量',
    icon: 'fa-layer-group',
    description: '当前楼层的变量数据',
    hint: '楼层变量随消息楼层存储，每个楼层独立',
  },
  {
    key: 'chat',
    label: '聊天变量',
    icon: 'fa-comments',
    description: '当前聊天的变量数据',
    hint: '聊天变量在当前对话中共享',
  },
  {
    key: 'character',
    label: '角色变量',
    icon: 'fa-user',
    description: '当前角色卡的变量数据',
    hint: '角色变量绑定在角色卡上',
  },
  {
    key: 'global',
    label: '全局变量',
    icon: 'fa-globe',
    description: '全局共享的变量数据',
    hint: '全局变量在所有对话中共享',
  },
];

// 当前选中的变量类型
const selectedVariableType = ref<VariableTypeKey>('message');

// 变量刷新触发器
const variableRefreshKey = ref(0);

// 获取最近楼层ID
const lastMessageId = computed(() => {
  try {
    return getLastMessageId();
  } catch {
    return -1;
  }
});

// 根据选择获取对应变量
const currentVariables = computed(() => {
  // 使用 refreshKey 作为依赖触发刷新
  void variableRefreshKey.value;

  try {
    switch (selectedVariableType.value) {
      case 'message': {
        const msgId = lastMessageId.value;
        if (msgId < 0) return {};
        return getVariables({ type: 'message', message_id: msgId });
      }
      case 'chat':
        return getVariables({ type: 'chat' });
      case 'character':
        return getVariables({ type: 'character' });
      case 'global':
        return getVariables({ type: 'global' });
      default:
        return {};
    }
  } catch {
    return {};
  }
});

// 变量数量
const variableCount = computed(() => {
  return Object.keys(currentVariables.value || {}).length;
});

// 当前变量类型信息
const currentVariableTypeInfo = computed(() => {
  const typeInfo = variableTypes.find(t => t.key === selectedVariableType.value);
  if (!typeInfo) return '';

  if (selectedVariableType.value === 'message') {
    return `${typeInfo.description} (楼层 ${lastMessageId.value})`;
  }
  return typeInfo.description;
});

// 当前变量类型标签
const currentVariableTypeLabel = computed(() => {
  const typeInfo = variableTypes.find(t => t.key === selectedVariableType.value);
  return typeInfo?.label || '变量';
});

// 当前变量类型提示
const currentVariableTypeHint = computed(() => {
  const typeInfo = variableTypes.find(t => t.key === selectedVariableType.value);
  return typeInfo?.hint || '';
});

// 刷新变量
const refreshVariables = () => {
  variableRefreshKey.value++;
  toastr.success('变量已刷新');
};

// 复制变量路径
const copyVariablePath = (path: string) => {
  // 使用父窗口的 document 进行复制（兼容 iframe 环境）
  const parentDoc = window.parent.document;
  const textArea = parentDoc.createElement('textarea');
  textArea.value = path;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  parentDoc.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = parentDoc.execCommand('copy');
    if (successful) {
      toastr.success(`已复制: ${path}`);
    } else {
      toastr.error('复制失败');
    }
  } catch (err) {
    toastr.error('复制失败');
  }

  parentDoc.body.removeChild(textArea);
};

// 使用预设 composable
const {
  activePreset,
  activePresetId,
  presetList,
  savePresetsToStorage,
  getDefaultFormatGuide,
} = usePresets();

// ========== 格式指导相关 ==========

// 格式指导的所有键
const formatGuideKeys: (keyof FormatGuideData)[] = [
  'privateChat',
  'groupChat',
  'voiceCall',
  'dynamic',
  'dynamicHome',
  'browser',
  'forum',
  'forumPost',
  'liveList',
  'live',
  'map',
  'email',
  'diary',
  'calendar',
];

// 格式指导项目定义
const formatGuideItems: Record<keyof FormatGuideData, { title: string; icon: string; placeholder: string }> = {
  privateChat: { title: '私聊', icon: 'fa-comment', placeholder: '描述私聊界面的输出格式规范...' },
  groupChat: { title: '群聊', icon: 'fa-comments', placeholder: '描述群聊界面的输出格式规范...' },
  voiceCall: { title: '通话', icon: 'fa-phone', placeholder: '描述通话界面的输出格式规范...' },
  dynamic: { title: '动态', icon: 'fa-stream', placeholder: '描述动态界面的输出格式规范...' },
  dynamicHome: { title: '动态主页', icon: 'fa-home', placeholder: '描述动态主页界面的输出格式规范...' },
  browser: { title: '浏览器', icon: 'fa-globe', placeholder: '描述浏览器界面的输出格式规范...' },
  forum: { title: '论坛', icon: 'fa-list', placeholder: '描述论坛列表界面的输出格式规范...' },
  forumPost: { title: '论坛帖子', icon: 'fa-file-alt', placeholder: '描述论坛帖子界面的输出格式规范...' },
  liveList: { title: '直播列表', icon: 'fa-tv', placeholder: '描述直播列表界面的输出格式规范...' },
  live: { title: '直播', icon: 'fa-video', placeholder: '描述直播界面的输出格式规范...' },
  map: { title: '地图', icon: 'fa-map-marked-alt', placeholder: '描述地图界面的输出格式规范...' },
  email: { title: '邮件', icon: 'fa-envelope', placeholder: '描述邮件界面的输出格式规范...' },
  diary: { title: '日记', icon: 'fa-book', placeholder: '描述日记界面的输出格式规范，包含日期、天气、内容、收集品等字段...' },
  calendar: { title: '日历', icon: 'fa-calendar-alt', placeholder: '描述日历界面的输出格式规范...' },
};

// 格式指导数据
const formatGuideData = ref<FormatGuideData>({
  privateChat: '',
  groupChat: '',
  voiceCall: '',
  dynamic: '',
  dynamicHome: '',
  browser: '',
  forum: '',
  forumPost: '',
  liveList: '',
  live: '',
  map: '',
  email: '',
  diary: '',
  calendar: '',
});

// 对话历史配置
const historyConfigData = ref<HistoryConfig>({
  maxMessages: 100,
  includeSystem: false,
});

// 当前展开的格式指导项
const expandedFormatGuide = ref<keyof FormatGuideData | null>(null);

// 切换格式指导项展开状态
const toggleFormatGuide = (key: keyof FormatGuideData) => {
  if (expandedFormatGuide.value === key) {
    expandedFormatGuide.value = null;
  } else {
    expandedFormatGuide.value = key;
  }
};

// 加载格式指导数据
const loadFormatGuideFromPreset = () => {
  if (activePreset.value?.formatGuide) {
    // 从当前预设加载
    formatGuideData.value = { ...formatGuideData.value, ...activePreset.value.formatGuide };
  } else {
    // 没有预设或预设没有格式指导时，加载默认预设的格式指导
    const defaultGuide = getDefaultFormatGuide();
    if (defaultGuide) {
      formatGuideData.value = { ...formatGuideData.value, ...defaultGuide };
    }
  }
};

// 加载对话历史配置
const loadHistoryConfigFromPreset = () => {
  if (activePreset.value?.historyConfig) {
    historyConfigData.value = { ...historyConfigData.value, ...activePreset.value.historyConfig };
  } else {
    historyConfigData.value = {
      maxMessages: 100,
      includeSystem: false,
    };
  }
};

// ========== 格式指导未保存状态跟踪 ==========
const showUnsavedModal = ref(false);
const originalFormatGuideData = ref<FormatGuideData | null>(null);

// 检查格式指导是否有未保存的更改
const hasUnsavedChanges = () => {
  if (!originalFormatGuideData.value) return false;
  return JSON.stringify(formatGuideData.value) !== JSON.stringify(originalFormatGuideData.value);
};

// 处理格式指导页面返回
const handleFormatGuideBack = () => {
  if (hasUnsavedChanges()) {
    showUnsavedModal.value = true;
  } else {
    subView.value = null;
  }
};

// 不保存直接返回
const discardAndBack = () => {
  showUnsavedModal.value = false;
  // 恢复原始数据
  if (originalFormatGuideData.value) {
    formatGuideData.value = { ...originalFormatGuideData.value };
  }
  subView.value = null;
};

// 保存后返回
const saveAndBack = () => {
  showUnsavedModal.value = false;
  saveFormatGuideToPreset();
  subView.value = null;
};

// 监听预设变化时重新加载
watch(activePresetId, () => {
  loadFormatGuideFromPreset();
  loadHistoryConfigFromPreset();
}, { immediate: true });

// 监听子视图变化，切换到格式指导页面时重新加载数据并保存原始数据
watch(subView, (newView) => {
  if (newView === 'formatGuide') {
    loadFormatGuideFromPreset();
    // 保存原始数据用于比较是否有更改
    originalFormatGuideData.value = JSON.parse(JSON.stringify(formatGuideData.value));
  } else if (newView === 'history') {
    loadHistoryConfigFromPreset();
  }
});

// ========== 导入导出功能 ==========

// 加载默认格式指导（从默认预设）
const loadDefaultFormatGuide = () => {
  if (confirm('确定要恢复默认格式指导吗？这将覆盖当前的所有格式指导内容。')) {
    const defaultGuide = getDefaultFormatGuide();
    if (defaultGuide) {
      formatGuideData.value = { ...formatGuideData.value, ...defaultGuide };
      toastr.success('已恢复默认格式指导');
    }
  }
};

// 保存格式指导到预设
const saveFormatGuideToPreset = () => {
  if (!activePresetId.value) {
    toastr.warning('请先选择或创建一个预设');
    return;
  }

  const preset = presetList.value.find(p => p.id === activePresetId.value);
  if (preset) {
    preset.formatGuide = { ...formatGuideData.value };
    preset.updatedAt = Date.now();
    savePresetsToStorage();
    // 更新原始数据，标记为已保存
    originalFormatGuideData.value = JSON.parse(JSON.stringify(formatGuideData.value));
    toastr.success('格式指导已保存到预设');
  }
};
</script>

<style scoped>
/* 根容器 */
.autofill-settings {
  height: 100%;
}

/* ========== 自动填充管理页面 ========== */
.autofill-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.autofill-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 14px;
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
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}

.autofill-info {
  flex: 1;
  min-width: 0;
}

.autofill-title {
  font-size: 14px;
  font-weight: 500;
  color: #1E293B;
}

.autofill-desc {
  font-size: 12px;
  color: #94A3B8;
}

.autofill-arrow {
  font-size: 12px;
  color: #94A3B8;
}

/* 自动填充介绍 */
.autofill-intro {
  background: rgba(143, 184, 237, 0.1);
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 12px;
  padding: 12px;
  margin: 12px;
}

.autofill-intro p {
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
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
  background-color: #8FB8ED;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 分隔线 */
.section-divider {
  display: flex;
  align-items: center;
  margin: 16px 12px;
}

.section-divider::before,
.section-divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.section-divider span {
  padding: 0 12px;
  font-size: 12px;
  color: #94A3B8;
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
}

.format-guide-item:last-child {
  margin-bottom: 0;
}

.format-guide-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
}

.format-guide-header:hover {
  background: rgba(143, 184, 237, 0.05);
}

.format-guide-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #C4B5FD, #A78BFA);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.format-guide-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1E293B;
}

.format-guide-toggle {
  color: #94A3B8;
  font-size: 12px;
}

.format-guide-content {
  padding: 0 16px 16px;
}

.format-guide-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #E2E8F0 !important;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
  background-color: rgba(255, 255, 255, 0.9) !important;
  color: #1E293B !important;
  box-sizing: border-box;
}

.format-guide-textarea:focus {
  background-color: white !important;
  border-color: rgba(143, 184, 237, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(143, 184, 237, 0.1);
}

.format-guide-textarea::placeholder {
  color: #94A3B8 !important;
}

/* 通用详情页样式 */
.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(143, 184, 237, 0.15) 0%, rgba(168, 216, 185, 0.1) 100%);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-back {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #8FB8ED;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-back:hover {
  background: rgba(143, 184, 237, 0.1);
}

.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
}

.nav-text-btn {
  background: none;
  border: none;
  color: #8FB8ED;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(143, 184, 237, 0.1);
    color: #7AA8E0;
  }

  &:active {
    background: rgba(143, 184, 237, 0.2);
  }
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #8FB8ED;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-action-btn:hover {
  background: rgba(143, 184, 237, 0.1);
  color: #7AA8E0;
}

.nav-action-btn:active {
  transform: scale(0.9);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
}

/* ========== 未保存提醒弹窗 ========== */
.unsaved-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.unsaved-modal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 280px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.unsaved-modal-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  background: linear-gradient(135deg, #FFC8DD, #FFB3C6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.unsaved-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 8px;
}

.unsaved-modal-text {
  font-size: 14px;
  color: #64748B;
  margin-bottom: 20px;
}

.unsaved-modal-actions {
  display: flex;
  gap: 12px;
}

.unsaved-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.unsaved-btn-cancel {
  background: #F1F5F9;
  color: #64748B;
}

.unsaved-btn-cancel:hover {
  background: #E2E8F0;
}

.unsaved-btn-save {
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
}

.unsaved-btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.4);
}

/* ========== 变量查看器弹窗（雾蓝主题） ========== */
.variable-viewer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.variable-viewer-modal {
  background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
  border-radius: 20px;
  width: 100%;
  max-height: 85%;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(143, 184, 237, 0.2);
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

.variable-viewer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #8FB8ED 0%, #7AA8E0 50%, #6B9BD1 100%);
  position: relative;
  flex-shrink: 0;
}

.variable-viewer-header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.variable-viewer-header-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.variable-viewer-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.variable-viewer-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 14px;
}

.variable-viewer-close:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.variable-viewer-close:active {
  transform: scale(0.95);
}

/* 变量类型选择器 */
.variable-type-selector {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}

.variable-type-selector::-webkit-scrollbar {
  display: none;
}

.variable-type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(143, 184, 237, 0.3);
  border-radius: 20px;
  background: white;
  color: #64748B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.variable-type-btn i {
  font-size: 12px;
}

.variable-type-btn:hover {
  border-color: #8FB8ED;
  color: #8FB8ED;
  background: rgba(143, 184, 237, 0.05);
}

.variable-type-btn.active {
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.4);
}

/* 变量信息提示栏 */
.variable-info-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(90deg, rgba(143, 184, 237, 0.1), rgba(168, 216, 185, 0.08));
  border-bottom: 1px solid rgba(143, 184, 237, 0.1);
  font-size: 12px;
  color: #64748B;
  flex-shrink: 0;
}

.variable-info-bar i {
  color: #8FB8ED;
  font-size: 13px;
}

/* 变量内容区域 */
.variable-viewer-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  background: linear-gradient(180deg, #FAFBFC 0%, #F5F7FA 100%);
}

.variable-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.variable-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(143, 184, 237, 0.15), rgba(168, 216, 185, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.variable-empty-icon i {
  font-size: 28px;
  color: #8FB8ED;
  opacity: 0.6;
}

.variable-empty-text {
  font-size: 15px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
}

.variable-empty-hint {
  font-size: 13px;
  color: #94A3B8;
  max-width: 240px;
}

.variable-tree {
  background: white;
  border-radius: 14px;
  border: 1px solid rgba(143, 184, 237, 0.2);
  padding: 12px;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.08);
}

/* 底部操作栏 */
.variable-viewer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px solid rgba(143, 184, 237, 0.15);
  flex-shrink: 0;
}

.variable-count {
  font-size: 12px;
  color: #94A3B8;
}

.variable-refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.variable-refresh-btn i {
  font-size: 12px;
}

.variable-refresh-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.4);
}

.variable-refresh-btn:active {
  transform: scale(0.95);
}
</style>
