// src/core/plugins/engine.ts
import { dbService } from '../db/schema';
import { METRICS_MAP } from '../../constants/metrics';
import { getQueueName, getPositionName } from '../../constants/game-dict';
import { gameDataService } from '../services/game-data';
import type { PluginConfig, PlayerContext, GlobalFilters, PluginDataQuery, PluginVisualization, RenderResult } from './types';

export type PluginRenderOutcome =
  | { status: 'ok'; result: RenderResult }
  | { status: 'empty' }
  | { status: 'error'; message: string };

const round2 = (val: any) => typeof val === 'number' ? Number(val.toFixed(2)) : val;

function formatCategoryValue(field: string, value: any): string {
    if (value === null || value === undefined) return '未知';
    const strVal = String(value);

    if (field === 'position') return getPositionName(strVal);
    if (field === 'queue_id') return getQueueName(Number(value));

    if (field === 'item_id') return gameDataService.getItemName(strVal);
    if (field === 'champion_id') return gameDataService.getChampionName(strVal);
    if (field === 'spell1_id' || field === 'spell2_id') return gameDataService.getSpellName(strVal);
    if (field === 'augment_id') return gameDataService.getAugmentName(strVal);

    return strVal;
}

const SAFE_SQL_FUNCTIONS = new Set(['MAX', 'MIN', 'ABS', 'ROUND', 'IFNULL', 'CAST', 'AS', 'REAL', 'INTEGER', 'AND', 'OR']);

export class PluginEngine {

