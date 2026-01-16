<template>
  <div class="autofill-preview-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <span>加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{{ error }}</span>
      <button class="retry-btn" @click="loadEntries">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="entries.length === 0" class="empty-state">
      <i :class="['fas', emptyIcon]" :style="{ color: iconColor }"></i>
      <p>{{ emptyText }}</p>
      <p class="hint-text">{{ hintText }}</p>
    </div>

    <!-- 条目列表 -->
    <div v-else class="entries-list">
      <div
        v-for="(entry, index) in entries"
        :key="`${entry.name}-${entry.range}-${index}`"
        class="entry-card"
        :class="{ 'is-active': entry.isActive, 'is-inactive': !entry.isActive }"
      >
        <div class="entry-header" @click="toggleEntry(entry)">
          <div class="entry-status">
            <i :class="['fas', entry.isActive ? 'fa-check-circle' : 'fa-times-circle']"></i>
          </div>
          <div class="entry-info">
            <div class="entry-name">{{ getDisplayName(entry.name) }}</div>
            <div v-if="entry.characterName" class="entry-character">
              <i class="fas fa-user"></i>
              <span>{{ entry.characterName }}</span>
            </div>
            <div v-if="entry.pageName" class="entry-page">
              <i class="fas fa-mobile-alt"></i>
              <span>{{ entry.pageName }}</span>
            </div>
          </div>
          <i :class="['fas', entry.expanded ? 'fa-chevron-up' : 'fa-chevron-down']" class="entry-toggle"></i>
        </div>

        <!-- 触发条件 -->
        <div v-if="entry.variablePath || entry.range" class="entry-conditions">
          <div v-if="entry.variablePath" class="condition-item">
            <span class="condition-label">变量:</span>
            <code class="condition-value">{{ entry.variablePath }}</code>
            <span v-if="entry.currentValue !== undefined" class="condition-current">
              = {{ entry.currentValue }}
            </span>
          </div>
          <div v-if="entry.range" class="condition-item">
            <span class="condition-label">范围:</span>
            <code class="condition-value">{{ entry.range }}</code>
            <span :class="['condition-status', entry.isActive ? 'active' : 'inactive']">
              {{ entry.isActive ? '满足' : '不满足' }}
            </span>
          </div>
        </div>

        <!-- 内容预览 -->
        <div v-show="entry.expanded" class="entry-content">
          <pre>{{ entry.content }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import _ from 'lodash';

// Props
interface Props {
  type: 'before' | 'after' | 'character' | 'page';
  iconColor?: string;
  emptyIcon?: string;
  emptyText?: string;
  hintText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: '#8FB8ED',
  emptyIcon: 'fa-book',
  emptyText: '暂无世界书条目',
  hintText: '请在世界书中添加带有相应标签的条目',
});

// 条目类型
interface WorldbookEntry {
  name: string;
  content: string;
  enabled: boolean;
  variablePath?: string;
  range?: string;
  characterName?: string;
  pageName?: string;
  currentValue?: any;
  isActive: boolean;
  expanded: boolean;
}

// 状态
const loading = ref(true);
const error = ref<string | null>(null);
const entries = ref<WorldbookEntry[]>([]);

// 解析世界书条目标签
function parseTag(title: string): { type: string; variablePath?: string; range?: string; characterName?: string; pageName?: string } | null {
  // 匹配 <前置|变量|范围> 或 <后置|变量|范围>
  const worldbookMatch = title.match(/<(前置|后置)(?:\|([^|>]+))?(?:\|([^>]+))?>/);
  if (worldbookMatch) {
    return {
      type: worldbookMatch[1] === '前置' ? 'before' : 'after',
      variablePath: worldbookMatch[2]?.trim(),
      range: worldbookMatch[3]?.trim(),
    };
  }

  // 匹配 <人物|姓名|变量|范围>
  const characterMatch = title.match(/<人物\|([^|>]+)(?:\|([^|>]+))?(?:\|([^>]+))?>/);
  if (characterMatch) {
    return {
      type: 'character',
      characterName: characterMatch[1].trim(),
      variablePath: characterMatch[2]?.trim(),
      range: characterMatch[3]?.trim(),
    };
  }

  // 匹配 <页面|页面名|变量|范围>
  const pageMatch = title.match(/<页面\|([^|>]+)(?:\|([^|>]+))?(?:\|([^>]+))?>/);
  if (pageMatch) {
    return {
      type: 'page',
      pageName: pageMatch[1].trim(),
      variablePath: pageMatch[2]?.trim(),
      range: pageMatch[3]?.trim(),
    };
  }

  return null;
}

// 检查范围条件
function checkRange(value: number, range: string): boolean {
  // 范围格式: "0-50"
  const rangeMatch = range.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const [, min, max] = rangeMatch;
    return value >= parseFloat(min) && value <= parseFloat(max);
  }

  // 比较格式
  const compareMatch = range.match(/^(>=?|<=?|=)\s*(-?\d+(?:\.\d+)?)$/);
  if (compareMatch) {
    const [, operator, numStr] = compareMatch;
    const num = parseFloat(numStr);
    switch (operator) {
      case '>': return value > num;
      case '>=': return value >= num;
      case '<': return value < num;
      case '<=': return value <= num;
      case '=': return value === num;
    }
  }

  return true;
}

