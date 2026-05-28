# Orianna 图表插件开发白皮书 (v3.0)

## 核心法则

**配置即意图**

插件配置文件 (`.json`) 是一份纯粹的数据意图声明表。严禁在 JSON 中包含任何 SQL 语句、JavaScript 代码或业务逻辑。配置文件的唯一作用是声明：“需要提取什么数据”、“数据筛选条件是什么”以及“图表如何呈现”。Orianna 的底层数据引擎会接管一切，处理数据库多表关联、多玩家横向对比、缓存调度以及 UI 渲染。

---

## 一、 JSON 核心结构

一个标准的插件配置严格遵循以下四个顶级节点，所有数据交互均在此定义：

```json
{
  "manifest": { ... },       // 必填项。插件的基础身份与描述信息
  "layout": { ... },         // 必填项。图表在界面看板中的布局约束
  "dataQuery": { ... },      // 必填项。数据提取规则声明
  "visualization": { ... }   // 必填项。图表视觉渲染映射规则
}
```

---

## 二、 字段详细说明

### 1. Manifest (元数据)

用于定义插件在应用内以及未来创意工坊中的展示信息。

| 字段名        | 类型     | 必填 | 描述                                                       |
| :------------ | :------- | :--- | :--------------------------------------------------------- |
| `id`          | String   | 是   | 唯一标识符，要求全小写字母与下划线。例：`kda_radar_chart`  |
| `name`        | String   | 是   | 插件在界面上显示的名称。例：`多维能力雷达图`               |
| `description` | String   | 否   | 描述该插件具体作用和统计维度的文字说明。                   |
| `version`     | String   | 是   | 插件版本号，格式如 `"1.0.0"`。                             |
| `author`      | String   | 否   | 插件作者名称。                                             |
| `tags`        | String[] | 否   | 用于分类和搜索的标签数组。例：`["雷达图", "视野", "排位"]` |

### 2. Layout (布局)

用于定义图表在界面的呈现尺寸，以及允许挂载展示的页面场景。

| 字段名  | 类型     | 必填 | 描述                                                                                                                                                                                           |
| :------ | :------- | :--- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grid`  | String   | 是   | 网格跨度，控制图表宽度。常用值：<br>`"col-span-1"`：占 1 列（适合雷达图、饼图、数值卡片）<br>`"col-span-2"`：占 2 列（适合中型折线图、散点图）<br>`"col-span-4"`：占满一行（适合长趋势折线图） |
| `mount` | String[] | 是   | 允许挂载的页面场景。<br>`"dashboard"`：个人总览（单人数据源）<br>`"compare"`：多人对比（多玩家横向对比数据源）                                                                                 |

### 3. DataQuery (数据域)

插件的核心节点，指示底层引擎从数据库中提取怎样的数据模型。

| 字段名        | 类型     | 必填 | 描述                                                                                                                                                                                                                                                                                                                     |
| :------------ | :------- | :--- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`      | String   | 否   | 数据实体对象，默认值为 `"match_games"`（按单局对局统计）。<br>**特殊支持 1**：可填入 `"match_items"`，此时引擎会自动将玩家每局购买的 7 件装备拆分为独立记录，专用于制作装备相关的统计图表。<br>**特殊支持 2**：可填入 `"match_augments"`，引擎会将每局获取的 6 个强化符文拆分为独立记录，专用于竞技场/大乱斗的符文图表。 |
| `filters`     | Object   | 否   | 数据的筛选条件，用于缩小查询范围。详细说明见下文 **表 A**。                                                                                                                                                                                                                                                              |
| `groupBy`     | String[] | 否   | 分组维度。例如填入 `["position"]` 表示按分路聚合数据；填入 `["champion_id"]` 表示按英雄聚合。通常用于饼图或排行列表。                                                                                                                                                                                                    |
| `metrics`     | Object[] | 是   | 具体需要提取的指标。<br>`field`与`expression `二选一：<br> `field`：直接映射单一数据库字段如 `kills`。如果 `entity` 为 `"match_items"`，此项固定为 `item_id`。<br> expression：编写 SQLite 原生公式进行组合计算。<br>`aggregate`：聚合方式（`"avg"`, `"sum"`, `"max"`, `"min"`, `"count"`）。<br>`alias`：重命名的别名。 |
| `sortBy`      | Object   | 否   | 结果的排序依据。格式为 `{"field": "指标别名", "direction": "DESC"}`。`DESC` 为降序，`ASC` 为升序。                                                                                                                                                                                                                       |
| `outputLimit` | Number   | 否   | 最终输出给前端图表的条目数上限。例如制作“TOP 5 排行榜”时填 `5`。                                                                                                                                                                                                                                                         |

