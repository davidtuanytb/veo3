
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InstructionCard from './components/InstructionCard';
import { generateVeoPrompts } from './services/geminiService';
import { StyleType, AppState } from './types';
import { STYLES, IMAGE_COUNTS } from './constants';

// Declare global window properties to satisfy TS. 
// Using the AIStudio interface name to match environment expectations and avoid type conflicts.
declare global {
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    title: '',
    count: 3,
    style: 'Auto',
    result: null,
    loading: false,
    error: null,
    images: []
  });

  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          console.error("Error checking key selection status:", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Race condition mitigation: assume success after triggering the selection
        setHasKey(true);
      } catch (e) {
        console.error("Error opening key selector:", e);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileList = Array.from(files).slice(0, 3) as File[];
    const promises = fileList.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64s => {
      setState(prev => ({ ...prev, images: base64s }));
    });
  };

  const handleGenerate = async () => {
    if (!state.title.trim() && state.images.length === 0) {
      setState(prev => ({ ...prev, error: "Vui lòng nhập tiêu đề hoặc tải ảnh lên!" }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, result: null }));
    try {
      const result = await generateVeoPrompts(state.title, state.count, state.style, state.images);
      setState(prev => ({ ...prev, result, loading: false }));
    } catch (err: any) {
      // If billing is not enabled or key is invalid, reset and prompt for selection
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setState(prev => ({ ...prev, error: "API Key không khả dụng. Vui lòng chọn lại Key từ project đã bật Billing.", loading: false }));
      } else {
        setState(prev => ({ ...prev, error: err.message || "Đã có lỗi xảy ra", loading: false }));
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã copy vào bộ nhớ tạm!");
  };

  return (
    <div className="min-h-screen pb-20 px-4 max-w-5xl mx-auto">
      <Header />
      
      <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <section className="md:col-span-1 space-y-6">
          {/* API Key Selection UI - Clean version matching the screenshot */}
          <div className="bg-[#151c2c] p-6 rounded-xl border border-[#2d3644] text-[14px]">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[#00bcd4] font-bold">Gemini API Key:</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00bcd4] underline text-[13px]"
              >
                (Lấy API Key Free)
              </a>
            </div>
            <div 
              onClick={handleSelectKey}
              className="w-full bg-[#0d121d] border border-[#2d3644] rounded-lg px-4 py-3 text-gray-400 cursor-pointer hover:border-[#3d4859] transition-all flex items-center h-[48px]"
            >
              <span className="truncate opacity-70">
                {hasKey ? '••••••••••••••••••••••••••••••••' : 'Dán API Key của bạn vào đây...'}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề nội dung</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cải tạo phòng ngủ cũ..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={state.title}
                  onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tải ảnh tham chiếu (Tối đa 3)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {state.images.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {state.images.map((img, i) => (
                      <div key={i} className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden">
                        <img src={img} className="w-full h-full object-cover" alt="ref" />
                        <button 
                          onClick={() => setState(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                          className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-bl"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng ảnh (Timeline)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {IMAGE_COUNTS.map(num => (
                    <button
                      key={num}
                      onClick={() => setState(prev => ({ ...prev, count: num }))}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                        state.count === num
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phong cách</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={state.style}
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value as StyleType }))}
                >
                  {STYLES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={state.loading}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg transition-all ${
                  state.loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {state.loading ? 'Đang thiết kế...' : 'Tạo gói Prompt'}
              </button>

              {state.error && (
                <p className="text-red-500 text-xs font-medium bg-red-50 p-3 rounded-lg border border-red-100 italic">
                  ⚠️ {state.error}
                </p>
              )}
            </div>
          </div>
          
          <InstructionCard />
        </section>

        <section className="md:col-span-2 space-y-6">
          {!state.result && !state.loading && (
            <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-white/50">
              <svg xmlns="http://www.w3.org/2000/center" className="h-16 w-16 mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400 italic">Kết quả sẽ hiển thị tại đây...</p>
            </div>
          )}

          {state.result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                <h3 className="font-bold text-indigo-900 mb-1">Project: {state.result.analysis.subject}</h3>
                <p className="text-xs text-indigo-700 italic">Tiến trình: {state.result.analysis.progression}</p>
              </div>

              <div className="space-y-4">
                {state.result.imagePrompts.map((prompt, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Image Prompt #{idx + 1}</span>
                      <button onClick={() => copyToClipboard(prompt)} className="text-[10px] font-bold text-indigo-600 hover:underline">Copy Prompt</button>
                    </div>
                    <div className="p-4 text-xs text-gray-700 leading-relaxed italic">{prompt}</div>
                    {idx < state.result!.videoPrompts.length && (
                      <div className="p-4 bg-indigo-50/20 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-indigo-400 uppercase">Video Transition {idx + 1} → {idx + 2}</span>
                          <button onClick={() => copyToClipboard(state.result!.videoPrompts[idx])} className="text-[9px] font-bold text-indigo-600 hover:underline">Copy Video Prompt</button>
                        </div>
                        <div className="text-[11px] text-gray-600 line-clamp-2">{state.result!.videoPrompts[idx]}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      
      <footer className="mt-12 py-8 text-center text-gray-400 text-[10px] uppercase tracking-widest border-t border-gray-100">
        Veo3 Prompt Master System &bull; Powered by Gemini 3.0 Pro
      </footer>
    </div>
  );
};

export default App;
