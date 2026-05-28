<!-- src/layout/MainLayout.vue -->
<template>
  <div class="h-screen w-full flex bg-gray-50 dark:bg-[#111111] text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-300">
    
    <!-- 极窄侧边导航栏 -->
    <aside class="w-20 shrink-0 bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-6 z-20 shadow-sm relative transition-colors duration-300">
      
      <!-- [UI 更新]：Orianna 定制魔偶 Logo -->
      <div class="w-12 h-12 flex items-center justify-center mb-8 relative group">
        <!-- 背景光晕扩散效果 -->
        <div class="absolute inset-0 bg-indigo-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <img src="../assets/logo.svg" alt="Orianna Logo" class="w-11 h-11 relative z-10 group-hover:scale-110 group-hover:rotate-90 transition-all duration-700 ease-in-out" />
      </div>

      <nav class="flex-1 w-full flex flex-col items-center gap-4">
        <router-link 
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative group outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          :class="[$route.path === item.path ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5']"
        >
          <component :is="item.icon" class="w-6 h-6" :stroke-width="$route.path === item.path ? 2.5 : 2" />
          <div class="absolute left-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
            {{ item.name }}
          </div>
        </router-link>
      </nav>

      <!-- 底部玩家头像：点击可一键回归查看自己 -->
      <div 
        class="mt-auto relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full" 
        tabindex="0"
        @click="backToLocalPlayer"
      >
        <div class="w-11 h-11 rounded-full p-0.5 transition-transform group-hover:scale-105" :class="userStore.isLcuConnected ? 'bg-linear-to-tr from-green-400 to-emerald-600' : 'bg-gray-300 dark:bg-gray-700'">
          <img 
            v-if="userStore.localPlayer"
            :src="`https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/${userStore.localPlayer.profileIconId}.png`" 
            class="w-full h-full rounded-full object-cover border-2 border-white dark:border-[#1a1a1a]"
            @error="(e) => (e.target as HTMLImageElement).src = 'https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/0.png'"
          />
          <div v-else class="w-full h-full rounded-full border-2 border-white dark:border-[#1a1a1a] bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <UserX class="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div class="absolute bottom-12 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 flex flex-col items-center">
          <span>{{ userStore.isLcuConnected ? userStore.localPlayer?.gameName : '未连接客户端' }}</span>
          <span v-if="userStore.isLcuConnected" class="text-[10px] text-gray-300 dark:text-gray-600 font-normal mt-0.5">点击回到我的大盘</span>
        </div>
      </div>
    </aside>

    <!-- 主工作区 -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <header class="h-16 shrink-0 border-b border-gray-200 dark:border-gray-800/60 bg-white/50 dark:bg-[#111111]/50 backdrop-blur-md flex items-center justify-between px-6 z-10 transition-colors duration-300">
        <h2 class="text-lg font-bold tracking-tight text-gray-800 dark:text-gray-100 flex items-center gap-2">
          {{ $route.meta.title }}
          <span v-if="userStore.currentViewPlayer && !userStore.currentViewPlayer.isLocal" class="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md ml-2 border border-indigo-200 dark:border-indigo-800">
            正在观测: {{ userStore.currentViewPlayer.gameName }}
          </span>
        </h2>

        <div class="flex items-center gap-3">
          <button
            @click="handleGlobalSync"
            :disabled="!userStore.isLcuConnected || userStore.isSyncing"
            class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            :class="[userStore.isLcuConnected ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600']"
          >
            <RefreshCw class="w-4 h-4" :class="{'animate-spin': userStore.isSyncing}" />
            <span>{{ userStore.isSyncing ? '同步中...' : '同步当前' }}</span>
          </button>

          <!-- 新增主题切换按钮 -->
          <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 ml-1 mr-1"></div>

          <button 
            @click="toggleTheme"
            class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            title="切换主题颜色"
          >
            <Moon v-if="!isDarkMode" class="w-4 h-4 text-gray-600" />
            <Sun v-else class="w-4 h-4 text-gray-300" />
          </button>

          <button 
            @click="isRightPanelOpen = !isRightPanelOpen"
            class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors relative"
            title="多玩家调度器"
          >
            <Users class="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span v-if="userStore.comparePool.length > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-[#111] text-[9px] font-bold text-white flex items-center justify-center">
              {{ userStore.comparePool.length }}
            </span>
          </button>
        </div>
      </header>

      <div class="flex-1 overflow-x-hidden overflow-y-auto p-4 md:px-6 md:py-4 custom-scrollbar bg-gray-50 dark:bg-[#141414] transition-colors duration-300">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 右侧：玩家调度器 (对比池、全服搜索 & 好友列表) -->
    <aside 
      class="shrink-0 bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-800 flex flex-col z-20 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
      :class="isRightPanelOpen ? 'w-72' : 'w-0 border-l-0'"
    >
      <div class="w-72 h-full flex flex-col overflow-hidden">
        
        <!-- 对比池核心控制区 -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-white/5 transition-colors duration-300">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Swords class="w-4 h-4 text-indigo-500" /> 多维对比池
            </h3>
            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded-md">{{ userStore.comparePool.length }}</span>
          </div>
          
          <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto ui-scrollbar pr-1 -mr-1 mt-1">
            <div 
              v-for="p in userStore.comparePool" :key="p.puuid"
              @click="handleViewPlayer(p)"
              class="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-[#222] border hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group cursor-pointer shadow-sm relative overflow-hidden shrink-0"
              :class="userStore.currentViewPlayer?.puuid === p.puuid ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/30 dark:bg-indigo-500/10' : 'border-gray-100 dark:border-gray-800'"
            >
              <!-- 侧边激活状态指示条 -->
              <div v-if="userStore.currentViewPlayer?.puuid === p.puuid" class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              
              <div class="relative w-8 h-8 shrink-0 ml-1">
                <img :src="`https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/${p.profileIconId}.png`" class="w-full h-full rounded-lg object-cover ring-1 ring-black/5 dark:ring-white/10" />
              </div>
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="text-xs font-bold text-gray-900 dark:text-gray-100 truncate" :class="{'text-indigo-600 dark:text-indigo-400': userStore.currentViewPlayer?.puuid === p.puuid}">{{ p.gameName }}</div>
                <div class="text-[9px] text-gray-500 truncate">#{{ p.tagLine }}</div>
              </div>
              <button 
                @click.stop="userStore.toggleComparePlayer(p)"
                class="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                title="移出对比池"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div v-if="userStore.comparePool.length === 0" class="w-full py-4 text-center text-xs text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-black/20 shrink-0">
              未选择玩家。请从下方添加。
            </div>
          </div>
        </div>

        <!-- 跨区玩家全服搜素唤起按钮 -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <button 
                @click="isSearchModalOpen = true"
                class="w-full flex items-center justify-between bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20 rounded-xl px-4 py-3 text-sm font-bold transition-all group"
            >
                <div class="flex items-center gap-2">
                    <Search class="w-4 h-4" />
                    <span>全服召唤师检索</span>
                </div>
                <div class="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-black/20 group-hover:scale-105 transition-transform text-indigo-500 dark:text-indigo-400">
                    Ctrl+F
                </div>
            </button>
        </div>

        <!-- 好友列表 (带搜索) -->
        <div class="flex-1 overflow-y-auto ui-scrollbar flex flex-col relative transition-colors duration-300">
          <!-- 悬浮搜索框 -->
          <div class="sticky top-0 bg-white dark:bg-[#1a1a1a] z-10 px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-gray-400">在线好友</span>
                <span class="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded transition-colors">{{ filteredAndSortedFriends.length }}</span>
            </div>
            <div class="relative">
                <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input 
                    v-model="friendSearchQuery" 
                    placeholder="搜索好友..." 
                    class="w-full bg-gray-50 dark:bg-white/5 border border-transparent focus:border-indigo-500/30 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 outline-none transition-all"
                />
            </div>
          </div>
          
          <div class="flex flex-col gap-1 p-3">
            <div 
              v-for="friend in filteredAndSortedFriends" 
              :key="friend.puuid"
              class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group relative cursor-pointer"
              @dblclick="handleViewPlayer(friend)"
            >
              <div class="relative w-10 h-10 shrink-0">
                <img :src="`https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/${friend.profileIconId}.png`" class="w-full h-full rounded-xl object-cover" />
                <div 
                  class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1a1a1a]"
                  :class="{
                    'bg-green-500': friend.availability === 'chat',
                    'bg-blue-500': friend.availability === 'dnd',
                    'bg-red-500': friend.availability === 'away',
                    'bg-gray-400': friend.availability === 'offline' || friend.availability === 'mobile'
                  }"
                ></div>
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{{ friend.gameName }}</div>
                <div class="text-[10px] text-gray-500 truncate">#{{ friend.tagLine }}</div>
              </div>

              <!-- 悬浮操作菜单 -->
              <div class="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#222] p-1 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 z-10">
                <button 
                  @click="handleViewPlayer(friend)"
                  class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 dark:hover:bg-indigo-500/20 transition-colors tooltip"
                  title="观测其单人面板"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button 
                  @click="userStore.toggleComparePlayer(friend)"
                  class="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
                  :class="userStore.isInComparePool(friend.puuid) ? 'bg-red-50 text-red-600 dark:bg-red-500/20 hover:bg-red-100' : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 dark:hover:bg-indigo-500/20'"
                  :title="userStore.isInComparePool(friend.puuid) ? '移出对比池' : '加入对比池'"
                >
                  <UserMinus v-if="userStore.isInComparePool(friend.puuid)" class="w-4 h-4" />
                  <UserPlus v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div v-if="filteredAndSortedFriends.length === 0" class="text-center py-8 text-sm text-gray-400">
              {{ friendSearchQuery ? '未搜索到匹配的好友' : '暂无好友数据' }}
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 检索核心组件加载 -->
    <SearchSummonerModal v-model:show="isSearchModalOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  LayoutDashboard, ScrollText, GitCompare, Blocks, Settings, 
  RefreshCw, UserX, Users, Swords, UserPlus, UserMinus, 
  Eye, X, Search, Sun, Moon 
} from 'lucide-vue-next';
import { useUserStore, type AppPlayer } from '../store/user';
import SearchSummonerModal from '../components/ui/SearchSummonerModal.vue';

