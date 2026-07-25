import { useEffect, useState } from 'react';
import { api, money } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { restaurantId } = useAuth();
  const [stock, setStock] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState({ ingredientId: '', quantity: 5, unitCost: '' });
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [s, i] = await Promise.all([
      api(`/api/inventory/stock?restaurantId=${restaurantId}`, { restaurantId }),
      api('/api/menu/ingredients'),
    ]);
    setStock(s);
    setIngredients(i);
    if (!form.ingredientId && i[0]) setForm((f) => ({ ...f, ingredientId: i[0]._id }));
  };

  useEffect(() => {
    if (restaurantId) load().catch(console.error);
  }, [restaurantId]);

  const receive = async (e) => {
    e.preventDefault();
    await api('/api/inventory/receive', {
      method: 'POST',
      restaurantId,
      body: {
        restaurantId,
        ingredientId: form.ingredientId,
        quantity: Number(form.quantity),
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
      },
    });
    setMsg('Compra registrada');
    load();
  };

  return (
    <div className="grid two">
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Stock sede</h3>
        <table className="table">
          <thead><tr><th>Insumo</th><th>On hand</th><th>Par</th><th>Costo</th></tr></thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s._id}>
                <td>{s.ingredientId?.name}</td>
                <td>
                  <span className={`badge ${s.onHand <= s.reorderPoint ? 'danger' : 'ok'}`}>
                    {Number(s.onHand).toFixed(2)} {s.ingredientId?.unit}
                  </span>
                </td>
                <td className="mono">{s.parLevel}</td>
                <td className="mono">{money(s.ingredientId?.costPerUnit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Recibir compra</h3>
        <form className="stack" onSubmit={receive}>
          <label>
            Insumo
            <select value={form.ingredientId} onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}>
              {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
            </select>
          </label>
          <label>
            Cantidad
            <input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </label>
          <label>
            Costo unitario (opcional)
            <input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          </label>
          <button type="submit">Registrar entrada</button>
        </form>
        {msg && <div className="badge ok">{msg}</div>}
      </div>
    </div>
  );
}
