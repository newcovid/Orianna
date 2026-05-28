<!-- src/views/Dashboard.vue -->
<template>
  <div class="h-full flex flex-col gap-4">
    
    <!-- 顶部基本信息框 (已压矮、优化版) -->
    <div class="ui-card p-3 shrink-0 relative overflow-hidden flex flex-row items-center justify-between bg-linear-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#111111] transition-colors duration-500 shadow-sm border border-gray-100 dark:border-gray-800/80">
      <!-- 装饰用背景光晕 -->
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <!-- 左侧：基础信息 -->
      <div class="flex flex-row items-center gap-3.5 z-10 pl-1">
        <!-- 头像与等级 -->
        <div class="relative group shrink-0">
          <div 
            class="w-12 h-12 rounded-xl p-0.5 shadow-sm transition-all duration-300"
            :class="isObservingFriend ? 'bg-linear-to-tr from-orange-400 to-pink-500 shadow-orange-500/20' : 'bg-linear-to-tr from-indigo-500 to-purple-500 shadow-indigo-500/20'"
          >
            <img 
              v-if="userStore.currentViewPlayer"
              :src="`https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/${userStore.currentViewPlayer.profileIconId}.png`" 
              class="w-full h-full rounded-[10px] object-cover border border-white dark:border-[#1a1a1a]"
              @error="(e) => (e.target as HTMLImageElement).src = 'https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/0.png'"
            />
          </div>
          <!-- 等级框：半透明胶囊，尺寸迷你，位置靠下 -->
          <div 
            class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-black/60 dark:bg-black/70 backdrop-blur-sm text-white/95 text-[8px] leading-none font-bold px-1.5 py-px rounded-full border border-white/20 dark:border-white/10 whitespace-nowrap shadow-sm flex items-center justify-center h-3.5"
          >
            {{ userStore.currentViewPlayer?.summonerLevel ? `Lv.${userStore.currentViewPlayer.summonerLevel}` : '...' }}
          </div>
        </div>

        <!-- 名字与统计 -->
        <div class="flex flex-col justify-center gap-0.5 mt-0.5">
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-black tracking-tight text-gray-900 dark:text-white flex items-baseline gap-0.5">
              <span>{{ userStore.currentViewPlayer?.gameName || '等待载入...' }}</span>
              <span v-if="userStore.currentViewPlayer?.tagLine" class="text-xs font-bold text-gray-400 dark:text-gray-500">
                #{{ userStore.currentViewPlayer.tagLine }}
              </span>
            </h1>
            <span v-if="isObservingFriend" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30">
              好友追踪
            </span>
          </div>
          
          <div class="flex items-center gap-1.5 text-[11px]">
            <span class="text-gray-500 font-medium">本地存储场次:</span>
            <span class="font-bold text-gray-800 dark:text-gray-200">
               {{ userStore.isSyncing ? '同步中...' : `${totalMatches} 场` }}
            </span>
          </div>
        </div>
      </div>

      <!-- 右侧：操作区 (加入对比池按钮) -->
      <div class="flex items-center z-10 pr-1">
         <button 
            v-if="userStore.currentViewPlayer"
            @click="userStore.toggleComparePlayer(userStore.currentViewPlayer)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            :class="userStore.isInComparePool(userStore.currentViewPlayer.puuid) ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30' : 'bg-white dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 border border-gray-200 dark:border-gray-700'"
          >
            <UserMinus v-if="userStore.isInComparePool(userStore.currentViewPlayer.puuid)" class="w-3.5 h-3.5" />
            <UserPlus v-else class="w-3.5 h-3.5" />
            <span>{{ userStore.isInComparePool(userStore.currentViewPlayer.puuid) ? '移出对比池' : '加入对比池' }}</span>
         </button>
      </div>
    </div>

    <!-- 数据库未就绪时的加载骨架/占位 -->
    <div v-if="userStore.currentViewPlayer && !isDbReady" class="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white/50 dark:bg-[#1a1a1a]/50 rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed">
      <Loader2 class="w-6 h-6 animate-spin text-indigo-500 mb-2" />
      <span class="text-sm font-medium">正在唤醒本地数据库分析引擎...</span>
    </div>

    <!-- 图表网格区域 (增加 isDbReady 守护，防止时序竞争) -->
    <div v-else-if="userStore.currentViewPlayer && isDbReady" class="flex-1 flex flex-col min-h-0 relative">
      <div
        v-show="sortedDashboardPlugins.length > 0"
        ref="gridRef"
        class="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 content-start overflow-y-auto ui-scrollbar pb-6 pr-2"
      >
        <div
          v-for="plugin in sortedDashboardPlugins"
          :key="plugin.manifest.id"
          :data-id="plugin.manifest.id"
          :class="getResponsiveGridClass(plugin.layout.grid)"
          class="h-80 2xl:h-85"
        >
          <DynamicPlugin
            :key="plugin.manifest.id"
            :config="plugin"
            :players="currentUserContext"
            :globalFilters="{}" 
          />
        </div>
      </div>
      
      <div v-show="sortedDashboardPlugins.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed">
        <span class="font-bold text-lg mb-2">暂无展示图表</span>
        <span class="text-sm">请前往“创意工坊”启用所需的数据分析图表</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import Sortable from 'sortablejs';
