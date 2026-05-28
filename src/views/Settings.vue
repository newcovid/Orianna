<!-- src/views/Settings.vue -->
<template>
    <div class="h-full flex flex-col max-w-4xl mx-auto w-full gap-6 pb-12 pt-4 relative">
        
        <!-- 全局轻量级 Toast 通知 -->
        <transition name="toast">
            <div v-if="toast.show" 
                 class="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all"
                 :class="toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-700 dark:bg-emerald-900/80 dark:border-emerald-800 dark:text-emerald-300' : 'bg-red-50/90 border-red-200 text-red-700 dark:bg-red-900/80 dark:border-red-800 dark:text-red-300'">
                <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5" />
                <XCircle v-else class="w-5 h-5" />
                <span class="font-bold text-sm tracking-wide">{{ toast.message }}</span>
            </div>
        </transition>

        <header class="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-gray-800">
            <SettingsIcon class="w-7 h-7 text-slate-900 dark:text-white" />
            <div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white">系统设置</h2>
                <p class="text-sm text-slate-500 mt-1">本地数据存储管理与引擎维护</p>
            </div>
        </header>

        <!-- 卡片 1：存储引擎状态 -->
        <div class="ui-card p-6 flex flex-col gap-4">
            <h3 class="font-bold flex items-center gap-2 text-lg text-slate-800 dark:text-gray-200">
                <Database class="w-5 h-5 text-indigo-500" /> 存储引擎健康度
            </h3>
            
            <div class="flex items-center justify-between bg-slate-50 dark:bg-black/20 p-5 rounded-xl border border-slate-100 dark:border-gray-800/60">
                <div>
                    <div class="text-sm text-slate-500 mb-1">当前本地 SQLite 数据库占用</div>
                    <div class="flex items-end gap-2">
                        <span class="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{{ formattedSize }}</span>
                    </div>
                </div>
                <button 
                    class="ui-btn ui-btn-primary h-11 px-6 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                    @click="handleCompress"
                    :disabled="userStore.isSyncing || isProcessing"
                >
                    <Minimize2 class="w-4 h-4" /> 
                    <span>{{ isProcessing ? '整理中...' : '压缩与碎片整理' }}</span>
                </button>
            </div>
            <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                Orianna 将所有获取过的多维度战绩指标持久化存储在您的本地物理设备中，保障零延迟检索。随着您同步的对局逐渐增多，数据库体积会无可避免地增长。定期执行碎片整理 (VACUUM) 能够重组数据结构，释放那些因对局被清空或覆盖而产生的无效占位空间。
            </p>
        </div>

        <!-- 卡片 2：数据迁移 -->
        <div class="ui-card p-6 flex flex-col gap-4">
            <h3 class="font-bold flex items-center gap-2 text-lg text-slate-800 dark:text-gray-200">
                <HardDrive class="w-5 h-5 text-emerald-500" /> 数据备份与迁移
            </h3>
            
            <div class="flex items-center gap-4 mt-2">
                <button 
                    class="ui-btn flex-1 py-3.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-black/20 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 group" 
                    @click="handleExport"
                    :disabled="userStore.isSyncing || isProcessing"
                >
                    <Download class="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" /> 
                    <span>安全导出为 JSON 备份</span>
                </button>
                <button 
                    class="ui-btn flex-1 py-3.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-black/20 disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 group" 
                    @click="triggerImport"
                    :disabled="userStore.isSyncing || isProcessing"
                >
                    <Upload class="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" /> 
                    <span>从本机载入 JSON 档案</span>
                </button>
                <!-- 隐式文件调起组件 -->
                <input type="file" accept=".json" class="hidden" ref="fileInput" @change="handleImport" />
            </div>
            <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                导出功能可将整张对局数据表无损转化为独立 JSON 文件，便于您在重装系统、切换设备时随身携带。载入时引擎会自动过滤并放弃完全一致的重复对局，保留增量信息。
            </p>
        </div>

        <!-- 卡片 3：危险操作 -->
        <div class="ui-card p-6 flex flex-col gap-4 border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-500/5 mt-4">
            <h3 class="font-bold flex items-center gap-2 text-lg text-red-600 dark:text-red-500">
                <AlertCircle class="w-5 h-5" /> 危险操作区
            </h3>
            
            <div class="flex items-center justify-between p-5 rounded-xl border border-red-200 dark:border-red-900/40 bg-white/50 dark:bg-black/20">
                <div>
                    <div class="font-bold text-red-700 dark:text-red-400">一键清空所有战绩记录</div>
                    <div class="text-xs text-red-500/80 dark:text-red-400/60 mt-1.5 leading-relaxed max-w-lg">
                        此操作将向引擎发送底层 DROP 信号，立刻擦除当前已存在的所有玩家战绩缓存。擦除后无法撤销恢复，需从客户端内重新执行同步获取。
                    </div>
                </div>
                <button 
                    class="ui-btn h-11 px-6 shadow-sm transition-all"
                    :class="[
                        isConfirmingClear 
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30' 
                        : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-900/50'
                    ]"
                    @click="handleClear"
                    :disabled="userStore.isSyncing || isProcessing"
                >
                    <Trash2 class="w-4 h-4" :class="{'animate-pulse': isConfirmingClear}" /> 
                    <span>{{ isConfirmingClear ? '再次点击以确认销毁' : '彻底清空本地表' }}</span>
                </button>
            </div>
        </div>

        <!-- 卡片 4：法律声明与安全预警 -->
        <div class="ui-card p-6 flex flex-col gap-4 border-amber-100 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-500/5 mt-2">
            <h3 class="font-bold flex items-center gap-2 text-lg text-amber-600 dark:text-amber-500">
                <ShieldAlert class="w-5 h-5" /> 法律声明与安全风险须知
            </h3>
            
            <div class="flex flex-col gap-3 text-xs leading-relaxed text-slate-500 dark:text-gray-400 p-4 rounded-xl bg-white/60 dark:bg-black/20 border border-amber-100/50 dark:border-amber-900/20">
                <p>
                    <strong class="text-slate-700 dark:text-gray-300">1. 第三方免责声明：</strong>
                    Orianna 是一款由玩家独立开发的本地数据分析与重组工具，<strong>并非由 Riot Games (拳头游戏) 或腾讯官方开发、认可、赞助或提供支持</strong>。本程序反映的任何战绩观点、算法模型或数据图表仅代表本地演算结果，与官方运营团队及官方游戏生态政策无关。
                </p>
                <p>
                    <strong class="text-slate-700 dark:text-gray-300">2. 账号安全与封禁风险：</strong>
                    本程序严格遵循“只读”原则，仅通过公开的 LCU 通信接口与 SGP API 进行合法的数据调取，<strong>绝不包含任何修改游戏内存、注入代码、获取游戏内优势或破坏游戏公平性的外挂行为</strong>。然而，根据官方服务条款，使用任何非官方授权的第三方辅助应用均存在引发系统误判或账号异常的潜在风险。您在使用本程序前须完全知晓该风险，<strong>开发者对任何因使用本软件造成的账号封禁、连带惩罚或数据丢失等后果不承担任何法律与连带责任</strong>。
                </p>
                <p>
                    <strong class="text-slate-700 dark:text-gray-300">3. 数据隐私与 24 小时销毁建议：</strong>
                    Orianna 是一款无服务器参与的完全本地化应用程序。您的所有对局隐私、好友列表及能力画像均仅存储于您本机的本地硬盘中，不包含任何向外部服务器的云端遥测或上传行为。基于严谨的数据安全与隐私保护要求，<strong>若您在此设备上观测或拉取了非您本人的他人数据源，请务必在使用完毕后的 24 小时内，通过上方“危险操作区”清空所有数据缓存</strong>，严禁将他人隐私用作商业途径或恶意散播。
                </p>
            </div>
        </div>
        
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../store/user';
import {
    Settings as SettingsIcon,
    Database,
    HardDrive,
    Minimize2,
    Download,
    Upload,
    AlertCircle,
    Trash2,
    CheckCircle2,
    XCircle,
    ShieldAlert
} from 'lucide-vue-next';

