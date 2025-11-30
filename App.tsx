
import React, { useState } from 'react';
import { GameMode, Player, WordItem } from './types';
import { SettingsScreen } from './components/SettingsScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { ClassroomScreen } from './components/ClassroomScreen';
import { LuckyDraw } from './components/LuckyDraw';
import { BattleScreen } from './components/BattleScreen';
import { GameSetupScreen } from './components/GameSetupScreen';
import { SingleGameScreen } from './components/SingleGameScreen';
import { GameSummaryScreen } from './components/GameSummaryScreen';
import { LiveTutor } from './components/LiveTutor';
import { Settings, Gamepad2, Mic, Home, Trophy, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.IDLE);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  
  // New State for Game Flow
  const [targetGameMode, setTargetGameMode] = useState<'single' | 'battle'>('battle');
  const [gameWords, setGameWords] = useState<WordItem[]>([]);
  const [gameResults, setGameResults] = useState<{score: number, winner?: boolean}[]>([]);

  // Navigation handlers
  const goHome = () => setMode(GameMode.IDLE);
  
  // Step 1: User completes Setup -> Go to Lucky Draw
  const handleGameSetupStart = (gameType: 'single' | 'battle', words: WordItem[]) => {
      setTargetGameMode(gameType);
      setGameWords(words);
      setMode(GameMode.LUCKY_DRAW);
  };
  
  // Step 2: User completes Draw -> Go to specific Game
  const handleLuckyDrawComplete = (players: Player[]) => {
    setSelectedPlayers(players);
    if (targetGameMode === 'single') {
        setMode(GameMode.SINGLE_GAME);
    } else {
        setMode(GameMode.BATTLE);
    }
  };

  const handleBattleEnd = (scores: number[]) => {
      const winnerIndex = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1;
      setGameResults([
          { score: scores[0], winner: winnerIndex === 0 },
          { score: scores[1], winner: winnerIndex === 1 }
      ]);
      setMode(GameMode.GAME_SUMMARY);
  };

  const handleSingleGameEnd = (score: number) => {
      setGameResults([{ score, winner: true }]);
      setMode(GameMode.GAME_SUMMARY);
  };

  // Determine if we should hide the nav (during games)
  const isImmersiveMode = mode === GameMode.BATTLE || mode === GameMode.SINGLE_GAME;

  // Navigation Items Configuration
  const navItems = [
    { id: GameMode.IDLE, icon: Home, label: '主页', action: goHome },
    { id: GameMode.LIBRARY, icon: BookOpen, label: '词书', action: () => setMode(GameMode.LIBRARY) },
    { id: GameMode.CLASSROOM, icon: Trophy, label: '班级', action: () => setMode(GameMode.CLASSROOM) },
    { id: GameMode.LIVE_TUTOR, icon: Mic, label: 'AI 私教', action: () => setMode(GameMode.LIVE_TUTOR) },
    { id: GameMode.SETTINGS, icon: Settings, label: '设置', action: () => setMode(GameMode.SETTINGS) },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-['Fredoka'] flex flex-col md:flex-row overflow-hidden">
      
      {/* Desktop Sidebar */}
      {!isImmersiveMode && (
        <nav className="hidden md:flex flex-col items-center py-8 px-4 w-24 bg-white/80 backdrop-blur-xl border-r border-slate-200 z-50 h-screen fixed left-0 top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div onClick={goHome} className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-12 shadow-lg shadow-indigo-200 cursor-pointer">
            LW
            </div>
            <div className="flex flex-col gap-6 w-full items-center">
            {navItems.map((item) => (
                <NavButton 
                key={item.id} 
                active={mode === item.id} 
                icon={item.icon} 
                label={item.label}
                onClick={item.action} 
                vertical
                />
            ))}
            </div>
        </nav>
      )}

      {/* Mobile Bottom Bar - Hidden in Game */}
      {!isImmersiveMode && (
          <nav className="md:hidden fixed bottom-6 left-4 right-4 h-20 bg-white/90 backdrop-blur-lg rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 z-50 flex items-center justify-around px-2 font-['Fredoka']">
            {navItems.map((item) => (
                <NavButton 
                key={item.id} 
                active={mode === item.id} 
                icon={item.icon} 
                label={item.label}
                onClick={item.action} 
                />
            ))}
        </nav>
      )}

      {/* Main Content Area */}
      {/* Add padding bottom only when nav is visible to prevent overlap */}
      <main className={`flex-1 ${!isImmersiveMode ? 'md:ml-24 pb-40 md:pb-8' : ''} h-screen overflow-y-auto overflow-x-hidden relative p-4 md:p-8`}>
        <AnimatePresence mode="wait">
          {mode === GameMode.IDLE && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[80vh] gap-8"
            >
               <div className="text-center space-y-4 mb-8">
                   <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold tracking-wide mb-2 border border-indigo-100">
                     ✨ 寓教于乐 V2.0 (Powered by Gemini 3)
                   </div>
                   <h1 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tight leading-tight">
                     单词<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">大作战</span>
                   </h1>
                   <p className="text-xl text-slate-500 max-w-lg mx-auto">
                     导入你的词书，开启双人竞技，或与 AI 畅聊口语。
                   </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                   <CardButton 
                      title="开始游戏" 
                      subtitle="单人闯关 / 1v1 双人同屏竞技" 
                      icon={<Gamepad2 size={48} className="text-white" />}
                      gradient="from-blue-500 to-cyan-500"
                      onClick={() => setMode(GameMode.GAME_SETUP)}
                   />
                   <CardButton 
                      title="AI 口语私教" 
                      subtitle="实时发音纠正与对话" 
                      icon={<Mic size={48} className="text-white" />}
                      gradient="from-violet-500 to-fuchsia-500"
                      onClick={() => setMode(GameMode.LIVE_TUTOR)}
                   />
               </div>
            </motion.div>
          )}

          {mode === GameMode.LIBRARY && (
            <motion.div key="library" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full">
              <LibraryScreen />
            </motion.div>
          )}

          {mode === GameMode.CLASSROOM && (
            <motion.div key="classroom" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full">
              <ClassroomScreen />
            </motion.div>
          )}

           {mode === GameMode.SETTINGS && (
            <motion.div key="settings" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full">
              <SettingsScreen />
            </motion.div>
          )}
          
          {mode === GameMode.GAME_SETUP && (
              <motion.div key="setup" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="h-full">
                  <GameSetupScreen onStart={handleGameSetupStart} onBack={goHome} />
              </motion.div>
          )}

          {mode === GameMode.LUCKY_DRAW && (
             <motion.div key="lucky" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="h-full">
                <LuckyDraw 
                    mode={targetGameMode} 
                    onComplete={handleLuckyDrawComplete} 
                    onCancel={goHome} 
                />
             </motion.div>
          )}

          {mode === GameMode.BATTLE && (selectedPlayers.length === 2 ? (
             <motion.div key="battle" className="h-full">
                <BattleScreen 
                    p1={selectedPlayers[0]} 
                    p2={selectedPlayers[1]} 
                    words={gameWords}
                    onEndGame={handleBattleEnd} 
                />
             </motion.div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">正在初始化对战...</div>
          ))}

          {mode === GameMode.SINGLE_GAME && (selectedPlayers.length === 1 ? (
              <motion.div key="single" className="h-full">
                  <SingleGameScreen 
                    player={selectedPlayers[0]}
                    words={gameWords}
                    onEndGame={handleSingleGameEnd}
                  />
              </motion.div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">正在初始化游戏...</div>
          ))}
          
          {mode === GameMode.GAME_SUMMARY && (
              <motion.div key="summary" className="h-full">
                  <GameSummaryScreen 
                    mode={targetGameMode}
                    players={selectedPlayers}
                    results={gameResults}
                    onReplay={() => setMode(GameMode.LUCKY_DRAW)}
                    onHome={goHome}
                  />
              </motion.div>
          )}

          {mode === GameMode.LIVE_TUTOR && (
             <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LiveTutor onClose={goHome} />
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// 胶囊导航按钮组件
const NavButton = ({ active, icon: Icon, label, onClick, vertical = false }: any) => {
  return (
    <button 
      onClick={onClick}
      className={`relative group flex items-center justify-center p-3 transition-all duration-300 ${vertical ? 'w-16 h-16 rounded-2xl' : 'flex-1 flex-col gap-1'}`}
    >
      <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-50 scale-100' : 'scale-0 group-hover:scale-75 group-hover:bg-slate-50'}`} />
      <Icon 
        className={`relative z-10 w-6 h-6 transition-colors duration-300 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} 
        strokeWidth={active ? 2.5 : 2}
      />
      {!vertical && (
        <span className={`text-[10px] font-bold mt-1 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
          {label}
        </span>
      )}
      {vertical && (
        <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {label}
        </div>
      )}
    </button>
  )
}

// 首页卡片按钮组件
const CardButton = ({ title, subtitle, icon, gradient, onClick }: any) => (
  <motion.button 
     whileHover={{ y: -5, scale: 1.02 }}
     whileTap={{ scale: 0.98 }}
     onClick={onClick}
     className={`relative overflow-hidden p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all text-left h-64 flex flex-col justify-between bg-white group border border-slate-100`}
  >
     <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradient} rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity -mr-16 -mt-16`} />
     
     <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-4`}>
       {icon}
     </div>
     
     <div className="relative z-10">
       <h3 className="text-3xl font-black text-slate-800 mb-2">{title}</h3>
       <p className="text-slate-500 font-medium">{subtitle}</p>
     </div>

     <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
       <div className={`text-transparent bg-clip-text bg-gradient-to-r ${gradient} font-bold text-lg`}>
         立即开始 &rarr;
       </div>
     </div>
  </motion.button>
);

export default App;
