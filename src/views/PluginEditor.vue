<!-- src/views/PluginEditor.vue -->
<template>
  <div class="h-full flex flex-col relative bg-white dark:bg-[#141414] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden" @click="activeDropdown = null">
    
    <!-- 全局 Toast 消息提示 -->
    <transition name="toast-fade">
      <div v-if="toast.show" 
           class="fixed top-6 left-1/2 z-100 px-5 py-3 rounded-full shadow-xl shadow-black/10 backdrop-blur-md flex items-center gap-2 text-sm font-bold border"
           style="transform: translateX(-50%);"
           :class="toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-red-500/90 text-white border-red-400'">
        <CheckCircle2 v-if="toast.type === 'success'" class="w-4 h-4" />
        <AlertCircle v-else class="w-4 h-4" />
        {{ toast.message }}
      </div>
    </transition>

    <!-- 顶部状态栏 -->
    <header class="shrink-0 h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md z-10">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="p-2 rounded-xl text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
        <div class="flex items-center gap-2">
          <PencilRuler class="w-5 h-5 text-indigo-500" />
          <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">
            {{ isEditing ? '编辑图表参数' : '创建新图表' }}
          </h2>
          <span v-if="cloneWarning" class="ml-2 px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
            <AlertCircle class="w-3 h-3" />
            已自动创建可编辑副本
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button @click="exportJson" class="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 dark:bg-[#1f1f1f] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 transition-all flex items-center gap-2">
          <Download class="w-4 h-4" />
          导出为 JSON 文件
        </button>
        <button @click="savePlugin" class="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2">
          <Save class="w-4 h-4" />
          保存到我的工坊
        </button>
      </div>
    </header>

    <!-- 主体内容：左侧步骤导航 + 右侧卡片流 -->
    <div class="flex-1 flex overflow-hidden bg-gray-50/50 dark:bg-[#111111]">
      
      <!-- 左侧锚点导航 -->
      <aside class="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#141414]/50 p-6 flex flex-col gap-2 overflow-y-auto ui-scrollbar">
        <div class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-2">图表配置向导</div>
        <button v-for="(section, idx) in sections" :key="idx" 
          @click="scrollToSection(idx)"
          class="flex flex-col items-start px-4 py-3.5 rounded-xl transition-all text-left outline-none relative overflow-hidden"
          :class="currentSection === idx ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : 'hover:bg-gray-100 dark:hover:bg-white/5 border-transparent'"
          style="border-width: 1px;"
        >
          <div v-if="currentSection === idx" class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>
          <span class="text-[10px] font-extrabold tracking-widest mb-1" :class="currentSection === idx ? 'text-indigo-400' : 'text-gray-400 opacity-50'">步骤 {{ idx + 1 }}</span>
          <span class="text-sm font-bold" :class="currentSection === idx ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-400'">{{ section.title }}</span>
          <span class="text-xs mt-1" :class="currentSection === idx ? 'text-indigo-500/80 dark:text-indigo-400/80' : 'text-gray-400'">{{ section.subtitle }}</span>
        </button>
      </aside>

      <!-- 右侧表单滚动区 -->
      <main ref="scrollContainer" class="flex-1 overflow-y-auto ui-scrollbar p-8 scroll-smooth relative" @scroll="handleScroll">
        <div class="max-w-4xl mx-auto space-y-8 pb-32" v-if="form">
          
          <!-- 步骤一：基础信息 -->
          <section :ref="(el) => sectionRefs[0] = el as any" class="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 space-y-8 transition-all hover:shadow-md">
            <div class="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 class="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                  <FileBadge class="w-5 h-5"/>
                </div>
                步骤一：基础身份信息
              </h3>
            </div>

            <div class="grid grid-cols-2 gap-8">
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">唯一标识符 <span class="text-red-500">*</span></label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：作为引擎识别图表和存储配置文件的唯一键名。<br>
                  规则：必须全小写字母与下划线，不可重复。
                </div>
                <input v-model="form.manifest.id" type="text" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm" placeholder="例如: kda_radar_chart" />
              </div>
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">图表展示标题 <span class="text-red-500">*</span></label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：实际渲染在界面上的图表顶部大标题。<br>
                  规则：简明扼要说明作用，如“多维能力雷达图”。
                </div>
                <input v-model="form.manifest.name" type="text" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm" placeholder="例如: 灵活排位综合能力" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">详情描述</label>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2 leading-relaxed">
                作用：描述该图表具体作用和统计维度的文字说明，将在创意工坊中向其他用户展示。
              </div>
              <textarea v-model="form.manifest.description" rows="2" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm resize-none" placeholder="描述该图表的统计维度和作用..."></textarea>
            </div>

            <div class="grid grid-cols-2 gap-8">
               <div class="flex flex-col justify-end">
                 <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">版本号与创作者</label>
                 <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                   作用：声明图表版本与创作者归属。
                 </div>
                 <div class="flex gap-2">
                   <input v-model="form.manifest.version" type="text" class="w-24 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm" placeholder="1.0.0" />
                   <input v-model="form.manifest.author" type="text" class="flex-1 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm" placeholder="填写创作者昵称 (选填)" />
                 </div>
               </div>
               
               <div class="flex flex-col justify-end">
                 <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">图表标签</label>
                 <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                   作用：用于分类和检索。输入文本后按 <strong class="text-indigo-500">回车键</strong> 添加。
                 </div>
                 <div class="w-full min-h-11 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 flex flex-wrap gap-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
                    <span v-for="(tag, tIdx) in form.manifest.tags" :key="tIdx" class="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
                      {{ tag }}
                      <X class="w-3.5 h-3.5 hover:text-red-500 cursor-pointer" @click="form.manifest.tags.splice(tIdx, 1)" />
                    </span>
                    <input v-model="tagInput" @keydown.enter.prevent="addTag" type="text" class="flex-1 min-w-30 bg-transparent outline-none px-2 py-1 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400" placeholder="输入并回车..." />
                 </div>
               </div>
            </div>
          </section>

          <!-- 步骤二：界面布局 -->
          <section :ref="(el) => sectionRefs[1] = el as any" class="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 space-y-8 transition-all hover:shadow-md">
            <div class="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 class="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                  <LayoutTemplate class="w-5 h-5"/>
                </div>
                步骤二：前端界面布局
              </h3>
            </div>

            <div class="grid grid-cols-2 gap-8">
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">网格跨度控制宽度 <span class="text-red-500">*</span></label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：控制图表在看板中的横向长短。<br>
                  提示：占据 1 列适合雷达图、饼图、数值卡片；占据 2 列适合中型折线图、散点图；占据 4 列适合长趋势折线图。
                </div>
                <select v-model="form.layout.grid" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                  <option value="col-span-1">占据 1 列 (紧凑型)</option>
                  <option value="col-span-2">占据 2 列 (中型尺寸)</option>
                  <option value="col-span-3">占据 3 列 (宽屏尺寸)</option>
                  <option value="col-span-4">占据 4 列 (占满整行)</option>
                </select>
              </div>
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">允许挂载的页面场景 <span class="text-red-500">*</span></label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                  作用：决定图表展示在个人总览（单人数据）还是多人对比（多玩家横向对比）中。
                </div>
                <div class="flex gap-6 pb-2.5">
                  <label class="flex items-center gap-2.5 cursor-pointer group">
                    <div class="relative flex items-center justify-center">
                      <input type="checkbox" v-model="form.layout.mount" value="dashboard" class="peer sr-only">
                      <div class="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1f1f1f] peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors"></div>
                      <Check class="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100" />
                    </div>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">单人战绩看板</span>
                  </label>
                  <label class="flex items-center gap-2.5 cursor-pointer group">
                    <div class="relative flex items-center justify-center">
                      <input type="checkbox" v-model="form.layout.mount" value="compare" class="peer sr-only">
                      <div class="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1f1f1f] peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors"></div>
                      <Check class="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100" />
                    </div>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">多玩家对比中心</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <!-- 步骤三：数据筛选 -->
          <section :ref="(el) => sectionRefs[2] = el as any" class="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 space-y-8 transition-all hover:shadow-md">
            <div class="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 class="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                  <Filter class="w-5 h-5"/>
                </div>
                步骤三：数据提取范围
              </h3>
            </div>
            
            <div class="space-y-3">
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">底层数据实体基准 <span class="text-red-500">*</span></label>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                作用：决定数据统计的维度是“整局对局”、“独立的装备”还是“强化符文”。<br>
                <strong class="text-amber-600">注意：切换实体基准会自动清除下方不兼容的特殊过滤器。</strong>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div @click="form.dataQuery.entity = 'match_games'" class="cursor-pointer p-5 rounded-2xl border-2 transition-all" :class="form.dataQuery.entity === 'match_games' ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-800'">
                  <div class="font-black text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Check class="w-4 h-4 text-indigo-500" v-if="form.dataQuery.entity === 'match_games'" />
                    <span v-else class="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 inline-block"></span>
                    整局游戏维度
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed ml-6">绝大多数图表必须选此项。可获取击杀、伤害、视野等全局属性。</div>
                </div>
                <div @click="form.dataQuery.entity = 'match_items'" class="cursor-pointer p-5 rounded-2xl border-2 transition-all" :class="form.dataQuery.entity === 'match_items' ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-800'">
                  <div class="font-black text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Check class="w-4 h-4 text-indigo-500" v-if="form.dataQuery.entity === 'match_items'" />
                    <span v-else class="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 inline-block"></span>
                    独立装备维度
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed ml-6">引擎会自动将玩家每局购买的 7 件装备拆分为独立记录，专用于制作装备相关的统计图表。</div>
                </div>
                <div @click="form.dataQuery.entity = 'match_augments'" class="cursor-pointer p-5 rounded-2xl border-2 transition-all" :class="form.dataQuery.entity === 'match_augments' ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-800'">
                  <div class="font-black text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Check class="w-4 h-4 text-indigo-500" v-if="form.dataQuery.entity === 'match_augments'" />
                    <span v-else class="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 inline-block"></span>
                    独立强化符文维度
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed ml-6">引擎会自动将玩家获取的最多 6 个强化符文解包提取，专用于制作大乱斗/竞技场的符文胜率等图表。</div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8 pt-4">
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">追溯历史场次最大限制</label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：向过去追溯的对局样本量。<br>
                  提示：留空代表统计所有历史，强烈建议填写该项（如填入 20 或 50）以保证计算性能。
                </div>
                <input v-model.number="form.dataQuery.filters.limit" type="number" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="例如: 20" />
              </div>
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">结果强制约束</label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：比赛胜负过滤，强制要求只捞取获胜的局或失败的局的数据。
                </div>
                <select v-model="form.dataQuery.filters.matchResult" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                  <option value="all">不限制（分析所有对局）</option>
                  <option value="win">仅分析胜利的对局</option>
                  <option value="loss">仅分析失败的对局</option>
                </select>
              </div>
            </div>

            <!-- 多选过滤组 -->
            <div class="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">多维度数据源过滤条件组</label>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                作用：精细框定统计范围。例如制作“排位表现图”，就只限制“单双排”和“灵活排位”。<br>
                **重要规则：如果某项不添加任何条件标签，则引擎视为“不限制该条件”（默认全包）。**
              </div>
              
              <!-- 游戏模式筛选 -->
              <div class="relative" @click.stop>
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-1.5 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                  <label class="block text-xs font-bold text-gray-600 dark:text-gray-300">约束游戏模式</label>
                </div>
                <div @click="toggleDropdown('queue')" class="w-full min-h-11 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer flex flex-wrap gap-2 items-center shadow-sm">
                  <span v-for="q in getArrayVal(form.dataQuery.filters.queueId)" :key="q" class="bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-500/30">
                    {{ dictionaries.queues[q] || '未知模式' }}
                    <X class="w-3.5 h-3.5 hover:text-red-500 cursor-pointer transition-colors" @click.stop="toggleArrayItem('queueId', q)" />
                  </span>
                  <span v-if="!getArrayVal(form.dataQuery.filters.queueId).length" class="text-gray-400 text-sm pl-1">未添加限制条件，代表通吃所有模式...</span>
                </div>
                <div v-if="activeDropdown === 'queue'" class="absolute z-50 w-full mt-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-2 ui-scrollbar">
                  <div v-for="(name, id) in dictionaries.queues" :key="id" @click="toggleArrayItem('queueId', Number(id))" class="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-colors">
                    <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors" :class="getArrayVal(form.dataQuery.filters.queueId).includes(Number(id)) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f]'">
                      <Check class="w-3.5 h-3.5" v-if="getArrayVal(form.dataQuery.filters.queueId).includes(Number(id))" />
                    </div>
                    <span class="text-gray-700 dark:text-gray-200 font-medium">{{ name }}</span>
                  </div>
                </div>
              </div>

              <!-- 分路位置筛选 -->
              <div class="relative" @click.stop>
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-1.5 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                  <label class="block text-xs font-bold text-gray-600 dark:text-gray-300">约束游玩的分路</label>
                </div>
                <div @click="toggleDropdown('pos')" class="w-full min-h-11 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer flex flex-wrap gap-2 items-center shadow-sm">
                  <span v-for="p in getArrayVal(form.dataQuery.filters.position)" :key="p" class="bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-500/30">
                    {{ dictionaries.positions[p] || p }}
                    <X class="w-3.5 h-3.5 hover:text-red-500 cursor-pointer transition-colors" @click.stop="toggleArrayItem('position', p)" />
                  </span>
                  <span v-if="!getArrayVal(form.dataQuery.filters.position).length" class="text-gray-400 text-sm pl-1">未添加分路限制条件...</span>
                </div>
                <div v-if="activeDropdown === 'pos'" class="absolute z-50 w-full mt-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 grid grid-cols-2 gap-2">
                  <div v-for="(name, key) in dictionaries.positions" :key="key" @click="toggleArrayItem('position', String(key))" class="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-colors">
                    <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors" :class="getArrayVal(form.dataQuery.filters.position).includes(String(key)) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f]'">
                      <Check class="w-3.5 h-3.5" v-if="getArrayVal(form.dataQuery.filters.position).includes(String(key))" />
                    </div>
                    <span class="text-gray-700 dark:text-gray-200 font-medium">{{ name }}</span>
                  </div>
                </div>
              </div>

              <!-- 英雄筛选 -->
              <div class="relative" @click.stop>
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-1.5 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                  <label class="block text-xs font-bold text-gray-600 dark:text-gray-300">约束使用的英雄</label>
                </div>
                <div @click="toggleDropdown('champ')" class="w-full min-h-11 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer flex flex-wrap gap-2 items-center shadow-sm">
                  <span v-for="cid in getArrayVal(form.dataQuery.filters.championId)" :key="cid" class="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 pr-2 pl-1 py-1 rounded-md text-xs font-bold flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                    <img :src="getChampionData(cid)?.icon" class="w-5 h-5 rounded-sm object-cover" />
                    {{ getChampionData(cid)?.name }}
                    <X class="w-3.5 h-3.5 hover:text-red-500 cursor-pointer ml-1 transition-colors" @click.stop="toggleArrayItem('championId', cid)" />
                  </span>
                  <span v-if="!getArrayVal(form.dataQuery.filters.championId).length" class="text-gray-400 text-sm pl-1">未限制具体英雄，点击搜索英雄...</span>
                </div>
                <div v-if="activeDropdown === 'champ'" class="absolute bottom-full mb-2 z-50 w-full bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                  <div class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1f1f1f]">
                    <input v-model="searchQueries.champ" type="text" class="w-full bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors" placeholder="输入搜索英雄..." autofocus />
                  </div>
                  <div class="max-h-64 overflow-y-auto p-2 ui-scrollbar grid grid-cols-2 gap-1">
                    <div v-for="champ in filteredChampions" :key="champ.id" @click="toggleArrayItem('championId', champ.id)" class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-colors">
                      <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors" :class="getArrayVal(form.dataQuery.filters.championId).includes(champ.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f]'">
                        <Check class="w-3.5 h-3.5" v-if="getArrayVal(form.dataQuery.filters.championId).includes(champ.id)" />
                      </div>
                      <img :src="champ.icon" class="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 object-cover" />
                      <span class="text-gray-700 dark:text-gray-200 font-medium">{{ champ.name }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 独立装备筛选 (仅当 entity 为 match_items 时显示) -->
              <div class="relative" v-if="form.dataQuery.entity === 'match_items'" @click.stop>
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-1.5 h-4 bg-orange-400 dark:bg-orange-500 rounded-full"></span>
                  <label class="block text-xs font-bold text-gray-600 dark:text-gray-300">约束包含的装备 (实体级过滤)</label>
                </div>
                <div @click="toggleDropdown('item')" class="w-full min-h-11 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer flex flex-wrap gap-2 items-center shadow-sm">
                  <span v-for="iid in getArrayVal(form.dataQuery.filters.itemId)" :key="iid" class="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 pr-2 pl-1 py-1 rounded-md text-xs font-bold flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                    <img :src="getItemData(iid)?.icon" class="w-5 h-5 rounded-sm object-cover" />
                    {{ getItemData(iid)?.name }}
                    <X class="w-3.5 h-3.5 hover:text-red-500 cursor-pointer ml-1 transition-colors" @click.stop="toggleArrayItem('itemId', iid)" />
                  </span>
                  <span v-if="!getArrayVal(form.dataQuery.filters.itemId).length" class="text-gray-400 text-sm pl-1">未限制具体装备，点击搜索装备...</span>
                </div>
                <div v-if="activeDropdown === 'item'" class="absolute bottom-full mb-2 z-50 w-full bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                  <div class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1f1f1f]">
                    <input v-model="searchQueries.item" type="text" class="w-full bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors" placeholder="输入搜索装备..." autofocus />
                  </div>
                  <div class="max-h-64 overflow-y-auto p-2 ui-scrollbar grid grid-cols-2 gap-1">
                    <div v-for="item in filteredItems" :key="item.id" @click="toggleArrayItem('itemId', item.id)" class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-colors">
                      <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors" :class="getArrayVal(form.dataQuery.filters.itemId).includes(item.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f]'">
                        <Check class="w-3.5 h-3.5" v-if="getArrayVal(form.dataQuery.filters.itemId).includes(item.id)" />
                      </div>
                      <img :src="item.icon" class="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 object-cover" />
                      <span class="text-gray-700 dark:text-gray-200 font-medium">{{ item.name }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 独立强化符文筛选 (仅当 entity 为 match_augments 时显示) -->
              <div class="relative" v-if="form.dataQuery.entity === 'match_augments'" @click.stop>
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-1.5 h-4 bg-purple-400 dark:bg-purple-500 rounded-full"></span>
                  <label class="block text-xs font-bold text-gray-600 dark:text-gray-300">约束包含的强化符文 (实体级过滤)</label>
                </div>
                <div @click="toggleDropdown('augment')" class="w-full min-h-11 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer flex flex-wrap gap-2 items-center shadow-sm">
                  <span v-for="aid in getArrayVal(form.dataQuery.filters.augmentId)" :key="aid" class="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 pr-2 pl-1 py-1 rounded-md text-xs font-bold flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                    <img :src="getAugmentData(aid)?.icon" class="w-5 h-5 rounded-sm object-cover bg-black" />
                    <span :class="getAugmentData(aid)?.tier === 3 ? 'text-transparent bg-clip-text bg-lineaar-to-r from-blue-500 to-pink-500' : ''">{{ getAugmentData(aid)?.name }}</span>
                    <X class="w-3.5 h-3.5 hover:text-red-500 cursor-pointer ml-1 transition-colors" @click.stop="toggleArrayItem('augmentId', aid)" />
                  </span>
                  <span v-if="!getArrayVal(form.dataQuery.filters.augmentId).length" class="text-gray-400 text-sm pl-1">未限制具体强化符文，点击搜索符文...</span>
                </div>
                <div v-if="activeDropdown === 'augment'" class="absolute bottom-full mb-2 z-50 w-full bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                  <div class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1f1f1f]">
                    <input v-model="searchQueries.augment" type="text" class="w-full bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors" placeholder="输入搜索强化符文..." autofocus />
                  </div>
                  <div class="max-h-64 overflow-y-auto p-2 ui-scrollbar grid grid-cols-2 gap-1">
                    <div v-for="aug in filteredAugments" :key="aug.id" @click="toggleArrayItem('augmentId', aug.id)" class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-colors">
                      <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors" :class="getArrayVal(form.dataQuery.filters.augmentId).includes(aug.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f]'">
                        <Check class="w-3.5 h-3.5" v-if="getArrayVal(form.dataQuery.filters.augmentId).includes(aug.id)" />
                      </div>
                      <img :src="aug.icon" class="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 object-cover bg-black" />
                      <span class="font-medium truncate flex-1" :class="[aug.tier === 3 ? 'text-transparent bg-clip-text bg-lineaar-to-r from-blue-500 to-pink-500' : aug.tier === 2 ? 'text-amber-500' : 'text-gray-700 dark:text-gray-200']">{{ aug.name }}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <!-- 步骤四：聚合与指标 -->
          <section :ref="(el) => sectionRefs[3] = el as any" class="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 space-y-8 transition-all hover:shadow-md">
            <div class="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 class="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                  <Database class="w-5 h-5"/>
                </div>
                步骤四：核心指标与沙盒计算
              </h3>
            </div>

            <!-- 数据分类归档维度 (GroupBy) -->
            <div class="flex flex-col justify-end relative" @click.stop>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">将数据分类归档维度</label>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                作用：将同一类数据强制压缩为一条。例如按“分路”归类，则多场对局会压缩为 上单/中单 等最多 5 条数据。<br>
                <strong class="text-amber-600 dark:text-amber-500">排雷提示：如果您要绘制折线图展示“每一局”的单独变化轨迹，绝对不可启用此项。此项多用于饼图或排名列表。</strong>
              </div>
              <div @click="toggleDropdown('group')" class="w-full min-h-11 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer flex flex-wrap gap-2 items-center shadow-sm">
                <span v-for="g in getArrayVal(form.dataQuery.groupBy, true)" :key="g" class="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
                  按 {{ g === 'position' ? '分路位置' : g === 'champion_id' ? '所用英雄' : g === 'item_id' ? '购买装备' : g === 'augment_id' ? '强化符文' : g === 'queue_id' ? '游戏模式' : '其他' }} 归档
                  <X class="w-3.5 h-3.5 hover:text-red-500 cursor-pointer transition-colors" @click.stop="toggleArrayItem('groupBy', g, true)" />
                </span>
                <span v-if="!getArrayVal(form.dataQuery.groupBy, true).length" class="text-gray-400 text-sm pl-1">不进行归档融合处理...</span>
              </div>
              <div v-if="activeDropdown === 'group'" class="absolute z-50 w-full top-full mt-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 grid grid-cols-2 gap-2">
                <div v-for="opt in [{val:'position', label:'分路位置'}, {val:'champion_id', label:'所用英雄'}, {val:'item_id', label:'购买装备'}, {val:'augment_id', label:'强化符文'}, {val:'queue_id', label:'游戏模式'}]" :key="opt.val" @click="toggleArrayItem('groupBy', opt.val, true)" class="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-colors">
                  <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors" :class="getArrayVal(form.dataQuery.groupBy, true).includes(opt.val) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f]'">
                    <Check class="w-3.5 h-3.5" v-if="getArrayVal(form.dataQuery.groupBy, true).includes(opt.val)" />
                  </div>
                  <span class="text-gray-700 dark:text-gray-200 font-medium">按 {{ opt.label }}</span>
                </div>
              </div>
            </div>

            <!-- 核心指标与公式提取器 -->
            <div class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <div>
                  <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">指标提取与计算沙盒 <span class="text-red-500">*</span></label>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    作用：向引擎指明要提取什么字段。你可以选择简单映射单个字段，或者<strong class="text-indigo-500">编写复杂的数学公式实现高阶降维计算</strong>。
                  </div>
                </div>
                <button @click="addMetric" class="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-colors shadow-sm border border-indigo-100 dark:border-indigo-500/20"><Plus class="w-4 h-4"/>添加提取规则</button>
              </div>
              
              <div v-for="(metric, idx) in form.dataQuery.metrics" :key="idx" class="flex flex-col gap-3 bg-gray-50/50 dark:bg-[#141414] p-5 rounded-2xl border border-gray-200 dark:border-gray-700 relative group hover:border-indigo-300 transition-colors">
                <button @click="form.dataQuery.metrics.splice(idx, 1)" class="absolute right-4 top-4 text-gray-400 hover:text-red-500 bg-white dark:bg-[#1f1f1f] p-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 class="w-4 h-4"/></button>
                
                <!-- 引擎模式切换器 -->
                <div class="flex items-center gap-2 mb-3 border-b border-gray-200 dark:border-gray-800 pb-3 pr-10">
                  <div class="text-xs font-bold text-gray-500 mr-2">提取模式:</div>
                  <button @click="metric._isFormula = false" :class="!metric._isFormula ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-[#1f1f1f] dark:border-gray-700 dark:text-gray-400'" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                    单一字段映射
                  </button>
                  <button @click="metric._isFormula = true" :class="metric._isFormula ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-[#1f1f1f] dark:border-gray-700 dark:text-gray-400'" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                    高级公式计算 <span class="bg-indigo-600 text-white px-1.5 rounded text-[9px] ml-1" v-if="metric._isFormula">Pro</span>
                  </button>
                </div>

                <div class="grid grid-cols-12 gap-6">
                  <!-- 模式 A: 单一字段 -->
                  <div v-if="!metric._isFormula" class="col-span-5 flex flex-col justify-end relative" @click.stop>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">第一步：选择数据库字段</label>
                    <div class="text-[10px] text-gray-500 mb-2">从底层的字典中直接映射</div>
                    <div @click="toggleDropdown(`metric_${idx}`)" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer flex justify-between items-center shadow-sm">
                      <span class="truncate font-medium" :class="!metric.field && 'text-gray-400'">{{ metric.field ? (dictionaries.metrics[metric.field] ? `${dictionaries.metrics[metric.field]}` : metric.field) : '点击搜索字典字段...' }}</span>
                      <ChevronDown class="w-4 h-4 text-gray-400 shrink-0"/>
                    </div>
                    <!-- 字段搜索弹窗 -->
                    <div v-if="activeDropdown === `metric_${idx}`" class="absolute z-50 w-full top-full mt-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                      <div class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1f1f1f]">
                        <input v-model="searchQueries.metric" type="text" class="w-full bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors" placeholder="输入汉字或拼音搜索，如：伤害..." autofocus />
                      </div>
                      <div class="max-h-56 overflow-y-auto p-2 ui-scrollbar">
                        <div @click="metric.field = 'game_creation'; activeDropdown = null" class="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex justify-between items-center text-sm transition-colors border-b border-dashed border-gray-200 dark:border-gray-700">
                          <span class="text-gray-800 dark:text-gray-200 font-medium">对局创建时间戳</span>
                          <span class="text-[10px] font-mono text-gray-400">game_creation</span>
                        </div>
                        <div v-for="mOpt in filteredMetrics" :key="mOpt.key" @click="metric.field = mOpt.key; activeDropdown = null" class="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex justify-between items-center text-sm transition-colors">
                          <span class="text-gray-800 dark:text-gray-200 font-medium">{{ mOpt.name }}</span>
                          <span class="text-[10px] font-mono text-gray-400">{{ mOpt.key }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 模式 B: 高级公式 -->
                  <div v-if="metric._isFormula" class="col-span-12 flex flex-col gap-2 relative bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                    <div class="flex items-center justify-between mb-1">
                      <label class="block text-xs font-bold text-gray-700 dark:text-gray-300">第一步：编写原生 SQLite 运算沙盒公式</label>
                      <div class="flex gap-2">
                         <span @click.stop="metric.expression = (metric.expression||'') + ' MAX(game_duration / 60.0, 1) '" class="text-[10px] bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600 dark:bg-gray-800 dark:hover:bg-indigo-900/50 px-2 py-1 rounded cursor-pointer transition-colors">插入分均分母</span>
                         <span @click.stop="activeDropdown = activeDropdown === `dict_${idx}` ? null : `dict_${idx}`" class="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1"><Search class="w-3 h-3"/>查阅可用变量名</span>
                      </div>
                    </div>
                    <textarea v-model="metric.expression" rows="2" class="w-full bg-gray-50 dark:bg-[#1a1a1a] border-none rounded-lg px-3 py-2 text-sm font-mono text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none" placeholder="例如: physical_damage_dealt / MAX(game_duration / 60.0, 1)"></textarea>
                    
                    <!-- 悬浮字典查阅器 -->
                    <div v-if="activeDropdown === `dict_${idx}`" @click.stop class="absolute z-50 w-75 right-0 top-full mt-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                      <div class="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1f1f1f]">
                        <input v-model="searchQueries.metric" type="text" class="w-full bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 outline-none" placeholder="搜索变量名以插入..." />
                      </div>
                      <div class="max-h-64 overflow-y-auto p-1 ui-scrollbar">
                        <div v-for="mOpt in filteredMetrics" :key="mOpt.key" @click="metric.expression = (metric.expression||'') + ' ' + mOpt.key + ' '; activeDropdown = null" class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg cursor-pointer flex flex-col gap-1 transition-colors group">
                          <span class="text-gray-800 dark:text-gray-200 font-medium text-xs">{{ mOpt.name }}</span>
                          <span class="text-[10px] font-mono text-gray-400 group-hover:text-indigo-500">{{ mOpt.key }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 聚合与别名 (无论哪种模式都需要) -->
                  <div class="col-span-5" :class="metric._isFormula ? 'col-span-6' : 'col-span-4'">
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">第二步：结果处理算法</label>
                    <div class="text-[10px] text-gray-500 mb-2">折线图散点图选不聚合，雷达图选平均</div>
                    <select v-model="metric.aggregate" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                      <option value="">原始计算值不聚合</option>
                      <option value="avg">求多场平均值 (AVG)</option>
                      <option value="sum">数值累加求和 (SUM)</option>
                      <option value="max">寻找最高极大值 (MAX)</option>
                      <option value="min">寻找最低极小值 (MIN)</option>
                      <option value="count">出现次数统计 (COUNT)</option>
                    </select>
                  </div>
                  
                  <div class="col-span-7" :class="metric._isFormula ? 'col-span-6' : 'col-span-3'">
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">第三步：变量别名 <span class="text-red-500">*</span></label>
                    <div class="text-[10px] text-gray-500 mb-2">为这段结果起个纯英文名字（必填）</div>
                    <input v-model="metric.alias" type="text" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-sm transition-all" placeholder="如: calc_my_magic_dmg" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 排序与输出限制 -->
            <div class="grid grid-cols-12 gap-8 pt-4 border-t border-gray-100 dark:border-gray-800">
               <div class="col-span-7 flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">结果输出排序依据</label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：调整最终数据的数组顺序。<br>
                  提示：如绘制时间折线图，请在提取指标中加入“对局创建时间戳”别名，并在此处选择“从小到大”正向流动。
                </div>
                <div class="flex gap-2">
                  <select v-model="form.dataQuery.sortBy.field" class="flex-1 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                    <option value="">默认顺序</option>
                    <option v-for="alias in availableAliases" :key="alias" :value="alias">依变量：{{ alias }}</option>
                  </select>
                  <select v-if="form.dataQuery.sortBy.field" v-model="form.dataQuery.sortBy.direction" class="w-40 shrink-0 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                    <option value="DESC">从大到小</option>
                    <option value="ASC">从小到大</option>
                  </select>
                </div>
              </div>

              <div class="col-span-5 flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">结果输出数量上限</label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：截断数据。例如制作“排行榜”时填入特定数字。
                </div>
                <input v-model.number="form.dataQuery.outputLimit" type="number" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="留空代表不截断" />
              </div>
            </div>
          </section>

          <!-- 步骤五：视觉渲染 -->
          <section :ref="(el) => sectionRefs[4] = el as any" class="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 space-y-8 transition-all hover:shadow-md">
            <div class="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 class="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                  <PieChart class="w-5 h-5"/>
                </div>
                步骤五：视觉渲染映射
              </h3>
            </div>

            <!-- [核心新增]: 渲染模式与图表类型组合 -->
            <div class="grid grid-cols-2 gap-8">
               <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">底层呈现图表类型 <span class="text-red-500">*</span></label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：决定最后选用什么组件画图。
                </div>
                <select v-model="form.visualization.type" @change="handleChartTypeChange" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                  <option value="stat-card">数值看板卡片 (展示醒目的独立数据值)</option>
                  <option value="line">折线趋势图 (多用于单局表现轨迹)</option>
                  <option value="bar">多维柱状图 (多用于直观对比高低)</option>
                  <option value="radar">能力雷达图 (多用于六边形综合评估)</option>
                  <option value="scatter">分布散点图 (寻找双重数据属性关联)</option>
                  <option value="pie">环状饼图 (展示分类数据的占比)</option>
                  <option value="list">排行榜单 (列表化自顶向下罗列)</option>
                </select>
              </div>

              <!-- 多人对比渲染模式配置器 -->
              <div class="flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">多人对比渲染模式 <span class="text-red-500">*</span></label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：当图表收到多名玩家数据时该如何呈现。折线/雷达/散点图推荐「独立叠加」，柱状/饼图/榜单推荐「横向聚合」。
                </div>
                <select v-model="form.visualization.compareMode" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                  <option value="overlay">独立叠加模式 (不同玩家分别生成独立的折线/雷达网)</option>
                  <option value="aggregate">横向聚合模式 (不同玩家汇集在一起横向对比长短大小)</option>
                </select>
              </div>
            </div>

            <!-- Category Field，饼图、列表专用 -->
            <div class="grid grid-cols-2 gap-8 mt-6" v-if="['pie','list'].includes(form.visualization.type)">
              <div class="flex flex-col justify-end col-span-1">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">类目标签映射</label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：指定将哪个变量当作饼图切片上的文字说明。通常选择步骤四中用作分类归档维度的那个字段名称。
                </div>
                <select v-model="form.visualization.categoryField" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                  <option value="">留空 (让引擎根据归档维度自动推断)</option>
                  <option v-for="f in availableVizFields" :key="f" :value="f">强制指定为：{{ f }}</option>
                </select>
              </div>
            </div>

            <!-- XY 轴设定，仅供图表类 -->
            <div class="flex gap-8 mt-6" v-if="['line','bar','scatter'].includes(form.visualization.type)">
              <div class="flex-1 flex flex-col justify-end">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">横轴映射</label>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                  作用：折线图和柱状图底部的轴线应该拿什么变量填充。通常选择在“步骤四”获取好的带有时间的变量别名。
                </div>
                <div class="flex gap-2">
                   <select v-model="form.visualization.xAxis.field" class="flex-1 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                     <option value="">默认递增序列</option>
                     <option v-for="f in availableVizFields" :key="f" :value="f">选用变量：{{ f }}</option>
                   </select>
                   <select v-if="form.visualization.xAxis.field === '' || form.visualization.xAxis.field" v-model="form.visualization.xAxis.format" class="w-32 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none shrink-0 shadow-sm cursor-pointer">
                     <option value="index">排序索引</option>
                     <option value="time">时间戳</option>
                     <option value="value">纯数值</option>
                   </select>
                </div>
              </div>

              <div class="flex-1 flex flex-col justify-end" v-if="form.visualization.type === 'scatter'">
                 <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">纵轴映射</label>
                 <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 leading-relaxed">
                   作用：散点图专属的纵坐标变量来源绑定。
                 </div>
                 <select v-model="form.visualization.yAxis.field" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                   <option value="">默认配置</option>
                   <option v-for="f in availableVizFields" :key="f" :value="f">选用变量：{{ f }}</option>
                 </select>
              </div>
            </div>

            <!-- Series 渲染队列 -->
            <div class="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <div>
                  <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">数据展示序列挂载 <span class="text-red-500">*</span></label>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    作用：在这里添加需要画几条线（或者几个雷达角），并为它们绑定好步骤四提取好的数据别名。
                  </div>
                </div>
                <button @click="addSeries" class="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-colors shadow-sm border border-indigo-100 dark:border-indigo-500/20"><Plus class="w-4 h-4"/>添加一个展示系列</button>
              </div>
              
              <div v-for="(serie, idx) in form.visualization.series" :key="idx" class="flex items-end gap-4 bg-gray-50/50 dark:bg-[#141414] p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-300 transition-colors">
                <div class="flex-1 flex flex-col justify-end">
                   <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">选取要画的变量结果</label>
                   <select v-model="serie.field" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer shadow-sm">
                     <option value="">点击选择变量别名...</option>
                     <option v-for="alias in availableAliases" :key="alias" :value="alias">结果变量：{{ alias }}</option>
                   </select>
                </div>
                <div class="flex-1 flex flex-col justify-end">
                   <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">图例展示文本</label>
                   <input v-model="serie.name" type="text" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm" placeholder="前端界面显示的名称" />
                </div>
                <div class="w-24 shrink-0 flex flex-col justify-end">
                   <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">雷达图最高阈值</label>
                   <input v-model.number="serie.max" type="number" class="w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="选填数值" />
                </div>
                <div class="w-16 shrink-0 flex flex-col items-center justify-end pb-1">
                   <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">色相</label>
                   <div class="relative w-9 h-9 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-md cursor-pointer hover:scale-110 transition-transform">
                     <input v-model="serie.color" type="color" class="absolute -top-2 -left-2 w-14 h-14 cursor-pointer" />
                   </div>
                </div>
                <button @click="form.visualization.series.splice(idx, 1)" class="mb-1 p-2 text-gray-400 hover:text-red-500 bg-white dark:bg-[#1f1f1f] rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm transition-colors"><Trash2 class="w-5 h-5"/></button>
              </div>
            </div>

          </section>

        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Save, PencilRuler, FileBadge, LayoutTemplate, Filter, Database, PieChart, Check, X, ChevronDown, Trash2, Plus, Download, AlertCircle, CheckCircle2, Search } from 'lucide-vue-next';
import { usePluginStore } from '../store/plugins';
import { QUEUE_TYPES, POSITION_TYPES } from '../constants/game-dict';
import { METRICS_MAP } from '../constants/metrics';
import { gameDataService } from '../core/services/game-data';

const route = useRoute();
const router = useRouter();
const pluginStore = usePluginStore();

const isEditing = computed(() => !!route.params.id);

const toast = ref({ show: false, message: '', type: 'success' });
let toastTimer: any = null;

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message: msg, type };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value.show = false; }, 3000);
};

