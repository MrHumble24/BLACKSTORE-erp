/** Hard-delete (F12 danger zone) types. All money fields are decimal strings. */

/** What kind of catalog object the delete targets. */
export type HardDeleteTargetType = 'item' | 'productModel' | 'category';

/** Body for the read-only preview and the executing delete. */
export interface HardDeletePreviewRequest {
  type: HardDeleteTargetType;
  id: number;
}

/** Execute body: same target plus the caller's own password (server re-authenticates). */
export interface HardDeleteRequest extends HardDeletePreviewRequest {
  password: string;
}

/** Full blast radius of a hard delete, returned bare by preview and wrapped by execute. */
export interface HardDeleteReport {
  counts: { productModels: number; items: number; accessoryStock: number; itemIdentifiers: number };
  salesCount: number;
  salePaymentCount: number;
  salePaymentSum: string;
  returnsCount: number;
  returnRefundSum: string;
  customers: string[];
  investors: string[];
}

/** Execute response is wrapped (preview returns a bare report). */
export interface HardDeleteResult {
  deleted: HardDeleteReport;
}