// 检查条目是否激活
function checkIsActive(entry: { variablePath?: string; range?: string }, variables: Record<string, any>): { isActive: boolean; currentValue?: any } {
  if (!entry.variablePath) {
    return { isActive: true };
  }

  const value = _.get(variables, entry.variablePath);
  console.info(`[AutoFillPreview] 检查变量: ${entry.variablePath}, 值: ${value}, 类型: ${typeof value}, 范围: ${entry.range}`);

  if (value === undefined || value === null) {
    return { isActive: false, currentValue: undefined };
  }

  if (!entry.range) {
    return { isActive: true, currentValue: value };
  }

  // 尝试将字符串转换为数字
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));

  if (!isNaN(numValue)) {
    const result = checkRange(numValue, entry.range);
    console.info(`[AutoFillPreview] 范围检查结果: ${result}, 数值: ${numValue}`);
    return { isActive: result, currentValue: value };
  }

  return { isActive: true, currentValue: value };
}

// 获取显示名称
function getDisplayName(name: string): string {
  // 移除标签部分
  return name.replace(/<[^>]+>/g, '').trim() || name;
}

// 切换展开状态
function toggleEntry(entry: WorldbookEntry) {
  entry.expanded = !entry.expanded;
}

// 加载条目
async function loadEntries() {
  loading.value = true;
  error.value = null;
  entries.value = [];

  try {
    // 获取变量 - 从最近楼层变量读取
    let variables: Record<string, any> = {};
    try {
      const lastMessageId = getLastMessageId();
      if (lastMessageId >= 0) {
        variables = getVariables({ type: 'message', message_id: lastMessageId });
        console.info(`[AutoFillPreview] 从楼层 ${lastMessageId} 读取变量`);
      }
    } catch (e) {
      console.warn('获取楼层变量失败:', e);
    }

    // 获取角色卡绑定的世界书
    const charWorldbooks = getCharWorldbookNames('current');
    const worldbookNames: string[] = [];

    if (charWorldbooks.primary) {
      worldbookNames.push(charWorldbooks.primary);
    }
    worldbookNames.push(...charWorldbooks.additional);

    if (worldbookNames.length === 0) {
      loading.value = false;
      return;
    }

    // 遍历所有世界书
    for (const worldbookName of worldbookNames) {
      try {
        const worldbookEntries = await getWorldbook(worldbookName);

        for (const entry of worldbookEntries) {
          const tag = parseTag(entry.name);
          if (!tag) continue;

          // 过滤类型
          if (props.type === 'before' && tag.type !== 'before') continue;
          if (props.type === 'after' && tag.type !== 'after') continue;
          if (props.type === 'character' && tag.type !== 'character') continue;
          if (props.type === 'page' && tag.type !== 'page') continue;

          // 检查激活状态
          const { isActive, currentValue } = checkIsActive(
            { variablePath: tag.variablePath, range: tag.range },
            variables
          );

          entries.value.push({
            name: entry.name,
            content: entry.content,
            enabled: entry.enabled,
            variablePath: tag.variablePath,
            range: tag.range,
            characterName: tag.characterName,
            pageName: tag.pageName,
            currentValue,
            // 注意：实际填充逻辑不检查 entry.enabled，只检查变量条件
            // 因此预览显示也应该只检查变量条件是否满足
            isActive: isActive,
            expanded: false,
          });
        }
      } catch (e) {
        console.warn(`读取世界书 "${worldbookName}" 失败:`, e);
      }
    }

    // 按激活状态排序（激活的在前）
    entries.value.sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });
  } catch (e) {
    console.error('加载世界书条目失败:', e);
    error.value = '加载失败，请检查网络或权限';
  } finally {
    loading.value = false;
  }
}

// 监听类型变化
watch(() => props.type, () => {
  loadEntries();
});

onMounted(() => {
  loadEntries();
});
</script>

<style scoped>
.autofill-preview-container {
  padding: 12px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #64748B;
}

.loading-state i {
  font-size: 32px;
  margin-bottom: 12px;
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #EF4444;
}

.error-state i {
  font-size: 32px;
  margin-bottom: 12px;
}

.retry-btn {
  margin-top: 12px;
  padding: 8px 16px;
  background: #8FB8ED;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  color: #64748B;
  margin: 4px 0;
}

.hint-text {
  font-size: 12px;
  color: #94A3B8 !important;
}

/* 条目列表 */
.entries-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.entry-card.is-inactive {
  opacity: 0.6;
}

.entry-header {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
  cursor: pointer;
}

.entry-header:active {
  background: rgba(143, 184, 237, 0.1);
}

.entry-status {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.entry-card.is-active .entry-status {
  color: #10B981;
}

.entry-card.is-inactive .entry-status {
  color: #94A3B8;
}

.entry-info {
  flex: 1;
  min-width: 0;
}

.entry-name {
  font-size: 14px;
  font-weight: 500;
  color: #1E293B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-character {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 12px;
  color: #8FB8ED;
}

.entry-page {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 12px;
  color: #22D3EE;
}

.entry-toggle {
  color: #94A3B8;
  font-size: 12px;
}

/* 触发条件 */
.entry-conditions {
  padding: 8px 12px;
  background: #F8FAFC;
  border-top: 1px solid #E2E8F0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.condition-label {
  color: #64748B;
}

.condition-value {
  background: #E2E8F0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: #475569;
}

.condition-current {
  color: #8FB8ED;
  font-weight: 500;
}

.condition-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.condition-status.active {
  background: #D1FAE5;
  color: #059669;
}

.condition-status.inactive {
  background: #FEE2E2;
  color: #DC2626;
}

/* 内容预览 */
.entry-content {
  padding: 12px;
  background: #F8FAFC;
  border-top: 1px solid #E2E8F0;
}

.entry-content pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: #475569;
  max-height: 200px;
  overflow-y: auto;
}
</style>
