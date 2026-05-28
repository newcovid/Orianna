// src/core/db/schema.ts
import Database from '@tauri-apps/plugin-sql';

const INIT_GAMES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS match_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  puuid TEXT NOT NULL,
  champion_id INTEGER NOT NULL,
  game_mode TEXT NOT NULL,
  queue_id INTEGER NOT NULL,
  game_creation INTEGER NOT NULL,
  game_duration INTEGER NOT NULL,
  win BOOLEAN NOT NULL,
  position TEXT,
  
  -- === 新增：装备、技能、天赋 (17项) ===
  item0 INTEGER DEFAULT 0,
  item1 INTEGER DEFAULT 0,
  item2 INTEGER DEFAULT 0,
  item3 INTEGER DEFAULT 0,
  item4 INTEGER DEFAULT 0,
  item5 INTEGER DEFAULT 0,
  item6 INTEGER DEFAULT 0,
  spell1_id INTEGER DEFAULT 0,
  spell2_id INTEGER DEFAULT 0,
  perk_primary_style INTEGER DEFAULT 0,
  perk_sub_style INTEGER DEFAULT 0,
  perk0 INTEGER DEFAULT 0,
  perk1 INTEGER DEFAULT 0,
  perk2 INTEGER DEFAULT 0,
  perk3 INTEGER DEFAULT 0,
  perk4 INTEGER DEFAULT 0,
  perk5 INTEGER DEFAULT 0,

  -- === 强化符文 (支持竞技场、海克斯大乱斗等模式) ===
  player_augment_1 INTEGER DEFAULT 0,
  player_augment_2 INTEGER DEFAULT 0,
  player_augment_3 INTEGER DEFAULT 0,
  player_augment_4 INTEGER DEFAULT 0,
  player_augment_5 INTEGER DEFAULT 0,
  player_augment_6 INTEGER DEFAULT 0,

  -- === 严格对照的 206 项指标 ===
  kills INTEGER DEFAULT 0,                                 -- 1 击杀
  deaths INTEGER DEFAULT 0,                                -- 2 死亡
  assists INTEGER DEFAULT 0,                               -- 3 助攻
  double_kills INTEGER DEFAULT 0,                          -- 4 双杀
  triple_kills INTEGER DEFAULT 0,                          -- 5 三杀
  quadra_kills INTEGER DEFAULT 0,                          -- 6 四杀
  penta_kills INTEGER DEFAULT 0,                           -- 7 五杀
  unreal_kills INTEGER DEFAULT 0,                          -- 8 超神
  killing_sprees INTEGER DEFAULT 0,                        -- 9 连杀
  largest_killing_spree INTEGER DEFAULT 0,                 -- 10 最大连杀
  largest_multi_kill INTEGER DEFAULT 0,                    -- 11 最大多杀
  longest_time_spent_living INTEGER DEFAULT 0,             -- 12 最长存活时间
  largest_critical_strike INTEGER DEFAULT 0,               -- 13 最大暴击伤害
  damage_gold_efficiency REAL DEFAULT 0,                   -- 14 伤转率
  total_damage_dealt_to_champions INTEGER DEFAULT 0,       -- 15 对英雄总伤害
  physical_damage_dealt_to_champions INTEGER DEFAULT 0,    -- 16 对英雄物理伤害
  magic_damage_dealt_to_champions INTEGER DEFAULT 0,       -- 17 对英雄魔法伤害
  true_damage_dealt_to_champions INTEGER DEFAULT 0,        -- 18 对英雄真实伤害
  total_damage_dealt INTEGER DEFAULT 0,                    -- 19 总伤害输出
  physical_damage_dealt INTEGER DEFAULT 0,                 -- 20 物理伤害输出
  magic_damage_dealt INTEGER DEFAULT 0,                    -- 21 魔法伤害输出
  true_damage_dealt INTEGER DEFAULT 0,                     -- 22 真实伤害输出
  damage_dealt_to_objectives INTEGER DEFAULT 0,            -- 23 对战略点伤害
  damage_dealt_to_turrets INTEGER DEFAULT 0,               -- 24 对防御塔伤害
  damage_dealt_to_buildings INTEGER DEFAULT 0,             -- 25 对建筑物伤害
  damage_dealt_to_epic_monsters INTEGER DEFAULT 0,         -- 26 对史诗野怪伤害
  total_damage_taken INTEGER DEFAULT 0,                    -- 27 承受总伤害
  physical_damage_taken INTEGER DEFAULT 0,                 -- 28 承受物理伤害
  magic_damage_taken INTEGER DEFAULT 0,                    -- 29 承受魔法伤害
  true_damage_taken INTEGER DEFAULT 0,                     -- 30 承受真实伤害
  damage_self_mitigated INTEGER DEFAULT 0,                 -- 31 自我缓和的伤害
  total_damage_shielded_on_teammates INTEGER DEFAULT 0,    -- 32 为队友提供护盾量
  time_ccing_others INTEGER DEFAULT 0,                     -- 33 控制他人时长
  total_time_cc_dealt INTEGER DEFAULT 0,                   -- 34 总控制时长
  enemy_champion_immobilizations INTEGER DEFAULT 0,        -- 35 定身敌方英雄次数
  immobilize_and_kill_with_ally INTEGER DEFAULT 0,         -- 36 定身并与队友击杀
  knock_enemy_into_team_and_kill INTEGER DEFAULT 0,        -- 37 将敌方拉入己方并击杀
  survived_three_immobilizes_in_fight INTEGER DEFAULT 0,   -- 38 三次定身后仍存活
  vision_score INTEGER DEFAULT 0,                          -- 39 视野得分
  wards_placed INTEGER DEFAULT 0,                          -- 40 插眼数
  wards_killed INTEGER DEFAULT 0,                          -- 41 排眼数
  sight_wards_bought_in_game INTEGER DEFAULT 0,            -- 42 购买假眼数
  vision_wards_bought_in_game INTEGER DEFAULT 0,           -- 43 购买真眼数
  detector_wards_placed INTEGER DEFAULT 0,                 -- 44 放置侦查守卫
  vision_score_per_minute REAL DEFAULT 0,                  -- 45 每分钟视野得分
  ward_takedowns INTEGER DEFAULT 0,                        -- 46 摧毁守卫数
  ward_takedowns_before_20m INTEGER DEFAULT 0,             -- 47 二十分钟前排眼数
  wards_guarded INTEGER DEFAULT 0,                         -- 48 守卫保护数
  two_wards_one_sweeper_count INTEGER DEFAULT 0,           -- 49 一次扫描清除两个眼
  control_wards_placed INTEGER DEFAULT 0,                  -- 50 放置控制守卫
  stealth_wards_placed INTEGER DEFAULT 0,                  -- 51 放置隐形守卫
  vision_score_advantage_lane_opponent REAL DEFAULT 0,     -- 52 对线对手视野得分优势
  turret_kills INTEGER DEFAULT 0,                          -- 53 防御塔击杀
  turret_takedowns INTEGER DEFAULT 0,                      -- 54 防御塔摧毁
  solo_turrets_lategame INTEGER DEFAULT 0,                 -- 55 后期单带拆塔
  turrets_lost INTEGER DEFAULT 0,                          -- 56 失去防御塔
  first_turret_killed BOOLEAN DEFAULT 0,                   -- 57 首个防御塔摧毁
  first_tower_assist BOOLEAN DEFAULT 0,                    -- 58 首个防御塔助攻
  first_tower_kill BOOLEAN DEFAULT 0,                      -- 59 首个防御塔
  first_turret_killed_time INTEGER DEFAULT 0,              -- 60 首个防御塔时间
  turret_plates_taken INTEGER DEFAULT 0,                   -- 61 塔皮摧毁数
  k_turrets_destroyed_before_plates_fall INTEGER DEFAULT 0,-- 62 塔皮掉落前摧毁防御塔
  outer_turret_executes_before_10_minutes INTEGER DEFAULT 0,-- 63 十分钟前外塔击杀
  quick_first_turret INTEGER DEFAULT 0,                    -- 64 快速首塔
  takedown_on_first_turret INTEGER DEFAULT 0,              -- 65 首塔击杀参与
  turrets_taken_with_rift_herald INTEGER DEFAULT 0,        -- 66 峡谷先锋摧毁防御塔
  multi_turret_rift_herald_count INTEGER DEFAULT 0,        -- 67 先锋多塔摧毁
  inhibitor_kills INTEGER DEFAULT 0,                       -- 68 水晶击杀
  inhibitor_takedowns INTEGER DEFAULT 0,                   -- 69 水晶摧毁
  inhibitors_lost INTEGER DEFAULT 0,                       -- 70 失去水晶
  lost_an_inhibitor INTEGER DEFAULT 0,                     -- 71 失去水晶(挑战项)
  nexus_kills INTEGER DEFAULT 0,                           -- 72 主水晶击杀
  nexus_lost INTEGER DEFAULT 0,                            -- 73 失去主水晶
  nexus_takedowns INTEGER DEFAULT 0,                       -- 74 主水晶摧毁
  had_open_nexus INTEGER DEFAULT 0,                        -- 75 主水晶暴露
  outnumbered_nexus_kill INTEGER DEFAULT 0,                -- 76 人数劣势主水晶摧毁
  objectives_stolen INTEGER DEFAULT 0,                     -- 77 战略点偷取
  objectives_stolen_assists INTEGER DEFAULT 0,             -- 78 战略点偷取助攻
  gold_earned INTEGER DEFAULT 0,                           -- 79 获得金币
  gold_spent INTEGER DEFAULT 0,                            -- 80 花费金币
  total_minions_killed INTEGER DEFAULT 0,                  -- 81 补刀数
  neutral_minions_killed INTEGER DEFAULT 0,                -- 82 野怪击杀
  total_ally_jungle_minions_killed INTEGER DEFAULT 0,      -- 83 己方野区野怪总数
  total_enemy_jungle_minions_killed INTEGER DEFAULT 0,     -- 84 敌方野区野怪总数
  consumables_purchased INTEGER DEFAULT 0,                 -- 85 购买消耗品
  items_purchased INTEGER DEFAULT 0,                       -- 86 购买装备
  early_laning_phase_gold_exp_advantage REAL DEFAULT 0,    -- 87 早期对线阶段金币经验优势
  laning_phase_gold_exp_advantage REAL DEFAULT 0,          -- 88 对线阶段金币经验优势
  max_cs_advantage_on_lane_opponent REAL DEFAULT 0,        -- 89 对线对手最大补刀优势
  total_heal INTEGER DEFAULT 0,                            -- 90 总治疗量
  total_units_healed INTEGER DEFAULT 0,                    -- 91 治疗单位数
  total_heals_on_teammates INTEGER DEFAULT 0,              -- 92 队友治疗量
  all_in_pings INTEGER DEFAULT 0,                          -- 93 开团信号
  assist_me_pings INTEGER DEFAULT 0,                       -- 94 请求协助信号
  basic_pings INTEGER DEFAULT 0,                           -- 95 基础信号
  command_pings INTEGER DEFAULT 0,                         -- 96 命令信号
  danger_pings INTEGER DEFAULT 0,                          -- 97 危险信号
  enemy_missing_pings INTEGER DEFAULT 0,                   -- 98 敌人消失信号
  enemy_vision_pings INTEGER DEFAULT 0,                    -- 99 敌方视野信号
  get_back_pings INTEGER DEFAULT 0,                        -- 100 后退信号
  hold_pings INTEGER DEFAULT 0,                            -- 101 等待信号
  need_vision_pings INTEGER DEFAULT 0,                     -- 102 需要视野信号
  on_my_way_pings INTEGER DEFAULT 0,                       -- 103 正在路上信号
  push_pings INTEGER DEFAULT 0,                            -- 104 推进信号
  retreat_pings INTEGER DEFAULT 0,                         -- 105 撤退信号
  vision_cleared_pings INTEGER DEFAULT 0,                  -- 106 视野清除信号
  solo_kills INTEGER DEFAULT 0,                            -- 107 单杀
  quick_solo_kills INTEGER DEFAULT 0,                      -- 108 快速单杀
  kill_participation REAL DEFAULT 0,                       -- 109 击杀参与
  outnumbered_kills INTEGER DEFAULT 0,                     -- 110 以少打多击杀
  multikills INTEGER DEFAULT 0,                            -- 111 多杀
  multikills_after_aggressive_flash INTEGER DEFAULT 0,     -- 112 进攻性闪现多杀
  multi_kill_one_spell INTEGER DEFAULT 0,                  -- 113 单技能多杀
  kill_after_hidden_with_ally INTEGER DEFAULT 0,           -- 114 与队友藏身后击杀
  pick_kill_with_ally INTEGER DEFAULT 0,                   -- 115 与队友抓人
  kills_with_help_from_epic_monster INTEGER DEFAULT 0,     -- 116 史诗野怪增益击杀
  takedowns_before_jungle_minion_spawn INTEGER DEFAULT 0,  -- 117 野怪刷新前击杀
  takedowns_first_x_minutes INTEGER DEFAULT 0,             -- 118 前X分钟击杀
  takedowns_after_gaining_level_advantage INTEGER DEFAULT 0,-- 119 等级优势击杀
  takedowns_in_alcove INTEGER DEFAULT 0,                   -- 120 凹室击杀
  takedowns_in_enemy_fountain INTEGER DEFAULT 0,           -- 121 敌方泉水击杀
  kills_on_other_lanes_early_jungle_as_laner INTEGER DEFAULT 0, -- 122 线上英雄早期支援击杀
  get_takedowns_in_all_lanes_early_jungle_as_laner INTEGER DEFAULT 0, -- 123 早期全线支援
  kills_on_recently_healed_by_aram_pack INTEGER DEFAULT 0, -- 124 击杀刚拾取治疗包的敌人
  team_baron_kills INTEGER DEFAULT 0,                      -- 125 参与大龙击杀
  dragon_takedowns INTEGER DEFAULT 0,                      -- 126 参与小龙击杀
  rift_herald_takedowns INTEGER DEFAULT 0,                 -- 127 参与峡谷先锋击杀
  baron_takedowns INTEGER DEFAULT 0,                       -- 128 团队大龙击杀
  team_elder_dragon_kills INTEGER DEFAULT 0,               -- 129 团队远古龙击杀
  team_rift_herald_kills INTEGER DEFAULT 0,                -- 130 团队先锋击杀
  solo_baron_kills INTEGER DEFAULT 0,                      -- 131 单杀大龙
  elder_dragon_kills_with_opposing_soul INTEGER DEFAULT 0, -- 132 敌方有龙魂时的远古龙
  elder_dragon_multikills INTEGER DEFAULT 0,               -- 133 远古龙增益多杀
  perfect_dragon_souls_taken INTEGER DEFAULT 0,            -- 134 完美龙魂
  epic_monster_steals INTEGER DEFAULT 0,                   -- 135 偷取史诗野怪
  epic_monster_stolen_without_smite INTEGER DEFAULT 0,     -- 136 无惩戒偷取史诗野怪
  epic_monster_kills_near_enemy_jungler INTEGER DEFAULT 0, -- 137 敌方打野附近击杀史诗野怪
  epic_monster_kills_within_30_seconds_of_spawn INTEGER DEFAULT 0, -- 138 刷新30秒内击杀史诗野怪
  jungler_takedowns_near_damaged_epic_monster INTEGER DEFAULT 0, -- 139 打野在受伤史诗野怪附近…
  void_monster_kill INTEGER DEFAULT 0,                     -- 140 虛空野怪击杀
  allied_jungle_monster_kills INTEGER DEFAULT 0,           -- 141 己方野怪击杀
  enemy_jungle_monster_kills INTEGER DEFAULT 0,            -- 142 敌方野怪击杀
  scuttle_crab_kills INTEGER DEFAULT 0,                    -- 143 河蟹击杀
  buffs_stolen INTEGER DEFAULT 0,                          -- 144 偷取BUFF
  jungle_cs_before_10_minutes INTEGER DEFAULT 0,           -- 145 十分钟前野区补刀
  initial_buff_count INTEGER DEFAULT 0,                    -- 146 初始BUFF数量
  initial_crab_count INTEGER DEFAULT 0,                    -- 147 初始河蟹数量
  more_enemy_jungle_than_opponent INTEGER DEFAULT 0,       -- 148 反野数量领先
  kda REAL DEFAULT 0,                                      -- 149 KDA
  kill_participation_rate REAL DEFAULT 0,                  -- 150 击杀参与率
  damage_per_minute REAL DEFAULT 0,                        -- 151 每分钟伤害
  gold_per_minute REAL DEFAULT 0,                          -- 152 每分钟金币
  damage_taken_on_team_percentage REAL DEFAULT 0,          -- 153 团队承伤占比
  team_damage_percentage REAL DEFAULT 0,                   -- 154 团队伤害占比
  ability_uses INTEGER DEFAULT 0,                          -- 155 技能使用次数
  spell1_casts INTEGER DEFAULT 0,                          -- 156 Q技能施放
  spell2_casts INTEGER DEFAULT 0,                          -- 157 W技能施放
  spell3_casts INTEGER DEFAULT 0,                          -- 158 E技能施放
  spell4_casts INTEGER DEFAULT 0,                          -- 159 R技能施放
  summoner1_casts INTEGER DEFAULT 0,                       -- 160 召唤师技能1施放
  summoner2_casts INTEGER DEFAULT 0,                       -- 161 召唤师技能2施放
  deaths_by_enemy_champs INTEGER DEFAULT 0,                -- 162 被敌方英雄击杀
  survived_single_digit_hp_count INTEGER DEFAULT 0,        -- 163 个位数生命存活
  took_large_damage_survived INTEGER DEFAULT 0,            -- 164 承受大量伤害存活
  killed_champ_took_full_team_damage_survived INTEGER DEFAULT 0, -- 165 击杀后承受全队伤害存活
  save_ally_from_death INTEGER DEFAULT 0,                  -- 166 救队友于死亡
  skillshots_dodged INTEGER DEFAULT 0,                     -- 167 躲避技巧技能
  skillshots_hit INTEGER DEFAULT 0,                        -- 168 命中技巧技能
  snowballs_hit INTEGER DEFAULT 0,                         -- 169 命中雪球
  dodge_skill_shots_small_window INTEGER DEFAULT 0,        -- 170 短时间内躲避技巧技能
  land_skill_shots_early_game INTEGER DEFAULT 0,           -- 171 早期命中技巧技能
  blast_cone_opposite_opponent_count INTEGER DEFAULT 0,    -- 172 爆炸果实击退敌人
  quick_cleanse INTEGER DEFAULT 0,                         -- 173 快速净化
  danced_with_rift_herald INTEGER DEFAULT 0,               -- 174 与先锋共舞
  fist_bump_participation INTEGER DEFAULT 0,               -- 175 碰拳参与
  flawless_aces INTEGER DEFAULT 0,                         -- 176 完美团灭
  double_aces INTEGER DEFAULT 0,                           -- 177 双重团灭
  aces_before_15_minutes INTEGER DEFAULT 0,                -- 178 十分钟前团灭敌方
  full_team_takedown INTEGER DEFAULT 0,                    -- 179 全队参与击杀
  assist_12_streak_count INTEGER DEFAULT 0,                -- 180 12连助攻
  game_ended_in_early_surrender BOOLEAN DEFAULT 0,         -- 181 重开投降
  game_ended_in_surrender BOOLEAN DEFAULT 0,               -- 182 游戏以投降结束
  team_early_surrendered BOOLEAN DEFAULT 0,                -- 183 队伍提前投降
  champ_level INTEGER DEFAULT 0,                           -- 184 英雄等级
  champ_experience INTEGER DEFAULT 0,                      -- 185 英雄经验
  time_played INTEGER DEFAULT 0,                           -- 186 游玩时长
  total_time_spent_dead INTEGER DEFAULT 0,                 -- 187 死亡时长
  first_blood_kill BOOLEAN DEFAULT 0,                      -- 188 一血
  first_blood_assist BOOLEAN DEFAULT 0,                    -- 189 一血助攻
  baron_kills INTEGER DEFAULT 0,                           -- 190 大龙击杀
  dragon_kills INTEGER DEFAULT 0,                          -- 191 小龙击杀
  kills_near_enemy_turret INTEGER DEFAULT 0,               -- 192 敌方塔下击杀
  kills_under_own_turret INTEGER DEFAULT 0,                -- 193 己方塔下击杀
  unseen_recalls INTEGER DEFAULT 0,                        -- 194 未被发现回城
  effective_heal_and_shielding INTEGER DEFAULT 0,          -- 195 有效治疗和护盾
  bounty_gold INTEGER DEFAULT 0,                           -- 196 赏金金币
  lane_minions_first_10_minutes INTEGER DEFAULT 0,         -- 197 前十分钟线上补刀
  twenty_minions_in_3_seconds_count INTEGER DEFAULT 0,     -- 198 三秒内二十补刀
  legendary_count INTEGER DEFAULT 0,                       -- 199 超神次数
  perfect_game INTEGER DEFAULT 0,                          -- 200 完美游戏
  max_kill_deficit INTEGER DEFAULT 0,                      -- 201 最大击杀劣势
  max_level_lead_lane_opponent INTEGER DEFAULT 0,          -- 202 对线对手最大等级领先
  complete_support_quest_in_time INTEGER DEFAULT 0,        -- 203 按时完成辅助任务
  mejais_full_stack_in_time INTEGER DEFAULT 0,             -- 204 按时满层杀人书
  healing_from_level_objects INTEGER DEFAULT 0,            -- 205 地图资源治疗
  game_length INTEGER DEFAULT 0,                           -- 206 游戏总时长

  -- === 进阶计算指标 (基于原始数据衍生计算) ===
  calc_cs_per_minute REAL DEFAULT 0,                       -- 207 分均补刀 (总补刀 / 游戏时长)
  calc_wards_placed_per_minute REAL DEFAULT 0,             -- 208 分均插眼 (插眼数 / 游戏时长)
  calc_wards_killed_per_minute REAL DEFAULT 0,             -- 209 分均排眼 (排眼数 / 游戏时长)
  calc_damage_to_champs_per_minute REAL DEFAULT 0,         -- 210 分均对英雄伤害 (对英雄总伤害 / 游戏时长)
  calc_damage_taken_per_minute REAL DEFAULT 0,             -- 211 分均承伤 (承受总伤害 / 游戏时长)
  calc_heal_per_minute REAL DEFAULT 0,                     -- 212 分均治疗 (总治疗量 / 游戏时长)
  calc_cc_time_per_minute REAL DEFAULT 0,                  -- 213 分均控制时长 (总控制时长 / 游戏时长)
  calc_objective_damage_per_minute REAL DEFAULT 0,         -- 214 分均对战略点伤害 (对战略点伤害 / 游戏时长)
  calc_kda REAL DEFAULT 0,                                 -- 215 进阶精确KDA ((击杀+助攻)/Max(死亡,1))

  UNIQUE(game_id, puuid)
);
`;

export class DatabaseService {
    private db: Database | null = null;
    public isReady = false;
    private _resolveReady!: () => void;
    public readonly ready: Promise<void> = new Promise(resolve => {
        this._resolveReady = resolve;
    });

    async init() {
        try {
            this.db = await Database.load('sqlite:orianna.db');

            // 创建表结构 (若已存在则忽略)
            await this.db.execute(INIT_GAMES_TABLE_SQL);

            // 【热补丁自动迁移】：为老用户的本地数据库静默追加所有可能遗漏的新字段
            // 如果某列已存在，ALTER TABLE 会抛出异常，这里通过 catch 精准吞掉异常即可安全升级
            const autoMigrateColumns = [
                // 进阶计算指标 (近期更新)
                { name: 'calc_cs_per_minute', type: 'REAL' },
                { name: 'calc_wards_placed_per_minute', type: 'REAL' },
                { name: 'calc_wards_killed_per_minute', type: 'REAL' },
                { name: 'calc_damage_to_champs_per_minute', type: 'REAL' },
                { name: 'calc_damage_taken_per_minute', type: 'REAL' },
                { name: 'calc_heal_per_minute', type: 'REAL' },
                { name: 'calc_cc_time_per_minute', type: 'REAL' },
                { name: 'calc_objective_damage_per_minute', type: 'REAL' },
                { name: 'calc_kda', type: 'REAL' },
                // 强化符文 (最新更新)
                { name: 'player_augment_1', type: 'INTEGER' },
                { name: 'player_augment_2', type: 'INTEGER' },
                { name: 'player_augment_3', type: 'INTEGER' },
                { name: 'player_augment_4', type: 'INTEGER' },
                { name: 'player_augment_5', type: 'INTEGER' },
                { name: 'player_augment_6', type: 'INTEGER' }
            ];

            for (const col of autoMigrateColumns) {
                try {
                    await this.db.execute(`ALTER TABLE match_games ADD COLUMN ${col.name} ${col.type} DEFAULT 0;`);
                } catch (e) {
                    // 该字段已存在，属于正常情况，静默忽略
                }
            }

            this.isReady = true;
            this._resolveReady();
        } catch (error: any) {
            console.error('[Orianna Debug] [DB Error] 数据库初始化彻底失败:', error);
            throw error;
        }
    }

    // 底层硬件级物理清空数据，包含存储碎片整理
    async clearGamesData() {
        if (!this.db || !this.isReady) throw new Error('Database is not initialized or not ready');
        try {
            await this.db.execute('DELETE FROM match_games');
            try {
                // 回收 SQLite 释放的磁盘物理空间，降低体积
                await this.db.execute('VACUUM');
            } catch (e) {
                console.warn('[Orianna Debug] VACUUM 失败 (可能 Tauri 驱动环境受限), 已静默忽略:', e);
            }
        } catch (error: any) {
            console.error('[Orianna Debug] [DB Error] 清空数据库发生致命错误:', error);
            throw error;
        }
    }

    get instance() {
        if (!this.db || !this.isReady) throw new Error('Database is not initialized or not ready');
        return this.db;
    }
}

export const dbService = new DatabaseService();