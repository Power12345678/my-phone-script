<template>
  <div class="dynamic-container">
    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="dynamicState.isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在获取动态数据...</span>
          <button class="abort-btn" @click="handleAbort">
            <i class="fas fa-stop"></i>
            <span>终止生成</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-down">
      <div v-if="dynamicState.error" class="error-toast" @click="clearDynamicError">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ dynamicState.error }}</span>
        <button class="error-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </Transition>

    <!-- 个人动态主页 -->
    <Profile v-if="showProfile" :user-name="selectedUserName" :avatar-url="selectedAvatarUrl" @back="closeProfile" />

    <!-- 动态列表页面 -->
    <template v-else>
      <!-- 顶部导航栏 -->
      <div class="nav-bar">
        <div class="nav-back" @click="goHome">
          <i class="fas fa-chevron-left"></i>
        </div>
        <div class="nav-logo">动态</div>
        <div class="nav-refresh" @click="refresh">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
        </div>
      </div>

      <!-- 动态列表 -->
      <div class="timeline">
        <div v-for="(post, index) in posts" :key="index" class="post">
          <!-- 帖子头部 -->
          <div class="post-header">
            <div
              class="post-avatar"
              :class="{ 'my-post-avatar': post.isMyPost }"
              :style="{ backgroundImage: `url(${getAvatar(post.name, post.isMyPost)})` }"
              @click="!post.isMyPost && openProfile(post.name)"
            ></div>
            <div class="post-info">
              <div class="post-name" :class="{ 'my-post-name': post.isMyPost }" @click="!post.isMyPost && openProfile(post.name)">
                {{ getDisplayName(post.name, post.isMyPost) }}
              </div>
              <div class="post-time">{{ post.time || '刚刚' }}</div>
            </div>
            <div class="post-more">
              <i class="fas fa-ellipsis-h"></i>
            </div>
          </div>

          <!-- 帖子内容 -->
          <div class="post-content">{{ post.content }}</div>

          <!-- 帖子图片（纯遮罩+文字模拟） -->
          <div
            v-if="post.image"
            class="post-image"
            :class="{ 'show-caption': post.showCaption }"
            @click="toggleCaption(post)"
          >
            <i class="fas fa-image image-icon"></i>
            <div class="image-caption">{{ post.image }}</div>
          </div>

          <!-- 互动按钮 -->
          <div class="post-actions">
            <div class="post-action" :class="{ liked: post.liked }" @click="toggleLike(post)">
              <i class="fas fa-heart"></i>
              <span>{{ post.likes }}</span>
            </div>
            <div class="post-action" :class="{ shared: post.shared }" @click="toggleShare(post)">
              <i class="fas fa-retweet"></i>
              <span>{{ post.shares }}</span>
            </div>
            <div class="post-action">
              <i class="fas fa-comment"></i>
              <span>{{ post.commentCount }}</span>
            </div>
            <div class="post-action">
              <i class="fas fa-bookmark"></i>
            </div>
          </div>

          <!-- 评论区 -->
          <div v-if="post.comments && post.comments.length > 0" class="comments">
            <div v-for="(comment, cIndex) in post.comments.slice(0, 3)" :key="cIndex" class="comment">
              <div
                class="comment-avatar"
                :style="{ backgroundImage: `url(${getAvatar(comment.name)})` }"
                @click="openProfile(comment.name)"
              ></div>
              <div class="comment-bubble">
                <span class="comment-name" @click="openProfile(comment.name)">{{ comment.name }}</span>
                <span class="comment-text">{{ comment.c }}</span>
              </div>
            </div>
            <div v-if="post.comments.length > 3" class="more-comments">
              查看全部 {{ post.commentCount }} 条评论
            </div>
          </div>
        </div>
      </div>

      <!-- 底部导航 -->
      <div class="bottom-nav">
        <div class="bottom-nav-item active">
          <i class="fas fa-home"></i>
          <span>首页</span>
        </div>
        <div class="bottom-nav-item">
          <i class="fas fa-search"></i>
          <span>发现</span>
        </div>
        <div class="bottom-nav-item add-btn" @click="showPostModal = true">
          <i class="fas fa-plus"></i>
        </div>
        <div class="bottom-nav-item">
          <i class="fas fa-bell"></i>
          <span>通知</span>
        </div>
        <div class="bottom-nav-item" @click="goHome">
          <i class="fas fa-user"></i>
          <span>我的</span>
        </div>
      </div>

      <!-- 发布动态弹窗 -->
      <Transition name="fade">
        <div v-if="showPostModal" class="post-modal-overlay" @click.self="closePostModal">
          <div class="post-modal">
            <div class="post-modal-header">
              <span class="post-modal-title">发布动态</span>
              <button class="post-modal-close" @click="closePostModal">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="post-modal-body">
              <textarea
                v-model="newPostContent"
                class="post-input"
                placeholder="分享你的想法..."
                rows="4"
              ></textarea>
              <input
                v-model="newPostImage"
                class="image-input"
                placeholder="配图描述（可选，如：一张咖啡照片）"
              />
            </div>
            <div class="post-modal-footer">
              <button class="post-cancel-btn" @click="closePostModal">取消</button>
              <button
                class="post-submit-btn"
                :disabled="!newPostContent.trim() || isPosting"
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
import yaml from 'yaml';
import _ from 'lodash';
import { store, dynamicState, loadDynamicDataFromAi, saveToTavernMessage, abortCurrentRequest } from '../../store';
import { getAvatarByName } from '../../数据/index';
import Profile from './Profile.vue';