const userStore = useUserStore();
const router = useRouter();

const navItems = [
  { name: '数据总览', path: '/', icon: LayoutDashboard },
  { name: '生涯战绩', path: '/history', icon: ScrollText },
  { name: '数据对比', path: '/compare', icon: GitCompare },
  { name: '创意工坊', path: '/plugins', icon: Blocks },
  { name: '系统设置', path: '/settings', icon: Settings }
];

const isRightPanelOpen = ref(true); 
const isSearchModalOpen = ref(false);
let friendsRefreshTimer: ReturnType<typeof setInterval> | null = null;

const friendSearchQuery = ref('');

// --- 主题切换逻辑 ---
const isDarkMode = ref(false);

const initTheme = () => {
    const saved = localStorage.getItem('orianna_theme');
    // 如果系统保存的是 dark 或者没有设置但系统底层是深色偏好
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        isDarkMode.value = true;
        document.documentElement.classList.add('dark');
    } else {
        isDarkMode.value = false;
        document.documentElement.classList.remove('dark');
    }
};

const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    if (isDarkMode.value) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('orianna_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('orianna_theme', 'light');
    }
};

const filteredAndSortedFriends = computed(() => {
    const list = userStore.friendsList;
    if (!friendSearchQuery.value) return list;
    const lowerQ = friendSearchQuery.value.toLowerCase();
    return list.filter(f =>
        f.gameName.toLowerCase().includes(lowerQ) ||
        f.tagLine.toLowerCase().includes(lowerQ)
    );
});

const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        isSearchModalOpen.value = true;
    }
};

onMounted(() => {
    initTheme(); // 挂载时初始化主题
    friendsRefreshTimer = setInterval(() => {
        if(userStore.isLcuConnected) userStore.fetchFriends();
    }, 30000);
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    if (friendsRefreshTimer) clearInterval(friendsRefreshTimer);
});

const handleGlobalSync = async () => {
  if (!userStore.currentViewPlayer) return;
  await userStore.smartSync(true); 
};

const handleViewPlayer = (friend: AppPlayer) => {
    userStore.setViewPlayer(friend);
    if(router.currentRoute.value.path !== '/') router.push('/');
};

const backToLocalPlayer = () => {
    if(userStore.localPlayer) {
        userStore.setViewPlayer(userStore.localPlayer);
        if(router.currentRoute.value.path !== '/') router.push('/');
    }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>