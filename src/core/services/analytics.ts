// src/core/services/analytics.ts
import { dbService } from '../db/schema';

export interface QueryFilter {
    queueId?: number;
    championId?: number;
    position?: string;
    limit?: number;
}

export class AnalyticsEngine {
    /**
     * 获取玩家近期对局的综合表现（雷达图数据）
     */
    static async getPlayerRadarStats(puuid: string, filters: QueryFilter = { limit: 20 }) {
        let query = `
            SELECT 
                AVG(kill_participation_rate) as kp,
                AVG(damage_gold_efficiency) as dge,
                AVG(vision_score_per_minute) as vspm,
                AVG(gold_per_minute) as gpm,
                AVG(damage_per_minute) as dpm,
                AVG(kda) as kda
            FROM match_games 
            WHERE puuid = $1
        `;
        const params: any[] = [puuid];
        let paramIndex = 2;

        if (filters.queueId) { query += ` AND queue_id = $${paramIndex++}`; params.push(filters.queueId); }
        if (filters.position) { query += ` AND position = $${paramIndex++}`; params.push(filters.position); }

        query += ` ORDER BY game_creation DESC LIMIT $${paramIndex}`;
        params.push(filters.limit || 20);

        const res = await dbService.instance.select<any[]>(query, params);
        if (!res || res.length === 0) return null;

        const data = res[0];

        // 归一化处理 (将各项指标映射到 0-100 用于雷达图展示)
        // 这里的基准值是预设的优质表现标杆，后续可通过大数据动态调整
        const normalize = (val: number, max: number) => Math.min(100, Math.max(0, (val / max) * 100));

        return {
            kp: normalize(data.kp, 0.7),          // 70% 参团率满分
            dge: normalize(data.dge, 1.5),        // 1.5 伤转满分
            vspm: normalize(data.vspm, 1.5),      // 每分钟 1.5 视野满分
            gpm: normalize(data.gpm, 500),        // 每分钟 500 块满分
            dpm: normalize(data.dpm, 800),        // 每分钟 800 伤害满分
            kda: normalize(data.kda, 5.0),        // 5.0 KDA 满分
            raw: data // 保留原始数据用于 Tooltip 展示
        };
    }

    /**
     * 获取玩家近期胜率趋势
     */
    static async getWinRateTrend(puuid: string, limit: number = 20) {
        const query = `
            SELECT win, game_creation 
            FROM match_games 
            WHERE puuid = $1 
            ORDER BY game_creation DESC 
            LIMIT $2
        `;
        const res = await dbService.instance.select<any[]>(query, [puuid, limit]);
        // 逆序，使时间线从左到右
        return res.reverse();
    }

    /**
     * 获取常用英雄数据
     */
    static async getTopChampions(puuid: string, limit: number = 5) {
        const query = `
            SELECT 
                champion_id, 
                COUNT(*) as play_count, 
                AVG(CASE WHEN win THEN 1 ELSE 0 END) as win_rate,
                AVG(kda) as avg_kda
            FROM match_games 
            WHERE puuid = $1 
            GROUP BY champion_id 
            ORDER BY play_count DESC 
            LIMIT $2
        `;
        return await dbService.instance.select<any[]>(query, [puuid, limit]);
    }
}