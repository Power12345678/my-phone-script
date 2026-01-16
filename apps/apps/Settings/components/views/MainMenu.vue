<template>
  <div class="settings-main">
    <!-- 导航栏 -->
    <div class="nav-bar">
      <div class="nav-left">
        <button class="nav-back" @click="handleBack">
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>
      <span class="nav-title">数据管理</span>
      <div class="nav-actions">
        <button class="nav-btn" @click="$emit('refresh')" title="刷新数据">
          <i class="fas fa-sync-alt"></i>
        </button>
        <button class="nav-btn" @click="$emit('importData')" title="导入数据">
          <i class="fas fa-file-import"></i>
        </button>
        <button class="nav-btn" @click="$emit('exportData')" title="导出数据">
          <i class="fas fa-file-export"></i>
        </button>
      </div>
    </div>

    <!-- 模块列表 -->
    <div class="modules-list">
      <!-- 用户数据 -->
      <div class="module-card" @click="$emit('navigate', 'user')">
        <div class="module-icon user-icon">
          <i class="fas fa-user"></i>
        </div>
        <div class="module-info">
          <div class="module-title">用户数据</div>
          <div class="module-desc">查看当前用户的个人信息</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 角色数据 -->
      <div class="module-card" @click="$emit('navigate', 'characters')">
        <div class="module-icon character-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="module-info">
          <div class="module-title">角色数据</div>
          <div class="module-desc">共 {{ characterCount }} 个角色</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 头像背景库 -->
      <div class="module-card" @click="$emit('navigate', 'avatars')">
        <div class="module-icon avatar-icon">
          <i class="fas fa-images"></i>
        </div>
        <div class="module-info">
          <div class="module-title">头像背景库</div>
          <div class="module-desc">{{ avatarCount }} 张头像 · {{ backgroundCount }} 张背景</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 音乐库 -->
      <div class="module-card" @click="$emit('navigate', 'music')">
        <div class="module-icon music-icon">
          <i class="fas fa-music"></i>
        </div>
        <div class="module-info">
          <div class="module-title">音乐库</div>
          <div class="module-desc">共 {{ musicCount }} 首歌曲</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 表情包库 -->
      <div class="module-card" @click="$emit('navigate', 'sticker')">
        <div class="module-icon sticker-icon">
          <i class="fas fa-smile"></i>
        </div>
        <div class="module-info">
          <div class="module-title">表情包库</div>
          <div class="module-desc">管理聊天表情包</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 角色图片库 -->
      <div class="module-card" @click="$emit('navigate', 'characterImages')">
        <div class="module-icon char-image-icon">
          <i class="fas fa-portrait"></i>
        </div>
        <div class="module-info">
          <div class="module-title">角色图片库</div>
          <div class="module-desc">管理角色图片资源</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 地图数据 -->
      <div class="module-card" @click="$emit('navigate', 'map')">
        <div class="module-icon map-icon">
          <i class="fas fa-map-marked-alt"></i>
        </div>
        <div class="module-info">
          <div class="module-title">地图数据</div>
          <div class="module-desc">{{ mapName }} · {{ districtCount }} 个地区</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- API 配置 -->
      <div class="module-card" @click="$emit('navigate', 'api')">
        <div class="module-icon api-icon">
          <i class="fas fa-plug"></i>
        </div>
        <div class="module-info">
          <div class="module-title">API 配置</div>
          <div class="module-desc">配置聊天接口地址和密钥</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 预设配置 -->
      <div class="module-card" @click="$emit('navigate', 'preset')">
        <div class="module-icon preset-icon">
          <i class="fas fa-sliders-h"></i>
        </div>
        <div class="module-info">
          <div class="module-title">预设配置</div>
          <div class="module-desc">管理预填充提示词</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 自动回复 -->
      <div class="module-card" @click="$emit('navigate', 'autoReply')">
        <div class="module-icon auto-reply-icon">
          <i class="fas fa-robot"></i>
        </div>
        <div class="module-info">
          <div class="module-title">自动回复</div>
          <div class="module-desc">AI主动发送消息设置</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>

      <!-- 其他设置 -->
      <div class="module-card" @click="$emit('navigate', 'other')">
        <div class="module-icon other-icon">
          <i class="fas fa-cog"></i>
        </div>
        <div class="module-info">
          <div class="module-title">其他设置</div>
          <div class="module-desc">显示设置等</div>
        </div>
        <i class="fas fa-chevron-right module-arrow"></i>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="footer-note">
      <i class="fas fa-edit"></i>
      <span>点击各项可编辑数据，修改后请保存</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { store } from '../../../../store';

defineProps<{
  characterCount: number;
  avatarCount: number;
  backgroundCount: number;
  musicCount: number;
  mapName: string;
  districtCount: number;
}>();

defineEmits<{
  (e: 'navigate', view: string): void;
  (e: 'refresh'): void;
  (e: 'importData'): void;
  (e: 'exportData'): void;
}>();

// 返回主屏幕
const handleBack = () => {
  store.activeApp = 'home';
};
</script>

<style scoped lang="scss">
/* 主页面 */
.settings-main {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: linear-gradient(180deg, #E8F4FD 0%, #F0F7FC 100%);
}

/* 导航栏 - 与用户数据页面保持一致 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(143, 184, 237, 0.15);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 72px;
}

.nav-back {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(143, 184, 237, 0.1);
  color: #8FB8ED;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 10px;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(143, 184, 237, 0.2);
  }
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #475569;
}

.nav-actions {
  display: flex;
  gap: 8px;
  min-width: 72px;
  justify-content: flex-end;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(143, 184, 237, 0.1);
  border: none;
  color: #8FB8ED;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(143, 184, 237, 0.2);
  }
}

/* 模块列表 */
.modules-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 20px rgba(143, 184, 237, 0.15);
  cursor: pointer;
  transition: all 0.2s;
}

.module-card:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.8);
}

.module-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  flex-shrink: 0;
}

.user-icon {
  background: linear-gradient(135deg, #8FB8ED, #7AA8E0);
}

.character-icon {
  background: linear-gradient(135deg, #A8D8B9, #8BC9A0);
}

.avatar-icon {
  background: linear-gradient(135deg, #FFC8DD, #FFB3C6);
}

.music-icon {
  background: linear-gradient(135deg, #A8D4F0, #8FB8ED);
}

.sticker-icon {
  background: linear-gradient(135deg, #B8C5D6, #9AACBD);
}

.char-image-icon {
  background: linear-gradient(135deg, #F0ABFC, #D946EF);
}

.map-icon {
  background: linear-gradient(135deg, #FFD699, #FFC266);
}

.api-icon {
  background: linear-gradient(135deg, #A78BFA, #8B5CF6);
}

.preset-icon {
  background: linear-gradient(135deg, #60A5FA, #3B82F6);
}

.auto-reply-icon {
  background: linear-gradient(135deg, #34D399, #10B981);
}

.other-icon {
  background: linear-gradient(135deg, #64748B, #475569);
}

.module-info {
  flex: 1;
  margin-left: 14px;
}

.module-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.module-desc {
  font-size: 13px;
  color: #94A3B8;
}

.module-arrow {
  color: #94A3B8;
  font-size: 14px;
}

/* 底部提示 */
.footer-note {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94A3B8;
  font-size: 13px;
}
</style>