    public static async renderPlugin(plugin: PluginConfig, players: PlayerContext[], globalFilters?: GlobalFilters): Promise<PluginRenderOutcome> {
        if (!dbService.isReady || !players || players.length === 0) return { status: 'empty' };

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

    private static compileSql(query: PluginDataQuery, targetPuuids: string[], globalFilters?: GlobalFilters): { sql: string, params: any[] } {
        let params: any[] = [];
        let paramIdx = 1;

        const filters = query.filters || {};
        const isItemsEntity = query.entity === 'match_items';
        const isAugmentsEntity = query.entity === 'match_augments';

        const puuidPlaceholders = targetPuuids.map(() => `$${paramIdx++}`).join(', ');
        let innerWhere = `WHERE puuid IN (${puuidPlaceholders})`;
        params.push(...targetPuuids);

        const applyInFilter = (field: string, val: any) => {
            if (val === undefined || val === null || val === 0 || val === '') return;
            if (Array.isArray(val) && val.length > 0) {
                const placeholders = val.map(() => `$${paramIdx++}`).join(', ');
                innerWhere += ` AND ${field} IN (${placeholders})`;
                params.push(...val);
            } else if (!Array.isArray(val)) {
                innerWhere += ` AND ${field} = $${paramIdx++}`;
                params.push(val);
            }
        };

        if (filters.matchResult === 'win') innerWhere += ` AND win = 1`;
        if (filters.matchResult === 'loss') innerWhere += ` AND win = 0`;

        const isGlobalActive = globalFilters && Object.keys(globalFilters).length > 0;

        if (isGlobalActive) {
            applyInFilter('queue_id', globalFilters.queueId);
            applyInFilter('position', globalFilters.position);
            applyInFilter('champion_id', globalFilters.championId);
        } else {
            applyInFilter('queue_id', filters.queueId);
            applyInFilter('position', filters.position);
            applyInFilter('champion_id', filters.championId);
        }

        let limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';
        const baseTableQuery = `SELECT * FROM match_games ${innerWhere} ORDER BY game_creation DESC ${limitClause}`;

        let cteDefinition = '';
        let targetTable = 'BaseGames';

        if (isItemsEntity) {
            cteDefinition = `
                WITH BaseGames AS (${baseTableQuery}),
                UnpivotedItems AS (
                    SELECT puuid, item0 AS item_id, win FROM BaseGames WHERE item0 > 0
                    UNION ALL SELECT puuid, item1 AS item_id, win FROM BaseGames WHERE item1 > 0
                    UNION ALL SELECT puuid, item2 AS item_id, win FROM BaseGames WHERE item2 > 0
                    UNION ALL SELECT puuid, item3 AS item_id, win FROM BaseGames WHERE item3 > 0
                    UNION ALL SELECT puuid, item4 AS item_id, win FROM BaseGames WHERE item4 > 0
                    UNION ALL SELECT puuid, item5 AS item_id, win FROM BaseGames WHERE item5 > 0
                    UNION ALL SELECT puuid, item6 AS item_id, win FROM BaseGames WHERE item6 > 0
                )
            `;
            targetTable = 'UnpivotedItems';
        } else if (isAugmentsEntity) {
            cteDefinition = `
                WITH BaseGames AS (${baseTableQuery}),
                UnpivotedAugments AS (
                    SELECT puuid, player_augment_1 AS augment_id, win FROM BaseGames WHERE player_augment_1 > 0
                    UNION ALL SELECT puuid, player_augment_2 AS augment_id, win FROM BaseGames WHERE player_augment_2 > 0
                    UNION ALL SELECT puuid, player_augment_3 AS augment_id, win FROM BaseGames WHERE player_augment_3 > 0
                    UNION ALL SELECT puuid, player_augment_4 AS augment_id, win FROM BaseGames WHERE player_augment_4 > 0
                    UNION ALL SELECT puuid, player_augment_5 AS augment_id, win FROM BaseGames WHERE player_augment_5 > 0
                    UNION ALL SELECT puuid, player_augment_6 AS augment_id, win FROM BaseGames WHERE player_augment_6 > 0
                )
            `;
            targetTable = 'UnpivotedAugments';
        } else {
            cteDefinition = `WITH BaseGames AS (${baseTableQuery})`;
        }

        const selectedAliasesOrFields = new Set<string>();

        const selectFields = query.metrics.map(m => {
            const finalAlias = m.alias || m.field || '';
            const aliasPart = finalAlias ? ` AS ${finalAlias}` : '';
            selectedAliasesOrFields.add(finalAlias);

            let sqlTarget = '';

            if (m.expression) {
                if (!/^[a-zA-Z0-9_ \+\-\*\/\(\)\.\,]+$/.test(m.expression)) {
                    throw new Error(`[安全拦截] 公式包含非法字符集: ${m.expression}`);
                }
                const words = m.expression.match(/[a-zA-Z_]+/g) || [];
                for (const word of words) {
                    const upper = word.toUpperCase();
                    if (!METRICS_MAP[word] && !SAFE_SQL_FUNCTIONS.has(upper) && word !== 'game_creation' && word !== 'puuid') {
                        throw new Error(`[安全拦截] 公式调用了未授权的变量或函数: '${word}'`);
                    }
                }
                sqlTarget = m.expression;
            } else {
                sqlTarget = m.field || '';
            }

            if (m.aggregate) {
                return `${m.aggregate.toUpperCase()}(${sqlTarget})${aliasPart}`;
            } else {
                return `(${sqlTarget})${aliasPart}`;
            }
        });

        if (query.groupBy) {
            query.groupBy.forEach(dim => {
                if (!selectedAliasesOrFields.has(dim)) {
                    selectFields.push(dim);
                    selectedAliasesOrFields.add(dim);
                }
            });
        }

        let finalSql = `${cteDefinition} SELECT ${selectFields.join(', ')} FROM ${targetTable}`;

        // === 【核心修复】为虚拟出的长表数据提供二次专属约束 ===
        const outerWhere: string[] = [];
        if (isAugmentsEntity && filters.augmentId) {
            const arr = Array.isArray(filters.augmentId) ? filters.augmentId : [filters.augmentId];
            if (arr.length > 0) {
                const placeholders = arr.map(() => `$${paramIdx++}`).join(', ');
                outerWhere.push(`augment_id IN (${placeholders})`);
                params.push(...arr);
            }
        }
        if (isItemsEntity && filters.itemId) {
            const arr = Array.isArray(filters.itemId) ? filters.itemId : [filters.itemId];
            if (arr.length > 0) {
                const placeholders = arr.map(() => `$${paramIdx++}`).join(', ');
                outerWhere.push(`item_id IN (${placeholders})`);
                params.push(...arr);
            }
        }

        // 挂载外层约束
        if (outerWhere.length > 0) {
            finalSql += ` WHERE ${outerWhere.join(' AND ')}`;
        }

        if (query.groupBy && query.groupBy.length > 0) {
            finalSql += ` GROUP BY ${query.groupBy.join(', ')}`;
        }

        if (query.sortBy) {
            finalSql += ` ORDER BY ${query.sortBy.field} ${query.sortBy.direction}`;
        }

        if (query.outputLimit) {
            finalSql += ` LIMIT ${query.outputLimit}`;
        }

        return { sql: finalSql, params };
    }

    private static getFieldLabel(aliasOrField: string, query: PluginDataQuery): string {
        const metric = query.metrics.find(m => m.alias === aliasOrField || m.field === aliasOrField);
        if (metric && metric.expression) return METRICS_MAP[aliasOrField] || aliasOrField;
        const realField = metric ? metric.field : aliasOrField;
        return METRICS_MAP[realField || ''] || realField || '';
    }

    private static buildVisualization(viz: PluginVisualization, datasets: any[], query: PluginDataQuery, allPlayers: PlayerContext[]): RenderResult {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#9ca3af' : '#6b7280';
        const splitLineColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        const isAggregateMode = viz.compareMode === 'aggregate' && allPlayers.length > 1;

        if (viz.type === 'stat-card') {
            return {
                isEcharts: false,
                type: 'stat-card',
                data: datasets.map(ds => ({
                    player: ds.player,
                    stats: viz.series.map(s => {
                        const row = ds.rows[0] || {};
                        return { label: s.name, value: round2(row[s.field]), color: s.color };
                    })
                }))
            };
        }

        if (viz.type === 'list') {
            if (isAggregateMode) {
                return {
                    isEcharts: false,
                    type: 'list',
                    data: [{
                        player: null,
                        items: datasets.map(ds => ({
                            name: ds.player?.gameName || '未知玩家',
                            value: ds.rows[0] ? round2(ds.rows[0][viz.series[0].field]) : 0
                        })).sort((a, b) => Number(b.value) - Number(a.value))
                    }]
                };
            }

            return {
                isEcharts: false,
                type: 'list',
                data: datasets.map(ds => ({
                    player: ds.player,
                    items: ds.rows.map((r: any) => {
                        const catField = viz.categoryField || (query.groupBy && query.groupBy.length > 0 ? query.groupBy[0] : '');
                        const rawVal = r[catField];

                        let iconUrl = undefined;
                        let tierLevel = 0;

                        if (catField === 'item_id' && rawVal) {
                            iconUrl = `https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/items/${rawVal}.png`;
                        } else if (catField === 'champion_id' && rawVal) {
                            iconUrl = `https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/champions/${rawVal}.png`;
                        } else if (catField === 'augment_id' && rawVal) {
                            iconUrl = gameDataService.getAugmentIcon(rawVal);
                            tierLevel = gameDataService.getAugmentTier(rawVal);
                        }

                        return {
                            name: formatCategoryValue(catField, rawVal),
                            value: round2(r[viz.series[0].field]),
                            icon: iconUrl,
                            tier: tierLevel
                        };
                    })
                }))
            };
        }

        let option: any = {
            tooltip: {
                trigger: ['radar', 'pie', 'scatter'].includes(viz.type) ? 'item' : 'axis',
                appendToBody: true,
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                textStyle: { color: isDark ? '#f3f4f6' : '#111827' },
                backdropFilter: 'blur(4px)'
            },
            legend: {
                bottom: 0,
                textStyle: { color: textColor },
                icon: 'circle',
                type: 'scroll'
            },
            color: viz.series.map(s => s.color).filter(Boolean).length > 0
                ? viz.series.map(s => s.color)
                : ['#10b981', '#38bdf8', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']
        };

        if (['line', 'bar', 'scatter'].includes(viz.type)) {
            option.grid = {
                top: 35,
                right: 30,
                bottom: viz.type === 'scatter' ? 45 : 40,
                left: 15,
                containLabel: true
            };

            option.xAxis = { type: 'category', axisLabel: { color: textColor }, axisTick: { show: false }, axisLine: { lineStyle: { color: splitLineColor } } };
            option.yAxis = { type: 'value', splitLine: { lineStyle: { color: splitLineColor } }, axisLabel: { color: textColor } };

            if (viz.type !== 'scatter') {
                option.tooltip.axisPointer = { type: 'cross', label: { backgroundColor: '#6b7280' } };
            }

            const isChronological = viz.xAxis?.format === 'index' || viz.xAxis?.format === 'time';
            if (isChronological && !isAggregateMode) {
                datasets.forEach(ds => { ds.rows = [...ds.rows].reverse(); });
            }

            if (viz.type === 'scatter' && viz.yAxis) {
                const xField = viz.xAxis?.field || '';
                const yField = viz.yAxis?.field || '';
                const xLabel = this.getFieldLabel(xField, query);
                const yLabel = this.getFieldLabel(yField, query);

                option.legend.show = false;

                option.xAxis = {
                    ...option.xAxis, type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 25,
                    nameTextStyle: { color: textColor, fontWeight: 'bold' },
                    scale: true, splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
                };
                option.yAxis = {
                    ...option.yAxis, type: 'value', name: yLabel, nameLocation: 'end', nameGap: 15,
                    nameTextStyle: { color: textColor, fontWeight: 'bold', width: 85, overflow: 'break', align: 'left', padding: [0, 0, 0, -25] },
                    scale: true, splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
                };

                option.series = datasets.map(ds => ({
                    name: ds.player?.gameName || 'Scatter',
                    type: 'scatter',
                    symbolSize: 12,
                    itemStyle: {
                        borderColor: isDark ? '#111111' : '#ffffff',
                        borderWidth: 1.5,
                        opacity: 0.85,
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.1)',
                        shadowOffsetY: 4
                    },
                    data: ds.rows.map((r: any) => [round2(r[xField]), round2(r[yField])])
                }));

                option.tooltip.formatter = function (params: any) {
                    return `<div style="font-weight:bold;margin-bottom:4px">${params.seriesName}</div>
                            <div>${xLabel}: <span style="font-weight:bold;color:${params.color}">${params.value[0]}</span></div>
                            <div>${yLabel}: <span style="font-weight:bold;color:${params.color}">${params.value[1]}</span></div>`;
                };
            } else {
                if (isAggregateMode) {
                    option.xAxis.data = datasets.map(ds => ds.player?.gameName || '未知');
                    option.series = viz.series.map(s => ({
                        name: s.name,
                        type: viz.type,
                        barMaxWidth: 24,
                        barGap: '20%',
                        itemStyle: viz.type === 'bar' ? { borderRadius: [4, 4, 0, 0], color: s.color } : undefined,
                        data: datasets.map(ds => ds.rows[0] ? round2(ds.rows[0][s.field]) : 0)
                    }));
                } else {
                    const baseRows = datasets[0]?.rows || [];
                    if (viz.xAxis?.format === 'index') {
                        option.xAxis.data = Array.from({ length: baseRows.length }, (_, i) => `第${i + 1}场`);
                    } else if (viz.xAxis?.format === 'time') {
                        option.xAxis.data = baseRows.map((r: any) => {
                            const date = new Date(r[viz.xAxis!.field]);
                            return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                        });
                    } else if (viz.categoryField) {
                        option.xAxis.data = baseRows.map((r: any) => formatCategoryValue(viz.categoryField || '', r[viz.categoryField || '']));
                    }

                    option.series = [];
                    datasets.forEach(ds => {
                        viz.series.forEach(s => {
                            const isLine = viz.type === 'line';
                            const isBar = viz.type === 'bar';

                            option.series.push({
                                name: datasets.length > 1 ? `${ds.player.gameName} - ${s.name}` : s.name,
                                type: viz.type,
                                smooth: isLine,
                                symbol: isLine ? 'circle' : undefined,
                                symbolSize: isLine ? 6 : undefined,
                                showSymbol: false,
                                barMaxWidth: 24,
                                barGap: '20%',
                                itemStyle: isBar ? { borderRadius: [4, 4, 0, 0] } : undefined,
                                areaStyle: isLine ? { opacity: 0.15 } : undefined,
                                data: ds.rows.map((r: any) => round2(r[s.field]))
                            });
                        });
                    });
                }
            }
        }

        if (viz.type === 'radar') {
            option.radar = {
                indicator: viz.series.map(s => {
                    const ind: any = { name: s.name };
                    if (s.max) {
                        let actualMax = 0;
                        datasets.forEach(ds => {
                            const val = ds.rows[0] ? Number(ds.rows[0][s.field]) : 0;
                            if (val > actualMax) actualMax = val;
                        });
                        ind.max = actualMax > s.max ? Math.ceil(actualMax * 1.1) : s.max;
                    }
                    return ind;
                }),
                shape: 'polygon',
                radius: '55%',
                center: ['50%', '48%'],
                splitNumber: 4,
                axisName: { color: isDark ? '#e5e7eb' : '#4b5563', fontSize: 11, fontWeight: 'bold' },
                splitLine: { lineStyle: { color: splitLineColor } },
                axisLine: { lineStyle: { color: splitLineColor } },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: isDark ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']
                    }
                }
            };

            option.series = [{
                type: 'radar',
                symbol: 'circle',
                symbolSize: 6,
                itemStyle: { borderWidth: 2 },
                lineStyle: { width: 2 },
                areaStyle: { opacity: 0.15 },
                data: datasets.map(ds => ({
                    name: ds.player?.gameName || 'Radar',
                    value: viz.series.map(s => ds.rows[0] ? round2(ds.rows[0][s.field]) : 0)
                }))
            }];
        }