const userStore = useUserStore();
const fileInput = ref<HTMLInputElement | null>(null);

const dbSizeBytes = ref<number>(0);
const formattedSize = ref('计算中...');
const isProcessing = ref(false);

const isConfirmingClear = ref(false);
let clearTimer: any = null;

// --- Toast 通知系统 ---
const toast = reactive({
    show: false,
    message: '',
    type: 'success' as 'success' | 'error'
});
let toastTimer: any = null;

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toast.message = message;
    toast.type = type;
    toast.show = true;
    
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.show = false;
    }, 3000);
};

// --- 容量计算逻辑 ---
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const refreshDbSize = async () => {
    dbSizeBytes.value = await userStore.getDatabaseSize();
    formattedSize.value = formatBytes(dbSizeBytes.value);
};

onMounted(() => {
    refreshDbSize();
});

onUnmounted(() => {
    if (clearTimer) clearTimeout(clearTimer);
    if (toastTimer) clearTimeout(toastTimer);
});

// --- 数据库操作逻辑 ---
const handleCompress = async () => {
    isProcessing.value = true;
    await userStore.compressDatabase();
    await refreshDbSize();
    isProcessing.value = false;
    showToast('碎片整理完成，存储已优化');
};

const handleClear = async () => {
    if (!isConfirmingClear.value) {
        isConfirmingClear.value = true;
        clearTimer = setTimeout(() => { isConfirmingClear.value = false; }, 4000);
        return;
    }
    
    if (clearTimer) clearTimeout(clearTimer);
    isConfirmingClear.value = false;
    isProcessing.value = true;
    
    await userStore.clearDatabase();
    await refreshDbSize();
    isProcessing.value = false;
    showToast('本地数据库已彻底清空');
};

