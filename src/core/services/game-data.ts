// src/core/services/game-data.ts

class GameDataService {
    public isReady = false;
    private version = '14.13.1';
    private items: Record<string, any> = {};
    private champions: Record<string, any> = {};
    private spells: Record<string, any> = {};

    // 【架构隔离】彻底分开常规天赋和强化符文
    private perks: Record<string, any> = {};      // 常规天赋 (致命节奏等)
    private augments: Record<string, any> = {};   // 强化符文 (回归基本功等)

    // 为 UI 预留的列表缓存，防止频繁遍历 Object
    private championList: any[] = [];
    private itemList: any[] = [];
    private augmentList: any[] = [];

    public async init() {
        if (this.isReady) return;

        try {
            console.debug('[Orianna GameData DEBUG] 正在向远端服务器请求字典数据...');
            const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
            const versions = await vRes.json();
            if (versions && versions.length > 0) {
                this.version = versions[0];
            }

            const fetchWithFallback = async (pathTpl: string, label: string) => {
                const urlZh = pathTpl.replace('{lang}', 'zh_cn');
                let res = await fetch(urlZh).catch(() => null);
                if (!res || !res.ok) {
                    const urlDefault = pathTpl.replace('{lang}', 'default');
                    console.warn(`[Orianna GameData DEBUG] ⚠️ ${label} 中文源拉取失败，尝试兜底源: ${urlDefault}`);
                    res = await fetch(urlDefault).catch(() => null);
                }
                return res;
            };

            const requests = [
                fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/zh_CN/item.json`).catch(() => null),
                fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/zh_CN/champion.json`).catch(() => null),
                fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/zh_CN/summoner.json`).catch(() => null),
                fetchWithFallback(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/{lang}/v1/perks.json`, '通用天赋(Perks)'),
                fetchWithFallback(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/{lang}/v1/cherry-augments.json`, '强化符文(Cherry)')
            ];

            const [itemRes, champRes, spellRes, perksRes, cherryRes] = await Promise.all(requests);

            // 1. 装备解析与列表生成
            if (itemRes && itemRes.ok) {
                const itemData = await itemRes.json();
                this.items = itemData.data || {};
                this.itemList = Object.keys(this.items).map(k => ({
                    id: Number(k),
                    name: this.items[k].name,
                    icon: `https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/items/${k}.png`
                }));
            }

            // 2. 英雄解析与列表生成
            if (champRes && champRes.ok) {
                const champData = await champRes.json();
                for (const key in champData.data) {
                    this.champions[champData.data[key].key] = champData.data[key];
                }
                this.championList = Object.values(this.champions).map((c: any) => ({
                    id: Number(c.key),
                    name: c.name,
                    icon: `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${c.key}.png`
                }));
            }

            // 3. 技能解析
            if (spellRes && spellRes.ok) {
                const spellData = await spellRes.json();
                for (const key in spellData.data) {
                    this.spells[spellData.data[key].key] = spellData.data[key];
                }
            }

            // 4. 常规天赋 (Perks) 解析，安全隔离
            if (perksRes && perksRes.ok) {
                const perksData = await perksRes.json();
                if (Array.isArray(perksData)) {
                    for (const perk of perksData) {
                        this.perks[String(perk.id)] = { name: perk.name, iconPath: perk.iconPath };
                    }
                }
            }

            // 5. 强化符文 (Cherry) 解析与列表生成
            if (cherryRes && cherryRes.ok) {
                const cherryData = await cherryRes.json();
                if (Array.isArray(cherryData)) {
                    for (const aug of cherryData) {
                        const sid = String(aug.id);
                        const realName = aug.nameTRA || aug.name || `未知符文${sid}`;
                        const realIcon = aug.augmentSmallIconPath || aug.iconPath;

                        let realTier = 0;
                        if (aug.rarity === 'kPrismatic') realTier = 3;
                        else if (aug.rarity === 'kGold') realTier = 2;
                        else if (aug.rarity === 'kSilver') realTier = 1;
                        else realTier = aug.tier || 0;

                        this.augments[sid] = { name: realName, iconPath: realIcon, tier: realTier };
                    }
                }

                this.augmentList = Object.keys(this.augments).map(id => ({
                    id: Number(id),
                    name: this.augments[id].name,
                    tier: this.augments[id].tier,
                    icon: this.getAugmentIcon(id)
                })).sort((a, b) => b.tier - a.tier); // 按稀有度降序排序列表

                console.debug(`[Orianna GameData DEBUG] ✅ 成功解析专属 Cherry 竞技场符文: ${this.augmentList.length} 个`);
            }

            this.isReady = true;
            console.log(`[GameData Service] 已成功加载本地化字典。`);
        } catch (error) {
            console.error('[GameData Service] 抓取流程发生致命异常:', error);
            this.isReady = true;
        }
    }

    public getItemName(id: string | number): string { return this.items[String(id)]?.name || `装备 ${id}`; }
    public getChampionName(id: string | number): string { return this.champions[String(id)]?.name || `英雄 ${id}`; }
    public getSpellName(id: string | number): string { return this.spells[String(id)]?.name || `技能 ${id}`; }

    public getAugmentName(id: string | number): string {
        const name = this.augments[String(id)]?.name;
        if (!name) console.warn(`[Orianna Translate DEBUG] 无法翻译的强化符文 ID: ${id}`);
        return name || `符文 ${id}`;
    }

    public getAugmentIcon(id: string | number): string | undefined {
        const path = this.augments[String(id)]?.iconPath;
        if (!path) return undefined;
        return path.toLowerCase().replace('/lol-game-data/assets/', 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/');
    }

    public getAugmentTier(id: string | number): number {
        return this.augments[String(id)]?.tier || 0;
    }

    // 暴露为下拉搜索框准备好的数组列表
    public getChampionList() { return this.championList; }
    public getItemList() { return this.itemList; }
    public getAugmentList() { return this.augmentList; }
}

export const gameDataService = new GameDataService();