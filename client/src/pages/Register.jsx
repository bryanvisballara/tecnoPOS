import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { applySession, user, homeForRole, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    restaurantName: '',
    city: '',
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homeForRole(user.role)} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const requestCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/register/request', { method: 'POST', body: form });
      setInfo(data.message);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/register/verify', {
        method: 'POST',
        body: { email: form.email, code },
      });
      applySession(data);
      navigate(homeForRole(data.user.role));
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
      const data = await api('/api/auth/register/request', { method: 'POST', body: form });
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
      <div className="panel login-card login-card-wide">
        <img src="/logo.png" alt="TecnoPOS" />
        <h1>Tecno<span>POS</span></h1>
        <div className="slogan">{step === 'code' ? 'VERIFICA TU CORREO' : 'CREA TU CUENTA'}</div>

        {step === 'form' ? (
          <form onSubmit={requestCode}>
            <label>
              Tu nombre
              <input value={form.name} onChange={set('name')} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={set('email')} required />
            </label>
            <label>
              Contraseña
              <input type="password" value={form.password} onChange={set('password')} minLength={6} required />
            </label>
            <label>
              Nombre de tu cadena / negocio
              <input value={form.organizationName} onChange={set('organizationName')} required />
            </label>
            <label>
              Primer restaurante
              <input value={form.restaurantName} onChange={set('restaurantName')} placeholder="Opcional" />
            </label>
            <label>
              Ciudad
              <input value={form.city} onChange={set('city')} placeholder="Opcional" />
            </label>
            {error && <div className="error">{error}</div>}
            <button disabled={busy}>{busy ? 'Enviando código…' : 'Continuar'}</button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <p className="muted" style={{ margin: 0, textAlign: 'left' }}>
              Enviamos un código de 6 dígitos a <strong>{form.email}</strong>. Expira en 15 minutos.
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
            {error && <div className="error">{error}</div>}
            <button disabled={busy || code.length !== 6}>{busy ? 'Verificando…' : 'Crear cuenta'}</button>
            <button type="button" className="ghost" disabled={busy} onClick={resend}>
              Reenviar código
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={() => { setStep('form'); setCode(''); setError(''); }}>
              Volver
            </button>
          </form>
        )}

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
