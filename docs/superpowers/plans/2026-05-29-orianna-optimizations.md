# Orianna 代码质量与体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复代码中已发现的 Bug（内存泄漏、死代码、逻辑重复），并提升界面交互体验（动画、骨架屏、错误状态区分、危险操作防护）。

**Architecture:** 所有改动均在现有 Vue 3 + Pinia + Tauri v2 架构内进行，不引入新依赖。按"立即修复 → 近期优化 → 体验提升"三个阶段顺序推进，每个任务独立可提交。

**Tech Stack:** Vue 3 (Composition API / `<script setup>`), Pinia, TypeScript, TailwindCSS v4, `tauri-plugin-sql` (SQLite), ECharts (vue-echarts)

---

## 文件变更总览

| 文件 | 操作 | 涉及任务 |
|------|------|---------|
| `src/components/ui/DynamicPlugin.vue` | 修改 | #1, #8, #9 |
| `src/views/Dashboard.vue` | 修改 | #1, #4 |
| `src/layout/MainLayout.vue` | 修改 | #2, #6, #8-remove-btn |
| `src/views/Compare.vue` | 修改 | #3, #4 |
| `src/core/db/schema.ts` | 修改 | #4 |
| `src/views/MatchHistory.vue` | 修改 | #5, #7 |
| `src/store/user.ts` | 修改 | #6 |
| `src/style.css` | 修改 | #7 |
| `src/core/plugins/engine.ts` | 修改 | #9 |

---

## 阶段一：立即修复（Bug 与内存泄漏）

---

### Task 1：移除死代码事件监听器 `orianna-sync-completed`

**背景：** `DynamicPlugin.vue` 和 `Dashboard.vue` 监听了 `orianna-sync-completed` 自定义事件，但整个代码库中从未有任何地方 `dispatchEvent` 触发过它。这是死代码，会产生误导性注释，应彻底删除。

**Files:**
- Modify: `src/components/ui/DynamicPlugin.vue:143-154`
- Modify: `src/views/Dashboard.vue:215`

- [ ] **Step 1：从 DynamicPlugin.vue 移除事件监听**

打开 `src/components/ui/DynamicPlugin.vue`，找到 `onMounted` 和 `onBeforeUnmount` 钩子，移除与该事件相关的所有代码：

```vue
<script setup lang="ts">
// 修改前（约第 143-154 行）：
const handleGlobalUpdate = () => { loadData(); };

onMounted(() => {
    loadData();
    window.addEventListener('orianna-sync-completed', handleGlobalUpdate);
});

watch(() => [props.players, props.globalFilters], loadData, { deep: true });

onBeforeUnmount(() => {
    window.removeEventListener('orianna-sync-completed', handleGlobalUpdate);
});

// 修改后：
onMounted(() => {
    loadData();
});

watch(() => [props.players, props.globalFilters], loadData, { deep: true });
// onBeforeUnmount 整个钩子可删除，不再有任何需要清理的全局副作用
</script>
```

- [ ] **Step 2：从 Dashboard.vue 移除事件监听**

打开 `src/views/Dashboard.vue`，找到 `onMounted` 和 `onBeforeUnmount` 钩子，移除相关代码：

```vue
<script setup lang="ts">
// 修改前（约第 198-229 行 onMounted 和 onBeforeUnmount）：
onMounted(() => {
  // ... db check logic ...
  window.addEventListener('orianna-sync-completed', updateBasicInfo);  // 删除此行
  if (gridRef.value) initSortable();
});

onBeforeUnmount(() => {
  if (dbCheckTimer) clearInterval(dbCheckTimer);
  window.removeEventListener('orianna-sync-completed', updateBasicInfo);  // 删除此行
  if (sortableInstance) sortableInstance.destroy();
});
</script>
```

- [ ] **Step 3：确认构建无报错**

```bash
npm run build
```

预期输出：`✓ built in ...` 无 TypeScript 错误。

- [ ] **Step 4：提交**

```bash
git add src/components/ui/DynamicPlugin.vue src/views/Dashboard.vue
git commit -m "fix: remove dead orianna-sync-completed event listeners"
```

---

### Task 2：修复 MainLayout 中好友刷新定时器内存泄漏

