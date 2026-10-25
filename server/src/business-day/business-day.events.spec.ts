import { ExpenseStatus, InvestorTxType, LedgerType, PaymentMethod, Prisma } from '@prisma/client';
import { buildEvents, ExtraEventRows } from './business-day.events';
import { DayWindow } from './business-day.mappers';

const dec = (v: string) => new Prisma.Decimal(v);
const at = (hh: number) => new Date(`2026-10-25T${String(hh).padStart(2, '0')}:00:00Z`);
const u = { id: 1, name: 'Ali' };
const confirmed = { sale: { confirmedAt: at(8) } }; // sale confirmed before the rows: they move the drawer at their own time
const sale = (id: number, total: string) => ({ id, total: dec(total), createdAt: at(9), seller: u, confirmedAt: at(8), confirmedBy: null });
const item = { productModel: { name: 'iPhone 15' }, identifiers: [{ value: '3500' }] };

function emptyWindow(): DayWindow {
  return {
    payments: [], ledger: [], sales: [], returns: [], walkInPurchases: [], walkInPayouts: [], pendingWalkIn: [],
    windowPayments: [], windowReturns: [], confirmedSales: [],
  };
}
function emptyExtra(): ExtraEventRows {
  return {
    supplierPayments: [], investorTxs: [], batchLines: [], stockLines: [], consignments: [],
    consignmentSold: [], consignmentReturned: [], transfers: [], stockCounts: [],
  };
}
const byKind = (events: ReturnType<typeof buildEvents>, kind: string) => events.filter((e) => e.kind === kind);

