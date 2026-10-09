import assert from 'node:assert/strict';
import {
  formatTurkishIbanDigits,
  formatTurkishMobile,
  getTurkishMobileDigits,
  isValidTurkishIban,
  isValidTurkishMobile,
  toCanonicalTurkishIban,
  toTurkishMobileE164,
} from '../src/shared/validation/profileValidation.js';
import { formatMoneyInput, parseMoneyInput } from '../src/shared/format/money.js';
import { normalizeExpenseCategoryKey } from '../src/constants/ExpenseEnums.js';
import { getTokenUserId, isTokenExpired, normalizeAuthUser } from '../src/shared/auth/session.js';
import { getPaymentOutcome } from '../src/shared/finance/paymentOutcome.js';
import { extractDetectedTotalFromRawText, resolveReceiptItems } from '../src/utils/receiptParser.js';
import {
  buildReceiptAssignment,
  getReceiptItemParticipantIds,
  getReceiptParticipantSummary,
  toggleReceiptParticipant,
} from '../src/utils/receiptAssignments.js';
import { getContainedImageMetrics, getContainedOverlayStyle } from '../src/utils/receiptLayout.js';
import { getLocale, setActiveLanguage, translate } from '../src/shared/i18n/runtime.js';

setActiveLanguage('tr');
assert.equal(translate('Faturalar'), 'Faturalar');
assert.equal(getLocale(), 'tr-TR');
setActiveLanguage('en');
assert.equal(translate('Faturalar'), 'Bills');
assert.equal(translate('Ayşe ödedi · 09.10.2026'), 'Ayşe paid · 09.10.2026');
assert.equal(getLocale(), 'en-US');
setActiveLanguage('tr');

assert.equal(getTurkishMobileDigits('0554 361 75 75'), '5543617575');
assert.equal(getTurkishMobileDigits('+90 (554) 361 75 75'), '5543617575');
assert.equal(formatTurkishMobile('5543617575'), '(554) 361 75 75');
assert.equal(toTurkishMobileE164('05543617575'), '+905543617575');
assert.equal(isValidTurkishMobile('5543617575'), true);
assert.equal(isValidTurkishMobile('4543617575'), false);

const validIban = 'TR330006100519786457841326';
assert.equal(toCanonicalTurkishIban(validIban), validIban);
assert.equal(formatTurkishIbanDigits(validIban), '33 0006 1005 1978 6457 8413 26');
assert.equal(isValidTurkishIban(validIban), true);
assert.equal(isValidTurkishIban('TR330006100519786457841327'), false);

assert.equal(formatMoneyInput('1234567,89'), '1.234.567,89');
assert.equal(formatMoneyInput('1.234.567,89'), '1.234.567,89');
assert.equal(parseMoneyInput('1.234.567,89'), 1234567.89);
assert.equal(parseMoneyInput('850'), 850);

assert.equal(normalizeExpenseCategoryKey('Electricity'), 'Electricity');
assert.equal(normalizeExpenseCategoryKey(2), 'Electricity');
assert.equal(normalizeExpenseCategoryKey('6'), 'Gas');
assert.equal(normalizeExpenseCategoryKey('unknown'), null);

