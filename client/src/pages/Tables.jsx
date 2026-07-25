import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Tables() {
  const { restaurantId } = useAuth();
  const [tables, setTables] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const data = await api(`/api/tables?restaurantId=${restaurantId}`, { restaurantId });
    setTables(data);
  };

  useEffect(() => {
    if (!restaurantId) return;
    load().catch(console.error);
    const t = setInterval(() => load().catch(() => {}), 8000);
    return () => clearInterval(t);
  }, [restaurantId]);

  const clean = async (id) => {
    await api(`/api/tables/${id}/status`, { method: 'POST', body: { status: 'free' }, restaurantId });
    load();
  };

  return (
    <div className="stack">
      <div className="row">
        <span className="badge ok">Libre</span>
        <span className="badge">Ocupada</span>
        <span className="badge warn">Cuenta</span>
        <span className="badge danger">Sucia</span>
      </div>
      <div className="panel floor">
        {tables.map((t) => (
          <div
            key={t._id}
            className={`table-node ${t.status} ${t.shape}`}
            style={{ left: t.x, top: t.y, width: t.width, height: t.height }}
            onClick={() => {
              if (t.status === 'dirty') return clean(t._id);
              navigate(`/pos?tableId=${t._id}&tableName=${encodeURIComponent(t.name)}`);
            }}
            title={`${t.zone} · ${t.seats} pax`}
          >
            <div>
              <div>{t.name}</div>
              <small style={{ opacity: 0.8 }}>{t.zone}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
