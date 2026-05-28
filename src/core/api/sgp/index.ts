// src/core/api/sgp/index.ts
import { invoke } from '@tauri-apps/api/core';

import {
    SgpGameDetailsLol,
    SgpGameSummaryLol,
    SgpMatchHistoryLol,
    SgpRankedStats,
    SpectatorData
} from './types';

export interface SgpServersConfig {
    version: number;
    lastUpdate: number;
    servers: {
        [region: string]: {
            matchHistory: string | null;
            common: string | null;
        };
    };
    serverNames: {
        [locale: string]: {
            [server: string]: string;
        };
    };
    tencentServerMatchHistoryInteroperability: string[];
    tencentServerSpectatorInteroperability: string[];
    tencentServerSummonerInteroperability: string[];
}

export class LeagueSgpApi {
    static USER_AGENT = 'LeagueOfLegendsClient/14.13.596.7996 (rcp-be-lol-match-history)';

    private _sgpServerConfig: SgpServersConfig = {
        version: 0, lastUpdate: 0, servers: {}, serverNames: {},
        tencentServerMatchHistoryInteroperability: [], tencentServerSpectatorInteroperability: [], tencentServerSummonerInteroperability: []
    };

    private _entitlementToken: string | null = null;
    private _leagueSessionToken: string | null = null;
    private _localSgpServerId: string | null = null;

    constructor() { }

    setSgpServerConfig(config: SgpServersConfig) { this._sgpServerConfig = config; }
    setLocalSgpServerId(id: string | null) { this._localSgpServerId = id; }

    // [修复 TS6133]：增加一个公开获取大区ID的方法，消除“已声明但从未读取”的编译警告
    getLocalSgpServerId() { return this._localSgpServerId; }

    hasEntitlementsToken() { return this._entitlementToken !== null; }
    hasLeagueSessionToken() { return this._leagueSessionToken !== null; }
    setEntitlementsToken(token: string | null) { this._entitlementToken = token; }
    setLeagueSessionToken(token: string | null) { this._leagueSessionToken = token; }

    private _resolveRouting(targetSgpServerId: string, type: 'common' | 'matchHistory') {
        const routeServerId = targetSgpServerId.toUpperCase();

        const sgpServer = this._sgpServerConfig.servers[routeServerId];
        if (!sgpServer) {
            throw new Error(`Unknown SGP Server ID: ${routeServerId}`);
        }

        const url = sgpServer[type];
        if (!url) {
            throw new Error(`SGP Server ${routeServerId} does not support ${type}`);
        }

        return {
            routeUrl: url,
            targetSubId: this._getSubId(routeServerId)
        };
    }

    private _getSubId(sgpServerId: string) {
        if (sgpServerId.startsWith('TENCENT')) {
            const [_, rsoPlatformId] = sgpServerId.split('_');
            return rsoPlatformId.toLowerCase();
        }
        return sgpServerId.toLowerCase();
    }

