<template>
  <div class="profile-page">
    <!-- 加载状态遮罩 -->
    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>正在获取动态主页数据...</span>
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

    <!-- 顶部背景区域 -->
    <div class="profile-section" :style="{ backgroundImage: `url(${characterData.dynamicBg})` }">
      <!-- 返回按钮 -->
      <div class="back-button" @click="goBack">
        <i class="fas fa-arrow-left"></i>
      </div>
      <!-- 刷新按钮 -->
      <div class="refresh-button" @click="refreshData">
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
      </div>
      <!-- 更多按钮 -->
      <div class="more-button" @click="showToast('更多选项')">
        <i class="fas fa-ellipsis-h"></i>
      </div>
      <!-- 渐变遮罩 -->
      <div class="profile-header-overlay"></div>
    </div>

    <!-- 个人信息卡片 -->
    <div class="profile-card">
      <!-- 头像容器 -->
      <div class="avatar-container">
        <div class="profile-avatar-wrapper" @click="handleAvatarClick">
          <img :src="characterData.avatar" class="profile-avatar" alt="Avatar" />
          <div class="online-badge"></div>
        </div>
      </div>

      <!-- 个人信息 -->
      <div class="profile-info">
        <div class="profile-name">
          {{ characterData.name }}
          <i class="fas fa-check-circle verified-badge"></i>
        </div>
        <div class="profile-username">{{ characterData.email || '@' + characterData.name }}</div>
        <div class="profile-bio">{{ characterData.bio || characterData.state || '这个人很懒，什么都没写~' }}</div>

        <!-- 操作按钮 -->
        <div class="profile-actions">
          <button class="action-btn primary" @click="handleMessage">
            <i class="fas fa-comment-dots"></i>
            <span>私信</span>
          </button>
          <button class="action-btn secondary" @click="handleFollow">
            <i class="fas fa-user-plus"></i>
            <span>关注</span>
          </button>
          <button class="action-btn icon-only" @click="handleShare">
            <i class="fas fa-share-alt"></i>
          </button>
        </div>

        <!-- 统计数据 -->
        <div class="profile-stats">
          <div class="stat-item" @click="showToast('查看关注中')">
            <span class="stat-value">{{ formatNumber(stats.following) }}</span>
            <span class="stat-label">关注</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" @click="showToast('查看粉丝')">
            <span class="stat-value">{{ formatNumber(stats.followers) }}</span>
            <span class="stat-label">粉丝</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" @click="showToast('查看获赞')">
            <span class="stat-value">{{ formatNumber(stats.likes) }}</span>
            <span class="stat-label">获赞</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tabs-container">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <i :class="tab.icon"></i>
        <span>{{ tab.label }}</span>
      </div>
    </div>

    <!-- 动态时间线 -->
    <div class="timeline">
      <div v-for="(post, index) in posts" :key="post.id" class="post-card" :style="{ animationDelay: `${index * 0.08}s` }">
        <!-- 动态头部 -->
        <div class="post-header">
          <div class="post-avatar-wrapper">
            <img :src="characterData.avatar" class="post-avatar" alt="Avatar" />
          </div>
          <div class="post-info">
            <div class="post-name">
              {{ characterData.name }}
              <i class="fas fa-check-circle verified-small"></i>
            </div>
            <div class="post-time">
              <i class="far fa-clock"></i>
              {{ post.time }}
            </div>
          </div>
          <div class="post-more" @click="showToast('更多操作')">
            <i class="fas fa-ellipsis-h"></i>
          </div>
        </div>

        <!-- 动态内容 -->
        <div class="post-content">{{ post.content }}</div>

        <!-- 动态配图 - 遮罩模式（与动态列表一致） -->
        <div
          v-if="post.image"
          class="post-image"
          :class="{ 'show-caption': activeImageId === post.id }"
          @click="toggleImageDescription(post.id)"
        >
          <i class="fas fa-image image-icon"></i>
          <div class="image-caption">{{ post.image }}</div>
        </div>

        <!-- 动态操作 -->
        <div class="post-actions">
          <div class="action-item" :class="{ active: post.liked }" @click="toggleLike(post)">
            <i class="fas fa-heart"></i>
            <span class="action-count">{{ post.likes }}</span>
          </div>
          <div class="action-item" :class="{ active: post.retweeted }" @click="toggleRetweet(post)">
            <i class="fas fa-share"></i>
            <span class="action-count">{{ post.shares }}</span>
          </div>
          <div class="action-item" @click="showToast('评论功能开发中')">
            <i class="fas fa-comment"></i>
            <span class="action-count">{{ post.comments }}</span>
          </div>
          <div class="action-item" @click="showToast('已收藏')">
            <i class="fas fa-bookmark"></i>
          </div>
        </div>

        <!-- 评论区 -->
        <div v-if="post.commentList && post.commentList.length > 0" class="comments-section">
          <div class="comments-header">
            <span>热门评论</span>
            <span class="comments-count">共 {{ post.comments }} 条</span>
          </div>
          <div v-for="(comment, cIndex) in post.commentList" :key="cIndex" class="comment-item">
            <div class="comment-avatar-wrapper">
              <img :src="getAvatarByName(comment.author)" class="comment-avatar" alt="Commenter" />
            </div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author" @click.stop="showToast(`查看${comment.author}的主页`)">{{ comment.author }}</span>
                <span class="comment-time">刚刚</span>
              </div>
              <div class="comment-text">{{ comment.content }}</div>
              <div class="comment-actions">
                <span class="comment-action" @click.stop="showToast('点赞评论')">
                  <i class="fas fa-heart"></i> 赞
                </span>
                <span class="comment-action" @click.stop="showToast('回复评论')">
                  <i class="fas fa-comment"></i> 回复
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <div class="bottom-nav">
      <div
        v-for="nav in navItems"
        :key="nav.key"
        class="nav-item"
        :class="{ active: activeNav === nav.key }"
        @click="handleNavClick(nav.key)"
      >
        <div class="nav-icon">
          <i :class="nav.icon"></i>
        </div>
        <span class="nav-text">{{ nav.label }}</span>
        <div v-if="nav.key === 'notification'" class="nav-badge">3</div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast-container">
        <div class="toast-content">
          <i class="fas fa-check-circle toast-icon"></i>
          <span>{{ toastMessage }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import _ from 'lodash';
import { store, loadCharacterModuleFromHistoryAsync, saveCharacterModuleToMessage, abortCurrentRequest } from '../../store';
import yaml from 'yaml';
import { getAvatarByName } from '../../数据/index';

// Props - 接收人物名称和头像
const props = defineProps<{
  userName: string;
  avatarUrl: string;
}>();

const emit = defineEmits(['back']);

// 加载动态主页数据
interface YamlComment {
  name: string;
  c: string;
}

interface YamlPost {
  content: string;
  image: string | null;
  likes: number;
  shares: number;
  commentCount: number;
  comments: YamlComment[];
}

interface HomepageData {
  name: string;
  signature: string;
  following: number;
  followers: number;
  likes: number;
  posts: YamlPost[];
}

// 后备数据（空）
const fallbackHomepageData: HomepageData = {
  signature: '',
  followers: 0,
  following: 0,
  likes: 0,
  posts: [],
};

// 加载状态
const isLoading = ref(false);
const loadError = ref<string | null>(null);

// 动态主页数据（响应式）
const homepageData = ref<HomepageData>(fallbackHomepageData);

// 加载动态主页数据
async function loadDynamicHomeData() {
  console.info('[Profile] 开始加载动态主页数据，人物:', props.userName);

  // 1. 先尝试从楼层历史读取（使用异步版本避免阻塞主线程）
  const historyData = await loadCharacterModuleFromHistoryAsync<HomepageData>('dynamicHome', props.userName);
  if (historyData) {
    console.info('[Profile] 从楼层历史加载到数据');
    homepageData.value = historyData;
    return;
  }

  // 2. 无历史数据，触发 AI 生成
  console.info('[Profile] 无历史数据，触发 AI 生成');
  isLoading.value = true;
  loadError.value = null;

  try {
    // 动态导入 aiService 避免循环依赖
    const { fetchDynamicHomeDataFromAi, loadApiConfig } = await import('../../预设/aiService');

    // 检查 API 配置
    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      loadError.value = '请先在设置中配置 API';
      return;
    }

    const result = await fetchDynamicHomeDataFromAi(props.userName);

    if (result.success && result.data) {
      console.info('[Profile] AI 生成成功:', result.data);
      homepageData.value = result.data as HomepageData;

      // 3. 保存到楼层
      await saveCharacterModuleToMessage('dynamicHome', props.userName, result.data);
    } else {
      loadError.value = result.error || '加载失败';
      console.error('[Profile] AI 生成失败:', result.error);
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载时发生未知错误';
    console.error('[Profile] 加载异常:', e);
  } finally {
    isLoading.value = false;
  }
}

// 刷新数据（强制重新生成）
const isRefreshing = ref(false);
async function refreshData() {
  isRefreshing.value = true;
  // 清空当前数据，强制 AI 重新生成
  homepageData.value = fallbackHomepageData;

  try {
    const { fetchDynamicHomeDataFromAi } = await import('../../预设/aiService');
    const result = await fetchDynamicHomeDataFromAi(props.userName);

    if (result.success && result.data) {
      homepageData.value = result.data as HomepageData;
      await saveCharacterModuleToMessage('dynamicHome', props.userName, result.data);
      showToast('刷新成功');
    } else {
      showToast(result.error || '刷新失败');
    }
  } catch (e) {
    showToast('刷新失败');
  } finally {
    isRefreshing.value = false;
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadDynamicHomeData();
});

// 从角色变量加载指定角色数据
const loadCharacterFromChat = (name: string) => {
  try {
    const charVars = getVariables({ type: 'character' });
    const phoneData = _.get(charVars, 'phone_data');
    if (phoneData && Array.isArray(phoneData.characters)) {
      return phoneData.characters.find((c: any) => c.name === name);
    }
  } catch (e) {
    console.warn('无法从角色变量加载角色数据:', e);
  }
  return null;
};

// 加载角色数据 - 使用 props 传入的人物名称
const basicInfo = { characters: [] as any[] };
const characterData = computed(() => {
  const chatChar = loadCharacterFromChat(props.userName);
  const basicChar = basicInfo.characters.find((c: any) => c.name === props.userName);
  const char = chatChar || basicChar || {};
  return {
    name: props.userName || char.name || '',
    avatar: props.avatarUrl || char.avatar || '',
    dynamicBg: char.dynamicBg || '',
    email: char.email || '',
    bio: homepageData.value.signature || char.bio || '',
    state: char.state,
  };
});

// 统计数据 - 从 homepageData 计算
const stats = computed(() => ({
  following: Number(homepageData.value.following) || 0,
  followers: Number(homepageData.value.followers) || 0,
  likes: Number(homepageData.value.likes) || 0,
}));

// 格式化数字，处理 undefined 情况
const formatNumber = (num: number | undefined | null): string => {
  const n = Number(num) || 0;
  if (n >= 10000) {
    return (n / 10000).toFixed(1) + 'w';
  } else if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'k';
  }
  return n.toString();
};

