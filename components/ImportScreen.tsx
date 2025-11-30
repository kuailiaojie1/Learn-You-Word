
import React, { useState } from 'react';
import { db } from '../services/db';
import { generateWordData } from '../services/geminiService';
import { Upload, FileUp, Loader2, CheckCircle, ArrowLeft, Download } from 'lucide-react';

export const ImportScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'roster' | 'words') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(`正在读取 ${type === 'roster' ? '名单' : '单词'} 文件...`);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = window.XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = window.XLSX.utils.sheet_to_json(ws);

        if (type === 'roster') {
          setStatus('正在保存玩家信息...');
          const players = data.map((row: any) => ({
            name: row.Name || row.name || row['姓名'],
            stats: { total_score: 0, matches_played: 0 }
          })).filter((p: any) => p.name);
          
          await db.players.clear();
          await db.players.bulkAdd(players);
          setStatus(`成功！已导入 ${players.length} 名同学。`);
        } else {
          setStatus('AI 正在飞速生成题目（请稍候）...');
          const rawWords = data.map((row: any) => ({
            unit: row.Unit || row.unit || row['单元'] || '默认单元',
            word: row.Word || row.word || row['单词']
          })).filter((w: any) => w.word);

          // Generate Content via Gemini
          const processedWords = await generateWordData(rawWords);
          
          await db.words.clear();
          await db.words.bulkAdd(processedWords);
          setStatus(`成功！AI 已为 ${processedWords.length} 个单词生成了题目。`);
        }
      } catch (err) {
        console.error(err);
        setStatus('处理文件时出错，请检查格式是否正确。');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = (type: 'roster' | 'words') => {
      const ws = type === 'roster' 
        ? window.XLSX.utils.json_to_sheet([{ Name: '张三' }, { Name: '李四' }])
        : window.XLSX.utils.json_to_sheet([{ Unit: 'Unit 1', Word: 'Apple' }, { Unit: 'Unit 1', Word: 'Banana' }]);
      
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Template");
      window.XLSX.writeFile(wb, type === 'roster' ? "student_template.xlsx" : "words_template.xlsx");
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 h-full flex flex-col justify-center animate-fade-in-up">
        <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 transition">
                <ArrowLeft className="text-slate-600" />
            </button>
            <h2 className="text-3xl font-black text-slate-800">数据导入中心</h2>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Roster Import */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition">
                <FileUp size={100} className="text-blue-500" />
            </div>
            <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                    <FileUp size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">导入学生名单</h3>
                <p className="text-sm text-slate-500 mb-6">上传包含 "Name" (姓名) 列的 Excel 文件。</p>
                
                <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 text-center font-bold text-sm transition">
                        选择文件
                        <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => handleFileUpload(e, 'roster')}
                        disabled={loading}
                        className="hidden"
                        />
                    </label>
                    <button onClick={() => downloadTemplate('roster')} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                        <Download size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* Words Import */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition">
                <Upload size={100} className="text-purple-500" />
            </div>
            <div className="relative z-10">
                 <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                    <Upload size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">导入单词表</h3>
                <p className="text-sm text-slate-500 mb-6">包含 "Unit"(单元) 和 "Word"(单词) 列。</p>
                
                <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2 px-4 text-center font-bold text-sm transition">
                        选择文件
                        <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => handleFileUpload(e, 'words')}
                        disabled={loading}
                        className="hidden"
                        />
                    </label>
                    <button onClick={() => downloadTemplate('words')} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                        <Download size={20} />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`p-6 rounded-2xl flex items-center gap-4 shadow-sm border ${loading ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
          {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          <span className="font-bold text-lg">{status}</span>
        </div>
      )}
    </div>
  );
};
