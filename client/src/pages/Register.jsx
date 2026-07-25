import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES, getCountry } from '../data/countries';

export default function Register() {
  const { applySession, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneCountry: 'CO',
    phone: '',
    organizationName: '',
    restaurantName: '',
    city: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const country = useMemo(() => getCountry(form.phoneCountry), [form.phoneCountry]);

  if (!loading && user) return <Navigate to="/onboarding" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const buildPayload = () => ({
    ...form,
    phoneDial: country.dial,
    phoneE164: `${country.dial}${form.phone.replace(/\D/g, '')}`,
  });

  const requestCode = async (e) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      setError('Ingresa tu número de teléfono');
      return;
    }
    setBusy(true);
    setError('');
    setModalError('');
    try {
      const data = await api('/api/auth/register/request', { method: 'POST', body: buildPayload() });
      setInfo(data.message);
      setCode('');
      setModalOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setModalError('');
    try {
      const data = await api('/api/auth/register/verify', {
        method: 'POST',
        body: { email: form.email, code },
      });
      applySession(data);
      navigate('/onboarding');
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setModalError('');
    try {
      const data = await api('/api/auth/register/request', { method: 'POST', body: buildPayload() });
      setInfo(data.message);
      setCode('');
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="panel login-card login-card-wide">
        <img src="/logo.png" alt="TecnoPOS" />
        <h1>Tecno<span>POS</span></h1>
        <div className="slogan">CREA TU CUENTA</div>

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
            Teléfono
            <div className="phone-row">
              <select
                className="phone-country"
                value={form.phoneCountry}
                onChange={set('phoneCountry')}
                aria-label="País"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.dial})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d\s-]/g, '') }))}
                placeholder="300 123 4567"
                required
              />
            </div>
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
          <button disabled={busy}>{busy && !modalOpen ? 'Enviando código…' : 'Continuar'}</button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="verify-title">
          <div className="modal-card panel">
            <h2 id="verify-title">Confirma tu correo</h2>
            <p className="muted">
              Enviamos un código de 6 dígitos a <strong>{form.email}</strong>. Expira en 15 minutos.
            </p>
            {info && <div className="badge ok">{info}</div>}
            <form className="stack" onSubmit={verifyCode}>
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
                  autoFocus
                  required
                />
              </label>
              {modalError && <div className="error">{modalError}</div>}
              <button disabled={busy || code.length !== 6}>
                {busy ? 'Creando cuenta…' : 'Confirmar y crear cuenta'}
              </button>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="ghost" disabled={busy} onClick={resend}>
                  Reenviar código
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={busy}
                  onClick={() => { setModalOpen(false); setCode(''); setModalError(''); }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
