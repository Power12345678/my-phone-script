<template>
  <div class="music-player">
    <!-- 头部 -->
    <div class="player-header">
      <button class="header-button" @click="handleBack">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="player-title">正在播放</div>
      <div class="header-buttons">
        <button class="header-button" @click="toggleSearch">
          <i class="fas fa-search"></i>
        </button>
        <button class="header-button" @click="togglePlaylist">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>

    <!-- 唱片 -->
    <div class="vinyl-container">
      <div class="vinyl" :class="{ playing: isPlaying }">
        <!-- 光影效果层 -->
        <div class="vinyl-shine"></div>
        <div class="vinyl-reflection"></div>
        <svg width="100%" height="100%" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
          <circle cx="110" cy="110" r="110" fill="#111" />
          <circle cx="110" cy="110" r="109" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
          <circle v-for="r in [105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40]" :key="r" cx="110" cy="110" :r="r" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
          <circle cx="110" cy="110" r="35" fill="#d5d5d5" stroke="rgba(0,0,0,0.2)" stroke-width="1" />
          <circle cx="110" cy="110" r="34" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.5" />
          <circle cx="110" cy="110" r="28" fill="#c0c0c0" stroke="rgba(0,0,0,0.1)" stroke-width="0.5" />
          <circle cx="110" cy="110" r="20" fill="#b0b0b0" stroke="rgba(0,0,0,0.1)" stroke-width="0.5" />
          <circle cx="110" cy="110" r="5" fill="#000" />
          <circle cx="110" cy="110" r="4.5" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5" />
        </svg>
        <div class="vinyl-center">
          <div class="vinyl-hole"></div>
        </div>
      </div>
    </div>

    <!-- 歌曲信息 -->
    <div class="song-info">
      <div class="song-title">{{ currentSong?.title || '加载中...' }}</div>
      <div class="song-artist">{{ currentSong?.artist || '加载中...' }}</div>
    </div>

    <!-- 进度条 -->
    <div class="progress-container">
      <div class="progress-bar" @click="seekTo">
        <div class="progress-current" :style="{ width: progressPercent + '%' }">
          <div class="progress-handle"></div>
        </div>
      </div>
      <div class="progress-time">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="controls">
      <button class="control-button" @click="toggleVolumeSlider">
        <i class="fas" :class="volumeIcon"></i>
      </button>
      <button class="control-button" @click="prevSong">
        <i class="fas fa-step-backward"></i>
      </button>
      <button class="control-button play-button" @click="togglePlay">
        <i class="fas" :class="isPlaying ? 'fa-pause' : 'fa-play'"></i>
      </button>
      <button class="control-button" @click="nextSong">
        <i class="fas fa-step-forward"></i>
      </button>
      <button class="control-button" @click="togglePlayMode">
        <i class="fas" :class="playMode === 'sequence' ? 'fa-sync-alt' : 'fa-random'"></i>
      </button>
    </div>

    <!-- 音量控制 -->
    <Transition name="fade">
      <div v-if="showVolume" class="volume-slider-container">
        <div class="volume-slider" @click="setVolume">
          <div class="volume-slider-current" :style="{ height: volume * 100 + '%' }">
            <div class="volume-slider-handle"></div>
          </div>
        </div>
        <div class="volume-value">{{ Math.round(volume * 100) }}%</div>
      </div>
    </Transition>

    <!-- 播放列表 -->
    <Transition name="slide-up">
      <div v-if="showPlaylist" class="playlist">
        <div class="playlist-header">
          <div class="playlist-title">播放列表</div>
          <button class="close-playlist" @click="togglePlaylist">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="playlist-items">
          <div
            v-for="(song, index) in songs"
            :key="index"
            class="playlist-item"
            :class="{ active: index === currentIndex }"
            @click="playSong(index)"
          >
            <div class="playlist-item-number">{{ index + 1 }}</div>
            <div class="playlist-item-info">
              <div class="playlist-item-title">{{ song.title }}</div>
              <div class="playlist-item-artist">{{ song.artist }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 搜索弹窗 -->
    <Transition name="slide-up">
      <div v-if="showSearch" class="search-panel">
        <div class="search-header">
          <div class="search-input-container">
            <i class="fas fa-search search-icon"></i>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="搜索歌曲或歌手"
              @keyup.enter="performSearch"
            />
            <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <button class="close-search" @click="toggleSearch">取消</button>
        </div>
        <div class="search-content">
          <!-- 搜索状态提示 -->
          <div v-if="isSearching" class="search-status">
            <i class="fas fa-spinner fa-spin"></i>
            <span>正在搜索...</span>
          </div>
          <div v-else-if="searchError" class="search-status error">
            <i class="fas fa-exclamation-circle"></i>
            <span>{{ searchError }}</span>
          </div>
          <div v-else-if="searchResults.length === 0 && hasSearched" class="search-status">
            <i class="fas fa-music"></i>
            <span>未找到相关歌曲</span>
          </div>
          <!-- 搜索结果列表 -->
          <div v-else class="search-results">
            <div
              v-for="(result, index) in searchResults"
              :key="index"
              class="search-result-item"
              @click="playSearchResult(result)"
            >
              <div class="result-cover" v-if="result.cover">
                <img :src="result.cover" alt="cover" />
              </div>
              <div class="result-cover placeholder" v-else>
                <i class="fas fa-music"></i>
              </div>
              <div class="result-info">
                <div class="result-title">{{ result.title }}</div>
                <div class="result-artist">{{ result.artist }}</div>
              </div>
              <div class="result-source">{{ result.source }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import {
  store,
  initMusicData,
  musicTogglePlay,
  musicPrev,
  musicNext,
  musicPlaySong,
  musicSeek,
  musicSetVolume,
  musicToggleMode,
  musicAddSong,
  musicLoadSong,
  getGlobalAudio,
  type Song,
} from '../../store';

interface SearchResult {
  title: string;
  artist: string;
  url: string;
  cover: string;
  source: '网易云' | 'QQ音乐';
}

// UI 状态（仅本组件使用）
const showPlaylist = ref(false);
const showVolume = ref(false);

// 搜索状态
const showSearch = ref(false);
const searchQuery = ref('');
const searchResults = ref<SearchResult[]>([]);
const isSearching = ref(false);
const searchError = ref('');
const hasSearched = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

// 从 store 获取响应式数据
const songs = computed(() => store.music.songs);
const currentIndex = computed(() => store.music.currentIndex);
const isPlaying = computed(() => store.music.isPlaying);
const currentTime = computed(() => store.music.currentTime);
const duration = computed(() => store.music.duration);
const volume = computed(() => store.music.volume);
const playMode = computed(() => store.music.playMode);

// 计算属性
const currentSong = computed(() => songs.value[currentIndex.value]);
const progressPercent = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0));
const volumeIcon = computed(() => {
  if (volume.value === 0) return 'fa-volume-mute';
  if (volume.value < 0.5) return 'fa-volume-down';
  return 'fa-volume-up';
});

