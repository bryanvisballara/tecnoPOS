import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
  waiter: 'Mesero',
  cashier: 'Caja',
  kitchen: 'Cocina',
  manager: 'Gerente',
};

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api(`/api/invites/${token}`);
        if (cancelled) return;
        setInvite(data);
        setName(data.name || '');
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const accept = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const session = await api(`/api/invites/${token}/accept`, {
        method: 'POST',
        body: { name, password },
      });
      applySession(session);
      navigate('/dashboard', { replace: true });
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
        <div className="slogan">INVITACIÓN AL EQUIPO</div>

        {loading && <p className="muted">Validando invitación…</p>}

        {!loading && error && !invite && (
          <>
            <div className="error">{error}</div>
            <Link to="/login" className="muted">Ir a iniciar sesión</Link>
          </>
        )}

        {!loading && invite && (
          <form onSubmit={accept} className="stack">
            <p className="muted" style={{ margin: 0, textAlign: 'left' }}>
              Te invitaron a <strong style={{ color: 'var(--text, #f4f7fb)' }}>{invite.orgName}</strong>
              {invite.restaurantName ? ` · ${invite.restaurantName}` : ''} como{' '}
              <strong>{ROLE_LABEL[invite.role] || invite.role}</strong>.
              Crea tu contraseña para unirte.
            </p>
            <label>
              Email
              <input value={invite.email} disabled />
            </label>
            <label>
              Tu nombre
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Juan Pérez" />
            </label>
            <label>
              Contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </label>
            <label>
              Confirmar contraseña
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
            </label>
            {error && <div className="error">{error}</div>}
            <button disabled={busy}>{busy ? 'Uniendo…' : 'Aceptar e ingresar'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
