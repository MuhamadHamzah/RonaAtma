import { useEffect, useState } from 'react';
import { MessageSquare, Heart, PlusCircle, Check, EyeOff, Sparkles, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ForumPost, ForumCategory } from '../../types';

const CATEGORIES: { value: ForumCategory; label: string; icon: string }[] = [
  { value: 'curhat', label: 'Curhat', icon: '💬' },
  { value: 'motivasi', label: 'Motivasi', icon: '🔥' },
  { value: 'tips', label: 'Tips', icon: '💡' },
  { value: 'tanya_jawab', label: 'Tanya Jawab', icon: '❓' },
  { value: 'cerita', label: 'Cerita', icon: '📖' },
];

export default function SafeSpace() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<ForumCategory | 'all'>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ForumCategory>('curhat');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  async function fetchPosts() {
    setLoading(true);
    let query = supabase.from('forum_posts')
      .select('*, author:profiles(*)')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (activeCategory !== 'all') {
      query = query.eq('category', activeCategory);
    }

    const { data } = await query;
    if (data && profile) {
      // Fetch upvotes to check if user has upvoted
      const { data: upvotes } = await supabase.from('forum_upvotes').select('post_id').eq('user_id', profile.id);
      const upvotedIds = new Set(upvotes?.map(u => u.post_id) || []);
      
      const mapped = (data as ForumPost[]).map(post => ({
        ...post,
        has_upvoted: upvotedIds.has(post.id)
      }));
      setPosts(mapped);
    }
    setLoading(false);
  }

  async function handleUpvote(postId: string, hasUpvoted: boolean) {
    if (!profile) return;

    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          has_upvoted: !hasUpvoted,
          upvotes: hasUpvoted ? p.upvotes - 1 : p.upvotes + 1
        };
      }
      return p;
    }));

    if (hasUpvoted) {
      await supabase.from('forum_upvotes').delete().eq('user_id', profile.id).eq('post_id', postId);
      await supabase.rpc('decrement_upvotes', { post_id: postId });
    } else {
      await supabase.from('forum_upvotes').insert({ user_id: profile.id, post_id: postId });
      await supabase.rpc('increment_upvotes', { post_id: postId });
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    // AI Content Moderation Check
    let moderationStatus: 'approved' | 'flagged' | 'rejected' = 'approved';
    let moderationReason = '';

    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { content: `${title}\n\n${content}` }
      });
      if (error || !data) {
        throw new Error(error?.message || 'Empty or invalid response from moderation function');
      }
      moderationStatus = data.status;
      moderationReason = data.reason || '';
    } catch (err) {
      console.warn("Using local bad words filter moderation fallback", err);
      const badWords = ['anjing', 'bangsat', 'babi', 'goblok', 'tolol', 'bodoh', 'kontol', 'memek', 'ngentot'];
      const combined = `${title} ${content}`.toLowerCase();
      const hasBadWord = badWords.some(w => combined.includes(w));
      if (hasBadWord) {
        moderationStatus = 'flagged';
        moderationReason = 'Terdeteksi bahasa kasar / tidak pantas.';
      }
    }

    if (moderationStatus === 'rejected') {
      setError('Postingan ditolak oleh moderator AI: ' + moderationReason);
      setSubmitting(false);
      return;
    }

    const newPost = {
      author_id: profile.id,
      title,
      content,
      category,
      is_anonymous: isAnonymous,
      moderation_status: moderationStatus,
      moderation_reason: moderationReason || null,
      upvotes: 0,
      reply_count: 0
    };

    const { error: insertError } = await supabase.from('forum_posts').insert(newPost);
    if (!insertError) {
      setTitle('');
      setContent('');
      setIsAnonymous(false);
      setIsModalOpen(false);
      
      if (moderationStatus === 'flagged') {
        alert('Postinganmu memerlukan review manual oleh Guru BK karena mengandung konten sensitif.');
      } else {
        fetchPosts();
      }
    } else {
      setError('Gagal membuat postingan. Silakan coba lagi.');
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-bold text-glow-purple">SafeSpace Community</h1>
          <p className="text-text-secondary text-sm">Diskusikan emosi, tips, dan dapatkan dukungan nyata tanpa rasa cemas.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex-shrink-0">
          <PlusCircle size={16} />
          Buat Diskusi Baru
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border
            ${activeCategory === 'all' 
              ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/50 text-accent-teal shadow-inner' 
              : 'bg-[#121A30]/50 border-cosmic-border text-[#7B8EC8] hover:text-[#F0F4FF] hover:border-cosmic-border/80'}`}>
          💬 Semua
        </button>
        {CATEGORIES.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setActiveCategory(value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap
              ${activeCategory === value 
                ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/50 text-accent-teal shadow-inner' 
                : 'bg-[#121A30]/50 border-cosmic-border text-[#7B8EC8] hover:text-[#F0F4FF] hover:border-cosmic-border/80'}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Postings Stream */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="card p-5 border-cosmic-border/40 hover:border-accent-purple/35 flex flex-col justify-between transition-all duration-300">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge-low text-[9px]">
                    {CATEGORIES.find(c => c.value === post.category)?.icon}{' '}
                    {CATEGORIES.find(c => c.value === post.category)?.label}
                  </span>
                  
                  <span className="text-[10px] font-mono text-text-secondary">
                    {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-bold text-sm text-[#F0F4FF] line-clamp-1 leading-snug">{post.title}</h3>
                  <p className="text-text-secondary text-xs leading-relaxed line-clamp-3">{post.content}</p>
                </div>
              </div>

              {/* Bottom Card Footer Panel */}
              <div className="flex items-center justify-between pt-4 border-t border-cosmic-border/30 mt-4">
                <div className="flex items-center gap-3">
                  {post.is_anonymous ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#3D4F7A]/25 border border-cosmic-border text-[9px] text-[#7B8EC8] font-bold">
                      <EyeOff size={10} /> Anonim
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-accent-purple to-accent-teal flex items-center justify-center text-white text-[9px] font-bold">
                        {post.author?.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-bold text-[#F0F4FF]">{post.author?.full_name?.split(' ')[0]}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleUpvote(post.id, !!post.has_upvoted)}
                    className={`flex items-center gap-1.5 text-xs font-mono font-bold transition-colors
                      ${post.has_upvoted ? 'text-[#FF6B8A]' : 'text-text-secondary hover:text-[#FF6B8A]'}`}>
                    <Heart size={14} className={post.has_upvoted ? 'fill-accent-coral text-accent-coral' : ''} />
                    {post.upvotes}
                  </button>
                  
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-text-secondary">
                    <MessageSquare size={14} />
                    {post.reply_count}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center border-cosmic-border/50">
          <p className="text-text-secondary text-xs">Belum ada diskusi dalam kategori ini.</p>
        </div>
      )}

      {/* Write Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmic-bg/80 backdrop-blur-md animate-fade-in">
          <div className="card-luminous w-full max-w-lg p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-cosmic-border/40 pb-3">
              <h3 className="font-display font-bold text-[#F0F4FF] text-base flex items-center gap-1.5">
                <Sparkles size={16} className="text-accent-teal" /> Buat Diskusi Baru
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-[#F0F4FF] text-sm font-bold uppercase">Tutup</button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Judul Topik</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Masukkan judul permasalahan/curhatan..." 
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Kategori</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value as ForumCategory)}
                    className="input">
                    {CATEGORIES.map(({ value, label }) => (
                      <option key={value} value={value} className="bg-cosmic-card1 text-[#F0F4FF]">{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-[#121A30]/50 border border-cosmic-border rounded-xl">
                    <input 
                      type="checkbox" 
                      checked={isAnonymous} 
                      onChange={e => setIsAnonymous(e.target.checked)}
                      className="accent-accent-teal"
                    />
                    <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                      <EyeOff size={12} /> Sembunyikan Nama
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Isi Pesan Curhat</label>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)}
                  placeholder="Tulis pesanmu di sini secara terbuka..."
                  rows={5}
                  className="textarea"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-accent-coral/15 border border-accent-coral/30 text-accent-coral text-xs font-bold">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5 text-xs font-bold uppercase tracking-wider">
                {submitting ? 'Memproses postingan...' : 'Kirim Postingan'}
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
