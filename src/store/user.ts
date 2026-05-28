// src/store/user.ts
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { lcuApi } from '../core/api/lcu';
import { rcApi } from '../core/api/rc';
import { sgpApi } from '../core/api/sgp/index';
import { syncService } from '../core/services/sync';
import { dbService } from '../core/db/schema';

export interface AppPlayer {
    puuid: string;
    gameName: string;
    tagLine: string;
    profileIconId: number;
    summonerLevel?: number;
    isLocal: boolean;
    availability?: string;
    sgpServerId?: string;
}

const VIEW_PLAYER_STORAGE_KEY = 'orianna_current_view_player';
const COMPARE_POOL_STORAGE_KEY = 'orianna_compare_pool';

export const useUserStore = defineStore('user', () => {
    const isLcuConnected = ref(false);

    // 【架构升级】：通过引用计数方式维护 UI 展示用的 isSyncing 状态
    const activeTasks = ref(0);
    const isSyncing = ref(false);
    const syncingPlayers = new Set<string>(); // 避免同玩家触发多个同步请求的独立锁

    const incrementTask = () => {
        activeTasks.value++;
        isSyncing.value = true;
    };

    const decrementTask = () => {
        activeTasks.value--;
        if (activeTasks.value <= 0) {
            activeTasks.value = 0;
            isSyncing.value = false;
        }
    };

    const dataVersion = ref(0);

    const localPlayer = ref<AppPlayer | null>(null);
    const currentViewPlayer = ref<AppPlayer | null>(null);
    const comparePool = ref<AppPlayer[]>([]);
    const friendsList = ref<AppPlayer[]>([]);
    const catchupCooldowns = ref<Record<string, number>>({});

    const cachedPlayer = localStorage.getItem(VIEW_PLAYER_STORAGE_KEY);
    if (cachedPlayer) {
        try {
            currentViewPlayer.value = JSON.parse(cachedPlayer);
        } catch (e) {
            console.warn('[Orianna] 读取本地缓存玩家失败', e);
        }
    }

    const cachedComparePool = localStorage.getItem(COMPARE_POOL_STORAGE_KEY);
    if (cachedComparePool) {
        try {
            comparePool.value = JSON.parse(cachedComparePool);
        } catch (e) {
            console.warn('[Orianna] 读取本地对比池失败', e);
        }
    }

    watch(currentViewPlayer, (newVal) => {
        if (newVal) {
            localStorage.setItem(VIEW_PLAYER_STORAGE_KEY, JSON.stringify(newVal));
        } else {
            localStorage.removeItem(VIEW_PLAYER_STORAGE_KEY);
        }
    }, { deep: true });

    watch(comparePool, (newVal) => {
        localStorage.setItem(COMPARE_POOL_STORAGE_KEY, JSON.stringify(newVal));
    }, { deep: true });

    const initConnection = async () => {
        try {
            const authInfo = await lcuApi.connect();
            isLcuConnected.value = true;

            let localSgpId = authInfo.region;
            if (localSgpId === 'TENCENT' && authInfo.rso_platform_id) {
                localSgpId = `TENCENT_${authInfo.rso_platform_id.toUpperCase()}`;
            }
            sgpApi.setLocalSgpServerId(localSgpId);

            const rawSummoner = await lcuApi.getCurrentSummoner();
            const me: AppPlayer = {
                puuid: rawSummoner.puuid,
                gameName: rawSummoner.gameName || rawSummoner.displayName,
                tagLine: rawSummoner.tagLine,
                profileIconId: rawSummoner.profileIconId,
                summonerLevel: rawSummoner.summonerLevel,
                isLocal: true,
                availability: 'chat',
                sgpServerId: localSgpId
            };

            localPlayer.value = me;

            if (!currentViewPlayer.value) {
                currentViewPlayer.value = me;
            } else if (currentViewPlayer.value.puuid === me.puuid) {
                currentViewPlayer.value = me;
            }

            fetchFriends();
            smartSync(false, currentViewPlayer.value.puuid);
        } catch (error) {
            console.error('LCU 连接失败，请确保英雄联盟客户端已启动', error);
            isLcuConnected.value = false;
            localPlayer.value = null;
        }
    };

    const fetchFriends = async () => {
        if (!isLcuConnected.value) return;
        try {
            const rawFriends = await lcuApi.getFriends();
            friendsList.value = rawFriends.map((f: any) => ({
                puuid: f.puuid,
                gameName: f.gameName || f.name,
                tagLine: f.gameTag || '',
                profileIconId: f.icon,
                isLocal: false,
                availability: f.availability
            })).sort((a, b) => {
                const weights: Record<string, number> = { chat: 1, dnd: 2, away: 3, offline: 4, mobile: 5 };
                const weightA = weights[a.availability || 'offline'] || 6;
                const weightB = weights[b.availability || 'offline'] || 6;
                return weightA - weightB;
            });
        } catch (err) {
            console.error('[Orianna LCU] 获取好友列表失败:', err);
        }
    };

    const searchAndAddManualPlayer = async (server: string, rawGameName: string, rawTagLine: string) => {
        incrementTask();

        try {
            if (!isLcuConnected.value) throw new Error('客户端未连接。');

            const cleanGameName = rawGameName.trim();
            const cleanTagLine = rawTagLine.trim().replace(/^#/, '');

            if (!sgpApi.hasLeagueSessionToken()) await syncService.initializeEnvironment();

            const aliases = await rcApi.getPlayerAccountAlias(cleanGameName, cleanTagLine);
            if (!aliases || aliases.length === 0) throw new Error('全服名称解析库中未找到该玩家。');

            const alias = aliases[0];
            let resolvedPuuid = alias.puuid;
            let finalGameName = alias.alias?.game_name || cleanGameName;
            let finalTagLine = alias.alias?.tag_line || cleanTagLine;
            let profileIconId = 1;
            let summonerLevel = 1;

            if (server === localPlayer.value?.sgpServerId) {
                const lcuRes = await lcuApi.getSummonerByPuuid(resolvedPuuid);
                if (!lcuRes || !lcuRes.puuid) throw new Error('同区数据获取失败');
                profileIconId = lcuRes.profileIconId || 1;
                summonerLevel = lcuRes.summonerLevel || 1;
                finalGameName = lcuRes.gameName || finalGameName;
            } else {
                const sgpRes = await sgpApi.getSummonerByPuuid(server, resolvedPuuid);
                if (!sgpRes.data || sgpRes.data.length === 0) throw new Error('未能在目标大区找到该玩家的建号记录');
                const info = sgpRes.data[0];
                profileIconId = info.profileIconId || info.iconId || 1;
                summonerLevel = info.summonerLevel || info.level || 1;
                finalGameName = info.gameName || info.name || finalGameName;
            }

            const newPlayer: AppPlayer = {
                puuid: resolvedPuuid,
                gameName: finalGameName,
                tagLine: finalTagLine,
                profileIconId: profileIconId,
                summonerLevel: summonerLevel,
                isLocal: false,
                availability: 'offline',
                sgpServerId: server
            };

            if (!comparePool.value.some(p => p.puuid === newPlayer.puuid)) {
                comparePool.value.push(newPlayer);
                smartSync(false, newPlayer.puuid);
            }
        } catch (err: any) {
            console.error('[Orianna] 手动添加玩家失败:', err);
            throw new Error(err.message || '未知的网络/解析错误');
        } finally {
            decrementTask();
        }
    };

    const setViewPlayer = async (player: AppPlayer) => {
        currentViewPlayer.value = player;
        smartSync(false, player.puuid);

        if (!player.isLocal) {
            try {
                const detail = await lcuApi.getSummonerByPuuid(player.puuid);
                if (detail && detail.summonerLevel) {
                    currentViewPlayer.value = {
                        ...currentViewPlayer.value!,
                        summonerLevel: detail.summonerLevel,
                        profileIconId: detail.profileIconId || player.profileIconId
                    };
                }
            } catch (e) {
                if (player.sgpServerId) {
                    try {
                        const sgpRes = await sgpApi.getSummonerByPuuid(player.sgpServerId, player.puuid);
                        if (sgpRes.data && sgpRes.data.length > 0) {
                            currentViewPlayer.value = {
                                ...currentViewPlayer.value!,
                                summonerLevel: sgpRes.data[0].summonerLevel || sgpRes.data[0].level || player.summonerLevel,
                                profileIconId: sgpRes.data[0].profileIconId || sgpRes.data[0].iconId || player.profileIconId
                            };
                        }
                    } catch (sgpErr) { }
                }
            }
        }
    };

    const toggleComparePlayer = (player: AppPlayer) => {
        const idx = comparePool.value.findIndex(p => p.puuid === player.puuid);
        if (idx > -1) {
            comparePool.value.splice(idx, 1);
        } else {
            comparePool.value.push(player);
            smartSync(false, player.puuid);
        }
    };

    const isInComparePool = computed(() => (puuid: string) => {
        return comparePool.value.some(p => p.puuid === puuid);
    });

    const checkAllPluginsSatisfied = async (puuid: string, plugins: any[]) => {
        for (const p of plugins) {
            const limit = p.dataQuery?.filters?.limit;
            if (!limit) continue;

            let whereClause = `WHERE puuid = $1`;
            let params: any[] = [puuid];
            let paramIdx = 2;
            const f = p.dataQuery.filters || {};

            if (f.matchResult === 'win') whereClause += ` AND win = 1`;
            if (f.matchResult === 'loss') whereClause += ` AND win = 0`;

            const applyInFilter = (field: string, val: any) => {
                if (val === undefined || val === null || val === 0 || val === '') return;
                if (Array.isArray(val) && val.length > 0) {
                    const placeholders = val.map(() => `$${paramIdx++}`).join(', ');
                    whereClause += ` AND ${field} IN (${placeholders})`;
                    params.push(...val);
                } else if (!Array.isArray(val)) {
                    whereClause += ` AND ${field} = $${paramIdx++}`;
                    params.push(val);
                }
            };

            applyInFilter('queue_id', f.queueId);
            applyInFilter('position', f.position);
            applyInFilter('champion_id', f.championId);

            const res = await dbService.instance.select<any[]>(`SELECT COUNT(*) as cnt FROM match_games ${whereClause}`, params);
            const count = res.length > 0 ? (Number(res[0].cnt) || 0) : 0;

            if (count < limit) return false;
        }
        return true;
    };

    const getTargetSgpServerId = (puuid: string): string | undefined => {
        if (currentViewPlayer.value?.puuid === puuid) return currentViewPlayer.value.sgpServerId;
        const p = comparePool.value.find(p => p.puuid === puuid);
        if (p) return p.sgpServerId;
        const f = friendsList.value.find(f => f.puuid === puuid);
        if (f) return f.sgpServerId;
        return undefined;
    };

    const smartSync = async (force: boolean = false, targetPuuid?: string) => {
        const puuidToSync = targetPuuid || currentViewPlayer.value?.puuid;
        if (!puuidToSync || !dbService.isReady) return;

        if (syncingPlayers.has(puuidToSync)) return;

        syncingPlayers.add(puuidToSync);
        incrementTask();

        const targetSgpServerId = getTargetSgpServerId(puuidToSync);

        try {
            const lastSync = catchupCooldowns.value[puuidToSync] || 0;

            if (force || Date.now() - lastSync > 15000) {
                let offset = 0;
                let keepFetching = true;
                let attempts = 0;
                while (keepFetching && attempts < 10) {
                    attempts++;
                    const result = await syncService.syncPlayerGames(puuidToSync, targetSgpServerId, offset, 20);

                    if (result.inserted > 0) dataVersion.value++;

                    if (result.fetched > 0 && result.inserted === result.fetched) {
                        offset += result.fetched;
                    } else {
                        keepFetching = false;
                    }
                }
                catchupCooldowns.value[puuidToSync] = Date.now();
            }

            const { usePluginStore } = await import('./plugins');
            const pluginStore = usePluginStore();
            const activePlugins = pluginStore.activePlugins;

            const totalRes = await dbService.instance.select<any[]>('SELECT COUNT(*) as cnt FROM match_games WHERE puuid = $1', [puuidToSync]);
            let currentOffset = totalRes.length > 0 ? (Number(totalRes[0].cnt) || 0) : 0;

            let deepAttempts = 0;
            while (deepAttempts < 50) {
                const isSatisfied = await checkAllPluginsSatisfied(puuidToSync, activePlugins);
                if (isSatisfied) {
                    console.debug(`[Orianna SmartSync] 玩家 ${puuidToSync} 的所有图表条件源均已完美满足，停止下潜。`);
                    break;
                }

                deepAttempts++;
                const result = await syncService.syncPlayerGames(puuidToSync, targetSgpServerId, currentOffset, 20);
                if (result.fetched === 0) break;

                currentOffset += result.fetched;
                if (result.inserted > 0) {
                    dataVersion.value++;
                }
            }
        } catch (err) {
            console.error(`[Orianna SmartSync] 同步玩家 ${puuidToSync} 失败:`, err);
        } finally {
            syncingPlayers.delete(puuidToSync);
            decrementTask();
        }
    };

    const fetchDeepGames = async (requiredTotal: number, targetPuuid?: string): Promise<boolean> => {
        const puuidToSync = targetPuuid || currentViewPlayer.value?.puuid;
        if (!puuidToSync || !dbService.isReady) return false;

        if (syncingPlayers.has(puuidToSync)) return false;
        syncingPlayers.add(puuidToSync);
        incrementTask();

        const targetSgpServerId = getTargetSgpServerId(puuidToSync);
        let isExhausted = false;

        try {
            const res = await dbService.instance.select<any[]>('SELECT COUNT(*) as cnt FROM match_games WHERE puuid = $1', [puuidToSync]);
            let localCount = res.length > 0 ? (Number(res[0].cnt) || 0) : 0;
            let currentOffset = localCount;

            let deepAttempts = 0;
            while (localCount < requiredTotal && deepAttempts < 20) {
                deepAttempts++;
                const result = await syncService.syncPlayerGames(puuidToSync, targetSgpServerId, currentOffset, 20);
                if (result.fetched === 0) {
                    isExhausted = true;
                    break;
                }
                localCount += result.inserted;
                currentOffset += result.fetched;
            }
        } catch (err) {
            console.error('[Orianna Sync] 分页深度同步失败', err);
        } finally {
            syncingPlayers.delete(puuidToSync);
            decrementTask();
        }

        return isExhausted;
    };

    const clearDatabase = async () => {
        if (!dbService.isReady || isSyncing.value) return;
        incrementTask();
        try {
            await dbService.clearGamesData();
            catchupCooldowns.value = {};
            dataVersion.value++;
        } catch (err) {
            console.error('[Orianna] 清空数据库发生错误', err);
        } finally {
            decrementTask();
        }
    };

    // ==========================================
    // 新增：底层数据库维护与迁移核心逻辑
    // ==========================================

    const getDatabaseSize = async (): Promise<number> => {
        if (!dbService.isReady) return 0;
        try {
            // 利用 SQLite 内部 PRAGMA 页面计算总体积，避免操作系统权限阻拦
            const res = await dbService.instance.select<any[]>('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();');
            return res[0]?.size || 0;
        } catch (e) {
            console.error('[Orianna DB] 获取体积失败:', e);
            return 0;
        }
    };

    const compressDatabase = async () => {
        if (!dbService.isReady || isSyncing.value) return;
        incrementTask();
        try {
            await dbService.instance.execute('VACUUM');
        } catch (e) {
            console.error('[Orianna DB] 压缩与碎片整理失败:', e);
        } finally {
            decrementTask();
        }
    };

    const exportDatabase = async (): Promise<string> => {
        if (!dbService.isReady) return '[]';
        incrementTask();
        try {
            const data = await dbService.instance.select<any[]>('SELECT * FROM match_games');
            return JSON.stringify(data);
        } catch (err) {
            console.error('[Orianna DB] 导出失败:', err);
            return '[]';
        } finally {
            decrementTask();
        }
    };

    const importDatabase = async (parsedData: any[]): Promise<number> => {
        if (!dbService.isReady || parsedData.length === 0) return 0;
        incrementTask();
        try {
            // 剔除可能造成冲突的自增主键，允许引擎自然增长对接
            const columns = Object.keys(parsedData[0]).filter(k => k !== 'id');
            let importedCount = 0;

            // 为了严防 SQLite 对变量绑定数量的限制（通常为 999），采取极小切片的安全插入模式
            const batchSize = 4;
            for (let i = 0; i < parsedData.length; i += batchSize) {
                const batch = parsedData.slice(i, i + batchSize);

                for (const row of batch) {
                    const params = columns.map(col => row[col]);
                    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
                    const sql = `INSERT OR IGNORE INTO match_games (${columns.join(', ')}) VALUES (${placeholders})`;
                    const res = await dbService.instance.execute(sql, params);
                    if (res.rowsAffected > 0) importedCount++;
                }
            }
            dataVersion.value++;
            return importedCount;
        } catch (err) {
            console.error('[Orianna DB] 导入装载失败:', err);
            throw err;
        } finally {
            decrementTask();
        }
    };

    return {
        isLcuConnected,
        isSyncing,
        dataVersion,
        localPlayer,
        currentViewPlayer,
        comparePool,
        friendsList,
        isInComparePool,
        initConnection,
        fetchFriends,
        setViewPlayer,
        toggleComparePlayer,
        smartSync,
        fetchDeepGames,
        clearDatabase,
        searchAndAddManualPlayer,
        getDatabaseSize,
        compressDatabase,
        exportDatabase,
        importDatabase
    };
});