// 默认空数据
const fallbackDynamicData = { posts: [] };
const defaultBaseInfo = { user: { name: '用户', avatar: '' } };

// 从角色变量加载用户数据
const loadUserFromChat = () => {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData?.user) {
      return phoneData.user;
    }
  } catch (e) {
    console.warn('[Dynamic] 无法从角色变量加载用户数据:', e);
  }
  return null;
};

// 用户信息（优先从聊天变量读取）
const chatUser = loadUserFromChat();
const userInfo = computed(() => chatUser || defaultBaseInfo.user || {
  name: '我',
  avatar: 'https://files.catbox.moe/arh2ub.JPG',
});

// 计算属性：获取动态数据（优先使用AI获取的数据，否则使用后备yaml数据）
const dynamicData = computed(() => {
  if (dynamicState.data) {
    return dynamicState.data;
  }
  return fallbackDynamicData;
});

// 组件挂载时触发AI加载
onMounted(() => {
  console.info('[Dynamic] onMounted 触发');
  console.info('[Dynamic] dynamicState.loaded:', dynamicState.loaded);
  console.info('[Dynamic] dynamicState.isLoading:', dynamicState.isLoading);

  // 如果还没有加载过数据，则触发AI加载
  if (!dynamicState.loaded && !dynamicState.isLoading) {
    console.info('[Dynamic] 开始调用 loadDynamicDataFromAi');
    loadDynamicDataFromAi();
  } else {
    console.info('[Dynamic] 跳过加载（已加载或正在加载）');
  }
});

// 个人主页状态
const showProfile = ref(false);
const selectedUserName = ref('');
const selectedAvatarUrl = ref('');

// 发布动态状态
const showPostModal = ref(false);
const newPostContent = ref('');
const newPostImage = ref('');
const isPosting = ref(false);

// 角色头像映射
const avatarMap: Record<string, string> = {
  '林若曦': 'https://files.catbox.moe/flrjca.JPG',
  '樱田绘美': 'https://files.catbox.moe/etauns.JPG',
  '莫雪澜': 'https://files.catbox.moe/0o4xd1.JPG',
};

// 随机头像库
const randomAvatars = [
  'https://files.catbox.moe/arh2ub.JPG',
  'https://files.catbox.moe/7eb3q3.JPG',
  'https://files.catbox.moe/o5ana8.JPG',
  'https://files.catbox.moe/0ihdnf.JPG',
  'https://files.catbox.moe/8zru9e.JPG',
  'https://files.catbox.moe/n4uy3d.JPG',
];

// 帖子配图占位
const postImages = [
  'https://files.catbox.moe/95u7ec.JPG',
  'https://files.catbox.moe/o84j4n.jpg',
  'https://files.catbox.moe/su7nkc.JPG',
];

