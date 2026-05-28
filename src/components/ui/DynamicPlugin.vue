<!-- src/components/ui/DynamicPlugin.vue -->
<template>
  <div class="ui-card p-5 flex flex-col min-h-0 relative w-full h-full group/card">
    <div class="flex items-center justify-between mb-4 shrink-0">
      <div class="flex flex-col">
        <h3 class="font-bold text-slate-800 dark:text-gray-200 flex items-center gap-2 select-none">
          <div 
            class="drag-handle cursor-move p-1 -ml-1 rounded hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
            title="按住拖动以排序"
          >
            <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
              <circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
            </svg>
          </div>
          {{ config.manifest.name }}
        </h3>
        <span class="text-[10px] text-slate-500 pl-6">{{ config.manifest.description }}</span>
      </div>
      <button @click="() => loadData()" class="p-1 hover:bg-slate-100 dark:hover:bg-gray-800 rounded transition-colors text-slate-400">
        <svg :class="{'animate-spin': isLoading}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
      </button>
    </div>
    
    <div class="flex-1 relative w-full mt-2">
      <div v-if="isLoading" class="absolute inset-0 z-10 rounded-xl overflow-hidden p-2 flex flex-col gap-3 bg-white dark:bg-[#1a1a1a]">
        <!-- 模拟图表区域的骨架线条 -->
        <div class="flex items-end gap-2 flex-1 px-2 pb-2">
          <div v-for="i in 8" :key="i"
            class="flex-1 rounded-sm animate-pulse bg-gray-200 dark:bg-gray-700/60"
            :style="{ height: `${30 + Math.sin(i * 1.2) * 25 + 25}%` }"
          ></div>
        </div>
        <!-- 模拟图例区域 -->
        <div class="flex justify-center gap-4 shrink-0 pb-1">
          <div class="h-2.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700/60 animate-pulse"></div>
          <div class="h-2.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700/60 animate-pulse" style="animation-delay: 0.15s"></div>
        </div>
      </div>

      <template v-else-if="renderResult">
        <!-- ECharts 图表渲染 -->
        <BaseChart v-if="renderResult.isEcharts" :option="renderResult.option" />

        <!-- 数值看板 -->
        <div v-else-if="renderResult.type === 'stat-card' && renderResult.data" 
             class="absolute -top-2 -bottom-4 -left-3 -right-3 pt-2 pb-4 px-3 overflow-y-auto ui-scrollbar flex flex-col gap-3">
          <div v-for="(playerData, idx) in renderResult.data" :key="idx" class="flex flex-col gap-2">
             <div v-if="renderResult.data.length > 1 && playerData.player" class="text-xs font-bold text-slate-400 flex items-center gap-1.5 pl-1">
               <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
               {{ playerData.player.gameName }}
             </div>
             <div class="grid grid-cols-2 gap-3">
                <div v-for="(stat, sIdx) in playerData.stats" :key="sIdx" 
                     class="relative group bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-slate-100 dark:border-gray-800/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-24">
                   <div class="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.15] dark:opacity-[0.06] pointer-events-none transition-transform duration-500 group-hover:scale-125" :style="{ backgroundColor: stat.color || '#10b981' }"></div>
                   <div class="text-[12px] text-slate-500 dark:text-gray-400 font-medium z-10 flex items-center gap-1.5">
                     <div class="w-1.5 h-1.5 rounded-full shadow-sm" :style="{ backgroundColor: stat.color || '#10b981' }"></div>
                     {{ stat.label }}
                   </div>
                   <div class="text-3xl font-black mt-1 z-10 drop-shadow-sm tracking-tight" :style="{ color: stat.color || '#10b981' }">
                     {{ formatNumber(stat.value) }}
                   </div>
                </div>
             </div>
          </div>
        </div>

        <!-- 排行榜列表 -->
        <div v-else-if="renderResult.type === 'list' && renderResult.data" 
             class="absolute -top-2 -bottom-4 -left-3 -right-3 pt-2 pb-4 px-3 overflow-y-auto ui-scrollbar flex flex-col gap-4">
           <div v-for="(playerData, idx) in renderResult.data" :key="idx" class="flex flex-col gap-3">
              <div v-if="renderResult.data.length > 1 && playerData.player" class="text-xs font-bold text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-gray-800 pb-1.5 pl-1">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                {{ playerData.player.gameName }}
              </div>
              <div class="flex flex-col gap-1.5">
                <div v-for="(item, i) in playerData.items" :key="i" 
                     class="flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all hover:shadow-sm group"
                     :class="[
                        item.tier === 3 ? 'bg-linear-to-r from-indigo-50/50 via-purple-50/50 to-pink-50/50 dark:from-indigo-900/10 dark:via-purple-900/10 dark:to-pink-900/10 border-purple-200 dark:border-purple-800/40' :
                        item.tier === 2 ? 'bg-amber-50/40 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40' :
                        item.tier === 1 ? 'bg-slate-50/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60' :
                        'bg-slate-50/70 dark:bg-[#1a1a1a]/60 border-transparent hover:border-slate-200 dark:hover:border-gray-700/80'
                     ]">
                   <div class="flex items-center gap-3 overflow-hidden">
                      <div class="w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-[11px] font-black" 
                            :class="Number(i) === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shadow-sm' : (Number(i) === 1 ? 'bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-gray-300 shadow-sm' : (Number(i) === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 shadow-sm' : 'bg-transparent text-slate-400'))">
                        {{ Number(i) + 1 }}
                      </div>
                      
                      <!-- 【核心改造】：具备独立稀有度边框光晕的动态图标 -->
                      <div v-if="item.icon" class="relative shrink-0 flex items-center justify-center">
                         <div v-if="item.tier === 3" class="absolute inset-0 bg-linear-to-tr from-cyan-400 via-purple-500 to-pink-500 rounded-md blur-[3px] opacity-75 animate-pulse"></div>
                         <img 
                           :src="item.icon" 
                           class="relative w-8 h-8 rounded-md object-cover z-10 bg-slate-100 dark:bg-gray-800"
                           :class="[
                             item.tier === 3 ? 'border-[1.5px] border-transparent shadow-lg' : 'border',
                             item.tier === 1 ? 'border-slate-300 dark:border-slate-500' : '',
                             item.tier === 2 ? 'border-amber-400 dark:border-amber-500 shadow-sm' : '',
                             !item.tier ? 'border-slate-200 dark:border-gray-700 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]' : ''
                           ]"
                           @error="(e) => (e.target as HTMLElement).style.display = 'none'"
                         />
                      </div>
                      
                      <!-- 【核心改造】：稀有度对应的炫光文字颜色 -->
                      <span class="text-sm font-semibold truncate flex-1 pr-2"
                            :class="[
                               item.tier === 3 ? 'text-transparent bg-clip-text bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400' :
                               item.tier === 2 ? 'text-amber-700 dark:text-amber-400' :
                               item.tier === 1 ? 'text-slate-600 dark:text-slate-300' :
                               'text-slate-700 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors'
                            ]">
                        {{ formatItemName(item.name) }}
                      </span>
                   </div>
                   <div class="flex items-center shrink-0 ml-1">
                      <span class="text-sm font-bold text-slate-900 dark:text-gray-100 bg-white/80 dark:bg-[#242424]/80 px-2.5 py-1 rounded-md shadow-sm border border-slate-100 dark:border-gray-800">{{ item.value }}</span>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </template>

      <!-- 错误状态 -->
      <div v-else-if="loadError" class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
        <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span class="text-xs font-bold text-red-500 text-center">图表配置错误</span>
        <span class="text-[10px] text-slate-400 text-center break-all max-w-full px-2">{{ loadError }}</span>
      </div>
      <!-- 空数据状态 -->
      <div v-else class="absolute inset-0 flex items-center justify-center text-sm text-slate-400">暂无符合条件的数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, watch } from 'vue';
