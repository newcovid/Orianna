<!-- src/views/Plugins.vue -->
<template>
  <div class="h-full flex flex-col relative">
    
    <transition name="toast-fade">
      <div v-if="toast.show" 
           class="fixed top-6 left-1/2 z-50 px-5 py-3 rounded-full shadow-xl shadow-black/10 backdrop-blur-md flex items-center gap-2 text-sm font-bold border"
           style="transform: translateX(-50%);"
           :class="toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-red-500/90 text-white border-red-400'">
        <CheckCircle2 v-if="toast.type === 'success'" class="w-4 h-4" />
        <AlertCircle v-else class="w-4 h-4" />
        {{ toast.message }}
      </div>
    </transition>

    <div class="shrink-0 flex items-end justify-between pb-6 border-b border-gray-200 dark:border-gray-800">
      <div class="flex flex-col gap-5">
        <div>
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">创意工坊</h2>
          <p class="text-sm text-gray-500 mt-1">管理你的数据面板，或进入可视化引擎创建个性化专属图表。</p>
        </div>
        
        <div class="flex items-center gap-6 text-sm font-bold">
          <button 
            @click="activeTab = 'custom'"
            class="pb-2 border-b-2 transition-all outline-none"
            :class="activeTab === 'custom' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            自定义图表
            <span class="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500">
              {{ customPluginsCount }}
            </span>
          </button>
          <button 
            @click="activeTab = 'builtin'"
            class="pb-2 border-b-2 transition-all outline-none"
            :class="activeTab === 'builtin' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            官方内置图表
            <span class="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500">
              {{ builtinPluginsCount }}
            </span>
          </button>
        </div>
      </div>
      
      <div class="pb-2 flex gap-3">
        <input type="file" ref="fileInput" accept=".json" class="hidden" @change="handleFileUpload" />
        <button @click="triggerFileInput" class="ui-btn bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-sm">
          <FileJson class="w-4 h-4" />
          导入 JSON
        </button>
        <!-- 修改为路由跳转 -->
        <button @click="navigateToEditor(null)" class="ui-btn bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-md shadow-indigo-500/20">
          <Plus class="w-4 h-4" />
          新建图表
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto ui-scrollbar py-6">
      <div v-if="displayedPlugins.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
        <Blocks class="w-16 h-16 mb-4 opacity-20" />
        <p class="text-sm font-bold text-gray-600 dark:text-gray-300">
          {{ activeTab === 'custom' ? '暂无自定义图表，点击右上角新建或导入' : '暂无系统插件' }}
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div 
          v-for="plugin in displayedPlugins" 
          :key="plugin.manifest.id"
          class="ui-card p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 border-2 group"
          :class="pluginStore.activePluginIds.includes(plugin.manifest.id) ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-transparent bg-white/60 dark:bg-[#1a1a1a]/60 hover:bg-white dark:hover:bg-[#1a1a1a] hover:border-gray-200 dark:hover:border-gray-700'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 overflow-hidden">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  :class="pluginStore.activePluginIds.includes(plugin.manifest.id) ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
                <component :is="getChartIcon(plugin.visualization?.type)" class="w-5 h-5" />
              </div>
              <div class="flex flex-col min-w-0 pr-2">
                <h3 class="font-bold text-gray-900 dark:text-white truncate" :title="plugin.manifest.name">
                  {{ plugin.manifest.name }}
                </h3>
                <span class="text-[10px] text-gray-500 font-mono mt-0.5 truncate" :title="plugin.manifest.id">
                  {{ plugin.manifest.id }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 pt-1">
              <!-- 修改为路由跳转 -->
              <button 
                @click="navigateToEditor(plugin.manifest.id)"
                class="text-gray-400 hover:text-indigo-500 transition-colors bg-gray-100 hover:bg-indigo-50 dark:bg-gray-800 dark:hover:bg-indigo-900/30 p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                title="进入引擎编辑"
              >
                <Settings2 class="w-3.5 h-3.5" />
              </button>

              <button 
                v-if="plugin.isCustom" 
                @click.stop="confirmDelete(plugin.manifest.id)"
                class="text-gray-400 hover:text-red-500 transition-colors bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/30 p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                title="删除图表"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>

              <button 
                @click="pluginStore.togglePlugin(plugin.manifest.id)"
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                :class="pluginStore.activePluginIds.includes(plugin.manifest.id) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'"
              >
                <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      :class="pluginStore.activePluginIds.includes(plugin.manifest.id) ? 'translate-x-4' : 'translate-x-0'">
                </span>
              </button>
            </div>
          </div>

          <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-h-10 leading-relaxed">
            {{ plugin.manifest.description || '暂无描述信息。' }}
          </p>

          <div class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[11px] font-bold">
            <span :class="plugin.layout.mount.includes('compare') ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400'">
              {{ plugin.layout.mount.includes('compare') ? '支持多人对比' : '仅限单人看板' }}
            </span>
            <span class="text-gray-400">
              v{{ plugin.manifest.version }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  LineChart, BarChart3, PieChart, Activity, Hexagon, LayoutTemplate, List, Box,
  Plus, CheckCircle2, AlertCircle, Trash2, Blocks, FileJson, Settings2
} from 'lucide-vue-next';
import { usePluginStore } from '../store/plugins';

const pluginStore = usePluginStore();
const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);

const toast = ref({ show: false, message: '', type: 'success' });
let toastTimer: any = null;

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message: msg, type };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value.show = false; }, 3000);
};

const activeTab = ref<'custom' | 'builtin'>('custom');
const customPluginsCount = computed(() => pluginStore.allPlugins.filter(p => p.isCustom).length);
const builtinPluginsCount = computed(() => pluginStore.allPlugins.filter(p => !p.isCustom).length);
const displayedPlugins = computed(() => {
  return pluginStore.allPlugins.filter(p => activeTab.value === 'custom' ? p.isCustom : !p.isCustom)
                               .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
});

const getChartIcon = (type?: string) => {
  const iconMap: Record<string, any> = {
    'line': LineChart, 'bar': BarChart3, 'radar': Hexagon, 
    'scatter': Activity, 'pie': PieChart, 'stat-card': LayoutTemplate, 'list': List
  };
  return type && iconMap[type] ? iconMap[type] : Box;
};

const triggerFileInput = () => fileInput.value?.click();

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target?.result as string;
    const success = await pluginStore.importExternalPlugin(content);
    if (success) {
        showToast(`外部 JSON 图表已导入`, 'success');
        activeTab.value = 'custom';
    } else {
        showToast('导入失败：JSON 格式不合法', 'error');
    }
  };
  reader.readAsText(file);
  if (fileInput.value) fileInput.value.value = '';
};

const confirmDelete = (id: string) => {
  pluginStore.deleteCustomPlugin(id);
  showToast('自定义图表已彻底删除', 'success');
};

// 核心修改：利用路由进行页面跳转
const navigateToEditor = (id: string | null) => {
  if (id) {
    router.push({ name: 'PluginEditor', params: { id } });
  } else {
    router.push({ name: 'PluginEditor' });
  }
};
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) !important;
}
.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) !important;
}
</style>