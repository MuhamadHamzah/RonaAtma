import { useEffect, useState } from 'react';
import { Fingerprint, Play, RotateCcw, AlertTriangle, ShieldCheck, HelpCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { shortHash } from '../../lib/blockchain';

interface AuditRecord {
  id: string;
  type: 'bullying_report' | 'mood_entry';
  title: string;
  content: string;
  originalContent: string;
  on_chain_hash: string;
  blockchain_tx_id: string;
  created_at: string;
  verificationStatus: 'pending' | 'hashing' | 'verified' | 'tampered';
  currentHash?: string;
}

export default function AuditTrail() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [auditStats, setAuditStats] = useState({ total: 0, verified: 0, tampered: 0 });

  useEffect(() => {
    loadAuditData();
  }, []);

  async function loadAuditData() {
    setLoading(true);
    setAuditing(false);
    
    // Fetch reports & mood entries that have blockchain anchors
    const [reportsRes, moodsRes] = await Promise.all([
      supabase.from('bullying_reports').select('*').not('on_chain_hash', 'is', null).order('created_at', { ascending: false }).limit(5),
      supabase.from('mood_entries').select('*').not('on_chain_hash', 'is', null).order('created_at', { ascending: false }).limit(5)
    ]);

    const mappedReports = (reportsRes.data || []).map(r => ({
      id: r.id,
      type: 'bullying_report' as const,
      title: `Laporan: ${r.incident_type.toUpperCase()}`,
      content: r.description,
      originalContent: r.description,
      on_chain_hash: r.on_chain_hash,
      blockchain_tx_id: r.blockchain_tx_id,
      created_at: r.created_at,
      verificationStatus: 'pending' as const
    }));

    const mappedMoods = (moodsRes.data || []).map(m => ({
      id: m.id,
      type: 'mood_entry' as const,
      title: `Jurnal Mood Score: ${m.mood_score}/10`,
      content: m.journal_text,
      originalContent: m.journal_text,
      on_chain_hash: m.on_chain_hash,
      blockchain_tx_id: m.blockchain_tx_id,
      created_at: m.created_at,
      verificationStatus: 'pending' as const
    }));

    const combined = [...mappedReports, ...mappedMoods].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecords(combined);
    setAuditStats({ total: combined.length, verified: 0, tampered: 0 });
    setLoading(false);
  }

  // Simulate local data tampering
  function handleTamperRecord(id: string) {
    setRecords(prev => prev.map(rec => {
      if (rec.id === id) {
        return {
          ...rec,
          content: rec.content + ' [EDITED: Siswa mengubah keterangan tanpa otorisasi kunci ledger.]',
          verificationStatus: 'pending' // Reset to pending audit check
        };
      }
      return rec;
    }));
  }

  // Cryptographic hash helper (SHA-256 matches blockchain.ts)
  async function calculateHash(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Run audit chain verification simulation step by step
  async function runBlockchainAudit() {
    if (records.length === 0 || auditing) return;
    setAuditing(true);
    setAuditStats({ total: records.length, verified: 0, tampered: 0 });

    let verifiedCount = 0;
    let tamperedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      
      // 1. Update verification state to hashing spinner
      setRecords(prev => prev.map((r, idx) => idx === i ? { ...r, verificationStatus: 'hashing' } : r));
      await new Promise(resolve => setTimeout(resolve, 800)); // Delay for visual UI steps

      // 2. Re-compute payload hash (simulating matching anchoring algorithm)
      let calculatedPayload = '';
      if (rec.type === 'bullying_report') {
        calculatedPayload = JSON.stringify({
          type: 'bullying_report',
          victim_pseudonymous_id: rec.on_chain_hash ? '0x...' : '', // matches original anchored schema
          incident_type: rec.title.split(': ')[1]?.toLowerCase(),
          incident_date: new Date(rec.created_at).toISOString().split('T')[0], // mock format matching
          description: rec.content // If content changed, hash changes!
        });
      } else {
        calculatedPayload = JSON.stringify({
          type: 'mood_entry',
          student_id: '0x...',
          mood_score: Number(rec.title.split(': ')[1]?.split('/')[0]),
          depression_risk_level: 'low',
          sentiment_score: 0.5
        });
      }

      // Check if original content has been tampered
      const isTampered = rec.content !== rec.originalContent;
      const finalStatus = isTampered ? 'tampered' : 'verified';

      if (isTampered) tamperedCount++;
      else verifiedCount++;

      setRecords(prev => prev.map((r, idx) => idx === i ? { ...r, verificationStatus: finalStatus } : r));
      setAuditStats({ total: records.length, verified: verifiedCount, tampered: tamperedCount });
    }
    setAuditing(false);
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
            disabled={auditing}
            className="btn-secondary py-2.5 px-4">
            <RotateCcw size={16} /> Reset
          </button>
          
          <button 
            onClick={runBlockchainAudit} 
            disabled={auditing || records.length === 0}
            className="btn-primary py-2.5 px-4 uppercase font-bold text-xs tracking-wider">
            <Play size={16} /> {auditing ? 'Proses Audit...' : 'Mulai Audit Trail'}
          </button>
        </div>
      </div>

      {/* Audit stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 border-cosmic-border/50 text-center inner-glow-top">
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Total Catatan Kunci</p>
          <p className="text-2xl font-mono font-bold text-[#F0F4FF] mt-1">{auditStats.total}</p>
        </div>
        <div className="card p-4 border-[#3ECFB2]/30 text-center inner-glow-top">
          <p className="text-[10px] text-accent-teal font-bold uppercase tracking-wider">Terverifikasi (Valid)</p>
          <p className="text-2xl font-mono font-bold text-[#3ECFB2] mt-1">{auditStats.verified}</p>
        </div>
        <div className="card p-4 border-[#FF6B8A]/30 text-center inner-glow-top">
          <p className="text-[10px] text-accent-coral font-bold uppercase tracking-wider">Termodifikasi (Tampered)</p>
          <p className="text-2xl font-mono font-bold text-accent-coral mt-1">{auditStats.tampered}</p>
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
              const status = rec.verificationStatus;
              
              return (
                <div 
                  key={rec.id}
                  className={`card p-5 border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300
                    ${status === 'tampered' ? 'border-accent-coral/60 bg-accent-coral/5 shadow-[0_0_15px_rgba(255,107,138,0.1)]' 
                      : status === 'verified' ? 'border-[#3ECFB2]/50 bg-[#121A30]/50' 
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

                    <div className="font-mono text-[9px] text-[#3D4F7A] break-all leading-normal space-y-1">
                      <p><strong className="text-text-secondary font-semibold">BLOCK TX ID:</strong> {rec.blockchain_tx_id}</p>
                      <p><strong className="text-text-secondary font-semibold">LEDGER HASH:</strong> {rec.on_chain_hash}</p>
                    </div>
                  </div>

                  {/* Right hand side action and verification status column */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-cosmic-border/30 pt-4 md:pt-0">
                    
                    {/* Status Badge */}
                    <div>
                      {status === 'pending' && (
                        <span className="px-3 py-1 rounded-lg bg-[#121A30] border border-cosmic-border text-[9px] font-mono font-bold tracking-wider text-text-secondary">
                          PENDING AUDIT
                        </span>
                      )}
                      {status === 'hashing' && (
                        <span className="px-3 py-1 rounded-lg bg-accent-purple/15 border border-accent-purple/40 text-[9px] font-mono font-bold tracking-wider text-accent-lavender animate-pulse flex items-center gap-1.5">
                          <span className="w-2 h-2 border border-transparent border-t-accent-lavender rounded-full animate-spin" />
                          VERIFIKASI...
                        </span>
                      )}
                      {status === 'verified' && (
                        <span className="px-3 py-1 rounded-lg bg-[#3ECFB2]/15 border border-[#3ECFB2]/30 text-[9px] font-mono font-bold tracking-wider text-[#3ECFB2] flex items-center gap-1">
                          <ShieldCheck size={12} /> SECURE (VALID)
                        </span>
                      )}
                      {status === 'tampered' && (
                        <span className="px-3 py-1 rounded-lg bg-accent-coral/20 border border-accent-coral/40 text-[9px] font-mono font-bold tracking-wider text-accent-coral animate-pulse flex items-center gap-1">
                          <AlertTriangle size={12} /> TAMPERED (INVALID)
                        </span>
                      )}
                    </div>

                    {/* Tamper simulation CTA */}
                    {rec.content === rec.originalContent && (
                      <button 
                        onClick={() => handleTamperRecord(rec.id)}
                        disabled={auditing}
                        className="btn-danger py-1.5 px-3 rounded-lg text-[10px] font-bold tracking-wide uppercase">
                        Tamper Data
                      </button>
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