// 标签页
const tabs = ref([
  { key: 'posts', label: '动态', icon: 'fas fa-th-large' },
  { key: 'photos', label: '相册', icon: 'fas fa-images' },
  { key: 'likes', label: '喜欢', icon: 'fas fa-heart' },
]);
const activeTab = ref('posts');

// 底部导航
const navItems = ref([
  { key: 'home', label: '首页', icon: 'fas fa-home' },
  { key: 'discover', label: '发现', icon: 'fas fa-compass' },
  { key: 'notification', label: '消息', icon: 'fas fa-bell' },
  { key: 'profile', label: '我的', icon: 'fas fa-user' },
]);
const activeNav = ref('profile');

// 帖子交互状态
const postInteractionState = ref<Map<number, { liked: boolean; retweeted: boolean }>>(new Map());

// 时间标签
const timeLabels = ['2小时前', '5小时前', '1天前', '2天前', '3天前'];

// 动态帖子数据 - 从 homepageData 计算
const posts = computed(() =>
  (homepageData.value.posts || []).map((post, index) => {
    const state = postInteractionState.value.get(index) || { liked: false, retweeted: false };
    return {
      id: index + 1,
      content: post.content || '',
      time: post.time || timeLabels[index] || '昨天',
      comments: Number(post.commentCount) || 0,
      likes: (Number(post.likes) || 0) + (state.liked ? 1 : 0),
      shares: (Number(post.shares) || 0) + (state.retweeted ? 1 : 0),
      liked: state.liked,
      retweeted: state.retweeted,
      image: post.image || '',
      commentList: (post.comments || []).map(c => ({
        author: c.name || '',
        content: c.c || '',
      })),
    };
  })
);

