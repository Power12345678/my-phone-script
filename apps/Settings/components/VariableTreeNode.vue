<template>
  <div class="variable-node">
    <div class="variable-row" @click="toggle">
      <span v-if="isExpandable" class="variable-toggle">
        <i :class="['fas', expanded ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
      </span>
      <span v-else class="variable-toggle-placeholder"></span>
      <span class="variable-name" @click.stop="$emit('copy', path)">{{ name }}</span>
      <span class="variable-type">{{ typeLabel }}</span>
      <span v-if="!isExpandable" class="variable-value">{{ displayValue }}</span>
      <button class="variable-copy-btn" @click.stop="$emit('copy', path)" title="复制变量路径">
        <i class="fas fa-copy"></i>
      </button>
    </div>
    <div v-if="expanded && isExpandable" class="variable-children">
      <VariableTreeNode
        v-for="(childValue, childKey) in value"
        :key="childKey"
        :name="String(childKey)"
        :value="childValue"
        :path="`${path}.${childKey}`"
        @copy="(p: string) => $emit('copy', p)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  name: string;
  value: any;
  path: string;
}>();

defineEmits<{
  copy: [path: string];
}>();

const expanded = ref(false);

const isExpandable = computed(() => {
  return props.value !== null && typeof props.value === 'object';
});

const typeLabel = computed(() => {
  if (props.value === null) return 'null';
  if (Array.isArray(props.value)) return `array[${props.value.length}]`;
  const type = typeof props.value;
  if (type === 'object') return `object{${Object.keys(props.value).length}}`;
  return type;
});

const displayValue = computed(() => {
  if (props.value === null) return 'null';
  if (props.value === undefined) return 'undefined';
  if (typeof props.value === 'string') {
    const truncated = props.value.length > 50 ? props.value.slice(0, 50) + '...' : props.value;
    return `"${truncated}"`;
  }
  if (typeof props.value === 'boolean') return props.value ? 'true' : 'false';
  return String(props.value);
});

const toggle = () => {
  if (isExpandable.value) {
    expanded.value = !expanded.value;
  }
};
</script>

<style scoped>
.variable-node {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
}

.variable-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.variable-row:hover {
  background: rgba(143, 184, 237, 0.1);
}

.variable-toggle {
  width: 14px;
  color: #94A3B8;
  font-size: 10px;
}

.variable-toggle-placeholder {
  width: 14px;
}

.variable-name {
  color: #8B5CF6;
  font-weight: 500;
  cursor: pointer;
}

.variable-name:hover {
  text-decoration: underline;
}

.variable-type {
  color: #94A3B8;
  font-size: 10px;
  padding: 1px 4px;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 3px;
}

.variable-value {
  color: #059669;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-copy-btn {
  opacity: 0;
  border: none;
  background: none;
  color: #8FB8ED;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.variable-row:hover .variable-copy-btn {
  opacity: 1;
}

.variable-copy-btn:hover {
  background: rgba(143, 184, 237, 0.2);
  color: #7AA8E0;
}

.variable-children {
  margin-left: 16px;
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  padding-left: 4px;
}
</style>
