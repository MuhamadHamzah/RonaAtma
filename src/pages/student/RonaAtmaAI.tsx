import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, HeartHandshake, ShieldAlert, Sparkles, Mic, MicOff, ShieldCheck, ArrowLeft, PhoneOff, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarCounselor from '../../components/AvatarCounselor';
import { useAudioEngine, type VoiceMaskType } from '../../hooks/useAudioEngine';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ChatMessage } from '../../types';

const SYSTEM_PROMPT = `Kamu adalah RonaAtma Assistant, teman curhat AI yang santai, empati, dan suportif untuk anak SMA di Indonesia.
Gaya bicaramu santai, bersahabat, dan gaul layaknya sahabat karib (gunakan panggilan 'aku' dan 'kamu', serta kata-kata santai seperti 'aja', 'deh', 'banget', 'sih', 'kok', 'ya', 'curhat', 'gitu'). Hindari bahasa baku yang kaku/formal.
Berikan respon yang hangat, menenangkan, dan tidak menghakimi.
Maksimal 2-3 kalimat per respon agar ringkas dan enak didengar secara suara. Akhiri dengan pertanyaan lanjutan yang empati.

Contoh Gaya Respon:
- "Eh, kenapa tuh? Sini curhat aja sama aku, siapa tahu bisa bikin perasaanmu agak lega. [EMOTION:calm]"
- "Ya ampun, kok bisa sih? Aku dengerin kok, ceritain pelan-pelan aja ya. [EMOTION:concerned]"
- "Jangan sedih ya, kamu tuh udah ngelakuin yang terbaik kok hari ini! Aku bangga banget sama kamu. [EMOTION:encouraging]"`;

