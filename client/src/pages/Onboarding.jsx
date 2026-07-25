import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, money } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import { compatibleUnits, recipeLineCost } from '../utils/units';
import { operatingLineAmount, sumOperatingCosts, totalDishCost } from '../utils/operatingCosts';

const UNITS = ['kg', 'g', 'L', 'ml', 'unidad', 'porcion'];
const CAT_COLORS = ['#00a8ff', '#38bdf8', '#67e8f9', '#22d3ee', '#a3e635', '#c4b5fd', '#fbbf24', '#fb7185'];
const OP_COST_SUGGESTIONS = ['Nómina', 'Servicios', 'Merma', 'Empaque', 'Delivery', 'Arriendo'];
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
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [staff, setStaff] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', unit: 'kg', costPerUnit: '' });
  const [editingStockId, setEditingStockId] = useState(null);
  const [stockEditDraft, setStockEditDraft] = useState({ onHand: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryEditDraft, setCategoryEditDraft] = useState({ name: '', color: '#00a8ff' });
  const [editingDishId, setEditingDishId] = useState(null);
  const [editingTableId, setEditingTableId] = useState(null);
  const [tableEditDraft, setTableEditDraft] = useState({ name: '', seats: '4', zone: 'Salón' });
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffEditDraft, setStaffEditDraft] = useState({ name: '', role: 'waiter' });
  const [editingRestoId, setEditingRestoId] = useState(null);
  const [restoEditDraft, setRestoEditDraft] = useState({ name: '', city: '', address: '' });

  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'kg', costPerUnit: '' });
  const [stockForm, setStockForm] = useState({ ingredientId: '', quantity: '10' });
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#00a8ff' });
  const [menuForm, setMenuForm] = useState({ name: '', price: '', categoryId: '' });
  const [recipeLines, setRecipeLines] = useState([]);
  const [recipeDraft, setRecipeDraft] = useState({ ingredientId: '', quantity: '', unit: 'kg' });
  const [editingRecipeKey, setEditingRecipeKey] = useState(null);
  const [recipeLineEditDraft, setRecipeLineEditDraft] = useState({ quantity: '', unit: 'kg' });
  const [operatingLines, setOperatingLines] = useState([]);
  const [operatingDraft, setOperatingDraft] = useState({ name: '', mode: 'fixed', value: '' });
  const [editingOpKey, setEditingOpKey] = useState(null);
  const [operatingEditDraft, setOperatingEditDraft] = useState({ name: '', mode: 'fixed', value: '' });
  const [tableForm, setTableForm] = useState({ name: '', seats: '4', zone: 'Salón', count: '1' });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'waiter' });
  const [restoForm, setRestoForm] = useState({ name: '', city: '', address: '' });

  const reload = useCallback(async () => {
    const data = await api(`/api/onboarding/status?restaurantId=${restaurantId}`, { restaurantId });
    setStatus(data);
    const [ings, stock, cats, items, tableList, users] = await Promise.all([
      api('/api/menu/ingredients'),
      api(`/api/inventory/stock?restaurantId=${restaurantId}`, { restaurantId }).catch(() => []),
      api('/api/menu/categories').catch(() => data.categories || []),
      api('/api/menu/items').catch(() => []),
      api(`/api/tables?restaurantId=${restaurantId}`, { restaurantId }).catch(() => []),
      api('/api/users').catch(() => []),
    ]);
    setIngredients(ings);
    setStockRows(stock);
    setCategories(cats);
    setMenuItems(items);
    setTables(tableList);
    setStaff(users.filter((u) => u.role !== 'owner'));
    setStockForm((f) => ({ ...f, ingredientId: f.ingredientId || ings[0]?._id || '' }));
    setMenuForm((f) => ({ ...f, categoryId: f.categoryId || cats[0]?._id || '' }));
    setRecipeDraft((d) => ({
      ...d,
      ingredientId: d.ingredientId || ings[0]?._id || '',
      unit: d.ingredientId ? d.unit : (ings[0]?.unit || 'kg'),
    }));
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
  const stockedIngredientIds = useMemo(
    () => new Set(stockRows.map((r) => String(r.ingredientId?._id || r.ingredientId))),
    [stockRows]
  );
  const pendingStockIngredients = useMemo(
    () => ingredients.filter((i) => !stockedIngredientIds.has(String(i._id))),
    [ingredients, stockedIngredientIds]
  );
  const ingredientsById = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [String(i._id), i])),
    [ingredients]
  );
  const recipeDraftIng = ingredientsById[String(recipeDraft.ingredientId)];
  const recipeDraftUnits = compatibleUnits(recipeDraftIng?.unit || recipeDraft.unit);
  const recipePreview = useMemo(() => {
    const breakdown = recipeLines.map((line) => {
      const ing = ingredientsById[String(line.ingredientId)];
      const qty = editingRecipeKey === line.key
        ? Number(recipeLineEditDraft.quantity) || 0
        : Number(line.quantity) || 0;
      const unit = editingRecipeKey === line.key ? recipeLineEditDraft.unit : line.unit;
      const cost = recipeLineCost(qty, unit, ing);
      return {
        ...line,
        quantity: qty,
        unit,
        name: ing?.name || 'Insumo',
        cost,
      };
    });
    const ingredientCost = breakdown.reduce((s, l) => s + l.cost, 0);
    const opBreakdown = operatingLines.map((line) => {
      const draft = editingOpKey === line.key ? operatingEditDraft : line;
      const amount = operatingLineAmount(ingredientCost, draft);
      return {
        ...line,
        name: draft.name,
        mode: draft.mode,
        value: Number(draft.value) || 0,
        amount,
      };
    });
    const operatingTotal = sumOperatingCosts(
      ingredientCost,
      opBreakdown.map((l) => ({ mode: l.mode, value: l.value }))
    );
    const totalCost = totalDishCost(ingredientCost, opBreakdown.map((l) => ({ mode: l.mode, value: l.value })));
    const price = Number(menuForm.price) || 0;
    return {
      breakdown,
      ingredientCost,
      opBreakdown,
      operatingTotal,
      totalCost,
      margin: price - totalCost,
    };
  }, [
    recipeLines,
    ingredientsById,
    menuForm.price,
    editingRecipeKey,
    recipeLineEditDraft,
    operatingLines,
    editingOpKey,
    operatingEditDraft,
  ]);


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

  const submitCategory = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/category', {
        method: 'POST',
        body: { name: categoryForm.name, color: categoryForm.color },
      });
      setCategoryForm({ name: '', color: categoryForm.color });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const suggestCategories = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/onboarding/quick/categories/suggest', { method: 'POST' });
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveCategory = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/menu/categories/${id}`, {
        method: 'PATCH',
        body: { name: categoryEditDraft.name.trim(), color: categoryEditDraft.color },
      });
      setEditingCategoryId(null);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeCategory = async (id) => {
    if (!confirm('¿Quitar esta categoría?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/menu/categories/${id}`, { method: 'PATCH', body: { active: false } });
      setEditingCategoryId(null);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resetMenuForm = (keepCategory = true) => {
    setMenuForm((f) => ({
      name: '',
      price: '',
      categoryId: keepCategory ? (f.categoryId || categories[0]?._id || '') : (categories[0]?._id || ''),
    }));
    setRecipeLines([]);
    setOperatingLines([]);
    setEditingRecipeKey(null);
    setEditingOpKey(null);
    setEditingDishId(null);
    setRecipeDraft({
      ingredientId: ingredients[0]?._id || '',
      quantity: '',
      unit: ingredients[0]?.unit || 'kg',
    });
    setOperatingDraft({ name: '', mode: 'fixed', value: '' });
  };

  const beginEditDish = (item) => {
    const lines = item.recipeId?.lines || [];
    setEditingDishId(item._id);
    setMenuForm({
      name: item.name || '',
      price: String(item.price ?? ''),
      categoryId: item.categoryId?._id || item.categoryId || categories[0]?._id || '',
    });
    setRecipeLines(
      lines.map((l, idx) => ({
        key: `edit-${item._id}-${idx}-${l.ingredientId?._id || l.ingredientId}`,
        ingredientId: String(l.ingredientId?._id || l.ingredientId),
        quantity: Number(l.quantity) || 0,
        unit: l.unit || l.ingredientId?.unit || 'kg',
      }))
    );
    setOperatingLines(
      (item.operatingCosts || []).map((l, idx) => ({
        key: `op-edit-${item._id}-${idx}`,
        name: l.name,
        mode: l.mode === 'percent' ? 'percent' : 'fixed',
        value: Number(l.value) || 0,
      }))
    );
    setEditingRecipeKey(null);
    setEditingOpKey(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitMenu = async (e) => {
    e.preventDefault();
    if (!menuForm.categoryId) {
      setError('Elige una categoría del menú.');
      return;
    }
    if (!recipeLines.length) {
      setError('Agrega al menos un insumo a la receta del plato.');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      name: menuForm.name,
      price: Number(menuForm.price),
      categoryId: menuForm.categoryId,
      lines: recipeLines.map((l) => ({
        ingredientId: l.ingredientId,
        quantity: Number(l.quantity),
        unit: l.unit,
      })),
      operatingCosts: operatingLines.map((l) => ({
        name: l.name,
        mode: l.mode,
        value: Number(l.value),
      })),
    };
    try {
      if (editingDishId) {
        await api(`/api/onboarding/quick/menu-item/${editingDishId}`, {
          method: 'PATCH',
          body: payload,
        });
      } else {
        await api('/api/onboarding/quick/menu-item', {
          method: 'POST',
          body: payload,
        });
      }
      resetMenuForm(true);
      await afterMutation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addRecipeLine = () => {
    if (!recipeDraft.ingredientId || !(Number(recipeDraft.quantity) > 0)) {
      setError('Elige un insumo y una cantidad mayor a 0.');
      return;
    }
    setError('');
    setRecipeLines((rows) => [
      ...rows,
      {
        key: `${Date.now()}-${recipeDraft.ingredientId}`,
        ingredientId: recipeDraft.ingredientId,
        quantity: Number(recipeDraft.quantity),
        unit: recipeDraft.unit,
      },
    ]);
    setRecipeDraft((d) => ({ ...d, quantity: '' }));
  };

  const removeRecipeLine = (key) => {
    setRecipeLines((rows) => rows.filter((r) => r.key !== key));
    if (editingRecipeKey === key) setEditingRecipeKey(null);
  };

  const startEditRecipeLine = (line) => {
    setEditingRecipeKey(line.key);
    setRecipeLineEditDraft({ quantity: String(line.quantity), unit: line.unit });
    setError('');
  };

  const saveRecipeLine = (key) => {
    const qty = Number(recipeLineEditDraft.quantity);
    if (!(qty > 0)) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    setError('');
    setRecipeLines((rows) =>
      rows.map((r) => (r.key === key ? { ...r, quantity: qty, unit: recipeLineEditDraft.unit } : r))
    );
    setEditingRecipeKey(null);
  };

  const addOperatingLine = () => {
    if (!operatingDraft.name.trim() || !(Number(operatingDraft.value) > 0)) {
      setError('Indica nombre y un valor mayor a 0 para el costo operativo.');
      return;
    }
    setError('');
    setOperatingLines((rows) => [
      ...rows,
      {
        key: `${Date.now()}-op`,
        name: operatingDraft.name.trim(),
        mode: operatingDraft.mode,
        value: Number(operatingDraft.value),
      },
    ]);
    setOperatingDraft({ name: '', mode: operatingDraft.mode, value: '' });
  };

  const removeOperatingLine = (key) => {
    setOperatingLines((rows) => rows.filter((r) => r.key !== key));
    if (editingOpKey === key) setEditingOpKey(null);
  };

  const startEditOperatingLine = (line) => {
    setEditingOpKey(line.key);
    setOperatingEditDraft({ name: line.name, mode: line.mode, value: String(line.value) });
    setError('');
  };

  const saveOperatingLine = (key) => {
    if (!operatingEditDraft.name.trim() || !(Number(operatingEditDraft.value) > 0)) {
      setError('Nombre y valor del costo operativo son requeridos.');
      return;
    }
    setError('');
    setOperatingLines((rows) =>
      rows.map((r) =>
        r.key === key
          ? {
              ...r,
              name: operatingEditDraft.name.trim(),
              mode: operatingEditDraft.mode,
              value: Number(operatingEditDraft.value),
            }
          : r
      )
    );
    setEditingOpKey(null);
  };

  const removeMenu = async (id) => {
    if (!confirm('¿Quitar este plato?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/menu/items/${id}`, { method: 'PATCH', body: { available: false } });
      if (editingDishId === id) resetMenuForm(true);
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
              {pendingStockIngredients.length > 0 && (
                <div>
                  <h3 style={{ margin: '0.5rem 0' }}>Insumos sin stock ({pendingStockIngredients.length})</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Estos insumos ya existen, pero aún no tienen cantidad en inventario. Elígelos arriba y pulsa «Cargar stock».
                  </p>
                  <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    {pendingStockIngredients.map((ing) => (
                      <button
                        key={ing._id}
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() => setStockForm({ ...stockForm, ingredientId: ing._id })}
                      >
                        {ing.name} ({ing.unit})
                      </button>
                    ))}
                  </div>
                </div>
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

          {stepId === 'categories' && (
            <div className="stack">
              <form className="stack" onSubmit={submitCategory}>
                <label>
                  Nombre de la categoría
                  <input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                    placeholder="Ej. Entradas, Platos fuertes, Gaseosas…"
                  />
                </label>
                <label>
                  Color
                  <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {CAT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        onClick={() => setCategoryForm({ ...categoryForm, color: c })}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: c,
                          border: categoryForm.color === c ? '2px solid #fff' : '2px solid transparent',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </label>
                <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button disabled={busy}>{busy ? 'Guardando…' : 'Agregar categoría'}</button>
                  <button type="button" className="ghost" disabled={busy} onClick={suggestCategories}>
                    Cargar sugeridas (entradas, fuertes, bebidas…)
                  </button>
                </div>
              </form>
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Categorías ({categories.length})</h3>
                {!categories.length ? (
                  <p className="muted">Aún no hay categorías. Agrégalas o carga las sugeridas.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Color</th>
                        <th>Nombre</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat._id}>
                          {editingCategoryId === cat._id ? (
                            <>
                              <td>
                                <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                                  {CAT_COLORS.map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setCategoryEditDraft({ ...categoryEditDraft, color: c })}
                                      style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 6,
                                        background: c,
                                        border: categoryEditDraft.color === c ? '2px solid #fff' : '2px solid transparent',
                                        padding: 0,
                                      }}
                                    />
                                  ))}
                                </div>
                              </td>
                              <td>
                                <input
                                  value={categoryEditDraft.name}
                                  onChange={(e) => setCategoryEditDraft({ ...categoryEditDraft, name: e.target.value })}
                                />
                              </td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button type="button" disabled={busy} onClick={() => saveCategory(cat._id)}>Guardar</button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => setEditingCategoryId(null)}>Cancelar</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 14,
                                    height: 14,
                                    borderRadius: 4,
                                    background: cat.color || '#00a8ff',
                                  }}
                                />
                              </td>
                              <td>{cat.name}</td>
                              <td>
                                <div className="row" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="ghost"
                                    disabled={busy}
                                    onClick={() => {
                                      setEditingCategoryId(cat._id);
                                      setCategoryEditDraft({ name: cat.name, color: cat.color || '#00a8ff' });
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button type="button" className="ghost" disabled={busy} onClick={() => removeCategory(cat._id)}>
                                    Quitar
                                  </button>
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
              <ContinueBtn ready={categories.length > 0} />
            </div>
          )}

          {stepId === 'menu' && (
            <div className="stack">
              {!categories.length ? (
                <div className="muted">
                  Primero crea categorías en el paso anterior (entradas, fuertes, bebidas…).
                  <div style={{ marginTop: '0.75rem' }}>
                    <button type="button" onClick={() => setStepId('categories')}>Ir a Categorías del menú</button>
                  </div>
                </div>
              ) : !ingredients.length ? (
                <div className="muted">Primero agrega insumos en el paso 1 para armar la receta del plato.</div>
              ) : (
                <form
                  className="stack"
                  onSubmit={submitMenu}
                >
                  <label>Nombre del plato<input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required placeholder="Ej. Shawarma de pollo" /></label>
                  <label>Precio de venta (COP)<input type="number" min="0" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} required placeholder="28000" /></label>
                  <label>
                    Categoría
                    <select
                      value={menuForm.categoryId}
                      onChange={(e) => setMenuForm({ ...menuForm, categoryId: e.target.value })}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </label>

                  <div className="stack" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Receta del plato</h3>
                    <p className="muted" style={{ margin: 0 }}>
                      Agrega cada porción (ej. 150 g de pollo). El costo se calcula con el precio unitario del insumo y, al vender, se descuenta del inventario.
                    </p>
                    <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <label style={{ flex: 2, minWidth: 180 }}>
                        Insumo
                        <SearchableSelect
                          options={ingredientOptions}
                          value={recipeDraft.ingredientId}
                          onChange={(id) => {
                            const ing = ingredientsById[String(id)];
                            setRecipeDraft({
                              ingredientId: id,
                              quantity: recipeDraft.quantity,
                              unit: ing?.unit || 'kg',
                            });
                          }}
                          placeholder="Buscar insumo…"
                          emptyText="Sin insumos"
                          disabled={busy}
                        />
                      </label>
                      <label style={{ flex: 1, minWidth: 100 }}>
                        Cantidad
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={recipeDraft.quantity}
                          onChange={(e) => setRecipeDraft({ ...recipeDraft, quantity: e.target.value })}
                          placeholder="150"
                          disabled={busy}
                        />
                      </label>
                      <label style={{ flex: 1, minWidth: 90 }}>
                        Unidad
                        <select
                          value={recipeDraft.unit}
                          onChange={(e) => setRecipeDraft({ ...recipeDraft, unit: e.target.value })}
                          disabled={busy}
                        >
                          {recipeDraftUnits.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </label>
                      <button type="button" className="ghost" disabled={busy} onClick={addRecipeLine}>
                        Agregar a receta
                      </button>
                    </div>

                    {!recipePreview.breakdown.length ? (
                      <p className="muted">Aún no hay insumos en la receta.</p>
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Insumo</th>
                            <th>Cantidad</th>
                            <th>Costo</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipePreview.breakdown.map((line) => {
                            const ing = ingredientsById[String(line.ingredientId)];
                            const editUnits = compatibleUnits(ing?.unit || line.unit);
                            return (
                              <tr key={line.key}>
                                {editingRecipeKey === line.key ? (
                                  <>
                                    <td>{line.name}</td>
                                    <td>
                                      <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={recipeLineEditDraft.quantity}
                                          onChange={(e) => setRecipeLineEditDraft({ ...recipeLineEditDraft, quantity: e.target.value })}
                                          style={{ width: 90 }}
                                        />
                                        <select
                                          value={recipeLineEditDraft.unit}
                                          onChange={(e) => setRecipeLineEditDraft({ ...recipeLineEditDraft, unit: e.target.value })}
                                        >
                                          {editUnits.map((u) => (
                                            <option key={u} value={u}>{u}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </td>
                                    <td className="mono">{money(line.cost)}</td>
                                    <td>
                                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                                        <button type="button" disabled={busy} onClick={() => saveRecipeLine(line.key)}>Guardar</button>
                                        <button type="button" className="ghost" disabled={busy} onClick={() => setEditingRecipeKey(null)}>Cancelar</button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td>{line.name}</td>
                                    <td className="mono">{line.quantity} {line.unit}</td>
                                    <td className="mono">{money(line.cost)}</td>
                                    <td>
                                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                                        <button type="button" className="ghost" disabled={busy} onClick={() => startEditRecipeLine(line)}>Editar</button>
                                        <button type="button" className="ghost" disabled={busy} onClick={() => removeRecipeLine(line.key)}>Quitar</button>
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
                            <td colSpan={2} style={{ textAlign: 'right' }}>Costo insumos</td>
                            <td className="mono">{money(recipePreview.ingredientCost)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>

                  <div className="stack" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Costos operativos</h3>
                    <p className="muted" style={{ margin: 0 }}>
                      Nómina, servicios, merma, etc. Puedes usar un valor fijo (COP) o un % sobre el costo de insumos.
                    </p>
                    <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <label style={{ flex: 2, minWidth: 160 }}>
                        Concepto
                        <input
                          list="op-cost-suggestions"
                          value={operatingDraft.name}
                          onChange={(e) => setOperatingDraft({ ...operatingDraft, name: e.target.value })}
                          placeholder="Ej. Merma, Nómina…"
                          disabled={busy}
                        />
                        <datalist id="op-cost-suggestions">
                          {OP_COST_SUGGESTIONS.map((n) => (
                            <option key={n} value={n} />
                          ))}
                        </datalist>
                      </label>
                      <label style={{ flex: 1, minWidth: 140 }}>
                        Tipo
                        <select
                          value={operatingDraft.mode}
                          onChange={(e) => setOperatingDraft({ ...operatingDraft, mode: e.target.value })}
                          disabled={busy}
                        >
                          <option value="fixed">Valor fijo (COP)</option>
                          <option value="percent">% del costo insumos</option>
                        </select>
                      </label>
                      <label style={{ flex: 1, minWidth: 110 }}>
                        {operatingDraft.mode === 'percent' ? 'Porcentaje' : 'Valor (COP)'}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={operatingDraft.value}
                          onChange={(e) => setOperatingDraft({ ...operatingDraft, value: e.target.value })}
                          placeholder={operatingDraft.mode === 'percent' ? '10' : '1500'}
                          disabled={busy}
                        />
                      </label>
                      <button type="button" className="ghost" disabled={busy} onClick={addOperatingLine}>
                        Agregar costo
                      </button>
                    </div>

                    {!recipePreview.opBreakdown.length ? (
                      <p className="muted">Opcional: aún no hay costos operativos.</p>
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Costo</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipePreview.opBreakdown.map((line) => (
                            <tr key={line.key}>
                              {editingOpKey === line.key ? (
                                <>
                                  <td>
                                    <input
                                      value={operatingEditDraft.name}
                                      onChange={(e) => setOperatingEditDraft({ ...operatingEditDraft, name: e.target.value })}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      value={operatingEditDraft.mode}
                                      onChange={(e) => setOperatingEditDraft({ ...operatingEditDraft, mode: e.target.value })}
                                    >
                                      <option value="fixed">Fijo</option>
                                      <option value="percent">%</option>
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={operatingEditDraft.value}
                                      onChange={(e) => setOperatingEditDraft({ ...operatingEditDraft, value: e.target.value })}
                                      style={{ width: 100 }}
                                    />
                                  </td>
                                  <td className="mono">{money(line.amount)}</td>
                                  <td>
                                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                                      <button type="button" disabled={busy} onClick={() => saveOperatingLine(line.key)}>Guardar</button>
                                      <button type="button" className="ghost" disabled={busy} onClick={() => setEditingOpKey(null)}>Cancelar</button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>{line.name}</td>
                                  <td>{line.mode === 'percent' ? '% insumos' : 'Fijo'}</td>
                                  <td className="mono">
                                    {line.mode === 'percent' ? `${line.value}%` : money(line.value)}
                                  </td>
                                  <td className="mono">{money(line.amount)}</td>
                                  <td>
                                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                                      <button type="button" className="ghost" disabled={busy} onClick={() => startEditOperatingLine(line)}>Editar</button>
                                      <button type="button" className="ghost" disabled={busy} onClick={() => removeOperatingLine(line.key)}>Quitar</button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <table className="table">
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'right' }}>Costo insumos</td>
                          <td className="mono" style={{ width: 140 }}>{money(recipePreview.ingredientCost)}</td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: 'right' }}>Costos operativos</td>
                          <td className="mono">{money(recipePreview.operatingTotal)}</td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>Costo total plato</td>
                          <td className="mono" style={{ fontWeight: 700 }}>{money(recipePreview.totalCost)}</td>
                        </tr>
                        {Number(menuForm.price) > 0 && (
                          <tr>
                            <td style={{ textAlign: 'right' }}>Margen estimado</td>
                            <td className="mono">{money(recipePreview.margin)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button disabled={busy || !recipeLines.length}>
                      {busy ? 'Guardando…' : editingDishId ? 'Guardar cambios del plato' : 'Agregar plato'}
                    </button>
                    {editingDishId && (
                      <button type="button" className="ghost" disabled={busy} onClick={() => resetMenuForm(true)}>
                        Cancelar edición
                      </button>
                    )}
                  </div>
                  {editingDishId && (
                    <p className="muted" style={{ margin: 0 }}>
                      Estás editando un plato existente: receta, costos operativos, precio y categoría.
                    </p>
                  )}
                </form>
              )}
              <div>
                <h3 style={{ margin: '0.5rem 0' }}>Platos agregados ({visibleMenu.length})</h3>
                {!visibleMenu.length ? <p className="muted">Aún no has agregado platos.</p> : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Plato</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Costo</th>
                        <th>Receta</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMenu.map((item) => {
                        const lines = item.recipeId?.lines || [];
                        const recipeLabel = lines.length
                          ? lines.map((l) => `${l.quantity} ${l.unit || l.ingredientId?.unit || ''} ${l.ingredientId?.name || ''}`.trim()).join(' · ')
                          : 'Sin receta';
                        const opLabel = (item.operatingCosts || []).length
                          ? ` · ${(item.operatingCosts || []).map((o) => o.name).join(', ')}`
                          : '';
                        return (
                          <tr key={item._id} style={editingDishId === item._id ? { outline: '1px solid #00a8ff' } : undefined}>
                            <td>{item.name}{editingDishId === item._id ? ' (editando)' : ''}</td>
                            <td>{item.categoryId?.name || '—'}</td>
                            <td className="mono">{money(item.price)}</td>
                            <td className="mono">{money(item.cost)}</td>
                            <td className="muted" style={{ fontSize: '0.85rem', maxWidth: 280 }}>{recipeLabel}{opLabel}</td>
                            <td>
                              <div className="row" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className="ghost" disabled={busy} onClick={() => beginEditDish(item)}>Editar</button>
                                <button type="button" className="ghost" disabled={busy} onClick={() => removeMenu(item._id)}>Quitar</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
