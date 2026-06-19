import { useEffect, useState } from 'react';
import { Sparkles, Shield, Heart, Award, Copy, Check, Fingerprint, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { anchorRecord, shortHash } from '../../lib/blockchain';
import type { DigitalBadge } from '../../types';

export default function Web3Hub() {
  const { profile, refreshProfile, linkExternalWallet } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Status check counts
  const [reportCount, setReportCount] = useState(0);
  const [moodCount, setMoodCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  
  // Badges lists
  const [badges, setBadges] = useState<DigitalBadge[]>([]);
  const [mintingType, setMintingType] = useState<'resilience' | 'advocate' | 'pioneer' | null>(null);
  const [mintStep, setMintStep] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchUserStats();
      fetchBadges();
    }
  }, [profile]);

  async function fetchUserStats() {
    if (!profile) return;
    const [reports, moods, posts] = await Promise.all([
      supabase.from('bullying_reports').select('*', { count: 'exact', head: true }).eq('reporter_id', profile.id),
      supabase.from('mood_entries').select('*', { count: 'exact', head: true }).eq('student_id', profile.id),
      supabase.from('forum_posts').select('*', { count: 'exact', head: true }).eq('author_id', profile.id),
    ]);
    
    setReportCount(reports.count || 0);
    setMoodCount(moods.count || 0);
    setPostCount(posts.count || 0);
  }

  async function fetchBadges() {
    if (!profile) return;
    const { data } = await supabase.from('digital_badges').select('*').eq('student_id', profile.id);
    if (data) setBadges(data as DigitalBadge[]);
  }

  function handleCopy() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function connectMetaMask() {
    setLoading(true);
    // Simulate Metamask provider connection delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate derived wallet as mockup address
    const mockAddr = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const { error } = await linkExternalWallet(mockAddr);
    if (!error) {
      await refreshProfile();
    }
    setLoading(false);
  }

  // Multi-step Mint SBT Badge Simulation
  async function mintSBT(type: 'resilience' | 'advocate' | 'pioneer') {
    if (!profile) return;
    setMintingType(type);
    setMintStep(1); // 1. Verify eligibility

    await new Promise(resolve => setTimeout(resolve, 1500));
    setMintStep(2); // 2. Generating hash audit on-chain

    const blockchainRecord = await anchorRecord({
      type: 'badge_mint',
      student_id: profile.id,
      badge_type: type,
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1500));
    setMintStep(3); // 3. Minting block write

    const newBadge = {
      student_id: profile.id,
      badge_type: type,
      minted_tx: blockchainRecord.tx_id,
      on_chain_hash: blockchainRecord.hash,
    };

    const { error } = await supabase.from('digital_badges').insert(newBadge);
    if (!error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMintStep(4); // 4. Complete
      fetchBadges();
    } else {
      console.error(error);
      setMintingType(null);
    }
  }

  const badgeTemplates = [
    {
      type: 'resilience' as const,
      label: 'Lencana Pemberani (Resilience Badge)',
      desc: 'Diberikan kepada siswa yang berani bersuara dengan melaporkan tindakan bullying.',
      icon: Shield,
      color: 'text-accent-teal border-[#3ECFB2]/30 bg-[#3ECFB2]/5',
      eligible: reportCount >= 1,
      req: 'Laporkan minimal 1 tindakan bullying di Bilik Curhat.'
    },
    {
      type: 'advocate' as const,
      label: 'Advokasi Kesehatan Mental (Advocate Badge)',
      desc: 'Diberikan atas komitmen melacak kondisi emosional secara konsisten.',
      icon: Heart,
      color: 'text-accent-purple border-[#7C5CFC]/30 bg-[#7C5CFC]/5',
      eligible: moodCount >= 3,
      req: 'Catat refleksi harian minimal 3 kali di Mood Tracker.'
    },
    {
      type: 'pioneer' as const,
      label: 'Pionir Komunitas (Pioneer Badge)',
      desc: 'Diberikan kepada kontributor yang membagikan afirmasi positif di SafeSpace.',
      icon: Award,
      color: 'text-accent-lavender border-[#A78BFA]/30 bg-[#A78BFA]/5',
      eligible: postCount >= 1,
      req: 'Buat minimal 1 postingan positif di SafeSpace Forum.'
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="page-title font-bold text-glow-purple">Loker Digital & Web3 SBT</h1>
        <p className="text-text-secondary text-sm">Soulbound Tokens (SBT) adalah tanda penghargaan permanen yang tidak dapat diperjualbelikan atas dedikasimu mendukung kesehatan mental sekolah.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section - Wallet Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-luminous p-6 space-y-6 relative overflow-hidden" 
            style={{ background: 'linear-gradient(135deg, rgba(13,20,36,0.9) 0%, rgba(30,45,74,0.4) 100%)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-purple/10 rounded-full blur-2xl" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-teal">
                <Fingerprint size={20} className="animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Dompet Digital</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-accent-teal/15 text-[8px] font-mono text-accent-teal font-bold uppercase tracking-widest">
                Web 2.5 SECURE
              </span>
            </div>

            <div className="space-y-4">
              {profile?.wallet_address ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-text-secondary font-mono font-bold uppercase tracking-wider">ALAMAT DOMPET DETIL</p>
                    <div className="flex items-center justify-between bg-[#070B14] p-3 rounded-xl border border-cosmic-border">
                      <span className="font-mono text-[10px] text-[#3ECFB2] break-all select-all">
                        {profile.wallet_address}
                      </span>
                      <button onClick={handleCopy} className="text-[#7B8EC8] hover:text-[#F0F4FF] ml-2 flex-shrink-0">
                        {copied ? <Check size={14} className="text-accent-teal" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-text-secondary font-mono font-bold uppercase tracking-wider">PSEUDONYMOUS ID KRIPTO</p>
                    <p className="font-mono text-xs text-text-secondary">{profile.pseudonymous_id}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-4">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Anda belum mengaitkan dompet Web3 eksternal (misal: MetaMask).
                  </p>
                  <button 
                    onClick={connectMetaMask} 
                    disabled={loading}
                    className="btn-primary w-full justify-center text-xs uppercase font-bold py-3">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menghubungkan MetaMask...
                      </span>
                    ) : 'Hubungkan MetaMask'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-[#070B14]/80 rounded-xl border border-cosmic-border text-[10px] text-text-secondary leading-normal">
              <strong>Info SBT:</strong> Penghargaan diikat langsung secara matematis pada identitas kriptografimu. Lencana ini merepresentasikan rekam medismu demi pengembangan pribadimu.
            </div>
          </div>
        </div>

        {/* Right Section - Badges */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title font-bold">Lencana SBT Tersedia</h2>
            <button onClick={fetchBadges} className="p-2 rounded-lg bg-[#121A30]/50 border border-cosmic-border text-text-secondary hover:text-[#F0F4FF]">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badgeTemplates.map((badge) => {
              const Icon = badge.icon;
              const hasBadge = badges.find(b => b.badge_type === badge.type);
              
              return (
                <div 
                  key={badge.type} 
                  className={`card p-5 border flex flex-col justify-between transition-all duration-300 relative overflow-hidden group
                    ${hasBadge 
                      ? 'border-[#3ECFB2]/30 shadow-[0_4px_30px_rgba(62,207,178,0.05)] bg-[#121A30]/80' 
                      : 'border-cosmic-border/40 bg-[#0D1424]/40'}`}>
                  
                  {/* Holographic Shimmer Glow effect on issued badges */}
                  {hasBadge && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                  )}

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${badge.color}`}>
                        <Icon size={24} className={hasBadge ? 'text-accent-teal animate-pulse-slow' : 'text-[#7B8EC8]'} />
                      </div>
                      
                      {hasBadge ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#3ECFB2]/15 border border-[#3ECFB2]/30 text-[9px] font-mono font-bold tracking-wider text-[#3ECFB2]">
                          TERBIT (ISSUED)
                        </span>
                      ) : badge.eligible ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-accent-purple/20 border border-accent-purple/40 text-[9px] font-mono font-bold tracking-wider text-accent-lavender">
                          SIAP KLAIM
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#3D4F7A]/25 border border-cosmic-border text-[9px] font-mono font-bold tracking-wider text-text-secondary">
                          TERKUNCI
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-sm text-[#F0F4FF]">{badge.label}</h3>
                      <p className="text-text-secondary text-[11px] leading-relaxed">{badge.desc}</p>
                    </div>
                  </div>

                  {/* Mint Action Panel */}
                  <div className="pt-4 border-t border-cosmic-border/30 mt-4 space-y-3">
                    {!hasBadge && (
                      <div className="text-[10px] text-text-secondary leading-normal">
                        <strong>Kriteria:</strong> {badge.req}
                      </div>
                    )}
                    
                    {hasBadge ? (
                      <div className="space-y-1 font-mono text-[9px] text-[#3D4F7A]">
                        <p className="truncate"><strong>HASH:</strong> {hasBadge.on_chain_hash}</p>
                        <p className="truncate"><strong>TXID:</strong> {hasBadge.minted_tx}</p>
                      </div>
                    ) : badge.eligible ? (
                      <button 
                        onClick={() => mintSBT(badge.type)}
                        className="btn-primary w-full justify-center text-xs py-2">
                        Klaim Lencana SBT
                      </button>
                    ) : (
                      <button disabled className="btn-secondary w-full justify-center text-xs py-2 opacity-50 cursor-not-allowed">
                        Belum Memenuhi Syarat
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Mint Loading Simulation Dialog Overlay */}
      {mintingType && mintStep < 4 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmic-bg/85 backdrop-blur-md animate-fade-in">
          <div className="card-luminous w-full max-w-sm p-6 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-[#121A30] border border-cosmic-border rounded-full shadow-2xl">
              <div className="absolute inset-0 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
              <Fingerprint size={32} className="text-accent-teal animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-[#F0F4FF] text-sm uppercase tracking-wide">Proses Minting Lencana</h3>
              <p className="text-text-secondary text-xs">Menulis pencatatan prestasi siswa secara permanen ke ledger kriptografi audit trail.</p>
            </div>

            <div className="space-y-2 text-left font-mono text-[10px] bg-[#070B14] p-3 rounded-xl border border-cosmic-border">
              <div className={`flex items-center justify-between ${mintStep >= 1 ? 'text-[#3ECFB2]' : 'text-text-secondary'}`}>
                <span>1. Verifikasi Kelayakan Prestasi</span>
                <span>{mintStep >= 1 ? 'SELESAI' : 'PENDING'}</span>
              </div>
              <div className={`flex items-center justify-between ${mintStep >= 2 ? 'text-[#3ECFB2]' : 'text-text-secondary'}`}>
                <span>2. Hitung Hash Pengaman</span>
                <span>{mintStep >= 2 ? 'SELESAI' : 'PENDING'}</span>
              </div>
              <div className={`flex items-center justify-between ${mintStep >= 3 ? 'text-[#3ECFB2]' : 'text-text-secondary'}`}>
                <span>3. Kirim Ledger Blockchain</span>
                <span>{mintStep >= 3 ? 'SELESAI' : 'PENDING'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mint Success Dialog Overlay */}
      {mintingType && mintStep === 4 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmic-bg/85 backdrop-blur-md animate-fade-in">
          <div className="card-luminous w-full max-w-sm p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-accent-teal/15 border border-[#3ECFB2]/50 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
              <Sparkles size={28} className="text-[#3ECFB2] animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-display font-bold text-[#F0F4FF] text-sm">Lencana Berhasil Terbit!</h3>
              <p className="text-text-secondary text-xs leading-relaxed">
                Penghargaan Soulbound Token milikmu secara permanen diterbitkan pada blockchain audit trail.
              </p>
            </div>

            <button onClick={() => setMintingType(null)} className="btn-primary w-full justify-center text-xs py-2">
              Selesai & Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
