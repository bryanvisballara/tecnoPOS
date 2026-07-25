import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, money } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function POS() {
  const { restaurantId } = useAuth();
  const [params] = useSearchParams();
  const tableId = params.get('tableId');
  const tableName = params.get('tableName');

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState('all');
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/api/menu/categories'),
      api('/api/menu/items?available=true'),
    ]).then(([c, i]) => {
      setCategories(c);
      setItems(i);
    });
  }, []);

  const filtered = useMemo(
    () => (cat === 'all' ? items : items.filter((i) => i.categoryId?._id === cat || i.categoryId === cat)),
    [items, cat]
  );

  const add = (item) => {
    setCart((prev) => {
      const found = prev.find((p) => p.menuItemId === item._id);
      if (found) return prev.map((p) => (p.menuItemId === item._id ? { ...p, quantity: p.quantity + 1 } : p));
      return [...prev, { menuItemId: item._id, name: item.name, unitPrice: item.price, quantity: 1 }];
    });
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const createOrder = async () => {
    setBusy(true);
    setMsg('');
    try {
      const created = await api('/api/orders', {
        method: 'POST',
        restaurantId,
        body: {
          restaurantId,
          tableId: tableId || undefined,
          items: cart,
          guests: 2,
        },
      });
      setOrder(created);
      setCart([]);
      setMsg(`Orden #${created.orderNumber} creada`);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendKitchen = async () => {
    if (!order) return;
    const updated = await api(`/api/orders/${order._id}/send`, { method: 'POST', restaurantId });
    setOrder(updated);
    setMsg('Enviado a cocina');
  };

  const pay = async (method) => {
    if (!order) return;
    const updated = await api(`/api/orders/${order._id}/pay`, {
      method: 'POST',
      restaurantId,
      body: { method, amount: order.total, tip: 0 },
    });
    setOrder(updated);
    setMsg(`Pagado · ${method}`);
  };

  return (
    <div className="pos-layout">
      <div className="panel">
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <strong>{tableName ? `Mesa ${tableName}` : 'Pedido rápido'}</strong>
          {order && <span className="badge">#{order.orderNumber} · {order.status}</span>}
        </div>
        <div className="menu-cats">
          <button className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}>Todo</button>
          {categories.map((c) => (
            <button key={c._id} className={cat === c._id ? 'active' : ''} onClick={() => setCat(c._id)}>{c.name}</button>
          ))}
        </div>
        <div className="menu-grid">
          {filtered.map((item) => (
            <button key={item._id} className="menu-item" onClick={() => add(item)}>
              <div>{item.name}</div>
              <small>{money(item.price)}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="panel ticket">
        <h3 style={{ margin: 0 }}>Ticket</h3>
        <div className="ticket-lines">
          {cart.map((line) => (
            <div className="ticket-line" key={line.menuItemId}>
              <div>
                <strong>{line.quantity}× {line.name}</strong>
              </div>
              <div className="mono">{money(line.unitPrice * line.quantity)}</div>
            </div>
          ))}
          {order?.items?.map((line) => (
            <div className="ticket-line" key={line._id}>
              <div>
                <strong>{line.quantity}× {line.name}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>{line.status}</div>
              </div>
              <div className="mono">{money(line.unitPrice * line.quantity)}</div>
            </div>
          ))}
          {!cart.length && !order && <div className="muted">Toca productos para armar la orden</div>}
        </div>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Subtotal carrito</span>
          <strong className="mono">{money(subtotal)}</strong>
        </div>
        {order && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">Total orden</span>
            <strong className="mono">{money(order.total)}</strong>
          </div>
        )}
        {msg && <div className="badge">{msg}</div>}

        <div className="ticket-actions">
          <button disabled={!cart.length || busy} onClick={createOrder}>Abrir orden</button>
          <button className="ghost" disabled={!order || order.status === 'paid'} onClick={sendKitchen}>Enviar cocina</button>
          <button disabled={!order || order.status === 'paid'} onClick={() => pay('cash')}>Pagar efectivo</button>
          <button className="ghost" disabled={!order || order.status === 'paid'} onClick={() => pay('card')}>Pagar tarjeta</button>
        </div>
      </div>
    </div>
  );
}
