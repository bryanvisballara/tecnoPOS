import { useEffect, useState } from 'react';
import { api, money } from '../api/client';

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([api('/api/menu/items'), api('/api/menu/categories')]).then(([i, c]) => {
      setItems(i);
      setCategories(c);
    });
  }, []);

  const toggle = async (item) => {
    const updated = await api(`/api/menu/items/${item._id}`, {
      method: 'PATCH',
      body: { available: !item.available },
    });
    setItems((prev) => prev.map((p) => (p._id === item._id ? updated : p)));
  };

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Menú centralizado</h3>
      <p className="muted">Cambios de disponibilidad se reflejan en todas las sedes de la cadena.</p>
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        {categories.map((c) => <span className="badge" key={c._id}>{c.name}</span>)}
      </div>
      <table className="table">
        <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Estación</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>
                <strong>{item.name}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>{item.description}</div>
              </td>
              <td>{item.categoryId?.name}</td>
              <td className="mono">{money(item.price)}</td>
              <td><span className="badge">{item.station}</span></td>
              <td>
                <span className={`badge ${item.available ? 'ok' : 'danger'}`}>
                  {item.available ? 'Disponible' : '86 / Agotado'}
                </span>
              </td>
              <td>
                <button className="ghost" onClick={() => toggle(item)}>
                  {item.available ? 'Marcar 86' : 'Reactivar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