        if (viz.type === 'pie') {
            const commonPieSeries = {
                type: 'pie',
                radius: ['28%', '45%'],
                center: ['50%', '45%'],
                itemStyle: { borderRadius: 8, borderColor: isDark ? '#111111' : '#ffffff', borderWidth: 2.5, shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.1)' },
                label: { color: textColor, width: 70, overflow: 'break' },
                labelLine: { length: 10, length2: 12 }
            };

            if (isAggregateMode) {
                option.series = [{
                    ...commonPieSeries,
                    name: viz.series[0].name,
                    data: datasets.map(ds => ({
                        name: ds.player?.gameName || '未知玩家',
                        value: ds.rows[0] ? round2(ds.rows[0][viz.series[0].field]) : 0
                    }))
                }];
            } else {
                const ds = datasets[0];
                if (ds) {
                    option.series = [{
                        ...commonPieSeries,
                        name: viz.series[0].name,
                        data: ds.rows.map((r: any) => {
                            const catField = viz.categoryField || (query.groupBy && query.groupBy.length > 0 ? query.groupBy[0] : '');
                            return {
                                name: formatCategoryValue(catField, r[catField]),
                                value: round2(Number(r[viz.series[0].field]))
                            };
                        })
                    }];
                }
            }
        }

        return { isEcharts: true, type: viz.type, option };
    }
}