**背景：** `MainLayout.vue` 的 `onMounted` 里启动了 `setInterval` 来定期刷新好友列表，但 `onUnmounted` 里没有对应的 `clearInterval`。每次导航或热更新都会积累无法回收的定时器。

**Files:**
- Modify: `src/layout/MainLayout.vue:286,341-350`

- [ ] **Step 1：添加定时器变量并在 onUnmounted 中清除**

打开 `src/layout/MainLayout.vue`，在 `script setup` 顶部找到变量声明区，添加定时器引用变量，并更新 `onMounted` 和 `onUnmounted`：

```vue
<script setup lang="ts">
// 已有声明（约第 286 行附近）：
let clearTimer: any = null;

// 新增：好友刷新定时器引用
let friendsRefreshTimer: ReturnType<typeof setInterval> | null = null;

// 修改 onMounted（约第 342 行）：
onMounted(() => {
    initTheme();
    // 将 setInterval 的返回值保存到变量
    friendsRefreshTimer = setInterval(() => {
        if(userStore.isLcuConnected) userStore.fetchFriends();
    }, 30000);
    window.addEventListener('keydown', handleKeyDown);
});

// 修改 onUnmounted（约第 350 行）：
onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    // 新增：清除好友刷新定时器
    if (friendsRefreshTimer) clearInterval(friendsRefreshTimer);
});
</script>
```

- [ ] **Step 2：确认构建无报错**

```bash
npm run build
```

预期：`✓ built in ...` 无错误。

- [ ] **Step 3：提交**

```bash
git add src/layout/MainLayout.vue
git commit -m "fix: clear friends refresh interval on unmount to prevent memory leak"
```

---

### Task 3：将对比池同步从串行改为并行

**背景：** `Compare.vue` 的 `syncComparePool` 方法用 `for...await` 逐个同步对比池中的玩家，3 个玩家耗时约为单人耗时的 3 倍。改用 `Promise.all` 可以并发执行，大幅缩短等待时间。

**Files:**
- Modify: `src/views/Compare.vue:359-372`

- [ ] **Step 1：改写 syncComparePool 为并发同步**

打开 `src/views/Compare.vue`，找到 `syncComparePool` 函数（约第 359 行）：

```typescript
// 修改前：
const syncComparePool = async () => {
  if (isSyncingAll.value || userStore.comparePool.length === 0) return;
  isSyncingAll.value = true;
  
  try {
    for (const player of userStore.comparePool) {
      await userStore.smartSync(true, player.puuid);
    }
  } catch (e) {
    console.error('[Compare] 批量同步错误:', e);
  } finally {
    isSyncingAll.value = false;
  }
};

// 修改后：
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
```

- [ ] **Step 2：确认构建无报错**

```bash
npm run build
```

预期：`✓ built in ...`。

- [ ] **Step 3：手动验证**

启动 `npm run tauri dev`，前往对比页面，在对比池中添加 2～3 个玩家，点击"同步对比池数据"，观察同步进度是否明显快于以前。

- [ ] **Step 4：提交**

```bash
git add src/views/Compare.vue
git commit -m "perf: parallelize compare pool sync with Promise.all"
```

---

## 阶段二：近期优化（性能与架构）

---

### Task 4：将 DB 就绪检测从 50ms 轮询改为 Promise-based

**背景：** `Dashboard.vue` 和 `Compare.vue` 都用 `setInterval(..., 50)` 轮询 `dbService.isReady`，每秒产生 20 次调用。应在 `DatabaseService` 里暴露一个 `ready` Promise，组件只需 `await` 一次即可。

**Files:**
- Modify: `src/core/db/schema.ts:267-338`
- Modify: `src/views/Dashboard.vue:123-214`
- Modify: `src/views/Compare.vue:200-388`

- [ ] **Step 1：在 DatabaseService 中添加 ready Promise**

打开 `src/core/db/schema.ts`，修改 `DatabaseService` 类：

