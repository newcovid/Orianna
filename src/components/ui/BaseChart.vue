<!-- src/components/ui/BaseChart.vue -->
<template>
  <div class="absolute inset-0">
    <div ref="chartRef" class="w-full h-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, markRaw } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{
  option: any; 
  loading?: boolean;
}>();

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;
let observer: MutationObserver | null = null;

// 动态追踪系统深浅主题状态
const isDark = ref(false);

const processSafeOption = (rawOption: any) => {
  if (!rawOption) return rawOption;
  
  const opt = JSON.parse(JSON.stringify(rawOption));

  // [护眼优化]：动态分配图表坐标轴和文字的柔和颜色
  const textColor = isDark.value ? '#9ca3af' : '#64748b'; // Tailwind gray-400 : slate-500
  const gridLineColor = isDark.value ? '#2d3748' : '#f1f5f9'; // Tailwind gray-800 : slate-100

  if (opt.tooltip) {
    opt.tooltip = { 
        ...opt.tooltip, 
        appendToBody: true, 
        transitionDuration: 0.2,
        backgroundColor: isDark.value ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark.value ? '#333' : '#e2e8f0',
        textStyle: { color: isDark.value ? '#eee' : '#334155' }
    };
  }

  const isCartesian = opt.xAxis || opt.yAxis || (opt.series && Array.isArray(opt.series) && opt.series.some((s: any) => ['line', 'bar', 'scatter'].includes(s.type)));

  if (isCartesian) {
    opt.grid = { top: 40, bottom: 24, left: 16, right: 16, containLabel: true, ...opt.grid };

    // 智能柔化坐标轴
    const applyAxisStyle = (axisObj: any) => {
        if (!axisObj) return;
        const axes = Array.isArray(axisObj) ? axisObj : [axisObj];
        axes.forEach(a => {
            if (!a.axisLabel) a.axisLabel = {};
            a.axisLabel.color = textColor;
            
            if (!a.splitLine) a.splitLine = { lineStyle: {} };
            if (!a.splitLine.lineStyle) a.splitLine.lineStyle = {};
            a.splitLine.lineStyle.color = gridLineColor;
        });
    };
    if (opt.xAxis) applyAxisStyle(opt.xAxis);
    if (opt.yAxis) applyAxisStyle(opt.yAxis);
  } else if (opt.grid) {
    opt.grid = { ...opt.grid, containLabel: true };
  }

  if (opt.radar) {
    opt.radar = { radius: '65%', center: ['50%', '55%'], ...opt.radar };
    // 柔化雷达图边框和文字
    if (!opt.radar.axisName) opt.radar.axisName = {};
    opt.radar.axisName.color = textColor;
    if (!opt.radar.splitLine) opt.radar.splitLine = { lineStyle: {} };
    if (!opt.radar.splitAxis) opt.radar.splitAxis = { lineStyle: {} };
    opt.radar.splitLine.lineStyle.color = gridLineColor;
    opt.radar.splitAxis.lineStyle.color = gridLineColor;
  }

  if (opt.series) {
    const seriesArr = Array.isArray(opt.series) ? opt.series : [opt.series];
    opt.series = seriesArr.map((s: any) => {
      const newS = { ...s };
      if (newS.type === 'scatter' || newS.type === 'line') newS.clip = false; 
      if (newS.type === 'pie' && !newS.radius) {
        newS.radius = ['40%', '70%']; 
        newS.center = ['50%', '55%'];
      }
      return newS;
    });
  }

  return opt;
};

const initChart = () => {
  if (!chartRef.value) return;
  // ECharts 实例不直接绑定 theme，靠配置项注入颜色，这样能平滑过渡
  chartInstance = markRaw(echarts.init(chartRef.value));
  chartInstance.setOption(processSafeOption(props.option));
};

const handleResize = () => {
  chartInstance?.resize();
};

watch(() => props.option, (newOption) => {
  if (newOption && chartInstance) {
    chartInstance.setOption(processSafeOption(newOption));
  }
}, { deep: true });

// 监听主题变化，强制 ECharts 重绘为对应的护眼色
watch(isDark, () => {
    if (chartInstance && props.option) {
        chartInstance.setOption(processSafeOption(props.option), true);
    }
});

watch(() => props.loading, (isLoading) => {
  if (isLoading) {
    chartInstance?.showLoading({ color: '#10b981', maskColor: isDark.value ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)' });
  } else {
    chartInstance?.hideLoading();
  }
});

onMounted(() => {
  // 初始化系统当前深浅状态
  isDark.value = document.documentElement.classList.contains('dark');
  
  // 建立 DOM 监听器：捕获用户点击顶部月亮/太阳按钮导致 class 变化的事件
  observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  initChart();
  window.addEventListener('resize', handleResize);
  
  const resizeObserver = new ResizeObserver(() => handleResize());
  if (chartRef.value) resizeObserver.observe(chartRef.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>