import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
  owner: 'Dueño cadena',
  manager: 'Gerente',
  waiter: 'Mesero',
  kitchen: 'Cocina',
  cashier: 'Caja',
};

export default function Staff() {
  const { restaurants } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api('/api/users').then(setUsers);
  }, []);

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Equipo y roles</h3>
      <p className="muted">Roles operativos: mesero, cocina, caja, gerente de sede y dueño de cadena.</p>
      <table className="table">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sedes</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td><span className="badge">{ROLE_LABEL[u.role] || u.role}</span></td>
              <td>
                {(u.restaurantIds || [])
                  .map((id) => restaurants.find((r) => r._id === id || r._id === id?._id)?.code || '•')
                  .join(', ') || 'Todas'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