```typescript
export class DatabaseService {
    private db: Database | null = null;
    public isReady = false;

    // 新增：ready Promise，供外部 await
    private _resolveReady!: () => void;
    public readonly ready: Promise<void> = new Promise(resolve => {
        this._resolveReady = resolve;
    });

    async init() {
        try {
            this.db = await Database.load('sqlite:orianna.db');
            await this.db.execute(INIT_GAMES_TABLE_SQL);

            const autoMigrateColumns = [
                // ... 保持不变 ...
                { name: 'calc_cs_per_minute', type: 'REAL' },
                { name: 'calc_wards_placed_per_minute', type: 'REAL' },
                { name: 'calc_wards_killed_per_minute', type: 'REAL' },
                { name: 'calc_damage_to_champs_per_minute', type: 'REAL' },
                { name: 'calc_damage_taken_per_minute', type: 'REAL' },
                { name: 'calc_heal_per_minute', type: 'REAL' },
                { name: 'calc_cc_time_per_minute', type: 'REAL' },
                { name: 'calc_objective_damage_per_minute', type: 'REAL' },
                { name: 'calc_kda', type: 'REAL' },
                { name: 'player_augment_1', type: 'INTEGER' },
                { name: 'player_augment_2', type: 'INTEGER' },
                { name: 'player_augment_3', type: 'INTEGER' },
                { name: 'player_augment_4', type: 'INTEGER' },
                { name: 'player_augment_5', type: 'INTEGER' },
                { name: 'player_augment_6', type: 'INTEGER' }
            ];

            for (const col of autoMigrateColumns) {
                try {
                    await this.db.execute(`ALTER TABLE match_games ADD COLUMN ${col.name} ${col.type} DEFAULT 0;`);
                } catch (e) {
                    // 字段已存在，正常忽略
                }
            }

            this.isReady = true;
            this._resolveReady(); // 新增：通知所有等待者
        } catch (error: any) {
            console.error('[Orianna Debug] [DB Error] 数据库初始化彻底失败:', error);
            throw error;
        }
    }

    // clearGamesData 和 instance getter 保持不变
    async clearGamesData() { /* ... 不变 ... */ }
    get instance() { /* ... 不变 ... */ }
}

export const dbService = new DatabaseService();
```

- [ ] **Step 2：重写 Dashboard.vue 的 DB 就绪等待逻辑**

打开 `src/views/Dashboard.vue`，找到 `onMounted` 函数，移除 `setInterval` 轮询，改用 `await dbService.ready`：

```typescript
// 删除这些变量声明（不再需要）：
// const isDbReady = ref(false);
// let dbCheckTimer: ReturnType<typeof setInterval> | null = null;

// 新增：
const isDbReady = ref(false);

onMounted(async () => {
  // 等待 DB 就绪（如果已就绪则立即完成，否则等待 init() 完成）
  await dbService.ready;
  isDbReady.value = true;
  await updateBasicInfo();
  if (userStore.currentViewPlayer) {
    userStore.smartSync(false, userStore.currentViewPlayer.puuid);
  }
  if (gridRef.value) initSortable();
});

// onBeforeUnmount 中删除 clearInterval(dbCheckTimer!) 相关行：
onBeforeUnmount(() => {
  // if (dbCheckTimer) clearInterval(dbCheckTimer);  <- 删除此行
  if (sortableInstance) sortableInstance.destroy();
});
```

同时，从 `script setup` 顶部删除已无用的 `dbCheckTimer` 变量声明（约第 124 行）。

- [ ] **Step 3：重写 Compare.vue 的 DB 就绪等待逻辑**

打开 `src/views/Compare.vue`，同样改写 `onMounted`：

```typescript
// 删除：
// let dbCheckTimer: ReturnType<typeof setInterval> | null = null;

// 修改 onMounted（约第 374 行）：
onMounted(async () => {
  document.addEventListener('click', closeDropdownListener);
  
  await dbService.ready;
  isDbReady.value = true;
  
  if (gridRef.value) initSortable();
});

// onBeforeUnmount 中删除相关行：
onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdownListener);
  // if (dbCheckTimer) clearInterval(dbCheckTimer);  <- 删除此行
  if (sortableInstance) sortableInstance.destroy();
});
```

同时删除 `Compare.vue` 顶部的 `dbCheckTimer` 变量声明（约第 201 行）。

- [ ] **Step 4：确认构建无报错**

```bash
npm run build
```

预期：无 TypeScript 错误。

