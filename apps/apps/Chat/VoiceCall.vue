<template>
  <div class="voice-call">
    <div class="call-container">
      <!-- 头像区域 -->
      <div class="avatar-container">
        <div class="avatar-decoration"></div>
        <div class="avatar-wrapper">
          <img :src="callData.avatar" class="avatar" alt="Caller Avatar" />
        </div>
      </div>

      <!-- 通话信息 -->
      <div class="caller-info">
        <div class="caller-name">✧ {{ callData.name }} ✧</div>
        <div class="call-timer">{{ isConnecting ? '接通中...' : formattedTime }}</div>
      </div>

      <!-- 首次接通加载指示器 -->
      <div v-if="isConnecting" class="loading-indicator">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p>正在连接通话...</p>
      </div>

      <!-- 已接通后的内容区域 -->
      <template v-else>
        <!-- 等待回复时：显示等待指示器替换内容区域 -->
        <div v-if="isWaitingReply" class="waiting-reply-container">
          <div class="waiting-reply-indicator">
            <div class="waiting-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>对方正在思考...</p>
          </div>
        </div>

        <!-- 正常显示：内心想法和通话内容 -->
        <template v-else>
          <!-- 内心想法 -->
          <div class="inner-thoughts">
            {{ callData.thought }}
          </div>

          <!-- 通话内容 -->
          <div ref="conversationBox" class="conversation-box">
            <p v-for="(line, index) in displayedLines" :key="index" class="conversation-line">
              {{ line }}
            </p>
          </div>
        </template>
      </template>

      <!-- 控制按钮 -->
      <div class="call-controls">
        <button class="control-button" @click="showInputModal = true">
          <i class="fas fa-microphone"></i>
        </button>
        <button class="control-button end-call" @click="endCall">
          <i class="fas fa-phone-slash"></i>
        </button>
        <button class="control-button" :class="{ active: isMuted }" @click="toggleMute">
          <i :class="isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'"></i>
        </button>
      </div>
    </div>

    <!-- 输入弹窗 -->
    <div v-if="showInputModal" class="modal-overlay" @click.self="showInputModal = false">
      <div class="modal-content">
        <h2>请讲话</h2>
        <textarea v-model="voiceInput" placeholder="输入你想说的话..." class="voice-input"></textarea>
        <div class="modal-buttons">
          <button class="modal-btn cancel" @click="showInputModal = false">取消</button>
          <button class="modal-btn confirm" @click="confirmVoice">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

interface CallData {
  name: string;
  avatar: string;
  thought: string;
  content: string;
}

const props = defineProps<{
  callData: CallData;
  isConnecting?: boolean;
  isWaitingReply?: boolean;
}>();

const emit = defineEmits<{
  end: [duration: string];
  reply: [message: string];
}>();

// 状态
const seconds = ref(0);
const isMuted = ref(false);
const showInputModal = ref(false);
const voiceInput = ref('');
const displayedLines = ref<string[]>([]);
const conversationBox = ref<HTMLElement | null>(null);

let timerInterval: ReturnType<typeof setInterval> | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

// 格式化时间
const formattedTime = computed(() => {
  const minutes = Math.floor(seconds.value / 60);
  const secs = seconds.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
});

// 开始计时
const startTimer = () => {
  timerInterval = setInterval(() => {
    seconds.value++;
  }, 1000);
};

// 停止计时
const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

// 打字机效果显示内容
const startTypingEffect = () => {
  const lines = props.callData.content.split('\n').filter(line => line.trim());
  let lineIndex = 0;

  const showNextLine = () => {
    if (lineIndex < lines.length) {
      displayedLines.value.push(lines[lineIndex]);
      lineIndex++;

      // 滚动到底部
      nextTick(() => {
        if (conversationBox.value) {
          conversationBox.value.scrollTop = conversationBox.value.scrollHeight;
        }
      });

      // 下一行延迟
      typingTimeout = setTimeout(showNextLine, 1500 + Math.random() * 1000);
    }
  };

  // 开始显示
  typingTimeout = setTimeout(showNextLine, 500);
};

// 结束通话
const endCall = () => {
  stopTimer();
  emit('end', formattedTime.value);
};

// 静音切换
const toggleMute = () => {
  isMuted.value = !isMuted.value;
};

// 确认语音输入
const confirmVoice = () => {
  if (voiceInput.value.trim()) {
    emit('reply', voiceInput.value.trim());
    voiceInput.value = '';
  }
  showInputModal.value = false;
};

// 生命周期
onMounted(() => {
  // 只有在非接通中状态时才开始计时和打字效果
  if (!props.isConnecting) {
    startTimer();
    startTypingEffect();
  }
});

onUnmounted(() => {
  stopTimer();
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
});

