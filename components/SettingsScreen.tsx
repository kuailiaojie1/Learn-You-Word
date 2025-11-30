
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Save, Database, Trash2, Download, Upload, Smartphone } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [status, setStatus] = useState('');
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    db.settings.toArray().then(settings => {
      if (settings.length > 0) {
        setApiKey(settings[0].apiKey || '');
        setEndpoint(settings[0].apiEndpoint || '');
      }
    });

    // Check if PWA install is possible
    if (window.deferredPrompt) {
      setInstallable(true);
    }
    
    const handler = () => setInstallable(true);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const saveSettings = async () => {
    await db.settings.clear();
    await db.settings.add({ apiKey, apiEndpoint: endpoint });
    setStatus('设置已保存！');
    setTimeout(() => setStatus(''), 2000);
  };

  const exportData = async () => {
    const data = {
      players: await db.players.toArray(),
      words: await db.words.toArray(),
      books: await db.books.toArray(),
      units: await db.units.toArray(),
      settings: await db.settings.toArray()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learn-your-word-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        await db.restoreBackup(data);
        alert("数据恢复成功！");
        window.location.reload();
      } catch (err) {
        alert("文件格式错误");
      }
    };
    reader.readAsText(file);
  };

  const resetDB = async () => {
      if(confirm("警告：确定要清空所有数据吗？包括词书、学生和成绩。此操作无法撤销！")) {
          try {
              setStatus('正在删除数据库...');
              // 执行数据库重置逻辑
              await db.resetDatabase();
              
              setStatus('数据已清空，即将刷新...');
              
              // 增加延时，确保数据库删除操作在文件系统层面完全结束
              setTimeout(() => {
                  window.location.reload();
              }, 1000);
          } catch (e) {
              console.error("Reset failed", e);
              setStatus('重置失败');
              alert("操作失败，可能因为数据库被其他标签页占用。请关闭其他标签页或手动清除浏览器缓存。");
          }
      }
  }

  const installPWA = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    window.deferredPrompt = null;
    setInstallable(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up py-10 pb-40">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-slate-800">设置中心</h2>
        <p className="text-slate-500">个性化你的 AI 体验与数据管理</p>
      </div>

      {installable && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-3xl shadow-lg text-white flex items-center justify-between">
            <div>
                <h3 className="text-xl font-bold mb-1">安装应用</h3>
                <p className="text-white/80 text-sm">将应用安装到桌面，体验更佳！</p>
            </div>
            <button 
                onClick={installPWA}
                className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-full shadow-md hover:bg-slate-50 transition flex items-center gap-2"
            >
                <Smartphone size={20} />
                立即安装
            </button>
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Save size={18} />
            </span>
            AI 配置
        </h3>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Gemini API Key</label>
                <input 
                    type="password" 
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="例如: AIzaSy..."
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">留空则尝试使用系统环境变量。</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">自定义 API 端点 (可选)</label>
                <input 
                    type="text" 
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    placeholder="例如: https://my-proxy.com"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono"
                />
            </div>

            <div className="pt-2">
                <button 
                    onClick={saveSettings}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition shadow-lg shadow-indigo-200"
                >
                    保存配置
                </button>
                {status && <span className="ml-4 text-emerald-600 font-bold text-sm">{status}</span>}
            </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Database size={18} />
            </span>
            数据管理
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={exportData} className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex flex-col items-center gap-2 text-slate-600 font-bold">
                <Download className="text-blue-500" />
                备份数据 (JSON)
            </button>
            
            <label className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex flex-col items-center gap-2 text-slate-600 font-bold cursor-pointer">
                <Upload className="text-emerald-500" />
                恢复数据
                <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>

            <button onClick={resetDB} className="p-4 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 transition flex flex-col items-center gap-2 text-red-600 font-bold">
                <Trash2 className="text-red-500" />
                清空并重置
            </button>
        </div>
      </div>
    </div>
  );
};