// 时间显示列表
const timeLabels = ['刚刚', '1小时前', '2小时前', '3小时前', '5小时前', '昨天'];

// 帖子交互状态（用于记录点赞、转发等状态）
const postInteractionState = ref<Map<number, { liked: boolean; shared: boolean; showCaption: boolean }>>(new Map());

// 从数据读取并添加交互状态
const posts = computed(() =>
  (dynamicData.value.posts || []).map((post: any, index: number) => {
    const state = postInteractionState.value.get(index) || { liked: false, shared: false, showCaption: false };
    return {
      ...post,
      liked: state.liked,
      shared: state.shared,
      showCaption: state.showCaption,
      time: post.time || timeLabels[index] || '昨天',
      // 保持原始的likes和shares，交互时动态计算
      _originalLikes: post.likes,
      _originalShares: post.shares,
      likes: post.likes + (state.liked ? 1 : 0),
      shares: post.shares + (state.shared ? 1 : 0),
    };
  })
);

const isRefreshing = ref(false);

// 获取头像（支持我的动态，支持网名匹配）
const getAvatar = (name: string, isMyPost?: boolean) => {
  // 如果是我的动态，使用用户头像
  if (isMyPost) {
    return userInfo.value.avatar;
  }
  // 优先使用统一的头像获取函数（支持姓名和网名匹配）
  const avatar = getAvatarByName(name);
  if (avatar) {
    return avatar;
  }
  // 回退到本地映射
  if (avatarMap[name]) {
    return avatarMap[name];
  }
  // 根据名字生成固定的随机头像
  const index = name.charCodeAt(0) % randomAvatars.length;
  return randomAvatars[index];
};

// 获取显示名称（支持我的动态）
const getDisplayName = (name: string, isMyPost?: boolean) => {
  if (isMyPost) {
    return userInfo.value.name || '我';
  }
  return name;
};

// 获取帖子图片
const getPostImage = (imageDesc: string) => {
  const index = imageDesc.charCodeAt(0) % postImages.length;
  return postImages[index];
};

// 返回主页
const goHome = () => {
  store.activeApp = 'home';
};

// 打开个人主页
const openProfile = (name: string) => {
  selectedUserName.value = name;
  selectedAvatarUrl.value = getAvatar(name);
  showProfile.value = true;
};

// 关闭个人主页
const closeProfile = () => {
  showProfile.value = false;
  selectedUserName.value = '';
  selectedAvatarUrl.value = '';
};

// 刷新 - 强制调用AI重新生成数据
const refresh = async () => {
  isRefreshing.value = true;
  // 重置状态以便重新加载
  dynamicState.loaded = false;
  postInteractionState.value.clear();
  // 传入 true 强制刷新，跳过历史读取，直接调用AI生成
  await loadDynamicDataFromAi(true);
  isRefreshing.value = false;
};

// 关闭发布弹窗
const closePostModal = () => {
  showPostModal.value = false;
  newPostContent.value = '';
  newPostImage.value = '';
};

// 发布动态
const submitPost = async () => {
  if (!newPostContent.value.trim() || isPosting.value) return;

  isPosting.value = true;

  try {
    const { postUserDynamic } = await import('../../预设/aiService');

    const result = await postUserDynamic(
      newPostContent.value.trim(),
      newPostImage.value.trim() || null,
      dynamicData.value.posts || [],
    );

    if (result.success && result.data) {
      // 更新动态数据
      dynamicState.data = result.data;
      // 清空交互状态
      postInteractionState.value.clear();
      // 保存到酒馆楼层
      await saveToTavernMessage('dynamic', result.data);
      closePostModal();
    } else {
      dynamicState.error = result.error || '发布失败';
    }
  } catch (e) {
    dynamicState.error = e instanceof Error ? e.message : '发布时发生错误';
  } finally {
    isPosting.value = false;
  }
};

// 获取帖子索引
const getPostIndex = (post: any): number => {
  return posts.value.findIndex(p => p.content === post.content && p.name === post.name);
};

