<template>
  <div class="forum-post">
    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在加载帖子内容...</span>
          <button class="abort-btn" @click="handleAbort">
            <i class="fas fa-stop"></i>
            <span>终止生成</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-down">
      <div v-if="loadError" class="error-toast" @click="loadError = null">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ loadError }}</span>
      </div>
    </Transition>

    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="nav-back" @click="goBack">
        <i class="fas fa-chevron-left"></i>
      </div>
      <div class="nav-title">帖子详情</div>
      <div class="nav-right"></div>
    </nav>

    <!-- 帖子内容区域 -->
    <div class="post-container">
      <!-- 帖子头部 -->
      <div class="post-header">
        <h1 class="post-title">{{ postData.title }}</h1>
        <div class="post-info">
          <span class="post-author">
            <i class="fas fa-user-circle"></i> {{ postData.author }}
          </span>
          <span class="post-stat">
            <i class="fas fa-eye"></i> {{ postData.views }}
          </span>
          <span class="post-stat">
            <i class="fas fa-comment-dots"></i> {{ postData.commentCount }}
          </span>
        </div>
      </div>

      <!-- 帖子正文 -->
      <div class="post-content">
        <div v-html="formattedContent"></div>
      </div>

      <!-- 评论区 -->
      <div class="comments-section">
        <h2 class="comments-title">
          <i class="fas fa-comments"></i> 评论区
        </h2>

        <!-- 评论列表 -->
        <div class="comment-list">
          <div
            v-for="(comment, index) in postData.comments"
            :key="index"
            class="comment-item"
          >
            <div class="comment-meta">
              <span class="comment-author">
                <i class="fas fa-user"></i> {{ comment.user }}
              </span>
              <span class="comment-time">
                <i class="far fa-clock"></i> {{ comment.time }}
              </span>
            </div>
            <div class="comment-content">{{ comment.content }}</div>

            <!-- 楼中楼 -->
            <div v-if="comment.replies && comment.replies.length > 0" class="sub-comments">
              <div
                v-for="(reply, rIndex) in comment.replies"
                :key="rIndex"
                class="sub-comment-item"
              >
                <span class="comment-author">
                  <i class="fas fa-reply"></i> {{ reply.user }}
                </span>
                <div class="comment-content">{{ reply.content }}</div>
              </div>
            </div>

            <!-- 内嵌回复输入框 -->
            <div v-if="replyingToIndex === index" class="inline-reply-box">
              <div class="inline-reply-header">
                <span class="inline-reply-label">
                  <i class="fas fa-reply"></i> 回复 {{ comment.user }}
                </span>
                <button class="inline-reply-close" @click="closeInlineReply">×</button>
              </div>
              <textarea
                v-model="replyContent"
                class="inline-reply-input"
                rows="2"
                placeholder="输入回复内容..."
              ></textarea>
              <button class="inline-reply-send" @click="sendInlineReply(index)">
                <i class="fas fa-paper-plane"></i> 发送
              </button>
            </div>

            <button v-else class="reply-btn" @click="showInlineReply(index)">
              <i class="fas fa-reply"></i> 回复
            </button>
          </div>
        </div>
      </div>

      <!-- 评论输入 -->
      <div class="comment-input-container">
        <textarea
          v-model="newComment"
          class="comment-input"
          rows="3"
          placeholder="发表你的看法..."
        ></textarea>
        <button class="submit-comment-btn" @click="submitComment">
          <i class="fas fa-paper-plane"></i> 发表评论
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import YAML from 'yaml';
import { saveToTavernMessage, abortCurrentRequest } from '../../store';

// Props
const props = defineProps<{
  postTitle: string;
  initialData?: any;
}>();

interface Reply {
  user: string;
  content: string;
}

interface Comment {
  user: string;
  time: string;
  content: string;
  replies?: Reply[];
}

interface PostData {
  title: string;
  author: string;
  views: number;
  commentCount: number;
  content: string;
  comments: Comment[];
}

const emit = defineEmits<{
  back: [];
}>();

// 后备数据（空）
const fallbackPostData: PostData = {
  title: '',
  author: '',
  time: '',
  content: '',
  views: 0,
  likes: 0,
  comments: [],
};

// 加载状态
const isLoading = ref(false);
const loadError = ref<string | null>(null);

// 帖子数据
const postData = ref<PostData>(fallbackPostData);

// 加载帖子数据
async function loadPostData() {
  // 如果有初始数据，直接使用
  if (props.initialData) {
    console.info('[ForumPost] 使用传入的初始数据');
    postData.value = props.initialData as PostData;
    return;
  }

  if (!props.postTitle) return;

  isLoading.value = true;
  loadError.value = null;

  try {
    const { fetchForumPostDataFromAi, loadApiConfig } = await import('../../预设/aiService');

    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      loadError.value = '请先在设置中配置 API';
      return;
    }

    const result = await fetchForumPostDataFromAi(props.postTitle);

    if (result.success && result.data) {
      postData.value = result.data as PostData;
      // 保存到楼层
      await saveToTavernMessage('forumPost', result.data);
    } else {
      loadError.value = result.error || '加载失败';
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载时发生未知错误';
  } finally {
    isLoading.value = false;
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPostData();
});

const formattedContent = computed(() => {
  return (postData.value.content || '').replace(/\n/g, '<br>');
});

const newComment = ref('');
const replyingToIndex = ref<number | null>(null);
const replyContent = ref('');

const goBack = () => {
  emit('back');
};

// 终止生成并返回
const handleAbort = () => {
  abortCurrentRequest();
  isLoading.value = false;
  emit('back');
};

const showInlineReply = (index: number) => {
  replyingToIndex.value = index;
  replyContent.value = '';
};

const closeInlineReply = () => {
  replyingToIndex.value = null;
  replyContent.value = '';
};

