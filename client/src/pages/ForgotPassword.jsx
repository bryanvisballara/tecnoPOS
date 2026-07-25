import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setInfo(data.message);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/reset-password', {
        method: 'POST',
        body: { email, code, password },
      });
      setInfo(data.message);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setInfo(data.message);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="panel login-card">
        <img src="/logo.png" alt="TecnoPOS" />
        <h1>Tecno<span>POS</span></h1>
        <div className="slogan">{step === 'email' ? 'RECUPERAR ACCESO' : 'CÓDIGO Y NUEVA CLAVE'}</div>

        {step === 'email' ? (
          <form onSubmit={requestCode}>
            <p className="muted" style={{ margin: 0, textAlign: 'left' }}>
              Te enviaremos un código de 6 dígitos a tu correo. Expira en 15 minutos.
            </p>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {error && <div className="error">{error}</div>}
            <button disabled={busy}>{busy ? 'Enviando…' : 'Enviar código'}</button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <p className="muted" style={{ margin: 0, textAlign: 'left' }}>
              Revisa <strong>{email}</strong> e ingresa el código junto con tu nueva contraseña.
            </p>
            {info && <div className="badge ok">{info}</div>}
            <label>
              Código de verificación
              <input
                className="otp-input"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
              />
            </label>
            <label>
              Nueva contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </label>
            <label>
              Confirmar contraseña
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
            </label>
            {error && <div className="error">{error}</div>}
            <button disabled={busy || code.length !== 6}>{busy ? 'Guardando…' : 'Restablecer contraseña'}</button>
            <button type="button" className="ghost" disabled={busy} onClick={resend}>
              Reenviar código
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
