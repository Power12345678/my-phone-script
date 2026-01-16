<template>
  <div class="history-preview-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <span>加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{{ error }}</span>
      <button class="retry-btn" @click="loadHistory">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="messages.length === 0" class="empty-state">
      <i class="fas fa-history" style="color: #A8D8B9;"></i>
      <p>暂无对话历史</p>
      <p class="hint-text">开始对话后将显示消息记录</p>
    </div>

    <!-- 消息列表 -->
    <div v-else class="messages-list">
      <div class="history-stats">
        <span>共 {{ totalMessages }} 条消息，显示最近 {{ displayCount }} 条</span>
      </div>

      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-card"
        :class="{ 'is-user': msg.role === 'user', 'is-assistant': msg.role === 'assistant', 'is-system': msg.role === 'system' }"
      >
        <div class="message-header">
          <div class="message-role">
            <i :class="['fas', getRoleIcon(msg.role)]"></i>
            <span>{{ getRoleName(msg) }}</span>
          </div>
          <div class="message-id">#{{ msg.message_id }}</div>
        </div>
        <div class="message-content">
          <p>{{ truncateContent(msg.message) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';

// Props
interface Props {
  maxMessages?: number;
  includeSystem?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxMessages: 100,
  includeSystem: false,
});

// 消息类型
interface ChatMessage {
  message_id: number;
  name: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
}

// 状态
const loading = ref(true);
const error = ref<string | null>(null);
const messages = ref<ChatMessage[]>([]);
const totalMessages = ref(0);

// 计算显示条数
const displayCount = computed(() => {
  return props.maxMessages === 0 ? totalMessages.value : Math.min(props.maxMessages, totalMessages.value);
});

// 获取角色图标
function getRoleIcon(role: string): string {
  switch (role) {
    case 'user': return 'fa-user';
    case 'assistant': return 'fa-robot';
    case 'system': return 'fa-cog';
    default: return 'fa-comment';
  }
}

// 获取角色名称
function getRoleName(msg: ChatMessage): string {
  switch (msg.role) {
    case 'user': return '用户';
    case 'system': return '系统';
    default: return msg.name || 'AI';
  }
}

// 截断内容
function truncateContent(content: string, maxLength: number = 200): string {
  const cleaned = content.trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength) + '...';
}

// 加载历史
async function loadHistory() {
  loading.value = true;
  error.value = null;
  messages.value = [];

  try {
    // 使用正确的 range 参数格式获取消息
    const allMessages = getChatMessages(`0-{{lastMessageId}}`);

    // 过滤系统消息
    let filteredMessages = allMessages;
    if (!props.includeSystem) {
      filteredMessages = allMessages.filter(msg => msg.role !== 'system');
    }

    totalMessages.value = filteredMessages.length;

    // 获取最近N条消息 (0表示无上限)
    const limit = props.maxMessages === 0 ? filteredMessages.length : props.maxMessages;
    const recentMessages = filteredMessages.slice(-limit);

    messages.value = recentMessages.map(msg => ({
      message_id: msg.message_id,
      name: msg.name,
      role: msg.role,
      message: msg.message,
    }));
  } catch (e) {
    console.error('加载对话历史失败:', e);
    error.value = '加载失败，请检查是否有打开的聊天';
  } finally {
    loading.value = false;
  }
}

// 监听props变化重新加载
watch(() => [props.maxMessages, props.includeSystem], () => {
  loadHistory();
});

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.history-preview-container {
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
  background: #A8D8B9;
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

/* 统计信息 */
.history-stats {
  padding: 8px 12px;
  background: #F1F5F9;
  border-radius: 8px;
  font-size: 12px;
  color: #64748B;
  margin-bottom: 12px;
  text-align: center;
}

/* 消息列表 */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.message-card.is-user {
  border-left: 3px solid #8FB8ED;
}

.message-card.is-assistant {
  border-left: 3px solid #A8D8B9;
}

.message-card.is-system {
  border-left: 3px solid #94A3B8;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
}

.message-role {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.message-card.is-user .message-role {
  color: #8FB8ED;
}

.message-card.is-assistant .message-role {
  color: #A8D8B9;
}

.message-card.is-system .message-role {
  color: #94A3B8;
}

.message-id {
  font-size: 11px;
  color: #94A3B8;
}

.message-content {
  padding: 12px;
}

.message-content p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