const handleExport = async () => {
    if (isProcessing.value) return;

    try {
        const date = new Date();
        const dateString = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours()}${date.getMinutes()}`;
        const defaultFilename = `orianna_backup_${dateString}.json`;

        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await (window as any).showSaveFilePicker({
                    suggestedName: defaultFilename,
                    types: [{
                        description: 'Orianna JSON 数据备份',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                
                isProcessing.value = true;
                showToast('正在打包并写入数据，请稍等...', 'success');
                const jsonString = await userStore.exportDatabase();
                
                const writable = await fileHandle.createWritable();
                await writable.write(jsonString);
                await writable.close();

                showToast('已成功保存至目标路径');
            } catch (err: any) {
                if (err.name !== 'AbortError') throw err;
            }
        } else {
            isProcessing.value = true;
            const jsonString = await userStore.exportDatabase();
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFilename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('已成功导出');
        }
    } catch (err) {
        console.error('[Orianna DB] 导出过程发生异常:', err);
        showToast('导出失败，请检查文件权限', 'error');
    } finally {
        isProcessing.value = false;
    }
};

const triggerImport = () => {
    if (fileInput.value) fileInput.value.click();
};

const handleImport = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    
    const file = target.files[0];
    const reader = new FileReader();
    
    isProcessing.value = true;
    showToast('正在合并载入记录，这可能需要一点时间...');
    
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            const parsedData = JSON.parse(content);
            
            if (!Array.isArray(parsedData)) throw new Error('非预期的数据备份格式。');
            
            const importedCount = await userStore.importDatabase(parsedData);
            await refreshDbSize();
            showToast(`成功恢复并合入 ${importedCount} 条历史记录`);
            
        } catch (err) {
            console.error('[Orianna] JSON 文件解析或导入失败:', err);
            showToast('档案格式损坏或不匹配，导入被拒绝', 'error');
        } finally {
            if (fileInput.value) fileInput.value.value = ''; 
            isProcessing.value = false;
        }
    };
    reader.readAsText(file);
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>