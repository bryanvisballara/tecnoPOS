import { useEffect, useState } from 'react';
import { api, money } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { restaurantId, user } = useAuth();
  const [scope, setScope] = useState(user.role === 'owner' ? 'chain' : 'restaurant');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const q = scope === 'restaurant' ? `?restaurantId=${restaurantId}` : '';
        const res = await api(`/api/dashboard/overview${q}`, { restaurantId });
        if (alive) setData(res);
      } catch (err) {
        if (alive) setError(err.message);
      }
    }
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [scope, restaurantId, user.role]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="muted">Cargando KPIs…</div>;

  const max = Math.max(...data.series.map((s) => s.revenue), 1);
  const c = data.consolidated;

  return (
    <div className="stack">
      <div className="row">
        {user.role === 'owner' && (
          <>
            <button className={scope === 'chain' ? '' : 'ghost'} onClick={() => setScope('chain')}>Cadena consolidada</button>
            <button className={scope === 'restaurant' ? '' : 'ghost'} onClick={() => setScope('restaurant')}>Sede actual</button>
          </>
        )}
        <span className="badge">{data.scope === 'chain' ? '5 sedes' : 'Individual'}</span>
      </div>

      <div className="grid kpi">
        <div className="panel kpi-card"><h3>Ventas hoy</h3><strong>{money(c.revenue)}</strong><div className="hint">{c.tickets} tickets</div></div>
        <div className="panel kpi-card"><h3>Ticket promedio</h3><strong>{money(c.avgTicket)}</strong><div className="hint">{c.guests} comensales</div></div>
        <div className="panel kpi-card"><h3>Órdenes abiertas</h3><strong>{c.openOrders}</strong><div className="hint">En servicio</div></div>
        <div className="panel kpi-card"><h3>Ocupación</h3><strong>{c.occupied}/{c.totalTables}</strong><div className="hint">Mesas activas</div></div>
      </div>

      <div className="grid two">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Últimos 7 días</h3>
          <div className="chart">
            {data.series.map((s) => (
              <div className="bar-wrap" key={s.date}>
                <div className="bar" style={{ height: `${(s.revenue / max) * 100}%` }} title={money(s.revenue)} />
                <small>{s.date.slice(5)}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Top platos hoy</h3>
          <table className="table">
            <thead><tr><th>Producto</th><th>Cant.</th></tr></thead>
            <tbody>
              {data.topItems.map((i) => (
                <tr key={i.name}><td>{i.name}</td><td className="mono">{i.qty}</td></tr>
              ))}
              {!data.topItems.length && <tr><td colSpan={2} className="muted">Sin ventas aún</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Rendimiento por sede</h3>
          <table className="table">
            <thead><tr><th>Sede</th><th>Ventas</th><th>Tickets</th></tr></thead>
            <tbody>
              {data.locations.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td className="mono">{money(l.revenue)}</td>
                  <td className="mono">{l.tickets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Alertas de inventario</h3>
          <table className="table">
            <thead><tr><th>Insumo</th><th>Sede</th><th>Stock</th></tr></thead>
            <tbody>
              {data.lowStock.map((s) => (
                <tr key={s._id}>
                  <td>{s.ingredientId?.name}</td>
                  <td>{s.restaurantId?.name}</td>
                  <td><span className="badge danger">{s.onHand} {s.ingredientId?.unit}</span></td>
                </tr>
              ))}
              {!data.lowStock.length && <tr><td colSpan={3} className="muted">Todo en par</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
