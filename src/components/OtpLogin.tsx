import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCabinetAccessDigits, isCabinetAccessPhone } from '../lib/cabinetAccessPhone';
import './OtpLogin.css';

export type OtpLoginSuccessInfo = { role: 'CLIENT' | 'ADMIN' };

type Props = {
  onSuccess?: (info?: OtpLoginSuccessInfo) => void;
  /**
   * true = même formulaire patient + praticien (numéro réservé → OTP cabinet).
   * false = uniquement patient (ex. depuis la réservation) — numéro réservé refusé.
   */
  allowCabinetAccess?: boolean;
  /** Mise en page pleine hauteur avec champs en bas (page Connexion). */
  layout?: 'default' | 'hero';
};

export default function OtpLogin({
  onSuccess,
  allowCabinetAccess = false,
  layout = 'default',
}: Props) {
  const { sendOtp, verifyOtp, proSendOtp, proVerifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const doSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const p = phone.trim();
      if (!allowCabinetAccess && isCabinetAccessPhone(p)) {
        setErr(
          'Ce numéro est réservé au cabinet dentaire. Pour vous connecter en tant que praticien, utilisez « Se connecter » dans le menu.',
        );
        return;
      }
      const otp =
        allowCabinetAccess && isCabinetAccessPhone(p)
          ? await proSendOtp(p)
          : await sendOtp(p);
      if (otp) setDevCode(otp);
      setStep('code');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const doVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const p = phone.trim();
      if (allowCabinetAccess && isCabinetAccessPhone(p)) {
        await proVerifyOtp(p, code.trim());
        onSuccess?.({ role: 'ADMIN' });
      } else {
        await verifyOtp(p, code.trim());
        onSuccess?.({ role: 'CLIENT' });
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  const rootClass = layout === 'hero' ? 'otp otp--hero' : 'otp';

  return (
    <div className={rootClass}>
      {step === 'phone' ? (
        <form onSubmit={doSend} className="otp-form">
          {err && <p className="otp-err">{err}</p>}
          {layout === 'hero' && (
            <label className="otp-label" htmlFor="otp-phone-input">
              Numéro de téléphone
            </label>
          )}
          <input
            id={layout === 'hero' ? 'otp-phone-input' : undefined}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={
              layout === 'hero' ? '06 12 34 56 78' : '+33 6 12 34 56 78'
            }
            required
            minLength={6}
            className={
              layout === 'hero' ? 'otp-input otp-input--phone' : 'otp-input'
            }
            autoComplete="tel"
          />
          {layout === 'hero' && (
            <p className="otp-hint">
              Patient : votre mobile · Praticien : code cabinet{' '}
              <span className="otp-hint-code">{getCabinetAccessDigits()}</span>
            </p>
          )}
          <button type="submit" disabled={loading} className="otp-btn">
            {loading
              ? 'Envoi…'
              : layout === 'hero'
                ? 'Recevoir le code par SMS'
                : 'Recevoir le code →'}
          </button>
        </form>
      ) : (
        <form onSubmit={doVerify} className="otp-form">
          {layout === 'hero' ? (
            <label className="otp-label" htmlFor="otp-code-input">
              Code à 6 chiffres
            </label>
          ) : null}
          {layout === 'hero' ? (
            <p className="otp-sent otp-sent--hero">
              Envoyé au <span className="otp-sent-num">{phone}</span>
            </p>
          ) : (
            <p className="otp-sent">
              Code envoyé au <strong>{phone}</strong>
            </p>
          )}
          {devCode && (
            <div className="otp-dev">
              🛠 Dev — code : <strong>{devCode}</strong>
            </div>
          )}
          {err && <p className="otp-err">{err}</p>}
          <input
            id={layout === 'hero' ? 'otp-code-input' : undefined}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={layout === 'hero' ? '0 0 0 0 0 0' : '• • • • • •'}
            maxLength={6}
            required
            className="otp-input otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <button type="submit" disabled={loading} className="otp-btn">
            {loading
              ? 'Vérification…'
              : layout === 'hero'
                ? 'Se connecter'
                : 'Confirmer'}
          </button>
          <button
            type="button"
            className="otp-back"
            onClick={() => {
              setStep('phone');
              setCode('');
              setErr('');
              setDevCode('');
            }}
          >
            ← Changer de numéro
          </button>
        </form>
      )}
    </div>
  );
}