#### 公式沙盒与安全计算

在 metrics 节点中，你可以放弃单一的 field 提取，转而使用 expression 编写自定义计算公式。

例如，你想计算“分均物理伤害”：
``` json
{
  "expression": "physical_damage_dealt / MAX(game_duration / 60.0, 1)",
  "aggregate": "avg",
  "alias": "physical_dmg_per_min"
}
```

##### SQL注入拦截规则

为了防止恶意的 SQL 注入，Orianna 的 AST 解析引擎会对传入的 expression 进行词法审计。你的公式只能包含以下元素：
1. 基础运算符：`+`, `-`, `*`, `/`, `()`
2. 合法的数据库字段名（如 `kills`, `game_duration` 等）
3. 安全的函数调用
   - MAX(a, b) / MIN(a, b)：取最大/最小值（常用于将分母的 0 兜底为 1 防止报错）。
   - ABS(a)：取绝对值。
   - ROUND(a, n)：四舍五入保留 n 位小数。
   - IFNULL(a, b)：如果 a 是空值，则返回 b。
   - CAST(x AS REAL) / CAST(x AS INTEGER)：强制类型转换。

任何在上述白名单之外的字母组合（例如 DROP, SELECT, EXEC 或者未知的字段名）都会被引擎在渲染前物理阻断，并抛出 [安全拦截] 错误。

#### 表 A：Filters 过滤条件说明
如果未填写某项，则默认该条件不限。

* `limit` (Number): 向过去追溯的对局样本量。例如只统计最近 `20` 场。**强烈建议填写该项以保证计算性能**。
* `matchResult` (String): 比赛胜负过滤。可选值为 `"win"` (仅看胜局), `"loss"` (仅看败局), `"all"` (不限)。
* `queueId` (Number | Number[]): 指定游戏模式。支持单个数字或数字数组，对照表见下文 **表 B**。
* `championId` (Number | Number[]): 指定使用的英雄 ID。支持单个数字或数字数组。
* `position` (String | String[]): 指定分路位置。支持单个字符串或字符串数组，对照表见下文 **表 C**。
* `augmentId` (Number | Number[]): **仅当 entity 为 `match_augments` 时生效**。指定必须包含的强化符文 ID（如 `1004` 代表回归基本功）。支持单个或数组。
* `itemId` (Number | Number[]): **仅当 entity 为 `match_items` 时生效**。指定必须包含的装备 ID。支持单个或数组。


### 4. Visualization (视觉映射)

指示引擎在获取 `DataQuery` 返回的数据后，如何进行图表渲染。

| 字段名          | 类型     | 必填 | 描述                                                                                                                                                                                                             |
| :-------------- | :------- | :--- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | String   | 是   | 图表基础类型。可选值：`"line"` (折线图), `"bar"` (柱状图), `"radar"` (雷达图), `"scatter"` (散点图), `"pie"` (饼图), `"stat-card"` (数值看板), `"list"` (列表)。                                                 |
| `compareMode`   | String   | 是   | 决定图表在收到多个玩家时如何渲染`"aggregate"` (叠加模式,适用图表类型：line (折线图), radar (雷达图), scatter (散点图)。), `"aggregate"` (聚合模式,适用图表类型：bar (柱状图), pie (饼图), list (排行榜列表)。)。 |
| `categoryField` | String   | 否   | 适用于 `"pie"`, `"list"`, 或配置了 `groupBy` 的图表。指定哪个字段作为分类的名称标签。                                                                                                                            |
| `xAxis`         | Object   | 否   | X 轴映射规则。格式为 `{"field": "字段名", "format": "格式类型"}`。<br>`format` 可选 `"index"` (按场次顺序), `"time"` (时间戳), `"value"` (连续数值)。                                                            |
| `yAxis`         | Object   | 否   | Y 轴映射规则。通常用于散点图配置纵坐标字段。                                                                                                                                                                     |
| `series`        | Object[] | 是   | 数据列映射，定义要在图表中画出的线条或区块。<br>格式示例：`[{"field": "avg_kda", "name": "KDA", "color": "#10b981", "max": 10}]`。`max` 属性常用于限制雷达图边界。                                               |

