import { ref, computed } from 'vue';
import yaml from 'yaml';
import type { PhoneData, BaseInfo, MusicData } from '../types';
import { updateUserFont } from '../../../store';

export function useDataLoader() {
  // 默认空数据（作为回退）
  const defaultBaseInfo: BaseInfo = {
    user: {
      id: 'user',
      name: '用户',
      nickname: '',
      avatar: '',
      email: '',
      bio: '',
      state: '在线',
    },
    characters: [],
    groups: [],
    randomAvatars: [],
    backgrounds: [],
    map: { name: '', districts: [] },
  };
  const defaultMusicData: MusicData = { songs: [] };

  // 从角色变量加载手机数据
  const loadPhoneDataFromChat = (): PhoneData | null => {
    try {
      const charVars = getVariables({ type: 'character' });
      const phoneData = _.get(charVars, 'phone_data') as PhoneData | undefined;
      if (phoneData && phoneData.user && phoneData.characters) {
        return phoneData;
      }
    } catch (e) {
      console.warn('无法从角色变量加载手机数据:', e);
    }
    return null;
  };

  // 保存手机数据到角色变量
  const savePhoneDataToChat = (data: PhoneData) => {
    try {
      insertOrAssignVariables({ phone_data: data }, { type: 'character' });
    } catch (e) {
      console.error('保存手机数据到角色变量失败:', e);
    }
  };

  // 响应式数据（优先从聊天变量读取，回退到YAML默认值）
  const phoneData = ref<PhoneData | null>(null);

  // 计算属性：基本信息（兼容原有代码）
  const baseInfo = computed<BaseInfo>(() => {
    if (phoneData.value) {
      return {
        user: phoneData.value.user,
        characters: phoneData.value.characters,
        randomAvatars: phoneData.value.randomAvatars,
        backgrounds: phoneData.value.backgrounds,
        map: phoneData.value.map,
      };
    }
    return defaultBaseInfo;
  });

  // 计算属性：音乐数据
  const musicData = computed<MusicData>(() => {
    if (phoneData.value && phoneData.value.music) {
      return { songs: phoneData.value.music };
    }
    return defaultMusicData;
  });

  // 初始化加载数据
  const initPhoneData = () => {
    const loaded = loadPhoneDataFromChat();
    if (loaded) {
      phoneData.value = loaded;
      console.info('从聊天变量加载手机数据成功');
    } else {
      console.info('使用YAML默认数据');
    }
  };

  // 可编辑数据（深拷贝，用于编辑）
  const editableData = ref<PhoneData | null>(null);

  // 跟踪是否是新建的项目（用于返回时撤销未保存的新建）
  const isNewCharacter = ref<boolean>(false);
  const isNewGroup = ref<boolean>(false);

  // 初始化可编辑数据
  const initEditableData = () => {
    if (phoneData.value) {
      editableData.value = JSON.parse(JSON.stringify(phoneData.value));
      // 确保 groups 字段存在
      if (!editableData.value.groups) {
        editableData.value.groups = [];
      }
    } else {
      // 从默认数据创建
      editableData.value = {
        user: JSON.parse(JSON.stringify(defaultBaseInfo.user)),
        characters: JSON.parse(JSON.stringify(defaultBaseInfo.characters)),
        groups: [],
        randomAvatars: [...defaultBaseInfo.randomAvatars],
        backgrounds: [...defaultBaseInfo.backgrounds],
        music: defaultMusicData.songs.map(s => ({ ...s })),
        map: JSON.parse(JSON.stringify(defaultBaseInfo.map)),
      };
    }
  };

  // 保存编辑后的数据
  const saveEditableData = (showAlert = false) => {
    if (editableData.value) {
      editableData.value._exportMeta = {
        version: '1.0',
        exportedAt: Date.now(),
        source: 'phone_settings_edit',
      };
      phoneData.value = JSON.parse(JSON.stringify(editableData.value));
      savePhoneDataToChat(editableData.value);
      // 更新 store 中的字体设置
      if (editableData.value.user?.font !== undefined) {
        updateUserFont(editableData.value.user.font || '');
      }
      // 清除新建标记
      isNewCharacter.value = false;
      isNewGroup.value = false;
      if (showAlert) {
        alert('数据保存成功！');
      }
    }
  };

  return {
    // 默认数据
    defaultBaseInfo,
    defaultMusicData,
    // 数据加载/保存
    loadPhoneDataFromChat,
    savePhoneDataToChat,
    // 响应式数据
    phoneData,
    baseInfo,
    musicData,
    editableData,
    // 状态标记
    isNewCharacter,
    isNewGroup,
    // 初始化方法
    initPhoneData,
    initEditableData,
    saveEditableData,
  };
}
