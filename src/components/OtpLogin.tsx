import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './OtpLogin.css';

export default function OtpLogin({ onSuccess }: { onSuccess?: () => void }) {
  const { sendOtp, verifyOtp } = useAuth();
  const [step,    setStep]    = useState<'phone'|'code'>('phone');
  const [phone,   setPhone]   = useState('');
  const [code,    setCode]    = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const doSend = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const otp = await sendOtp(phone.trim());
      if (otp) setDevCode(otp);
      setStep('code');
    } catch(ex) { setErr(ex instanceof Error ? ex.message : 'Erreur'); }
    finally     { setLoading(false); }
  };

  const doVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await verifyOtp(phone.trim(), code.trim()); onSuccess?.(); }
    catch(ex) { setErr(ex instanceof Error ? ex.message : 'Code incorrect'); }
    finally   { setLoading(false); }
  };

  return (
    <div className="otp">
      {step === 'phone' ? (
        <form onSubmit={doSend} className="otp-form">
          {err && <p className="otp-err">{err}</p>}
          <input
            type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
            placeholder="+33 6 00 00 00 00" required
            className="otp-input"
          />
          <button type="submit" disabled={loading} className="otp-btn">
            {loading ? 'Envoi…' : 'Recevoir le code →'}
          </button>
        </form>
      ) : (
        <form onSubmit={doVerify} className="otp-form">
          <p className="otp-sent">Code envoyé au <strong>{phone}</strong></p>
          {devCode && (
            <div className="otp-dev">
              🛠 Dev — code : <strong>{devCode}</strong>
            </div>
          )}
          {err && <p className="otp-err">{err}</p>}
          <input
            type="text" value={code} onChange={e=>setCode(e.target.value)}
            placeholder="• • • • • •" maxLength={6} required
            className="otp-input otp-code"
          />
          <button type="submit" disabled={loading} className="otp-btn">
            {loading ? 'Vérification…' : 'Confirmer'}
          </button>
          <button type="button" className="otp-back" onClick={()=>{setStep('phone');setCode('');setErr('');}}>
            ← Changer de numéro
          </button>
        </form>
      )}
    </div>
  );
}
