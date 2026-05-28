<!-- src/views/Compare.vue -->
<template>
  <div class="h-full flex flex-col gap-4">
    
    <!-- 顶部控制台：全局过滤器与操作区 -->
    <div class="ui-card p-3 shrink-0 relative overflow-visible flex flex-row items-center justify-between bg-linear-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#111111] transition-colors duration-500 shadow-sm border border-gray-100 dark:border-gray-800/80">
      <div class="flex items-center gap-3 z-20 pl-2 filter-dropdown-container">
        <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 mr-2 border-r border-gray-200 dark:border-gray-800 pr-4">
          <Filter class="w-4 h-4" />
          <span class="text-sm font-bold">全局筛选</span>
          <!-- 全局筛选开关 -->
          <button 
            @click="isGlobalFilterEnabled = !isGlobalFilterEnabled"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-1 focus:outline-none"
            :class="isGlobalFilterEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'"
            title="开启以覆盖图表原生筛选规则"
          >
            <span 
              class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
              :class="isGlobalFilterEnabled ? 'translate-x-4.5' : 'translate-x-1'"
            />
          </button>
        </div>
        
        <!-- 【重构】多选：模式筛选器 -->
        <div class="relative w-36">
          <button 
            :disabled="!isGlobalFilterEnabled" 
            @click="toggleDropdown('queue')" 
            class="w-full flex items-center justify-between text-sm font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-3 py-1.5 transition-all outline-none"
            :class="{'opacity-50 cursor-not-allowed': !isGlobalFilterEnabled, 'ring-2 ring-indigo-500/50 border-indigo-400 dark:border-indigo-500': activeDropdown === 'queue'}"
          >
            <span class="truncate pr-2" :class="{'text-indigo-600 dark:text-indigo-400': (globalFilters.queueId?.length || 0) > 0}">{{ getQueueText() }}</span>
            <ChevronDown class="w-4 h-4 text-gray-400 shrink-0 transition-transform" :class="{'rotate-180': activeDropdown === 'queue'}" />
          </button>
          
          <transition name="fade-down">
            <div v-show="activeDropdown === 'queue'" class="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto ui-scrollbar">
              <div class="p-1">
                <label class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" :checked="(globalFilters.queueId?.length || 0) === 0" @change="globalFilters.queueId = []" class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#111] w-4 h-4" />
                  <span class="font-bold">全部模式</span>
                </label>
                <div class="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2"></div>
                <label v-for="(name, id) in QUEUE_TYPES" :key="id" class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" :value="Number(id)" v-model="globalFilters.queueId" class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#111] w-4 h-4" />
                  <span class="truncate">{{ name }}</span>
                </label>
              </div>
            </div>
          </transition>
        </div>

        <!-- 【重构】多选：分路筛选器 -->
        <div class="relative w-36">
          <button 
            :disabled="!isGlobalFilterEnabled" 
            @click="toggleDropdown('position')" 
            class="w-full flex items-center justify-between text-sm font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-3 py-1.5 transition-all outline-none"
            :class="{'opacity-50 cursor-not-allowed': !isGlobalFilterEnabled, 'ring-2 ring-indigo-500/50 border-indigo-400 dark:border-indigo-500': activeDropdown === 'position'}"
          >
            <span class="truncate pr-2" :class="{'text-indigo-600 dark:text-indigo-400': (globalFilters.position?.length || 0) > 0}">{{ getPositionText() }}</span>
            <ChevronDown class="w-4 h-4 text-gray-400 shrink-0 transition-transform" :class="{'rotate-180': activeDropdown === 'position'}" />
          </button>
          
          <transition name="fade-down">
            <div v-show="activeDropdown === 'position'" class="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto ui-scrollbar">
              <div class="p-1">
                <label class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" :checked="(globalFilters.position?.length || 0) === 0" @change="globalFilters.position = []" class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#111] w-4 h-4" />
                  <span class="font-bold">全部分路</span>
                </label>
                <div class="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2"></div>
                <label v-for="(name, key) in POSITION_TYPES" :key="key" class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" :value="key" v-model="globalFilters.position" class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#111] w-4 h-4" />
                  <span class="truncate">{{ name }}</span>
                </label>
              </div>
            </div>
          </transition>
        </div>

        <!-- 【重构】多选：英雄筛选器 (附带内置搜索功能) -->
        <div class="relative w-44">
          <button 
            :disabled="!isGlobalFilterEnabled" 
            @click="toggleDropdown('champion')" 
            class="w-full flex items-center justify-between text-sm font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-3 py-1.5 transition-all outline-none"
            :class="{'opacity-50 cursor-not-allowed': !isGlobalFilterEnabled, 'ring-2 ring-indigo-500/50 border-indigo-400 dark:border-indigo-500': activeDropdown === 'champion'}"
          >
            <span class="truncate pr-2" :class="{'text-indigo-600 dark:text-indigo-400': (globalFilters.championId?.length || 0) > 0}">{{ getChampionText() }}</span>
            <ChevronDown class="w-4 h-4 text-gray-400 shrink-0 transition-transform" :class="{'rotate-180': activeDropdown === 'champion'}" />
          </button>
          
          <transition name="fade-down">
            <div v-show="activeDropdown === 'champion'" class="absolute top-full left-0 mt-1.5 w-56 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-80 flex flex-col overflow-hidden">
              <div class="p-2 border-b border-gray-100 dark:border-gray-700 shrink-0 bg-gray-50/50 dark:bg-white/5">
                 <input 
                    type="text" 
                    v-model="champSearch" 
                    placeholder="搜寻英雄..." 
                    class="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                    @click.stop 
                 />
              </div>
              <div class="p-1 overflow-y-auto ui-scrollbar flex-1">
                <label class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" :checked="(globalFilters.championId?.length || 0) === 0" @change="globalFilters.championId = []" class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#111] w-4 h-4" />
                  <span class="font-bold">全部英雄</span>
                </label>
                <div class="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2"></div>
                <label v-for="champ in filteredChampions" :key="champ.id" class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg cursor-pointer transition-colors">
                  <input type="checkbox" :value="champ.id" v-model="globalFilters.championId" class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-[#111] w-4 h-4" />
                  <span class="truncate">{{ champ.name }}</span>
                </label>
                <div v-if="filteredChampions.length === 0" class="text-center py-4 text-xs text-gray-400">无匹配结果</div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- 右侧：对比池同步按钮 -->
      <div class="flex items-center z-10 pr-2">
        <button 
          @click="syncComparePool"
          :disabled="isSyncingAll || userStore.comparePool.length === 0"
          class="ui-btn ui-btn-primary h-9 px-4 rounded-lg shadow-sm"
        >
          <RefreshCw class="w-4 h-4" :class="{'animate-spin': isSyncingAll}" />
          <span>{{ isSyncingAll ? '池数据同步中...' : '同步对比池数据' }}</span>
        </button>
      </div>
    </div>

    <!-- 数据库未就绪时的占位 -->
    <div v-if="!isDbReady" class="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white/50 dark:bg-[#1a1a1a]/50 rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed">
      <Loader2 class="w-6 h-6 animate-spin text-indigo-500 mb-2" />
      <span class="text-sm font-medium">正在唤醒本地数据库分析引擎...</span>
    </div>

    <!-- 状态 1：对比池为空 -->
    <div v-else-if="userStore.comparePool.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white/50 dark:bg-[#1a1a1a]/50 rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed group">
      <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Users class="w-8 h-8 text-indigo-500" />
      </div>
      <span class="font-bold text-lg mb-2 text-gray-600 dark:text-gray-300">多维数据对比池为空</span>
      <span class="text-sm">请从右侧侧边栏的“好友列表”或“全服检索”中将玩家加入对比池</span>
    </div>

    <!-- 状态 2：展示图表网格 -->
    <div v-else class="flex-1 flex flex-col min-h-0 relative">
      <div
        v-show="sortedComparePlugins.length > 0"
        ref="gridRef"
        class="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 content-start overflow-y-auto ui-scrollbar pb-6 pr-2"
      >
        <div
          v-for="plugin in sortedComparePlugins"
          :key="plugin.manifest.id"
          :data-id="plugin.manifest.id"
          :class="getResponsiveGridClass(plugin.layout.grid)"
          class="h-80 2xl:h-85"
        >
          <DynamicPlugin
            :key="plugin.manifest.id"
            :config="plugin"
            :players="compareContext"
            :globalFilters="activeGlobalFilters" 
          />
        </div>
      </div>
      
      <!-- 状态 3：有玩家，但没开启适用于对比页面的图表 -->
      <div v-show="sortedComparePlugins.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed">
        <Layers class="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
        <span class="font-bold text-lg mb-2">暂无支持对比的图表</span>
        <span class="text-sm">请前往“创意工坊”启用允许挂载在“多人对比”页面的图表</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import Sortable from 'sortablejs';
import { Filter, RefreshCw, Users, Layers, Loader2, ChevronDown } from 'lucide-vue-next';
import { useUserStore } from '../store/user';
import { usePluginStore } from '../store/plugins';
import { dbService } from '../core/db/schema';
import DynamicPlugin from '../components/ui/DynamicPlugin.vue';
import type { PlayerContext, GlobalFilters } from '../core/plugins/types';
import { QUEUE_TYPES, POSITION_TYPES } from '../constants/game-dict';
import rawChampionData from '../assets/champion.json';

const userStore = useUserStore();
const pluginStore = usePluginStore();

const isDbReady = ref(false);
const isSyncingAll = ref(false);

const COMPARE_GLOBAL_FILTER_STATE_KEY = 'orianna_compare_global_filter_state';
const COMPARE_GLOBAL_FILTER_VALUES_KEY = 'orianna_compare_global_filter_values';

const isGlobalFilterEnabled = ref(localStorage.getItem(COMPARE_GLOBAL_FILTER_STATE_KEY) === 'true');

// [无缝迁移]：读取历史配置，如果有单数值格式，自动兼容升级为数组格式以匹配全新多选能力
let defaultFilters: GlobalFilters = { queueId: [], position: [], championId: [] };
const savedFiltersRaw = localStorage.getItem(COMPARE_GLOBAL_FILTER_VALUES_KEY);
if (savedFiltersRaw) {
    try {
        const parsed = JSON.parse(savedFiltersRaw);
        defaultFilters.queueId = Array.isArray(parsed.queueId) ? parsed.queueId : (parsed.queueId ? [parsed.queueId] : []);
        defaultFilters.position = Array.isArray(parsed.position) ? parsed.position : (parsed.position ? [parsed.position] : []);
        defaultFilters.championId = Array.isArray(parsed.championId) ? parsed.championId : (parsed.championId ? [parsed.championId] : []);
    } catch(e) {}
}

const globalFilters = reactive<GlobalFilters>(defaultFilters);

// 下拉面板独立状态管理
const activeDropdown = ref<'queue' | 'position' | 'champion' | null>(null);
const champSearch = ref('');

const toggleDropdown = (type: 'queue' | 'position' | 'champion') => {
    if (!isGlobalFilterEnabled.value) return;
    activeDropdown.value = activeDropdown.value === type ? null : type;
    if (type === 'champion' && activeDropdown.value) champSearch.value = ''; // 展开时重置搜索
};

const closeDropdownListener = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.filter-dropdown-container')) {
        activeDropdown.value = null;
    }
};

