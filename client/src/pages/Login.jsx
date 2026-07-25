import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10.6 10.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9.9 5.2A10.5 10.5 0 0112 5c5 0 9.3 3.1 10.7 7.5a11.3 11.3 0 01-4.1 5.3M6.1 6.1A11.2 11.2 0 001.3 12.5C2.7 16.9 7 20 12 20c1.5 0 2.9-.3 4.2-.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12.5C3.5 8.1 7.5 5 12 5s8.5 3.1 10 7.5c-1.5 4.4-5.5 7.5-10 7.5S3.5 16.9 2 12.5z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Login() {
  const { login, user, homeForRole, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homeForRole(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await login(email, password);
      navigate(homeForRole(data.user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="panel login-card">
        <img src="/brand.png" alt="TecnoPOS" />
        <h1>Tecno<span>POS</span></h1>
        <div className="slogan">TU NEGOCIO, EN CONTROL</div>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Contraseña
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </label>
          <div className="auth-links">
            <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </div>
          {error && <div className="error">{error}</div>}
          <button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <p className="auth-footer">
          ¿Aún no tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