// 监听首次接通状态变化
watch(
  () => props.isConnecting,
  (newConnecting, oldConnecting) => {
    if (oldConnecting && !newConnecting) {
      // 从接通中变为已接通，开始计时和打字效果
      seconds.value = 0;
      displayedLines.value = [];
      startTimer();
      startTypingEffect();
    }
  },
);

// 监听数据变化（收到新回复时）
watch(
  () => props.callData.content,
  () => {
    if (!props.isConnecting) {
      displayedLines.value = [];
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      startTypingEffect();
    }
  },
);
</script>

<style scoped>
.voice-call {
  height: 100%;
  position: relative;
}

.call-container {
  height: 100%;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #444;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
}

/* 头像区域 */
.avatar-container {
  position: relative;
  margin: 0 0 15px;
  width: 120px;
  height: 120px;
}

.avatar-wrapper {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 108px;
  height: 108px;
  box-sizing: border-box;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  animation: pulse 2s infinite;
  z-index: 1;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-decoration {
  position: absolute;
  width: 120px;
  height: 120px;
  box-sizing: border-box;
  border: 2px dashed rgba(108, 140, 213, 0.4);
  border-radius: 50%;
  animation: rotate 20s linear infinite;
  top: 0;
  left: 0;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 通话信息 */
.caller-info {
  text-align: center;
  margin-bottom: 10px;
}

.caller-name {
  font-size: 20px;
  font-weight: 600;
  color: #444;
  margin-bottom: 4px;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
}

.call-timer {
  font-size: 14px;
  color: #666;
  background: rgba(255, 255, 255, 0.4);
  padding: 3px 10px;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* 内心想法 */
.inner-thoughts {
  width: 100%;
  min-height: 60px;
  max-height: 80px;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 12px;
  margin-bottom: 15px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.5;
  color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.6);
  font-style: italic;
  /* 隐藏滚动条但保持可滚动 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.inner-thoughts::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

/* 通话内容 */
.conversation-box {
  width: 100%;
  flex: 1;
  min-height: 150px;
  max-height: 220px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 16px 20px;
  margin-bottom: 20px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  color: #444;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.6);
  /* 隐藏滚动条但保持可滚动 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.conversation-box::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

.conversation-line {
  margin: 0 0 10px 0;
  animation: fadeInLine 0.5s ease;
}

.conversation-line:last-child {
  margin-bottom: 0;
}

@keyframes fadeInLine {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 控制按钮 */
.call-controls {
  display: flex;
  gap: 25px;
  margin-top: auto;
  padding-top: 10px;
}

.control-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.7);
  color: #666;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.control-button:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.9);
}

.control-button i {
  font-size: 18px;
}

.control-button.active {
  background: rgba(108, 140, 213, 0.2);
}

.end-call {
  background: linear-gradient(135deg, #ff6b6b, #ff8787);
}

.end-call:hover {
  background: linear-gradient(135deg, #ff5252, #ff6b6b);
}

.end-call i {
  color: white;
}

/* 输入弹窗 */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: #ffffff;
  padding: 24px;
  border-radius: 16px;
  width: 85%;
  max-width: 280px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  animation: modalFadeIn 0.3s;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content h2 {
  color: #444;
  text-align: center;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 500;
}

.voice-input {
  width: 100%;
  height: 100px;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid #eaeaea !important;
  border-radius: 12px;
  resize: none;
  font-size: 14px;
  background-color: #f9f9f9 !important;
  color: #333 !important;
  transition: all 0.3s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  font-family: inherit;
}

.voice-input:focus {
  outline: none;
  border-color: #6c8cd5 !important;
  background-color: #fff !important;
  box-shadow: 0 0 8px rgba(108, 140, 213, 0.2);
}

.modal-buttons {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-btn.cancel {
  background-color: #f0f0f0;
  color: #555;
}

.modal-btn.confirm {
  background-color: #6c8cd5;
  color: white;
}

.modal-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.modal-btn:active {
  transform: translateY(1px);
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.loading-indicator p {
  margin-top: 16px;
  font-size: 14px;
  color: #888;
}

.loading-dots {
  display: flex;
  gap: 8px;
}

.loading-dots span {
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #6c8cd5, #8ba4e0);
  border-radius: 50%;
  animation: loadingBounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0s;
}

@keyframes loadingBounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 等待回复容器 - 占据内心想法和通话内容的空间 */
.waiting-reply-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* 等待回复指示器 */
.waiting-reply-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
}

.waiting-reply-indicator p {
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}

.waiting-dots {
  display: flex;
  gap: 6px;
}

.waiting-dots span {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #a8c0e8, #c4d6f2);
  border-radius: 50%;
  animation: waitingPulse 1.2s ease-in-out infinite;
}

.waiting-dots span:nth-child(1) {
  animation-delay: 0s;
}

.waiting-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.waiting-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes waitingPulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
