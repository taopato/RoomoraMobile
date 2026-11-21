// "Kim ödedi" / "kimin için" filtresi: payer = ödeyen, beneficiary = payı olan kişi ('all' = herkes)
export const ANYONE = 'all';

export const shareOf = (expense, userId) => (expense?.participants || [])
  .filter((part) => Number(part.userId) === Number(userId))
  .reduce((sum, part) => sum + Number(part.amount || 0), 0);

export const matchesPeople = (expense, payer = ANYONE, beneficiary = ANYONE) => {
  if (payer !== ANYONE && Number(expense?.payerId) !== Number(payer)) return false;
  if (beneficiary !== ANYONE && shareOf(expense, beneficiary) <= 0) return false;
  return true;
};

// Kişi seçiliyse satırda ve toplamda o kişinin payı gösterilir
export const shownAmount = (expense, beneficiary = ANYONE) => (
  beneficiary === ANYONE ? Number(expense?.amount || 0) : shareOf(expense, beneficiary)
);

export const normalizeParticipants = (raw) => (Array.isArray(raw) ? raw : [])
  .map((part) => ({
    userId: Number(part?.userId ?? part?.UserId),
    amount: Number(part?.amount ?? part?.Amount ?? 0),
  }))
  .filter((part) => Number.isFinite(part.userId) && part.userId > 0 && part.amount > 0);