const sections = [
  { title: '基础身份信息', subtitle: '定义标识与命名描述' },
  { title: '前端界面布局', subtitle: '图表尺寸与挂载场景' },
  { title: '数据提取范围', subtitle: '框定对局过滤条件' },
  { title: '核心指标算法', subtitle: '沙盒运算与提取变量' },
  { title: '视觉渲染映射', subtitle: '连接数据与图表呈现' }
];
const currentSection = ref(0);
const sectionRefs = ref<HTMLElement[]>([]);
const scrollContainer = ref<HTMLElement | null>(null);

const scrollToSection = (idx: number) => {
  currentSection.value = idx;
  if (sectionRefs.value[idx] && scrollContainer.value) {
    scrollContainer.value.scrollTo({
      top: sectionRefs.value[idx].offsetTop - 30,
      behavior: 'smooth'
    });
  }
};

const handleScroll = () => {
  if (!scrollContainer.value) return;
  const scrollTop = scrollContainer.value.scrollTop;
  let activeIdx = 0;
  for (let i = 0; i < sectionRefs.value.length; i++) {
    if (sectionRefs.value[i] && scrollTop >= sectionRefs.value[i].offsetTop - 100) {
      activeIdx = i;
    }
  }
  currentSection.value = activeIdx;
};

const form = ref<any>(null);
const cloneWarning = ref(false);
const tagInput = ref('');

