
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Box, Anchor, Cpu, Package, ChevronLeft, ChevronRight, Ship, ChevronUp, ChevronDown } from 'lucide-react';
import { CargoItemInput, ContainerSpec, BatchPackingResult } from './types';
import { calculateBatchPacking } from './services/packer';
import { analyzeLoadPlan } from './services/gemini';
import { LoadVisualizer } from './components/LoadVisualizer';

// Specs
const SPECS: ContainerSpec[] = [
  { name: "标准托盘 (1.2x1.0 H1.6)", dims: { length: 120, width: 100, height: 160 }, maxWeight: 1500, type: 'PALLET' },
  { name: "标准托盘 (1.2x1.0 H2.0)", dims: { length: 120, width: 100, height: 200 }, maxWeight: 1500, type: 'PALLET' },
  { name: "欧标托盘 (1.2x0.8)", dims: { length: 120, width: 80, height: 160 }, maxWeight: 1200, type: 'PALLET' },
  { name: "20' GP", dims: { length: 589, width: 235, height: 239 }, maxWeight: 28000, type: 'CONTAINER' },
  { name: "40' GP", dims: { length: 1203, width: 235, height: 239 }, maxWeight: 28800, type: 'CONTAINER' },
  { name: "40' HC", dims: { length: 1203, width: 235, height: 269 }, maxWeight: 28600, type: 'CONTAINER' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

const App: React.FC = () => {
  // State
  const [selectedSpec, setSelectedSpec] = useState<ContainerSpec>({ ...SPECS[0] }); 
  const [items, setItems] = useState<CargoItemInput[]>([
    { id: '1', name: '主机箱', dims: { length: 45, width: 35, height: 35 }, weight: 12, quantity: 24, color: COLORS[0], allowRotation: true },
    { id: '2', name: '显示器', dims: { length: 60, width: 15, height: 40 }, weight: 5, quantity: 30, color: COLORS[1], allowRotation: true },
    { id: '3', name: '配件包', dims: { length: 30, width: 30, height: 20 }, weight: 3, quantity: 50, color: COLORS[2], allowRotation: true },
  ]);
  
  const [batchResult, setBatchResult] = useState<BatchPackingResult | null>(null);
  const [viewIndex, setViewIndex] = useState(0); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAdviceOpen, setIsAdviceOpen] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [hoveredCargoId, setHoveredCargoId] = useState<string | null>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const cachedItems = localStorage.getItem('oceanpack_current_items');
    if (cachedItems) {
        try { setItems(JSON.parse(cachedItems)); } catch(e) { console.error(e); }
    }
  }, []);

  // Save current items to LocalStorage automatically
  useEffect(() => {
    localStorage.setItem('oceanpack_current_items', JSON.stringify(items));
  }, [items]);

  // Handlers
  const handleAddItem = () => {
    const newItem: CargoItemInput = {
      id: Date.now().toString(),
      name: `货物 ${items.length + 1}`,
      dims: { length: 40, width: 40, height: 40 },
      weight: 20,
      quantity: 1,
      color: COLORS[items.length % COLORS.length],
      allowRotation: true
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof CargoItemInput | keyof CargoItemInput['dims'], value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      if (['length', 'width', 'height'].includes(field as string)) {
        return { ...item, dims: { ...item.dims, [field]: Number(value) } };
      }
      return { ...item, [field]: field === 'name' ? value : (field === 'allowRotation' ? value : Number(value)) };
    }));
  };

  const handlePresetSelect = (spec: ContainerSpec) => {
    setSelectedSpec({ ...spec });
  };

  const handleSpecChange = (field: string, value: string | number) => {
    const numVal = Number(value);
    setSelectedSpec(prev => {
        const newSpec = { ...prev };
        if (['length', 'width', 'height'].includes(field)) {
            newSpec.dims = { ...newSpec.dims, [field]: numVal };
        } else if (field === 'maxWeight') {
            newSpec.maxWeight = numVal;
        } else if (field === 'type') {
            newSpec.type = value as 'CONTAINER' | 'PALLET';
        }
        return newSpec;
    });
  };

  const calculate = async () => {
    setIsComputing(true);
    setTimeout(() => {
        const res = calculateBatchPacking(selectedSpec, items);
        setBatchResult(res);
        setViewIndex(0);
        setAiAdvice('');
        setIsComputing(false);
    }, 100);
  };

  const triggerAIAnalysis = async () => {
    if (!batchResult) return;
    setIsAnalyzing(true);
    const advice = await analyzeLoadPlan(batchResult);
    setAiAdvice(advice);
    setIsAdviceOpen(true); // Automatically expand when new advice arrives
    setIsAnalyzing(false);
  };

  const nextView = () => {
    if (batchResult && viewIndex < batchResult.containers.length - 1) setViewIndex(viewIndex + 1);
  };

  const prevView = () => {
    if (viewIndex > 0) setViewIndex(viewIndex - 1);
  };

  const currentContainerResult = batchResult ? batchResult.containers[viewIndex] : null;

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden select-none">
      
      {/* 1. Header & Top Config Panel */}
      <header className="bg-slate-900 text-white shadow-lg z-50 shrink-0">
        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-lg">
                <Anchor className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold tracking-tight">OceanPack AI</h1>
            </div>
          </div>
          <button 
            onClick={calculate}
            disabled={isComputing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComputing ? <span className="animate-spin">⏳</span> : <Cpu className="w-4 h-4" />}
            {isComputing ? '计算中最优方案...' : '开始智能计算'}
          </button>
        </div>

        {/* Top Configuration Strip */}
        <div className="bg-white text-slate-900 px-6 py-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
             
             {/* Presets */}
             <div className="flex-1 min-w-0 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <div className="flex gap-3">
                    {SPECS.map(s => (
                        <button
                        key={s.name}
                        onClick={() => handlePresetSelect(s)}
                        className={`flex flex-col flex-shrink-0 items-start p-2.5 rounded-lg border text-left transition-all w-36 ${
                            selectedSpec.name === s.name && 
                            selectedSpec.dims.length === s.dims.length &&
                            selectedSpec.dims.height === s.dims.height
                            ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900 ring-offset-2' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                        >
                            <div className="flex items-center gap-2 mb-1 w-full">
                                {s.type === 'CONTAINER' ? <Ship className="w-3.5 h-3.5 opacity-70" /> : <Package className="w-3.5 h-3.5 opacity-70" />}
                                <span className="text-xs font-bold truncate">{s.name}</span>
                            </div>
                            <div className="text-[10px] opacity-60">
                                {s.dims.length}x{s.dims.width}x{s.dims.height}
                            </div>
                        </button>
                    ))}
                </div>
             </div>

             {/* Custom Spec Inputs (Inline) */}
             <div className="flex items-center gap-3 pl-6 border-l border-slate-200 shrink-0">
                 <div className="flex flex-col gap-1">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">自定义尺寸 (cm)</label>
                     <div className="flex items-center gap-2">
                        <div className="relative w-16">
                            <input type="number" value={selectedSpec.dims.length} onChange={(e) => handleSpecChange('length', e.target.value)} className="w-full pl-5 pr-1 py-1 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none font-medium text-slate-700" />
                            <span className="absolute left-1.5 top-1.5 text-[9px] text-slate-400">L</span>
                        </div>
                        <span className="text-slate-300">×</span>
                        <div className="relative w-16">
                            <input type="number" value={selectedSpec.dims.width} onChange={(e) => handleSpecChange('width', e.target.value)} className="w-full pl-5 pr-1 py-1 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none font-medium text-slate-700" />
                            <span className="absolute left-1.5 top-1.5 text-[9px] text-slate-400">W</span>
                        </div>
                        <span className="text-slate-300">×</span>
                        <div className="relative w-16">
                            <input type="number" value={selectedSpec.dims.height} onChange={(e) => handleSpecChange('height', e.target.value)} className="w-full pl-5 pr-1 py-1 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none font-medium text-slate-700" />
                            <span className="absolute left-1.5 top-1.5 text-[9px] text-slate-400">H</span>
                        </div>
                     </div>
                 </div>
                 
                 <div className="flex flex-col gap-1 ml-2">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">限重 (kg)</label>
                     <div className="relative w-20">
                            <input type="number" value={selectedSpec.maxWeight} onChange={(e) => handleSpecChange('maxWeight', e.target.value)} className="w-full pl-1 pr-1 py-1 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none font-medium text-slate-700" />
                    </div>
                 </div>
             </div>

        </div>
      </header>

      {/* Main Content Area: Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Cargo List */}
        <aside className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                   <Box className="w-4 h-4 text-slate-500" /> 货物清单 ({items.length})
               </h2>
               <div className="flex items-center gap-2">
                   <button onClick={handleAddItem} className="p-1.5 bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors shadow-sm">
                       <Plus className="w-3.5 h-3.5" />
                   </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/30">
                {items.map((item) => (
                    <div 
                        key={item.id} 
                        className={`group border rounded-lg p-3 bg-white transition-all relative ${hoveredCargoId === item.id ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : 'border-slate-100 hover:border-blue-300 hover:shadow-sm'}`}
                        onMouseEnter={() => setHoveredCargoId(item.id)}
                        onMouseLeave={() => setHoveredCargoId(null)}
                    >
                        <div className="flex items-start gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full mt-1 shrink-0 border border-slate-100" style={{ backgroundColor: item.color }}></div>
                            <input 
                                type="text" 
                                value={item.name}
                                onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                className="font-bold text-sm bg-transparent border-none p-0 focus:ring-0 w-full text-slate-700 placeholder:text-slate-300"
                                placeholder="输入货物名称"
                            />
                            <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                             <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-medium">尺寸 (cm)</label>
                                <div className="flex items-center border rounded overflow-hidden bg-white">
                                    <input type="number" placeholder="L" value={item.dims.length} onChange={(e) => handleUpdateItem(item.id, 'length', e.target.value)} className="w-full p-1 text-center outline-none border-r border-slate-100 text-slate-600" />
                                    <input type="number" placeholder="W" value={item.dims.width} onChange={(e) => handleUpdateItem(item.id, 'width', e.target.value)} className="w-full p-1 text-center outline-none border-r border-slate-100 text-slate-600" />
                                    <input type="number" placeholder="H" value={item.dims.height} onChange={(e) => handleUpdateItem(item.id, 'height', e.target.value)} className="w-full p-1 text-center outline-none text-slate-600" />
                                </div>
                             </div>
                             <div className="space-y-1">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[9px] text-slate-400 font-medium">单重(kg)</label>
                                        <input type="number" value={item.weight} onChange={(e) => handleUpdateItem(item.id, 'weight', e.target.value)} className="w-full p-1 border rounded text-center outline-none text-slate-600" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] text-slate-400 font-medium">数量</label>
                                        <input type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} className="w-full p-1 border rounded text-center font-bold text-slate-800 outline-none bg-blue-50 border-blue-100" />
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={item.allowRotation} 
                                    onChange={(e) => handleUpdateItem(item.id, 'allowRotation', e.target.checked)}
                                    className="rounded text-blue-600 w-3 h-3"
                                />
                                <span className="text-[10px] text-slate-500">允许侧放/旋转</span>
                            </label>
                        </div>
                    </div>
                ))}
                
                {items.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
                         <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                         <p className="text-xs text-slate-400">暂无货物，请添加</p>
                    </div>
                )}
            </div>
        </aside>

        {/* Right Main: Visualization & Results */}
        <main className="flex-1 bg-slate-100 p-4 overflow-y-auto min-w-0">
          
          {batchResult ? (
            <div className="flex flex-col gap-4">
                
                {/* Result Summary Bar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0 sticky top-0 z-20">
                    <div className="flex items-center gap-6 px-2">
                        <div>
                             <div className="text-[10px] uppercase text-slate-400 font-bold">所需{selectedSpec.type === 'PALLET' ? '托盘' : '集装箱'}</div>
                             <div className="text-2xl font-black text-slate-800 leading-none">{batchResult.totalContainers}</div>
                        </div>
                        <div className="h-8 w-px bg-slate-100"></div>
                        <div>
                             <div className="text-[10px] uppercase text-slate-400 font-bold">体积利用率</div>
                             <div className="text-2xl font-black text-blue-600 leading-none">{batchResult.averageVolumeUtilization.toFixed(1)}%</div>
                        </div>
                        <div className="h-8 w-px bg-slate-100"></div>
                        <div>
                             <div className="text-[10px] uppercase text-slate-400 font-bold">未装载</div>
                             <div className={`text-2xl font-black leading-none ${batchResult.unpackedItems.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {batchResult.unpackedItems.length}
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button onClick={prevView} disabled={viewIndex === 0} className="p-2 hover:bg-white rounded-md shadow-sm disabled:opacity-30 disabled:shadow-none transition-all"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-xs font-mono font-bold mx-3 w-12 text-center">{viewIndex + 1} / {batchResult.containers.length}</span>
                            <button onClick={nextView} disabled={viewIndex === batchResult.containers.length - 1} className="p-2 hover:bg-white rounded-md shadow-sm disabled:opacity-30 disabled:shadow-none transition-all"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                        <button 
                            onClick={triggerAIAnalysis}
                            disabled={isAnalyzing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
                        >
                            {isAnalyzing ? <span className="animate-spin">⏳</span> : <Cpu className="w-3.5 h-3.5" />}
                            AI 深度分析
                        </button>
                    </div>
                </div>

                {/* Visualization Canvas Area */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-hidden relative">
                    <LoadVisualizer 
                        result={currentContainerResult} 
                        index={viewIndex} 
                        total={batchResult.totalContainers}
                        hoveredCargoId={hoveredCargoId}
                    />
                </div>

                {/* AI Advice Overlay/Panel (Collapsible) */}
                {aiAdvice && (
                    <div className={`bg-white border-l-4 border-indigo-500 rounded-lg shadow-lg transition-all duration-300 shrink-0 flex flex-col overflow-hidden ${isAdviceOpen ? '' : 'max-h-12'}`}>
                        <div 
                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-transparent hover:border-slate-100"
                            onClick={() => setIsAdviceOpen(!isAdviceOpen)}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                    <Cpu className="w-3.5 h-3.5" /> AI 优化建议
                                </span>
                            </div>
                            <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                                {isAdviceOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                        </div>
                        
                        <div className={`overflow-y-auto custom-scrollbar transition-opacity duration-300 ${isAdviceOpen ? 'opacity-100 p-4 pt-0 max-h-[500px]' : 'opacity-0 h-0'}`}>
                            <div className="prose prose-sm prose-indigo text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: aiAdvice.replace(/\n/g, '<br/>') }}></div>
                        </div>
                    </div>
                )}
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 select-none">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Package className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-400">准备计算</h3>
                  <p className="text-sm max-w-md text-center mt-2">在左侧添加货物，调整尺寸和数量，<br/>然后点击右上角开始计算。</p>
             </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;
