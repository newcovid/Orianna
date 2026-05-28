// src/core/api/lcu/index.ts
import { invoke } from '@tauri-apps/api/core';

export interface LcuAuth {
    port: number;
    token: string;
    pid: number;
    region: string;
    rso_platform_id: string;
    rc_port: number;     // [新增] 
    rc_token: string;    // [新增]
}

export class LeagueLcuApi {
    private auth: LcuAuth | null = null;

    async connect(): Promise<LcuAuth> {
        try {
            console.debug('[Orianna LCU] 正在呼叫 Rust 后端扫描游戏进程...');
            this.auth = await invoke<LcuAuth>('get_lcu_auth');
            console.debug(`[Orianna LCU] 成功捕获进程! LCU端口: ${this.auth.port}, RC端口: ${this.auth.rc_port}`);
            return this.auth;
        } catch (error) {
            console.error('[Orianna LCU] 捕获进程失败:', error);
            throw new Error(`无法连接到客户端进程: ${error}`);
        }
    }

    get isConnected(): boolean {
        return this.auth !== null;
    }

    // 暴露给外部（特别是 RC Api），以获取共享凭证
    getAuthInfo(): LcuAuth | null {
        return this.auth;
    }

    public async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
        if (!this.auth) throw new Error('LCU 未连接');

        const requestBodyStr = body ? JSON.stringify(body) : null;

        console.log(`%c[LCU 出站请求] ${method} ${endpoint}`, 'color: #3b82f6; font-weight: bold;');

        try {
            const responseStr: string = await invoke('lcu_request', {
                port: this.auth.port,
                token: this.auth.token,
                method: method,
                endpoint: endpoint,
                body: requestBodyStr
            });

            if (!responseStr || responseStr.trim() === '') return null as any;

            let parsed;
            try {
                parsed = JSON.parse(responseStr);
            } catch (jsonErr) {
                throw new Error(`LCU 返回了非 JSON 格式的数据`);
            }

            if (parsed && typeof parsed === 'object' && parsed.errorCode && parsed.message) {
                console.error(`%c[LCU 业务异常] ${parsed.errorCode}: ${parsed.message}`, 'color: #ef4444;');
            }

            return parsed;
        } catch (err: any) {
            console.error(`%c[LCU 请求崩溃] ${endpoint} -> ${err.message || err}`, 'color: #ef4444; font-weight: bold;');
            throw err;
        }
    }

    async getCurrentSummoner() {
        return this.request<any>('GET', '/lol-summoner/v1/current-summoner');
    }

    async getSummonerByPuuid(puuid: string) {
        return this.request<any>('GET', `/lol-summoner/v2/summoners/puuid/${puuid}`);
    }

    async getFriends() {
        return this.request<any[]>('GET', '/lol-chat/v1/friends');
    }

    async getEntitlementsToken() {
        const data = await this.request<any>('GET', '/entitlements/v1/token');
        return data.accessToken;
    }

    async getLeagueSessionToken() {
        const data = await this.request<any>('GET', '/lol-league-session/v1/league-session-token');
        return typeof data === 'string' ? data : data.token || data;
    }
}

export const lcuApi = new LeagueLcuApi();