// 格式化时间
const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// 播放控制 - 使用全局 store 函数
const togglePlay = () => musicTogglePlay();
const prevSong = () => musicPrev();
const nextSong = () => musicNext();
const togglePlayMode = () => musicToggleMode();

// 播放指定歌曲
const playSong = (index: number) => {
  musicPlaySong(index);
  showPlaylist.value = false;
};

// 跳转进度
const seekTo = (e: MouseEvent) => {
  if (!duration.value) return;
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  musicSeek(percent * duration.value);
};

// 设置音量
const setVolume = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
  musicSetVolume(percent);
};

// 切换音量显示
const toggleVolumeSlider = () => {
  showVolume.value = !showVolume.value;
};

// 切换播放列表
const togglePlaylist = () => {
  showPlaylist.value = !showPlaylist.value;
};

// 返回主屏幕
const handleBack = () => {
  store.activeApp = 'home';
};

// 初始化
onMounted(() => {
  // 初始化音乐数据（如果还没有加载）
  if (store.music.songs.length === 0) {
    initMusicData();
  }

  // 如果有歌曲但还没有加载任何歌曲，随机选择一首
  if (store.music.songs.length > 0 && !store.music.isPlaying && store.music.currentTime === 0) {
    const randomIndex = Math.floor(Math.random() * store.music.songs.length);
    musicLoadSong(randomIndex);
  }
});

// ========== 在线搜索功能 ==========

// HTTP GET 请求
const httpGet = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('HTTP请求失败:', error);
    return null;
  }
};

// 检测音频可用性
const checkAudioAvailability = (url: string): Promise<boolean> => {
  return new Promise(resolve => {
    const testAudio = new Audio();
    testAudio.preload = 'metadata';

    const cleanup = () => {
      testAudio.src = '';
      testAudio.load();
    };

    testAudio.onloadedmetadata = () => {
      cleanup();
      resolve(true);
    };

    testAudio.onerror = () => {
      cleanup();
      resolve(false);
    };

    // 超时处理
    setTimeout(() => {
      cleanup();
      resolve(false);
    }, 5000);

    testAudio.src = url;
    testAudio.load();
  });
};

