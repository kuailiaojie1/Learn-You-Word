
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, WordItem } from '../types';
import { db } from '../services/db';
import confetti from 'canvas-confetti';
import { Home, Zap, Check, X } from 'lucide-react';

interface SingleGameProps {
  player: Player;
  words: WordItem[];
  onEndGame: (score: number) => void;
}

export const SingleGameScreen: React.FC<SingleGameProps> = ({ player, words, onEndGame }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  
  // Refined Feedback State
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const currentWord = words[currentRound];

  const finishGame = async (finalScore: number) => {
    await db.updateMatchStats(player, finalScore);
    onEndGame(finalScore);
  };

  const handleAnswer = (optionIndex: number) => {
    if (isFrozen || feedback !== null || !currentWord) return;
    
    setSelectedOptionIndex(optionIndex);

    if (optionIndex === currentWord.correct_index) {
      // Correct
      const streakBonus = Math.min(streak * 2, 10);
      const newScore = score + 10 + streakBonus;
      setScore(newScore);
      setStreak(s => s + 1);
      setFeedback('CORRECT');
      
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 }
      });

      setTimeout(() => {
        if (currentRound + 1 >= words.length) {
          finishGame(newScore);
        } else {
          setCurrentRound(r => r + 1);
          setFeedback(null);
          setSelectedOptionIndex(null);
        }
      }, 1000);

    } else {
      // Wrong
      setStreak(0);
      setFeedback('WRONG');
      setIsFrozen(true);
      
      if (currentWord.id) {
          db.mistakes.add({
            player_name: player.name,
            word_id: currentWord.id,
            timestamp: Date.now()
          });
      }

      setTimeout(() => {
        setIsFrozen(false);
        setFeedback(null);
        setSelectedOptionIndex(null);
      }, 1500);
    }
  };

  const getButtonStyle = (index: number) => {
      if (feedback === 'CORRECT') {
          if (index === currentWord.correct_index) return "bg-emerald-500 text-white border-emerald-600 shadow-md scale-105 ring-4 ring-emerald-200";
          return "bg-slate-50 text-slate-300 border-transparent opacity-40 grayscale";
      }
      if (feedback === 'WRONG') {
          if (index === selectedOptionIndex) return "bg-red-500 text-white border-red-600 shadow-md ring-4 ring-red-200 shake-animation";
          if (index === currentWord.correct_index) return "bg-emerald-100 text-emerald-700 border-emerald-200"; // Show correct answer
          return "bg-slate-50 text-slate-300 border-transparent opacity-40";
      }
      return "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border-2 border-transparent hover:shadow-lg hover:-translate-y-1";
  }

  // Card Animation Variants
  const cardVariants = {
    idle: { scale: 1, x: 0 },
    correct: { scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 10 } },
    wrong: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } }
  };

  if (!currentWord) return <div className="flex h-full items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative bg-indigo-50 rounded-none overflow-hidden select-none">
        
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
             <button onClick={() => onEndGame(score)} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition text-slate-500">
                <Home size={20} />
            </button>
            <div className="flex items-center gap-4">
                 <motion.div 
                    animate={streak > 1 ? { scale: [1, 1.2, 1] } : {}}
                    className={`px-4 py-2 rounded-full font-bold shadow-sm flex items-center gap-2 transition-colors ${streak > 2 ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400'}`}
                 >
                     <Zap fill="currentColor" size={18} className={streak > 2 ? 'text-amber-500' : 'text-slate-300'}/> 
                     连击 x{streak}
                 </motion.div>
                 <motion.div 
                    key={score}
                    initial={{ scale: 1.2, color: '#4f46e5' }}
                    animate={{ scale: 1, color: '#fff' }}
                    className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-xl shadow-lg"
                 >
                     {score} 分
                 </motion.div>
            </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-2xl h-2 bg-slate-200 rounded-full mb-8 md:mb-12 overflow-hidden mx-auto absolute top-24 left-0 right-0">
             <motion.div 
                className="h-full bg-indigo-500" 
                initial={{ width: 0 }}
                animate={{ width: `${((currentRound) / words.length) * 100}%` }}
                transition={{ duration: 0.5 }}
             />
        </div>

        {/* Main Game Card */}
        <div className="w-full max-w-lg px-4 relative mt-16 md:mt-0 z-10">
             <motion.div 
                key={currentWord.id}
                variants={cardVariants}
                animate={feedback === 'CORRECT' ? 'correct' : feedback === 'WRONG' ? 'wrong' : 'idle'}
                className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl text-center relative overflow-hidden border-4 border-white ring-1 ring-slate-100"
             >
                {/* Non-intrusive Status Indicator */}
                <div className="absolute top-6 right-6">
                    <AnimatePresence mode="wait">
                        {feedback === 'CORRECT' && (
                            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center">
                                    <Check size={24} strokeWidth={3} />
                                </div>
                            </motion.div>
                        )}
                        {feedback === 'WRONG' && (
                            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                                <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                                    <X size={24} strokeWidth={3} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mb-8 mt-2">
                     <span className="text-xs font-bold text-slate-400 tracking-widest uppercase bg-slate-50 px-3 py-1 rounded-full">Question {currentRound + 1}</span>
                     <h1 className="text-4xl md:text-5xl font-black text-slate-800 my-5 break-words leading-tight">{currentWord.word}</h1>
                     <p className="text-slate-500 font-medium font-serif italic bg-slate-50 p-4 rounded-2xl text-lg">{currentWord.example}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {currentWord.options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => handleAnswer(i)}
                            disabled={isFrozen || feedback !== null}
                            className={`w-full p-4 rounded-xl font-bold text-lg transition-all transform duration-200 ${getButtonStyle(i)}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
             </motion.div>
        </div>
        
        {/* Footer Info */}
        <div className="mt-8 flex items-center gap-2 text-slate-400 font-bold text-sm bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm">
             <div className="w-2 h-2 rounded-full bg-slate-400" />
             挑战者: {player.name}
        </div>
    </div>
  );
};