watch(isGlobalFilterEnabled, (val) => {
    localStorage.setItem(COMPARE_GLOBAL_FILTER_STATE_KEY, String(val));
    if (!val) activeDropdown.value = null;
});

watch(globalFilters, (val) => {
    localStorage.setItem(COMPARE_GLOBAL_FILTER_VALUES_KEY, JSON.stringify(val));
}, { deep: true });

const activeGlobalFilters = computed(() => {
  return isGlobalFilterEnabled.value ? globalFilters : undefined;
});

// UI 回显文本计算器
const getQueueText = () => {
    const len = globalFilters.queueId?.length || 0;
    if (len === 0) return '全部模式';
    if (len === 1) return QUEUE_TYPES[globalFilters.queueId![0] as keyof typeof QUEUE_TYPES] || '未知模式';
    return `已选 ${len} 项`;
};

const getPositionText = () => {
    const len = globalFilters.position?.length || 0;
    if (len === 0) return '全部分路';
    if (len === 1) return POSITION_TYPES[globalFilters.position![0] as keyof typeof POSITION_TYPES] || '未知分路';
    return `已选 ${len} 项`;
};

const getChampionText = () => {
    const len = globalFilters.championId?.length || 0;
    if (len === 0) return '全部英雄';
    if (len === 1) {
        const id = globalFilters.championId![0];
        return championList.value.find(c => c.id === id)?.name || '未知英雄';
    }
    return `已选 ${len} 项`;
};

