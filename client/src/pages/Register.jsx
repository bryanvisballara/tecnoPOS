import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { applySession, user, homeForRole, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    restaurantName: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homeForRole(user.role)} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: form });
      applySession(data);
      navigate(homeForRole(data.user.role));
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
        <div className="slogan">CREA TU CUENTA</div>
        <form onSubmit={submit}>
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
          <button disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
        </form>
        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
