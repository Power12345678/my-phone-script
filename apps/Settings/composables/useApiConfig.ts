import { ref, computed } from 'vue';
import type { ApiConfig } from '../types';

const STORAGE_KEY_CONFIG = 'phone_api_config';
const STORAGE_KEY_MODELS = 'phone_api_models';

// 将状态提升到模块级别，实现单例模式
const apiConfig = ref<ApiConfig>({
  url: '',
  key: '',
  model: '',
  streaming: false,
  temperature: 1.0,
});

const showApiKey = ref(false);
const modelList = ref<string[]>([]);
const modelFilter = ref('');
const showModelDropdown = ref(false);
const isLoadingModels = ref(false);

// 标记是否已加载
let isLoaded = false;

export function useApiConfig() {
  // 筛选后的模型列表
  const filteredModels = computed(() => {
    if (!modelFilter.value) {
      return modelList.value;
    }
    const filter = modelFilter.value.toLowerCase();
    return modelList.value.filter(model => model.toLowerCase().includes(filter));
  });

  // 保存 API 配置
  const saveApiConfig = () => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(apiConfig.value));
    alert('API 配置已保存');
  };

  // 加载 API 配置
  const loadApiConfig = () => {
    // 防止重复加载
    if (isLoaded) return;
    isLoaded = true;

    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      apiConfig.value = {
        url: parsed.url || '',
        key: parsed.key || '',
        model: parsed.model || '',
        streaming: parsed.streaming ?? false,
        temperature: parsed.temperature ?? 1.0,
      };
    }
    // 加载保存的模型列表
    const savedModels = localStorage.getItem(STORAGE_KEY_MODELS);
    if (savedModels) {
      modelList.value = JSON.parse(savedModels);
    }
  };

  // 获取模型列表
  const fetchModels = async () => {
    if (!apiConfig.value.url || !apiConfig.value.key) {
      alert('请先填写 API URL 和 API Key');
      return;
    }

    isLoadingModels.value = true;
    try {
      // 构建 models 端点 URL，自动检测并补齐 /v1 等路径
      let modelsUrl = apiConfig.value.url.trim();
      // 去除末尾斜杠
      if (modelsUrl.endsWith('/')) {
        modelsUrl = modelsUrl.slice(0, -1);
      }
      // 如果 URL 以 /chat/completions 结尾，替换为 /models
      if (modelsUrl.endsWith('/chat/completions')) {
        modelsUrl = modelsUrl.replace('/chat/completions', '/models');
      } else if (modelsUrl.endsWith('/models')) {
        // 已经是 models 端点，不处理
      } else {
        // 检测是否包含 /v1 或类似版本路径
        const hasVersionPath = /\/v\d+$/i.test(modelsUrl) || /\/v\d+\//i.test(modelsUrl);
        if (!hasVersionPath) {
          // 自动补齐 /v1
          modelsUrl = modelsUrl + '/v1';
        }
        modelsUrl = modelsUrl + '/models';
      }

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiConfig.value.key}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 解析模型列表 - 兼容不同的 API 响应格式
      let models: string[] = [];
      if (Array.isArray(data.data)) {
        models = data.data.map((m: { id?: string; name?: string }) => m.id || m.name || '').filter(Boolean);
      } else if (Array.isArray(data.models)) {
        models = data.models.map((m: { id?: string; name?: string } | string) =>
          typeof m === 'string' ? m : (m.id || m.name || '')
        ).filter(Boolean);
      } else if (Array.isArray(data)) {
        models = data.map((m: { id?: string; name?: string } | string) =>
          typeof m === 'string' ? m : (m.id || m.name || '')
        ).filter(Boolean);
      }

      if (models.length === 0) {
        alert('未获取到可用模型');
        return;
      }

      modelList.value = models.sort();
      // 保存模型列表到本地
      localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(models));
      alert(`成功获取 ${models.length} 个模型`);
    } catch (error) {
      console.error('获取模型失败:', error);
      alert(`获取模型失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      isLoadingModels.value = false;
    }
  };

  // 切换模型下拉框
  const toggleModelDropdown = () => {
    showModelDropdown.value = !showModelDropdown.value;
    if (showModelDropdown.value) {
      modelFilter.value = '';
    }
  };

  // 选择模型
  const selectModel = (model: string) => {
    apiConfig.value.model = model;
    showModelDropdown.value = false;
    modelFilter.value = '';
  };

  return {
    // 状态
    apiConfig,
    showApiKey,
    modelList,
    modelFilter,
    showModelDropdown,
    isLoadingModels,
    filteredModels,
    // 方法
    saveApiConfig,
    loadApiConfig,
    fetchModels,
    toggleModelDropdown,
    selectModel,
  };
}
