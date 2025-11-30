
import React from 'react';
import { Player } from '../types';
import { motion } from 'framer-motion';
import { RotateCcw, Home, Trophy } from 'lucide-react';

interface GameSummaryProps {
  mode: 'single' | 'battle';
  players: Player[];
  results: { score: number, winner?: boolean }[];
  onReplay: () => void;
  onHome: () => void;
}

export const GameSummaryScreen: React.FC<GameSummaryProps> = ({ mode, players, results, onReplay, onHome }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl max-w-lg w-full text-center border-4 border-slate-100"
      >
        <div className="w-24 h-24 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Trophy size={48} />
        </div>
        
        <h2 className="text-4xl font-black text-slate-800 mb-8">游戏结束</h2>

        <div className="space-y-4 mb-10">
            {players.map((p, idx) => (
                <div key={p.id} className={`p-4 rounded-2xl flex items-center justify-between border-2 ${results[idx]?.winner ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
                             {p.name.charAt(0)}
                         </div>
                         <span className="font-bold text-slate-700 text-lg">{p.name}</span>
                         {results[idx]?.winner && <span className="bg-yellow-400 text-white text-xs px-2 py-1 rounded-full font-bold">WINNER</span>}
                    </div>
                    <div className="font-black text-2xl text-slate-800">
                        {results[idx]?.score || 0}
                    </div>
                </div>
            ))}
        </div>

        <div className="flex gap-4 justify-center">
            <button 
                onClick={onHome}
                className="p-4 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition font-bold"
            >
                <Home size={24} />
            </button>
            <button 
                onClick={onReplay}
                className="flex-1 py-4 px-6 rounded-full bg-indigo-600 text-white font-bold text-xl hover:bg-indigo-700 transition shadow-xl hover:shadow-2xl shadow-indigo-200 flex items-center justify-center gap-2"
            >
                <RotateCcw size={24} /> 再玩一次
            </button>
        </div>
      </motion.div>
    </div>
  );
};
