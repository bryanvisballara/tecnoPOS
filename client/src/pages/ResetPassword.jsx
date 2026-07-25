import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/reset-password', { method: 'POST', body: { token, password } });
      setOk(data.message);
      setTimeout(() => navigate('/login'), 1500);
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
        <div className="slogan">NUEVA CONTRASEÑA</div>
        {!token ? (
          <p className="error">Enlace inválido. Solicita uno nuevo.</p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Nueva contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </label>
            <label>
              Confirmar contraseña
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
            </label>
            {error && <div className="error">{error}</div>}
            {ok && <div className="badge ok">{ok}</div>}
            <button disabled={busy || !!ok}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}
        <p className="auth-footer">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