// 当前显示描述的图片ID
const activeImageId = ref<number | null>(null);

// Toast 消息
const toastMessage = ref('');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const showToast = (message: string) => {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = message;
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 2000);
};

// 返回
const goBack = () => {
  store.chat.showProfile = false;
  emit('back');
};

// 终止生成并返回
const handleAbort = () => {
  abortCurrentRequest();
  isLoading.value = false;
  emit('back');
};

// 点击头像
const handleAvatarClick = () => {
  showToast('查看头像大图');
};

// 私信
const handleMessage = () => {
  showToast(`与${characterData.value.name}开始私聊`);
};

// 关注
const handleFollow = () => {
  showToast('已关注');
};

// 分享
const handleShare = () => {
  showToast('分享个人主页');
};

// 切换图片描述显示
const toggleImageDescription = (postId: number) => {
  if (activeImageId.value === postId) {
    activeImageId.value = null;
  } else {
    activeImageId.value = postId;
  }
};

// 点赞
const toggleLike = (post: (typeof posts.value)[0]) => {
  const index = post.id - 1;
  const current = postInteractionState.value.get(index) || { liked: false, retweeted: false };
  const newState = { ...current, liked: !current.liked };
  postInteractionState.value.set(index, newState);
  // 触发响应式更新
  postInteractionState.value = new Map(postInteractionState.value);
  showToast(newState.liked ? '已点赞' : '取消点赞');
};

