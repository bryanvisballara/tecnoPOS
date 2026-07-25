import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, money } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const UNITS = ['kg', 'g', 'L', 'ml', 'unidad', 'porcion'];
const STAFF_ROLES = [
  { value: 'waiter', label: 'Mesero' },
  { value: 'cashier', label: 'Caja' },
  { value: 'kitchen', label: 'Cocina' },
  { value: 'manager', label: 'Gerente' },
];
const ROLE_LABEL = Object.fromEntries(STAFF_ROLES.map((r) => [r.value, r.label]));

export default function Onboarding() {
  const { user, restaurantId, restaurants, applySession, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [stepId, setStepId] = useState('ingredients');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [ingredients, setIngredients] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [staff, setStaff] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', unit: 'kg', costPerUnit: '' });
  const [editingStockId, setEditingStockId] = useState(null);
  const [stockEditDraft, setStockEditDraft] = useState({ onHand: '' });
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [menuEditDraft, setMenuEditDraft] = useState({ name: '', price: '' });
  const [editingTableId, setEditingTableId] = useState(null);
  const [tableEditDraft, setTableEditDraft] = useState({ name: '', seats: '4', zone: 'Salón' });
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffEditDraft, setStaffEditDraft] = useState({ name: '', role: 'waiter' });
  const [editingRestoId, setEditingRestoId] = useState(null);
  const [restoEditDraft, setRestoEditDraft] = useState({ name: '', city: '', address: '' });

  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'kg', costPerUnit: '' });
  const [stockForm, setStockForm] = useState({ ingredientId: '', quantity: '10' });
  const [menuForm, setMenuForm] = useState({ name: '', price: '', categoryName: 'Platos fuertes' });
  const [tableForm, setTableForm] = useState({ name: '', seats: '4', zone: 'Salón', count: '1' });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'waiter' });
  const [restoForm, setRestoForm] = useState({ name: '', city: '', address: '' });

  const reload = useCallback(async () => {
    const data = await api(`/api/onboarding/status?restaurantId=${restaurantId}`, { restaurantId });
    setStatus(data);
    const [ings, stock, items, tableList, users] = await Promise.all([
      api('/api/menu/ingredients'),
      api(`/api/inventory/stock?restaurantId=${restaurantId}`, { restaurantId }).catch(() => []),
      api('/api/menu/items').catch(() => []),
      api(`/api/tables?restaurantId=${restaurantId}`, { restaurantId }).catch(() => []),
      api('/api/users').catch(() => []),
    ]);
    setIngredients(ings);
    setStockRows(stock);
    setMenuItems(items);
    setTables(tableList);
    setStaff(users.filter((u) => u.role !== 'owner'));
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
  const nextStep = status?.steps?.find((_, idx) => {
    const currentIdx = status.steps.findIndex((x) => x.id === stepId);
    return idx === currentIdx + 1;
  });
  const ingredientOptions = useMemo(
    () => ingredients.map((i) => ({ value: i._id, label: `${i.name} (${i.unit})` })),
    [ingredients]
  );

  const afterMutation = async (refreshSession = false) => {
    await reload();
    if (refreshSession) {
      const me = await api('/api/auth/me');
      applySession(me);
    }
  };

  const goNext = () => {
    if (nextStep) setStepId(nextStep.id);
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

  const saveIngredient = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/menu/ingredients/${id}`, {
        method: 'PATCH',
        body: {
          name: editDraft.name.trim(),
          unit: editDraft.unit,
          costPerUnit: Number(editDraft.costPerUnit) || 0,
        },
      });
      setEditingId(null);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeIngredient = async (id) => {
    if (!confirm('¿Quitar este insumo?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/menu/ingredients/${id}`, { method: 'PATCH', body: { active: false } });
      setEditingId(null);
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

  const saveStock = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/onboarding/quick/stock/${id}`, {
        method: 'PATCH',
        restaurantId,
        body: { restaurantId, onHand: Number(stockEditDraft.onHand) || 0 },
      });
      setEditingStockId(null);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeStock = async (id) => {
    if (!confirm('¿Quitar este stock?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/onboarding/quick/stock/${id}`, { method: 'DELETE', restaurantId });
      setEditingStockId(null);
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

  const saveMenu = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/menu/items/${id}`, {
        method: 'PATCH',
        body: { name: menuEditDraft.name.trim(), price: Number(menuEditDraft.price) || 0 },
      });
      setEditingMenuId(null);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeMenu = async (id) => {
    if (!confirm('¿Quitar este plato?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/menu/items/${id}`, { method: 'PATCH', body: { available: false } });
      setEditingMenuId(null);
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
        body: {
          restaurantId,
          count: Number(tableForm.count) || 1,
          name: tableForm.name || undefined,
          seats: Number(tableForm.seats) || 4,
          zone: tableForm.zone,
        },
      });
      setTableForm({ name: '', seats: '4', zone: 'Salón', count: '1' });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTable = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/onboarding/quick/tables/${id}`, {
        method: 'PATCH',
        restaurantId,
        body: {
          restaurantId,
          name: tableEditDraft.name.trim(),
          seats: Number(tableEditDraft.seats) || 4,
          zone: tableEditDraft.zone,
        },
      });
      setEditingTableId(null);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeTable = async (id) => {
    if (!confirm('¿Quitar esta mesa?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/onboarding/quick/tables/${id}`, { method: 'DELETE', restaurantId });
      setEditingTableId(null);
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

  const saveStaff = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/users/${id}`, {
        method: 'PATCH',
        body: { name: staffEditDraft.name.trim(), role: staffEditDraft.role },
      });
      setEditingStaffId(null);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeStaff = async (id) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/users/${id}`, { method: 'PATCH', body: { active: false } });
      setEditingStaffId(null);
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
      await afterMutation(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveRestaurant = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/restaurants/${id}`, {
        method: 'PATCH',
        body: {
          name: restoEditDraft.name.trim(),
          city: restoEditDraft.city,
          address: restoEditDraft.address,
        },
      });
      setEditingRestoId(null);
      await afterMutation(true);
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
  const visibleMenu = menuItems.filter((m) => m.available !== false);
  const visibleStaff = staff.filter((u) => u.active !== false);

  const ContinueBtn = ({ ready }) =>
    ready && nextStep ? (
      <button type="button" onClick={goNext}>Continuar a {nextStep.title}</button>
    ) : null;

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
            <button className="ghost" onClick={() => finish(true)} disabled={busy}>Omitir por ahora y salir</button>
          </div>
        </aside>

        <section className="panel onboarding-main">
          <h2 style={{ marginTop: 0 }}>{current?.title}</h2>
          <p className="muted">{current?.description}</p>
          {current?.done && <div className="badge ok" style={{ marginBottom: '0.75rem' }}>Paso completado ({current.count})</div>}
          {error && <div className="error">{error}</div>}

          {stepId === 'ingredients' && (
            <div className="stack">
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
              </form>
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Insumos agregados ({ingredients.length})</h3>
                {!ingredients.length ? <p className="muted">Aún no has agregado insumos.</p> : (
                  <table className="table">
                    <thead><tr><th>Nombre</th><th>Unidad</th><th>Costo</th><th></th></tr></thead>
                    <tbody>
                      {ingredients.map((item) => (
                        <tr key={item._id}>
                          {editingId === item._id ? (
                            <>
                              <td><input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} /></td>
                              <td>
                                <select value={editDraft.unit} onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}>
                                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <td><input type="number" min="0" value={editDraft.costPerUnit} onChange={(e) => setEditDraft({ ...editDraft, costPerUnit: e.target.value })} /></td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" disabled={busy} onClick={() => saveIngredient(item._id)}>Guardar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => setEditingId(null)}>Cancelar</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{item.name}</td>
                              <td>{item.unit}</td>
                              <td className="mono">{money(item.costPerUnit)}</td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => { setEditingId(item._id); setEditDraft({ name: item.name, unit: item.unit, costPerUnit: String(item.costPerUnit ?? '') }); }}>Editar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => removeIngredient(item._id)}>Quitar</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <ContinueBtn ready={ingredients.length > 0} />
            </div>
          )}

          {stepId === 'inventory' && (
            <div className="stack">
              {!ingredients.length ? (
                <div className="muted">Primero agrega al menos un insumo en el paso anterior.</div>
              ) : (
                <form className="stack" onSubmit={submitStock}>
                  <label>
                    Insumo
                    <SearchableSelect
                      options={ingredientOptions}
                      value={stockForm.ingredientId}
                      onChange={(id) => setStockForm({ ...stockForm, ingredientId: id })}
                      placeholder="Escribe para buscar un insumo…"
                      emptyText="No hay insumos con ese nombre"
                      required
                      disabled={busy}
                    />
                  </label>
                  <label>Cantidad inicial
                    <input type="number" min="0" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} required />
                  </label>
                  <button disabled={busy || !stockForm.ingredientId}>{busy ? 'Guardando…' : 'Cargar stock'}</button>
                </form>
              )}
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Stock cargado ({stockRows.length})</h3>
                <p className="muted" style={{ marginTop: 0 }}>Cantidad × costo unitario del insumo = costo total en inventario.</p>
                {!stockRows.length ? <p className="muted">Aún no has cargado inventario.</p> : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Insumo</th>
                        <th>On hand</th>
                        <th>Unidad</th>
                        <th>Costo unitario</th>
                        <th>Costo total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockRows.map((row) => {
                        const qty = editingStockId === row._id
                          ? Number(stockEditDraft.onHand) || 0
                          : Number(row.onHand) || 0;
                        const unitCost = Number(row.ingredientId?.costPerUnit) || 0;
                        const totalCost = qty * unitCost;
                        return (
                        <tr key={row._id}>
                          {editingStockId === row._id ? (
                            <>
                              <td>{row.ingredientId?.name}</td>
                              <td><input type="number" min="0" step="0.01" value={stockEditDraft.onHand} onChange={(e) => setStockEditDraft({ onHand: e.target.value })} /></td>
                              <td>{row.ingredientId?.unit}</td>
                              <td className="mono">{money(unitCost)}</td>
                              <td className="mono">{money(totalCost)}</td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" disabled={busy} onClick={() => saveStock(row._id)}>Guardar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => setEditingStockId(null)}>Cancelar</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{row.ingredientId?.name}</td>
                              <td className="mono">{qty.toFixed(2)}</td>
                              <td>{row.ingredientId?.unit}</td>
                              <td className="mono">{money(unitCost)}</td>
                              <td className="mono">{money(totalCost)}</td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => { setEditingStockId(row._id); setStockEditDraft({ onHand: String(row.onHand ?? 0) }); }}>Editar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => removeStock(row._id)}>Quitar</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Total inventario</td>
                        <td className="mono" style={{ fontWeight: 700 }}>
                          {money(stockRows.reduce((sum, row) => {
                            const q = editingStockId === row._id ? Number(stockEditDraft.onHand) || 0 : Number(row.onHand) || 0;
                            return sum + q * (Number(row.ingredientId?.costPerUnit) || 0);
                          }, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
              <ContinueBtn ready={stockRows.length > 0} />
            </div>
          )}

          {stepId === 'menu' && (
            <div className="stack">
              <form className="stack" onSubmit={submitMenu}>
                <label>Nombre del plato<input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required placeholder="Ej. Hamburguesa clásica" /></label>
                <label>Precio de venta (COP)<input type="number" min="0" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} required placeholder="28000" /></label>
                <label>Categoría<input value={menuForm.categoryName} onChange={(e) => setMenuForm({ ...menuForm, categoryName: e.target.value })} placeholder="Platos fuertes" /></label>
                <button disabled={busy}>{busy ? 'Guardando…' : 'Agregar plato'}</button>
              </form>
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Platos agregados ({visibleMenu.length})</h3>
                {!visibleMenu.length ? <p className="muted">Aún no has agregado platos.</p> : (
                  <table className="table">
                    <thead><tr><th>Plato</th><th>Precio</th><th></th></tr></thead>
                    <tbody>
                      {visibleMenu.map((item) => (
                        <tr key={item._id}>
                          {editingMenuId === item._id ? (
                            <>
                              <td><input value={menuEditDraft.name} onChange={(e) => setMenuEditDraft({ ...menuEditDraft, name: e.target.value })} /></td>
                              <td><input type="number" min="0" value={menuEditDraft.price} onChange={(e) => setMenuEditDraft({ ...menuEditDraft, price: e.target.value })} /></td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" disabled={busy} onClick={() => saveMenu(item._id)}>Guardar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => setEditingMenuId(null)}>Cancelar</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{item.name}</td>
                              <td className="mono">{money(item.price)}</td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => { setEditingMenuId(item._id); setMenuEditDraft({ name: item.name, price: String(item.price ?? '') }); }}>Editar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => removeMenu(item._id)}>Quitar</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <ContinueBtn ready={visibleMenu.length > 0} />
            </div>
          )}

          {stepId === 'tables' && (
            <div className="stack">
              <form className="stack" onSubmit={submitTables}>
                <div className="row">
                  <label style={{ flex: 1 }}>Nombre (opcional)<input value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} placeholder="M1" /></label>
                  <label style={{ flex: 1 }}>Sillas<input type="number" min="1" value={tableForm.seats} onChange={(e) => setTableForm({ ...tableForm, seats: e.target.value })} /></label>
                </div>
                <div className="row">
                  <label style={{ flex: 1 }}>Zona
                    <select value={tableForm.zone} onChange={(e) => setTableForm({ ...tableForm, zone: e.target.value })}>
                      <option>Salón</option>
                      <option>Terraza</option>
                      <option>VIP</option>
                    </select>
                  </label>
                  <label style={{ flex: 1 }}>Cantidad a crear
                    <input type="number" min="1" max="40" value={tableForm.count} onChange={(e) => setTableForm({ ...tableForm, count: e.target.value })} />
                  </label>
                </div>
                <button disabled={busy}>{busy ? 'Creando…' : 'Agregar mesa(s)'}</button>
              </form>
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Mesas creadas ({tables.length})</h3>
                {!tables.length ? <p className="muted">Aún no has creado mesas.</p> : (
                  <table className="table">
                    <thead><tr><th>Mesa</th><th>Zona</th><th>Sillas</th><th></th></tr></thead>
                    <tbody>
                      {tables.map((t) => (
                        <tr key={t._id}>
                          {editingTableId === t._id ? (
                            <>
                              <td><input value={tableEditDraft.name} onChange={(e) => setTableEditDraft({ ...tableEditDraft, name: e.target.value })} /></td>
                              <td>
                                <select value={tableEditDraft.zone} onChange={(e) => setTableEditDraft({ ...tableEditDraft, zone: e.target.value })}>
                                  <option>Salón</option>
                                  <option>Terraza</option>
                                  <option>VIP</option>
                                </select>
                              </td>
                              <td><input type="number" min="1" value={tableEditDraft.seats} onChange={(e) => setTableEditDraft({ ...tableEditDraft, seats: e.target.value })} /></td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" disabled={busy} onClick={() => saveTable(t._id)}>Guardar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => setEditingTableId(null)}>Cancelar</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{t.name}</td>
                              <td>{t.zone}</td>
                              <td>{t.seats}</td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => { setEditingTableId(t._id); setTableEditDraft({ name: t.name, seats: String(t.seats), zone: t.zone || 'Salón' }); }}>Editar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => removeTable(t._id)}>Quitar</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <ContinueBtn ready={tables.length > 0} />
            </div>
          )}

          {stepId === 'staff' && (
            <div className="stack">
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
              </form>
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Equipo agregado ({visibleStaff.length})</h3>
                {!visibleStaff.length ? <p className="muted">Aún no has creado usuarios operativos.</p> : (
                  <table className="table">
                    <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr></thead>
                    <tbody>
                      {visibleStaff.map((u) => (
                        <tr key={u._id}>
                          {editingStaffId === u._id ? (
                            <>
                              <td><input value={staffEditDraft.name} onChange={(e) => setStaffEditDraft({ ...staffEditDraft, name: e.target.value })} /></td>
                              <td>{u.email}</td>
                              <td>
                                <select value={staffEditDraft.role} onChange={(e) => setStaffEditDraft({ ...staffEditDraft, role: e.target.value })}>
                                  {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                              </td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" disabled={busy} onClick={() => saveStaff(u._id)}>Guardar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => setEditingStaffId(null)}>Cancelar</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{u.name}</td>
                              <td>{u.email}</td>
                              <td><span className="badge">{ROLE_LABEL[u.role] || u.role}</span></td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => { setEditingStaffId(u._id); setStaffEditDraft({ name: u.name, role: u.role }); }}>Editar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => removeStaff(u._id)}>Quitar</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <ContinueBtn ready={visibleStaff.length > 0} />
            </div>
          )}

          {stepId === 'locations' && (
            <div className="stack">
              <form className="stack" onSubmit={submitRestaurant}>
                <p className="muted" style={{ marginTop: 0 }}>
                  Ya tienes {restaurants.length} sede{restaurants.length === 1 ? '' : 's'}. Puedes agregar otra ahora o finalizar.
                </p>
                <label>Nombre de la nueva sede<input value={restoForm.name} onChange={(e) => setRestoForm({ ...restoForm, name: e.target.value })} required placeholder="Ej. Amara Norte" /></label>
                <label>Ciudad<input value={restoForm.city} onChange={(e) => setRestoForm({ ...restoForm, city: e.target.value })} /></label>
                <label>Dirección<input value={restoForm.address} onChange={(e) => setRestoForm({ ...restoForm, address: e.target.value })} /></label>
                <button disabled={busy}>{busy ? 'Agregando…' : 'Vincular sede'}</button>
              </form>
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Sedes ({restaurants.length})</h3>
                <table className="table">
                  <thead><tr><th>Nombre</th><th>Ciudad</th><th>Dirección</th><th></th></tr></thead>
                  <tbody>
                    {restaurants.map((r) => (
                      <tr key={r._id}>
                        {editingRestoId === r._id ? (
                          <>
                            <td><input value={restoEditDraft.name} onChange={(e) => setRestoEditDraft({ ...restoEditDraft, name: e.target.value })} /></td>
                            <td><input value={restoEditDraft.city} onChange={(e) => setRestoEditDraft({ ...restoEditDraft, city: e.target.value })} /></td>
                            <td><input value={restoEditDraft.address} onChange={(e) => setRestoEditDraft({ ...restoEditDraft, address: e.target.value })} /></td>
                            <td>
                              <div className="row" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" disabled={busy} onClick={() => saveRestaurant(r._id)}>Guardar</button>
                                <button type="button" className="ghost" disabled={busy} onClick={() => setEditingRestoId(null)}>Cancelar</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{r.name}</td>
                            <td>{r.city || '—'}</td>
                            <td>{r.address || '—'}</td>
                            <td>
                              <button type="button" className="ghost" disabled={busy} onClick={() => { setEditingRestoId(r._id); setRestoEditDraft({ name: r.name || '', city: r.city || '', address: r.address || '' }); }}>Editar</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => finish(status.requiredDone ? false : true)} disabled={busy}>
                {status.requiredDone ? 'Finalizar configuración' : 'Continuar sin agregar sede'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