- [ ] **Step 5：手动验证**

启动 `npm run tauri dev`，确认 Dashboard 和 Compare 页面仍然正常加载图表，不出现"正在唤醒数据库"状态卡死的情况。

- [ ] **Step 6：提交**

```bash
git add src/core/db/schema.ts src/views/Dashboard.vue src/views/Compare.vue
git commit -m "perf: replace 50ms DB ready polling with Promise-based await"
```

---

### Task 5：为 MatchHistory DDragon 数据添加模块级缓存

**背景：** `MatchHistory.vue` 每次挂载都向 DDragon CDN 发送 4 个 HTTP 请求（版本列表、英雄数据、召唤师技能、天赋），造成切换页面时明显延迟。应在模块顶层缓存这些数据，只在版本号变化时刷新。

**Files:**
- Modify: `src/views/MatchHistory.vue:299-462`

- [ ] **Step 1：在 `<script setup>` 外部声明模块级缓存**

打开 `src/views/MatchHistory.vue`，在 `<script setup lang="ts">` 开始标签**之前**插入模块级缓存变量（这些变量在组件卸载后仍然保留）：

```typescript
// 在 <script setup lang="ts"> 开始之前，文件顶部加入：
// 模块级缓存 — 生命周期与 JS 模块相同，页面内导航不会重置
let _ddragonCache: {
  version: string;
  champions: { id: number; name: string }[];
  spellMap: Record<string, string>;
  perkMap: Record<string, string>;
} | null = null;
```

- [ ] **Step 2：重写 initDDragonData，读取缓存**

在 `<script setup>` 内部，找到 `initDDragonData` 函数（约第 448 行），将其重写为：

```typescript
const initDDragonData = async () => {
  // 若已缓存，直接赋值并返回
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

    // 写入模块缓存
    _ddragonCache = { version, champions, spellMap: spells, perkMap: perks };
  } catch (e) {
    console.error('[Orianna] DDragon 数据加载失败:', e);
  }
};
```

注意：同时将原来的 3 个串行 `fetch` 改成了 `Promise.all` 并发，进一步提速首次加载。

- [ ] **Step 3：确认构建无报错**

```bash
npm run build
```

- [ ] **Step 4：手动验证**

启动 `npm run tauri dev`，在战绩页和其他页面之间多次切换，观察第二次进入战绩页时是否跳过了网络加载，英雄列表是否正确显示。

- [ ] **Step 5：提交**

```bash
git add src/views/MatchHistory.vue
git commit -m "perf: cache DDragon API responses at module level to skip re-fetch on navigation"
```

---

### Task 6：消除好友列表重复排序

**背景：** `user.ts` 的 `fetchFriends` 函数已经将好友列表按在线状态排序后存入 `friendsList`，而 `MainLayout.vue` 的 `filteredAndSortedFriends` computed 在搜索过滤之后又再次排序。重复排序浪费计算资源，且逻辑分散。

**Files:**
- Modify: `src/layout/MainLayout.vue:316-333`

- [ ] **Step 1：移除 filteredAndSortedFriends 中的排序逻辑**

打开 `src/layout/MainLayout.vue`，找到 `filteredAndSortedFriends` computed（约第 316 行），删除排序部分：

```typescript
// 修改前：
const filteredAndSortedFriends = computed(() => {
    let list = userStore.friendsList;

    if (friendSearchQuery.value) {
        const lowerQ = friendSearchQuery.value.toLowerCase();
        list = list.filter(f => 
            f.gameName.toLowerCase().includes(lowerQ) || 
            f.tagLine.toLowerCase().includes(lowerQ)
        );
    }
    
    const weights: Record<string, number> = { chat: 1, dnd: 2, away: 3, offline: 4, mobile: 5 };
    return list.slice().sort((a, b) => {
        const weightA = weights[a.availability || 'offline'] || 6;
        const weightB = weights[b.availability || 'offline'] || 6;
        return weightA - weightB;
    });
});

// 修改后（仅保留过滤逻辑，排序由 store 保证）：
const filteredAndSortedFriends = computed(() => {
    const list = userStore.friendsList;
    if (!friendSearchQuery.value) return list;
    const lowerQ = friendSearchQuery.value.toLowerCase();
    return list.filter(f =>
        f.gameName.toLowerCase().includes(lowerQ) ||
        f.tagLine.toLowerCase().includes(lowerQ)
    );
});
```