// 转发
const toggleRetweet = (post: (typeof posts.value)[0]) => {
  const index = post.id - 1;
  const current = postInteractionState.value.get(index) || { liked: false, retweeted: false };
  const newState = { ...current, retweeted: !current.retweeted };
  postInteractionState.value.set(index, newState);
  // 触发响应式更新
  postInteractionState.value = new Map(postInteractionState.value);
  showToast(newState.retweeted ? '已转发' : '取消转发');
};

// 底部导航点击
const handleNavClick = (nav: string) => {
  if (nav === 'home') {
    goBack();
  } else {
    activeNav.value = nav;
    showToast(`${navItems.value.find(n => n.key === nav)?.label}功能开发中`);
  }
};
</script>

<style scoped>
/* MistyGlass 主题颜色变量 */
.profile-page {
  --primary: #8FB8ED;
  --primary-light: #B8D4F5;
  --primary-dark: #7AA8E0;
  --accent: #FFC8DD;
  --accent-light: #FFE0EC;
  --bg: #F0F6FC;
  --card: rgba(255, 255, 255, 0.6);
  --card-solid: #ffffff;
  --text: #475569;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;
  --border: rgba(255, 255, 255, 0.5);
  --shadow: rgba(143, 184, 237, 0.15);
  --glass-blur: blur(12px);
}

.profile-page {
  height: 100%;
  background: linear-gradient(135deg, #F0F6FC 0%, #E8F4FD 100%);
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}

.profile-page::-webkit-scrollbar {
  display: none;
}

.profile-page {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 顶部背景区域 */
.profile-section {
  position: relative;
  width: 100%;
  height: 200px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.profile-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(143, 184, 237, 0.3), rgba(255, 200, 221, 0.2));
}

.back-button,
.more-button {
  position: absolute;
  top: 12px;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px var(--shadow);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border);
}

.back-button {
  left: 12px;
}

.more-button {
  right: 12px;
}

.back-button:active,
.more-button:active {
  transform: scale(0.92);
}

.back-button i,
.more-button i {
  color: var(--primary);
  font-size: 14px;
}

.profile-header-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background: linear-gradient(to top, var(--bg), transparent);
}

/* 个人信息卡片 - MistyGlass 风格 */
.profile-card {
  position: relative;
  margin: -50px 16px 16px;
  padding: 60px 20px 24px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: var(--glass-blur);
  border-radius: 24px;
  box-shadow: 0 8px 32px var(--shadow);
  border: 1px solid var(--border);
  z-index: 5;
}

.avatar-container {
  position: absolute;
  top: -45px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  background: transparent !important;
}

.profile-avatar-wrapper {
  -webkit-tap-highlight-color: transparent;
  background: transparent;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  position: relative;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-avatar-wrapper:active {
  transform: scale(0.95);
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 50%;
}

.online-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 18px;
  height: 18px;
  background: #48bb78;
  border-radius: 50%;
  border: 3px solid var(--card-solid);
  box-shadow: 0 2px 8px rgba(72, 187, 120, 0.4);
}

.profile-info {
  text-align: center;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.verified-badge {
  color: var(--primary);
  font-size: 16px;
}

.profile-username {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.profile-bio {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
  padding: 0 10px;
}

/* 操作按钮 */
.profile-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  box-shadow: 0 4px 16px rgba(143, 184, 237, 0.4);
}

.action-btn.primary:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
}

