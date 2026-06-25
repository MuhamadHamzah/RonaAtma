import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldAlert as ShieldIcon, Lock, Unlock, Calendar, MapPin, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { BullyingReport, ReportStatus } from '../../types';

export default function ReportsDashboard() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<BullyingReport[]>([]);
  const [activeTab, setActiveTab] = useState<ReportStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  
  // Selected report detail follow-up states
  const [selectedReport, setSelectedReport] = useState<BullyingReport | null>(null);
  const [revealReporter, setRevealReporter] = useState(false);
  const [bkNotes, setBkNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  async function fetchReports() {
    setLoading(true);
    let query = supabase.from('bullying_reports')
      .select('*, reporter:profiles(*)')
      .order('created_at', { ascending: false });

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab);
    }

    const { data } = await query;
    if (data) setReports(data as BullyingReport[]);
    setLoading(false);
  }

  // Update status transitions (investigation, resolution, escalation)
  async function handleUpdateStatus(newStatus: ReportStatus) {
    if (!selectedReport || !profile || updating) return;
    setUpdating(true);

    let icp_anchor_id = selectedReport.icp_anchor_id || '';
    let on_chain_hash = selectedReport.on_chain_hash || '';
    
    // Anchor update history to blockchain
    try {
      const { data: anchorData } = await supabase.functions.invoke('blockchain-anchor', {
        body: {
          data: {
            type: 'report_status_update',
            report_id: selectedReport.id,
            updater_id: profile.id,
            new_status: newStatus,
            notes: bkNotes
          },
          dataType: 'bullyingReport',
          userId: profile.id
        }
      });
      if (anchorData?.anchorId) {
        icp_anchor_id = String(anchorData.anchorId);
        on_chain_hash = anchorData.hash;
      }
    } catch (err) {
      console.error(err);
    }

    const { error } = await supabase.from('bullying_reports')
      .update({
        status: newStatus,
        bk_notes: bkNotes || null,
        on_chain_hash,
        icp_anchor_id: icp_anchor_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedReport.id);

    if (!error) {
      setSelectedReport(null);
      setRevealReporter(false);
      setBkNotes('');
      fetchReports();
    } else {
      console.error(error);
    }
    setUpdating(false);
  }

  const statusColors = {
    pending: 'bg-accent-coral/15 text-accent-coral border-accent-coral/30',
    in_review: 'bg-accent-lavender/15 text-accent-lavender border-accent-lavender/30',
    resolved: 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
    escalated: 'bg-accent-coral/25 text-accent-coral border-accent-coral/40 animate-pulse'
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-bold text-glow-purple">Laporan Perundungan Masuk</h1>
          <p className="text-text-secondary text-sm">Kelola laporan penindasan secara adil, aman, dan terlindungi kriptografi.</p>
        </div>
        <button onClick={fetchReports} className="p-2.5 rounded-xl bg-[#121A30]/50 border border-cosmic-border text-text-secondary hover:text-[#F0F4FF] self-start md:self-auto">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['all', 'pending', 'in_review', 'resolved', 'escalated'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as ReportStatus | 'all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap uppercase tracking-wider font-mono
              ${activeTab === tab 
                ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/50 text-accent-teal shadow-inner' 
                : 'bg-[#121A30]/50 border-cosmic-border text-[#7B8EC8] hover:text-[#F0F4FF] hover:border-cosmic-border/80'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Reports Stream */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <div 
                  key={report.id}
                  onClick={() => { setSelectedReport(report); setRevealReporter(false); setBkNotes(report.bk_notes || ''); }}
                  className={`card p-5 cursor-pointer border hover:border-accent-purple/35 transition-all duration-300 flex flex-col justify-between
                    ${selectedReport?.id === report.id ? 'bg-[#121A30]/80 border-accent-teal/50' : 'bg-[#0D1424]/40 border-cosmic-border/40'}`}>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border ${statusColors[report.status]}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#F0F4FF] leading-snug uppercase tracking-wider text-accent-teal">
                        INSIDEN: {report.incident_type.toUpperCase()}
                      </p>
                      <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">{report.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-cosmic-border/30 mt-4 text-[10px] text-text-secondary font-bold">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {report.incident_date}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {report.location || 'Tidak Terdata'}</span>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center border-cosmic-border/50">
              <p className="text-text-secondary text-xs">Belum ada laporan perundungan yang terdaftar.</p>
            </div>
          )}
        </div>

        {/* Report Detail & Actions panel */}
        <div className={`${selectedReport ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm lg:relative lg:inset-auto lg:z-auto lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:block lg:col-span-5' : 'hidden lg:block lg:col-span-5'}`}>
          {selectedReport ? (
            <div className="card-luminous p-5 sm:p-6 space-y-6 w-full max-w-lg lg:max-w-none lg:sticky lg:top-20 animate-slide-up max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-cosmic-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldIcon size={18} className="text-accent-coral" />
                  <h3 className="font-display font-bold text-sm text-[#F0F4FF]">Detail Laporan Kasus</h3>
                </div>
                <button onClick={() => { setSelectedReport(null); setRevealReporter(false); }} className="text-text-secondary hover:text-[#F0F4FF] text-xs font-bold uppercase">Tutup</button>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-text-secondary">
                <div className="p-3 bg-[#070B14] rounded-xl border border-cosmic-border space-y-2">
                  <p><strong className="text-[#F0F4FF]">Pengadu (Kripto ID):</strong> <code className="text-[10px] font-mono text-accent-teal break-all">{selectedReport.victim_pseudonymous_id}</code></p>
                  <p><strong className="text-[#F0F4FF]">Tipe Laporan:</strong> {selectedReport.incident_type.toUpperCase()}</p>
                  <p><strong className="text-[#F0F4FF]">Ciri Pelaku:</strong> {selectedReport.perpetrator_description || 'Tidak diisi'}</p>
                  <p><strong className="text-[#F0F4FF]">Tanggal Insiden:</strong> {selectedReport.incident_date}</p>
                </div>

                <div className="space-y-1">
                  <strong className="text-[#F0F4FF] text-xs">Kronologi Kejadian:</strong>
                  <p className="p-3 bg-[#070B14]/60 border border-cosmic-border/40 rounded-xl max-h-40 overflow-y-auto leading-relaxed text-[#F0F4FF]">
                    {selectedReport.description}
                  </p>
                </div>

                {/* Identity Reveal Gate System */}
                <div className="p-3 bg-[#121A30]/60 border border-cosmic-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#F0F4FF] flex items-center gap-1">
                      <Lock size={12} className="text-accent-teal" /> IDENTITAS PENGADU
                    </span>
                    <button 
                      onClick={() => setRevealReporter(!revealReporter)}
                      className="text-accent-teal hover:underline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      {revealReporter ? <><EyeOff size={12} /> Sembunyikan</> : <><Eye size={12} /> Buka Kunci</>}
                    </button>
                  </div>
                  
                  {revealReporter ? (
                    <div className="p-2 bg-[#070B14] border border-[#FF6B8A]/30 rounded-lg text-accent-coral space-y-1 font-mono text-[10px]">
                      <p><strong>NAMA LENGKAP:</strong> {selectedReport.reporter?.full_name}</p>
                      <p><strong>EMAIL:</strong> {selectedReport.reporter?.email || 'N/A'}</p>
                      <p><strong>KELAS:</strong> {selectedReport.reporter?.class_name || 'BK'}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-text-muted">Identitas terenkripsi. Tekan "Buka Kunci" untuk otorisasi akses darurat.</p>
                  )}
                </div>

                {/* BK Resolution Notes Form */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">Catatan Bimbingan Konseling (BK)</label>
                  <textarea
                    value={bkNotes}
                    onChange={e => setBkNotes(e.target.value)}
                    placeholder="Tuliskan catatan penyelidikan, konfirmasi kasus, keputusan tindakan..."
                    rows={4}
                    className="textarea"
                  />
                </div>

                {selectedReport.on_chain_hash && (
                  <div className="font-mono text-[9px] text-text-muted break-all">
                    <strong className="text-text-secondary">AUDIT HASH:</strong> {selectedReport.on_chain_hash}
                  </div>
                )}

                {/* Action Transitions */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => handleUpdateStatus('in_review')}
                    disabled={selectedReport.status === 'in_review' || updating}
                    className="btn-secondary justify-center py-2 text-[10px]">
                    Tinjau Kasus
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('resolved')}
                    disabled={selectedReport.status === 'resolved' || updating}
                    className="btn-primary justify-center py-2 text-[10px]">
                    Selesaikan
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('escalated')}
                    disabled={selectedReport.status === 'escalated' || updating}
                    className="btn-danger justify-center py-2 text-[10px]">
                    Eskalasi
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="card p-6 border-dashed border-cosmic-border/80 text-center py-20 text-text-secondary">
              <ShieldAlert size={32} className="text-accent-teal mx-auto mb-3" />
              <p className="text-xs">Pilih salah satu laporan di samping untuk memverifikasi detail kronologi dan memperbarui status penanganan.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