- [ ] **Step 2：确认构建无报错**

```bash
npm run build
```

- [ ] **Step 3：手动验证**

启动应用，打开右侧面板，确认好友列表仍然按在线状态正确排序（在线 > 游戏中 > 离开 > 离线），搜索功能正常。

- [ ] **Step 4：提交**

```bash
git add src/layout/MainLayout.vue
git commit -m "perf: remove redundant friend list sort in computed (store already sorts)"
```

---

## 阶段三：体验提升（UI/UX）

---

### Task 7：为战绩卡片展开添加过渡动画

**背景：** `MatchHistory.vue` 中点击战绩卡片展开详情时，内容区域用的是 `v-show` 但没有 `<transition>`，导致内容突然跳出，体验生硬。

**Files:**
- Modify: `src/views/MatchHistory.vue:241-255`
- Modify: `src/style.css`

- [ ] **Step 1：在 style.css 中添加展开动画 CSS**

打开 `src/style.css`，在文件末尾添加：

```css
/* 战绩卡片展开/收起动画 */
.match-expand-enter-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  max-height: 600px;
  overflow: hidden;
}
.match-expand-leave-active {
  transition: max-height 0.2s ease, opacity 0.15s ease;
  overflow: hidden;
}
.match-expand-enter-from,
.match-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
```

- [ ] **Step 2：在 MatchHistory.vue 中用 transition 包裹展开内容**

打开 `src/views/MatchHistory.vue`，找到战绩卡片详情区域（约第 241 行），用 `<transition>` 包裹：

```html
<!-- 修改前（约第 241 行）： -->
<div v-show="expandedIndex === index" class="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-black/20 p-4 backdrop-blur-sm transition-all">
  <!-- ... 内容 ... -->
</div>

<!-- 修改后： -->
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
```

注意：将 `v-show` 改为了 `v-if`，使 `<transition>` 能正确捕获 DOM 插入/移除事件。

- [ ] **Step 3：确认构建无报错**

```bash
npm run build
```

- [ ] **Step 4：手动验证**

启动 `npm run tauri dev`，进入战绩页，点击任意战绩卡片，观察详情区域是否有平滑的展开/收起动画。

- [ ] **Step 5：提交**

```bash
git add src/views/MatchHistory.vue src/style.css
git commit -m "feat: add smooth expand/collapse animation for match history cards"
```

---

### Task 8：为插件图表卡片添加骨架屏加载状态

**背景：** `DynamicPlugin.vue` 加载数据时只显示"融合数据中..."文字，会造成卡片高度跳变。用骨架屏（灰色矩形占位）替代纯文字，体验更流畅。

**Files:**
- Modify: `src/components/ui/DynamicPlugin.vue:25-29`

- [ ] **Step 1：替换加载状态为骨架屏**

打开 `src/components/ui/DynamicPlugin.vue`，找到加载遮罩（约第 25-29 行），替换为骨架屏：

```html
<!-- 修改前： -->
<div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/20 backdrop-blur-sm z-10 rounded-xl transition-all">
  <span class="text-sm font-bold text-emerald-500 animate-pulse">融合数据中...</span>
</div>

<!-- 修改后： -->
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
```

- [ ] **Step 2：确认构建无报错**

```bash
npm run build
```

- [ ] **Step 3：手动验证**

启动 `npm run tauri dev`，刷新 Dashboard 页面，观察图表卡片加载过程中是否显示骨架屏动画，而不是空白或文字提示。

- [ ] **Step 4：提交**

```bash
git add src/components/ui/DynamicPlugin.vue
git commit -m "feat: replace loading text with skeleton screen in plugin chart cards"
```

---

### Task 9：区分插件"无数据"与"加载出错"两种状态

**背景：** `PluginEngine.renderPlugin` 遇到异常时返回 `null`，`DynamicPlugin.vue` 将 `null` 统一显示为"暂无符合条件的数据"，但真实原因可能是插件 JSON 配置错误或数据库查询失败。应区分两种状态，出错时显示有效提示。

