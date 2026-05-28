<!-- src/App.vue -->
<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from './store/user';
import { usePluginStore } from './store/plugins';
import { dbService } from './core/db/schema';
import { gameflowService } from './core/services/gameflow';

const userStore = useUserStore();
const pluginStore = usePluginStore();

onMounted(async () => {
  // 0. 自动扫描并加载本地创意工坊 JSON 插件
  pluginStore.loadLocalPlugins();
  
  // 1. 初始化本地数据库
  await dbService.init();
  
  // 2. 尝试连接游戏客户端
  await userStore.initConnection();
  
  // 3. 启动游戏状态监听，实现自动同步
  gameflowService.startListening();
});
</script>