    private async _request<T>(
        method: string, baseURL: string, endpoint: string, token: string,
        options?: { params?: Record<string, any>, body?: any }, retries = 3
    ): Promise<{ data: T }> {
        const url = new URL(baseURL + endpoint);

        if (options?.params) {
            Object.keys(options.params).forEach(key => {
                if (options.params![key] !== undefined) url.searchParams.append(key, String(options.params![key]));
            });
        }

        for (let i = 0; i < retries; i++) {
            try {
                console.debug(`[Orianna Debug] [SGP Internal Route] ${method} ${url.toString()}`);

                const headers: Record<string, string> = {
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': LeagueSgpApi.USER_AGENT,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                };

                const fetchOptions = {
                    method, url: url.toString(), headers,
                    body: options?.body ? JSON.stringify(options.body) : null
                };

                const responseStr: string = await invoke('proxy_request', fetchOptions);

                let data: any;
                try { data = JSON.parse(responseStr); } catch { data = responseStr; }

                if (data && data.status && (data.status.status_code === 403 || data.status.status_code === 401 || data.status.status_code === 400)) {
                    throw new Error(`HTTP 状态异常 ${data.status.status_code}: ${JSON.stringify(data)}`);
                }

                return { data };
            } catch (error: any) {
                console.warn(`[Orianna Debug] [SGP Internal] 路由失败，准备重试 (尝试 ${i + 1}/${retries}):`, error.message || error);
                if (i === retries - 1) throw error;
                await new Promise(res => setTimeout(res, 1000));
            }
        }
        throw new Error("Unreachable");
    }

    async getMatchHistory(targetSgpServerId: string, playerPuuid: string, start: number, count: number, tag?: string) {
        if (!this._entitlementToken) throw new Error('jwt token is not set');
        const { routeUrl } = this._resolveRouting(targetSgpServerId, 'matchHistory');
        return this._request<SgpMatchHistoryLol>('GET', routeUrl, `/match-history-query/v1/products/lol/player/${playerPuuid}/SUMMARY`, this._entitlementToken, { params: { startIndex: start, count, tag } });
    }

    getGameSummary(targetSgpServerId: string, gameId: number) {
        if (!this._entitlementToken) throw new Error('jwt token is not set');
        const { routeUrl, targetSubId } = this._resolveRouting(targetSgpServerId, 'matchHistory');
        return this._request<SgpGameSummaryLol>('GET', routeUrl, `/match-history-query/v1/products/lol/${targetSubId.toUpperCase()}_${gameId}/SUMMARY`, this._entitlementToken);
    }

    getGameDetails(targetSgpServerId: string, gameId: number) {
        if (!this._entitlementToken) throw new Error('jwt token is not set');
        const { routeUrl, targetSubId } = this._resolveRouting(targetSgpServerId, 'matchHistory');
        return this._request<SgpGameDetailsLol>('GET', routeUrl, `/match-history-query/v1/products/lol/${targetSubId.toUpperCase()}_${gameId}/DETAILS`, this._entitlementToken);
    }

    getRankedStats(targetSgpServerId: string, puuid: string) {
        if (!this._leagueSessionToken) throw new Error('jwt token is not set');
        const { routeUrl } = this._resolveRouting(targetSgpServerId, 'common');
        return this._request<SgpRankedStats>('GET', routeUrl, `/leagues-ledge/v2/rankedStats/puuid/${puuid}`, this._leagueSessionToken);
    }

    getSummonerByPuuid(targetSgpServerId: string, puuid: string) {
        if (!this._leagueSessionToken) throw new Error('jwt token is not set');
        const { routeUrl, targetSubId } = this._resolveRouting(targetSgpServerId, 'common');
        return this._request<any[]>('POST', routeUrl, `/summoner-ledge/v1/regions/${targetSubId}/summoners/puuids`, this._leagueSessionToken, { body: [puuid] });
    }

    getSpectatorGameflowByPuuid(targetSgpServerId: string, puuid: string) {
        if (!this._leagueSessionToken) throw new Error('jwt token is not set');
        const { routeUrl, targetSubId } = this._resolveRouting(targetSgpServerId, 'common');
        return this._request<SpectatorData>('GET', routeUrl, `/gsm/v1/ledge/spectator/region/${targetSubId}/puuid/${puuid}`, this._leagueSessionToken);
    }

    getEndOfGameStats(targetSgpServerId: string, gameId: number, puuid: string) {
        if (!this._leagueSessionToken) throw new Error('jwt token is not set');
        const { routeUrl, targetSubId } = this._resolveRouting(targetSgpServerId, 'common');
        return this._request<any>('GET', routeUrl, `/stats/endOfGame/region/${targetSubId}/gameId/${gameId}/puuid/${puuid}`, this._leagueSessionToken);
    }
}

export const sgpApi = new LeagueSgpApi();