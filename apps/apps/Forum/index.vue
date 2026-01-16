<template>
  <div class="app-forum">
    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="forumState.isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在获取论坛数据...</span>
          <button class="abort-btn" @click="handleAbort">
            <i class="fas fa-stop"></i>
            <span>终止生成</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-down">
      <div v-if="forumState.error" class="error-toast" @click="forumState.error = null">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ forumState.error }}</span>
      </div>
    </Transition>

    <!-- 帖子详情页 -->
    <ForumPost v-if="showPostDetail" :post-title="selectedPostTitle" :initial-data="selectedPostData" @back="closePostDetail" />

    <!-- 论坛列表页 -->
    <template v-else>
      <!-- 顶部导航栏 -->
      <nav class="navbar">
        <div class="nav-back" @click="goHome">
          <i class="fas fa-chevron-left"></i>
        </div>
        <div class="nav-title">论坛</div>
        <div class="nav-right">
          <div class="refresh-btn" @click="refreshData">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
          </div>
        </div>
      </nav>

      <!-- 分类标签栏 -->
      <div class="category-bar">
        <div class="category-scroll">
          <a
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            :class="{ active: activeCategory === cat.id }"
            @click="setCategory(cat.id)"
          >
            {{ cat.name }}
          </a>
        </div>
      </div>

      <!-- 论坛内容 -->
      <div class="forum-container">

        <!-- 帖子列表 -->
        <div class="post-list">
          <!-- 置顶帖 -->
          <div v-if="pinnedPost" class="post-item sticky" @click="openPost(pinnedPost)">
            <h2 class="post-title">{{ pinnedPost.title }}</h2>
            <p class="post-content">{{ pinnedPost.content }}</p>
            <div class="post-meta">
              <div class="post-author-type">
                <span class="post-author">官方公告</span>
                <span class="post-type">置顶</span>
              </div>
              <div class="post-stats">
                <span class="post-stat"><i class="fas fa-eye"></i> {{ pinnedPost.views }}</span>
                <span class="post-stat"><i class="fas fa-comment-dots"></i> {{ pinnedPost.comments }}</span>
              </div>
            </div>
          </div>

          <!-- 普通帖子 -->
          <div
            v-for="post in filteredPosts"
            :key="post.title"
            class="post-item"
            @click="openPost(post)"
          >
            <h2 class="post-title">{{ post.title }}</h2>
            <p class="post-content">{{ post.content }}</p>
            <div class="post-meta">
              <div class="post-author-type">
                <span class="post-author">{{ post.author }}</span>
                <span class="post-type">{{ post.category }}</span>
              </div>
              <div class="post-stats">
                <span class="post-stat"><i class="fas fa-eye"></i> {{ post.views }}</span>
                <span class="post-stat"><i class="fas fa-comment-dots"></i> {{ post.comments }}</span>
                <span class="post-stat"><i class="fas fa-thumbs-up"></i> {{ post.likes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 发帖按钮 -->
      <button class="new-post-btn" @click="showPostModal = true">
        <i class="fas fa-pen-to-square"></i> 发表新帖
      </button>

      <!-- 发布帖子弹窗 -->
      <Transition name="fade">
        <div v-if="showPostModal" class="post-modal-overlay" @click.self="closePostModal">
          <div class="post-modal">
            <div class="post-modal-header">
              <span class="post-modal-title">发布新帖</span>
              <button class="post-modal-close" @click="closePostModal">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="post-modal-body">
              <input
                v-model="newPostTitle"
                class="post-title-input"
                placeholder="帖子标题"
              />
              <select v-model="newPostCategory" class="post-category-select">
                <option value="">选择分类</option>
                <option v-for="cat in categories.filter(c => c.id !== 'all')" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
              <textarea
                v-model="newPostContent"
                class="post-content-input"
                placeholder="分享你的想法..."
                rows="5"
              ></textarea>
            </div>
            <div class="post-modal-footer">
              <button class="post-cancel-btn" @click="closePostModal">取消</button>
              <button
                class="post-submit-btn"
                :disabled="!newPostTitle.trim() || !newPostCategory || !newPostContent.trim() || isPosting"
                @click="submitPost"
              >
                <i v-if="isPosting" class="fas fa-spinner fa-spin"></i>
                <span v-else>发布</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { store, forumState, loadForumDataFromAi, resetForumData, saveToTavernMessage, abortCurrentRequest } from '../../store';
import YAML from 'yaml';
import ForumPost from './ForumPost.vue';

// 帖子详情页状态
const showPostDetail = ref(false);
const selectedPostTitle = ref('');
const selectedPostData = ref<any>(null);

const openPost = (post: ForumPostType | typeof pinnedPost.value) => {
  selectedPostTitle.value = post?.title || '';
  selectedPostData.value = null;
  showPostDetail.value = true;
};

// 打开帖子详情页（带数据）
const openPostWithData = (postData: any) => {
  selectedPostTitle.value = postData?.title || '';
  selectedPostData.value = postData;
  showPostDetail.value = true;
};

const closePostDetail = () => {
  showPostDetail.value = false;
  selectedPostTitle.value = '';
  selectedPostData.value = null;
};

// 解析论坛数据
interface ForumPostType {
  title: string;
  content: string;
  author?: string;
  category?: string;
  views: number;
  comments: number;
  likes?: number;
}

interface ForumData {
  pinned?: {
    title: string;
    content: string;
    views: number;
    comments: number;
  };
  posts: ForumPostType[];
}

// 后备数据（空）
const fallbackForumData: ForumData = { posts: [] };

// 计算属性：获取论坛数据
const forumData = computed<ForumData>(() => {
  if (forumState.data) {
    return forumState.data as ForumData;
  }
  return fallbackForumData;
});

const pinnedPost = computed(() => forumData.value.pinned);
const posts = computed(() => forumData.value.posts || []);

// 分类
const categories = [
  { id: 'all', name: '全部', icon: 'fas fa-list' },
  { id: '分享', name: '分享', icon: 'fas fa-share-alt' },
  { id: '求助', name: '求助', icon: 'fas fa-hands-helping' },
  { id: '闲聊', name: '闲聊', icon: 'fas fa-comments' },
  { id: '爆料', name: '爆料', icon: 'fas fa-bomb' },
  { id: '吐槽', name: '吐槽', icon: 'fas fa-angry' },
  { id: '经验', name: '经验', icon: 'fas fa-lightbulb' },
];

const activeCategory = ref('all');

const setCategory = (cat: string) => {
  activeCategory.value = cat;
};

const filteredPosts = computed(() => {
  if (activeCategory.value === 'all') {
    return posts.value;
  }
  return posts.value.filter(p => p.category === activeCategory.value);
});

const goHome = () => {
  store.activeApp = 'home';
};

// 终止生成并返回主页
const handleAbort = () => {
  abortCurrentRequest();
  forumState.isLoading = false;
  store.activeApp = 'home';
};

// 发帖状态
const showPostModal = ref(false);
const newPostTitle = ref('');
const newPostCategory = ref('');
const newPostContent = ref('');
const isPosting = ref(false);

// 关闭发帖弹窗
const closePostModal = () => {
  showPostModal.value = false;
  newPostTitle.value = '';
  newPostCategory.value = '';
  newPostContent.value = '';
};

// 发布帖子
const submitPost = async () => {
  if (!newPostTitle.value.trim() || !newPostCategory.value || !newPostContent.value.trim() || isPosting.value) return;

  isPosting.value = true;

  try {
    const { postUserForumPost } = await import('../../预设/aiService');

    const result = await postUserForumPost(
      newPostTitle.value.trim(),
      newPostCategory.value,
      newPostContent.value.trim(),
      posts.value,
    );

    if (result.success && result.data) {
      // 保存到酒馆楼层
      await saveToTavernMessage('forumPost', result.data);

      // 关闭弹窗
      closePostModal();

      // 直接跳转到新帖子详情页
      openPostWithData(result.data);
    } else {
      forumState.error = result.error || '发布失败';
    }
  } catch (e) {
    forumState.error = e instanceof Error ? e.message : '发布时发生错误';
  } finally {
    isPosting.value = false;
  }
};

// 刷新状态
const isRefreshing = ref(false);

// 刷新数据
async function refreshData() {
  isRefreshing.value = true;
  resetForumData();
  await loadForumDataFromAi(true);
  isRefreshing.value = false;
}

// 组件挂载时加载数据
onMounted(() => {
  if (!forumState.loaded && !forumState.isLoading) {
    loadForumDataFromAi();
  }
});
</script>

<style scoped>
.app-forum {
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

/* 分类标签栏 */
.category-bar {
  background: #fff;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  overflow: hidden;
}

.category-scroll {
  display: flex;
  overflow-x: auto;
  padding: 10px 12px;
  gap: 8px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-item {
  flex-shrink: 0;
  color: #666;
  text-decoration: none;
  font-size: 13px;
  transition: all 0.2s;
  padding: 6px 14px;
  border-radius: 16px;
  font-weight: 500;
  cursor: pointer;
  background: #f5f5f5;
  white-space: nowrap;
}

.category-item:hover {
  background: #edf1fb;
  color: #6c8cd5;
}

.category-item.active {
  color: #fff;
  background: linear-gradient(135deg, #6c8cd5, #4a6fbf);
}

/* 论坛内容 */
.forum-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* 帖子列表 */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-item {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  border: 1px solid rgba(108, 140, 213, 0.1);
}

.post-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(108, 140, 213, 0.15);
  border-color: rgba(108, 140, 213, 0.2);
}

.post-item.sticky {
  background: #edf1fb;
  border: 1px solid #6c8cd5;
  position: relative;
  box-shadow: 0 2px 8px rgba(108, 140, 213, 0.1);
}

.post-item.sticky::after {
  content: '📌';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 14px;
  opacity: 0.7;
}

.post-title {
  font-size: 14px;
  color: #333;
  margin: 0 0 6px 0;
  font-weight: bold;
  padding-right: 20px;
}

.post-content {
  font-size: 12px;
  color: #666;
  margin: 0 0 10px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #999;
  flex-wrap: wrap;
  gap: 8px;
}

.post-author-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-author {
  font-weight: bold;
  color: #6c8cd5;
}

.post-type {
  background: #6c8cd5;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: normal;
}

.post-stats {
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.5);
  padding: 3px 8px;
  border-radius: 8px;
}

.post-stat {
  display: flex;
  align-items: center;
  gap: 3px;
  transition: color 0.2s;
}

.post-stat:hover {
  color: #6c8cd5;
}

.post-stat i {
  font-size: 11px;
  color: #6c8cd5;
  margin-right: 2px;
}

/* 发帖按钮 */
.new-post-btn {
  position: absolute;
  right: 16px;
  bottom: 16px;
  background: linear-gradient(45deg, #6c8cd5, #4a6fbf);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(108, 140, 213, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 18px;
  z-index: 100;
}

.new-post-btn i {
  margin-right: 6px;
}

.new-post-btn:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 8px 20px rgba(108, 140, 213, 0.5);
}

.new-post-btn:active {
  transform: translateY(0) scale(0.98);
}

/* 滚动条 */
.forum-container::-webkit-scrollbar {
  width: 6px;
}

.forum-container::-webkit-scrollbar-track {
  background: #f9f9f9;
  border-radius: 6px;
}

.forum-container::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #6c8cd5, #4a6fbf);
  border-radius: 6px;
}

/* 刷新按钮 */
.refresh-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.refresh-btn i {
  color: #6c8cd5;
  font-size: 14px;
}

/* 加载状态遮罩 */
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
  z-index: 1000;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6c8cd5;
}

.loading-spinner i {
  font-size: 32px;
}

.loading-spinner span {
  font-size: 14px;
  color: #666;
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
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
  font-size: 14px;
  z-index: 1001;
  cursor: pointer;
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

/* 发帖弹窗 */
.post-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.post-modal {
  width: 100%;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.post-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(108, 140, 213, 0.2);
}

.post-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.post-modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(108, 140, 213, 0.1);
  border-radius: 50%;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.post-modal-close:hover {
  background: rgba(108, 140, 213, 0.2);
  color: #6c8cd5;
}

.post-modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-title-input {
  width: 100%;
  border: 1px solid rgba(108, 140, 213, 0.3) !important;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  background: #fff !important;
  color: #333 !important;
  transition: all 0.2s;
}

.post-title-input:focus {
  border-color: #6c8cd5 !important;
}

.post-category-select {
  width: 100%;
  border: 1px solid rgba(108, 140, 213, 0.3) !important;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  background: #fff !important;
  color: #333 !important;
  cursor: pointer;
  transition: all 0.2s;
}

.post-category-select:focus {
  border-color: #6c8cd5 !important;
}

.post-content-input {
  width: 100%;
  border: 1px solid rgba(108, 140, 213, 0.3) !important;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
  outline: none;
  background: #fff !important;
  color: #333 !important;
  transition: all 0.2s;
  min-height: 100px;
}

.post-content-input:focus {
  border-color: #6c8cd5 !important;
}

.post-modal-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px 16px;
}

.post-cancel-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(108, 140, 213, 0.3);
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
}

.post-cancel-btn:hover {
  background: rgba(108, 140, 213, 0.05);
  color: #666;
}

.post-submit-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: linear-gradient(135deg, #6c8cd5, #4a6fbf);
  border-radius: 10px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.post-submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 140, 213, 0.3);
}

.post-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
