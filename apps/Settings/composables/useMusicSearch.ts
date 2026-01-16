import { ref } from 'vue';
import type { MusicSearchResult } from '../types';

export function useMusicSearch() {
  // 音乐搜索状态
  const showMusicSearch = ref(false);
  const musicSearchResults = ref<MusicSearchResult[]>([]);
  const isMusicSearching = ref(false);
  const musicSearchError = ref('');
  const hasMusicSearched = ref(false);

  // 音乐URL输入弹窗状态
  const showMusicUrlModal = ref(false);

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

  // 搜索网易云音乐
  const searchNetease = async (query: string): Promise<MusicSearchResult[]> => {
    const results: MusicSearchResult[] = [];
    try {
      const url = `https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(query)}`;
      const response = await httpGet(url);
      if (!response?.data?.length) return results;

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
        if (results.length >= 3) break;
      }
    } catch (error) {
      console.error('网易云搜索失败:', error);
    }
    return results;
  };

  // 搜索QQ音乐
  const searchQQ = async (query: string): Promise<MusicSearchResult[]> => {
    const results: MusicSearchResult[] = [];
    try {
      const cleanQuery = query.replace(/\s/g, '');
      const url = `https://api.vkeys.cn/v2/music/tencent?word=${encodeURIComponent(cleanQuery)}`;
      const response = await httpGet(url);
      if (!response?.data?.length) return results;

      let cover = '';
      const ids: string[] = [];
      const songInfoMap = new Map<string, any>();

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
        if (results.length >= 3) break;
      }
    } catch (error) {
      console.error('QQ音乐搜索失败:', error);
    }
    return results;
  };

  // 打开音乐搜索面板
  const openMusicSearchPanel = () => {
    showMusicSearch.value = true;
    musicSearchResults.value = [];
    musicSearchError.value = '';
    hasMusicSearched.value = false;
  };

  // 打开音乐URL输入弹窗
  const openMusicUrlModal = () => {
    showMusicUrlModal.value = true;
  };

  // 执行音乐搜索
  const handleMusicSearch = async (query: string) => {
    if (!query) return;

    isMusicSearching.value = true;
    musicSearchError.value = '';
    musicSearchResults.value = [];
    hasMusicSearched.value = true;

    try {
      // 先搜索网易云
      const neteaseResults = await searchNetease(query);
      musicSearchResults.value = [...neteaseResults];

      // 再搜索QQ音乐
      const qqResults = await searchQQ(query);
      musicSearchResults.value = [...musicSearchResults.value, ...qqResults];

      if (musicSearchResults.value.length === 0) {
        musicSearchError.value = '';
      }
    } catch (error) {
      console.error('搜索失败:', error);
      musicSearchError.value = '搜索失败，请稍后重试';
    } finally {
      isMusicSearching.value = false;
    }
  };

  return {
    // 状态
    showMusicSearch,
    musicSearchResults,
    isMusicSearching,
    musicSearchError,
    hasMusicSearched,
    showMusicUrlModal,
    // 方法
    openMusicSearchPanel,
    openMusicUrlModal,
    handleMusicSearch,
    // 工具函数（可能被其他地方使用）
    httpGet,
    checkAudioAvailability,
    searchNetease,
    searchQQ,
  };
}
