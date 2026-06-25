import { useEffect, useState } from 'react';
import { Bell, Heart, Shield, RefreshCw, CheckCircle2, ChevronRight, Fingerprint } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Alert, AlertSeverity } from '../../types';

function playAlertChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play a gentle double chime
    // Tone 1
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.4);
    
    // Tone 2 (played slightly delayed)
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
      gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.6);
    }, 150);
  } catch (err) {
    console.warn('AudioContext not allowed or not supported:', err);
  }
}

export default function AlertsDashboard() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<AlertSeverity | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [newAlertNotice, setNewAlertNotice] = useState<string | null>(null);
  
  // Selected alert details for follow up action
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [activeTab]);

  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime-alerts-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        async (payload) => {
          console.log('Realtime alert payload:', payload);
          if (payload.eventType === 'INSERT') {
            const newAlert = payload.new;
            if (newAlert.severity === 'critical' || newAlert.severity === 'high') {
              playAlertChime();
              setNewAlertNotice(`${newAlert.title} (${newAlert.severity.toUpperCase()})`);
            }
          }
          fetchAlerts(false); // Silent refresh
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  async function fetchAlerts(showSpinner = true) {
    if (showSpinner) setLoading(true);
    let query = supabase.from('alerts')
      .select('*, student:profiles(*)')
      .eq('is_resolved', false)
      .order('triggered_at', { ascending: false });

    if (activeTab !== 'all') {
      query = query.eq('severity', activeTab);
    }

    const { data } = await query;
    if (data) setAlerts(data as Alert[]);
    if (showSpinner) setLoading(false);
  }

  async function handleResolveAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAlert || !profile || !resolutionNotes.trim() || actioning) return;

    setActioning(true);
    
    // Cryptographic anchoring of follow-up action
    let icp_anchor_id = '';
    try {
      const { data: anchorData } = await supabase.functions.invoke('blockchain-anchor', {
        body: {
          data: {
            type: 'alert_resolution',
            alert_id: selectedAlert.id,
            resolver_id: profile.id,
            resolution_notes: resolutionNotes,
          },
          dataType: 'crisisAlert',
          userId: profile.id
        }
      });
      if (anchorData?.anchorId) {
        icp_anchor_id = String(anchorData.anchorId);
      }
    } catch (err) {
      console.error(err);
    }

    const { error } = await supabase.from('alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: profile.id,
        resolution_notes: resolutionNotes,
        icp_anchor_id: icp_anchor_id || null,
      })
      .eq('id', selectedAlert.id);

    if (!error) {
      setSelectedAlert(null);
      setResolutionNotes('');
      fetchAlerts();
    } else {
      console.error(error);
    }
    setActioning(false);
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-bold text-glow-purple">Peringatan Berisiko (Early Warning)</h1>
          <p className="text-text-secondary text-sm">Deteksi dini indikasi gangguan kesehatan mental dan ancaman perundungan berdasarkan analisis AI.</p>
        </div>
        <button onClick={() => fetchAlerts()} className="p-2.5 rounded-xl bg-[#121A30]/50 border border-cosmic-border text-text-secondary hover:text-[#F0F4FF] self-start md:self-auto">
          <RefreshCw size={16} />
        </button>
      </div>

      {newAlertNotice && (
        <div className="p-4 bg-accent-coral/20 border border-accent-coral rounded-2xl flex items-center justify-between animate-pulse shadow-[0_0_20px_rgba(255,107,138,0.2)]">
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-coral opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent-coral"></span>
            </span>
            <div className="text-xs font-bold text-accent-coral uppercase tracking-wider font-mono">
              SIAGA SATU KRISIS: {newAlertNotice}
            </div>
          </div>
          <button 
            onClick={() => setNewAlertNotice(null)} 
            className="text-xs font-bold text-[#FF6B8A] hover:text-[#F0F4FF] uppercase px-3 py-1 rounded-lg bg-accent-coral/10 hover:bg-accent-coral/25 transition-colors">
            Tutup
          </button>
        </div>
      )}

      {/* Severity Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['all', 'critical', 'high', 'medium', 'low'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as AlertSeverity | 'all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap uppercase tracking-wider font-mono
              ${activeTab === tab 
                ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/50 text-accent-teal shadow-inner' 
                : 'bg-[#121A30]/50 border-cosmic-border text-[#7B8EC8] hover:text-[#F0F4FF] hover:border-cosmic-border/80'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Alerts List */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                
                return (
                  <div 
                    key={alert.id} 
                    onClick={() => setSelectedAlert(alert)}
                    className={`card p-5 cursor-pointer flex items-start justify-between gap-4 transition-all duration-300 hover:border-accent-purple/40
                      ${selectedAlert?.id === alert.id ? 'bg-[#121A30]/80 border-accent-teal/50' : 'bg-[#0D1424]/60 border-cosmic-border/40'}
                      ${isCritical ? 'border-accent-coral/60 shadow-[0_0_15px_rgba(255,107,138,0.1)]' : ''}`}>
                    
                    <div className="space-y-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase ${
                          alert.severity === 'critical' 
                            ? 'bg-accent-coral/25 text-accent-coral border border-accent-coral/30' 
                            : alert.severity === 'high' 
                            ? 'bg-accent-coral/15 text-accent-coral border border-accent-coral/20'
                            : alert.severity === 'medium' 
                            ? 'bg-accent-lavender/15 text-accent-lavender border border-accent-lavender/20' 
                            : 'bg-accent-teal/15 text-accent-teal border border-accent-teal/20'
                        }`}>
                          {alert.severity}
                        </span>
                        
                        <span className="text-[10px] font-mono text-text-secondary">
                          {new Date(alert.triggered_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <h3 className="font-display font-bold text-sm text-[#F0F4FF] leading-snug truncate">{alert.title}</h3>
                        <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">{alert.description}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-cosmic-border/30 text-[10px] text-text-secondary font-bold">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-accent-purple to-accent-teal flex items-center justify-center text-white text-[9px]">
                          {alert.student?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <span>{alert.student?.full_name} — {alert.student?.class_name || 'BK'}</span>
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-[#3D4F7A] self-center flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-12 text-center border-cosmic-border/50">
              <p className="text-text-secondary text-xs">Semua kondisi siswa terpantau aman. Tidak ada peringatan aktif saat ini.</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className={`${selectedAlert ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm lg:relative lg:inset-auto lg:z-auto lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:block lg:col-span-5' : 'hidden lg:block lg:col-span-5'}`}>
          {selectedAlert ? (
            <div className="card-luminous p-5 sm:p-6 space-y-6 w-full max-w-lg lg:max-w-none lg:sticky lg:top-20 animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-cosmic-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-accent-coral" />
                  <h3 className="font-display font-bold text-sm text-[#F0F4FF]">Tindakan Penanganan</h3>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="text-text-secondary hover:text-[#F0F4FF] text-xs font-bold uppercase">Tutup</button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-[#070B14] rounded-xl border border-cosmic-border space-y-2 text-xs">
                  <p className="text-text-secondary"><strong className="text-[#F0F4FF] font-semibold">Tipe Peringatan:</strong> {selectedAlert.alert_type.toUpperCase()}</p>
                  <p className="text-text-secondary"><strong className="text-[#F0F4FF] font-semibold">Tingkat Risiko:</strong> {selectedAlert.severity.toUpperCase()}</p>
                  <p className="text-text-secondary"><strong className="text-[#F0F4FF] font-semibold">ID Kripto Siswa:</strong> <code className="text-[10px] font-mono break-all text-[#3ECFB2]">{selectedAlert.student?.pseudonymous_id}</code></p>
                  {selectedAlert.ai_score && (
                    <div className="space-y-1">
                      <p className="text-text-secondary"><strong className="text-[#F0F4FF] font-semibold">Skor AI Sentimen:</strong> {selectedAlert.ai_score}/1.0</p>
                      <div className="w-full h-1.5 bg-cosmic-bg border border-cosmic-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent-coral" style={{ width: `${selectedAlert.ai_score * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleResolveAlert} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">Catatan Tindak Lanjut Konseling (BK)</label>
                    <textarea
                      value={resolutionNotes}
                      onChange={e => setResolutionNotes(e.target.value)}
                      placeholder="Tuliskan catatan penanganan siswa, konseling yang diberikan, rencana kedepan..."
                      rows={5}
                      className="textarea"
                      required
                    />
                  </div>

                  <div className="p-3 bg-[#070B14] rounded-xl border border-cosmic-border flex gap-2">
                    <Fingerprint size={18} className="text-accent-teal flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-text-secondary leading-normal">
                      Menyelesaikan peringatan akan mengunci tindakan konseling pada audit trail blockchain untuk akuntabilitas profesional.
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setSelectedAlert(null)}
                      className="btn-secondary flex-1 justify-center py-2.5">
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      disabled={actioning || !resolutionNotes.trim()}
                      className="btn-primary flex-1 justify-center py-2.5">
                      {actioning ? 'Memproses...' : 'Tandai Selesai'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="card p-6 border-dashed border-cosmic-border/80 text-center py-20 text-text-secondary">
              <CheckCircle2 size={32} className="text-accent-teal mx-auto mb-3" />
              <p className="text-xs">Pilih salah satu peringatan di samping untuk meninjau informasi dan menuliskan tindak lanjut penanganan.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
