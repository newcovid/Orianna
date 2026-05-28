// src/main.ts
import { createApp } from "vue";
import { createPinia } from 'pinia';
import router from './router';
import "./style.css";
import App from "./App.vue";

// ==========================================
// 原生桌面化体验改造 (Native Desktop Experience)
// ==========================================
document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;

    // 智能放行：允许在输入框内右键，保留复制/粘贴/全选等系统原生文本操作
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
    }

    // 阻止浏览器默认的网页右键菜单
    // 提示: 这里使用了 Vite 的环境变量。在开发环境(npm run dev)下允许右键以方便你审查元素调试
    // 在打包成 exe 的生产环境(npm run build)下则强制屏蔽右键菜单
    if (import.meta.env.PROD) {
        e.preventDefault();
    }
});

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");