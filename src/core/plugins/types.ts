// src/core/plugins/types.ts

export interface PluginManifest {
    id: string;
    name: string;
    description?: string;
    version: string;
    author?: string;
    tags?: string[];
}

export interface PluginLayout {
    grid: string;
    mount: ('dashboard' | 'compare')[];
}

export interface PluginDataQuery {
    entity?: 'match_games' | 'match_items' | 'match_augments';
    filters?: {
        limit?: number;
        matchResult?: 'win' | 'loss' | 'all';
        queueId?: number | number[];
        championId?: number | number[];
        position?: string | string[];
        augmentId?: number | number[]; // 新增：支持直接指定强化符文ID过滤
        itemId?: number | number[];    // 新增：支持直接指定独立装备ID过滤
    };
    groupBy?: string[];
    metrics: {
        field?: string;         // 基础映射单字段
        expression?: string;    // 【终极方案】自定义计算公式 (二选一)
        aggregate?: 'avg' | 'sum' | 'max' | 'min' | 'count';
        alias?: string;         // 公式计算必须配有别名
    }[];
    sortBy?: {
        field: string;
        direction: 'ASC' | 'DESC';
    };
    outputLimit?: number;
}

export interface PluginVisualization {
    type: 'line' | 'bar' | 'radar' | 'scatter' | 'pie' | 'stat-card' | 'list';
    compareMode?: 'overlay' | 'aggregate';
    categoryField?: string;
    xAxis?: {
        field: string;
        format?: 'index' | 'time' | 'value';
    };
    yAxis?: {
        field: string;
    };
    series: {
        field: string;
        name: string;
        color?: string;
        max?: number;
    }[];
}

export interface PluginConfig {
    manifest: PluginManifest;
    layout: PluginLayout;
    dataQuery: PluginDataQuery;
    visualization: PluginVisualization;
}

export interface GlobalFilters {
    queueId?: number[];
    position?: string[];
    championId?: number[];
}

export interface PlayerContext {
    puuid: string;
    gameName: string;
}

export interface StatItemData {
    label: string;
    value: number | string;
    color?: string;
}

export interface ListItemData {
    name: string;
    value: number | string;
    icon?: string;
    tier?: number;
}

export interface RenderData {
    player: PlayerContext | null;
    stats?: StatItemData[];
    items?: ListItemData[];
}

export interface RenderResult {
    isEcharts: boolean;
    type: string;
    option?: any;
    data?: RenderData[];
}