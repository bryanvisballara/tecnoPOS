import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Kitchen() {
  const { restaurantId } = useAuth();
  const [tickets, setTickets] = useState([]);

  const load = async () => {
    const data = await api(`/api/kitchen/tickets?restaurantId=${restaurantId}`, { restaurantId });
    setTickets(data);
  };

  useEffect(() => {
    if (!restaurantId) return;
    load().catch(console.error);
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socket.emit('join:restaurant', restaurantId);
    socket.on('kitchen:update', () => load().catch(() => {}));
    socket.on('order:update', () => load().catch(() => {}));
    const t = setInterval(() => load().catch(() => {}), 10000);
    return () => { socket.disconnect(); clearInterval(t); };
  }, [restaurantId]);

  const setItemStatus = async (orderId, itemId, status) => {
    await api(`/api/orders/${orderId}/item/${itemId}/status`, {
      method: 'POST',
      restaurantId,
      body: { status },
    });
    load();
  };

  return (
    <div className="stack">
      <div className="row">
        <h3 style={{ margin: 0 }}>Kitchen Display</h3>
        <span className="badge warn">{tickets.length} tickets</span>
      </div>
      <div className="kds-grid">
        {tickets.map((ticket) => (
          <div className="panel kds-card" key={ticket.orderId}>
            <h3>#{ticket.orderNumber} · {ticket.table?.name || 'Para llevar'}</h3>
            <div className="muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              {ticket.table?.zone || 'Sin zona'} · {new Date(ticket.openedAt).toLocaleTimeString('es-CO')}
            </div>
            <ul>
              {ticket.items.map((item) => (
                <li key={item._id}>
                  <div>
                    <strong>{item.quantity}× {item.name}</strong>
                    {item.notes && <div className="muted">{item.notes}</div>}
                    <div><span className="badge">{item.status}</span> <span className="badge">{item.station}</span></div>
                  </div>
                  <div className="actions" style={{ flexDirection: 'column', minWidth: 90 }}>
                    {item.status === 'sent' && (
                      <button onClick={() => setItemStatus(ticket.orderId, item._id, 'preparing')}>Prep</button>
                    )}
                    {['sent', 'preparing'].includes(item.status) && (
                      <button className="ghost" onClick={() => setItemStatus(ticket.orderId, item._id, 'ready')}>Listo</button>
                    )}
                    {item.status === 'ready' && (
                      <button onClick={() => setItemStatus(ticket.orderId, item._id, 'served')}>Servido</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!tickets.length && <div className="panel muted">Cocina al día. Sin tickets pendientes.</div>}
      </div>
    </div>
  );
}
