<template>
  <div class="diary-detail-container">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-back" @click="goBack">
        <i class="fas fa-chevron-left"></i>
      </div>
      <div class="nav-title">{{ diary?.name }}的日记</div>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 日记内容区 -->
    <div class="diary-content-wrapper">
      <!-- 日记本样式容器 -->
      <div class="diary-notebook">
        <!-- 日记头部 -->
        <div class="diary-header">
          <div class="diary-date">{{ diary?.date }}</div>
          <div class="diary-weather">{{ diary?.weather }}</div>
        </div>

        <!-- 分隔线 -->
        <div class="diary-divider"></div>

        <!-- 日记正文 -->
        <div class="diary-body" v-html="diary?.content"></div>

        <!-- 收集品展示 -->
        <div v-if="diary?.collection" class="collection-section">
          <div class="collection-divider"></div>
          <div class="collection-card">
            <div class="collection-icon">
              <i class="fas fa-gem"></i>
            </div>
            <div class="collection-info">
              <div class="collection-label">今日收集</div>
              <div class="collection-name">{{ diary.collection.name }}</div>
              <div class="collection-desc">{{ diary.collection.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 装饰元素 -->
        <div class="diary-decoration">
          <div class="decoration-flower">✿</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, onMounted, onUnmounted, watch, nextTick } from 'vue';

interface DiaryCollection {
  name: string;
  desc: string;
}

interface Diary {
  id: string;
  date: string;
  weather: string;
  name: string;
  content: string;
  collection?: DiaryCollection;
}

const props = defineProps<{
  diary: Diary | null;
}>();

const emit = defineEmits<{
  back: [];
}>();

const goBack = () => {
  emit('back');
};

// 获取父级 document（脚本运行在 iframe 中，但 Vue 组件渲染在父页面）
const getParentDocument = () => window.parent.document;

// 应用隐藏样式
const applyHiddenStyle = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.backgroundColor = '#475569';
  htmlEl.style.color = '#475569';
  htmlEl.style.cursor = 'pointer';
  htmlEl.style.borderRadius = '2px';
  htmlEl.style.padding = '0 2px';
  htmlEl.style.userSelect = 'none';
  htmlEl.dataset.hidden = 'true';
};

// 移除隐藏样式
const removeHiddenStyle = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.backgroundColor = '';
  htmlEl.style.color = '';
  htmlEl.style.userSelect = '';
  htmlEl.dataset.hidden = 'false';
};

// 处理隐藏块点击事件
const handleCensoredClick = (event: Event) => {
  const target = event.currentTarget as HTMLElement;
  if (target.dataset.hidden === 'true') {
    removeHiddenStyle(target);
  } else {
    applyHiddenStyle(target);
  }
};

// 为隐藏块添加点击事件和初始隐藏状态
const setupCensoredElements = () => {
  // 使用 setTimeout 确保 v-html 内容已渲染
  setTimeout(() => {
    const parentDoc = getParentDocument();
    const censoredElements = parentDoc.querySelectorAll('.diary-body .censored');
    console.log('[DiaryDetail] 找到隐藏块数量:', censoredElements.length);

    censoredElements.forEach((el, index) => {
      console.log(`[DiaryDetail] 处理第 ${index + 1} 个隐藏块:`, el.textContent);

      // 应用隐藏样式
      applyHiddenStyle(el);

      // 添加点击事件
      if (!el.hasAttribute('data-has-listener')) {
        el.setAttribute('data-has-listener', 'true');
        el.addEventListener('click', handleCensoredClick);
      }
    });
  }, 100);
};

// 清除点击事件
const cleanupCensoredElements = () => {
  const parentDoc = getParentDocument();
  const censoredElements = parentDoc.querySelectorAll('.diary-body .censored');
  censoredElements.forEach(el => {
    el.removeEventListener('click', handleCensoredClick);
  });
};

// 监听日记变化重新绑定事件
watch(() => props.diary, () => {
  cleanupCensoredElements();
  setupCensoredElements();
});

onMounted(() => {
  setupCensoredElements();
});

onUnmounted(() => {
  cleanupCensoredElements();
});
</script>