---

## 三、 常量字典与参数获取指南

### 表 B：游戏模式对照表 (queueId)

可以在 `filters.queueId` 中传入单个数字或数组。

| ID     | 模式名称     | ID     | 模式名称   |
| :----- | :----------- | :----- | :--------- |
| `420`  | 单双排位     | `450`  | 极地大乱斗 |
| `430`  | 匹配模式     | `900`  | 无限乱斗   |
| `440`  | 灵活排位     | `1700` | 斗魂竞技场 |
| `480`  | 快速模式     | `1900` | 无限火力   |
| `490`  | 快速匹配     | `2300` | 神木之门   |
| `2400` | 海克斯大乱斗 |        |            |

### 表 C：分路位置对照表 (position)

| 枚举值     | 名称 | 枚举值          | 名称                         |
| :--------- | :--- | :-------------- | :--------------------------- |
| `"TOP"`    | 上单 | `"BOTTOM"`      | 下路 (ADC)                   |
| `"JUNGLE"` | 打野 | `"UTILITY"`     | 辅助                         |
| `"MIDDLE"` | 中单 | `""` (空字符串) | 不限（如大乱斗等无分路模式） |

### 英雄 ID 查询指南 (championId)
可以在 `filters.championId` 中指定具体的英雄。查询内部 ID 的方式：
1. **本地文件**：查阅项目源码 `src/assets/champion.json`。
2. **官方接口**：访问官方数据源（如 `ddragon.leagueoflegends.com/cdn/14.13.1/data/zh_CN/champion.json`），查找英雄属性中的 `key` 字段（例如亚索为 `"157"`，安妮为 `"1"`）。

---

### 强化符文 ID 查询指南 (augmentId / augment_id)
可以在 `filters.augmentId`（仅限于 `match_augments` 实体下）指定具体的强化符文，或在 `groupBy` 中使用 `augment_id` 分组。查询内部 ID 的方式：

1. **官方接口（唯一准确源）**：访问 CommunityDragon 的斗魂竞技场与大乱斗专属数据源：
   * `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/zh_cn/v1/cherry-augments.json`
2. **查询方式**：在该 JSON 文件中搜索符文的中文名称（如“回归基本功”），提取其 `id` 字段（如 `"1004"`）。
> **避坑警告**：切勿使用 `perks.json`。该文件是召唤师峡谷的常规天赋（如致命节奏、先攻等），不可与大乱斗的强化符文混用。


---

## 四、 插件配置示例

### 示例 1：纯数值展示卡片
**需求：** 统计最近 20 场灵活排位中单的平均视野得分和平均放置隐形守卫的数量。

```json
{
  "manifest": {
    "id": "mid_vision_stat",
    "name": "中路视野综合评分",
    "description": "最近20场灵活组排中单的视野贡献表现",
    "version": "1.0.0"
  },
  "layout": { "grid": "col-span-1", "mount": ["dashboard", "compare"] },
  "dataQuery": {
    "entity": "match_games",
    "filters": {
      "limit": 20,
      "queueId": 440,
      "position": "MIDDLE"
    },
    "metrics": [
      { "field": "vision_score", "aggregate": "avg", "alias": "avg_vision" },
      { "field": "stealth_wards_placed", "aggregate": "avg", "alias": "avg_stealth" }
    ]
  },
  "visualization": {
    "type": "stat-card",
    "series": [
      { "field": "avg_vision", "name": "平均视野得分", "color": "#38bdf8" },
      { "field": "avg_stealth", "name": "平均隐形守卫", "color": "#10b981" }
    ]
  }
}
```

### 示例 2：分组聚合饼图
**需求：** 统计最近 30 场排位赛（单双和灵活）中，五个不同分路位置的平均 KDA 占比。

