
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, WordItem } from '../types';
import { db } from '../services/db';
import confetti from 'canvas-confetti';
import { Home, Lock } from 'lucide-react';

interface BattleScreenProps {
  p1: Player;
  p2: Player;
  words: WordItem[]; 
  onEndGame: (finalScores: number[]) => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({ p1, p2, words, onEndGame }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [frozen, setFrozen] = useState([false, false]);
  
  // Track feedback per player to highlight specific buttons
  const [playerFeedback, setPlayerFeedback] = useState<({ type: 'CORRECT' | 'WRONG', optionIndex: number } | null)[]>([null, null]);

  if (!words || words.length === 0) {
      return (
        <div className="flex flex-col h-full items-center justify-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">暂无题目数据</h2>
            <button onClick={() => onEndGame([0,0])} className="px-6 py-2 bg-indigo-600 text-white rounded-full">返回主页</button>
        </div>
      );
  }

  const finishGame = async (finalScores: number[]) => {
    await db.updateMatchStats(p1, finalScores[0], p2, finalScores[1]);
    onEndGame(finalScores);
  };

  const currentWord = words[currentRound];

  const handleAnswer = (playerIndex: number, optionIndex: number) => {
    if (frozen[playerIndex] || !currentWord || playerFeedback[playerIndex] !== null) return;

    if (optionIndex === currentWord.correct_index) {
      // Correct
      const newScores = [...scores];
      newScores[playerIndex] += 10;
      setScores(newScores);
      
      // Update Feedback State
      setPlayerFeedback(prev => {
          const next = [...prev];
          next[playerIndex] = { type: 'CORRECT', optionIndex };
          return next;
      });
      
      confetti({
        origin: { x: playerIndex === 0 ? 0.25 : 0.75, y: 0.5 },
        particleCount: 50,
        spread: 60,
        colors: playerIndex === 0 ? ['#ef4444'] : ['#3b82f6']
      });

      setTimeout(() => {
        if (currentRound + 1 >= words.length) {
          finishGame(newScores);
        } else {
          setCurrentRound(r => r + 1);
          setFrozen([false, false]);
          setPlayerFeedback([null, null]);
        }
      }, 1000);

    } else {
      // Wrong
      setFrozen(prev => {
          const next = [...prev];
          next[playerIndex] = true;
          return next;
      });

      // Show wrong feedback
      setPlayerFeedback(prev => {
          const next = [...prev];
          next[playerIndex] = { type: 'WRONG', optionIndex };
          return next;
      });
      
      if (currentWord.id) {
          db.mistakes.add({
            player_name: playerIndex === 0 ? p1.name : p2.name,
            word_id: currentWord.id,
            timestamp: Date.now()
          });
      }

      // Reset feedback after short delay, but keep frozen
      setTimeout(() => {
         setPlayerFeedback(prev => {
            const next = [...prev];
            next[playerIndex] = null;
            return next;
         });
      }, 500);

      setTimeout(() => {
        setFrozen(f => {
          const nf = [...f];
          nf[playerIndex] = false;
          return nf;
        });
      }, 2000);
    }
  };

  if (!currentWord) return <div className="flex h-full items-center justify-center text-2xl font-bold text-slate-400">正在准备题目...</div>;

  return (
    <div className="h-full w-full overflow-hidden relative bg-slate-100 rounded-none shadow-inner flex flex-col select-none">
        
        {/* Top Word Card */}
        <div className="absolute top-2 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xl px-6 py-3 md:px-10 md:py-4 rounded-[2rem] shadow-xl text-center border border-white/50 w-auto min-w-[280px] max-w-[90%] pointer-events-auto transition-all">
                <h3 className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mb-1 bg-slate-50 inline-block px-2 py-0.5 rounded-full">第 {currentRound + 1}/{words.length} 回合</h3>
                <h1 className="text-2xl md:text-4xl font-black text-slate-800 break-words leading-tight">{currentWord.word}</h1>
                <p className="text-slate-500 font-serif italic text-xs md:text-sm mt-1 truncate max-w-xs mx-auto">{currentWord.example}</p>
            </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 flex w-full relative pt-24 md:pt-0">
             {/* Player 1 (Red) */}
            <PlayerZone 
                player={p1} 
                color="bg-red-50" 
                borderColor="text-red-500"
                baseButtonColor="border-red-100 hover:bg-red-100"
                score={scores[0]} 
                options={currentWord.options}
                isFrozen={frozen[0]}
                feedback={playerFeedback[0]}
                onAnswer={(idx: number) => handleAnswer(0, idx)}
                position="left"
            />

            {/* Divider */}
            <div className="w-1 bg-slate-200 z-10 flex flex-col justify-center items-center">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm border border-white">VS</div>
            </div>

            {/* Player 2 (Blue) */}
            <PlayerZone 
                player={p2} 
                color="bg-blue-50" 
                borderColor="text-blue-500"
                baseButtonColor="border-blue-100 hover:bg-blue-100"
                score={scores[1]} 
                options={currentWord.options}
                isFrozen={frozen[1]}
                feedback={playerFeedback[1]}
                onAnswer={(idx: number) => handleAnswer(1, idx)}
                position="right"
            />
        </div>

        {/* Exit Button */}
        <button onClick={() => onEndGame([0,0])} className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 p-3 bg-slate-800 text-white rounded-full shadow-lg transition-all opacity-50 hover:opacity-100 hover:scale-110">
            <Home size={20} />
        </button>
    </div>
  );
};

const PlayerZone = ({ player, color, borderColor, baseButtonColor, score, options, isFrozen, feedback, onAnswer, position }: any) => {
    
    const getButtonStyle = (index: number) => {
        if (feedback?.type === 'CORRECT' && feedback.optionIndex === index) {
            return "bg-emerald-500 text-white border-emerald-500 shadow-md scale-105";
        }
        if (feedback?.type === 'WRONG' && feedback.optionIndex === index) {
            return "bg-red-500 text-white border-red-500 shadow-md";
        }
        return `bg-white text-slate-700 border-2 ${baseButtonColor} hover:shadow-lg active:scale-95`;
    };

    return (
        <div className={`flex-1 ${color} p-4 md:p-8 flex flex-col justify-end md:justify-center relative transition-colors duration-500`}>
            {/* Score BG */}
            <motion.div 
                key={score}
                initial={{ scale: 1.2, opacity: 0.2 }}
                animate={{ scale: 1, opacity: 0.1 }}
                className={`absolute top-20 md:top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-9xl font-black ${borderColor} select-none pointer-events-none`}
            >
                {score}
            </motion.div>

            {/* Player Name Tag */}
            <div className={`absolute top-4 ${position === 'left' ? 'left-4' : 'right-4'} bg-white px-3 py-1 rounded-full shadow-sm text-xs font-bold text-slate-500 border border-slate-100`}>
                {player.name}
            </div>

            {/* Frozen Overlay - Less Intrusive */}
            <AnimatePresence>
                {isFrozen && (
                    <motion.div 
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                        animate={{ opacity: 1, backdropFilter: "blur(2px)" }} 
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        className="absolute inset-0 bg-slate-900/10 z-20 flex items-center justify-center rounded-none"
                    >
                        <motion.div 
                            initial={{ scale: 0.5, rotate: -10 }} 
                            animate={{ scale: 1, rotate: 0 }} 
                            className="bg-white/90 backdrop-blur-md text-slate-800 font-bold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-white/50"
                        >
                            <Lock size={20} className="text-indigo-500"/>
                            <span className="text-sm">已冻结</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3 md:gap-4 relative z-10 pb-8 md:pb-0">
                {options.map((opt: string, i: number) => (
                    <button
                        key={i}
                        onClick={() => onAnswer(i)}
                        disabled={isFrozen || feedback !== null}
                        className={`p-4 md:p-6 rounded-2xl text-sm md:text-xl font-bold shadow-sm transition-all transform ${getButtonStyle(i)}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};
