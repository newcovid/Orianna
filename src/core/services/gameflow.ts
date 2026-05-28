// src/core/services/gameflow.ts
import { lcuApi } from '../api/lcu';
import { syncService } from './sync';
import { useUserStore } from '../../store/user';

export class GameflowService {
    private isRunning = false;
    private currentPhase: string = 'None';

    startListening() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.pollGameflow();
    }

    stopListening() {
        this.isRunning = false;
    }

    private async pollGameflow() {
        while (this.isRunning) {
            try {
                if (lcuApi.isConnected) {
                    const phase = await lcuApi.request<string>('GET', '/lol-gameflow/v1/gameflow-phase');

                    // 当状态从 游戏中(InProgress) 切换为 结算等待/结束/无(None) 时，说明打完了一把
                    if (this.currentPhase === 'InProgress' && ['WaitingForStats', 'EndOfGame', 'None'].includes(phase)) {
                        console.log('[Orianna] 检测到游戏结束，开始自动拉取最新战绩...');
                        const userStore = useUserStore();

                        // [修复 TS2339] 替换废弃的 summonerInfo，使用 localPlayer
                        if (userStore.localPlayer?.puuid) {
                            userStore.isSyncing = true;
                            // 给服务器10秒缓冲时间生成对局数据
                            setTimeout(async () => {
                                try {
                                    // [修复 TS2345] 补齐 syncPlayerGames 所需的全部参数签名：puuid, targetSgpServerId, offset, count
                                    await syncService.syncPlayerGames(
                                        userStore.localPlayer!.puuid,
                                        userStore.localPlayer!.sgpServerId,
                                        0,
                                        10
                                    );
                                    // 触发一个全局事件通知图表刷新
                                    window.dispatchEvent(new CustomEvent('orianna-sync-completed'));
                                } finally {
                                    userStore.isSyncing = false;
                                }
                            }, 10000);
                        }
                    }
                    this.currentPhase = phase;
                }
            } catch (error) {
                // 静默失败，可能是客户端短暂离线
            }
            // 每 5 秒轮询一次，性能损耗极低
            await new Promise(res => setTimeout(res, 5000));
        }
    }
}

export const gameflowService = new GameflowService();