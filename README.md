# Orianna

英雄联盟对局数据分析桌面客户端。基于 Tauri v2 构建，Rust 后端负责 LCU 进程探测与 HTTP 代理，TypeScript 前端承载全部业务逻辑。

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Tauri v2 |
| 前端 | Vue 3 + TypeScript + Vite |
| UI | Tailwind CSS v4 |
| 图表 | ECharts (vue-echarts) |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 后端 | Rust (reqwest, sysinfo, serde) |
| 数据库 | SQLite (tauri-plugin-sql) |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (最新稳定版)
- [Tauri 环境依赖](https://v2.tauri.app/start/prerequisites/)

### 开发

```bash
npm install
npm run tauri dev       # 完整桌面应用（前端 + Tauri 后端，热重载）
npm run dev             # 仅前端（Vite 开发服务器，功能受限）
```

### 构建

```bash
npm run build           # 类型检查 + 生产构建
npm run tauri build     # 打包为可分发的 .exe
```

## 使用方法

### 基本流程

1. 启动英雄联盟客户端（League Client）
2. 运行 Orianna，应用会自动检测 LCU 连接状态
3. 首次使用时点击同步按钮拉取历史对局数据
4. 在 **仪表盘** 页面查看自动生成的图表分析
5. 在 **对局历史** 页面浏览每局详细数据
6. 在 **对比** 页面添加多名玩家进行横向对比

### 创意工坊：自定义图表插件

Orianna 的核心特色是**插件驱动的图表系统**。你可以通过 JSON 配置文件定义任意的数据查询和可视化方案，无需编写代码。

#### 推荐方式：让 AI 帮你写插件

编写 JSON 配置最简单的方式是借助 AI。项目内置了一份详细的 **插件开发白皮书**（`docs/plugin_whitepaper.md`），包含了完整的字段说明、配置规则和示例。

**操作步骤：**

1. 打开你常用的 AI 对话工具（豆包、DeepSeek、ChatGPT、Kimi 等）
2. 上传 `docs/plugin_whitepaper.md` 文件
3. 用自然语言描述你想要的图表，例如：
   - "帮我做一个最近 30 场排位赛的 KDA 趋势折线图"
   - "统计我大乱斗中最常用的 10 个强化符文，做成排行榜"
   - "对比我不同分路的视野得分，用雷达图展示"
   - "分析我最近 50 场的插眼数和视野分关系，用散点图"
4. AI 会根据白皮书生成符合规范的 JSON 配置
5. 将生成的 JSON 保存为 `.json` 文件
6. 在 Orianna 的 **插件** 页面点击"导入"，选择该文件即可

> **提示：** 白皮书中包含了 206 个可查询的数据字段、7 种图表类型、多种过滤条件，AI 可以组合出几乎无限种分析方案。

#### 手动编写插件

如果你熟悉 JSON 语法，也可以手动编写。插件配置由四个顶级节点组成：

```json
{
  "manifest": {
    "id": "my_plugin",
    "name": "我的插件",
    "version": "1.0.0"
  },
  "layout": {
    "grid": "col-span-1",
    "mount": ["dashboard"]
  },
  "dataQuery": {
    "entity": "match_games",
    "filters": { "limit": 20 },
    "metrics": [
      { "field": "kills", "aggregate": "avg", "alias": "avg_kills" }
    ]
  },
  "visualization": {
    "type": "stat-card",
    "series": [
      { "field": "avg_kills", "name": "平均击杀", "color": "#ef4444" }
    ]
  }
}
```

完整字段说明和更多示例请参阅 [`docs/plugin_whitepaper.md`](docs/plugin_whitepaper.md)。

#### 图表类型一览

| 类型 | 说明 | 适用场景 |
|---|---|---|
| `line` | 折线图 | 趋势变化（KDA、伤害随场次的变化） |
| `bar` | 柱状图 | 数值对比（不同英雄的表现） |
| `radar` | 雷达图 | 多维能力评估（输出、视野、承伤等） |
| `scatter` | 散点图 | 双变量关系（补刀 vs 经济） |
| `pie` | 饼图 | 占比分布（分路出场率） |
| `stat-card` | 数值卡片 | 关键指标展示（平均 KDA、胜率） |
| `list` | 排行榜 | TOP N 排名（最常用英雄、装备） |

#### 在创意工坊中管理插件

- **插件页面**（`/plugins`）：查看、启用/禁用、导入/导出插件
- **插件编辑器**（`/plugins/editor`）：可视化 JSON 编辑器，实时预览
- 插件支持挂载到两个页面场景：
  - `dashboard`：个人数据总览（单人数据源）
  - `compare`：多人横向对比

## 项目结构

```
Orianna/
├── src/
│   ├── assets/            # 静态资源（英雄数据、服务器列表、内置插件）
│   ├── components/        # 可复用 Vue 组件
│   ├── constants/         # 游戏字典、指标定义
│   ├── core/
│   │   ├── api/           # LCU / Riot Client / SGP API 封装
│   │   ├── db/            # SQLite schema 与迁移
│   │   ├── plugins/       # 插件引擎与类型定义
│   │   └── services/      # 同步、分析、游戏数据、游戏流程
│   ├── layout/            # 布局组件
│   ├── router/            # Vue Router 配置
│   ├── store/             # Pinia 状态管理（user, plugins）
│   └── views/             # 页面组件
├── src-tauri/
│   ├── icons/             # 应用图标
│   ├── src/               # Rust 后端（lib.rs, lcu.rs, main.rs）
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   └── plugin_whitepaper.md  # 插件开发白皮书（可上传给 AI 生成插件）
├── package.json
└── vite.config.ts
```

## 开发者说明

### 架构概览

**Rust 层**（`src-tauri/src/`）暴露三个 Tauri 命令：

- `get_lcu_auth` — 扫描 `LeagueClientUx` 进程，从启动参数提取 auth 端口/token/区域
- `lcu_request` / `rc_request` — 本地 HTTPS 代理，连接 LCU 和 Riot Client（自签证书）
- `proxy_request` — 通用 HTTP 代理，用于调用 Riot SGP 端点，绕过 CORS

**数据层**：单 SQLite 数据库，`match_games` 表约 215 列（206 个原始统计 + 9 个预计算指标）。Schema 迁移仅通过 `ALTER TABLE ... ADD COLUMN` 追加。

**同步服务**（`src/core/services/sync.ts`）：从 SGP 分页拉取历史对局并插入数据库，遇到 401 自动刷新 token 并重试。

**插件引擎**（`src/core/plugins/engine.ts`）：将声明式 JSON 配置编译为参数化 SQL 查询，使用字段白名单防止 SQL 注入，输出 ECharts 配置对象。

## 协议

MIT
