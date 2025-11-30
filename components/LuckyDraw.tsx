
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types';
import { db } from '../services/db';
import { Play, RefreshCw, X } from 'lucide-react';

interface LuckyDrawProps {
  mode: 'single' | 'battle';
  onComplete: (players: Player[]) => void;
  onCancel: () => void;
}

export const LuckyDraw: React.FC<LuckyDrawProps> = ({ mode, onComplete, onCancel }) => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [displayNames, setDisplayNames] = useState<string[]>(['?', '?']);
  const [rolling, setRolling] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<Player[]>([]);

  useEffect(() => {
    db.players.toArray().then(setAllPlayers);
  }, []);

  const startRoll = () => {
    if (allPlayers.length < (mode === 'battle' ? 2 : 1)) {
      alert(mode === 'battle' ? "对战模式至少需要 2 名学生！" : "请先导入学生名单！");
      return;
    }
    setRolling(true);
    setFinalPlayers([]);

    const interval = setInterval(() => {
      setDisplayNames(prev => [
        allPlayers[Math.floor(Math.random() * allPlayers.length)].name,
        mode === 'battle' ? allPlayers[Math.floor(Math.random() * allPlayers.length)].name : '?'
      ]);
    }, 80);

    // Stop after random time (2-3s)
    setTimeout(() => {
      clearInterval(interval);
      const p1 = allPlayers[Math.floor(Math.random() * allPlayers.length)];
      let p2 = p1;
      
      if (mode === 'battle') {
        // Ensure p2 is different from p1 if possible
        let attempts = 0;
        do {
          p2 = allPlayers[Math.floor(Math.random() * allPlayers.length)];
          attempts++;
        } while (p2.id === p1.id && attempts < 20);
        
        // Final fallback if only 1 player exists (though check above prevents this)
        if (p2.id === p1.id && allPlayers.length > 1) {
            // Force find another
            p2 = allPlayers.find(p => p.id !== p1.id) || p1;
        }
      }

      setDisplayNames([p1.name, mode === 'battle' ? p2.name : '']);
      setFinalPlayers(mode === 'battle' ? [p1, p2] : [p1]);
      setRolling(false);
    }, 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12">
      <div className="text-center">
        <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-3">谁是幸运儿？</h2>
        <p className="text-slate-500 text-lg">{mode === 'single' ? '抽取一位挑战者' : '点击开始，随机抽取对战选手'}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full max-w-4xl">
        {/* Slot 1 */}
        <SlotCard name={displayNames[0]} color="bg-red-500" label={mode === 'single' ? '挑战者' : "红方 P1"} />
        
        {mode === 'battle' && (
          <div className="text-5xl font-black text-slate-200 italic transform -skew-x-12">VS</div>
        )}

        {mode === 'battle' && (
            <SlotCard name={displayNames[1]} color="bg-blue-500" label="蓝方 P2" />
        )}
      </div>

      <div className="flex gap-4 mt-8">
        {!rolling && finalPlayers.length === 0 && (
           <>
             <button onClick={onCancel} className="px-8 py-4 rounded-full font-bold text-slate-500 hover:bg-slate-200 transition bg-slate-100">取消</button>
             <button 
                onClick={startRoll}
                className="px-12 py-4 rounded-full bg-slate-900 text-white font-bold text-xl shadow-xl hover:shadow-2xl hover:bg-black transform transition hover:scale-105 active:scale-95 flex items-center gap-2"
             >
               <Play fill="currentColor" /> 开始抽签
             </button>
           </>
        )}
        
        {!rolling && finalPlayers.length > 0 && (
          <>
            <button 
                onClick={startRoll} 
                className="px-6 py-4 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 flex items-center gap-2"
            >
                <RefreshCw className="w-5 h-5"/> 重抽
            </button>
            <button 
                onClick={() => onComplete(finalPlayers)}
                className="px-12 py-4 rounded-full bg-emerald-500 text-white font-bold text-xl shadow-xl hover:shadow-2xl hover:bg-emerald-600 transform transition hover:scale-105 active:scale-95"
            >
                开始！
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const SlotCard = ({ name, color, label }: { name: string, color: string, label: string }) => (
  <div className="relative">
      <div className="absolute -top-3 left-0 right-0 text-center z-10">
          <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{label}</span>
      </div>
      <motion.div 
        className={`w-64 h-48 ${color} rounded-[2rem] shadow-2xl flex items-center justify-center border-[6px] border-white ring-4 ring-black/5 relative overflow-hidden`}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
        <h3 className="text-5xl font-black text-white tracking-wide truncate px-4 drop-shadow-md">{name}</h3>
      </motion.div>
  </div>
);
