import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setResult(data);
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
        <div className="slogan">RECUPERAR ACCESO</div>
        {!result ? (
          <form onSubmit={submit}>
            <p className="muted" style={{ margin: 0, textAlign: 'left' }}>
              Ingresa tu email y te daremos el enlace para restablecer tu contraseña.
            </p>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {error && <div className="error">{error}</div>}
            <button disabled={busy}>{busy ? 'Enviando…' : 'Continuar'}</button>
          </form>
        ) : (
          <div className="stack" style={{ textAlign: 'left' }}>
            <p className="muted" style={{ margin: 0 }}>{result.message}</p>
            {result.resetUrl && (
              <Link className="auth-cta" to={result.resetUrl.replace(/^https?:\/\/[^/]+/, '')}>
                Restablecer contraseña
              </Link>
            )}
          </div>
        )}
        <p className="auth-footer">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
