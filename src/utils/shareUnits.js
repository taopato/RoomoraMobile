const positiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

export const normalizeShareUnits = (units = [], participantIds = []) => {
  const allowed = new Set(participantIds.filter(positiveId).map(Number));
  const saved = new Map((Array.isArray(units) ? units : [])
    .filter((entry) => positiveId(entry?.userId))
    .map((entry) => [Number(entry.userId), entry]));
  return [...allowed].sort((a, b) => a - b).map((userId) => {
    const entry = saved.get(userId);
    const count = Number(entry?.units);
    const units = Number.isInteger(count) && count >= 1 && count <= 50 ? count : 1;
    return {
      userId,
      units,
      forLabel: units > 1 ? String(entry?.forLabel || '').slice(0, 80) : '',
    };
  });
};

export const hasCustomShareUnits = (units = []) =>
  (Array.isArray(units) ? units : []).some((entry) => Number(entry?.units) > 1);

export const allocateShareUnits = (amount, units = []) => {
  const valid = (Array.isArray(units) ? units : []).filter((entry) => Number(entry?.units) > 0);
  const totalUnits = valid.reduce((sum, entry) => sum + Number(entry.units), 0);
  const cents = Math.round(Number(amount || 0) * 100);
  if (!totalUnits || cents < 0) return [];
  const portions = valid.map((entry) => {
    const numerator = cents * Number(entry.units);
    return {
      userId: Number(entry.userId),
      cents: Math.floor(numerator / totalUnits),
      remainder: numerator % totalUnits,
    };
  });
  const extras = cents - portions.reduce((sum, entry) => sum + entry.cents, 0);
  const ranked = [...portions].sort((a, b) => b.remainder - a.remainder || a.userId - b.userId);
  const extraIds = new Set(ranked.slice(0, extras).map((entry) => entry.userId));
  return portions.sort((a, b) => a.userId - b.userId).map((entry) => ({
    userId: entry.userId,
    amount: (entry.cents + (extraIds.has(entry.userId) ? 1 : 0)) / 100,
  }));
};

export const shareUnitsSummary = (units = [], members = []) => {
  const names = new Map(members.map((member) => [Number(member.id), String(member.fullName || member.name || '')]));
  return units.filter((entry) => Number(entry.units) > 0)
    .map((entry) => `${names.get(Number(entry.userId)) || 'Üye'} ${entry.units}${entry.forLabel ? ` (${entry.forLabel})` : ''}`)
    .join(' · ');
};
