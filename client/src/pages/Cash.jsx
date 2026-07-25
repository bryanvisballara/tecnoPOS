import { useEffect, useState } from 'react';
import { api, money } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Cash() {
  const { restaurantId } = useAuth();
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [floatAmt, setFloatAmt] = useState(200000);
  const [closing, setClosing] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [current, hist] = await Promise.all([
      api(`/api/cash/current?restaurantId=${restaurantId}`, { restaurantId }),
      api(`/api/cash/history?restaurantId=${restaurantId}`, { restaurantId }),
    ]);
    setSession(current);
    setHistory(hist);
  };

  useEffect(() => {
    if (restaurantId) load().catch(console.error);
  }, [restaurantId]);

  const open = async () => {
    await api('/api/cash/open', { method: 'POST', restaurantId, body: { restaurantId, openingFloat: Number(floatAmt) } });
    setMsg('Caja abierta');
    load();
  };

  const close = async () => {
    const res = await api('/api/cash/close', {
      method: 'POST',
      restaurantId,
      body: { restaurantId, closingCash: Number(closing || 0) },
    });
    setMsg(`Caja cerrada · diferencia ${money(res.variance)}`);
    load();
  };

  return (
    <div className="grid two">
      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Turno de caja</h3>
        {session ? (
          <>
            <div className="badge ok">Abierta</div>
            <div>Cajero: {session.cashierId?.name || '—'}</div>
            <div>Fondo inicial: <strong className="mono">{money(session.openingFloat)}</strong></div>
            <div>Desde: {new Date(session.openedAt).toLocaleString('es-CO')}</div>
            <label>
              Efectivo al cierre
              <input value={closing} onChange={(e) => setClosing(e.target.value)} type="number" />
            </label>
            <button onClick={close}>Cerrar caja</button>
          </>
        ) : (
          <>
            <div className="badge warn">Sin turno abierto</div>
            <label>
              Fondo inicial
              <input value={floatAmt} onChange={(e) => setFloatAmt(e.target.value)} type="number" />
            </label>
            <button onClick={open}>Abrir caja</button>
          </>
        )}
        {msg && <div className="badge">{msg}</div>}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Historial</h3>
        <table className="table">
          <thead><tr><th>Fecha</th><th>Efectivo</th><th>Tarjeta</th><th>Diff</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h._id}>
                <td>{new Date(h.openedAt).toLocaleDateString('es-CO')}</td>
                <td className="mono">{money(h.salesCash)}</td>
                <td className="mono">{money(h.salesCard)}</td>
                <td className="mono">{h.variance != null ? money(h.variance) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