const initForm = () => {
  const targetId = route.params.id as string;
  if (targetId) {
    const existing = pluginStore.allPlugins.find(p => p.manifest.id === targetId);
    if (existing) {
      const clone = JSON.parse(JSON.stringify(existing));
      if (clone.isCustom === false) {
        clone.manifest.id = `${clone.manifest.id}_custom`;
        clone.manifest.name = `${clone.manifest.name} (自定义副本)`;
        cloneWarning.value = true;
      }
      
      if (!clone.manifest.version) clone.manifest.version = '1.0.0';
      if (!clone.manifest.author) clone.manifest.author = '';
      if (!clone.manifest.tags) clone.manifest.tags = [];
      if (!clone.dataQuery.filters) clone.dataQuery.filters = {};
      if (!clone.dataQuery.groupBy) clone.dataQuery.groupBy = [];
      if (!clone.dataQuery.metrics) clone.dataQuery.metrics = [];
      if (!clone.dataQuery.sortBy) clone.dataQuery.sortBy = { field: '', direction: 'DESC' };
      if (!clone.visualization.xAxis) clone.visualization.xAxis = { field: '', format: 'index' };
      if (!clone.visualization.yAxis) clone.visualization.yAxis = { field: '' };
      if (!clone.visualization.compareMode) {
         clone.visualization.compareMode = ['bar', 'pie', 'list'].includes(clone.visualization.type) ? 'aggregate' : 'overlay';
      }
      if (!clone.visualization.series) clone.visualization.series = [];
      
      clone.dataQuery.metrics.forEach((m: any) => {
          m._isFormula = !!m.expression;
      });
      
      form.value = clone;
      return;
    }
  }

  form.value = {
    manifest: { id: '', name: '', description: '', version: '1.0.0', author: '', tags: [] },
    layout: { grid: 'col-span-1', mount: ['dashboard', 'compare'] },
    dataQuery: {
      entity: 'match_games',
      filters: { limit: 20, matchResult: 'all' },
      groupBy: [],
      metrics: [],
      sortBy: { field: '', direction: 'DESC' }
    },
    visualization: { type: 'line', compareMode: 'overlay', categoryField: '', xAxis: {field:'', format:'index'}, yAxis: {field:''}, series: [] }
  };
};

