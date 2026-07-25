import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/onboarding', label: 'Configurar', roles: ['owner', 'manager'] },
  { to: '/dashboard', label: 'KPIs', roles: ['owner', 'manager', 'cashier'] },
  { to: '/tables', label: 'Mesas', roles: ['owner', 'manager', 'waiter', 'cashier'] },
  { to: '/pos', label: 'POS', roles: ['owner', 'manager', 'waiter', 'cashier'] },
  { to: '/kitchen', label: 'Cocina', roles: ['owner', 'manager', 'kitchen', 'waiter'] },
  { to: '/cash', label: 'Caja', roles: ['owner', 'manager', 'cashier'] },
  { to: '/inventory', label: 'Inventario', roles: ['owner', 'manager', 'kitchen', 'cashier'] },
  { to: '/recipes', label: 'Recetas', roles: ['owner', 'manager', 'kitchen'] },
  { to: '/menu', label: 'Menú', roles: ['owner', 'manager'] },
  { to: '/customers', label: 'Clientes', roles: ['owner', 'manager', 'waiter', 'cashier'] },
  { to: '/staff', label: 'Equipo', roles: ['owner', 'manager'] },
];

export default function Layout() {
  const { user, restaurants, restaurantId, selectRestaurant, logout, currentRestaurant, loading } = useAuth();

  if (loading) return <div className="login-page"><div className="muted">Cargando TecnoPOS…</div></div>;
  if (!user) return <Navigate to="/login" replace />;

  const links = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="TecnoPOS" />
          <div>
            <h1>Tecno<span>POS</span></h1>
            <p>Tu negocio, en control</p>
          </div>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="stack">
          <select value={restaurantId} onChange={(e) => selectRestaurant(e.target.value)}>
            {restaurants.map((r) => (
              <option key={r._id} value={r._id}>{r.name}</option>
            ))}
          </select>
          <div className="muted" style={{ fontSize: '0.82rem' }}>
            {user.name} · <span className="badge">{user.role}</span>
          </div>
          <button className="ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <h2>{currentRestaurant?.name || 'TecnoPOS'}</h2>
            <div className="meta">{currentRestaurant?.city} · {currentRestaurant?.address}</div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
