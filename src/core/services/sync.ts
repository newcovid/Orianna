// src/core/services/sync.ts
import { lcuApi } from '../api/lcu';
import { sgpApi } from '../api/sgp/index';
import { SgpGameSummaryLol } from '../api/sgp/types';
import { dbService } from '../db/schema';
import leagueServersConfig from '../../assets/league-servers.json';

export class SyncService {
    public syncingPlayers = new Set<string>();
    public isInitialized: boolean = false;

    constructor() {
        sgpApi.setSgpServerConfig(leagueServersConfig);
    }

    async initializeEnvironment() {
        const lcuAuth = await lcuApi.connect();

        if (lcuAuth && lcuAuth.rso_platform_id) {
            sgpApi.setLocalSgpServerId(`TENCENT_${lcuAuth.rso_platform_id.toUpperCase()}`);
            console.debug(`[Orianna Sync] SGP 内部跨区网关已锚定至本地: TENCENT_${lcuAuth.rso_platform_id.toUpperCase()}`);
        }

        const entitlementsToken = await lcuApi.getEntitlementsToken();
        if (!entitlementsToken) throw new Error("获取 Entitlements Token 失败");
        sgpApi.setEntitlementsToken(entitlementsToken);

        const sessionToken = await lcuApi.getLeagueSessionToken();
        if (!sessionToken) throw new Error("获取 League Session Token 失败");
        sgpApi.setLeagueSessionToken(sessionToken);

        this.isInitialized = true;
        return lcuAuth;
    }

    async syncPlayerGames(puuid: string, targetSgpServerId?: string, start: number = 0, count: number = 20): Promise<{ fetched: number, inserted: number }> {
        if (this.syncingPlayers.has(puuid)) return { fetched: 0, inserted: 0 };
        this.syncingPlayers.add(puuid);

        try {
            return await this._doSync(puuid, targetSgpServerId, start, count, false);
        } finally {
            this.syncingPlayers.delete(puuid);
        }
    }

    private async _doSync(puuid: string, targetSgpServerId: string | undefined, start: number, count: number, isRetry: boolean): Promise<{ fetched: number, inserted: number }> {
        if (!dbService.isReady) throw new Error("数据库尚未初始化完成，无法同步");
        if (!lcuApi.isConnected || !this.isInitialized) {
            await this.initializeEnvironment();
        }

        const lcuAuth = await lcuApi.connect();
        const sgpServerId = targetSgpServerId || `TENCENT_${lcuAuth.rso_platform_id.toUpperCase()}`;

        try {
            console.debug(`[Orianna Sync] 请求 SGP API: 目标=${sgpServerId}, puuid=${puuid}, startIndex=${start}, count=${count}`);
            const response = await sgpApi.getMatchHistory(sgpServerId, puuid, start, count);
            const games = response.data?.games || (response as any).games;

            if (!games || games.length === 0) return { fetched: 0, inserted: 0 };

            const insertedCount = await this.saveGamesToDatabase(puuid, games);
            console.debug(`[Orianna Sync] 抓取: ${games.length}场，真实新增入库: ${insertedCount}场`);

            return { fetched: games.length, inserted: insertedCount };

        } catch (error: any) {
            const errStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
            const isUnauthorized =
                error?.status?.status_code === 401 ||
                error?.response?.status === 401 ||
                error?.response?.data?.status?.status_code === 401 ||
                errStr.includes('401') ||
                errStr.includes('Unauthorized');

            if (!isRetry && isUnauthorized) {
                console.warn('[Orianna Sync] SGP Token 鉴权失效 (401)，正在重新链接 LCU 获取新凭证并重试...');
                await this.initializeEnvironment();
                return await this._doSync(puuid, targetSgpServerId, start, count, true);
            }

            console.error('[Orianna Sync Error] 战绩同步失败:', error);
            throw error;
        }
    }