```json
{
  "manifest": {
    "id": "kda_by_position_pie",
    "name": "排位赛各路 KDA 占比",
    "version": "1.0.0"
  },
  "layout": { "grid": "col-span-1", "mount": ["dashboard"] },
  "dataQuery": {
    "entity": "match_games",
    "filters": {
      "limit": 30,
      "queueId": [420, 440]
    },
    "groupBy": ["position"],
    "metrics": [
      { "field": "kda", "aggregate": "avg", "alias": "avg_kda" }
    ]
  },
  "visualization": {
    "type": "pie",
    "categoryField": "position",
    "series": [
      { "field": "avg_kda", "name": "平均 KDA" }
    ]
  }
}
```

### 示例 3：利用虚拟实体的购买统计列表
**需求：** 统计最近 40 场对局中，购买次数最多的前 5 件装备排名。

```json
{
  "manifest": {
    "id": "top_items_list",
    "name": "最爱出装 TOP5",
    "version": "1.0.0"
  },
  "layout": { "grid": "col-span-1", "mount": ["dashboard", "compare"] },
  "dataQuery": {
    "entity": "match_items", 
    "filters": {
      "limit": 40
    },
    "groupBy": ["item_id"],
    "metrics": [
      { "field": "item_id", "aggregate": "count", "alias": "purchase_count" }
    ],
    "sortBy": {
      "field": "purchase_count",
      "direction": "DESC"
    },
    "outputLimit": 5
  },
  "visualization": {
    "type": "list",
    "categoryField": "item_id",
    "series": [
      { "field": "purchase_count", "name": "购买次数" }
    ]
  }
}
```

### 示例 4：双变量横纵映射散点图
**需求：** 统计最近 50 场排位和匹配对局中，放置守卫数量（X轴）与视野得分（Y轴）的关系。

```json
{
  "manifest": {
    "id": "wards_vs_vision_scatter",
    "name": "插眼数与视野分关系",
    "version": "1.0.0"
  },
  "layout": { "grid": "col-span-2", "mount": ["dashboard", "compare"] },
  "dataQuery": {
    "entity": "match_games",
    "filters": {
      "limit": 50,
      "queueId": [420, 430, 440]
    },
    "metrics": [
      { "field": "wards_placed", "alias": "wards" },
      { "field": "vision_score", "alias": "vision" }
    ]
  },
  "visualization": {
    "type": "scatter",
    "xAxis": { "field": "wards", "format": "value" },
    "yAxis": { "field": "vision" },
    "series": [
      { "field": "vision", "name": "对局视觉贡献" }
    ]
  }
}
```

### 示例 5：全字段完整参考
**用途：** 仅作为包含所有可用字段的结构参考，无实际数据分析意义。

```json
{
  "manifest": {
    "id": "kitchen_sink_example",
    "name": "全字段配置参考",
    "description": "涵盖白皮书中提及的所有字段，用于开发对照",
    "version": "1.0.0",
    "author": "Orianna Team",
    "tags": ["测试", "全量字段"]
  },
  "layout": {
    "grid": "col-span-2",
    "mount": ["dashboard", "compare"]
  },
  "dataQuery": {
    "entity": "match_games",
    "filters": {
      "limit": 50,
      "matchResult": "win",
      "queueId": [420, 440],
      "championId": [1, 157],
      "position": "MIDDLE"
    },
    "groupBy": ["champion_id", "position"],
    "metrics": [
      { "field": "kills", "aggregate": "avg", "alias": "avg_kills" },
      { "field": "deaths", "aggregate": "max", "alias": "max_deaths" }
    ],
    "sortBy": {
      "field": "avg_kills",
      "direction": "DESC"
    },
    "outputLimit": 10
  },
  "visualization": {
    "type": "bar",
    "categoryField": "champion_id",
    "xAxis": { "field": "champion_id", "format": "index" },
    "yAxis": { "field": "avg_kills" },
    "series": [
      { "field": "avg_kills", "name": "平均击杀", "color": "#ef4444", "max": 20 },
      { "field": "max_deaths", "name": "最多死亡", "color": "#10b981" }
    ]
  }
}
```
### 示例 6：虚拟实体强化符文排名列表
**需求：** 统计最近 20 场斗魂竞技场与海克斯大乱斗中，获取次数最多的前 10 个强化符文。

