const normalizeIds = (values) => [...new Set(
  (Array.isArray(values) ? values : [])
    .map((value) => String(value))
    .filter(Boolean)
)];

export const selectParticipant = (currentIds, memberId, allMemberIds) => {
  const current = normalizeIds(currentIds);
  const all = normalizeIds(allMemberIds);
  const id = String(memberId);

  if (!id || !all.includes(id)) return current;

  const allSelected = all.length > 1 && all.every((member) => current.includes(member));
  if (allSelected) return [id];
  if (!current.includes(id)) return [...current, id];
  if (current.length === 1) return current;
  return current.filter((value) => value !== id);
};