export default function RonaAtmaAI() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // View mode switcher: 'text' | 'voice'
  const [viewMode, setViewMode] = useState<'text' | 'voice'>('text');

  // Text Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Voice Call States
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [avatarState, setAvatarState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [emotion, setEmotion] = useState<'calm' | 'concerned' | 'encouraging' | 'alert'>('calm');
  const [voiceSubtitle, setVoiceSubtitle] = useState<string>('Panggilan belum terhubung. Klik tombol hubungkan di bawah untuk mulai bicara.');
  const [voiceErrorMsg, setVoiceErrorMsg] = useState<string | null>(null);
  const [fallbackAmplitude, setFallbackAmplitude] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const {
    isRecording,
    isPlaying,
    amplitude,
    micAmplitude,
    voiceMask,
    setVoiceMask,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
  } = useAudioEngine();

  const isPlayingRef = useRef(isPlaying);
  const isVoiceConnectedRef = useRef(isVoiceConnected);
  const messagesRef = useRef(messages);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isVoiceConnectedRef.current = isVoiceConnected; }, [isVoiceConnected]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Load chat history
  useEffect(() => {
    if (!profile) return;
    supabase.from('chatbot_messages')
      .select('*')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });
  }, [profile]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, viewMode]);

  // Sync avatar state for voice mode
  useEffect(() => {
    if (viewMode !== 'voice' || !isVoiceConnected) return;
    if (isRecording) {
      setAvatarState('listening');
      setVoiceSubtitle('Mendengarkan Anda...');
    } else if (isPlaying || fallbackAmplitude > 0) {
      setAvatarState('speaking');
    } else if (avatarState !== 'thinking') {
      setAvatarState('idle');
    }
  }, [isRecording, isPlaying, fallbackAmplitude, isVoiceConnected, viewMode]);

  // Handle connection state changes
  useEffect(() => {
    if (viewMode === 'voice' && isVoiceConnected) {
      setVoiceSubtitle('Menghubungkan asisten...');
      startListeningLoop();
    } else {
      stopAudio();
      window.speechSynthesis?.cancel();
      if (isRecording) {
        stopRecording();
      }
      setAvatarState('idle');
      if (viewMode === 'voice') {
        setVoiceSubtitle('Panggilan terputus. Klik tombol hubungkan untuk memulai kembali.');
      }
    }
    return () => {
      stopAudio();
      window.speechSynthesis?.cancel();
    };
  }, [isVoiceConnected, viewMode]);

  // Web Speech API Synthesis Fallback
  const playSpeechSynthesis = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.startsWith('id') || v.lang.includes('ID'));
      if (idVoice) utterance.voice = idVoice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  };

  // VAD Callback: Silence detected, stop mic and process AI
  const handleSilenceDetected = async () => {
    if (!isVoiceConnectedRef.current) return;
    
    setAvatarState('thinking');
    setVoiceSubtitle('Sedang memahami curhatmu...');
    setVoiceErrorMsg(null);

    try {
      const audioBlob = await stopRecording();
      
      // 1. STT Whisper
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const sbUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech.webm');

      const sttResponse = await fetch(`${sbUrl}/functions/v1/speech-to-text`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: formData,
      });

      if (!sttResponse.ok) {
        const errText = await sttResponse.text();
        throw new Error(`Gagal memproses suara ke teks: ${errText}`);
      }

      const sttData = await sttResponse.json() as { text?: string; error?: string };
      const userText = sttData.text?.trim() || '';

      if (!userText) {
        console.log('[VoiceMode] No speech detected, returning to listen.');
        startListeningLoop();
        return;
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        student_id: profile?.id || '',
        role: 'user',
        content: userText,
        crisis_detected: false,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);

      // 2. Chat Completions LLM
      const { data: chatData, error: chatError } = await supabase.functions.invoke('chat-ai', {
        body: {
          messages: [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content })),
          system: SYSTEM_PROMPT,
          userId: profile?.id,
        },
      });

      if (chatError) throw new Error(chatError.message || 'AI gagal merespon.');
      const botText = chatData?.content || '';
      const botEmotion = chatData?.emotion || 'calm';
      const serverCrisisDetected = !!chatData?.crisis_detected;

      if (serverCrisisDetected) {
        setCrisisDetected(true);
      }

      setEmotion(botEmotion);
      setVoiceSubtitle(botText);
      
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        student_id: profile?.id || '',
        role: 'assistant',
        content: botText,
        crisis_detected: serverCrisisDetected,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // 3. TTS ElevenLabs with Graceful Browser Fallback
      setVoiceSubtitle('Menyiapkan suara...');
      
      try {
        const ttsResponse = await fetch(`${sbUrl}/functions/v1/text-to-speech`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: botText, emotion: botEmotion }),
        });

        if (!ttsResponse.ok) {
          const errData = await ttsResponse.json() as { error?: string };
          throw new Error(errData.error || 'ElevenLabs API Error');
        }

        const arrayBuffer = await ttsResponse.arrayBuffer();

        setVoiceSubtitle(botText);
        setAvatarState('speaking');
        
        await playAudio(arrayBuffer);
        monitorPlaybackEnd();

      } catch (ttsErr) {
        const ttsErrorText = (ttsErr as Error).message;
        console.warn('[TTS Fallback] ElevenLabs failed:', ttsErrorText);
        setVoiceErrorMsg(`Menggunakan suara lokal...`);

        setVoiceSubtitle(botText);
        setAvatarState('speaking');

        let fallbackActive = true;
        const fallbackInterval = setInterval(() => {
          if (!fallbackActive) return;
          setFallbackAmplitude(Math.random() * 0.45 + 0.1);
        }, 100);

        await playSpeechSynthesis(botText);
        
        fallbackActive = false;
        clearInterval(fallbackInterval);
        setFallbackAmplitude(0);
        setAvatarState('idle');

        setTimeout(() => {
          if (isVoiceConnectedRef.current) startListeningLoop();
        }, 800);
      }

    } catch (err) {
      console.error('[VoiceMode] Error:', err);
      setVoiceErrorMsg((err as Error).message || 'Terjadi gangguan jaringan.');
      setAvatarState('idle');
      setTimeout(() => {
        if (isVoiceConnectedRef.current) startListeningLoop();
      }, 3000);
    }
  };

  const startListeningLoop = async () => {
    if (!isVoiceConnectedRef.current) return;
    setAvatarState('listening');
    setVoiceErrorMsg(null);
    try {
      await startRecording(handleSilenceDetected);
    } catch (err) {
      console.error(err);
      setVoiceErrorMsg('Gagal mengakses mic. Periksa izin browser.');
      setIsVoiceConnected(false);
    }
  };

  const monitorPlaybackEnd = () => {
    const checkEnd = setInterval(() => {
      if (!isVoiceConnectedRef.current) {
        clearInterval(checkEnd);
        return;
      }
      if (!isPlayingRef.current) {
        clearInterval(checkEnd);
        console.log('[VoiceMode] Playback finished. Automatically listening...');
        setTimeout(() => {
          startListeningLoop();
        }, 800);
      }
    }, 200);
  };

  // Text Chat Send Handler
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      student_id: profile.id,
      role: 'user',
      content: userText,
      crisis_detected: false,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    let botReplyText = '';
    let serverCrisisDetected = false;
    
    try {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { 
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          system: SYSTEM_PROMPT,
          userId: profile.id
        }
      });
      if (error || !data?.content) {
        throw new Error(error?.message || 'Empty or invalid response from AI');
      }
      botReplyText = data.content;
      serverCrisisDetected = !!data.crisis_detected;
      if (serverCrisisDetected) {
        setCrisisDetected(true);
      }
    } catch (err) {
      console.warn("Using fallback AI message:", err);
      botReplyText = 'Maaf, layanan AI sedang tidak tersedia. Jika kamu sedang mengalami masalah serius, silakan hubungi guru BK sekolahmu untuk mendapatkan bantuan.';
    }

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      student_id: profile.id,
      role: 'assistant',
      content: botReplyText,
      crisis_detected: serverCrisisDetected,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);
  }

  async function handleClearHistory() {
    if (!profile || !window.confirm('Hapus seluruh riwayat obrolan dengan RonaAtma.AI?')) return;
    const { error } = await supabase.from('chatbot_messages').delete().eq('student_id', profile.id);
    if (!error) {
      setMessages([]);
      setCrisisDetected(false);
    }
  }

  return (
    <div className="w-full h-[calc(100vh-130px)] h-[calc(100dvh-130px)] flex flex-col justify-between space-y-3 overflow-hidden">
      
      {/* ── VIEW 1: VOICE CALL MODE ────────────────────────────────────────── */}
      {viewMode === 'voice' ? (
        <div className="flex-1 w-full flex flex-col justify-between bg-[#0D1424]/40 border border-cosmic-border/60 rounded-3xl p-4 md:p-6 relative overflow-hidden animate-fade-in">
          
          {/* Ambient Glows inside the Voice Card */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#090E1A]/10 to-[#070B14]/40 z-0 pointer-events-none" />

          {/* Voice Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-3 bg-[#0D1424]/60 border border-cosmic-border/60 rounded-2xl inner-glow-top z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center">
                <Mic size={20} className={`text-accent-lavender ${isVoiceConnected ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F0F4FF] flex items-center gap-1.5">
                  RonaAtma.AI (Panggilan Suara)
                </h2>
                <p className="text-[9px] text-accent-teal font-bold tracking-wider font-mono">
                  DIPROTEKSI BLOCKCHAIN & VOICE MASK
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setIsVoiceConnected(false);
                setViewMode('text');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#121A30]/50 border border-cosmic-border text-[#7B8EC8] hover:text-[#F0F4FF] transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Kembali ke Chat Teks"
            >
              <ArrowLeft size={14} />
              Kembali ke Chat
            </button>
          </div>

          {/* Voice Body */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 relative z-10">
            
            {/* Status pills */}
            <div className="flex items-center gap-2 justify-center mb-4">
              {isVoiceConnected ? (
                <div className="px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-ping" />
                  <span className="text-[9px] font-mono text-accent-teal uppercase tracking-widest font-bold">
                    {avatarState === 'listening' ? 'Mendengarkan' : avatarState === 'thinking' ? 'Berpikir' : 'Bicara'}
                  </span>
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full bg-[#121A30]/80 border border-cosmic-border flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#526895]" />
                  <span className="text-[9px] font-mono text-[#7B8EC8] uppercase tracking-widest font-bold">Belum Terhubung</span>
                </div>
              )}
            </div>

            {/* Neural Fluid Orb Canvas */}
            <div className="relative w-full max-w-[280px] flex justify-center mt-2">
              <AvatarCounselor 
                emotion={emotion} 
                state={avatarState} 
                amplitude={isPlaying ? amplitude : fallbackAmplitude > 0 ? fallbackAmplitude : micAmplitude} 
                size={isMobile ? 150 : 230} 
              />
            </div>

            {/* Dynamic Wave Visualizer (Visible only when call is running) */}
            {isVoiceConnected && (
              <div className="flex items-end gap-1 h-6 mt-3 w-36 justify-center">
                {[...Array(12)].map((_, i) => {
                  const activeAmp = isRecording ? micAmplitude : isPlaying ? amplitude : fallbackAmplitude;
                  const h = Math.max(2, activeAmp * 20 * Math.abs(Math.sin(i * 0.4 + Date.now() * 0.01)));
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-gradient-to-t from-accent-purple via-accent-lavender to-accent-teal transition-all duration-75"
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
            )}

            {/* Live Subtitle Transcript Area */}
            <div className="mt-6 text-center max-w-xl px-4">
              <p className={`text-xs sm:text-sm leading-relaxed transition-all duration-300 ${
                avatarState === 'thinking' ? 'text-accent-lavender animate-pulse' :
                avatarState === 'listening' ? 'text-accent-teal font-medium' : 'text-[#F0F4FF]'
              }`}>
                {voiceSubtitle}
              </p>
            </div>

            {/* Floating Recent Dialogues Overlay */}
            {isVoiceConnected && messages.length > 0 && (
              <div className="absolute top-16 left-4 right-4 max-h-[80px] overflow-y-auto p-2 bg-[#0A0E1A]/95 backdrop-blur-md border border-cosmic-border/30 rounded-xl space-y-1 z-30 text-[10px] sm:text-xs no-scrollbar">
                {messages.slice(-3).map((msg, i) => (
                  <div key={i} className={`flex gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-1 px-2 rounded-lg max-w-[85%] border ${
                      msg.role === 'user'
                        ? 'bg-accent-purple/15 border-accent-purple/30 text-[#F0F4FF]'
                        : 'bg-cosmic-card2/80 border-cosmic-border/40 text-text-secondary'
                    }`}>
                      <span className="font-bold mr-1">{msg.role === 'user' ? 'Kamu:' : 'AI:'}</span>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Voice call errors */}
            {voiceErrorMsg && (
              <div className="mt-4 p-2 rounded-xl bg-accent-coral/10 border border-accent-coral/30 flex items-center gap-2 text-accent-coral text-[10px]">
                <ShieldAlert size={12} className="flex-shrink-0" />
                <span>{voiceErrorMsg}</span>
              </div>
            )}
          </div>

          {/* Voice Footer Panel (Mask Selector & Phone Controls) */}
          <div className="flex-shrink-0 p-4 bg-[#0D1424]/60 border border-cosmic-border/40 rounded-2xl flex flex-col items-center justify-center space-y-4 z-10 max-w-xl mx-auto w-full">
            
            {/* Voice Mask Selector */}
            <div className="w-full">
              <div className="flex items-center gap-1.5 mb-2 justify-center">
                <ShieldCheck size={11} className="text-accent-teal" />
                <p className="text-[9px] font-bold text-accent-teal uppercase tracking-widest font-mono">Penyamaran Suara (Client-Side)</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { id: 'none',  label: 'Asli',   emoji: '🎙️' },
                  { id: 'low',   label: 'Dalam',  emoji: '🔉' },
                  { id: 'high',  label: 'Tinggi', emoji: '🔊' },
                  { id: 'robot', label: 'Robot',  emoji: '🤖' },
                ] as { id: VoiceMaskType; label: string; emoji: string }[]).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setVoiceMask(m.id)}
                    disabled={isVoiceConnected}
                    className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl border text-center transition-all ${
                      voiceMask === m.id
                        ? 'bg-accent-purple/20 border-accent-purple/60 text-accent-lavender'
                        : 'bg-[#0A0E1A]/60 border-cosmic-border/30 text-text-secondary hover:border-accent-purple/35'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className="text-sm">{m.emoji}</span>
                    <span className="text-[8px] font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-cosmic-border/20" />

            {/* Start / Stop Call Buttons */}
            {!isVoiceConnected ? (
              <button
                onClick={() => setIsVoiceConnected(true)}
                className="w-full max-w-xs py-3 rounded-full bg-gradient-to-tr from-accent-purple to-accent-teal text-[#070B14] font-bold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 animate-pulse"
              >
                <PhoneCall size={14} />
                Hubungkan Panggilan
              </button>
            ) : (
              <button
                onClick={() => setIsVoiceConnected(false)}
                className="w-full max-w-xs py-3 rounded-full bg-accent-coral text-white font-bold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover:scale-105 active:scale-95"
              >
                <PhoneOff size={14} />
                Akhiri Panggilan
              </button>
            )}
          </div>
        </div>
      ) : (
        
        // ── VIEW 2: NORMAL TEXT CHAT MODE ────────────────────────────────────
        <div className="flex-1 w-full flex flex-col justify-between bg-[#0D1424]/40 border border-cosmic-border/60 rounded-3xl p-4 md:p-6 relative overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-3 bg-[#0D1424]/60 border border-cosmic-border/60 rounded-2xl inner-glow-top">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-center relative">
                <HeartHandshake size={20} className="text-[#3ECFB2] animate-pulse-slow" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#3ECFB2] border-2 border-cosmic-bg rounded-full animate-ping" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#F0F4FF] flex items-center gap-1.5">
                  RonaAtma.AI <Sparkles size={12} className="text-accent-lavender" />
                </h1>
                <p className="text-[10px] text-accent-teal font-bold tracking-wider font-mono">ONLINE — TEKS & SUARA</p>
              </div>
            </div>
            
            {messages.length > 0 && (
              <button onClick={handleClearHistory}
                className="p-2 rounded-lg bg-[#121A30]/40 border border-cosmic-border text-[#7B8EC8] hover:text-accent-coral hover:border-accent-coral/30 transition-all"
                title="Hapus Obrolan">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Crisis Warning Banner */}
          {crisisDetected && (
            <div className="my-2 p-4 rounded-xl bg-accent-coral/15 border border-accent-coral/40 flex gap-3 text-accent-coral items-start animate-slide-up">
              <ShieldAlert size={20} className="mt-0.5 flex-shrink-0 animate-bounce" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider">Deteksi Sinyal Krisis</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Curhatmu menunjukkan bahwa kamu sedang tidak aman. AI mendeteksi kecemasan parah. Silakan buka menu <strong>Bilik Curhat</strong> untuk melaporkan secara privat. Kami peduli keselamatanmu.
                </p>
              </div>
            </div>
          )}

          {/* Message List Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[#0D1424]/30 border border-cosmic-border/30 rounded-2xl space-y-4 my-3 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#121A30] border border-cosmic-border flex items-center justify-center shadow-xl animate-float-slow">
                  <HeartHandshake size={28} className="text-accent-teal" />
                </div>
                <div className="max-w-sm space-y-2">
                  <h3 className="text-sm font-bold text-[#F0F4FF]">Halo, aku RonaAtma.AI</h3>
                  <p className="text-xs text-[#7B8EC8] leading-relaxed">
                    Teman curhat setiamu via teks dan panggilan suara. Ceritakan apa saja bebas tanpa takut privasimu bocor.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] p-3.5 px-4 rounded-2xl text-xs leading-relaxed border shadow-md transition-all
                      ${isUser 
                        ? 'bg-accent-purple/20 border-[#7C5CFC]/35 text-[#F0F4FF] rounded-tr-none' 
                        : 'bg-cosmic-card2/80 border-cosmic-border/60 text-[#F0F4FF] rounded-tl-none'}`}>
                      
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      
                      <span className="block text-[8px] font-mono text-[#526895] text-right mt-2">
                        {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#121A30]/80 border border-cosmic-border/60 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent-teal animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent-teal animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent-teal animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          {/* Form Input Area */}
          <form onSubmit={handleSend} className="flex-shrink-0 flex gap-2">
            <input 
              type="text" 
              value={inputText} 
              onChange={e => setInputText(e.target.value)}
              placeholder="Tulis pesan curhatmu di sini..." 
              className="input flex-1 py-3 px-4 focus:ring-accent-teal/50"
              disabled={loading}
            />
            {inputText.trim().length > 0 ? (
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary p-3 px-4 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/10 transition-all duration-300 transform scale-100 active:scale-95"
                title="Kirim Pesan"
              >
                <Send size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => setViewMode('voice')}
                className="p-3 px-4 rounded-xl flex items-center justify-center bg-gradient-to-tr from-accent-purple to-accent-teal text-[#070B14] hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-purple-500/10 animate-pulse"
                title="Mulai Panggilan Suara"
              >
                <Mic size={16} />
              </button>
            )}
          </form>
          
          <p className="text-[9px] text-center text-text-secondary font-mono uppercase tracking-wider mt-2">
            Percakapan terlindungi secara privat di blockchain.
          </p>
        </div>
      )}
    </div>
  );
}
