// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layout/MainLayout.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: MainLayout,
            children: [
                {
                    path: '',
                    name: 'Dashboard',
                    component: () => import('../views/Dashboard.vue'),
                    meta: { title: '数据总览' }
                },
                {
                    path: 'history',
                    name: 'MatchHistory',
                    component: () => import('../views/MatchHistory.vue'),
                    meta: { title: '生涯战绩' }
                },
                {
                    path: 'compare',
                    name: 'Compare',
                    component: () => import('../views/Compare.vue'),
                    meta: { title: '数据对比' }
                },
                {
                    path: 'plugins',
                    name: 'Plugins',
                    component: () => import('../views/Plugins.vue'),
                    meta: { title: '创意工坊' }
                },
                {
                    // 新增：图表编辑器独立页面。使用 :id? 表示 id 是可选参数(新建时无id，编辑时有id)
                    path: 'plugins/editor/:id?',
                    name: 'PluginEditor',
                    component: () => import('../views/PluginEditor.vue'),
                    meta: { title: '图表可视化引擎' }
                },
                {
                    path: 'settings',
                    name: 'Settings',
                    component: () => import('../views/Settings.vue'),
                    meta: { title: '系统设置' }
                }
            ]
        }
    ]
});

export default router;