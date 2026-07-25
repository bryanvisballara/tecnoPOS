import { useEffect, useState } from 'react';
import { api, money } from '../api/client';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const load = async (query = q) => {
    const data = await api(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    setCustomers(data);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api('/api/customers', { method: 'POST', body: form });
    setForm({ name: '', phone: '', email: '' });
    load();
  };

  return (
    <div className="grid two">
      <div className="panel">
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <input placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="ghost" onClick={() => load(q)}>Buscar</button>
        </div>
        <table className="table">
          <thead><tr><th>Nombre</th><th>Teléfono</th><th>Visitas</th><th>Gastado</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.phone || '—'}</td>
                <td className="mono">{c.visits}</td>
                <td className="mono">{money(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Nuevo cliente</h3>
        <form className="stack" onSubmit={create}>
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <button type="submit">Guardar</button>
        </form>
      </div>
    </div>
  );
}
