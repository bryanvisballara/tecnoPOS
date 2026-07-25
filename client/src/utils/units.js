/** Client-side unit helpers (mirrors server/src/utils/units.js). */

export function convertQuantity(quantity, fromUnit, toUnit) {
  const qty = Number(quantity) || 0;
  const from = (fromUnit || toUnit || '').trim();
  const to = (toUnit || fromUnit || '').trim();
  if (!from || !to || from === to) return qty;

  const toBase = {
    kg: (n) => n * 1000,
    g: (n) => n,
    L: (n) => n * 1000,
    ml: (n) => n,
  };
  const fromBase = {
    kg: (n) => n / 1000,
    g: (n) => n,
    L: (n) => n / 1000,
    ml: (n) => n,
  };

  const mass = ['kg', 'g'];
  const vol = ['L', 'ml'];
  if (mass.includes(from) && mass.includes(to)) return fromBase[to](toBase[from](qty));
  if (vol.includes(from) && vol.includes(to)) return fromBase[to](toBase[from](qty));
  return qty;
}

export function recipeLineCost(quantity, lineUnit, ingredient) {
  const qtyInIngUnit = convertQuantity(quantity, lineUnit || ingredient?.unit, ingredient?.unit);
  return (Number(ingredient?.costPerUnit) || 0) * qtyInIngUnit;
}

export function compatibleUnits(baseUnit) {
  if (baseUnit === 'kg' || baseUnit === 'g') return ['kg', 'g'];
  if (baseUnit === 'L' || baseUnit === 'ml') return ['L', 'ml'];
  return [baseUnit || 'unidad'];
}