// 切换搜索面板
const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    showPlaylist.value = false;
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
};

// 执行搜索
const performSearch = async () => {
  const query = searchQuery.value.trim();
  if (!query) return;

  isSearching.value = true;
  searchError.value = '';
  searchResults.value = [];
  hasSearched.value = true;

  try {
    // 先搜索网易云
    const neteaseResults = await searchNetease(query);
    searchResults.value = [...neteaseResults];

    // 再搜索QQ音乐
    const qqResults = await searchQQ(query);
    searchResults.value = [...searchResults.value, ...qqResults];

    if (searchResults.value.length === 0) {
      searchError.value = '';
    }
  } catch (error) {
    console.error('搜索失败:', error);
    searchError.value = '搜索失败，请稍后重试';
  } finally {
    isSearching.value = false;
  }
};

// 搜索网易云音乐
const searchNetease = async (query: string): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  try {
    const url = `https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(query)}`;
    const response = await httpGet(url);
    if (!response?.data?.length) return results;

    // 获取前5个结果的URL
    for (const item of response.data.slice(0, 5)) {
      if (!item.id) continue;
      try {
        const detailUrl = `https://api.vkeys.cn/v2/music/netease?id=${item.id}`;
        const detail = await httpGet(detailUrl);
        if (detail?.data?.url) {
          const isAvailable = await checkAudioAvailability(detail.data.url);
          if (isAvailable) {
            results.push({
              title: item.song || item.name || item.title || '未知歌曲',
              artist: item.singer || item.artist || '未知歌手',
              url: detail.data.url,
              cover: item.cover || '',
              source: '网易云',
            });
          }
        }
      } catch (e) {
        console.warn('获取网易云音源失败:', e);
      }
      // 最多返回3个有效结果
      if (results.length >= 3) break;
    }
  } catch (error) {
    console.error('网易云搜索失败:', error);
  }
  return results;
};

// 搜索QQ音乐
const searchQQ = async (query: string): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  try {
    const cleanQuery = query.replace(/\s/g, '');
    const url = `https://api.vkeys.cn/v2/music/tencent?word=${encodeURIComponent(cleanQuery)}`;
    const response = await httpGet(url);
    if (!response?.data?.length) return results;

    let cover = '';
    const ids: string[] = [];
    const songInfoMap = new Map<string, any>();

    // 收集所有ID和歌曲信息
    for (const data of response.data) {
      if (!cover && data.cover) cover = data.cover;
      if (data.id) {
        ids.push(String(data.id));
        songInfoMap.set(String(data.id), data);
      }
      if (data.grp) {
        for (const grp of data.grp) {
          if (grp.id) {
            ids.push(String(grp.id));
            songInfoMap.set(String(grp.id), grp);
          }
        }
      }
    }

    // 遍历ID获取有效音源
    for (const id of ids.slice(0, 5)) {
      try {
        const detailUrl = `https://api.vkeys.cn/v2/music/tencent?id=${id}`;
        const detail = await httpGet(detailUrl);
        if (!detail?.data?.url) continue;

        const isAvailable = await checkAudioAvailability(detail.data.url);
        if (isAvailable) {
          const songData = songInfoMap.get(id) || response.data[0];
          results.push({
            title: songData?.song || songData?.name || songData?.title || '未知歌曲',
            artist: songData?.singer || songData?.artist || '未知歌手',
            url: detail.data.url,
            cover: songData?.cover || cover || '',
            source: 'QQ音乐',
          });
        }
      } catch (e) {
        console.warn('获取QQ音源失败:', e);
      }
      // 最多返回3个有效结果
      if (results.length >= 3) break;
    }
  } catch (error) {
    console.error('QQ音乐搜索失败:', error);
  }
  return results;
};

// 播放搜索结果
const playSearchResult = (result: SearchResult) => {
  // 添加到播放列表开头
  const newSong: Song = {
    url: result.url,
    artist: result.artist,
    title: result.title,
  };
  musicAddSong(newSong);

  // 播放新添加的歌曲（索引0）
  musicPlaySong(0);

  // 关闭搜索面板
  showSearch.value = false;
};
</script>

<style scoped>
.music-player {
  height: 100%;
  background-color: #121212;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 20px 20px;
  color: #fff;
  position: relative;
}