// 点赞
const toggleLike = (post: any) => {
  const index = getPostIndex(post);
  if (index === -1) return;

  const currentState = postInteractionState.value.get(index) || { liked: false, shared: false, showCaption: false };
  postInteractionState.value.set(index, {
    ...currentState,
    liked: !currentState.liked,
  });
  // 触发响应式更新
  postInteractionState.value = new Map(postInteractionState.value);
};

// 转发
const toggleShare = (post: any) => {
  const index = getPostIndex(post);
  if (index === -1) return;

  const currentState = postInteractionState.value.get(index) || { liked: false, shared: false, showCaption: false };
  postInteractionState.value.set(index, {
    ...currentState,
    shared: !currentState.shared,
  });
  // 触发响应式更新
  postInteractionState.value = new Map(postInteractionState.value);
};

// 切换图片说明显示
const toggleCaption = (post: any) => {
  const index = getPostIndex(post);
  if (index === -1) return;

  const currentState = postInteractionState.value.get(index) || { liked: false, shared: false, showCaption: false };
  postInteractionState.value.set(index, {
    ...currentState,
    showCaption: !currentState.showCaption,
  });
  // 触发响应式更新
  postInteractionState.value = new Map(postInteractionState.value);
};

// 清除动态错误
const clearDynamicError = () => {
  dynamicState.error = null;
};

// 终止生成并返回主页
const handleAbort = () => {
  abortCurrentRequest();
  dynamicState.isLoading = false;
  store.activeApp = 'home';
};
</script>

<style scoped>
.dynamic-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #F0F6FC 0%, #E8F4FD 100%);
}

/* 顶部导航栏 - MistyGlass风格 */
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

.nav-logo {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.5px;
}

