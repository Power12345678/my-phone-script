<template>
  <div class="diary-container">
    <!-- 日记详情页 -->
    <DiaryDetail
      v-if="showDetail"
      :diary="selectedDiary"
      @back="closeDetail"
    />

    <!-- 主页面 -->
    <template v-else>
      <!-- 顶部导航栏 -->
      <div class="nav-bar">
        <div class="nav-back" @click="goHome">
          <i class="fas fa-chevron-left"></i>
        </div>
        <div class="nav-title">日记</div>
        <div class="nav-placeholder"></div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>

      <!-- 空状态 - 没有角色 -->
      <div v-else-if="characters.length === 0" class="empty-state">
        <i class="fas fa-users"></i>
        <div class="empty-title">暂无角色</div>
        <div class="empty-desc">请先在角色卡中添加角色</div>
      </div>

      <!-- 正常显示 -->
      <template v-else>
        <!-- 角色选择区 -->
        <div class="character-section">
          <div class="section-title">选择角色</div>
          <div class="character-list">
            <div
              v-for="char in characters"
              :key="char.id"
              class="character-item"
              :class="{ active: selectedCharacter?.id === char.id }"
              @click="selectCharacter(char)"
            >
              <div class="avatar-wrapper">
                <div
                  class="character-avatar"
                  :style="{ backgroundImage: `url(${char.avatar})` }"
                ></div>
                <div v-if="getDiaryCount(char.name) > 0" class="diary-badge">
                  {{ getDiaryCount(char.name) }}
                </div>
              </div>
              <div class="character-name">{{ char.name }}</div>
            </div>
          </div>
        </div>

        <!-- 日记列表 -->
        <div v-if="selectedCharacter" class="diary-list-section">
          <div class="section-title">
            <span>{{ selectedCharacter.name }}的日记</span>
            <span class="diary-count">共 {{ diaries.length }} 篇</span>
          </div>
          <div v-if="diaries.length > 0" class="diary-list">
            <div
              v-for="diary in diaries"
              :key="diary.id"
              class="diary-item"
              @click="openDiary(diary)"
            >
              <div class="diary-date-badge">
                <div class="date-day">{{ getDayFromDate(diary.date) }}</div>
                <div class="date-month">{{ getMonthFromDate(diary.date) }}</div>
              </div>
              <div class="diary-info">
                <div class="diary-title">{{ diary.date }}</div>
                <div class="diary-weather">{{ diary.weather }}</div>
                <div class="diary-preview">{{ getPreview(diary.content) }}</div>
              </div>
              <div class="diary-arrow">
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
          <div v-else class="empty-diary-list">
            <span>该角色暂无日记</span>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div v-if="selectedCharacter" class="bottom-action">
          <button class="view-latest-btn" @click="generateNewDiary" :disabled="isGenerating">
            <template v-if="isGenerating">
              <i class="fas fa-spinner fa-spin"></i>
              <span>生成中...</span>
            </template>
            <template v-else>
              <i class="fas fa-magic"></i>
              <span>生成最新日记</span>
            </template>
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import _ from 'lodash';
import YAML from 'yaml';
import { store } from '../../store';
import { parseBasicInfo, getAvatarByName, type CharacterInfo } from '../../数据';
import DiaryDetail from './DiaryDetail.vue';

// 类型定义
interface Character {
  id: string;
  name: string;
  avatar: string;
}

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
  timestamp?: number;
}

// 状态
const characters = ref<Character[]>([]);
const allDiaries = ref<Diary[]>([]);
const selectedCharacter = ref<Character | null>(null);
const showDetail = ref(false);
const selectedDiary = ref<Diary | null>(null);
const isLoading = ref(true);
const isGenerating = ref(false);

// 计算当前角色的日记列表
const diaries = computed(() => {
  if (!selectedCharacter.value) return [];
  return allDiaries.value
    .filter(d => d.name === selectedCharacter.value?.name)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
});