const sendInlineReply = (index: number) => {
  if (replyContent.value.trim()) {
    const comment = postData.value.comments[index];
    if (!comment.replies) {
      comment.replies = [];
    }
    comment.replies.push({
      user: '我',
      content: replyContent.value.trim(),
    });
    console.info('[ForumPost] Reply to', comment.user, ':', replyContent.value);
    closeInlineReply();
  }
};

const submitComment = () => {
  if (newComment.value.trim()) {
    console.info('[ForumPost] Submit comment:', newComment.value);
    newComment.value = '';
  }
};
</script>

<style scoped>
.forum-post {
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  position: relative;
}

/* 顶部导航栏 */
.navbar {
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  z-index: 100;
  min-height: 44px;
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.nav-back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c8cd5;
  cursor: pointer;
  font-size: 18px;
  border-radius: 50%;
  transition: background 0.2s;
}

.nav-back:hover {
  background: rgba(108, 140, 213, 0.1);
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.nav-right {
  width: 32px;
}

/* 帖子容器 */
.post-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 帖子头部 */
.post-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(108, 140, 213, 0.15);
}

.post-title {
  font-size: 18px;
  color: #6c8cd5;
  margin: 0 0 10px 0;
  font-weight: 600;
  line-height: 1.4;
}

.post-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #666;
  flex-wrap: wrap;
}

.post-author {
  font-weight: 500;
  color: #6c8cd5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.post-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.post-stat i {
  color: #6c8cd5;
}

/* 帖子正文 */
.post-content {
  background: rgba(255, 255, 255, 0.9);
  padding: 18px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(108, 140, 213, 0.1);
  font-size: 14px;
  line-height: 1.7;
  color: #333;
}

/* 评论区 */
.comments-section {
  margin-top: 20px;
}

.comments-title {
  font-size: 16px;
  color: #6c8cd5;
  margin: 0 0 14px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(108, 140, 213, 0.2);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  background: #fff;
  padding: 14px;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(108, 140, 213, 0.08);
  border: 1px solid rgba(108, 140, 213, 0.08);
}

.comment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: bold;
  color: #6c8cd5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.comment-time {
  font-size: 11px;
  color: #999;
  background: rgba(0, 0, 0, 0.03);
  padding: 2px 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.comment-content {
  color: #333;
  font-size: 13px;
  line-height: 1.5;
}

/* 楼中楼 */
.sub-comments {
  margin-top: 10px;
  padding-left: 16px;
  border-left: 2px solid rgba(108, 140, 213, 0.3);
  background: rgba(108, 140, 213, 0.03);
  border-radius: 0 8px 8px 0;
  padding-top: 8px;
  padding-bottom: 8px;
}

.sub-comment-item {
  padding: 6px 10px;
  margin-bottom: 4px;
  font-size: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
}

.sub-comment-item .comment-author {
  font-size: 11px;
  margin-bottom: 2px;
}

.sub-comment-item .comment-content {
  font-size: 12px;
  margin-top: 2px;
}

.reply-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.reply-btn:hover {
  color: #6c8cd5;
  background: rgba(108, 140, 213, 0.1);
}

/* 内嵌回复输入框 */
.inline-reply-box {
  margin-top: 10px;
  padding: 10px;
  background: rgba(108, 140, 213, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(108, 140, 213, 0.15);
}

.inline-reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.inline-reply-label {
  font-size: 12px;
  color: #6c8cd5;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.inline-reply-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.inline-reply-close:hover {
  color: #666;
  background: rgba(0, 0, 0, 0.05);
}

.inline-reply-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd !important;
  border-radius: 6px;
  font-size: 12px;
  resize: none;
  box-sizing: border-box;
  margin-bottom: 8px;
  transition: all 0.2s;
  background: #fff !important;
  color: #333 !important;
}

.inline-reply-input:focus {
  border-color: #6c8cd5 !important;
  box-shadow: 0 0 0 2px rgba(108, 140, 213, 0.1);
  outline: none;
}

.inline-reply-send {
  background: linear-gradient(135deg, #6c8cd5, #4a6fbf);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.inline-reply-send:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(108, 140, 213, 0.3);
}

/* 评论输入 */
.comment-input-container {
  margin-top: 20px;
  background: rgba(108, 140, 213, 0.03);
  padding: 14px;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.comment-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd !important;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 10px;
  resize: none;
  box-sizing: border-box;
  transition: all 0.2s;
  background: #fff !important;
  color: #333 !important;
}

.comment-input:focus {
  border-color: #6c8cd5 !important;
  box-shadow: 0 0 0 2px rgba(108, 140, 213, 0.1);
  outline: none;
}

.submit-comment-btn {
  background: linear-gradient(135deg, #6c8cd5, #4a6fbf);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.submit-comment-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(108, 140, 213, 0.3);
}

/* 滚动条 */
.post-container::-webkit-scrollbar {
  width: 5px;
}

.post-container::-webkit-scrollbar-track {
  background: #f9f9f9;
  border-radius: 5px;
}

.post-container::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #6c8cd5, #4a6fbf);
  border-radius: 5px;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6c8cd5;
  font-size: 14px;
}

.loading-spinner i {
  font-size: 28px;
}

/* 终止按钮 */
.abort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 20px;
  border: none;
  background: rgba(143, 184, 237, 0.9);
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.abort-btn:active {
  transform: scale(0.95);
  background: rgba(120, 160, 210, 0.95);
}

.abort-btn i {
  font-size: 12px;
  color: #fff;
}

.abort-btn span {
  color: #fff;
}

/* 错误提示 */
.error-toast {
  position: absolute;
  top: 60px;
  left: 16px;
  right: 16px;
  background: #ff6b6b;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 300;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