.nav-refresh {
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

.nav-refresh:active {
  background: rgba(143, 184, 237, 0.2);
}

/* 动态列表 */
.timeline {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.timeline::-webkit-scrollbar {
  width: 4px;
}

.timeline::-webkit-scrollbar-thumb {
  background: rgba(143, 184, 237, 0.3);
  border-radius: 2px;
}

/* 帖子卡片 - MistyGlass风格 */
.post {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 20px rgba(143, 184, 237, 0.15);
  transition: transform 0.2s;
}

.post:active {
  transform: scale(0.995);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.post-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(143, 184, 237, 0.4);
  box-shadow: 0 2px 10px rgba(143, 184, 237, 0.2);
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.post-avatar:active {
  transform: scale(0.95);
  border-color: rgba(143, 184, 237, 0.7);
}

.post-info {
  flex: 1;
}

.post-name {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: color 0.2s;
}

.post-name:active {
  color: #8FB8ED;
}

/* 我的动态样式 */
.my-post-avatar {
  border-color: rgba(255, 200, 221, 0.6);
  box-shadow: 0 2px 10px rgba(255, 200, 221, 0.3);
  cursor: default;
}

.my-post-avatar:active {
  transform: none;
}

.my-post-name {
  color: #FFC8DD;
  cursor: default;
}

.my-post-name:active {
  color: #FFC8DD;
}

.post-time {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 2px;
}

.post-more {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.post-more:active {
  background: rgba(143, 184, 237, 0.15);
  color: #8FB8ED;
}

.post-content {
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
  margin-bottom: 12px;
}

/* 帖子图片（纯遮罩模拟） */
.post-image {
  width: 100%;
  aspect-ratio: 16/10;
  border-radius: 14px;
  margin-bottom: 12px;
  position: relative;
  overflow: hidden;
  background: rgba(143, 184, 237, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.post-image:active {
  transform: scale(0.98);
}

.image-icon {
  font-size: 32px;
  color: rgba(143, 184, 237, 0.6);
  transition: opacity 0.3s ease;
}

.post-image.show-caption .image-icon {
  opacity: 0;
}

.image-caption {
  padding: 20px;
  color: #444444;
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
  white-space: pre-wrap;
  opacity: 0;
  position: absolute;
  transition: opacity 0.3s ease;
}

.post-image.show-caption {
  background: rgba(255, 255, 255, 0.9);
}

.post-image.show-caption .image-caption {
  opacity: 1;
}

/* 互动按钮 */
.post-actions {
  display: flex;
  justify-content: space-between;
  padding: 10px 4px 6px;
  border-top: 1px solid rgba(143, 184, 237, 0.15);
}

.post-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 20px;
  color: #94A3B8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.post-action:active {
  transform: scale(0.95);
  background: rgba(143, 184, 237, 0.1);
}

.post-action.liked {
  color: #FFC8DD;
}

.post-action.liked i {
  color: #FFC8DD;
}

.post-action.shared {
  color: #8FB8ED;
}

.post-action.shared i {
  color: #8FB8ED;
}

/* 评论区 */
.comments {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(143, 184, 237, 0.1);
}

.comment {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.comment-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 1.5px solid rgba(143, 184, 237, 0.3);
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.comment-avatar:active {
  transform: scale(0.95);
  border-color: rgba(143, 184, 237, 0.6);
}

.comment-bubble {
  flex: 1;
  background: rgba(143, 184, 237, 0.1);
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 12px;
  color: #475569;
  line-height: 1.4;
}

.comment-name {
  font-weight: 600;
  color: #8FB8ED;
  margin-right: 6px;
  cursor: pointer;
  transition: color 0.2s;
}

.comment-name:active {
  color: #7AA8E0;
}

.comment-text {
  color: #475569;
}

.more-comments {
  font-size: 12px;
  color: #8FB8ED;
  text-align: center;
  padding: 8px 0 4px;
  cursor: pointer;
  transition: color 0.2s;
}

.more-comments:active {
  color: #7AA8E0;
}

/* 底部导航 - MistyGlass风格 */
.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 12px 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  color: #94A3B8;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 12px;
}

.bottom-nav-item i {
  font-size: 18px;
}

.bottom-nav-item.active {
  color: #8FB8ED;
}

.bottom-nav-item:active {
  transform: scale(0.95);
  background: rgba(143, 184, 237, 0.1);
}

/* 发布按钮 */
.bottom-nav-item.add-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  gap: 0;
  justify-content: center;
  background: linear-gradient(135deg, #8FB8ED 0%, #7AA8E0 100%);
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.4);
  margin-top: -10px;
}

.bottom-nav-item.add-btn i {
  font-size: 20px;
}

.bottom-nav-item.add-btn span {
  display: none;
}

.bottom-nav-item.add-btn:active {
  transform: scale(0.9);
  background: linear-gradient(135deg, #7AA8E0 0%, #6090D0 100%);
}

/* 加载状态遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(240, 246, 252, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #8FB8ED;
}

.loading-spinner i {
  font-size: 32px;
}

.loading-spinner span {
  font-size: 14px;
  color: #475569;
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
  left: 12px;
  right: 12px;
  background: rgba(255, 200, 221, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #944;
  font-size: 13px;
  z-index: 101;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 150, 180, 0.3);
}

.error-toast i {
  font-size: 16px;
  flex-shrink: 0;
}

.error-toast span {
  flex: 1;
}

.error-close {
  background: none;
  border: none;
  color: #944;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 发布动态弹窗 */
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.post-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(143, 184, 237, 0.2);
}

.post-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
}

.post-modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 50%;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-modal-body {
  padding: 16px;
}

.post-input {
  width: 100%;
  border: 1px solid rgba(143, 184, 237, 0.3) !important;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  resize: none;
  outline: none;
  background: rgba(255, 255, 255, 0.8) !important;
  color: #475569 !important;
  margin-bottom: 12px;
}

.post-input:focus {
  border-color: #8FB8ED !important;
}

.image-input {
  width: 100%;
  border: 1px solid rgba(143, 184, 237, 0.3) !important;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  outline: none;
  background: rgba(255, 255, 255, 0.8) !important;
  color: #475569 !important;
}

.image-input:focus {
  border-color: #8FB8ED !important;
}

.post-modal-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px 16px;
}

.post-cancel-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(143, 184, 237, 0.3);
  background: transparent;
  border-radius: 12px;
  font-size: 14px;
  color: #94A3B8;
  cursor: pointer;
}

.post-submit-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: linear-gradient(135deg, #8FB8ED 0%, #7AA8E0 100%);
  border-radius: 12px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.post-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
