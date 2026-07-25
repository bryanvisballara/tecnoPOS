/**
 * Apply operating costs on top of ingredient cost.
 * - fixed: flat COP amount
 * - percent: % of ingredientCost (base), not cascading
 */
export function operatingLineAmount(ingredientCost, line) {
  const value = Number(line?.value) || 0;
  if (line?.mode === 'percent') {
    return (Number(ingredientCost) || 0) * (value / 100);
  }
  return value;
}

export function sumOperatingCosts(ingredientCost, lines = []) {
  return (lines || []).reduce((sum, line) => sum + operatingLineAmount(ingredientCost, line), 0);
}

export function totalDishCost(ingredientCost, operatingLines = []) {
  return (Number(ingredientCost) || 0) + sumOperatingCosts(ingredientCost, operatingLines);
}