```json
{
  "manifest": {
    "id": "top_augments_list",
    "name": "最爱符文 TOP10",
    "description": "最近 20 场斗魂竞技场与大乱斗中最常选择的强化符文",
    "version": "1.0.0"
  },
  "layout": { "grid": "col-span-1", "mount": ["dashboard", "compare"] },
  "dataQuery": {
    "entity": "match_augments", 
    "filters": {
      "limit": 20,
      "queueId": [1700, 2400]
    },
    "groupBy": ["augment_id"],
    "metrics": [
      { "field": "augment_id", "aggregate": "count", "alias": "pick_count" }
    ],
    "sortBy": {
      "field": "pick_count",
      "direction": "DESC"
    },
    "outputLimit": 10
  },
  "visualization": {
    "type": "list",
    "categoryField": "augment_id",
    "series": [
      { "field": "pick_count", "name": "选取次数" }
    ]
  }
}
```

## 五、 数据指标字典 (Metrics Dictionary)

在配置 `dataQuery.metrics[].field` 时，必须从以下数据库字段中选取。引擎会自动处理字段提取与聚合。

### 1. 基础维度与资产字段
*常用于 `groupBy` 分组或条件判定。*
* `game_mode` (TEXT): 游戏模式 (如 CLASSIC, ARAM)
* `queue_id` (INTEGER): 匹配队列 ID (参考表 B)
* `champion_id` (INTEGER): 英雄 ID
* `win` (BOOLEAN): 是否获胜
* `position` (TEXT): 对应分路 (参考表 C)
* `game_creation` (INTEGER): 对局创建时间戳
* `game_duration` (INTEGER): 对局持续时长 (秒)
* `item0` ~ `item6` (INTEGER): 装备栏物品 ID
* `spell1_id` / `spell2_id` (INTEGER): 召唤师技能 ID
* `perk_primary_style` / `perk_sub_style` (INTEGER): 主/副系符文树 ID
* `player_augment_1` ~ `player_augment_6` (INTEGER): 对局内获取的 1 到 6 号强化符文 ID（主要用于海克斯大乱斗与斗魂竞技场）。
* `augment_id` (INTEGER): **仅在 entity 为 `match_augments` 时可用**，代表逆透视解包后的独立强化符文 ID，可用于 `groupBy` 分类或指标提取。


### 2. 详细表现核心指标 (206 项全览)
*以下字段均可作为 `metrics.field` 进行统计、聚合或绘制图表。*

