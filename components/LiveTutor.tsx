import React, { useRef } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LiveTutor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isConnected, isTalking, error, connect, disconnect } = useGeminiLive({
    onAudioData: (analyser) => {
      visualize(analyser);
    }
  });

  const visualize = (analyser: AnalyserNode) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Background Circle
      const radius = 60;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isTalking ? '#6366f1' : '#f1f5f9'; 
      ctx.fill();

      // Dynamic Rings (Waveform)
      const avg = dataArray.reduce((a, b) => a + b) / bufferLength;
      const scale = 1 + (avg / 255) * 1.2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * scale, 0, 2 * Math.PI);
      ctx.strokeStyle = isTalking ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * (scale + 0.2), 0, 2 * Math.PI);
      ctx.strokeStyle = isTalking ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 4;
      ctx.stroke();
    };
    draw();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md p-8 relative shadow-2xl overflow-hidden"
      >
        <button onClick={() => { disconnect(); onClose(); }} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition text-slate-500">
           <X className="w-5 h-5"/>
        </button>

        <div className="text-center mt-4 mb-8">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold mb-3 uppercase tracking-wider">
                <Volume2 className="w-3 h-3" /> Live API Powered
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">AI 口语私教</h2>
            <p className="text-slate-500 font-medium">像朋友一样聊天，实时纠正发音。</p>
        </div>

        {/* Visualizer Area */}
        <div className="flex justify-center mb-10 relative h-64 items-center">
             <canvas ref={canvasRef} width={300} height={300} className="absolute inset-0 m-auto z-10" />
             
             {/* Status Indicator */}
             <div className="absolute bottom-0 w-full text-center">
                <AnimatePresence>
                {isTalking ? (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-200"
                     >
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"/> Gemini 正在说话...
                     </motion.div>
                 ) : isConnected ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-slate-400 font-medium animate-pulse"
                    >
                        请说话...
                    </motion.div>
                 ) : null}
                 </AnimatePresence>
             </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
            {!isConnected ? (
                <button 
                    onClick={connect}
                    className="flex items-center gap-3 px-8 py-5 bg-slate-900 hover:bg-black text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 w-full justify-center"
                >
                    <Mic className="w-5 h-5" /> 开始连线
                </button>
            ) : (
                <button 
                    onClick={disconnect}
                    className="flex items-center gap-3 px-8 py-5 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 w-full justify-center"
                >
                    <MicOff className="w-5 h-5" /> 结束对话
                </button>
            )}
        </div>
        
        {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl text-center text-sm font-bold border border-red-100">
                {error}
            </div>
        )}

        <div className="mt-8 text-center text-xs text-slate-400 font-medium bg-slate-50 py-3 rounded-xl border border-slate-100">
            试着说: "Can you help me pronounce 'Ambition'?"
        </div>
      </motion.div>
    </div>
  );
};