const championList = computed(() => {
  let list: { id: number; name: string }[] = [];
  const data = (rawChampionData as any).data || rawChampionData;
  for (const key in data) {
      const champ = data[key];
      if (champ) {
          list.push({
              id: Number(champ.key || champ.id || key),
              name: champ.name || champ.title || '未知英雄'
          });
      }
  }
  return list.filter(c => c.id > 0).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
});

// 结合搜索的英雄下拉列表
const filteredChampions = computed(() => {
    if (!champSearch.value) return championList.value;
    const lower = champSearch.value.toLowerCase();
    return championList.value.filter(c => c.name.toLowerCase().includes(lower));
});

const compareContext = computed<PlayerContext[]>(() => {
  return userStore.comparePool.map(p => ({
    puuid: p.puuid,
    gameName: p.gameName
  }));
});

const pluginOrder = ref<string[]>(JSON.parse(localStorage.getItem('orianna_compare_plugin_order') || '[]'));
const gridRef = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

const sortedComparePlugins = computed(() => {
  const plugins = [...pluginStore.activePlugins.filter(p => p.layout?.mount?.includes('compare'))];
  return plugins.sort((a, b) => {
      const idxA = pluginOrder.value.indexOf(a.manifest.id);
      const idxB = pluginOrder.value.indexOf(b.manifest.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
  });
});

const initSortable = () => {
  if (!gridRef.value || sortableInstance) return;

  sortableInstance = new Sortable(gridRef.value, {
    animation: 250,           
    handle: '.drag-handle',   
    ghostClass: 'opacity-40', 
    dragClass: 'shadow-2xl',  
    forceFallback: true,      
    fallbackClass: 'scale-[1.02]', 
    
    onEnd: () => {
      if (!gridRef.value) return;
      const newOrder = Array.from(gridRef.value.children)
        .map((el) => (el as HTMLElement).dataset.id)
        .filter(Boolean) as string[];

      pluginOrder.value = newOrder;
      localStorage.setItem('orianna_compare_plugin_order', JSON.stringify(newOrder));
    }
  });
};

watch(() => gridRef.value, (el) => {
  if (el) {
    nextTick(() => initSortable());
  }
});

const getResponsiveGridClass = (grid: string) => {
  if (grid === 'col-span-1') return 'col-span-1';
  if (grid === 'col-span-2') return 'col-span-1 md:col-span-2';
  if (grid === 'col-span-4') return 'col-span-1 md:col-span-2 xl:col-span-4';
  return grid;
};

const syncComparePool = async () => {
  if (isSyncingAll.value || userStore.comparePool.length === 0) return;
  isSyncingAll.value = true;
  
  try {
    await Promise.all(
      userStore.comparePool.map(player => userStore.smartSync(true, player.puuid))
    );
  } catch (e) {
    console.error('[Compare] 批量同步错误:', e);
  } finally {
    isSyncingAll.value = false;
  }
};

onMounted(async () => {
  document.addEventListener('click', closeDropdownListener);

  await dbService.ready;
  isDbReady.value = true;

  if (gridRef.value) initSortable();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdownListener);
  if (sortableInstance) sortableInstance.destroy();
});
</script>

<style scoped>
.fade-down-enter-active, .fade-down-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.fade-down-enter-from, .fade-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>