const makeToken = (payload) => {
  const part = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${part}.signature`;
};
const validToken = makeToken({
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '25',
  exp: Math.floor(Date.now() / 1000) + 3600,
});
assert.equal(getTokenUserId(validToken), 25);
assert.deepEqual(normalizeAuthUser({ email: 'test@example.com' }, validToken), {
  email: 'test@example.com',
  id: 25,
});
assert.equal(normalizeAuthUser({ id: 7 }, validToken).id, 7);
assert.equal(isTokenExpired(validToken), false);
assert.equal(isTokenExpired(makeToken({ exp: 1 })), true);

assert.deepEqual(getPaymentOutcome(3000, 2500), {
  remainingDebt: 500,
  resultingCredit: 0,
  closesDebt: false,
});
assert.deepEqual(getPaymentOutcome(3000, 3000), {
  remainingDebt: 0,
  resultingCredit: 0,
  closesDebt: true,
});
assert.deepEqual(getPaymentOutcome(3000, 3500), {
  remainingDebt: 0,
  resultingCredit: 500,
  closesDebt: true,
});
assert.deepEqual(getPaymentOutcome(0, 500), {
  remainingDebt: 0,
  resultingCredit: 500,
  closesDebt: false,
});

const discountedReceipt = `
SLEEPY YUZTEM100LU %20.0 *119,00
BEYPAZARI 200 ML %1.0 *240,00
DANA KANGAL SUCUK %1.0 *419,00
URUN INDIRIMLERI:
BEYPAZARI 200 ML %1.00 *-6,00
BEYPAZARI 200 ML %1.00 *-6,00
BEYPAZARI 200 ML %1.00 *-6,00
DANA KANGAL SUCUK %1.00 *-119,50
SLEEPY YUZTEM100LU %20.0 *-41,50
MAL/HIZMET TOPLAM TUTARI *1.381,13
TOPKDV *29,87
ODENECEK TUTAR *1.411,00
`;
const discountedItems = resolveReceiptItems([], discountedReceipt, 1411);
const discountedByName = Object.fromEntries(discountedItems.map((item) => [item.name.toUpperCase(), item]));
assert.equal(discountedByName.BEYPAZARI.lineTotal, 222);
assert.equal(discountedByName.BEYPAZARI.discountAmount, 18);
assert.equal(discountedByName['DANA KANGAL SUCUK'].lineTotal, 299.5);
assert.equal(discountedByName['SLEEPY YUZTEM100LU'].lineTotal, 77.5);
assert.equal(extractDetectedTotalFromRawText(discountedReceipt), 1411);

const receiptMembers = [{ id: 38 }, { id: 39 }, { id: 40 }];
assert.deepEqual(
  getReceiptItemParticipantIds({ isShared: true, participantUserIds: [] }, receiptMembers),
  [38, 39, 40]
);
assert.deepEqual(
  toggleReceiptParticipant({ isShared: true }, 38, receiptMembers),
  {
    isAssigned: true,
    isShared: false,
    personalUserId: null,
    participantUserIds: [39, 40],
  }
);
assert.deepEqual(
  buildReceiptAssignment([38, 40], receiptMembers),
  {
    isAssigned: true,
    isShared: false,
    personalUserId: null,
    participantUserIds: [38, 40],
  }
);
assert.deepEqual(
  buildReceiptAssignment([39], receiptMembers),
  {
    isAssigned: true,
    isShared: false,
    personalUserId: 39,
    participantUserIds: [39],
  }
);
assert.equal(getReceiptParticipantSummary([38, 39, 40], receiptMembers), 'Tüm ev');
assert.equal(getReceiptParticipantSummary([38, 40], receiptMembers), '2 kişi');
assert.equal(
  getReceiptParticipantSummary([39], [{ id: 38, fullName: 'Tarik' }, { id: 39, fullName: 'Tufan' }]),
  'Tufan'
);
assert.equal(getReceiptParticipantSummary([], receiptMembers), 'Kişi seçilmedi');

const receiptMetrics = getContainedImageMetrics(
  { width: 335, height: 260 },
  { width: 2200, height: 2934 }
);
assert.ok(receiptMetrics.offsetX > 69 && receiptMetrics.offsetX < 71);
const sleepyMarkerLeft = receiptMetrics.offsetX + (1303 * receiptMetrics.scale);
assert.ok(sleepyMarkerLeft > receiptMetrics.offsetX);
assert.ok(sleepyMarkerLeft < receiptMetrics.offsetX + receiptMetrics.renderedWidth);
const sleepyOverlay = getContainedOverlayStyle({
  boxLeft: 1303,
  boxTop: 675,
  boxWidth: 213,
  boxHeight: 67,
}, receiptMetrics);
assert.ok(sleepyOverlay.left >= receiptMetrics.offsetX);
assert.ok(sleepyOverlay.top >= receiptMetrics.offsetY);
assert.ok(sleepyOverlay.left + sleepyOverlay.width <= receiptMetrics.offsetX + receiptMetrics.renderedWidth);
assert.ok(sleepyOverlay.top + sleepyOverlay.height <= receiptMetrics.offsetY + receiptMetrics.renderedHeight);

const rightEdgeOverlay = getContainedOverlayStyle({
  boxLeft: 2190,
  boxTop: 2920,
  boxWidth: 300,
  boxHeight: 100,
}, receiptMetrics);
assert.ok(rightEdgeOverlay.left + rightEdgeOverlay.width <= receiptMetrics.offsetX + receiptMetrics.renderedWidth);
assert.ok(rightEdgeOverlay.top + rightEdgeOverlay.height <= receiptMetrics.offsetY + receiptMetrics.renderedHeight);

console.log('Roomora domain tests passed.');