const handleChartTypeChange = () => {
  const type = form.value.visualization.type;
  if (['bar', 'pie', 'list'].includes(type)) {
    form.value.visualization.compareMode = 'aggregate';
  } else {
    form.value.visualization.compareMode = 'overlay';
  }
};

const championList = ref<any[]>([]);
const itemList = ref<any[]>([]);
const augmentList = ref<any[]>([]);

const dictionaries = {
  queues: QUEUE_TYPES,
  positions: POSITION_TYPES,
  metrics: METRICS_MAP
};

const searchQueries = ref({ champ: '', metric: '', item: '', augment: '' });
const activeDropdown = ref<string | null>(null);

const toggleDropdown = (id: string) => {
  activeDropdown.value = activeDropdown.value === id ? null : id;
};

// 【核心逻辑】监听实体切换，智能清除不匹配的独立条件，防止生成死数据
watch(() => form.value?.dataQuery?.entity, (newEntity) => {
    if (!form.value) return;
    if (newEntity !== 'match_items') delete form.value.dataQuery.filters.itemId;
    if (newEntity !== 'match_augments') delete form.value.dataQuery.filters.augmentId;
});

onMounted(async () => {
  initForm();
  try {
    // 接入全局 gameDataService，复用同一套严谨的数据源
    await gameDataService.init();
    championList.value = gameDataService.getChampionList();
    itemList.value = gameDataService.getItemList();
    augmentList.value = gameDataService.getAugmentList();
  } catch (e) {
    console.error('获取底层字典列表失败', e);
  }
});