    private async saveGamesToDatabase(puuid: string, games: SgpGameSummaryLol[]): Promise<number> {
        const db = dbService.instance;
        let processedCount = 0;

        for (const game of games) {
            if (!game.json) continue;

            try {
                const existing = await db.select<any[]>('SELECT id FROM match_games WHERE game_id = $1 AND puuid = $2', [game.json.gameId, puuid]);
                if (existing && existing.length > 0) continue;
            } catch (e) {
                console.error(`[Orianna Debug] 查重失败: `, e);
            }

            const participant = game.json.participants.find(p => p.puuid === puuid);
            if (!participant) continue;

            const c: any = participant.challenges || {};
            const m: any = participant.missions || {};

            const safeNum = (val: any) => typeof val === 'number' ? val : 0;
            const safeBool = (val: any) => Boolean(val) ? 1 : 0;

            const durationSec = safeNum(game.json.gameDuration);
            const durationMin = durationSec > 0 ? (durationSec / 60) : 1;

            const calcEfficiency = safeNum(participant.totalDamageDealtToChampions) / (safeNum(participant.goldEarned) || 1);

            const perks = participant.perks?.styles || [];
            const primaryStyle = perks.find(s => s.description === 'primaryStyle');
            const subStyle = perks.find(s => s.description === 'subStyle');
            const pSelections = primaryStyle?.selections || [];
            const sSelections = subStyle?.selections || [];

            const dataRow: Record<string, any> = {
                game_id: game.json.gameId, puuid: puuid, champion_id: participant.championId,
                game_mode: game.json.gameMode, queue_id: game.json.queueId, game_creation: game.json.gameCreation,
                game_duration: game.json.gameDuration, win: safeBool(participant.win), position: participant.teamPosition,

                item0: safeNum(participant.item0), item1: safeNum(participant.item1), item2: safeNum(participant.item2),
                item3: safeNum(participant.item3), item4: safeNum(participant.item4), item5: safeNum(participant.item5), item6: safeNum(participant.item6),
                spell1_id: safeNum(participant.spell1Id), spell2_id: safeNum(participant.spell2Id),
                perk_primary_style: safeNum(primaryStyle?.style), perk_sub_style: safeNum(subStyle?.style),
                perk0: safeNum(pSelections[0]?.perk), perk1: safeNum(pSelections[1]?.perk),
                perk2: safeNum(pSelections[2]?.perk), perk3: safeNum(pSelections[3]?.perk),
                perk4: safeNum(sSelections[0]?.perk), perk5: safeNum(sSelections[1]?.perk),

                // === 强化符文数据入库 (兼容竞技场/大乱斗) ===
                // 如果 SGP API 没有对应字段或者为 0，safeNum 会自动补 0
                player_augment_1: safeNum((participant as any).playerAugment1),
                player_augment_2: safeNum((participant as any).playerAugment2),
                player_augment_3: safeNum((participant as any).playerAugment3),
                player_augment_4: safeNum((participant as any).playerAugment4),
                player_augment_5: safeNum((participant as any).playerAugment5),
                player_augment_6: safeNum((participant as any).playerAugment6),

                kills: safeNum(participant.kills), deaths: safeNum(participant.deaths), assists: safeNum(participant.assists), double_kills: safeNum(participant.doubleKills), triple_kills: safeNum(participant.tripleKills), quadra_kills: safeNum(participant.quadraKills), penta_kills: safeNum(participant.pentaKills), unreal_kills: safeNum(participant.unrealKills), killing_sprees: safeNum(participant.killingSprees), largest_killing_spree: safeNum(participant.largestKillingSpree), largest_multi_kill: safeNum(participant.largestMultiKill), longest_time_spent_living: safeNum(participant.longestTimeSpentLiving), largest_critical_strike: safeNum(participant.largestCriticalStrike),
                damage_gold_efficiency: calcEfficiency, total_damage_dealt_to_champions: safeNum(participant.totalDamageDealtToChampions), physical_damage_dealt_to_champions: safeNum(participant.physicalDamageDealtToChampions), magic_damage_dealt_to_champions: safeNum(participant.magicDamageDealtToChampions), true_damage_dealt_to_champions: safeNum(participant.trueDamageDealtToChampions), total_damage_dealt: safeNum(participant.totalDamageDealt), physical_damage_dealt: safeNum(participant.physicalDamageDealt), magic_damage_dealt: safeNum(participant.magicDamageDealt), true_damage_dealt: safeNum(participant.trueDamageDealt), damage_dealt_to_objectives: safeNum(participant.damageDealtToObjectives), damage_dealt_to_turrets: safeNum(participant.damageDealtToTurrets), damage_dealt_to_buildings: safeNum(participant.damageDealtToBuildings), damage_dealt_to_epic_monsters: 0,
                total_damage_taken: safeNum(participant.totalDamageTaken), physical_damage_taken: safeNum(participant.physicalDamageTaken), magic_damage_taken: safeNum(participant.magicDamageTaken), true_damage_taken: safeNum(participant.trueDamageTaken), damage_self_mitigated: safeNum(participant.damageSelfMitigated), total_damage_shielded_on_teammates: safeNum(participant.totalDamageShieldedOnTeammates), time_ccing_others: safeNum(participant.timeCCingOthers), total_time_cc_dealt: safeNum(participant.totalTimeCCDealt), enemy_champion_immobilizations: safeNum(c.enemyChampionImmobilizations), immobilize_and_kill_with_ally: safeNum(c.immobilizeAndKillWithAlly), knock_enemy_into_team_and_kill: safeNum(c.knockEnemyIntoTeamAndKill), survived_three_immobilizes_in_fight: safeNum(c.survivedThreeImmobilizesInFight),
                vision_score: safeNum(participant.visionScore), wards_placed: safeNum(participant.wardsPlaced), wards_killed: safeNum(participant.wardsKilled), sight_wards_bought_in_game: safeNum(participant.sightWardsBoughtInGame), vision_wards_bought_in_game: safeNum(participant.visionWardsBoughtInGame), detector_wards_placed: safeNum(participant.detectorWardsPlaced), vision_score_per_minute: safeNum(c.visionScorePerMinute), ward_takedowns: safeNum(participant.wardsKilled), ward_takedowns_before_20m: safeNum(c.wardTakedownsBefore20M), wards_guarded: safeNum(c.wardsGuarded), two_wards_one_sweeper_count: safeNum(c.twoWardsOneSweeperCount), control_wards_placed: safeNum(c.controlWardsPlaced), stealth_wards_placed: safeNum(c.stealthWardsPlaced), vision_score_advantage_lane_opponent: safeNum(c.visionScoreAdvantageLaneOpponent),
                turret_kills: safeNum(participant.turretKills), turret_takedowns: safeNum(participant.turretTakedowns), solo_turrets_lategame: safeNum(c.soloTurretsLategame), turrets_lost: safeNum(participant.turretsLost), first_turret_killed: safeNum(c.firstTurretKilled), first_tower_assist: safeNum(participant.firstTowerAssist), first_tower_kill: safeNum(participant.firstTowerKill), first_turret_killed_time: safeNum(c.firstTurretKilledTime), turret_plates_taken: safeNum(c.turretPlatesTaken), k_turrets_destroyed_before_plates_fall: safeNum(c.kTurretsDestroyedBeforePlatesFall), outer_turret_executes_before_10_minutes: safeNum(c.outerTurretExecutesBefore10Minutes), quick_first_turret: safeNum(c.quickFirstTurret), takedown_on_first_turret: safeNum(c.takedownOnFirstTurret), turrets_taken_with_rift_herald: safeNum(c.turretsTakenWithRiftHerald), multi_turret_rift_herald_count: safeNum(c.multiTurretRiftHeraldCount), inhibitor_kills: safeNum(participant.inhibitorKills), inhibitor_takedowns: safeNum(participant.inhibitorTakedowns), inhibitors_lost: safeNum(participant.inhibitorsLost), lost_an_inhibitor: safeNum(c.lostAnInhibitor), nexus_kills: safeNum(participant.nexusKills), nexus_lost: safeNum(participant.nexusLost), nexus_takedowns: safeNum(participant.nexusTakedowns), had_open_nexus: safeNum(c.hadOpenNexus), outnumbered_nexus_kill: safeNum(c.outnumberedNexusKill), objectives_stolen: safeNum(participant.objectivesStolen), objectives_stolen_assists: safeNum(participant.objectivesStolenAssists),
                gold_earned: safeNum(participant.goldEarned), gold_spent: safeNum(participant.goldSpent), total_minions_killed: safeNum(participant.totalMinionsKilled), neutral_minions_killed: safeNum(participant.neutralMinionsKilled), total_ally_jungle_minions_killed: safeNum(participant.totalAllyJungleMinionsKilled), total_enemy_jungle_minions_killed: safeNum(participant.totalEnemyJungleMinionsKilled), consumables_purchased: safeNum(participant.consumablesPurchased), items_purchased: safeNum(participant.itemsPurchased), early_laning_phase_gold_exp_advantage: safeNum(c.earlyLaningPhaseGoldExpAdvantage), laning_phase_gold_exp_advantage: safeNum(c.laningPhaseGoldExpAdvantage), max_cs_advantage_on_lane_opponent: safeNum(c.maxCsAdvantageOnLaneOpponent), total_heal: safeNum(participant.totalHeal), total_units_healed: safeNum(participant.totalUnitsHealed), total_heals_on_teammates: safeNum(participant.totalHealsOnTeammates),
                all_in_pings: safeNum(participant.allInPings), assist_me_pings: safeNum(participant.assistMePings), basic_pings: safeNum(participant.basicPings), command_pings: safeNum(participant.commandPings), danger_pings: safeNum(participant.dangerPings), enemy_missing_pings: safeNum(participant.enemyMissingPings), enemy_vision_pings: safeNum(participant.enemyVisionPings), get_back_pings: safeNum(participant.getBackPings), hold_pings: safeNum(participant.holdPings), need_vision_pings: safeNum(participant.needVisionPings), on_my_way_pings: safeNum(participant.onMyWayPings), push_pings: safeNum(participant.pushPings), retreat_pings: 0, vision_cleared_pings: safeNum(participant.visionClearedPings),
                solo_kills: safeNum(c.soloKills), quick_solo_kills: safeNum(c.quickSoloKills), kill_participation: safeNum(c.killParticipation), outnumbered_kills: safeNum(c.outnumberedKills), multikills: safeNum(c.multikills), multikills_after_aggressive_flash: safeNum(c.multikillsAfterAggressiveFlash), multi_kill_one_spell: safeNum(c.multiKillOneSpell), kill_after_hidden_with_ally: safeNum(c.killAfterHiddenWithAlly), pick_kill_with_ally: safeNum(c.pickKillWithAlly), kills_with_help_from_epic_monster: safeNum(c.killsWithHelpFromEpicMonster), takedowns_before_jungle_minion_spawn: safeNum(c.takedownsBeforeJungleMinionSpawn), takedowns_first_x_minutes: safeNum(c.takedownsFirstXMinutes), takedowns_after_gaining_level_advantage: safeNum(c.takedownsAfterGainingLevelAdvantage), takedowns_in_alcove: safeNum(c.takedownsInAlcove), takedowns_in_enemy_fountain: safeNum(c.takedownsInEnemyFountain), kills_on_other_lanes_early_jungle_as_laner: safeNum(c.killsOnOtherLanesEarlyJungleAsLaner), get_takedowns_in_all_lanes_early_jungle_as_laner: safeNum(c.getTakedownsInAllLanesEarlyJungleAsLaner), kills_on_recently_healed_by_aram_pack: safeNum(c.killsOnRecentlyHealedByAramPack), team_baron_kills: safeNum(c.teamBaronKills), dragon_takedowns: safeNum(c.dragonTakedowns), rift_herald_takedowns: safeNum(c.riftHeraldTakedowns), baron_takedowns: safeNum(c.baronTakedowns), team_elder_dragon_kills: safeNum(c.teamElderDragonKills), team_rift_herald_kills: safeNum(c.teamRiftHeraldKills), solo_baron_kills: safeNum(c.soloBaronKills), elder_dragon_kills_with_opposing_soul: safeNum(c.elderDragonKillsWithOpposingSoul), elder_dragon_multikills: safeNum(c.elderDragonMultikills), perfect_dragon_souls_taken: safeNum(c.perfectDragonSoulsTaken), epic_monster_steals: safeNum(c.epicMonsterSteals), epic_monster_stolen_without_smite: safeNum(c.epicMonsterStolenWithoutSmite), epic_monster_kills_near_enemy_jungler: safeNum(c.epicMonsterKillsNearEnemyJungler), epic_monster_kills_within_30_seconds_of_spawn: safeNum(c.epicMonsterKillsWithin30SecondsOfSpawn), jungler_takedowns_near_damaged_epic_monster: safeNum(c.junglerTakedownsNearDamagedEpicMonster), void_monster_kill: safeNum(c.voidMonsterKill), allied_jungle_monster_kills: safeNum(c.alliedJungleMonsterKills), enemy_jungle_monster_kills: safeNum(c.enemyJungleMonsterKills), scuttle_crab_kills: safeNum(c.scuttleCrabKills), buffs_stolen: safeNum(c.buffsStolen), jungle_cs_before_10_minutes: safeNum(c.jungleCsBefore10Minutes), initial_buff_count: safeNum(c.initialBuffCount), initial_crab_count: safeNum(c.initialCrabCount), more_enemy_jungle_than_opponent: safeNum(c.moreEnemyJungleThanOpponent),
                kda: safeNum(c.kda), kill_participation_rate: safeNum(c.killParticipation), damage_per_minute: safeNum(c.damagePerMinute), gold_per_minute: safeNum(c.goldPerMinute), damage_taken_on_team_percentage: safeNum(c.damageTakenOnTeamPercentage), team_damage_percentage: safeNum(c.teamDamagePercentage), ability_uses: safeNum(c.abilityUses), spell1_casts: safeNum(participant.spell1Casts), spell2_casts: safeNum(participant.spell2Casts), spell3_casts: safeNum(participant.spell3Casts), spell4_casts: safeNum(participant.spell4Casts), summoner1_casts: safeNum(participant.summoner1Casts), summoner2_casts: safeNum(participant.summoner2Casts), deaths_by_enemy_champs: safeNum(c.deathsByEnemyChamps), survived_single_digit_hp_count: safeNum(c.survivedSingleDigitHpCount), took_large_damage_survived: safeNum(c.tookLargeDamageSurvived), killed_champ_took_full_team_damage_survived: safeNum(c.killedChampTookFullTeamDamageSurvived), save_ally_from_death: safeNum(c.saveAllyFromDeath), skillshots_dodged: safeNum(c.skillshotsDodged), skillshots_hit: safeNum(c.skillshotsHit), snowballs_hit: safeNum(c.snowballsHit), dodge_skill_shots_small_window: safeNum(c.dodgeSkillShotsSmallWindow), land_skill_shots_early_game: safeNum(c.landSkillShotsEarlyGame), blast_cone_opposite_opponent_count: safeNum(c.blastConeOppositeOpponentCount), quick_cleanse: safeNum(c.quickCleanse), danced_with_rift_herald: safeNum(c.dancedWithRiftHerald), fist_bump_participation: safeNum(c.fistBumpParticipation), flawless_aces: safeNum(c.flawlessAces), double_aces: safeNum(c.doubleAces), aces_before_15_minutes: safeNum(c.acesBefore15Minutes), full_team_takedown: safeNum(c.fullTeamTakedown), assist_12_streak_count: safeNum(c['12AssistStreakCount']), game_ended_in_early_surrender: safeBool(participant.gameEndedInEarlySurrender), game_ended_in_surrender: safeBool(participant.gameEndedInSurrender), team_early_surrendered: safeBool(participant.teamEarlySurrendered),
                champ_level: safeNum(participant.champLevel), champ_experience: safeNum(participant.champExperience), time_played: safeNum(participant.timePlayed), total_time_spent_dead: safeNum(participant.totalTimeSpentDead), first_blood_kill: safeBool(participant.firstBloodKill), first_blood_assist: safeBool(participant.firstBloodAssist), baron_kills: safeNum(participant.baronKills), dragon_kills: safeNum(participant.dragonKills), kills_near_enemy_turret: safeNum(c.killsNearEnemyTurret), kills_under_own_turret: safeNum(c.killsUnderOwnTurret), unseen_recalls: safeNum(c.unseenRecalls), effective_heal_and_shielding: safeNum(c.effectiveHealAndShielding), bounty_gold: safeNum(c.bountyGold), lane_minions_first_10_minutes: safeNum(c.laneMinionsFirst10Minutes), twenty_minions_in_3_seconds_count: safeNum(c.twentyMinionsIn3SecondsCount), legendary_count: safeNum(c.legendaryCount), perfect_game: safeNum(c.perfectGame), max_kill_deficit: safeNum(c.maxKillDeficit), max_level_lead_lane_opponent: safeNum(c.maxLevelLeadLaneOpponent), complete_support_quest_in_time: safeNum(c.completeSupportQuestInTime), mejais_full_stack_in_time: safeNum(c.mejaisFullStackInTime), healing_from_level_objects: safeNum(m.Missions_HealingFromLevelObjects), game_length: safeNum(c.gameLength),

                // === 进阶计算指标 ===
                calc_cs_per_minute: (safeNum(participant.totalMinionsKilled) + safeNum(participant.neutralMinionsKilled)) / durationMin,
                calc_wards_placed_per_minute: safeNum(participant.wardsPlaced) / durationMin,
                calc_wards_killed_per_minute: safeNum(participant.wardsKilled) / durationMin,
                calc_damage_to_champs_per_minute: safeNum(participant.totalDamageDealtToChampions) / durationMin,
                calc_damage_taken_per_minute: safeNum(participant.totalDamageTaken) / durationMin,
                calc_heal_per_minute: safeNum(participant.totalHeal) / durationMin,
                calc_cc_time_per_minute: safeNum(participant.totalTimeCCDealt) / durationMin,
                calc_objective_damage_per_minute: safeNum(participant.damageDealtToObjectives) / durationMin,
                calc_kda: (safeNum(participant.kills) + safeNum(participant.assists)) / Math.max(1, safeNum(participant.deaths))
            };

            const columns = Object.keys(dataRow);
            const values = Object.values(dataRow);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const sql = `INSERT OR IGNORE INTO match_games (${columns.join(', ')}) VALUES (${placeholders})`;

            try {
                await db.execute(sql, values);
                processedCount++;
            } catch (e) {
                console.error(`[Orianna Debug] [Error] 保存游戏 ${game.json.gameId} 失败: `, e);
            }
        }

        return processedCount;
    }
}

export const syncService = new SyncService();