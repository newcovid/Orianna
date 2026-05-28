// src/constants/game-dict.ts

export const QUEUE_TYPES: Record<number, string> = {
    420: '单双排位',
    430: '匹配模式',
    440: '灵活排位',
    450: '极地大乱斗',
    480: '快速模式',
    490: '快速匹配',
    900: '无限乱斗',
    1700: '斗魂竞技场',
    1900: '无限火力',
    2300: '神木之门',
    2400: '海克斯大乱斗'
};

export const GAME_MODES: Record<string, string> = {
    CLASSIC: '经典',
    ARAM: '极地大乱斗',
    URF: '无限火力',
    TFT: '云顶之弈',
    CHERRY: '斗魂竞技场',
    KIWI: '海克斯大乱斗'
};

// 【新增】分路字典
export const POSITION_TYPES: Record<string, string> = {
    TOP: '上单',
    JUNGLE: '打野',
    MIDDLE: '中单',
    BOTTOM: '下路',
    UTILITY: '辅助',
    APEX: '其他',
    NONE: '未知分路',
    INVALID: '未知'
};

export function getQueueName(queueId: number, gameMode?: string): string {
    if (QUEUE_TYPES[queueId]) return QUEUE_TYPES[queueId];
    if (gameMode && GAME_MODES[gameMode]) return GAME_MODES[gameMode];
    return `未知模式(${queueId})`;
}

// 【新增】分路解析方法
export function getPositionName(position: string): string {
    if (!position) return '未知';
    const upper = position.toUpperCase();
    return POSITION_TYPES[upper] || position;
}