// 从酒馆历史读取所有日记数据
function loadAllDiariesFromHistory(): Diary[] {
  const diaryList: Diary[] = [];

  try {
    const lastMsgId = getLastMessageId();
    if (lastMsgId < 0) return diaryList;

    const messages = getChatMessages(`0-${lastMsgId}`);
    if (!messages || messages.length === 0) return diaryList;

    // 正则匹配 phone_module type="diary" 标签
    const regex = /<phone_module\s+type="diary"\s+character="([^"]+)"[^>]*timestamp="(\d+)"[^>]*>([\s\S]*?)<\/phone_module>/g;
    // 备用正则，处理属性顺序不同的情况
    const regexAlt = /<phone_module[^>]*type="diary"[^>]*>([\s\S]*?)<\/phone_module>/g;

    let diaryId = 0;

    // 遍历所有楼层，收集所有日记
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      let match;

      // 尝试主正则
      while ((match = regex.exec(msg.message)) !== null) {
        try {
          const character = match[1];
          const timestamp = parseInt(match[2], 10);
          const yamlContent = match[3].trim();
          const parsed = YAML.parse(yamlContent);

          if (parsed) {
            diaryId++;
            diaryList.push({
              id: String(diaryId),
              date: parsed.date || '',
              weather: parsed.weather || '',
              name: character,
              content: parsed.content || '',
              collection: parsed.collection,
              timestamp,
            });
          }
        } catch (e) {
          console.warn(`[Diary] 解析楼层 ${i} 的日记数据失败:`, e);
        }
      }
      regex.lastIndex = 0;

      // 尝试备用正则（处理属性顺序不同的情况）
      while ((match = regexAlt.exec(msg.message)) !== null) {
        // 检查是否已经被主正则处理过
        const fullTag = msg.message.substring(match.index, match.index + match[0].indexOf('>') + 1);
        if (!fullTag.includes('type="diary"')) continue;

        const charMatch = fullTag.match(/character="([^"]+)"/);
        const tsMatch = fullTag.match(/timestamp="(\d+)"/);

        if (!charMatch) continue;

        // 检查是否已存在相同时间戳的日记
        const existingTs = tsMatch ? parseInt(tsMatch[1], 10) : 0;
        if (diaryList.some(d => d.timestamp === existingTs && d.name === charMatch[1])) continue;

        try {
          const yamlContent = match[1].trim();
          const parsed = YAML.parse(yamlContent);

          if (parsed) {
            diaryId++;
            diaryList.push({
              id: String(diaryId),
              date: parsed.date || '',
              weather: parsed.weather || '',
              name: charMatch[1],
              content: parsed.content || '',
              collection: parsed.collection,
              timestamp: existingTs,
            });
          }
        } catch (e) {
          console.warn(`[Diary] 解析楼层 ${i} 的日记数据失败(备用):`, e);
        }
      }
      regexAlt.lastIndex = 0;
    }

    console.info(`[Diary] 从历史中读取到 ${diaryList.length} 篇日记`);
  } catch (e) {
    console.error('[Diary] 读取日记历史失败:', e);
  }

  return diaryList;
}

// 从角色变量读取角色列表
function loadCharactersFromVariables(): Character[] {
  const basicInfo = parseBasicInfo();
  const charList: Character[] = [];

  if (basicInfo.characters && basicInfo.characters.length > 0) {
    basicInfo.characters.forEach((char, index) => {
      charList.push({
        id: char.id || String(index + 1),
        name: char.name,
        avatar: char.avatar || getAvatarByName(char.name),
      });
    });
  }

  return charList;
}

