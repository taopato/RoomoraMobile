import { getReceiptStoreName } from './receiptPresentation.js';

const validDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
};

export const attachReceiptDates = (expenses, receipts) => {
  const byExpenseId = new Map(
    (receipts || [])
      .filter((receipt) => receipt.convertedExpenseId != null)
      .map((receipt) => [Number(receipt.convertedExpenseId), receipt])
  );

  return expenses.map((expense) => {
    const receipt = byExpenseId.get(Number(expense.id));
    if (!receipt) return expense;
    return {
      ...expense,
      receiptUploadedAt: receipt.createdAt,
      receiptDate: receipt.receiptDate,
      receiptStoreName: getReceiptStoreName(receipt),
    };
  });
};

export const getTimelineDate = (expense, mode = 'added') => {
  const raw = expense?._raw || {};
  const expenseDate = validDate(expense?.receiptDate)
    || validDate(raw.postDate ?? raw.PostDate)
    || validDate(expense?.date);
  const addedDate = validDate(expense?.receiptUploadedAt)
    || validDate(raw.kayitTarihi ?? raw.KayitTarihi)
    || validDate(raw.createdDate ?? raw.CreatedDate);

  return mode === 'expense'
    ? (expenseDate || addedDate || new Date(0))
    : (addedDate || expenseDate || new Date(0));
};

export const sortExpensesByTimeline = (expenses, mode = 'added') => [...expenses].sort((a, b) => {
  const difference = getTimelineDate(b, mode).getTime() - getTimelineDate(a, mode).getTime();
  return difference || Number(b.id || 0) - Number(a.id || 0);
});
