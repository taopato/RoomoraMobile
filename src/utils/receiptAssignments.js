const normalizeIds = (values = []) => [...new Set(
  values.map(Number).filter((value) => Number.isInteger(value) && value > 0)
)].sort((left, right) => left - right);

export const getMemberIds = (members = []) => normalizeIds(members.map((member) => member.id));

export const getReceiptItemParticipantIds = (item, members = []) => {
  const explicit = normalizeIds(item?.participantUserIds || []);
  if (explicit.length > 0) return explicit;
  if (item?.isShared !== false) return getMemberIds(members);
  return normalizeIds([item?.personalUserId]);
};

export const buildReceiptAssignment = (participantUserIds, members = []) => {
  const memberIds = getMemberIds(members);
  const allowed = new Set(memberIds);
  const selected = normalizeIds(participantUserIds).filter((id) => allowed.has(id));
  const isWholeHouse = memberIds.length > 0 && selected.length === memberIds.length;

  return {
    isAssigned: selected.length > 0,
    isShared: isWholeHouse,
    personalUserId: selected.length === 1 ? selected[0] : null,
    participantUserIds: selected,
  };
};

export const toggleReceiptParticipant = (item, userId, members = []) => {
  const selected = getReceiptItemParticipantIds(item, members);
  const numericUserId = Number(userId);
  const next = selected.includes(numericUserId)
    ? selected.filter((id) => id !== numericUserId)
    : [...selected, numericUserId];
  return buildReceiptAssignment(next, members);
};