const getChampionData = (id: number) => championList.value.find(c => c.id === id);
const getItemData = (id: number) => itemList.value.find(i => i.id === id);
const getAugmentData = (id: number) => augmentList.value.find(a => a.id === id);

const filteredChampions = computed(() => {
  if (!searchQueries.value.champ) return championList.value;
  return championList.value.filter(c => c.name.includes(searchQueries.value.champ));
});

const filteredItems = computed(() => {
  if (!searchQueries.value.item) return itemList.value;
  return itemList.value.filter(i => i.name.includes(searchQueries.value.item));
});

const filteredAugments = computed(() => {
  if (!searchQueries.value.augment) return augmentList.value;
  return augmentList.value.filter(a => a.name.includes(searchQueries.value.augment));
});

const filteredMetrics = computed(() => {
  const entries = Object.entries(METRICS_MAP).map(([key, name]) => ({ key, name }));
  if (!searchQueries.value.metric) return entries;
  return entries.filter(e => e.name.includes(searchQueries.value.metric) || e.key.includes(searchQueries.value.metric));
});

const availableAliases = computed(() => {
  if (!form.value) return [];
  return form.value.dataQuery.metrics.map((m: any) => m.alias).filter(Boolean);
});
const availableVizFields = computed(() => {
  if (!form.value) return [];
  const groups = form.value.dataQuery.groupBy || [];
  return [...groups, ...availableAliases.value];
});

