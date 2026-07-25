import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMOS = [
  { email: 'owner@tecnopos.app', label: 'Dueño cadena' },
  { email: 'gerente@tecnopos.app', label: 'Gerente sede' },
  { email: 'mesero@tecnopos.app', label: 'Mesero' },
  { email: 'cocina@tecnopos.app', label: 'Cocina' },
  { email: 'caja@tecnopos.app', label: 'Caja' },
];

export default function Login() {
  const { login, user, homeForRole, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@tecnopos.app');
  const [password, setPassword] = useState('TecnoPOS2026!');
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
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <div className="error">{error}</div>}
          <button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <div className="demo-users">
          {DEMOS.map((d) => (
            <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword('TecnoPOS2026!'); }}>
              Demo · {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