// 获取有日记的角色列表
function getCharactersWithDiaries(charList: Character[], diaryList: Diary[]): Character[] {
  const diaryCharNames = new Set(diaryList.map(d => d.name));

  // 筛选出有日记的角色
  const charsWithDiaries = charList.filter(c => diaryCharNames.has(c.name));

  // 如果有日记但角色不在列表中，添加到列表
  for (const name of diaryCharNames) {
    if (!charsWithDiaries.some(c => c.name === name)) {
      charsWithDiaries.push({
        id: `diary_char_${name}`,
        name,
        avatar: getAvatarByName(name),
      });
    }
  }

  return charsWithDiaries;
}

// 获取角色的日记数量
function getDiaryCount(charName: string): number {
  return allDiaries.value.filter(d => d.name === charName).length;
}

// 初始化数据
onMounted(() => {
  isLoading.value = true;

  // 从角色变量读取所有角色列表
  const charList = loadCharactersFromVariables();

  // 从酒馆历史读取所有日记
  const diaryList = loadAllDiariesFromHistory();
  allDiaries.value = diaryList;

  // 获取有日记但不在角色列表中的角色
  const diaryCharNames = new Set(diaryList.map(d => d.name));
  const extraChars: Character[] = [];
  for (const name of diaryCharNames) {
    if (!charList.some(c => c.name === name)) {
      extraChars.push({
        id: `diary_char_${name}`,
        name,
        avatar: getAvatarByName(name),
      });
    }
  }

  // 合并所有角色：角色变量中的角色 + 有日记但不在列表中的角色
  characters.value = [...charList, ...extraChars];

  // 默认选中第一个角色
  if (characters.value.length > 0) {
    selectedCharacter.value = characters.value[0];
  }

  isLoading.value = false;
  console.info('[Diary] 初始化完成:', {
    角色数: characters.value.length,
    日记数: diaryList.length,
  });
});

// 方法
const goHome = () => {
  store.activeApp = 'home';
};

const selectCharacter = (char: Character) => {
  selectedCharacter.value = char;
};

const openDiary = (diary: Diary) => {
  selectedDiary.value = diary;
  showDetail.value = true;
};

const closeDetail = () => {
  showDetail.value = false;
  selectedDiary.value = null;
};

const viewLatest = () => {
  if (diaries.value.length > 0) {
    openDiary(diaries.value[0]);
  }
};

// 生成新日记
const generateNewDiary = async () => {
  if (!selectedCharacter.value || isGenerating.value) return;

  const characterName = selectedCharacter.value.name;
  isGenerating.value = true;

  try {
    // 动态导入 AI 服务
    const { fetchDiaryDataFromAi, loadApiConfig } = await import('../../预设/aiService');

    // 检查 API 配置
    const apiConfig = loadApiConfig();
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
      console.error('[Diary] 请先在设置中配置 API');
      return;
    }

    console.info('[Diary] 开始生成日记，角色:', characterName);
    const result = await fetchDiaryDataFromAi(characterName);

    if (result.success && result.data) {
      // 处理 AI 返回的数据结构，可能是 { diary: {...} } 或直接 { date, weather, ... }
      const rawData = result.data;
      const diaryData = rawData.diary || rawData;
      const timestamp = Date.now();

      // 保存到酒馆聊天历史
      const yamlContent = YAML.stringify({
        date: diaryData.date || '',
        weather: diaryData.weather || '',
        content: diaryData.content || '',
        collection: diaryData.collection,
      });

      const messageContent = `<phone_module type="diary" character="${characterName}" timestamp="${timestamp}">\n${yamlContent}</phone_module>`;

      await createChatMessages([
        {
          role: 'assistant',
          message: messageContent,
          is_hidden: false,
        },
      ]);

      console.info('[Diary] 日记已保存到楼层');

      // 重新从历史记录加载所有日记，确保数据一致性
      const reloadedDiaries = loadAllDiariesFromHistory();
      allDiaries.value = reloadedDiaries;

      // 更新角色列表（保持与初始化时相同的逻辑：所有角色 + 有日记但不在列表中的角色）
      const charList = loadCharactersFromVariables();
      const diaryCharNames = new Set(reloadedDiaries.map(d => d.name));
      const extraChars: Character[] = [];
      for (const name of diaryCharNames) {
        if (!charList.some(c => c.name === name)) {
          extraChars.push({
            id: `diary_char_${name}`,
            name,
            avatar: getAvatarByName(name),
          });
        }
      }
      characters.value = [...charList, ...extraChars];

      // 查找并打开新生成的日记
      const newDiary = reloadedDiaries.find(d => d.timestamp === timestamp && d.name === characterName);
      if (newDiary) {
        openDiary(newDiary);
      }

      console.info('[Diary] 日记生成成功:', newDiary);
    } else {
      console.error('[Diary] 日记生成失败:', result.error);
    }
  } catch (e) {
    console.error('[Diary] 生成日记时发生错误:', e);
  } finally {
    isGenerating.value = false;
  }
};