const addTag = () => {
  const val = tagInput.value.trim();
  if (val && !form.value.manifest.tags.includes(val)) {
    form.value.manifest.tags.push(val);
  }
  tagInput.value = '';
};

const getArrayVal = (target: any, isStringArr = false) => {
  if (!target) return [];
  if (Array.isArray(target)) return target;
  if (isStringArr) return target ? [String(target)] : [];
  return target ? [Number(target)] : [];
};

const toggleArrayItem = (path: 'queueId' | 'position' | 'championId' | 'itemId' | 'augmentId' | 'groupBy', val: any, isGroup = false) => {
  const targetObj = isGroup ? form.value.dataQuery : form.value.dataQuery.filters;
  let arr = getArrayVal(targetObj[path], typeof val === 'string');
  
  const idx = arr.indexOf(val);
  if (idx > -1) arr.splice(idx, 1);
  else arr.push(val);

  if (arr.length === 0) delete targetObj[path];
  else if (arr.length === 1 && !isGroup) targetObj[path] = arr[0];
  else targetObj[path] = arr;
};

const addMetric = () => form.value.dataQuery.metrics.push({ field: '', expression: '', aggregate: '', alias: '', _isFormula: false });
const addSeries = () => form.value.visualization.series.push({ field: '', name: '', color: '#10b981', max: null });