**Files:**
- Modify: `src/core/plugins/engine.ts:29-54`
- Modify: `src/components/ui/DynamicPlugin.vue:122-165`

- [ ] **Step 1：修改 PluginEngine，将错误信息传递给调用方**

打开 `src/core/plugins/engine.ts`，修改 `renderPlugin` 的返回类型和错误处理逻辑：

```typescript
// 修改 renderPlugin 返回类型（文件顶部的 import 之后），添加新类型：
// 在 types.ts 的 RenderResult 末尾已有 isEcharts/type/option/data
// 我们在 engine.ts 内部扩展，返回一个 union：
type PluginRenderOutcome =
  | { status: 'ok'; result: RenderResult }
  | { status: 'empty' }
  | { status: 'error'; message: string };

// 修改 renderPlugin 方法签名和 try/catch：
public static async renderPlugin(
    plugin: PluginConfig,
    players: PlayerContext[],
    globalFilters?: GlobalFilters
): Promise<PluginRenderOutcome> {
    if (!dbService.isReady || !players || players.length === 0) {
        return { status: 'empty' };
    }

    if (!gameDataService.isReady) {
        await gameDataService.init();
    }

    try {
        const datasets = [];
        for (const player of players) {
            const { sql, params } = this.compileSql(plugin.dataQuery, [player.puuid], globalFilters);
            const rows = await dbService.instance.select<any[]>(sql, params);
            datasets.push({ player, rows });
        }

        const hasData = datasets.some(ds => ds.rows.length > 0);
        if (!hasData) return { status: 'empty' };

        const result = this.buildVisualization(plugin.visualization, datasets, plugin.dataQuery, players);
        return { status: 'ok', result };

    } catch (error: any) {
        console.error(`[Orianna Engine] 解析插件 ${plugin.manifest.id} 失败:`, error);
        return { status: 'error', message: error?.message || '未知错误' };
    }
}
```

同时在 `engine.ts` 文件顶部导出 `PluginRenderOutcome` 类型，供 `DynamicPlugin.vue` 使用：

```typescript
export type PluginRenderOutcome =
  | { status: 'ok'; result: RenderResult }
  | { status: 'empty' }
  | { status: 'error'; message: string };
```

- [ ] **Step 2：更新 DynamicPlugin.vue 消费新的返回类型**

打开 `src/components/ui/DynamicPlugin.vue`，更新 `script setup` 部分：

```typescript
import { PluginEngine, type PluginRenderOutcome } from '../../core/plugins/engine';
import type { PluginConfig, PlayerContext, GlobalFilters, RenderResult } from '../../core/plugins/types';
import BaseChart from './BaseChart.vue';

// 替换原有的 renderResult ref：
const renderResult = ref<RenderResult | null>(null);
const loadError = ref<string | null>(null);
const isLoading = ref(false);

const loadData = async () => {
    if (!props.players || props.players.length === 0) return;
    isLoading.value = true;
    loadError.value = null;
    renderResult.value = null;

    const outcome: PluginRenderOutcome = await PluginEngine.renderPlugin(
        props.config, props.players, props.globalFilters
    );

    if (outcome.status === 'ok') {
        renderResult.value = outcome.result;
    } else if (outcome.status === 'error') {
        loadError.value = outcome.message;
    }
    // status === 'empty' 时 renderResult 保持 null，显示空状态

    isLoading.value = false;
};
```

- [ ] **Step 3：更新 DynamicPlugin.vue template，添加错误状态显示**

在 template 的最底部，找到空状态显示行（约第 117 行），将其扩展：

```html
<!-- 修改前（约第 115-117 行）： -->
<div v-else class="absolute inset-0 flex items-center justify-center text-sm text-slate-400">暂无符合条件的数据</div>

<!-- 修改后（两个分支，区分空数据和错误）： -->
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
```

- [ ] **Step 4：确认构建无报错**

```bash
npm run build
```

预期：TypeScript 类型检查通过，无错误。

- [ ] **Step 5：手动验证**

启动 `npm run tauri dev`，前往插件编辑器，创建一个包含错误字段名（如 metric field 写成不存在的字段）的插件配置并保存，在 Dashboard 页面观察对应卡片是否显示红色错误状态，而不是"暂无符合条件的数据"。

