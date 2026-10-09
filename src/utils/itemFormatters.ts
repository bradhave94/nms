import products from '../datav2/Products.json';

export const formatSignedPercent = (value: number): string => `${value >= 0 ? '+' : ''}${(value * 100).toLocaleString()}%`;

// Refinery.json `Time` is the game's raw TimeToMake value, not seconds.
// The No Man's Sky wiki (nomanssky.fandom.com) lists refine times that equal
// TimeToMake / 250 when the output is a substance (Copper -> Chromatic Metal: 90 -> 0.36s)
// and TimeToMake / 2 when the output is a product (Antimatter Bypass Warp Cell: 600 -> 300s).
// The wiki's own timings (20 Di-hydrogen Jelly -> 800 Di-hydrogen in 80s) show the value is
// per batch, i.e. one run of the recipe. The wiki also warns in-game timers are often off,
// so treat the result as approximate.
const productOutputIds = new Set(
  (products as Array<{ Id: string; ProductCategory?: string | null }>)
    .filter((product) => Boolean(product.ProductCategory))
    .map((product) => product.Id)
);

export const getRefineSecondsPerBatch = (time?: string, outputId?: string): number | undefined => {
  if (!time) return undefined;
  const raw = Number.parseFloat(time);
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  const divisor = outputId && productOutputIds.has(outputId) ? 2 : 250;
  return raw / divisor;
};

export const REFINE_TIME_NOTE =
  "Approximate time per batch (one run of the recipe), converted from game data to match the No Man's Sky wiki. In-game refine timers are often off.";

export const formatRefineryTime = (time?: string, outputId?: string): string | undefined => {
  const seconds = getRefineSecondsPerBatch(time, outputId);
  if (seconds === undefined) return time || undefined;
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }
  if (seconds >= 10) return `${Math.round(seconds)}s`;
  return `${Number.parseFloat(seconds.toFixed(2))}s`;
};

export const formatStatName = (name: string): string =>
  name
    .replace(/^Weapon /, '')
    .replace(/^Suit /, '')
    .replace(/^Ship /, '')
    .replace(/^Vehicle /, '')
    .replace(/^Jetpack /, '')
    .replace(/\bDiscovery\b/g, 'Analysis')
    .replace(/\bCreature\b/g, 'Fauna')
    .replace(/\bFlora\b/g, 'Flora')
    .replace(/\bMineral\b/g, 'Mineral');

export const formatStatRange = (name: string, min?: number, max?: number): string => {
  if (typeof min !== 'number' && typeof max !== 'number') return 'Varies';
  const safeMin = min ?? max ?? 0;
  const safeMax = max ?? min ?? 0;
  const lowerName = name.toLowerCase();
  const isDiscoveryLike =
    lowerName.includes('discovery') ||
    lowerName.includes('analysis rewards') ||
    lowerName.includes('analysis reward');
  const isMultiplierLike = safeMin >= 0 && safeMin <= 3 && safeMax >= 0 && safeMax <= 3;
  const usePercent = isDiscoveryLike || isMultiplierLike;

  if (!usePercent) {
    return `${safeMin.toLocaleString()} => ${safeMax.toLocaleString()}`;
  }

  const toPercent = (value: number): number => {
    if (isDiscoveryLike) return value * 100;
    return (value - 1) * 100;
  };

  return `${toPercent(safeMin).toLocaleString()}% => ${toPercent(safeMax).toLocaleString()}%`;
};

export const formatFoodEffectStats = (
  stats: Record<string, unknown> | null | undefined
): string[] => {
  if (!stats) return [];
  const effects: string[] = [];
  if (typeof stats.LifeSupportRechargeAmount === 'number') {
    effects.push(`Life Support +${stats.LifeSupportRechargeAmount} recharge`);
  }
  if (typeof stats.HazardProtectionRechargeAmount === 'number') {
    effects.push(`Hazard Protection +${stats.HazardProtectionRechargeAmount} recharge`);
  }
  const healthMin = stats['GcRewardHealth.AmountMin'];
  const healthMax = stats['GcRewardHealth.AmountMax'];
  if (typeof healthMin === 'number' || typeof healthMax === 'number') {
    const min = typeof healthMin === 'number' ? healthMin : healthMax;
    const max = typeof healthMax === 'number' ? healthMax : healthMin;
    effects.push(min === max ? `Health +${min}` : `Health +${min}–${max}`);
  }
  const moneyMin = stats['GcRewardMoney.AmountMin'];
  const moneyMax = stats['GcRewardMoney.AmountMax'];
  if (typeof moneyMin === 'number' || typeof moneyMax === 'number') {
    const min = typeof moneyMin === 'number' ? moneyMin : (moneyMax as number);
    const max = typeof moneyMax === 'number' ? moneyMax : (moneyMin as number);
    effects.push(min === max ? `Units +${min.toLocaleString()}` : `Units +${min.toLocaleString()}–${max.toLocaleString()}`);
  }
  if (typeof stats['GcRewardFreeStamina.Duration'] === 'number') {
    effects.push(`Stamina boost ${stats['GcRewardFreeStamina.Duration']}s`);
  }
  if (typeof stats['GcRewardJetpackBoost.Duration'] === 'number') {
    effects.push(`Jetpack boost ${stats['GcRewardJetpackBoost.Duration']}s`);
  }
  return effects;
};
