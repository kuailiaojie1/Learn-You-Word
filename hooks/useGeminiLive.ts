import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

interface UseGeminiLiveProps {
  onAudioData?: (analyser: AnalyserNode) => void;
}

export const useGeminiLive = ({ onAudioData }: UseGeminiLiveProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  // We don't store session object directly as per guide we use sessionPromise logic mostly,
  // but we need a way to close. Ideally we keep the disconnect function.
  const disconnectRef = useRef<() => void>(() => {});

  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Initialization
  useEffect(() => {
    aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    if (!aiRef.current) return;
    setError(null);

    try {
      // 1. Setup Audio
      const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Analyser for visualization if needed
      if (onAudioData) {
        const analyser = outputCtx.createAnalyser();
        analyser.fftSize = 256;
        onAudioData(analyser);
      }

      // 2. Connect to Live API
      const sessionPromise = aiRef.current.live.connect({
        model: LIVE_MODEL,
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            
            // Start Mic Stream
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioStr = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioStr) {
              setIsTalking(true);
              // Handle Audio Output
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(audioStr),
                outputCtx,
                24000,
                1
              );
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination); // Connect to speakers
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsTalking(false);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsTalking(false);
            }
          },
          onclose: () => {
            setIsConnected(false);
            setIsTalking(false);
          },
          onerror: (err) => {
            console.error(err);
            setError("Connection error occurred.");
            setIsConnected(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: "You are a helpful, encouraging English vocabulary tutor for students. Correct their pronunciation gently and have short conversations about daily topics using simple words."
        }
      });

      // Cleanup function
      disconnectRef.current = () => {
        sessionPromise.then(session => session.close());
        stream.getTracks().forEach(t => t.stop());
        inputCtx.close();
        outputCtx.close();
      };

    } catch (err) {
      console.error(err);
      setError("Failed to access microphone or connect.");
    }
  };

  const disconnect = () => {
    disconnectRef.current();
    setIsConnected(false);
  };

  return { isConnected, isTalking, error, connect, disconnect };
};

// Utils
function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  // Simplified base64 encode of buffer for the Blob structure expected by API wrapper
  // Note: The @google/genai library expects a specific object structure for 'Blob'
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000'
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}