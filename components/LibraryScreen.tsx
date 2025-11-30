
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Book, Unit, WordItem } from '../types';
import { generateWordData } from '../services/geminiService';
import { Plus, Book as BookIcon, ChevronRight, Folder, Upload, Loader2, ArrowLeft, Trash, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

type ViewState = 'BOOKS' | 'UNITS' | 'WORDS';

export const LibraryScreen: React.FC = () => {
  const [view, setView] = useState<ViewState>('BOOKS');
  
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  const [words, setWords] = useState<WordItem[]>([]);
  
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [manualWordInput, setManualWordInput] = useState('');
  const [isManualAdding, setIsManualAdding] = useState(false);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const all = await db.books.toArray();
    setBooks(all);
  };

  const openBook = async (book: Book) => {
    if (!book.id) return;
    setSelectedBook(book);
    const bookUnits = await db.units.where('bookId').equals(book.id).toArray();
    setUnits(bookUnits);
    setView('UNITS');
  };

  const openUnit = async (unit: Unit) => {
    if (!unit.id) return;
    setSelectedUnit(unit);
    const unitWords = await db.words.where('unitId').equals(unit.id).toArray();
    setWords(unitWords);
    setView('WORDS');
  };

  const createBook = async () => {
    if (!newBookTitle.trim()) return;
    await db.books.add({
        title: newBookTitle,
        description: '我的自定义词书',
        coverEmoji: ['📚', '🌟', '🔥', '🎓'][Math.floor(Math.random()*4)],
        createdAt: Date.now()
    });
    setNewBookTitle('');
    loadBooks();
  };

  const deleteBook = async (e: React.MouseEvent, bookId: number) => {
      e.stopPropagation(); 
      e.preventDefault();
      
      if(confirm('删除词书将同时删除包含的所有单元和单词，确定吗？')) {
          // Optimistic Update
          const prevBooks = [...books];
          setBooks(prev => prev.filter(b => b.id !== bookId));
          
          try {
             await db.deleteBookFull(bookId);
          } catch (err) {
             console.error(err);
             setBooks(prevBooks); // Rollback
          }
      }
  }

  const createUnit = async () => {
      if(!newUnitName.trim() || !selectedBook || !selectedBook.id) return;
      await db.units.add({
          bookId: selectedBook.id,
          title: newUnitName
      });
      const bookUnits = await db.units.where('bookId').equals(selectedBook.id).toArray();
      setUnits(bookUnits);
      setNewUnitName('');
  }

  const deleteUnit = async (e: React.MouseEvent, unitId: number) => {
      e.stopPropagation();
      e.preventDefault();
      
      if(confirm(`确定删除该单元吗？`)) {
          // Optimistic Update
          const prevUnits = [...units];
          setUnits(prev => prev.filter(u => u.id !== unitId));

          try {
            await db.deleteUnitFull(unitId);
          } catch (err) {
            console.error(err);
            setUnits(prevUnits);
          }
      }
  }

  const deleteWord = async (e: React.MouseEvent, wordId: number) => {
      e.stopPropagation();
      e.preventDefault();
      if(confirm('确定删除这个单词吗？')) {
          // Optimistic Update
          const prevWords = [...words];
          setWords(prev => prev.filter(w => w.id !== wordId));

          try {
             await db.deleteWord(wordId);
          } catch (err) {
             console.error(err);
             setWords(prevWords);
          }
      }
  }

  const handleManualAddWord = async () => {
      if (!manualWordInput.trim() || !selectedBook || !selectedUnit) return;
      if (!selectedBook.id || !selectedUnit.id) return;
      
      setIsManualAdding(true);
      try {
          const generated = await generateWordData([{ word: manualWordInput }]);
          if (generated.length > 0) {
             await db.words.add({
                 ...generated[0],
                 bookId: selectedBook.id,
                 unitId: selectedUnit.id
             });
             setManualWordInput('');
             const unitWords = await db.words.where('unitId').equals(selectedUnit.id).toArray();
             setWords(unitWords);
          } else {
             alert('AI 无法为该单词生成题目，请检查拼写。');
          }
      } catch (err) {
          console.error(err);
          alert('AI 生成失败，请检查网络或配置');
      } finally {
          setIsManualAdding(false);
      }
  }

  const handleImportWords = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBook || !selectedUnit || !selectedBook.id || !selectedUnit.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.XLSX) {
        alert("Excel 解析库未加载，请刷新页面重试。");
        return;
    }

    setIsImporting(true);
    setImportStatus('正在解析文件...');
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = window.XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = window.XLSX.utils.sheet_to_json(ws);
            
            const rawWords = data.map((row: any) => ({
                bookId: selectedBook.id!,
                unitId: selectedUnit.id!, 
                word: row.Word || row.word || row['单词']
            })).filter((w: any) => w.word);

            if (rawWords.length === 0) {
                setImportStatus('未找到单词列 (Word/单词)');
                setTimeout(() => setIsImporting(false), 2000);
                return;
            }

            setImportStatus(`AI (Flash Mode) 正在飞速生成 ${rawWords.length} 个单词的题目...`);
            const generatedItems = await generateWordData(rawWords as any); 

            const finalWords: WordItem[] = generatedItems.map(item => ({
                ...item,
                bookId: selectedBook.id!,
                unitId: selectedUnit.id!
            }));

            await db.words.bulkAdd(finalWords);
            
            setImportStatus('');
            setIsImporting(false);
            openUnit(selectedUnit);
        } catch (err) {
            console.error(err);
            setImportStatus('出错了，请检查文件格式');
            setTimeout(() => setIsImporting(false), 3000);
        }
    }
    reader.readAsBinaryString(file);
  };

  const renderBooks = () => (
    <div className="animate-fade-in-up pb-20">
        <h2 className="text-3xl font-black text-slate-800 mb-6">我的书架</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {books.map(book => (
                <div key={book.id} onClick={() => openBook(book)} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100 group relative flex flex-col h-48">
                    <button 
                        onClick={(e) => deleteBook(e, book.id!)}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100 z-10"
                    >
                        <Trash size={16} />
                    </button>
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{book.coverEmoji || '📘'}</div>
                    <h3 className="font-bold text-slate-800 truncate text-lg">{book.title}</h3>
                    <p className="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50">
                        {book.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'Unknown Date'}
                    </p>
                </div>
            ))}
            <div className="bg-slate-100 p-6 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 hover:bg-slate-200 transition-colors h-48">
                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                     <BookIcon size={24} />
                 </div>
                 <div className="w-full flex gap-2">
                    <input 
                        type="text" 
                        placeholder="新词书名称" 
                        className="flex-1 bg-white px-3 py-2 rounded-lg text-sm font-bold text-slate-600 outline-none placeholder:text-slate-300"
                        value={newBookTitle}
                        onChange={e => setNewBookTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createBook()}
                        onClick={e => e.stopPropagation()}
                    />
                    <button onClick={createBook} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                        <Plus size={16} />
                    </button>
                 </div>
            </div>
        </div>
    </div>
  );

  const renderUnits = () => (
    <div className="animate-fade-in-up pb-20">
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setView('BOOKS')} className="p-2 hover:bg-slate-200 rounded-full transition"><ArrowLeft size={20}/></button>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <span className="text-slate-400 font-medium text-lg">{selectedBook?.title} /</span> 
                单元列表
            </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {units.map((unit, idx) => (
                 <div key={unit.id} onClick={() => openUnit(unit)} className="bg-white p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md cursor-pointer border border-slate-100 group">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                             {idx + 1}
                         </div>
                         <span className="font-bold text-slate-700">{unit.title}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => deleteUnit(e, unit.id!)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100 relative z-10"
                        >
                            <Trash size={16} />
                        </button>
                        <ChevronRight className="text-slate-300 group-hover:text-slate-600" />
                     </div>
                 </div>
             ))}
             
             <div className="bg-white p-5 rounded-2xl flex items-center gap-2 shadow-sm border border-indigo-100 border-dashed">
                 <Folder className="text-indigo-300" />
                 <input 
                    className="flex-1 outline-none font-bold text-slate-600 placeholder:text-slate-300" 
                    placeholder="创建新单元..." 
                    value={newUnitName}
                    onChange={e => setNewUnitName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createUnit()}
                />
                 <button onClick={createUnit} className="bg-indigo-600 text-white hover:bg-indigo-700 p-2 rounded-lg transition shadow-md shadow-indigo-200">
                     <Plus size={20}/>
                 </button>
             </div>
        </div>
    </div>
  );

  const renderWords = () => (
    <div className="animate-fade-in-up h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={() => setView('UNITS')} className="p-2 hover:bg-slate-200 rounded-full transition"><ArrowLeft size={20}/></button>
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-slate-800">{selectedUnit?.title}</h2>
                    <span className="text-sm text-slate-400">{words.length} 个单词</span>
                </div>
            </div>

            <div className="relative">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition shadow-sm ${isImporting ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {isImporting ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>}
                    {isImporting ? '处理中...' : '导入单词 (Excel)'}
                    <input type="file" disabled={isImporting} accept=".xlsx,.xls" onChange={handleImportWords} className="hidden" />
                </label>
            </div>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 mb-4">
             <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                 <Sparkles size={18} />
             </div>
             <input 
                type="text" 
                placeholder="输入英文单词，AI 自动生成..." 
                className="flex-1 bg-transparent px-2 font-bold text-slate-700 outline-none"
                value={manualWordInput}
                onChange={e => setManualWordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualAddWord()}
                disabled={isManualAdding}
             />
             <button 
                onClick={handleManualAddWord}
                disabled={isManualAdding}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
             >
                 {isManualAdding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
             </button>
        </div>

        {isImporting && importStatus && (
            <div className="mb-4 p-4 bg-indigo-50 text-indigo-800 rounded-xl font-bold text-center animate-pulse border border-indigo-100">
                {importStatus}
            </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-32">
             {words.length === 0 && !isImporting && (
                 <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                     <p className="font-bold mb-2">空空如也</p>
                     <p className="text-sm">使用上方输入框或右上角导入 Excel。</p>
                 </div>
             )}
             {words.map(w => (
                 <div key={w.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition hover:shadow-sm">
                     <div>
                         <h4 className="font-bold text-lg text-slate-800">{w.word}</h4>
                         <p className="text-sm text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-md inline-block mt-1">{w.correct_meaning}</p>
                         <p className="text-xs text-slate-400 italic mt-2 border-l-2 border-slate-200 pl-2">{w.example}</p>
                     </div>
                     <button 
                        onClick={(e) => deleteWord(e, w.id!)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100 relative z-10"
                    >
                         <Trash size={18} />
                     </button>
                 </div>
             ))}
        </div>
    </div>
  );

  return view === 'BOOKS' ? renderBooks() : view === 'UNITS' ? renderUnits() : renderWords();
};
