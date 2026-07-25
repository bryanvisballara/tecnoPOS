import { useEffect, useState } from 'react';
import { api, money } from '../api/client';

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cost, setCost] = useState(null);

  useEffect(() => {
    api('/api/menu/recipes').then(setRecipes);
  }, []);

  const openCost = async (id) => {
    setSelected(id);
    const data = await api(`/api/menu/recipes/${id}/cost`);
    setCost(data);
  };

  return (
    <div className="grid two">
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Recetario / BOM</h3>
        <table className="table">
          <thead><tr><th>Receta</th><th>Porciones</th><th>Prep</th><th></th></tr></thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r._id}>
                <td>{r.name}</td>
                <td>{r.portions}</td>
                <td>{r.prepMinutes} min</td>
                <td><button className="ghost" onClick={() => openCost(r._id)}>Costear</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Food cost</h3>
        {!cost && <div className="muted">Selecciona una receta para ver el costo teórico.</div>}
        {cost && (
          <div className="stack">
            <strong>{cost.name}</strong>
            <div>Costo total: <span className="mono">{money(cost.cost)}</span></div>
            <div>Por porción: <span className="mono">{money(cost.costPerPortion)}</span></div>
            <table className="table">
              <thead><tr><th>Insumo</th><th>Cant.</th><th>Costo</th></tr></thead>
              <tbody>
                {cost.breakdown.map((b, idx) => (
                  <tr key={idx}>
                    <td>{b.ingredient}</td>
                    <td>{b.quantity} {b.unit}</td>
                    <td className="mono">{money(b.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
