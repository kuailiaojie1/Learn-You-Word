
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Book, Unit, WordItem } from '../types';
import { Gamepad2, User, Users, BookOpen, Play, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameSetupProps {
    onStart: (mode: 'single' | 'battle', words: WordItem[]) => void;
    onBack: () => void;
}

export const GameSetupScreen: React.FC<GameSetupProps> = ({ onStart, onBack }) => {
    const [mode, setMode] = useState<'single' | 'battle'>('battle');
    const [books, setBooks] = useState<Book[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    
    // Selection State
    const [scopeType, setScopeType] = useState<'ALL' | 'BOOK' | 'UNIT'>('ALL');
    const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

    useEffect(() => {
        db.books.toArray().then(setBooks);
    }, []);

    useEffect(() => {
        if (selectedBookId) {
            db.units.where('bookId').equals(selectedBookId).toArray().then(setUnits);
        } else {
            setUnits([]);
        }
    }, [selectedBookId]);

    const handleStart = async () => {
        let words: WordItem[] = [];

        try {
            if (scopeType === 'ALL') {
                words = await db.words.toArray();
            } else if (scopeType === 'BOOK' && selectedBookId) {
                words = await db.words.where('bookId').equals(Number(selectedBookId)).toArray();
            } else if (scopeType === 'UNIT') {
                if (!selectedUnitId) {
                    alert("请选择一个单元！");
                    return;
                }
                words = await db.words.where('unitId').equals(Number(selectedUnitId)).toArray();
            }

            if (words.length < 1) {
                alert("所选范围内没有找到单词！请先前往【词书】添加单词。");
                return;
            }

            // Shuffle words
            const shuffled = words.sort(() => 0.5 - Math.random()).slice(0, 20);
            onStart(mode, shuffled);

        } catch (error) {
            console.error("Failed to fetch words:", error);
            alert("读取单词数据失败，请重试。");
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col justify-center animate-fade-in-up py-10 px-4">
            <h2 className="text-4xl font-black text-slate-800 text-center mb-8">游戏设置</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Mode Selection */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-600 mb-4 flex items-center gap-2">
                        <Gamepad2 className="text-indigo-500"/> 选择模式
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setMode('single')}
                            className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${mode === 'single' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                            <User size={32} />
                            <span className="font-bold">单人闯关</span>
                        </button>
                        <button 
                            onClick={() => setMode('battle')}
                            className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${mode === 'battle' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                            <Users size={32} />
                            <span className="font-bold">双人对战</span>
                        </button>
                    </div>
                </div>

                {/* Scope Selection */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-600 mb-4 flex items-center gap-2">
                        <BookOpen className="text-emerald-500"/> 题目范围
                    </h3>
                    
                    <div className="space-y-3">
                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${scopeType === 'ALL' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                            <input type="radio" name="scope" className="hidden" onChange={() => setScopeType('ALL')} checked={scopeType === 'ALL'} />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${scopeType === 'ALL' ? 'border-emerald-500' : 'border-slate-300'}`}>
                                {scopeType === 'ALL' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                            </div>
                            <span className="font-bold text-slate-700">全部单词库 (随机)</span>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${scopeType === 'BOOK' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                            <input type="radio" name="scope" className="hidden" onChange={() => setScopeType('BOOK')} checked={scopeType === 'BOOK'} />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${scopeType === 'BOOK' ? 'border-emerald-500' : 'border-slate-300'}`}>
                                {scopeType === 'BOOK' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                            </div>
                            <span className="font-bold text-slate-700">指定词书</span>
                        </label>

                        <AnimatePresence>
                        {scopeType === 'BOOK' && (
                            <motion.select 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-600 ml-8 max-w-[90%]"
                                onChange={(e) => { setSelectedBookId(Number(e.target.value)); setSelectedUnitId(null); }}
                                value={selectedBookId || ''}
                            >
                                <option value="" disabled>选择一本词书...</option>
                                {books.map(b => <option key={b.id} value={b.id}>{b.coverEmoji} {b.title}</option>)}
                            </motion.select>
                        )}
                        </AnimatePresence>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${scopeType === 'UNIT' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                            <input type="radio" name="scope" className="hidden" onChange={() => setScopeType('UNIT')} checked={scopeType === 'UNIT'} />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${scopeType === 'UNIT' ? 'border-emerald-500' : 'border-slate-300'}`}>
                                {scopeType === 'UNIT' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                            </div>
                            <span className="font-bold text-slate-700">指定单元</span>
                        </label>

                        <AnimatePresence>
                        {scopeType === 'UNIT' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ml-8 space-y-2 max-w-[90%]">
                                <select 
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-600"
                                    onChange={(e) => { setSelectedBookId(Number(e.target.value)); }}
                                    value={selectedBookId || ''}
                                >
                                    <option value="" disabled>先选择词书...</option>
                                    {books.map(b => <option key={b.id} value={b.id}>{b.coverEmoji} {b.title}</option>)}
                                </select>
                                <select 
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-600"
                                    onChange={(e) => setSelectedUnitId(Number(e.target.value))}
                                    value={selectedUnitId || ''}
                                    disabled={!selectedBookId}
                                >
                                    <option value="" disabled>选择单元...</option>
                                    {units.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                                </select>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-8">
                <button onClick={onBack} className="px-8 py-4 rounded-full font-bold text-slate-500 hover:bg-slate-200 transition bg-slate-100">
                    返回
                </button>
                <button 
                    onClick={handleStart}
                    className="px-12 py-4 rounded-full bg-slate-900 text-white font-bold text-xl shadow-xl hover:shadow-2xl hover:bg-black transform transition hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    <Play fill="currentColor" /> 开始游戏
                </button>
            </div>
        </div>
    );
};
