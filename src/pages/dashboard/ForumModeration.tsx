import { useEffect, useState } from 'react';
import { BookOpen, Check, X, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ForumPost } from '../../types';

export default function ForumModeration() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'flagged'>('flagged');
  const [loading, setLoading] = useState(true);
  
  const [actionReason, setActionReason] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchModerationQueue();
  }, [activeTab]);

  async function fetchModerationQueue() {
    setLoading(true);
    const { data } = await supabase.from('forum_posts')
      .select('*, author:profiles(*)')
      .eq('moderation_status', activeTab)
      .order('created_at', { ascending: false });

    if (data) setPosts(data as ForumPost[]);
    setLoading(false);
  }

  async function handleModeration(postId: string, status: 'approved' | 'rejected') {
    if (!profile || updatingId) return;
    setUpdatingId(postId);

    const { error } = await supabase.from('forum_posts')
      .update({
        moderation_status: status,
        moderation_reason: actionReason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (!error) {
      setActionReason('');
      fetchModerationQueue();
    } else {
      console.error(error);
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title font-bold text-glow-purple">Moderasi Forum SafeSpace</h1>
          <p className="text-text-secondary text-sm">Tinjau postingan siswa yang ditandai secara otomatis oleh AI sebelum ditampilkan di publik.</p>
        </div>
        <button onClick={fetchModerationQueue} className="p-2.5 rounded-xl bg-[#121A30]/50 border border-cosmic-border text-text-secondary hover:text-[#F0F4FF]">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Queue Selection Tabs */}
      <div className="flex gap-2 border-b border-cosmic-border/40 pb-2">
        <button
          onClick={() => setActiveTab('flagged')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border
            ${activeTab === 'flagged' 
              ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/50 text-accent-teal shadow-inner' 
              : 'bg-[#121A30]/50 border-cosmic-border text-[#7B8EC8]'}`}>
          ⚠️ Ditandai AI ({activeTab === 'flagged' ? posts.length : '?'})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border
            ${activeTab === 'pending' 
              ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/50 text-accent-teal shadow-inner' 
              : 'bg-[#121A30]/50 border-cosmic-border text-[#7B8EC8]'}`}>
          ⏳ Menunggu Review ({activeTab === 'pending' ? posts.length : '?'})
        </button>
      </div>

      {/* List Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="card p-5 border-[#FF6B8A]/30 flex flex-col justify-between space-y-4 hover:border-accent-purple/40 transition-all duration-300">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge-low text-[9px]">{post.category.toUpperCase()}</span>
                  <span className="text-[10px] font-mono text-text-secondary">
                    {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-bold text-sm text-[#F0F4FF] leading-snug">{post.title}</h3>
                  <p className="text-text-secondary text-xs leading-relaxed">{post.content}</p>
                </div>

                {/* AI flag reason */}
                {post.moderation_reason && (
                  <div className="p-3 bg-[#FF6B8A]/10 border border-[#FF6B8A]/30 rounded-xl flex gap-2 text-accent-coral text-[11px] leading-relaxed">
                    <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                    <span><strong>Alasan AI:</strong> {post.moderation_reason}</span>
                  </div>
                )}
              </div>

              {/* Action moderation area */}
              <div className="pt-4 border-t border-cosmic-border/30 space-y-3">
                <input
                  type="text"
                  placeholder="Alasan persetujuan/penolakan (opsional)..."
                  value={updatingId === post.id ? actionReason : ''}
                  onChange={e => { setActionReason(e.target.value); setUpdatingId(post.id); }}
                  className="input py-2 text-xs"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => handleModeration(post.id, 'rejected')}
                    disabled={updatingId !== null}
                    className="btn-danger flex-1 justify-center py-2 text-xs">
                    <X size={14} /> Tolak Post
                  </button>
                  <button
                    onClick={() => handleModeration(post.id, 'approved')}
                    disabled={updatingId !== null}
                    className="btn-primary flex-1 justify-center py-2 text-xs">
                    <Check size={14} /> Setujui Post
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center border-cosmic-border/50">
          <BookOpen size={32} className="text-accent-teal mx-auto mb-3" />
          <p className="text-xs text-text-secondary">Antrean moderasi kosong. Semua postingan aman dipublikasikan.</p>
        </div>
      )}
    </div>
  );
}
