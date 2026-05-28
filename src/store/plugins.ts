// src/store/plugins.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PluginConfig } from '../core/plugins/types';

export type ExtendedPluginConfig = PluginConfig & { isCustom?: boolean };

export const usePluginStore = defineStore('plugins', () => {
    const allPlugins = ref<ExtendedPluginConfig[]>([]);
    const activePluginIds = ref<string[]>([]);

    const loadLocalPlugins = () => {
        try {
            // 1. 加载本地自带官方图表
            const rawPlugins = import.meta.glob('../assets/plugins/*.json', { eager: true });
            const loaded = Object.values(rawPlugins).map((mod: any) => mod.default || mod) as ExtendedPluginConfig[];

            loaded.forEach(lp => lp.isCustom = false);

            // 2. 加载用户自定义且持久化保存的外部图表
            const savedCustom = localStorage.getItem('orianna_custom_plugins');
            if (savedCustom) {
                const customParsed = JSON.parse(savedCustom) as ExtendedPluginConfig[];
                customParsed.forEach(cp => {
                    cp.isCustom = true;
                    loaded.push(cp);
                });
            }

            // 3. 去重合并
            const uniquePlugins = [...allPlugins.value];
            loaded.forEach(lp => {
                const existingIndex = uniquePlugins.findIndex(p => p.manifest.id === lp.manifest.id);
                if (existingIndex > -1) {
                    uniquePlugins[existingIndex] = lp;
                } else {
                    uniquePlugins.push(lp);
                }
            });
            allPlugins.value = uniquePlugins;

            // 4. 加载用户勾选的启用状态
            const savedActive = localStorage.getItem('orianna_active_plugins');
            if (savedActive) {
                const parsed = JSON.parse(savedActive);
                activePluginIds.value = parsed.length > 0 ? parsed : allPlugins.value.map(p => p.manifest.id);
            } else {
                activePluginIds.value = allPlugins.value.map(p => p.manifest.id);
            }
        } catch (error) {
            console.error("加载本地插件失败:", error);
        }
    };

    const importExternalPlugin = async (fileContent: string) => {
        try {
            const plugin: ExtendedPluginConfig = JSON.parse(fileContent);
            if (!plugin.manifest?.id || !plugin.dataQuery || !plugin.visualization) {
                throw new Error("JSON 格式不合法，缺少核心节点");
            }
            return await saveEditedPlugin(plugin, true);
        } catch (err) {
            console.error("解析外部 JSON 失败", err);
            return false;
        }
    };

    // 新增：保存通过可视化编辑器修改或克隆的插件
    const saveEditedPlugin = async (plugin: ExtendedPluginConfig, autoEnable: boolean = false) => {
        plugin.isCustom = true; // 经过编辑器保存的一律视为自定义图表

        const existingIndex = allPlugins.value.findIndex(p => p.manifest.id === plugin.manifest.id);
        if (existingIndex > -1) {
            allPlugins.value[existingIndex] = plugin; // 更新
        } else {
            allPlugins.value.push(plugin); // 新增
        }

        saveCustomPlugins();

        if (autoEnable && !activePluginIds.value.includes(plugin.manifest.id)) {
            activePluginIds.value.push(plugin.manifest.id);
            localStorage.setItem('orianna_active_plugins', JSON.stringify(activePluginIds.value));
            const { useUserStore } = await import('./user');
            useUserStore().smartSync();
        }
        return true;
    };

    const togglePlugin = async (id: string) => {
        const index = activePluginIds.value.indexOf(id);
        if (index > -1) {
            activePluginIds.value.splice(index, 1);
        } else {
            activePluginIds.value.push(id);
            const { useUserStore } = await import('./user');
            useUserStore().smartSync();
        }
        localStorage.setItem('orianna_active_plugins', JSON.stringify(activePluginIds.value));
    };

    const deleteCustomPlugin = (id: string) => {
        allPlugins.value = allPlugins.value.filter(p => p.manifest.id !== id);
        const index = activePluginIds.value.indexOf(id);
        if (index > -1) {
            activePluginIds.value.splice(index, 1);
            localStorage.setItem('orianna_active_plugins', JSON.stringify(activePluginIds.value));
        }
        saveCustomPlugins();
    };

    const saveCustomPlugins = () => {
        const customPlugins = allPlugins.value.filter(p => p.isCustom);
        localStorage.setItem('orianna_custom_plugins', JSON.stringify(customPlugins));
    };

    const activePlugins = computed(() => {
        return allPlugins.value.filter(p => activePluginIds.value.includes(p.manifest.id));
    });

    return {
        allPlugins,
        activePluginIds,
        activePlugins,
        loadLocalPlugins,
        importExternalPlugin,
        saveEditedPlugin,
        togglePlugin,
        deleteCustomPlugin
    };
});