/* 头部 */
.player-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-button {
  width: 36px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.header-button:active {
  opacity: 0.7;
}

.player-title {
  font-size: 16px;
  font-weight: bold;
}

.header-buttons {
  display: flex;
  gap: 4px;
}

/* 唱片 */
.vinyl-container {
  width: 200px;
  height: 200px;
  margin-bottom: 25px;
}

.vinyl {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  animation: rotate 20s linear infinite;
  animation-play-state: paused;
}

.vinyl.playing {
  animation-play-state: running;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 光影效果 - 模拟自然光源 */
.vinyl-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse 80% 50% at 30% 20%,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.03) 50%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 10;
  animation: counter-rotate 20s linear infinite;
  animation-play-state: paused;
}

/* 边缘微光 */
.vinyl-reflection {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse 50% 25% at 25% 15%,
    rgba(255, 255, 255, 0.06) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 11;
  animation: counter-rotate 20s linear infinite;
  animation-play-state: paused;
}

.vinyl.playing .vinyl-shine,
.vinyl.playing .vinyl-reflection {
  animation-play-state: running;
}

/* 反向旋转，使光影看起来固定在光源位置 */
@keyframes counter-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

.vinyl-center {
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: radial-gradient(circle at center, #e0e0e0, #b0b0b0);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
}

.vinyl-hole {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #000;
  box-shadow: inset 0 0 3px rgba(255, 255, 255, 0.3);
}

/* 歌曲信息 */
.song-info {
  text-align: center;
  margin-bottom: 25px;
  width: 100%;
}

.song-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 14px;
  color: #aaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 进度条 */
.progress-container {
  width: 100%;
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: height 0.2s ease;
}

.progress-bar:hover {
  height: 8px;
}

.progress-current {
  height: 100%;
  background: linear-gradient(90deg, #888888, #aaaaaa);
  border-radius: 3px;
  position: relative;
  transition: width 0.1s linear;
}

.progress-handle {
  position: absolute;
  top: 50%;
  right: -6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transform: translateY(-50%) scale(0);
  opacity: 0;
  transition: transform 0.2s, opacity 0.2s;
}

.progress-bar:hover .progress-handle {
  transform: translateY(-50%) scale(1);
  opacity: 1;
}

.progress-time {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #aaa;
}

/* 控制按钮 */
.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.control-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
  font-size: 14px;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-button:active {
  transform: scale(0.95);
}

.play-button {
  width: 56px;
  height: 56px;
  background: #888888;
  font-size: 18px;
}

.play-button:hover {
  background: #aaaaaa;
}

/* 音量控制 */
.volume-slider-container {
  position: absolute;
  bottom: 140px;
  left: 20px;
  width: 40px;
  height: 140px;
  background: rgba(18, 18, 18, 0.95);
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 0;
  z-index: 10;
}

.volume-slider {
  width: 6px;
  height: 90px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.volume-slider-current {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(0deg, #888888, #aaaaaa);
  border-radius: 3px;
}

.volume-slider-handle {
  position: absolute;
  top: 0;
  left: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

.volume-value {
  font-size: 11px;
  color: #fff;
}

/* 播放列表 */
.playlist {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 65%;
  background: rgba(18, 18, 18, 0.98);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.playlist-title {
  font-size: 16px;
  font-weight: bold;
}

.close-playlist {
  width: 28px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.playlist-items {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.playlist-items::-webkit-scrollbar {
  display: none;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.playlist-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.playlist-item.active {
  background: rgba(136, 136, 136, 0.15);
}

.playlist-item-number {
  width: 24px;
  text-align: center;
  font-size: 13px;
  color: #aaa;
  flex-shrink: 0;
}

.playlist-item-info {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
}

.playlist-item-title {
  font-size: 14px;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-item-artist {
  font-size: 12px;
  color: #aaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* 搜索面板 */
.search-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(18, 18, 18, 0.98);
  z-index: 30;
  display: flex;
  flex-direction: column;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.search-input-container {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 8px 12px;
  gap: 8px;
}

.search-icon {
  color: #aaa;
  font-size: 14px;
}

.search-input {
  flex: 1;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: #fff !important;
  font-size: 14px;
}

.search-input::placeholder {
  color: #666 !important;
}

.clear-search {
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-search {
  background: transparent;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

.search-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.search-content::-webkit-scrollbar {
  display: none;
}

.search-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #666;
}

.search-status i {
  font-size: 32px;
}

.search-status.error {
  color: #e74c3c;
}

.search-status.error i {
  color: #e74c3c;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  gap: 12px;
}

.search-result-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.result-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.result-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-cover.placeholder {
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 18px;
}

.result-info {
  flex: 1;
  overflow: hidden;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-artist {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-source {
  font-size: 10px;
  color: #666;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  flex-shrink: 0;
}
</style>
