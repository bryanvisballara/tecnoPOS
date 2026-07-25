/** Convert a quantity from one unit to another (mass/volume families only). */
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
  if (mass.includes(from) && mass.includes(to)) {
    return fromBase[to](toBase[from](qty));
  }
  if (vol.includes(from) && vol.includes(to)) {
    return fromBase[to](toBase[from](qty));
  }
  // Different families / discrete units: treat as same unit (no conversion)
  return qty;
}

/** Quantity expressed in the ingredient's stock/cost unit. */
export function toIngredientUnitQty(quantity, lineUnit, ingredientUnit) {
  return convertQuantity(quantity, lineUnit || ingredientUnit, ingredientUnit);
}

export function recipeLineCost(quantity, lineUnit, ingredient) {
  const qtyInIngUnit = toIngredientUnitQty(quantity, lineUnit, ingredient?.unit);
  return (Number(ingredient?.costPerUnit) || 0) * qtyInIngUnit;
}

export function compatibleUnits(baseUnit) {
  if (baseUnit === 'kg' || baseUnit === 'g') return ['kg', 'g'];
  if (baseUnit === 'L' || baseUnit === 'ml') return ['L', 'ml'];
  return [baseUnit || 'unidad'];
}