import { PluginEngine, type PluginRenderOutcome } from '../../core/plugins/engine';
import type { PluginConfig, PlayerContext, GlobalFilters, RenderResult } from '../../core/plugins/types';
import { useUserStore } from '../../store/user';
import BaseChart from './BaseChart.vue';

const props = defineProps<{ 
  config: PluginConfig, 
  players: PlayerContext[],
  globalFilters?: GlobalFilters 
}>();

const userStore = useUserStore();
const renderResult = shallowRef<RenderResult | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const hasLoadedOnce = ref(false);

const loadData = async (showSkeleton = true) => {
    if (!props.players || props.players.length === 0) return;
    if (showSkeleton) isLoading.value = true;
    loadError.value = null;
    if (showSkeleton) renderResult.value = null;

    const outcome: PluginRenderOutcome = await PluginEngine.renderPlugin(
        props.config, props.players, props.globalFilters
    );

    if (outcome.status === 'ok') {
        renderResult.value = outcome.result;
    } else if (outcome.status === 'error') {
        loadError.value = outcome.message;
    }
    // status === 'empty' -> renderResult stays null, shows empty state

    isLoading.value = false;
    hasLoadedOnce.value = true;
};

onMounted(() => {
    loadData();
});

watch(() => [props.players, props.globalFilters], () => loadData(), { deep: true });

// 数据版本变化时静默刷新（不显示骨架屏），实现平滑过渡
watch(() => userStore.dataVersion, () => {
    if (hasLoadedOnce.value) loadData(false);
});

const formatNumber = (val: any) => {
  if (typeof val !== 'number') return val || 0;
  return val % 1 === 0 ? val : Number(val.toFixed(2));
};

const formatItemName = (name: string) => {
  return name === 'null' || !name ? '未知' : name;
};
</script>