const getCleanedForm = () => {
  const final = JSON.parse(JSON.stringify(form.value));
  
  if (!final.manifest.author) delete final.manifest.author;
  if (!final.manifest.description) delete final.manifest.description;
  if (!final.manifest.tags || final.manifest.tags.length === 0) delete final.manifest.tags;

  if (!final.dataQuery.filters.limit) delete final.dataQuery.filters.limit;
  if (final.dataQuery.filters.matchResult === 'all') delete final.dataQuery.filters.matchResult;
  if (!final.dataQuery.groupBy || final.dataQuery.groupBy.length === 0) delete final.dataQuery.groupBy;
  if (!final.dataQuery.sortBy || !final.dataQuery.sortBy.field) delete final.dataQuery.sortBy;
  if (!final.dataQuery.outputLimit) delete final.dataQuery.outputLimit;

  final.dataQuery.metrics.forEach((m: any) => {
    const isFormula = m._isFormula;
    delete m._isFormula;
    
    if (isFormula) {
        delete m.field;
    } else {
        delete m.expression;
    }

    if (!m.aggregate || m.aggregate === '') {
      delete m.aggregate;
    }
  });

  if (!final.visualization.categoryField) delete final.visualization.categoryField;
  
  if (['line', 'bar', 'scatter'].includes(final.visualization.type)) {
     if (!final.visualization.xAxis || !final.visualization.xAxis.field) delete final.visualization.xAxis;
     if (final.visualization.type !== 'scatter' && (!final.visualization.yAxis || !final.visualization.yAxis.field)) {
         delete final.visualization.yAxis;
     }
  } else {
     delete final.visualization.xAxis;
     delete final.visualization.yAxis;
  }

  final.visualization.series.forEach((s: any) => { 
    if (s.max === null || s.max === '') delete s.max; 
  });

  return final;
};

