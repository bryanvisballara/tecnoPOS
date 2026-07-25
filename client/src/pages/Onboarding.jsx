import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const UNITS = ['kg', 'g', 'L', 'ml', 'unidad', 'porcion'];
const STAFF_ROLES = [
  { value: 'waiter', label: 'Mesero' },
  { value: 'cashier', label: 'Caja' },
  { value: 'kitchen', label: 'Cocina' },
  { value: 'manager', label: 'Gerente' },
];

export default function Onboarding() {
  const { user, restaurantId, restaurants, applySession, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [stepId, setStepId] = useState('ingredients');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ingredients, setIngredients] = useState([]);

  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'kg', costPerUnit: '' });
  const [stockForm, setStockForm] = useState({ ingredientId: '', quantity: '10' });
  const [menuForm, setMenuForm] = useState({ name: '', price: '', categoryName: 'Platos fuertes' });
  const [tableCount, setTableCount] = useState(8);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'waiter' });
  const [restoForm, setRestoForm] = useState({ name: '', city: '', address: '' });

  const reload = useCallback(async () => {
    const data = await api(`/api/onboarding/status?restaurantId=${restaurantId}`, { restaurantId });
    setStatus(data);
    setStepId((prev) => {
      const current = data.steps.find((s) => s.id === prev);
      if (current && !current.done) return prev;
      const firstPending = data.steps.find((s) => !s.done && s.required) || data.steps.find((s) => !s.done);
      return firstPending?.id || prev;
    });
    const ings = await api('/api/menu/ingredients');
    setIngredients(ings);
    setStockForm((f) => ({ ...f, ingredientId: f.ingredientId || ings[0]?._id || '' }));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || !user) return;
    reload().catch((err) => setError(err.message));
  }, [restaurantId, user, reload]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!['owner', 'manager'].includes(user.role)) return <Navigate to="/dashboard" replace />;

  const current = status?.steps?.find((s) => s.id === stepId);

  const afterMutation = async () => {
    await reload();
    const me = await api('/api/auth/me');
    applySession(me);
  };

  const finish = async (skip = false) => {
    setBusy(true);
    setError('');
    try {
      await api(skip ? '/api/onboarding/skip' : '/api/onboarding/complete', { method: 'POST' });
      const me = await api('/api/auth/me');
      applySession(me);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitIngredient = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/ingredient', {
        method: 'POST',
        body: {
          name: ingredientForm.name,
          unit: ingredientForm.unit,
          costPerUnit: Number(ingredientForm.costPerUnit) || 0,
        },
      });
      setIngredientForm({ name: '', unit: 'kg', costPerUnit: '' });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitStock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/stock', {
        method: 'POST',
        restaurantId,
        body: {
          restaurantId,
          ingredientId: stockForm.ingredientId,
          quantity: Number(stockForm.quantity) || 0,
        },
      });
      setStockForm((f) => ({ ...f, quantity: '10' }));
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitMenu = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/menu-item', {
        method: 'POST',
        body: {
          name: menuForm.name,
          price: Number(menuForm.price),
          categoryName: menuForm.categoryName,
        },
      });
      setMenuForm({ name: '', price: '', categoryName: menuForm.categoryName });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitTables = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/tables', {
        method: 'POST',
        restaurantId,
        body: { restaurantId, count: Number(tableCount) || 8 },
      });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitStaff = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/staff', {
        method: 'POST',
        restaurantId,
        body: { ...staffForm, restaurantId },
      });
      setStaffForm({ name: '', email: '', password: '', role: 'waiter' });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitRestaurant = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/restaurant', { method: 'POST', body: restoForm });
      setRestoForm({ name: '', city: '', address: '' });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return <div className="login-page"><div className="muted">Preparando tu configuración…</div></div>;
  }

  const pct = Math.round((status.progress.requiredDone / Math.max(status.progress.requiredTotal, 1)) * 100);

  return (
    <div className="onboarding-page">
      <div className="onboarding-shell">
        <aside className="onboarding-aside panel">
          <div className="brand" style={{ padding: 0 }}>
            <img src="/logo.png" alt="TecnoPOS" />
            <div>
              <h1>Tecno<span>POS</span></h1>
              <p>Configura tu negocio</p>
            </div>
          </div>
          <p className="muted" style={{ margin: '0.75rem 0 1rem' }}>
            Hola {user.name}. Completa estos pasos para dejar tu sede lista para vender.
          </p>
          <div className="onboarding-progress">
            <div className="onboarding-progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="muted" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
            {status.progress.requiredDone}/{status.progress.requiredTotal} pasos esenciales · {restaurants.length} sede{restaurants.length === 1 ? '' : 's'}
          </div>
          <div className="onboarding-steps">
            {status.steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`onboarding-step ${stepId === s.id ? 'active' : ''} ${s.done ? 'done' : ''}`}
                onClick={() => setStepId(s.id)}
              >
                <span className="onboarding-step-num">{s.done ? '✓' : idx + 1}</span>
                <span>
                  <strong>{s.title}</strong>
                  {!s.required && <em> opcional</em>}
                </span>
              </button>
            ))}
          </div>
          <div className="stack" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            {status.requiredDone && (
              <button onClick={() => finish(false)} disabled={busy}>Finalizar y ir al panel</button>
            )}
            <button className="ghost" onClick={() => finish(true)} disabled={busy}>Omitir por ahora</button>
            <Link className="muted" to="/dashboard" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
              Ir al dashboard
            </Link>
          </div>
        </aside>

        <section className="panel onboarding-main">
          <h2 style={{ marginTop: 0 }}>{current?.title}</h2>
          <p className="muted">{current?.description}</p>
          {current?.done && <div className="badge ok" style={{ marginBottom: '0.75rem' }}>Paso completado ({current.count})</div>}
          {error && <div className="error">{error}</div>}

          {stepId === 'ingredients' && (
            <form className="stack" onSubmit={submitIngredient}>
              <label>Nombre del insumo<input value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} required placeholder="Ej. Pollo, Arroz, Queso" /></label>
              <div className="row">
                <label style={{ flex: 1 }}>Unidad
                  <select value={ingredientForm.unit} onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
                <label style={{ flex: 1 }}>Costo unitario (COP)
                  <input type="number" min="0" value={ingredientForm.costPerUnit} onChange={(e) => setIngredientForm({ ...ingredientForm, costPerUnit: e.target.value })} placeholder="12000" />
                </label>
              </div>
              <button disabled={busy}>{busy ? 'Guardando…' : 'Agregar insumo'}</button>
              <p className="muted">Puedes agregar varios. Cuando tengas al menos uno, avanza al inventario.</p>
            </form>
          )}

          {stepId === 'inventory' && (
            <form className="stack" onSubmit={submitStock}>
              {!ingredients.length ? (
                <div className="muted">Primero agrega al menos un insumo en el paso anterior.</div>
              ) : (
                <>
                  <label>Insumo
                    <select value={stockForm.ingredientId} onChange={(e) => setStockForm({ ...stockForm, ingredientId: e.target.value })} required>
                      {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                    </select>
                  </label>
                  <label>Cantidad inicial
                    <input type="number" min="0" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} required />
                  </label>
                  <button disabled={busy}>{busy ? 'Guardando…' : 'Cargar stock'}</button>
                </>
              )}
            </form>
          )}

          {stepId === 'menu' && (
            <form className="stack" onSubmit={submitMenu}>
              <label>Nombre del plato<input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required placeholder="Ej. Hamburguesa clásica" /></label>
              <label>Precio de venta (COP)<input type="number" min="0" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} required placeholder="28000" /></label>
              <label>Categoría<input value={menuForm.categoryName} onChange={(e) => setMenuForm({ ...menuForm, categoryName: e.target.value })} placeholder="Platos fuertes" /></label>
              <button disabled={busy}>{busy ? 'Guardando…' : 'Agregar plato'}</button>
              <p className="muted">Luego podrás vincular recetas e insumos desde Recetas / Menú.</p>
            </form>
          )}

          {stepId === 'tables' && (
            <form className="stack" onSubmit={submitTables}>
              <label>¿Cuántas mesas quieres crear ahora?
                <input type="number" min="1" max="40" value={tableCount} onChange={(e) => setTableCount(e.target.value)} />
              </label>
              <button disabled={busy || current?.done}>{busy ? 'Creando…' : current?.done ? 'Mesas ya creadas' : 'Crear mesas'}</button>
              <p className="muted">Se distribuirán en Salón / Terraza / VIP. Luego las puedes editar en Mesas.</p>
            </form>
          )}

          {stepId === 'staff' && (
            <form className="stack" onSubmit={submitStaff}>
              <label>Nombre<input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required /></label>
              <label>Email<input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required /></label>
              <label>Contraseña temporal<input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} minLength={6} required /></label>
              <label>Rol
                <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                  {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <button disabled={busy}>{busy ? 'Creando…' : 'Crear usuario'}</button>
              <p className="muted">Recomendado: al menos un mesero y una caja.</p>
            </form>
          )}

          {stepId === 'locations' && (
            <form className="stack" onSubmit={submitRestaurant}>
              <p className="muted" style={{ marginTop: 0 }}>
                Ya tienes {restaurants.length} sede{restaurants.length === 1 ? '' : 's'}. Puedes agregar otra ahora o hacerlo después.
              </p>
              <label>Nombre de la nueva sede<input value={restoForm.name} onChange={(e) => setRestoForm({ ...restoForm, name: e.target.value })} required placeholder="Ej. Amara Norte" /></label>
              <label>Ciudad<input value={restoForm.city} onChange={(e) => setRestoForm({ ...restoForm, city: e.target.value })} /></label>
              <label>Dirección<input value={restoForm.address} onChange={(e) => setRestoForm({ ...restoForm, address: e.target.value })} /></label>
              <button disabled={busy}>{busy ? 'Agregando…' : 'Vincular sede'}</button>
              <button type="button" className="ghost" onClick={() => finish(status.requiredDone ? false : true)} disabled={busy}>
                {status.requiredDone ? 'Finalizar configuración' : 'Continuar sin agregar sede'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