<style scoped>
.diary-detail-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #F0F6FC 0%, #E8F4FD 100%);
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.nav-back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8FB8ED;
  cursor: pointer;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.2s;
}

.nav-back:active {
  transform: scale(0.95);
  background: rgba(143, 184, 237, 0.2);
}

.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.5px;
}

.nav-placeholder {
  width: 32px;
}

/* 日记内容区 */
.diary-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.diary-content-wrapper::-webkit-scrollbar {
  width: 4px;
}

.diary-content-wrapper::-webkit-scrollbar-thumb {
  background: rgba(143, 184, 237, 0.3);
  border-radius: 2px;
}

/* 日记本样式 */
.diary-notebook {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 4px 20px rgba(143, 184, 237, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  min-height: 400px;
}

/* 日记头部 */
.diary-header {
  text-align: center;
  margin-bottom: 16px;
}

.diary-date {
  font-size: 18px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.diary-weather {
  font-size: 14px;
  color: #64748B;
}

/* 分隔线 */
.diary-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #8FB8ED 50%, transparent 100%);
  margin: 16px 0 20px;
  opacity: 0.5;
}

/* 日记正文 */
.diary-body {
  font-size: 15px;
  line-height: 2;
  color: #475569;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  position: relative;
}

/* 使用伪元素实现虚线横格线效果 */
.diary-body::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* 每2em（与line-height一致）画一条2px粗的线 */
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(2em - 2px),
    #8FB8ED calc(2em - 2px),
    #8FB8ED 2em
  );
  background-size: 100% 2em;
  /* 偏移让横线在文字下方 */
  background-position: 0 0;
  /* 虚线效果：8px实线 + 6px间隔 */
  -webkit-mask-image: repeating-linear-gradient(
    to right,
    black 0,
    black 8px,
    transparent 8px,
    transparent 14px
  );
  mask-image: repeating-linear-gradient(
    to right,
    black 0,
    black 8px,
    transparent 8px,
    transparent 14px
  );
  opacity: 0.5;
  pointer-events: none;
}

/* 日记内容样式 - 全局样式需要使用 :deep() */
.diary-body :deep(p) {
  margin: 0;
  text-indent: 2em;
}

/* 特殊样式类 */
.diary-body :deep(.strikethrough) {
  text-decoration: line-through;
  color: #94A3B8;
  opacity: 0.8;
}

.diary-body :deep(.highlight) {
  background-color: rgba(255, 235, 59, 0.4);
  padding: 0 4px;
  border-radius: 4px;
}

.diary-body :deep(.underline) {
  text-decoration: underline;
  text-decoration-style: dashed;
  text-decoration-color: #FFC8DD;
  text-underline-offset: 4px;
}

.diary-body :deep(.emphasis) {
  color: #FFC8DD;
  font-weight: 600;
}

.diary-body :deep(.handwritten) {
  font-family: 'Courier New', 'STKaiti', cursive;
  color: #334155;
  font-style: italic;
}

.diary-body :deep(.messy) {
  font-family: 'Courier New', 'STKaiti', cursive;
  color: #475569;
  transform: rotate(-1deg);
  display: inline-block;
}

/* 装饰元素 */
.diary-decoration {
  position: absolute;
  bottom: 20px;
  right: 24px;
}

.decoration-flower {
  font-size: 24px;
  color: #FFC8DD;
  opacity: 0.6;
}

/* 收集品展示 */
.collection-section {
  margin-top: 24px;
  padding-top: 8px;
}

.collection-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(143, 184, 237, 0.4) 50%, transparent 100%);
  margin-bottom: 16px;
}

.collection-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(255, 200, 221, 0.15) 0%, rgba(143, 184, 237, 0.15) 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 200, 221, 0.3);
}

.collection-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFC8DD 0%, #FFB6C1 100%);
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(255, 200, 221, 0.4);
}

.collection-info {
  flex: 1;
  min-width: 0;
}

.collection-label {
  font-size: 11px;
  color: #8FB8ED;
  font-weight: 500;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.collection-name {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.collection-desc {
  font-size: 13px;
  color: #64748B;
  line-height: 1.5;
}
</style>
