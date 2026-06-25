import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Lock, Calendar, MapPin, UserSquare2, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { IncidentType } from '../../types';

const INCIDENT_TYPES: { type: IncidentType; label: string; emoji: string; desc: string }[] = [
  { type: 'bullying', label: 'Perundungan Fisik', emoji: '👊', desc: 'Kontak fisik yang tidak diinginkan/kekerasan' },
  { type: 'verbal_abuse', label: 'Pelecehan Verbal', emoji: '🗣️', desc: 'Ejekan, makian, intimidasi lisan' },
  { type: 'cyberbullying', label: 'Cyberbullying', emoji: '📱', desc: 'Pelecehan melalui media sosial/pesan digital' },
  { type: 'sexual_harassment', label: 'Pelecehan Seksual', emoji: '⚠️', desc: 'Tindakan atau ucapan berbau seksual tidak sopan' },
  { type: 'physical_violence', label: 'Kekerasan Fisik', emoji: '💥', desc: 'Pemukulan, perkelahian sepihak, pengeroyokan' },
  { type: 'other', label: 'Lainnya', emoji: '❓', desc: 'Masalah pengecualian sosial atau intimidasi lain' },
];

export default function BullyingReport() {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [location, setLocation] = useState('');
  const [perpetratorDesc, setPerpetratorDesc] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [blockchainRecord, setBlockchainRecord] = useState<{ hash: string; tx_id: string } | null>(null);

  async function handleSubmit() {
    if (!profile || !incidentType || description.length < 30 || !incidentDate) return;

    setLoading(true);

    const newReport = {
      reporter_id: profile.id,
      victim_pseudonymous_id: profile.pseudonymous_id,
      incident_type: incidentType,
      description,
      incident_date: incidentDate,
      location: location || null,
      perpetrator_description: perpetratorDesc || null,
      status: 'pending',
    };

    const { data: insertedData, error } = await supabase
      .from('bullying_reports')
      .insert(newReport)
      .select()
      .single();

    if (!error && insertedData) {
      try {
        // Call the blockchain-anchor Edge Function
        const { data: anchorData } = await supabase.functions.invoke('blockchain-anchor', {
          body: {
            data: { incident_type: incidentType, incident_date: incidentDate, description },
            dataType: 'bullyingReport',
            userId: profile.id
          }
        });

        if (anchorData?.anchorId) {
          // Update the report with the real icp_anchor_id
          await supabase
            .from('bullying_reports')
            .update({ icp_anchor_id: String(anchorData.anchorId) })
            .eq('id', insertedData.id);

          setBlockchainRecord({ hash: anchorData.hash, tx_id: String(anchorData.anchorId) });
        }
      } catch (blockchainErr) {
        console.error("Gagal melakukan penulisan blockchain ICP:", blockchainErr);
      }

      try {
        // Invoke crisis-handler Edge Function to create alert server-side
        await supabase.functions.invoke('crisis-handler', {
          body: {
            userId: profile.id,
            triggerSource: 'bullying_report',
            content: `Laporan ${incidentType}: ${description.slice(0, 100)}`
          }
        });
      } catch (alertErr) {
        console.error("Gagal memicu alert BK:", alertErr);
      }

      setStep(3);
    } else {
      console.error("Bullying report submission failed", error);
    }
    setLoading(false);
  }

  function handleReset() {
    setStep(1);
    setIncidentType(null);
    setDescription('');
    setIncidentDate('');
    setLocation('');
    setPerpetratorDesc('');
    setBlockchainRecord(null);
  }

  return (
    <div className="iris-wipe min-h-[calc(100vh-120px)] bg-[#08091F] -m-6 p-6 md:p-8 text-[#F0F4FF] rounded-3xl relative overflow-hidden transition-all duration-500">
      
      {/* Animated background stars & ambient overlay */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-accent-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-accent-teal/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cosmic-border/50 pb-5">
          <div className="space-y-1">
            <h1 className="page-title font-bold text-glow-teal flex items-center gap-2">
              Bilik Curhat
            </h1>
            <p className="text-[#7B8EC8] text-xs leading-relaxed max-w-md">
              Saluran rahasia berkeamanan tinggi untuk melaporkan tindakan intimidasi dan perundungan.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3ECFB2]/15 border border-[#3ECFB2]/35 text-[#3ECFB2] text-[10px] font-mono font-bold tracking-widest animate-pulse">
            <Lock size={12} className="animate-pulse" />
            ANONIM TERJAMIN
          </div>
        </div>

        {/* Wizard Progress Steps Indicator */}
        {step < 3 && (
          <div className="flex items-center gap-4">
            {[1, 2].map((num) => (
              <div key={num} className="flex-1 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border transition-all duration-300
                  ${step === num 
                    ? 'bg-accent-teal border-accent-teal text-cosmic-bg shadow-md shadow-teal-500/20' 
                    : step > num 
                    ? 'bg-[#121A30] border-accent-teal text-accent-teal' 
                    : 'bg-[#121A30]/50 border-cosmic-border text-text-secondary'}`}>
                  {num}
                </div>
                <span className={`text-xs font-bold ${step === num ? 'text-accent-teal' : 'text-text-secondary'}`}>
                  {num === 1 ? 'PILIH INSIDEN' : 'FORMULIR DETAIL'}
                </span>
                {num === 1 && <div className="flex-1 h-0.5 bg-cosmic-border/60 mx-2" />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Selection */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-accent-purple/10 border border-[#7C5CFC]/30 text-xs text-[#F0F4FF] leading-relaxed flex gap-2">
              <ShieldAlert size={18} className="text-[#3ECFB2] flex-shrink-0" />
              <span>
                Identitas aslimu disembunyikan menggunakan kode pseudonim unik (<strong>{profile?.pseudonymous_id}</strong>) untuk memastikan kerahasiaan total.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INCIDENT_TYPES.map(({ type, label, emoji, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIncidentType(type)}
                  className={`card p-5 text-left border hover:border-accent-teal/50 transition-all duration-300 flex items-start gap-4 hover:-translate-y-1
                    ${incidentType === type 
                      ? 'bg-accent-purple/15 border-accent-teal/50 shadow-inner' 
                      : 'bg-[#0D1424]/60 border-cosmic-border/60'}`}>
                  <span className="text-3xl p-2 bg-[#121A30] border border-cosmic-border rounded-xl flex-shrink-0">{emoji}</span>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#F0F4FF]">{label}</p>
                    <p className="text-[11px] text-text-secondary leading-normal">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={!incidentType}
                onClick={() => setStep(2)}
                className="btn-primary">
                Lanjutkan
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Form Details */}
        {step === 2 && (
          <div className="card-luminous p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-2 text-accent-teal">
              <ShieldAlert size={18} />
              <h3 className="font-display font-bold text-sm text-[#F0F4FF]">
                Detail Laporan Perundungan ({incidentType && INCIDENT_TYPES.find(i => i.type === incidentType)?.label})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Calendar size={12} /> Tanggal Insiden
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={e => setIncidentDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <MapPin size={12} /> Lokasi Insiden
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Kantin, Kelas, Lapangan, dll."
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
                <UserSquare2 size={12} /> Ciri-ciri / Deskripsi Pelaku
              </label>
              <input
                type="text"
                value={perpetratorDesc}
                onChange={e => setPerpetratorDesc(e.target.value)}
                placeholder="Misal: Siswa kelas XII, jaket hitam, tinggi (opsional)"
                className="input"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Kronologi Kejadian (Min 30 Karakter)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Deskripsikan apa yang terjadi secara rinci. Ingat, laporan ini dilindungi kriptografi..."
                rows={6}
                className="textarea"
                required
              />
              <p className="text-[10px] text-text-secondary font-mono">{description.length} karakter</p>
            </div>

            <div className="flex justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary">
                Kembali
              </button>
              <button
                type="button"
                disabled={loading || description.length < 30 || !incidentDate}
                onClick={handleSubmit}
                className="btn-primary">
                {loading ? 'Mengirimkan...' : 'Kirim Laporan Anonim'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && (
          <div className="card p-8 text-center space-y-6 animate-fade-in border-accent-teal/40 bg-accent-teal/5">
            <div className="w-16 h-16 rounded-full bg-accent-teal/15 border border-[#3ECFB2]/50 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
              <ShieldCheck size={32} className="text-[#3ECFB2]" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="font-display font-bold text-lg text-[#F0F4FF] flex items-center justify-center gap-1.5">
                Laporan Berhasil Diamankan <Sparkles size={14} className="text-accent-lavender" />
              </h2>
              <p className="text-text-secondary text-xs leading-relaxed">
                Laporanmu telah berhasil masuk ke sistem penanganan bimbingan konseling dan tercatat pada blockchain ICP audit trail secara rahasia.
              </p>
            </div>

            {blockchainRecord && (
              <div className="p-4 rounded-xl bg-[#070B14] border border-cosmic-border text-left space-y-3 font-mono">
                <div className="flex items-center gap-1.5 text-accent-teal text-xs font-bold uppercase">
                  <Lock size={12} /> Bukti Blockchain Terdaftar
                </div>
                <div className="text-[10px] space-y-1 leading-relaxed text-[#7B8EC8]">
                  <p className="break-all"><strong className="text-[#F0F4FF]">ICP ANCHOR ID:</strong> {blockchainRecord.tx_id}</p>
                  <p className="break-all"><strong className="text-[#F0F4FF]">HASH AUDIT:</strong> {blockchainRecord.hash}</p>
                  <p><strong className="text-[#F0F4FF]">JARINGAN:</strong> Internet Computer (ICP)</p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-accent-purple/10 border border-[#7C5CFC]/30 text-xs text-text-secondary flex gap-2 max-w-md mx-auto text-left leading-relaxed">
              <AlertCircle size={16} className="text-accent-lavender flex-shrink-0 mt-0.5" />
              <span>
                Guru BK dapat melihat isi laporan ini untuk membantumu, namun identitas aslimu akan terus dianonimkan kecuali atas persetujuan darurat demi keselamatanmu.
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary">
              Laporkan Masalah Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
