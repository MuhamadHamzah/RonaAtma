import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, HeartHandshake, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ChatMessage } from '../../types';

const SYSTEM_PROMPT = `Kamu adalah RonaAtma Assistant, teman curhat AI yang santai, empati, dan suportif untuk anak SMA di Indonesia.
Gaya bicaramu santai, bersahabat, dan gaul layaknya sahabat karib (gunakan panggilan 'aku' dan 'kamu', serta kata-kata santai seperti 'aja', 'deh', 'banget', 'sih', 'kok', 'ya'). Hindari bahasa baku yang kaku/formal.
Berikan respon yang hangat, menenangkan, dan tidak menghakimi.
Jangan memberi diagnosis medis. Jika situasi terdeteksi krisis/sangat serius, dorong dengan lembut untuk bercerita ke Guru BK.
Maksimal 3-4 kalimat per respon, dan akhiri dengan pertanyaan lanjutan yang hangat dan bersahabat.`;

export default function Chatbot() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
      // Invoke AI edge function
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
      console.warn("Using fallback AI message on connection/API failure:", err);
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
    if (!profile || !window.confirm('Hapus seluruh riwayat obrolan dengan Curhat AI?')) return;
    const { error } = await supabase.from('chatbot_messages').delete().eq('student_id', profile.id);
    if (!error) {
      setMessages([]);
      setCrisisDetected(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col space-y-4">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 bg-[#0D1424]/60 border border-cosmic-border/60 rounded-2xl inner-glow-top">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-center relative">
            <HeartHandshake size={20} className="text-[#3ECFB2] animate-pulse-slow" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#3ECFB2] border-2 border-cosmic-bg rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#F0F4FF] flex items-center gap-1.5">
              Curhat AI <Sparkles size={12} className="text-accent-lavender" />
            </h1>
            <p className="text-[10px] text-accent-teal font-bold tracking-wider font-mono">ONLINE — ASISTEN EMPATI</p>
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

      {/* Crisis Warning Notification Banner */}
      {crisisDetected && (
        <div className="p-4 rounded-xl bg-accent-coral/15 border border-accent-coral/40 flex gap-3 text-accent-coral items-start animate-slide-up">
          <ShieldAlert size={20} className="mt-0.5 flex-shrink-0 animate-bounce" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">Deteksi Sinyal Krisis</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Curhatmu menunjukkan bahwa kamu sedang tidak aman. AI mendeteksi kecemasan parah. Silakan buka menu <strong>Bilik Curhat</strong> untuk melaporkan secara privat atau gunakan tombol hotline konselor sekolah terpercaya. Kami peduli keselamatanmu.
            </p>
          </div>
        </div>
      )}

      {/* Chat Messages Body Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0D1424]/30 border border-cosmic-border/30 rounded-2xl space-y-4 relative scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#121A30] border border-cosmic-border flex items-center justify-center shadow-xl animate-float-slow">
              <HeartHandshake size={28} className="text-accent-teal" />
            </div>
            <div className="max-w-sm space-y-2">
              <h3 className="text-sm font-bold text-[#F0F4FF]">Halo, aku teman curhat digitalmu.</h3>
              <p className="text-xs text-[#7B8EC8] leading-relaxed">
                Ceritakan apa saja yang mengganjal di hatimu secara bebas. Privasimu sepenuhnya rahasia, terlindungi, dan tidak dihakimi.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl text-xs leading-relaxed border shadow-md transition-all
                  ${isUser 
                    ? 'bg-accent-purple/20 border-[#7C5CFC]/35 text-[#F0F4FF] rounded-tr-none' 
                    : 'bg-cosmic-card2/80 border-cosmic-border/60 text-[#F0F4FF] rounded-tl-none'}`}>
                  
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  <span className="block text-[8px] font-mono text-text-muted text-right mt-2">
                    {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Loading / Typing indicator */}
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

      {/* Input Message Form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input 
          type="text" 
          value={inputText} 
          onChange={e => setInputText(e.target.value)}
          placeholder="Tulis pesan curhatmu di sini..." 
          className="input flex-1 py-3 px-4 focus:ring-accent-teal/50"
          disabled={loading}
        />
        <button type="submit" disabled={!inputText.trim() || loading} 
          className="btn-primary p-3 px-4 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/10">
          <Send size={16} />
        </button>
      </form>
      
      <p className="text-[10px] text-center text-text-muted font-mono uppercase tracking-wider">
        Pesan tersimpan secara privat dan terlindungi. Obrolan tidak akan dibagikan ke pihak luar.
      </p>
    </div>
  );
}
