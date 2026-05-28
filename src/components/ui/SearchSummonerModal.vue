<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="close">
        
        <!-- 移除 overflow-hidden，改为相对定位，允许下拉框溢出模态框边界 -->
        <div class="bg-white dark:bg-[#1f1f23] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800 transition-all max-h-[85vh] relative">
            
            <!-- Header (增加 rounded-t-2xl 适配圆角) -->
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between bg-gray-50/50 dark:bg-[#1a1a1e]/50 rounded-t-2xl shrink-0">
                <h3 class="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Search class="w-5 h-5 text-indigo-500" /> 全服召唤师检索
                </h3>
                <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- 搜索操作区 (固定高度不参与滚动，永远悬浮于结果之上) -->
            <div class="px-5 pt-5 pb-3 flex flex-col gap-4 relative z-30 shrink-0">
                <div class="flex items-stretch gap-2 relative">
                    <!-- 区服下拉框 -->
                    <div class="relative w-36 shrink-0" v-if="isTencentRegion">
                        <button 
                            @click="isDropdownOpen = !isDropdownOpen" 
                            :disabled="searchProgress.isProcessing" 
                            class="w-full h-10 flex items-center justify-between px-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#141417] text-sm text-gray-800 dark:text-gray-200 disabled:opacity-50"
                        >
                            <span class="truncate font-medium">{{ getServerName(sgpServerId) }}</span>
                            <ChevronDown class="w-4 h-4 text-gray-400" />
                        </button>
                        
                        <div v-if="isDropdownOpen" class="fixed inset-0 z-40" @click="isDropdownOpen = false"></div>
                        <!-- 下拉菜单：此时哪怕超出模态框底部，也能完美展示 -->
                        <div v-if="isDropdownOpen" class="absolute top-full left-0 mt-1 w-48 max-h-56 overflow-y-auto ui-scrollbar bg-white dark:bg-[#232329] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1">
                            <button 
                                v-for="srv in tencentServers" :key="srv.value" 
                                @click="sgpServerId = srv.value; isDropdownOpen = false" 
                                class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-gray-700 dark:text-gray-300 transition-colors truncate"
                                :class="{'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-500/10': sgpServerId === srv.value}"
                            >
                                {{ srv.label }}
                            </button>
                        </div>
                    </div>

                    <!-- 输入框 -->
                    <div class="relative flex-1">
                        <input 
                            ref="inputRef"
                            v-model="inputText"
                            :disabled="searchProgress.isProcessing"
                            :placeholder="placeholderText"
                            @keyup.enter="handleSearch"
                            class="w-full h-10 bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none rounded-lg px-3 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50 transition-colors placeholder:text-gray-400"
                        />
                        <button v-if="inputText && !searchProgress.isProcessing" @click="handleClearInput" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X class="w-4 h-4" />
                        </button>
                    </div>

                    <!-- 搜索与取消按钮 -->
                    <button 
                        v-if="searchProgress.isProcessing && searchType === 'fuzzy'" 
                        @click="handleCancel" 
                        class="h-10 px-4 shrink-0 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 font-bold text-sm rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <X class="w-4 h-4" /> 取消
                    </button>
                    <button 
                        v-else 
                        @click="handleSearch" 
                        :disabled="!inputText || searchType === 'invalid' || searchProgress.isProcessing" 
                        class="h-10 px-4 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:dark:bg-gray-800 disabled:text-gray-400 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Loader2 v-if="searchProgress.isProcessing" class="w-4 h-4 animate-spin" />
                        <Search v-else class="w-4 h-4" />
                        {{ searchProgress.isProcessing ? '搜索中' : '搜索' }}
                    </button>
                </div>

                <!-- 状态与进度提示 (维持在非滚动区，避免搜索时高度跳动) -->
                <div class="flex flex-col gap-1 -mt-1 min-h-5">
                    <Transition name="slide-fade">
                        <div v-if="searchType === 'fuzzy' && !searchProgress.isProcessing" class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✨ 模糊搜索已激活</div>
                    </Transition>
                    <Transition name="slide-fade">
                        <div v-if="searchType === 'exact' && !searchProgress.isProcessing" class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">🎯 精确搜索已激活</div>
                    </Transition>
                    <Transition name="slide-fade">
                        <div v-if="searchType === 'puuid' && !searchProgress.isProcessing" class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">🆔 PUUID 搜索已激活</div>
                    </Transition>
                    <Transition name="slide-fade">
                        <div v-if="hasInvisibleChar && !searchProgress.isProcessing" class="text-xs text-amber-500 font-medium">⚠️ 输入包含不可见字符，搜索时将自动剔除。</div>
                    </Transition>
                    <Transition name="slide-fade">
                        <div v-if="inputText.length !== 0 && searchType === 'invalid' && !searchProgress.isProcessing" class="text-xs text-red-500 font-medium">❌ 输入格式无效。</div>
                    </Transition>

                    <Transition name="slide-fade">
                        <div v-if="searchProgress.isProcessing && searchProgress.type === 'fuzzy'" class="flex flex-col gap-1">
                            <div class="text-[10px] text-indigo-600 dark:text-indigo-400 flex justify-between font-bold">
                                <span>正在全服验证命中库... ({{ searchProgress.finish }} / {{ searchProgress.total }})</span>
                                <span>{{ searchProgress.total === 0 ? 0 : Math.floor((searchProgress.finish / searchProgress.total) * 100) }}%</span>
                            </div>
                            <div class="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div class="h-full bg-indigo-500 transition-all duration-300" :style="{ width: `${searchProgress.total === 0 ? 0 : Math.floor((searchProgress.finish / searchProgress.total) * 100)}%` }"></div>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>

            <!-- 搜索结果与历史区 (独立的滚动容器) -->
            <div class="px-5 pb-5 flex-1 overflow-y-auto ui-scrollbar relative z-10 rounded-b-2xl flex flex-col gap-4 min-h-0">
                <div v-if="isEmpty" class="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                    <UserX class="w-12 h-12 mb-3 opacity-30" />
                    <p class="text-sm" v-if="searchProgress.type === 'fuzzy'">在验证的 {{ searchProgress.finish }} 位玩家中，均未查询到战绩记录：<span class="font-bold text-gray-700 dark:text-gray-200">{{ searchText }}</span></p>
                    <p class="text-sm" v-else>未能找到匹配的召唤师记录：<span class="font-bold text-gray-700 dark:text-gray-200">{{ searchText }}</span></p>
                </div>

                <div v-if="searchResult.length > 0" class="flex flex-col gap-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">搜索结果</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div 
                            v-for="res in searchResult" :key="res.puuid"
                            class="flex items-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-[#1a1a1e] dark:hover:bg-[#232329] border border-gray-200 dark:border-gray-800 transition-colors cursor-pointer group shadow-sm"
                            @click="handleResultClick(res)"
                        >
                            <img :src="`https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/${res.profileIconId}.png`" class="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover" />
                            <div class="ml-3 flex-1 min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{{ res.gameName }}</span>
                                    <span class="text-[9px] px-1 py-0.5 rounded-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-medium shrink-0">LV.{{ res.summonerLevel }}</span>
                                </div>
                                <div class="text-xs text-gray-500 truncate">#{{ res.tagLine }}</div>
                            </div>
                            
                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button @click.stop="userStore.toggleComparePlayer(res)" class="w-7 h-7 rounded-md flex items-center justify-center transition-colors tooltip shrink-0" :class="userStore.isInComparePool(res.puuid) ? 'bg-red-50 text-red-500 dark:bg-red-500/20 hover:bg-red-100' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20'" :title="userStore.isInComparePool(res.puuid) ? '移出对比池' : '加入对比池'">
                                    <UserMinus v-if="userStore.isInComparePool(res.puuid)" class="w-3.5 h-3.5" />
                                    <UserPlus v-else class="w-3.5 h-3.5" />
                                </button>
                                <button @click.stop="handleResultClick(res)" class="w-7 h-7 rounded-md flex items-center justify-center transition-colors text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 tooltip shrink-0" title="设为当前观测对象">
                                    <Eye class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="filteredHistory.length > 0 && searchResult.length === 0 && !isEmpty" class="flex flex-col gap-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">最近搜索</span>
                        <button @click="clearHistory" class="text-[10px] text-gray-400 hover:text-red-500 transition-colors">清空</button>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <div v-for="h in filteredHistory" :key="h.puuid" 
                            class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-[#1a1a1e] dark:hover:bg-white/5 border border-gray-200 dark:border-gray-800 transition-colors cursor-pointer group shadow-sm"
                            :class="{'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/10': h.isPinned}"
                            @click="handleHistoryClick(h)"
                        >
                            <span v-if="isCrossServer(h.sgpServerId)" class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-1 rounded">{{ getServerName(h.sgpServerId || '') }}</span>
                            <span class="text-xs font-bold text-gray-800 dark:text-gray-200">{{ h.gameName }}</span>
                            <span class="text-[10px] text-gray-500">#{{ h.tagLine }}</span>
                            
                            <div class="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button @click.stop="togglePin(h)" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors" :class="{'text-indigo-500 opacity-100': h.isPinned}">
                                    <Pin class="w-3 h-3" />
                                </button>
                                <button @click.stop="removeHistory(h)" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
                                    <X class="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue';
import { Search, X, Pin, Eye, UserPlus, UserMinus, Loader2, ChevronDown, UserX } from 'lucide-vue-next';
import { lcuApi } from '../../core/api/lcu';
import { rcApi } from '../../core/api/rc'; 
import { sgpApi } from '../../core/api/sgp/index';
import { syncService } from '../../core/services/sync';
import { useUserStore, type AppPlayer } from '../../store/user';
import serverData from '../../assets/league-servers.json';

const show = defineModel<boolean>('show', { default: false });
const userStore = useUserStore();

const inputText = ref('');
const searchText = ref('');
const sgpServerId = ref('');
const isDropdownOpen = ref(false);

const localSgpServerId = computed(() => userStore.localPlayer?.sgpServerId || '');
const isTencentRegion = computed(() => localSgpServerId.value.startsWith('TENCENT'));

const tencentServers = computed(() => {
    if (!isTencentRegion.value) return [];
    return (serverData.tencentServerMatchHistoryInteroperability || []).map(id => ({
        label: (serverData.serverNames as any)['zh-CN'][id] || id,
        value: id
    }));
});

const getServerName = (id: string) => (serverData.serverNames as any)['zh-CN'][id] || id;
const isCrossServer = (id?: string) => id && id !== localSgpServerId.value;

const placeholderTexts = ["输入 PUUID 或 游戏名#标签", "例如：春秋蝉#23760", "或者仅游戏名模糊搜索"];
const placeholderText = ref(placeholderTexts[0]);
let round = 0;
let placeholderInterval: any;

onMounted(() => {
    placeholderInterval = setInterval(() => {
        round++;
        placeholderText.value = placeholderTexts[round % placeholderTexts.length];
    }, 4000);
    loadHistory();
});
onUnmounted(() => clearInterval(placeholderInterval));

const checkNameInput = (nameStr: string) => /^(?!\s+$)[^#]+(?:#[^#]+)?$/.test(nameStr);
const invisibleCharRegex = /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u2060-\u2069\u202A-\u202E\uFFF9-\uFFFB]/g;
const replaceInvisibleChar = (str: string) => str.replace(invisibleCharRegex, '');
const isPuuid = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str.trim());

const hasInvisibleChar = computed(() => invisibleCharRegex.test(inputText.value));
const searchType = computed(() => {
    if (isPuuid(inputText.value)) return 'puuid';
    if (checkNameInput(inputText.value)) return inputText.value.includes('#') ? 'exact' : 'fuzzy';
    return 'invalid';
});

interface SearchResult extends AppPlayer { privacy: string; }
const searchResult = ref<SearchResult[]>([]);
const isEmpty = ref(false);

const searchProgress = reactive({
    isProcessing: false,
    type: 'fuzzy' as 'fuzzy' | 'exact' | 'puuid',
    total: 0, finish: 0
});

watch(() => show.value, (val) => {
    if (val) {
        inputText.value = ''; searchText.value = ''; searchResult.value = [];
        isEmpty.value = false; searchProgress.isProcessing = false;
        sgpServerId.value = localSgpServerId.value || 'TENCENT_HN1';
        loadHistory();
    } else {
        searchProgress.isProcessing = false;
    }
});

const handleClearInput = () => { inputText.value = ''; isEmpty.value = false; searchResult.value = []; };
const handleCancel = () => { searchProgress.isProcessing = false; };

const formatLcuSummoner = (data: any, serverId: string): SearchResult => ({
    puuid: data.puuid,
    gameName: data.gameName || data.displayName || data.name || '未知玩家',
    tagLine: data.tagLine || '',
    profileIconId: data.profileIconId || data.iconId || 1,
    sgpServerId: serverId,
    privacy: data.privacy || 'PUBLIC',
    summonerLevel: data.summonerLevel || data.level || 1,
    isLocal: false
});

const handleSearch = async () => {
    if (searchType.value === 'invalid' || searchProgress.isProcessing) return;

    searchProgress.isProcessing = true;
    searchProgress.total = 0;
    searchProgress.finish = 0;
    isEmpty.value = false;
    searchResult.value = [];
    searchText.value = searchType.value === 'puuid' ? inputText.value.trim() : replaceInvisibleChar(inputText.value);
    searchProgress.type = searchType.value as any;

    try {
        if (!sgpApi.hasLeagueSessionToken()) await syncService.initializeEnvironment();

        if (searchType.value === 'puuid') {
            if (!isCrossServer(sgpServerId.value)) {
                const summoner = await lcuApi.getSummonerByPuuid(searchText.value);
                if (summoner && summoner.puuid) searchResult.value.push(formatLcuSummoner(summoner, sgpServerId.value));
                else isEmpty.value = true;
            } else {
                const res = await sgpApi.getSummonerByPuuid(sgpServerId.value, searchText.value);
                if (!res.data || res.data.length === 0) { isEmpty.value = true; return; }
                
                const summoner = res.data[0];
                let gn = summoner.name || summoner.gameName, tl = summoner.tagLine;
                
                try {
                    const rcNameset = await rcApi.getPlayerAccountNameset([searchText.value]);
                    if (rcNameset && rcNameset.namesets && rcNameset.namesets.length > 0) {
                        gn = rcNameset.namesets[0].gnt.gameName;
                        tl = rcNameset.namesets[0].gnt.tagLine;
                    }
                } catch(e){}

                const formatted = formatLcuSummoner(summoner, sgpServerId.value);
                formatted.gameName = gn || formatted.gameName;
                formatted.tagLine = tl || formatted.tagLine;
                searchResult.value.push(formatted);
            }
        } 
        
        else if (searchType.value === 'fuzzy') {
            const aliases = await rcApi.getPlayerAccountAlias(searchText.value.trim());
            if (!aliases || aliases.length === 0) { isEmpty.value = true; return; }

            searchProgress.total = aliases.length;
            let added = 0;

            for (const alias of aliases) {
                if (!searchProgress.isProcessing) break;
                try {
                    if (!isCrossServer(sgpServerId.value)) {
                        const summoner = await lcuApi.getSummonerByPuuid(alias.puuid);
                        if (summoner && summoner.puuid) { searchResult.value.push(formatLcuSummoner(summoner, sgpServerId.value)); added++; }
                    } else {
                        const res = await sgpApi.getSummonerByPuuid(sgpServerId.value, alias.puuid);
                        if (res.data && res.data.length > 0) {
                            const formatted = formatLcuSummoner(res.data[0], sgpServerId.value);
                            formatted.gameName = alias.alias?.game_name || formatted.gameName;
                            formatted.tagLine = alias.alias?.tag_line || formatted.tagLine;
                            searchResult.value.push(formatted);
                            added++;
                        }
                    }
                } catch(e) {} finally {
                    searchProgress.finish++;
                }
            }
            if (added === 0) isEmpty.value = true;
        }

        else if (searchType.value === 'exact') {
            const [gameName, tagLine] = searchText.value.split('#');
            const aliases = await rcApi.getPlayerAccountAlias(gameName.trim(), tagLine.trim());
            
            if (!aliases || aliases.length === 0) { isEmpty.value = true; return; }
            const alias = aliases[0];

            if (!isCrossServer(sgpServerId.value)) {
                const summoner = await lcuApi.getSummonerByPuuid(alias.puuid);
                if (summoner && summoner.puuid) searchResult.value.push(formatLcuSummoner(summoner, sgpServerId.value));
                else isEmpty.value = true;
            } else {
                const res = await sgpApi.getSummonerByPuuid(sgpServerId.value, alias.puuid);
                if (res.data && res.data.length > 0) {
                    const formatted = formatLcuSummoner(res.data[0], sgpServerId.value);
                    formatted.gameName = alias.alias?.game_name || formatted.gameName;
                    formatted.tagLine = alias.alias?.tag_line || formatted.tagLine;
                    searchResult.value.push(formatted);
                } else {
                    isEmpty.value = true;
                }
            }
        }
    } catch (error) {
        console.error("跨端查询链路崩溃:", error);
        isEmpty.value = true;
    } finally {
        searchProgress.isProcessing = false;
    }
};

interface SearchHistoryItem extends AppPlayer { isPinned: boolean; timestamp: number; }
const historyList = ref<SearchHistoryItem[]>([]);

const loadHistory = () => {
    try {
        const data = localStorage.getItem('orianna_search_history');
        if (data) historyList.value = JSON.parse(data);
    } catch(e){}
};
const saveHistory = () => { localStorage.setItem('orianna_search_history', JSON.stringify(historyList.value)); };

const filteredHistory = computed(() => {
    if (!isTencentRegion.value) return historyList.value.filter(h => h.sgpServerId === sgpServerId.value);
    return historyList.value.filter(h => h.sgpServerId && tencentServers.value.some(t => t.value === h.sgpServerId));
});

const saveToHistory = (res: SearchResult) => {
    const existing = historyList.value.find(h => h.puuid === res.puuid);
    if (existing) {
        existing.timestamp = Date.now(); existing.gameName = res.gameName;
        existing.tagLine = res.tagLine; existing.profileIconId = res.profileIconId;
    } else historyList.value.push({ ...res, isPinned: false, timestamp: Date.now() });
    historyList.value.sort((a, b) => (a.isPinned === b.isPinned) ? b.timestamp - a.timestamp : (a.isPinned ? -1 : 1));
    saveHistory();
};

const handleResultClick = (res: SearchResult) => { saveToHistory(res); userStore.setViewPlayer(res); close(); };
const handleHistoryClick = (h: SearchHistoryItem) => {
    inputText.value = `${h.gameName}#${h.tagLine}`;
    sgpServerId.value = h.sgpServerId || localSgpServerId.value;
    handleSearch();
};
const togglePin = (h: SearchHistoryItem) => {
    h.isPinned = !h.isPinned;
    historyList.value.sort((a, b) => (a.isPinned === b.isPinned) ? b.timestamp - a.timestamp : (a.isPinned ? -1 : 1));
    saveHistory();
};
const removeHistory = (h: SearchHistoryItem) => { historyList.value = historyList.value.filter(item => item.puuid !== h.puuid); saveHistory(); };
const clearHistory = () => { historyList.value = historyList.value.filter(h => h.isPinned); saveHistory(); };
const close = () => { show.value = false; };
</script>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-5px); }
</style>