import { useUserStore } from '../store/user';
import { usePluginStore } from '../store/plugins';
import { dbService } from '../core/db/schema';
import DynamicPlugin from '../components/ui/DynamicPlugin.vue';
import type { PlayerContext } from '../core/plugins/types';
import { UserPlus, UserMinus, Loader2 } from 'lucide-vue-next';

const userStore = useUserStore();
const pluginStore = usePluginStore();
const totalMatches = ref(0);

const isDbReady = ref(false);

const isObservingFriend = computed(() => {
    return userStore.currentViewPlayer && !userStore.currentViewPlayer.isLocal;
});

const currentUserContext = computed<PlayerContext[]>(() => {
  if (!userStore.currentViewPlayer) return [];
  return [{
    puuid: userStore.currentViewPlayer.puuid,
    gameName: userStore.currentViewPlayer.gameName
  }];
});

const pluginOrder = ref<string[]>(JSON.parse(localStorage.getItem('orianna_plugin_order') || '[]'));
const gridRef = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

const sortedDashboardPlugins = computed(() => {
  const plugins = [...pluginStore.activePlugins.filter(p => p.layout?.mount?.includes('dashboard'))];
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
      localStorage.setItem('orianna_plugin_order', JSON.stringify(newOrder));
    }
  });
};

watch(() => gridRef.value, (el) => {
  if (el) {
    nextTick(() => {
      initSortable();
    });
  }
});

const getResponsiveGridClass = (grid: string) => {
  if (grid === 'col-span-1') return 'col-span-1';
  if (grid === 'col-span-2') return 'col-span-1 md:col-span-2';
  if (grid === 'col-span-4') return 'col-span-1 md:col-span-2 xl:col-span-4';
  return grid;
};

const updateBasicInfo = async () => {
  if (!userStore.currentViewPlayer || !dbService.isReady) return;
  const res = await dbService.instance.select<any[]>('SELECT COUNT(*) as cnt FROM match_games WHERE puuid = $1', [userStore.currentViewPlayer.puuid]);
  totalMatches.value = res.length > 0 ? (Number(res[0].cnt) || 0) : 0;
};

onMounted(async () => {
  await dbService.ready;
  isDbReady.value = true;
  await updateBasicInfo();
  if (userStore.currentViewPlayer) {
    userStore.smartSync(false, userStore.currentViewPlayer.puuid);
  }
  if (gridRef.value) initSortable();
});

watch(() => userStore.currentViewPlayer?.puuid, updateBasicInfo);
watch(() => userStore.dataVersion, updateBasicInfo); 

watch(() => userStore.isSyncing, (syncing) => {
    if(!syncing && isDbReady.value) updateBasicInfo();
});

onBeforeUnmount(() => {
  if (sortableInstance) sortableInstance.destroy();
});
</script>