.action-btn.secondary {
  background: var(--bg);
  color: var(--primary);
  border: 1.5px solid var(--primary-light);
}

.action-btn.secondary:active {
  transform: scale(0.95);
  background: var(--primary-light);
  color: white;
}

.action-btn.icon-only {
  width: 42px;
  height: 42px;
  padding: 0;
  justify-content: center;
  background: var(--bg);
  color: var(--text-secondary);
  border: 1.5px solid var(--border);
}

.action-btn.icon-only:active {
  transform: scale(0.95);
  background: var(--primary-light);
  color: white;
}

/* 统计数据 */
.profile-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
  padding: 16px 0 0;
  border-top: 1px solid var(--border);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  transition: transform 0.2s;
}

.stat-item:active {
  transform: scale(0.95);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}

/* 标签切换 - MistyGlass 风格 */
.tabs-container {
  display: flex;
  margin: 0 16px 12px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: var(--glass-blur);
  border-radius: 16px;
  padding: 6px;
  box-shadow: 0 4px 16px var(--shadow);
  border: 1px solid var(--border);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-item.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  box-shadow: 0 4px 12px rgba(143, 184, 237, 0.4);
}

.tab-item i {
  font-size: 14px;
}

/* 动态时间线 */
.timeline {
  flex: 1;
  padding: 0 16px 16px;
}

.post-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: var(--glass-blur);
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 12px;
  box-shadow: 0 4px 20px var(--shadow);
  border: 1px solid var(--border);
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards;
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

.post-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.post-avatar-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(143, 184, 237, 0.4);
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(143, 184, 237, 0.2);
}

.post-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.post-info {
  flex: 1;
}

.post-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 4px;
}

.verified-small {
  color: var(--primary);
  font-size: 12px;
}

.post-time {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.post-time i {
  font-size: 10px;
}

.post-more {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.post-more:active {
  background: var(--bg);
  color: var(--primary);
}

.post-content {
  font-size: 15px;
  color: var(--text);
  line-height: 1.7;
  margin-bottom: 14px;
  letter-spacing: 0.01em;
}

/* 动态配图 - 与动态列表一致的样式 */
.post-image {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 14px;
  margin-bottom: 14px;
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

/* 动态操作 */
.post-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid rgba(143, 184, 237, 0.15);
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-muted);
  font-size: 14px;
}

.action-item i {
  font-size: 16px;
}

.action-item:active {
  background: rgba(143, 184, 237, 0.1);
  transform: scale(0.95);
}

.action-item.active {
  color: var(--accent);
}

.action-count {
  font-size: 14px;
  font-weight: 500;
}

/* 评论区 - MistyGlass 风格 */
.comments-section {
  margin-top: 14px;
  padding: 14px;
  background: rgba(143, 184, 237, 0.1);
  border-radius: 16px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.comments-count {
  font-weight: 400;
  color: var(--text-muted);
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.comment-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.comment-avatar-wrapper {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.comment-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}

.comment-time {
  font-size: 11px;
  color: var(--text-muted);
}

.comment-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.comment-actions {
  display: flex;
  gap: 16px;
}

.comment-action {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}

.comment-action:active {
  color: var(--primary);
}

/* 底部导航 - MistyGlass 风格 */
.bottom-nav {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: var(--glass-blur);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 100;
  box-shadow: 0 -4px 20px var(--shadow);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-muted);
}

.nav-item.active {
  color: var(--primary);
}

.nav-item.active .nav-icon {
  transform: translateY(-2px);
}

.nav-icon {
  font-size: 20px;
  transition: transform 0.3s;
}

.nav-text {
  font-size: 10px;
  font-weight: 500;
}

.nav-badge {
  position: absolute;
  top: 4px;
  right: 8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--accent);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Toast 提示 - 相对手机边框固定 */
.toast-container {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(143, 184, 237, 0.4);
}

.toast-icon {
  font-size: 16px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px) scale(0.9);
}

/* 加载状态遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
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
  color: var(--primary);
}

.loading-spinner i {
  font-size: 32px;
}

.loading-spinner span {
  font-size: 14px;
  color: var(--text-secondary);
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

.error-toast i {
  font-size: 16px;
}

/* 刷新按钮 */
.refresh-button {
  position: absolute;
  top: 12px;
  right: 56px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: var(--glass-blur);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px var(--shadow);
  border: 1px solid var(--border);
}

.refresh-button:active {
  transform: scale(0.92);
}

.refresh-button i {
  color: var(--primary);
  font-size: 14px;
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
