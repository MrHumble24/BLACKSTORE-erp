# F12-BE-03 — Hard delete (full cascade) — backend

Working tree: main repo (`server/` only). Depends on F12-BE-01 (needs `hard_delete` permission +
the SuperAdmin role). Follow `CLAUDE.md` and `docs/rules/backend.md`.

## Feature (owner-approved, destructive, irreversible)

Super admin can **permanently** delete a device (`item`), a product model, or a whole category and
everything under it. The owner explicitly chose **full cascade** including sales, after being warned.
This overrides BR-12 (no hard deletes), so the safety nets below are MANDATORY, not optional.

**Whole-sale rule (prevents cross-customer corruption — prd-guardian deviation 2):** when a deleted
item appears on a sale, delete the **entire** `Sale` and all its lines/payments/returns — never a
single `SaleItem` while the `Sale` survives (that would make another customer's debt, BR-8, wrong).
So the blast radius of a category delete includes every *whole receipt* that contained any item
under it, across all customers.

## Tasks

### 1. New `super-admin` module, guarded hard
Every route: `@Permissions('hard_delete')` **and** an in-handler check that the user's role is
`SuperAdmin` (defense in depth — Admin must never reach these even if mis-permissioned).

### 2. Preview endpoint (no writes)
`POST /super-admin/hard-delete/preview` `{ type: 'item'|'productModel'|'category', id }` →
blast-radius report, computed read-only:
- counts: product models, items, accessory-stock rows, item identifiers;
- the **whole sales** that will be deleted, each with `{ saleId, customerName|walkIn, total, paid,
  itemCount }`, plus totals: sales count, `SalePayment` count + sum, returns count + refund sum;
- distinct **customers** and **investors** collaterally affected (names), so the UI can show WHO.
Reuse one shared "collect targets" function (used by preview and execute) so they can't drift.

### 3. Execute endpoint (destructive)
`POST /super-admin/hard-delete` `{ type, id, password }`:
1. **Re-authenticate**: verify `password` against the caller's `passwordHash` with the existing
   hasher (prd-guardian deviation 5 — the typed confirm on the client is not enough; the server must
   require the password). Wrong password → 401, nothing deleted.
2. **Fresh backup first** (prd-guardian deviation 4): trigger the backups service's manual run and
   capture its reference/id. If the backup fails, **abort** the delete (do not delete without a
   recovery point). 
3. In one `prisma.$transaction`:
   a. Re-run the "collect targets" function **inside** the transaction; if the blast radius grew
      since a just-prior preview snapshot you pass in (or simply recompute), proceed on the fresh
      set — never delete more than what you snapshot in (c).
   b. **Snapshot** every row about to be destroyed into `AuditLog.before` as JSON (full rows, not
      counts — prd-guardian deviation 3), with `action: 'HARD_DELETE'`, the actor, the target
      `{type,id}`, and the backup reference from step 2.
   c. Delete in dependency order (most FKs are `onDelete: Restrict`, so children first):
      returns/return-lines → sale-payments → sale-items → the whole sales → consignment lines →
      transfer items/accessories → batch lines → stock-count lines → accessory stock →
      item identifiers (cascade) → items → (for model/category) product models → category
      attributes → category. Verify against the current schema; delete only what the collect step
      found.
4. Return `{ deleted: <the preview-shaped summary of what was removed> }`.

### 4. What is NOT deleted (confirm, comment why)
- **AuditLog** rows (the snapshot you just wrote must survive).
- **InvestorTransaction** and **LedgerEntry** (investor running totals FR-10 and net profit BR-5 are
  record-sums independent of items; leave them). Past profit reports (FR-11/FR-28) will still shift
  because they re-aggregate the now-fewer sale items — the owner accepted this.
- Customers, investors, suppliers, partners, locations, users (only their transactional rows tied to
  deleted items go).

### 5. Side effects to note (not bugs)
- `ItemIdentifier` is `onDelete: Cascade`; a deleted IMEI frees for reuse, so FR-25's "known IMEI"
  warning won't fire if that device is re-entered. Accepted.

## Acceptance
- Preview returns the full blast radius incl. which customers/investors/whole-sales are hit; makes no
  writes.
- Execute without the correct password → 401, no changes. With it: a backup is taken first (delete
  aborts if the backup fails), then target + all its whole-sales/payments/returns/children are gone,
  an `AuditLog` HARD_DELETE row holds the full before-snapshot + backup ref, and surviving
  customers' balances (BR-8) stay consistent (no half-deleted sales).
- Admin/Staff → 403 on all routes.
- Unit tests: collect-targets for item/model/category (incl. a multi-item shared sale → whole sale in
  the set), the password-reauth failure path, the backup-abort path, and an audit-snapshot assertion.
  Integration test the cascade order on a seeded graph if feasible. Build + lint clean.

## API contract (for F12-FE-01)
- `POST /super-admin/hard-delete/preview {type,id}` → blast-radius report (shape in task 2).
- `POST /super-admin/hard-delete {type,id,password}` → `{ deleted: <summary> }` | 401 bad password.