// 工具函数
const getDayFromDate = (date: string) => {
  const match = date.match(/(\d+)日/);
  return match ? match[1] : '';
};

const getMonthFromDate = (date: string) => {
  const match = date.match(/(\d+)月/);
  return match ? match[1] + '月' : '';
};

const getPreview = (content: string) => {
  // 去除HTML标签，获取预览文本
  const text = content.replace(/<[^>]+>/g, '');
  return text.length > 40 ? text.substring(0, 40) + '...' : text;
};
</script>

<style scoped>
.diary-container {
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

.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.5px;
}

.nav-placeholder {
  width: 32px;
}

/* 角色选择区 */
.character-section {
  padding: 16px;
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diary-count {
  font-size: 12px;
  color: #94A3B8;
  font-weight: normal;
}

.character-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.character-list::-webkit-scrollbar {
  height: 0;
}

.character-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
  position: relative;
}

.character-item.active {
  background: linear-gradient(135deg, rgba(143, 184, 237, 0.4) 0%, rgba(233, 168, 200, 0.35) 100%);
  border-color: rgba(143, 184, 237, 0.5);
}

.character-item:active {
  transform: scale(0.96);
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.character-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
}

.diary-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #8FB8ED;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.character-name {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  text-align: center;
  max-width: 65px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 日记列表区 */
.diary-list-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.diary-list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
}

.diary-list::-webkit-scrollbar {
  width: 4px;
}

.diary-list::-webkit-scrollbar-thumb {
  background: rgba(143, 184, 237, 0.3);
  border-radius: 2px;
}

.diary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.diary-item:active {
  transform: scale(0.98);
  background: rgba(143, 184, 237, 0.1);
}

.diary-date-badge {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #8FB8ED 0%, #7AA8E0 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(143, 184, 237, 0.3);
}

.date-day {
  font-size: 18px;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.date-month {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 2px;
}

.diary-info {
  flex: 1;
  min-width: 0;
}

.diary-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 2px;
}

.diary-weather {
  font-size: 11px;
  color: #94A3B8;
  margin-bottom: 4px;
}

.diary-preview {
  font-size: 12px;
  color: #64748B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diary-arrow {
  color: #94A3B8;
  font-size: 12px;
  flex-shrink: 0;
}

/* 底部按钮 */
.bottom-action {
  padding: 12px 16px 20px;
  flex-shrink: 0;
}

.view-latest-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #8FB8ED 0%, #7AA8E0 100%);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(143, 184, 237, 0.4);
  transition: all 0.2s;
}

.view-latest-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(143, 184, 237, 0.3);
}

.view-latest-btn i {
  font-size: 16px;
}

/* 加载状态 */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #8FB8ED;
}

.loading-state i {
  font-size: 32px;
}

.loading-state span {
  font-size: 14px;
  color: #64748B;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
}

.empty-state i {
  font-size: 48px;
  color: #CBD5E1;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #64748B;
}

.empty-desc {
  font-size: 13px;
  color: #94A3B8;
}

/* 空日记列表 */
.empty-diary-list {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  font-size: 14px;
  padding: 40px 0;
}
</style>
