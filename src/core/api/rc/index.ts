// src/core/api/rc/index.ts
import { invoke } from '@tauri-apps/api/core';
import { lcuApi } from '../lcu/index';

export class LeagueRcApi {

    public async request<T>(method: string, endpoint: string, body?: any, params?: Record<string, string>): Promise<T> {
        const auth = lcuApi.getAuthInfo();
        if (!auth || !auth.rc_port || !auth.rc_token) {
            throw new Error('Riot Client 未连接或端口未获取到');
        }

        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        const requestBodyStr = body ? JSON.stringify(body) : null;
        console.log(`%c[RC 出站请求] ${method} ${url}`, 'color: #f59e0b; font-weight: bold;');

        try {
            const responseStr: string = await invoke('rc_request', {
                port: auth.rc_port,
                token: auth.rc_token,
                method: method,
                endpoint: url,
                body: requestBodyStr
            });

            if (!responseStr || responseStr.trim() === '') return null as any;

            let parsed;
            try {
                parsed = JSON.parse(responseStr);
            } catch (jsonErr) {
                throw new Error(`RC 返回了非 JSON 格式的数据`);
            }

            if (parsed && typeof parsed === 'object' && parsed.errorCode && parsed.message) {
                console.error(`%c[RC 业务异常] ${parsed.errorCode}: ${parsed.message}`, 'color: #ef4444;');
            }

            return parsed;
        } catch (err: any) {
            console.error(`%c[RC 请求崩溃] ${url} -> ${err.message || err}`, 'color: #ef4444; font-weight: bold;');
            throw err;
        }
    }

    // [核心] 全局名称模糊/精确查询。返回包含 alias, puuid 的数组
    async getPlayerAccountAlias(gameName: string, tagLine?: string) {
        const params: Record<string, string> = { gameName };
        if (tagLine) {
            params.tagLine = tagLine;
        }
        return this.request<any[]>('GET', '/player-account/aliases/v1/lookup', null, params);
    }

    // [核心] 根据 PUUID 反查全网对应的 Name 和 Tag
    async getPlayerAccountNameset(puuids: string[]) {
        return this.request<any>('POST', '/player-account/lookup/v1/namesets-for-puuids', { puuids });
    }
}

export const rcApi = new LeagueRcApi();