const goBack = () => router.push('/plugins');

const exportJson = async () => {
  if (!form.value.manifest.id) {
    showToast("请至少先填写图表唯一标识！", "error");
    return;
  }
  const cleanData = getCleanedForm();
  const jsonString = JSON.stringify(cleanData, null, 4);

  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${cleanData.manifest.id}.json`,
        types: [{
          description: 'Orianna 插件配置文件',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      showToast("图表 JSON 文件已成功保存！", "success");
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanData.manifest.id}.json`;
      document.body.appendChild(a); 
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("文件下载请求已发出！", "success");
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      showToast("保存失败，请检查文件权限或重试", "error");
      console.error('File saving failed:', err);
    }
  }
};

const savePlugin = async () => {
  if (!form.value.manifest.id || !form.value.manifest.name) {
    showToast("唯一标识符和图表展示标题为必填项！", "error");
    return;
  }
  
  const invalidMetrics = form.value.dataQuery.metrics.some((m: any) => {
      const hasSource = (m._isFormula && !!m.expression) || (!m._isFormula && !!m.field);
      return !hasSource || !m.alias;
  });
  
  if (invalidMetrics) {
    showToast("存在未填写的核心指标映射公式，请检查步骤四！", "error");
    return;
  }
  
  const final = getCleanedForm();
  await pluginStore.saveEditedPlugin(final, true);
  router.push('/plugins');
};
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) !important;
}
.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) !important;
}
</style>