describe('buildEvents (F30 day events feed)', () => {
  it('maps money kinds with signed cash/card, null zero effects and refType only on the five ref kinds', () => {
    const win = emptyWindow();
    win.sales = [sale(7, '900')];
    win.windowPayments = [
      { id: 11, amount: dec('200'), method: PaymentMethod.CASH, saleId: 7, createdAt: at(9), receiver: u, ...confirmed },
      { id: 12, amount: dec('300'), method: PaymentMethod.CARD, saleId: 7, createdAt: at(9), receiver: u, ...confirmed },
    ];
    const saleItem = { productModel: null, item: { identifiers: [{ value: 'IMEI1' }] } };
    win.windowReturns = [
      { id: 21, saleId: 7, refundAmount: dec('100'), cashRefund: dec('0'), reason: null, createdAt: at(10), user: u, saleItem, ...confirmed },
      { id: 22, saleId: 7, refundAmount: dec('50'), cashRefund: dec('50'), reason: 'broken', createdAt: at(10), user: u, saleItem, ...confirmed },
    ];
    const base = { inCash: true, note: null, createdAt: at(11), user: u };
    win.ledger = [
      { ...base, id: 31, category: 'Rent', amount: dec('150'), type: LedgerType.EXPENSE, status: ExpenseStatus.CONFIRMED },
      { ...base, id: 32, category: 'Taxi', amount: dec('20'), type: LedgerType.EXPENSE, status: ExpenseStatus.PENDING },
      { ...base, id: 33, category: 'Tips', amount: dec('40'), type: LedgerType.INCOME, status: ExpenseStatus.CONFIRMED },
    ];
    const walkIn = { id: 41, unitPrice: dec('150'), quantity: 1, createdAt: at(12), walkInSeller: { name: 'Bob' }, item };
    win.walkInPurchases = [{ ...walkIn, paidAt: null, paidBy: null }];
    win.walkInPayouts = [{ ...walkIn, paidAt: at(14), paidBy: { id: 2, name: 'Admin' } }];
    const extra = emptyExtra();
    extra.supplierPayments = [{ id: 51, amount: dec('1000'), fee: dec('12'), date: at(13), supplier: { name: 'HK' } }];
    extra.investorTxs = [{ id: 61, type: InvestorTxType.PAYOUT, amount: dec('500'), date: at(13), note: null, investor: { name: 'Sardor' } }];

    const events = buildEvents(win, extra);
    const get = (id: string) => events.find((e) => e.id === id);

    expect(get('SALE:7')).toMatchObject({ cash: null, card: null, amount: '900.00', refType: 'SALE', refId: 7, title: '#7' });
    expect(get('PAYMENT:11')).toMatchObject({ cash: '+200.00', card: null, method: 'CASH', subtitle: null, refType: 'PAYMENT', refId: 11 });
    expect(get('PAYMENT:12')).toMatchObject({ cash: null, card: '+300.00', method: 'CARD' });
    expect(get('RETURN:21')).toMatchObject({ cash: null, amount: '100.00', refType: 'RETURN' }); // debt cancel: no drawer effect
    expect(get('RETURN:22')).toMatchObject({ cash: '-50.00' });
    expect(get('EXPENSE:31')).toMatchObject({ cash: '-150.00', refType: 'EXPENSE', title: 'Rent' });
    expect(get('EXPENSE:32')).toMatchObject({ cash: null }); // PENDING never leaves the drawer (F27)
    expect(get('INCOME:33')).toMatchObject({ cash: '+40.00', refType: 'INCOME' });
    // The purchase is informational; the drawer moves only on the confirmed payout, by the confirmer (F32).
    expect(get('WALK_IN_PURCHASE:41')).toMatchObject({ cash: null, amount: '150.00', title: 'iPhone 15', subtitle: 'Bob', refType: null, refId: null });
    expect(get('WALK_IN_PAYOUT:41')).toMatchObject({
      cash: '-150.00', time: at(14).toISOString(), user: { id: 2, name: 'Admin' }, title: 'iPhone 15', subtitle: 'Bob', refType: null,
    });
    expect(get('SUPPLIER_PAYMENT:51')).toMatchObject({ cash: null, fee: '12.00', subtitle: null, refType: null });
    expect(get('INVESTOR_PAYOUT:61')).toMatchObject({ cash: null, title: 'Sardor', refType: null });

    const refKinds = new Set(['SALE', 'PAYMENT', 'RETURN', 'EXPENSE', 'INCOME']);
    for (const e of events) expect(e.refType !== null).toBe(refKinds.has(e.kind) || e.kind === 'SALE_CONFIRMED');
  });

  it('groups batch lines into one BATCH_RECEIVED per batch and keeps hand-added lines as STOCK_RECEIVED', () => {
    const extra = emptyExtra();
    const batch = { id: 5, supplier: { name: 'HK' } };
    extra.batchLines = [
      { unitPrice: dec('100'), quantity: 1, createdAt: at(8), batch },
      { unitPrice: dec('20'), quantity: 3, createdAt: at(9), batch },
      { unitPrice: dec('10'), quantity: 1, createdAt: at(8), batch: { id: 6, supplier: { name: 'UAE' } } },
    ];
    extra.stockLines = [{ id: 70, unitPrice: dec('5'), quantity: 2, createdAt: at(8), item: null, productModel: { name: 'Case' } }];

    const events = buildEvents(emptyWindow(), extra);
    const batches = byKind(events, 'BATCH_RECEIVED');
    expect(batches).toHaveLength(2);
    expect(batches.find((e) => e.id === 'BATCH_RECEIVED:5')).toMatchObject({
      amount: '160.00', count: 4, subtitle: null, title: 'HK', time: at(9).toISOString(), cash: null,
    });
    expect(byKind(events, 'STOCK_RECEIVED')).toEqual([
      expect.objectContaining({ id: 'STOCK_RECEIVED:70', title: 'Case', count: 2, subtitle: null, amount: '10.00', cash: null, refType: null }),
    ]);
  });

  it('maps consignments, transfers and stock counts, and sorts newest first across kinds', () => {
    const extra = emptyExtra();
    extra.consignments = [{ id: 1, date: at(8), handedBy: u, partner: { name: 'Shop A' }, items: [{ minPrice: dec('100') }, { minPrice: dec('50') }] }];
    const ci = { id: 2, minPrice: dec('100'), item, consignment: { partner: { name: 'Shop A' } } };
    extra.consignmentSold = [{ ...ci, soldAt: at(10), returnedAt: null, saleItem: { unitPrice: dec('120') } }];
    extra.consignmentReturned = [{ ...ci, id: 3, soldAt: null, returnedAt: at(11), saleItem: null }];
    extra.transfers = [
      { id: 4, date: at(12), user: u, fromLocation: { name: 'Sklad' }, toLocation: { name: 'Shop' }, _count: { items: 2, accessories: 1 } },
    ];
    extra.stockCounts = [{ id: 5, startedAt: at(9), finishedAt: null, user: u, location: { name: 'Shop' } }];

    const events = buildEvents(emptyWindow(), extra);
    expect(events.map((e) => e.id)).toEqual([
      'TRANSFER:4', 'CONSIGNMENT_RETURNED:3', 'CONSIGNMENT_SOLD:2', 'STOCK_COUNT:5', 'HANDOVER:1',
    ]);
    expect(events[0]).toMatchObject({ title: 'Sklad → Shop', count: 3, subtitle: null, amount: null, cash: null });
    expect(events[1]).toMatchObject({ amount: '100.00', subtitle: 'iPhone 15' });
    expect(events[2]).toMatchObject({ amount: '120.00', title: 'Shop A' });
    expect(events[4]).toMatchObject({ amount: '150.00', count: 2, subtitle: null, user: u });
    expect(events[3]).toMatchObject({ finished: false, subtitle: null, title: 'Shop' });
    for (const e of events) expect(e.cash).toBeNull();
  });

  it('breaks time ties by numeric row id desc, then kind', () => {
    const win = emptyWindow();
    win.sales = [sale(9, '1'), sale(10, '1')];
    win.windowPayments = [{ id: 10, amount: dec('1'), method: PaymentMethod.CARD, saleId: 9, createdAt: at(9), receiver: u, ...confirmed }];
    expect(buildEvents(win, emptyExtra()).map((e) => e.id)).toEqual(['PAYMENT:10', 'SALE:10', 'SALE:9']);
  });

  it('a PAYMENT / RETURN of an unconfirmed sale, or recorded before its confirmation, has no drawer effect (F33)', () => {
    const win = emptyWindow();
    const saleItem = { productModel: null, item: { identifiers: [{ value: 'IMEI1' }] } };
    const pay = { amount: dec('200'), method: PaymentMethod.CASH, saleId: 7, createdAt: at(9), receiver: u };
    win.windowPayments = [
      { ...pay, id: 1, sale: { confirmedAt: null } }, // waiting
      { ...pay, id: 2, sale: { confirmedAt: at(10) } }, // confirmed later: counted by SALE_CONFIRMED
      { ...pay, id: 3, sale: { confirmedAt: at(9) } }, // tie: counts at its own time
    ];
    const ret = { saleId: 7, refundAmount: dec('50'), cashRefund: dec('50'), reason: null, createdAt: at(9), user: u, saleItem };
    win.windowReturns = [{ ...ret, id: 4, sale: { confirmedAt: null } }, { ...ret, id: 5, sale: { confirmedAt: at(8) } }];
    const events = buildEvents(win, emptyExtra());
    const get = (id: string) => events.find((e) => e.id === id);
    expect(get('PAYMENT:1')).toMatchObject({ cash: null, card: null, amount: '200.00' });
    expect(get('PAYMENT:2')).toMatchObject({ cash: null, card: null });
    expect(get('PAYMENT:3')).toMatchObject({ cash: '+200.00' });
    expect(get('RETURN:4')).toMatchObject({ cash: null });
    expect(get('RETURN:5')).toMatchObject({ cash: '-50.00' });
  });

  it('SALE_CONFIRMED carries the money taken before confirmation, net of cash refunds; null when zero', () => {
    const win = emptyWindow();
    const admin = { id: 2, name: 'Admin' };
    win.confirmedSales = [
      {
        id: 7, confirmedAt: at(12), confirmedBy: admin, customer: { name: 'Vali' }, partner: null,
        payments: [
          { amount: dec('1100'), method: PaymentMethod.CASH, createdAt: at(9) },
          { amount: dec('300'), method: PaymentMethod.CARD, createdAt: at(10) },
          { amount: dec('999'), method: PaymentMethod.CASH, createdAt: at(13) }, // after: its own PAYMENT event
        ],
        returns: [{ cashRefund: dec('100'), createdAt: at(11) }],
      },
      { id: 8, confirmedAt: at(12), confirmedBy: admin, customer: null, partner: { name: 'Shop A' }, payments: [], returns: [] },
    ];
    const events = byKind(buildEvents(win, emptyExtra()), 'SALE_CONFIRMED');
    expect(events.find((e) => e.id === 'SALE_CONFIRMED:7')).toMatchObject({
      time: at(12).toISOString(), user: admin, title: '#7', subtitle: 'Vali', cash: '+1000.00', card: '+300.00', refType: 'SALE', refId: 7,
    });
    expect(events.find((e) => e.id === 'SALE_CONFIRMED:8')).toMatchObject({ subtitle: 'Shop A', cash: null, card: null });
  });
});