- [ ] **Step 6：提交**

```bash
git add src/core/plugins/engine.ts src/components/ui/DynamicPlugin.vue
git commit -m "feat: distinguish empty-data vs error state in plugin chart cards"
```

---

### Task 10：从顶部 Header 移除危险的"清空数据"按钮

**背景：** `MainLayout.vue` 顶部导航栏放置了一个"清空数据"按钮（两次点击即可永久删除所有战绩），属于破坏性操作放在高频触发区域。设置页已有更完善的带说明文字的清空流程，顶部按钮应移除以降低误操作风险。

**Files:**
- Modify: `src/layout/MainLayout.vue:64-76, 283-286, 354-363`

- [ ] **Step 1：从 template 中移除清空数据按钮**

打开 `src/layout/MainLayout.vue`，找到 header 中的"清空数据"按钮（约第 64-76 行），删除整个 button 元素：

```html
<!-- 删除以下整块代码（约第 64-76 行）： -->
<button 
  @click="handleClearDatabase"
  :disabled="userStore.isSyncing"
  class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
  :class="[isConfirmingClear ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400']"
>
  <AlertCircle v-if="isConfirmingClear" class="w-4 h-4 animate-pulse" />
  <Trash2 v-else class="w-4 h-4" />
  <span>{{ isConfirmingClear ? '确定清空?' : '清空数据' }}</span>
</button>
```

- [ ] **Step 2：从 script 中移除相关变量和函数**

在 `script setup` 中，删除以下内容：

```typescript
// 删除（约第 283-286 行）：
const isConfirmingClear = ref(false);
let clearTimer: any = null;

// 删除（约第 354-363 行）：
const handleClearDatabase = async () => {
  if (!isConfirmingClear.value) {
    isConfirmingClear.value = true;
    clearTimer = setTimeout(() => { isConfirmingClear.value = false; }, 3000);
    return;
  }
  if (clearTimer) clearTimeout(clearTimer);
  isConfirmingClear.value = false;
  await userStore.clearDatabase();
};
```

- [ ] **Step 3：从 imports 中移除不再使用的图标**

检查 `lucide-vue-next` 的 import 行（约第 263 行），移除 `Trash2` 和 `AlertCircle`（如果仅在被删除的按钮中使用）：

```typescript
// 修改前：
import { 
  LayoutDashboard, ScrollText, GitCompare, Blocks, Settings, 
  RefreshCw, UserX, Trash2, AlertCircle, Users, Swords, UserPlus, UserMinus, 
  Eye, X, Search, Sun, Moon 
} from 'lucide-vue-next';

// 修改后（移除 Trash2 和 AlertCircle）：
import { 
  LayoutDashboard, ScrollText, GitCompare, Blocks, Settings, 
  RefreshCw, UserX, Users, Swords, UserPlus, UserMinus, 
  Eye, X, Search, Sun, Moon 
} from 'lucide-vue-next';
```

- [ ] **Step 4：确认构建无报错**

```bash
npm run build
```

预期：无 TypeScript 未使用变量警告，无报错。

- [ ] **Step 5：手动验证**

启动 `npm run tauri dev`，确认顶部 header 中"清空数据"按钮已消失，设置页的清空功能仍然正常。

- [ ] **Step 6：提交**

```bash
git add src/layout/MainLayout.vue
git commit -m "ux: remove dangerous clear-database button from header — use settings page instead"
```

---

## 验收标准

完成所有 Task 后，执行以下全量验证：

```bash
# 1. TypeScript 类型检查
npm run build

# 2. Rust 编译检查
cd src-tauri && cargo check && cd ..
```

手动验证清单：
- [ ] Dashboard 页面图表正常加载，骨架屏动画正确显示
- [ ] Compare 页面多人同步速度明显提升
- [ ] 战绩页切换多次后不重新请求 DDragon 网络接口
- [ ] 战绩卡片展开有平滑动画
- [ ] 插件配置错误时显示红色错误提示
- [ ] 顶部 Header 无"清空数据"按钮，Settings 页清空功能正常
- [ ] 好友列表按在线状态正确排序，搜索功能正常
