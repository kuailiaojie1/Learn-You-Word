
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Player } from '../types';
import { Users, FileUp, Trash2, Search, UserPlus, Edit2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ClassroomScreen: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
        const all = await db.players.toArray();
        const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(sorted);
    } catch (e) {
        console.error("Failed to load players", e);
    }
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImportRoster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = window.XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = window.XLSX.utils.sheet_to_json(ws);
            const newPlayers = data.map((row: any) => ({
                name: row.Name || row.name || row['姓名'],
                stats: { total_score: 0, matches_played: 0 }
            })).filter((p: any) => p.name);
            
            if(newPlayers.length > 0) {
                 await db.players.bulkAdd(newPlayers);
                 loadPlayers();
                 alert(`成功导入 ${newPlayers.length} 名学生。`);
            }
        } catch (e) {
            alert("文件格式有误");
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddStudent = async () => {
      if (!nameInput.trim()) return;
      await db.players.add({
          name: nameInput.trim(),
          stats: { total_score: 0, matches_played: 0 }
      });
      setNameInput('');
      setIsAdding(false);
      loadPlayers();
  };

  const handleEditStudent = async (id: number) => {
      if (!nameInput.trim()) return;
      await db.players.update(id, { name: nameInput.trim() });
      setNameInput('');
      setEditingId(null);
      loadPlayers();
  };

  const handleDeleteStudent = async (e: React.MouseEvent, id: number) => {
      // 1. Stop propagation immediately
      e.stopPropagation();
      e.preventDefault();
      
      if (confirm('确定要删除这位学生吗？')) {
          // 2. Optimistic Update: Remove from UI immediately
          const previousPlayers = [...players];
          setPlayers(prev => prev.filter(p => p.id !== id));

          try {
            // 3. Perform DB operation
            await db.deletePlayer(id);
          } catch (err) {
            console.error(err);
            alert("删除失败，正在恢复...");
            // 4. Rollback on error
            setPlayers(previousPlayers);
          }
      }
  };

  const startEdit = (e: React.MouseEvent, p: Player) => {
      e.preventDefault();
      setEditingId(p.id!);
      setNameInput(p.name);
      setIsAdding(false);
  }

  const clearRoster = async () => {
      if(confirm("确定要清空所有学生吗？")) {
          await db.players.clear();
          loadPlayers();
      }
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col pb-20 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Users size={24} />
             </div>
             <div>
                <h2 className="text-3xl font-black text-slate-800">学生管理</h2>
                <p className="text-slate-500">管理名单与查看学习进度</p>
             </div>
        </div>

        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 px-4">
                    <Search className="text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="搜索学生姓名..." 
                        className="flex-1 outline-none text-slate-700 font-bold placeholder:text-slate-300"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setIsAdding(true); setEditingId(null); setNameInput(''); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition"
                    >
                        <UserPlus size={18} /> 添加学生
                    </button>
                    <label className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition">
                        <FileUp size={18} /> 导入 Excel
                        <input type="file" className="hidden" accept=".xlsx" onChange={handleImportRoster}/>
                    </label>
                        <button 
                        onClick={clearRoster}
                        className="bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition"
                    >
                        <Trash2 size={18} /> 清空
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {(isAdding || editingId !== null) && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="bg-white p-4 rounded-2xl border border-indigo-100 mb-4 flex items-center gap-4 shadow-sm overflow-hidden">
                            <input 
                            type="text" 
                            autoFocus
                            placeholder="输入学生姓名" 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold outline-none focus:border-indigo-500"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (editingId ? handleEditStudent(editingId) : handleAddStudent())}
                            />
                            <div className="flex gap-2">
                            <button onClick={() => editingId ? handleEditStudent(editingId) : handleAddStudent()} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Check size={18}/></button>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300"><X size={18}/></button>
                            </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-2 pb-20">
                {filteredPlayers.length === 0 ? (
                    <div className="text-center text-slate-400 py-20 font-bold">没有找到相关学生</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {filteredPlayers.map(p => (
                            <div key={p.id} className="p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition border border-transparent hover:border-slate-100 cursor-pointer" onClick={(e) => startEdit(e, p)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                        {p.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{p.name}</h4>
                                        <p className="text-xs text-slate-400">比赛: {p.stats.matches_played} | 总分: {p.stats.total_score}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => handleDeleteStudent(e, p.id!)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition relative z-10">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
