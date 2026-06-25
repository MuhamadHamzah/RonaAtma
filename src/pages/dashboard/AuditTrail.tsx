import { useEffect, useState } from 'react';
import { ShieldCheck, HelpCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditRecord {
  id: string;
  type: 'bullying_report' | 'mood_entry';
  title: string;
  content: string;
  icp_anchor_id?: string;
  created_at: string;
}

export default function AuditTrail() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditData();
  }, []);

  async function loadAuditData() {
    setLoading(true);
    
    // Fetch reports & mood entries
    const [reportsRes, moodsRes] = await Promise.all([
      supabase.from('bullying_reports').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('mood_entries').select('*').order('created_at', { ascending: false }).limit(10)
    ]);

    const mappedReports = (reportsRes.data || []).map(r => ({
      id: r.id,
      type: 'bullying_report' as const,
      title: `Laporan: ${r.incident_type.toUpperCase()}`,
      content: r.description,
      icp_anchor_id: r.icp_anchor_id || undefined,
      created_at: r.created_at,
    }));

    const mappedMoods = (moodsRes.data || []).map(m => ({
      id: m.id,
      type: 'mood_entry' as const,
      title: `Jurnal Mood Score: ${m.mood_score}/10`,
      content: m.journal_text,
      icp_anchor_id: m.icp_anchor_id || undefined,
      created_at: m.created_at,
    }));

    const combined = [...mappedReports, ...mappedMoods].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecords(combined);
    setLoading(false);
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-bold text-glow-purple">Audit Trail & Integritas Blockchain</h1>
          <p className="text-text-secondary text-sm">Verifikasi keaslian dan bukti anti-tamper catatan kesehatan mental dan pelaporan perundungan.</p>
        </div>
        
        <div className="flex gap-2 self-start md:self-auto">
          <button 
            onClick={loadAuditData} 
            disabled={loading}
            className="btn-primary py-2.5 px-4 uppercase font-bold text-xs tracking-wider flex items-center gap-2">
            <RotateCcw size={16} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Audit stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 border-cosmic-border/50 text-center inner-glow-top">
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Total Catatan</p>
          <p className="text-2xl font-mono font-bold text-[#F0F4FF] mt-1">{records.length}</p>
        </div>
        <div className="card p-4 border-[#3ECFB2]/30 text-center inner-glow-top">
          <p className="text-[10px] text-accent-teal font-bold uppercase tracking-wider">Terverifikasi On-Chain</p>
          <p className="text-2xl font-mono font-bold text-[#3ECFB2] mt-1">{records.filter(r => r.icp_anchor_id).length}</p>
        </div>
        <div className="card p-4 border-[#3D4F7A]/30 text-center inner-glow-top">
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Belum On-Chain</p>
          <p className="text-2xl font-mono font-bold text-text-secondary mt-1">{records.filter(r => !r.icp_anchor_id).length}</p>
        </div>
      </div>

      {/* Record list container */}
      <div className="space-y-4">
        <h2 className="section-title font-bold">Ledger Konseling Sekolah</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-4">
            {records.map((rec) => {
              const hasAnchor = !!rec.icp_anchor_id;
              
              return (
                <div 
                  key={rec.id}
                  className={`card p-5 border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300
                    ${hasAnchor ? 'border-[#3ECFB2]/50 bg-[#121A30]/50' 
                      : 'border-cosmic-border/40 bg-[#0D1424]/40'}`}>
                  
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border
                        ${rec.type === 'bullying_report' ? 'bg-accent-purple/15 text-accent-lavender border-accent-purple/35' : 'bg-accent-teal/15 text-accent-teal border-accent-teal/30'}`}>
                        {rec.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {new Date(rec.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-sm text-[#F0F4FF] leading-snug">{rec.title}</h3>
                      <p className="text-text-secondary text-xs leading-relaxed break-words font-mono bg-[#070B14]/40 p-3 rounded-lg border border-cosmic-border/40">
                        {rec.content}
                      </p>
                    </div>

                    {rec.icp_anchor_id && (
                      <div className="font-mono text-[9px] text-[#3D4F7A] break-all leading-normal space-y-1">
                        <p><strong className="text-text-secondary font-semibold">ICP ANCHOR ID:</strong> #{rec.icp_anchor_id}</p>
                        <p>
                          <strong className="text-text-secondary font-semibold">ICP CANISTER CONTRACT: </strong>
                          <a 
                            href={`https://dashboard.internetcomputer.org/canister/${import.meta.env.VITE_ICP_CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai'}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-accent-teal hover:underline"
                          >
                            {import.meta.env.VITE_ICP_CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai'}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Verification status column */}
                  <div className="flex items-center justify-end">
                    {hasAnchor ? (
                      <span className="px-3 py-1 rounded-lg bg-[#3ECFB2]/15 border border-[#3ECFB2]/30 text-[9px] font-mono font-bold tracking-wider text-[#3ECFB2] flex items-center gap-1">
                        <ShieldCheck size={12} /> ON-CHAIN (VERIFIED)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-[#121A30] border border-cosmic-border text-[9px] font-mono font-bold tracking-wider text-text-secondary">
                        BELUM ON-CHAIN
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-12 text-center border-cosmic-border/50">
            <HelpCircle size={32} className="text-accent-teal mx-auto mb-3" />
            <p className="text-xs text-text-secondary">Belum ada data rekam medis terdaftar on-chain untuk diaudit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