| 字段名 (Field)                                     | 中文含义                   | 字段名 (Field)                                  | 中文含义                  |
| :------------------------------------------------- | :------------------------- | :---------------------------------------------- | :------------------------ |
| `kills`                                            | 击杀                       | `deaths`                                        | 死亡                      |
| `assists`                                          | 助攻                       | `double_kills`                                  | 双杀                      |
| `triple_kills`                                     | 三杀                       | `quadra_kills`                                  | 四杀                      |
| `penta_kills`                                      | 五杀                       | `unreal_kills`                                  | 超神                      |
| `killing_sprees`                                   | 连杀次数                   | `largest_killing_spree`                         | 最大连杀                  |
| `largest_multi_kill`                               | 最大多杀                   | `longest_time_spent_living`                     | 最长存活时间              |
| `largest_critical_strike`                          | 最大暴击伤害               | `damage_gold_efficiency`                        | 伤转率                    |
| `total_damage_dealt_to_champions`                  | 对英雄总伤害               | `physical_damage_dealt_to_champions`            | 对英雄物理伤害            |
| `magic_damage_dealt_to_champions`                  | 对英雄魔法伤害             | `true_damage_dealt_to_champions`                | 对英雄真实伤害            |
| `total_damage_dealt`                               | 总伤害输出                 | `physical_damage_dealt`                         | 物理伤害输出              |
| `magic_damage_dealt`                               | 魔法伤害输出               | `true_damage_dealt`                             | 真实伤害输出              |
| `damage_dealt_to_objectives`                       | 对战略点伤害               | `damage_dealt_to_turrets`                       | 对防御塔伤害              |
| `damage_dealt_to_buildings`                        | 对建筑物伤害               | `damage_dealt_to_epic_monsters`                 | 对史诗野怪伤害            |
| `total_damage_taken`                               | 承受总伤害                 | `physical_damage_taken`                         | 承受物理伤害              |
| `magic_damage_taken`                               | 承受魔法伤害               | `true_damage_taken`                             | 承受真实伤害              |
| `damage_self_mitigated`                            | 自我缓和的伤害             | `total_damage_shielded_on_teammates`            | 为队友提供护盾量          |
| `time_ccing_others`                                | 控制他人时长               | `total_time_cc_dealt`                           | 总控制时长                |
| `enemy_champion_immobilizations`                   | 定身敌方英雄次数           | `immobilize_and_kill_with_ally`                 | 定身并与队友击杀          |
| `knock_enemy_into_team_and_kill`                   | 将敌方拉入己方并击杀       | `survived_three_immobilizes_in_fight`           | 三次定身后仍存活          |
| `vision_score`                                     | 视野得分                   | `wards_placed`                                  | 插眼数                    |
| `wards_killed`                                     | 排眼数                     | `sight_wards_bought_in_game`                    | 购买假眼数                |
| `vision_wards_bought_in_game`                      | 购买真眼数                 | `detector_wards_placed`                         | 放置侦查守卫              |
| `vision_score_per_minute`                          | 每分钟视野得分             | `ward_takedowns`                                | 摧毁守卫数                |
| `ward_takedowns_before_20m`                        | 二十分钟前排眼数           | `wards_guarded`                                 | 守卫保护数                |
| `two_wards_one_sweeper_count`                      | 一次扫描清除两个眼         | `control_wards_placed`                          | 放置控制守卫              |
| `stealth_wards_placed`                             | 放置隐形守卫               | `vision_score_advantage_lane_opponent`          | 对线对手视野得分优势      |
| `turret_kills`                                     | 防御塔击杀                 | `turret_takedowns`                              | 防御塔摧毁参与            |
| `solo_turrets_lategame`                            | 后期单带拆塔               | `turrets_lost`                                  | 失去防御塔                |
| `first_turret_killed`                              | 击杀首个防御塔             | `first_tower_assist`                            | 首个防御塔助攻            |
| `first_tower_kill`                                 | 首个防御塔击杀             | `first_turret_killed_time`                      | 首个防御塔时间            |
| `turret_plates_taken`                              | 塔皮摧毁数                 | `k_turrets_destroyed_before_plates_fall`        | 塔皮掉落前摧毁防御塔      |
| `outer_turret_executes_before_10_minutes`          | 十分钟前外塔击杀           | `quick_first_turret`                            | 快速首塔                  |
| `takedown_on_first_turret`                         | 首塔击杀参与               | `turrets_taken_with_rift_herald`                | 峡谷先锋摧毁防御塔        |
| `multi_turret_rift_herald_count`                   | 先锋多塔摧毁               | `inhibitor_kills`                               | 水晶击杀                  |
| `inhibitor_takedowns`                              | 水晶摧毁参与               | `inhibitors_lost`                               | 失去水晶                  |
| `lost_an_inhibitor`                                | 失去水晶(挑战项)           | `nexus_kills`                                   | 主水晶击杀                |
| `nexus_lost`                                       | 失去主水晶                 | `nexus_takedowns`                               | 主水晶摧毁参与            |
| `had_open_nexus`                                   | 主水晶暴露                 | `outnumbered_nexus_kill`                        | 人数劣势主水晶摧毁        |
| `objectives_stolen`                                | 战略点偷取                 | `objectives_stolen_assists`                     | 战略点偷取助攻            |
| `gold_earned`                                      | 获得金币                   | `gold_spent`                                    | 花费金币                  |
| `total_minions_killed`                             | 补刀数                     | `neutral_minions_killed`                        | 野怪击杀                  |
| `total_ally_jungle_minions_killed`                 | 己方野区野怪总数           | `total_enemy_jungle_minions_killed`             | 敌方野区野怪总数          |
| `consumables_purchased`                            | 购买消耗品                 | `items_purchased`                               | 购买装备                  |
| `early_laning_phase_gold_exp_advantage`            | 早期对线阶段金币经验优势   | `laning_phase_gold_exp_advantage`               | 对线阶段金币经验优势      |
| `max_cs_advantage_on_lane_opponent`                | 对线对手最大补刀优势       | `total_heal`                                    | 总治疗量                  |
| `total_units_healed`                               | 治疗单位数                 | `total_heals_on_teammates`                      | 队友治疗量                |
| `all_in_pings`                                     | 开团信号                   | `assist_me_pings`                               | 请求协助信号              |
| `basic_pings`                                      | 基础信号                   | `command_pings`                                 | 命令信号                  |
| `danger_pings`                                     | 危险信号                   | `enemy_missing_pings`                           | 敌人消失信号              |
| `enemy_vision_pings`                               | 敌方视野信号               | `get_back_pings`                                | 后退信号                  |
| `hold_pings`                                       | 等待信号                   | `need_vision_pings`                             | 需要视野信号              |
| `on_my_way_pings`                                  | 正在路上信号               | `push_pings`                                    | 推进信号                  |
| `retreat_pings`                                    | 撤退信号                   | `vision_cleared_pings`                          | 视野清除信号              |
| `solo_kills`                                       | 单杀                       | `quick_solo_kills`                              | 快速单杀                  |
| `kill_participation`                               | 击杀参与                   | `outnumbered_kills`                             | 以少打多击杀              |
| `multikills`                                       | 多杀                       | `multikills_after_aggressive_flash`             | 进攻性闪现多杀            |
| `multi_kill_one_spell`                             | 单技能多杀                 | `kill_after_hidden_with_ally`                   | 与队友藏身后击杀          |
| `pick_kill_with_ally`                              | 与队友抓人                 | `kills_with_help_from_epic_monster`             | 史诗野怪增益击杀          |
| `takedowns_before_jungle_minion_spawn`             | 野怪刷新前击杀参与         | `takedowns_first_x_minutes`                     | 前X分钟击杀参与           |
| `takedowns_after_gaining_level_advantage`          | 等级优势击杀参与           | `takedowns_in_alcove`                           | 凹室击杀参与              |
| `takedowns_in_enemy_fountain`                      | 敌方泉水击杀参与           | `kills_on_other_lanes_early_jungle_as_laner`    | 线上英雄早期支援击杀      |
| `get_takedowns_in_all_lanes_early_jungle_as_laner` | 早期全线支援               | `kills_on_recently_healed_by_aram_pack`         | 击杀刚拾取治疗包的敌人    |
| `team_baron_kills`                                 | 参与大龙击杀               | `dragon_takedowns`                              | 参与小龙击杀              |
| `rift_herald_takedowns`                            | 参与峡谷先锋击杀           | `baron_takedowns`                               | 团队大龙击杀参与          |
| `team_elder_dragon_kills`                          | 团队远古龙击杀             | `team_rift_herald_kills`                        | 团队先锋击杀              |
| `solo_baron_kills`                                 | 单杀大龙                   | `elder_dragon_kills_with_opposing_soul`         | 敌方有龙魂时的远古龙击杀  |
| `elder_dragon_multikills`                          | 远古龙增益多杀             | `perfect_dragon_souls_taken`                    | 完美龙魂                  |
| `epic_monster_steals`                              | 偷取史诗野怪               | `epic_monster_stolen_without_smite`             | 无惩戒偷取史诗野怪        |
| `epic_monster_kills_near_enemy_jungler`            | 敌方打野附近击杀史诗野怪   | `epic_monster_kills_within_30_seconds_of_spawn` | 刷新30秒内击杀史诗野怪    |
| `jungler_takedowns_near_damaged_epic_monster`      | 打野在受伤史诗野怪附近击杀 | `void_monster_kill`                             | 虛空野怪击杀              |
| `allied_jungle_monster_kills`                      | 己方野怪击杀               | `enemy_jungle_monster_kills`                    | 敌方野怪击杀              |
| `scuttle_crab_kills`                               | 河蟹击杀                   | `buffs_stolen`                                  | 偷取BUFF                  |
| `jungle_cs_before_10_minutes`                      | 十分钟前野区补刀           | `initial_buff_count`                            | 初始BUFF数量              |
| `initial_crab_count`                               | 初始河蟹数量               | `more_enemy_jungle_than_opponent`               | 反野数量领先              |
| `kda`                                              | KDA                        | `kill_participation_rate`                       | 击杀参与率                |
| `damage_per_minute`                                | 每分钟伤害                 | `gold_per_minute`                               | 每分钟金币                |
| `damage_taken_on_team_percentage`                  | 团队承伤占比               | `team_damage_percentage`                        | 团队伤害占比              |
| `ability_uses`                                     | 技能使用次数               | `spell1_casts`                                  | Q技能施放                 |
| `spell2_casts`                                     | W技能施放                  | `spell3_casts`                                  | E技能施放                 |
| `spell4_casts`                                     | R技能施放                  | `summoner1_casts`                               | 召唤师技能1施放           |
| `summoner2_casts`                                  | 召唤师技能2施放            | `deaths_by_enemy_champs`                        | 被敌方英雄击杀            |
| `survived_single_digit_hp_count`                   | 个位数生命存活             | `took_large_damage_survived`                    | 承受大量伤害存活          |
| `killed_champ_took_full_team_damage_survived`      | 击杀后承受全队伤害存活     | `save_ally_from_death`                          | 救队友于死亡              |
| `skillshots_dodged`                                | 躲避技巧技能               | `skillshots_hit`                                | 命中技巧技能              |
| `snowballs_hit`                                    | 命中雪球                   | `dodge_skill_shots_small_window`                | 短时间内躲避技巧技能      |
| `land_skill_shots_early_game`                      | 早期命中技巧技能           | `blast_cone_opposite_opponent_count`            | 爆炸果实击退敌人          |
| `quick_cleanse`                                    | 快速净化                   | `danced_with_rift_herald`                       | 与先锋共舞                |
| `fist_bump_participation`                          | 碰拳参与                   | `flawless_aces`                                 | 完美团灭                  |
| `double_aces`                                      | 双重团灭                   | `aces_before_15_minutes`                        | 十分钟前团灭敌方          |
| `full_team_takedown`                               | 全队参与击杀               | `assist_12_streak_count`                        | 12连助攻                  |
| `game_ended_in_early_surrender`                    | 重开投降                   | `game_ended_in_surrender`                       | 游戏以投降结束            |
| `team_early_surrendered`                           | 队伍提前投降               | `champ_level`                                   | 英雄等级                  |
| `champ_experience`                                 | 英雄经验                   | `time_played`                                   | 游玩时长                  |
| `total_time_spent_dead`                            | 死亡时长                   | `first_blood_kill`                              | 一血击杀                  |
| `first_blood_assist`                               | 一血助攻                   | `baron_kills`                                   | 大龙击杀                  |
| `dragon_kills`                                     | 小龙击杀                   | `kills_near_enemy_turret`                       | 敌方塔下击杀              |
| `kills_under_own_turret`                           | 己方塔下击杀               | `unseen_recalls`                                | 未被发现回城              |
| `effective_heal_and_shielding`                     | 有效治疗和护盾             | `bounty_gold`                                   | 赏金金币                  |
| `lane_minions_first_10_minutes`                    | 前十分钟线上补刀           | `twenty_minions_in_3_seconds_count`             | 三秒内二十补刀            |
| `legendary_count`                                  | 超神次数                   | `perfect_game`                                  | 完美游戏                  |
| `max_kill_deficit`                                 | 最大击杀劣势               | `max_level_lead_lane_opponent`                  | 对线对手最大等级领先      |
| `complete_support_quest_in_time`                   | 按时完成辅助任务           | `mejais_full_stack_in_time`                     | 按时满层杀人书            |
| `healing_from_level_objects`                       | 地图资源治疗               | `game_length`                                   | 游戏总时长                |
| `calc_cs_per_minute`                               | 分均补刀 (进阶计算)        | `calc_wards_placed_per_minute`                  | 分均插眼 (进阶计算)       |
| `calc_wards_killed_per_minute`                     | 分均排眼 (进阶计算)        | `calc_damage_to_champs_per_minute`              | 分均对英雄伤害 (进阶计算) |
| `calc_damage_taken_per_minute`                     | 分均承伤 (进阶计算)        | `calc_heal_per_minute`                          | 分均治疗 (进阶计算)       |
| `calc_cc_time_per_minute`                          | 分均控制时长 (进阶计算)    | `calc_objective_damage_per_minute`              | 分均对目标伤害 (进阶计算) |
| `calc_kda`                                         | 精确KDA (进阶计算)         |                                                 |                           |
