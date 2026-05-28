<!-- src/views/MatchHistory.vue -->
<template>
  <div class="h-full flex flex-col md:flex-row gap-5 relative">
    
    <!-- 左侧：多维深度筛选器 -->
    <aside class="w-full md:w-64 shrink-0 flex flex-col gap-4">
      <div class="ui-card p-5">
        <h3 class="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Filter class="w-4 h-4 text-emerald-500" />
          战绩筛选
        </h3>

        <!-- 游戏模式筛选 -->
        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">游戏模式</label>
          <select v-model="filters.queueId" @change="handleFilterChange" class="ui-select appearance-none">
            <option :value="0">所有模式</option>
            <option v-for="(name, id) in QUEUE_TYPES" :key="id" :value="Number(id)">{{ name }}</option>
          </select>
        </div>

        <!-- 游戏分路筛选 -->
        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">分路位置</label>
          <!-- 采用 3 列 2 行网格，完美容纳中文名称 -->
          <div class="grid grid-cols-3 gap-1 bg-gray-50 dark:bg-[#111111] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <button 
              v-for="role in roles" 
              :key="role.id"
              @click="filters.position = role.id; handleFilterChange()"
              class="flex items-center justify-center py-1.5 rounded-lg transition-all"
              :class="filters.position === role.id ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            >
              <span class="text-xs font-bold">{{ role.name }}</span>
            </button>
          </div>
        </div>

        <!-- 自定义英雄筛选下拉组件 -->
        <div class="mb-4 relative">
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">使用英雄</label>
          
          <div @click="showChampSelect = !showChampSelect" class="ui-select flex items-center justify-between">
            <span class="truncate">{{ getSelectedChampName() }}</span>
            <ChevronDown class="w-4 h-4 text-gray-400" />
          </div>

          <div v-if="showChampSelect" @click="showChampSelect = false" class="fixed inset-0 z-40"></div>

          <div v-if="showChampSelect" class="absolute z-50 mt-1 w-full ui-card p-1 shadow-xl">
            <div class="p-2 border-b border-gray-100 dark:border-gray-800">
              <div class="relative">
                <Search class="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input v-model="champSearchQuery" placeholder="搜索英雄..." class="w-full bg-gray-50 dark:bg-[#111111] rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
            <div class="max-h-48 overflow-y-auto ui-scrollbar py-1">
              <div @click="selectChamp(0)" class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm cursor-pointer text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span class="text-xs text-gray-500">ALL</span>
                </div>
                所有英雄
              </div>
              <div v-for="champ in filteredChamps" :key="champ.id" @click="selectChamp(champ.id)" class="px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm cursor-pointer text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <img :src="getChampionIcon(champ.id)" class="w-6 h-6 rounded-full" />
                {{ champ.name }}
              </div>
              <div v-if="filteredChamps.length === 0" class="px-3 py-4 text-center text-xs text-gray-400">没有匹配的英雄</div>
            </div>
          </div>
        </div>

        <button @click="resetFilters" class="ui-btn w-full mt-2">
          重置条件
        </button>
      </div>
    </aside>

    <!-- 右侧：战绩列表区域 -->
    <main class="flex-1 flex flex-col min-w-0 ui-card overflow-hidden">
      
      <!-- 顶部统一风格的翻页控制栏 -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141414] shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
            库中命中: <span class="font-bold text-gray-800 dark:text-gray-200">{{ totalLocalMatches }}</span> 场
          </span>
          <div class="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
          
          <div class="relative">
            <select v-model="pageSize" @change="handleFilterChange" class="ui-select py-1 pl-3 pr-7 w-auto text-xs appearance-none shadow-sm">
              <option :value="10">每页 10 场</option>
              <option :value="20">每页 20 场</option>
              <option :value="50">每页 50 场</option>
              <option :value="100">每页 100 场</option>
              <option :value="200">每页 200 场</option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <!-- 翻页组件 -->
        <div class="flex items-center gap-2">
          <button 
            @click="handlePrevPage" 
            :disabled="currentPage === 1 || isPageLoading"
            class="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white dark:bg-[#1a1a1a]"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          
          <span class="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-14 text-center flex items-center justify-center gap-1">
            {{ currentPage }} <span class="text-xs text-gray-400 font-normal">/ {{ totalPages || 1 }}</span>
          </span>

          <button 
            @click="handleNextPage" 
            :disabled="(currentPage >= totalPages && serverExhausted) || isPageLoading"
            class="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white dark:bg-[#1a1a1a]"
          >
            <Loader2 v-if="isPageLoading && isCloudSyncing" class="w-4 h-4 animate-spin text-emerald-500" />
            <ChevronRight v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 静止承载层 -->
      <div class="flex-1 relative overflow-hidden flex flex-col">
        
        <!-- 真正的列表内容滚动区 -->
        <div class="flex-1 overflow-y-auto p-3 ui-scrollbar">
          
          <!-- 局部加载遮罩 -->
          <div v-if="isPageLoading && !isCloudSyncing" class="absolute inset-0 bg-white/60 dark:bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 class="w-8 h-8 text-emerald-500 animate-spin" />
          </div>

          <!-- 空状态 -->
          <div v-if="matches.length === 0 && !isPageLoading" class="h-full flex flex-col items-center justify-center text-gray-400">
            <ScrollText class="w-16 h-16 mb-4 opacity-20" />
            <p class="text-sm font-bold text-gray-600 dark:text-gray-300">目前没有符合条件的战绩</p>
            <p class="text-xs mt-1">您可以点击右上角向后翻页，让引擎去服务器深度搜索</p>
          </div>

          <!-- 战绩卡片列表 -->
          <div class="flex flex-col gap-2">
            <div 
              v-for="(match, index) in matches" 
              :key="match.game_id"
              class="group flex flex-col rounded-xl border transition-all duration-200 overflow-hidden"
              :class="[
                match.win 
                  ? 'bg-emerald-50/70 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-700/60' 
                  : 'bg-[#fff1f2] dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700/50'
              ]"
            >
              <div class="relative flex items-center py-2 px-3 md:px-4 gap-3 md:gap-4 cursor-pointer" @click="toggleExpand(index)">
                <div class="absolute left-0 top-0 bottom-0 w-1.25" :class="match.win ? 'bg-emerald-500' : 'bg-[#e84057]'"></div>

                <div class="flex flex-col w-20 pl-1 shrink-0">
                  <span class="font-extrabold text-[15px] tracking-tight" :class="match.win ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#d32a3f] dark:text-red-400'">
                    {{ match.win ? '胜利' : '失败' }}
                  </span>
                  <span class="text-gray-600 dark:text-gray-400 text-[11px] font-bold mt-0.5">{{ getQueueName(match.queue_id, match.game_mode) }}</span>
                  <div class="w-5 h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                  <span class="text-gray-500 dark:text-gray-500 text-[10px]">{{ formatTimeAgo(match.game_creation) }}</span>
                  <span class="text-gray-500 dark:text-gray-400 text-[11px] font-medium">{{ Math.floor(match.game_duration / 60) }}分{{ match.game_duration % 60 }}秒</span>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <div class="relative">
                    <img :src="getChampionIcon(match.champion_id)" class="w-10.5 h-10.5 rounded-full object-cover ring-[1.5px]" :class="match.win ? 'ring-emerald-400 dark:ring-emerald-600' : 'ring-red-300 dark:ring-red-700'" />
                    <span class="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[9px] font-bold px-1 py-px rounded border border-white dark:border-gray-900 leading-none">
                      {{ match.champ_level }}
                    </span>
                  </div>
                  
                  <div v-if="match.spell1_id" class="flex flex-col gap-0.5 ml-1">
                    <img :src="getSpellIcon(match.spell1_id)" class="w-5 h-5 rounded-sm bg-black/5 dark:bg-white/5" />
                    <img :src="getSpellIcon(match.spell2_id)" class="w-5 h-5 rounded-sm bg-black/5 dark:bg-white/5" />
                  </div>

                  <div v-if="match.perk0" class="flex flex-col gap-0.5">
                    <div class="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                      <img :src="getPerkIcon(match.perk0)" class="w-3.5 h-3.5 object-contain" />
                    </div>
                    <div class="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                      <img :src="getPerkStyleIcon(match.perk_sub_style)" class="w-3 h-3 object-contain grayscale opacity-70" />
                    </div>
                  </div>
                </div>

                <div class="flex flex-col w-24 items-center text-center shrink-0 ml-1">
                  <div class="text-[15px] font-black text-gray-800 dark:text-gray-100 tracking-tight">
                    <span>{{ match.kills }}</span> 
                    <span class="text-gray-300 dark:text-gray-600 font-normal mx-0.5">/</span> 
                    <span class="text-red-500">{{ match.deaths }}</span> 
                    <span class="text-gray-300 dark:text-gray-600 font-normal mx-0.5">/</span> 
                    <span>{{ match.assists }}</span>
                  </div>
                  <div class="text-[11px] font-bold" :class="match.kda >= 4 ? 'text-emerald-500' : match.kda >= 3 ? 'text-teal-500' : 'text-gray-500'">
                    {{ match.kda.toFixed(2) }} KDA
                  </div>
                </div>

                <div class="hidden md:flex flex-col w-24 text-[11px] text-gray-500 dark:text-gray-400 gap-1 border-l border-gray-200 dark:border-gray-700/50 pl-3 shrink-0">
                  <div class="flex justify-between items-center">
                    <span>参团率</span>
                    <span class="font-bold text-[#e84057]">{{ Math.round(match.kill_participation_rate * 100) }}%</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span>视野分</span>
                    <span class="font-bold text-gray-700 dark:text-gray-200">{{ match.vision_score || 0 }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span>总补刀</span>
                    <span class="font-bold text-gray-700 dark:text-gray-200">
                      {{ match.total_minions_killed + match.neutral_minions_killed }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-col justify-center ml-auto">
                  <div class="flex gap-1 items-center">
                    <div class="grid grid-cols-3 md:grid-cols-6 gap-0.5">
                      <div v-for="i in 6" :key="i" class="w-6 h-6 md:w-6.5 md:h-6.5 rounded-md bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
                        <img v-if="match[`item${i-1}`]" :src="getItemIcon(match[`item${i-1}`])" class="w-full h-full object-cover scale-110" />
                      </div>
                    </div>
                    <div class="w-6 h-6 md:w-6.5 md:h-6.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden shrink-0 ml-1">
                       <img v-if="match.item6" :src="getItemIcon(match.item6)" class="w-full h-full object-cover scale-110" />
                    </div>
                  </div>
                </div>

                <div class="ml-1 text-gray-400 dark:text-gray-500 transition-transform duration-300" :class="{'rotate-180': expandedIndex === index}">
                  <ChevronDown class="w-4 h-4" />
                </div>
              </div>

              <transition name="match-expand">
                <div v-if="expandedIndex === index" class="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-black/20 p-4 backdrop-blur-sm">
                  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                    <div v-for="(metrics, categoryName) in getCategorizedMetrics(match)" :key="categoryName" class="flex flex-col gap-1.5">
                      <h4 class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-0.5 mb-0.5">
                        {{ categoryName }}
                      </h4>
                      <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                        <div v-for="item in metrics" :key="item.label" class="flex justify-between items-center text-[11px]">
                          <span class="text-gray-500 dark:text-gray-400 truncate pr-1" :title="item.label">{{ item.label }}</span>
                          <span class="font-bold text-gray-800 dark:text-gray-200 font-mono">{{ formatValue(item.val) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <div v-if="serverExhausted && matches.length > 0 && currentPage === totalPages" class="py-6 text-center text-xs text-gray-400">
            — 服务器中已无更多符合当前条件的记录 —
          </div>

        </div>

        <!-- 浮动指示器：映射到全局引擎的状态 -->
        <div v-if="isCloudSyncing" class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/80 dark:bg-white/90 text-white dark:text-gray-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur flex items-center gap-2 z-20 transition-all pointer-events-none">
          <Loader2 class="w-3.5 h-3.5 animate-spin" />
          引擎正在向云端搜索更早的战绩...
        </div>

      </div>
    </main>
  </div>
</template>

<script lang="ts">
// 模块级缓存 — 生命周期与 JS 模块相同，页面内导航不会重置
let _ddragonCache: {
  version: string;
  champions: { id: number; name: string }[];
  spellMap: Record<string, string>;
  perkMap: Record<string, string>;
} | null = null;
</script>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Filter, Search, ChevronDown, ChevronLeft, ChevronRight, ScrollText, Loader2 } from 'lucide-vue-next';
import { dbService } from '../core/db/schema';
import { useUserStore } from '../store/user';
import { QUEUE_TYPES, getQueueName } from '../constants/game-dict';
import { METRICS_MAP } from '../constants/metrics';

const userStore = useUserStore();

// --- 明确类型的响应式状态 ---
const isPageLoading = ref<boolean>(false);
const isCloudSyncing = computed(() => userStore.isSyncing);
const serverExhausted = ref<boolean>(false);
const expandedIndex = ref<number | null>(null);

const currentPage = ref<number>(1);
const pageSize = ref<number>(20);
const totalLocalMatches = ref<number>(0);

const totalPages = computed<number>(() => Math.ceil(totalLocalMatches.value / pageSize.value) || 1);

const showChampSelect = ref<boolean>(false);
const champSearchQuery = ref<string>('');
const matches = ref<any[]>([]);
const championList = ref<any[]>([]);
const ddragonVersion = ref<string>('14.13.1');
const spellMap = ref<Record<string, string>>({});
const perkMap = ref<Record<string, string>>({});

// --- 筛选器 ---
const filters = ref({ queueId: 0, position: '', championId: 0 });
const roles = [
  { id: '', name: '全部' },
  { id: 'TOP', name: '上单' },
  { id: 'JUNGLE', name: '打野' },
  { id: 'MIDDLE', name: '中单' },
  { id: 'BOTTOM', name: '下路' },
  { id: 'UTILITY', name: '辅助' }
];

const filteredChamps = computed(() => {
  if (!champSearchQuery.value) return championList.value;
  return championList.value.filter(c => c.name.includes(champSearchQuery.value));
});

const getSelectedChampName = () => {
  if (filters.value.championId === 0) return '所有英雄';
  const champ = championList.value.find(c => c.id === filters.value.championId);
  return champ ? champ.name : '未知';
};

const selectChamp = (id: number) => {
  filters.value.championId = id;
  showChampSelect.value = false;
  champSearchQuery.value = '';
  handleFilterChange();
};

onMounted(async () => {
  await initDDragonData();
  // 【修复点 1】：改用 userStore.currentViewPlayer
  if (userStore.currentViewPlayer) {
    await updateLocalCount();
    await fetchLocalDataOnly();
  }
});

// 【修复点 2】：监听玩家切换以触发战绩刷新
watch(() => userStore.currentViewPlayer?.puuid, async (newVal) => {
  if (newVal) {
    serverExhausted.value = false;
    resetFilters(); // 里面会调用 fetchLocalDataOnly
  } else {
    matches.value = [];
    totalLocalMatches.value = 0;
  }
});

watch(() => userStore.isSyncing, async (syncing, oldSyncing) => {
   if (oldSyncing === true && syncing === false) {
       await updateLocalCount();
       await fetchLocalDataOnly();
   }
});

const handleFilterChange = async () => {
  currentPage.value = 1;
  expandedIndex.value = null;
  await updateLocalCount();
  await fetchLocalDataOnly();
};

const resetFilters = async () => {
  filters.value = { queueId: 0, position: '', championId: 0 };
  await handleFilterChange();
};

const handlePrevPage = async () => {
  if (currentPage.value > 1 && !isPageLoading.value) {
    currentPage.value--;
    expandedIndex.value = null;
    await fetchLocalDataOnly();
  }
};

const handleNextPage = async () => {
  if (isPageLoading.value || isCloudSyncing.value) return;
  if (currentPage.value >= totalPages.value && serverExhausted.value) return;

  currentPage.value++;
  expandedIndex.value = null;
  
  const requiredMatches = currentPage.value * pageSize.value;
  
  if (totalLocalMatches.value < requiredMatches && !serverExhausted.value) {
    isPageLoading.value = true;
    const isExhausted = await userStore.fetchDeepGames(requiredMatches);
    if (isExhausted) {
        serverExhausted.value = true;
    }
    await updateLocalCount();
    isPageLoading.value = false;
  }

  if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value;
  }
  await fetchLocalDataOnly(); 
};

// 【修复点 3】：查询时以 userStore.currentViewPlayer 的 puuid 为准
const updateLocalCount = async () => {
  if (!userStore.currentViewPlayer || !dbService.isReady) return;
  
  let query = `SELECT COUNT(*) as cnt FROM match_games WHERE puuid = $1`;
  let params: any[] = [userStore.currentViewPlayer.puuid];
  let paramIndex = 2;

  if (filters.value.queueId !== 0) { query += ` AND queue_id = $${paramIndex++}`; params.push(filters.value.queueId); }
  if (filters.value.position !== '') { query += ` AND position = $${paramIndex++}`; params.push(filters.value.position); }
  if (filters.value.championId !== 0) { query += ` AND champion_id = $${paramIndex++}`; params.push(filters.value.championId); }

  const res = await dbService.instance.select<any[]>(query, params);
  totalLocalMatches.value = res.length > 0 ? (Number(res[0].cnt) || 0) : 0; 
};

const fetchLocalDataOnly = async () => {
  if (!userStore.currentViewPlayer || !dbService.isReady) return;
  isPageLoading.value = true;

  try {
    let query = `SELECT * FROM match_games WHERE puuid = $1`;
    let params: any[] = [userStore.currentViewPlayer.puuid];
    let paramIndex = 2;

    if (filters.value.queueId !== 0) { query += ` AND queue_id = $${paramIndex++}`; params.push(filters.value.queueId); }
    if (filters.value.position !== '') { query += ` AND position = $${paramIndex++}`; params.push(filters.value.position); }
    if (filters.value.championId !== 0) { query += ` AND champion_id = $${paramIndex++}`; params.push(filters.value.championId); }

    const validPage = Math.max(1, currentPage.value);
    const offset = (validPage - 1) * pageSize.value;
    
    query += ` ORDER BY game_creation DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(pageSize.value, offset);

    matches.value = await dbService.instance.select<any[]>(query, params);
  } finally {
    isPageLoading.value = false;
  }
};

const initDDragonData = async () => {
  if (_ddragonCache) {
    ddragonVersion.value = _ddragonCache.version;
    championList.value = _ddragonCache.champions;
    spellMap.value = _ddragonCache.spellMap;
    perkMap.value = _ddragonCache.perkMap;
    return;
  }

  try {
    const versions: string[] = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
    const version = versions[0];
    ddragonVersion.value = version;

    const [champData, spellsData, perksData] = await Promise.all([
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/champion.json`).then(r => r.json()),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/summoner.json`).then(r => r.json()),
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/runesReforged.json`).then(r => r.json()),
    ]);

    const champions = Object.values(champData.data)
      .map((c: any) => ({ id: parseInt(c.key), name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

    const spells: Record<string, string> = {};
    for (const key in spellsData.data) spells[spellsData.data[key].key] = spellsData.data[key].image.full;

    const perks: Record<string, string> = {};
    perksData.forEach((tree: any) => {
      perks[tree.id] = tree.icon;
      tree.slots.forEach((slot: any) => slot.runes.forEach((rune: any) => perks[rune.id] = rune.icon));
    });

    championList.value = champions;
    spellMap.value = spells;
    perkMap.value = perks;

    _ddragonCache = { version, champions, spellMap: spells, perkMap: perks };
  } catch (e) {
    console.error('[Orianna] DDragon 数据加载失败:', e);
  }
};

const toggleExpand = (index: number) => expandedIndex.value = expandedIndex.value === index ? null : index;

const getCategorizedMetrics = (match: any) => {
  const categories: Record<string, {label: string, val: any}[]> = { '伤害与治疗': [], '战斗表现': [], '视野控制': [], '地图资源': [], '经济发育': [], '其他统计': [] };
  for (const [key, val] of Object.entries(match)) {
    if (!METRICS_MAP[key] || val === 0 || val === null || typeof val === 'boolean' || val === '') continue;
    const label = METRICS_MAP[key];
    if (key.includes('damage') || key.includes('heal') || key.includes('shield')) categories['伤害与治疗'].push({ label, val });
    else if (key.includes('kill') || key.includes('death') || key.includes('assist') || key.includes('cc') || key.includes('champ')) categories['战斗表现'].push({ label, val });
    else if (key.includes('vision') || key.includes('ward')) categories['视野控制'].push({ label, val });
    else if (key.includes('turret') || key.includes('dragon') || key.includes('baron') || key.includes('objective') || key.includes('monster') || key.includes('nexus')) categories['地图资源'].push({ label, val });
    else if (key.includes('gold') || key.includes('minion') || key.includes('cs') || key.includes('item') || key.includes('purchased')) categories['经济发育'].push({ label, val });
    else categories['其他统计'].push({ label, val });
  }
  return Object.fromEntries(Object.entries(categories).filter(([_, arr]) => arr.length > 0));
};

const formatValue = (val: any) => (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(2) : val;

const getChampionIcon = (championId: number | string) => `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
const getItemIcon = (itemId: number | string) => `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion.value}/img/item/${itemId}.png`;
const getSpellIcon = (spellId: number | string) => spellMap.value[spellId as string] ? `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion.value}/img/spell/${spellMap.value[spellId as string]}` : '';
const getPerkIcon = (perkId: number | string) => perkMap.value[perkId as string] ? `https://ddragon.leagueoflegends.com/cdn/img/${perkMap.value[perkId as string]}` : '';
const getPerkStyleIcon = (styleId: number | string) => getPerkIcon(styleId);
const formatTimeAgo = (timestamp: number) => {
  const diffMins = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
  return `${Math.floor(diffMins / 1440)}天前`;
};
</script>