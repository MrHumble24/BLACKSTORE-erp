# F34-BE-01b: Review fixes for watches and matches core

Feature F34. Agent: `backend-developer`. Work in `server/` only (a frontend agent edits `client/` concurrently). Follow CLAUDE.md and `docs/rules/backend.md`. Minimal diffs.

1. **Empty note request must not wipe the note.** `src/watches/dto/update-match.dto.ts`: `note` becomes required-but-nullable using the pattern in `src/consignments/dto/update-consignment.dto.ts` (`@ValidateIf((_, v) => v !== null)` + `@IsDefined()`), typed `note!: string | null`. `MatchesService.updateNote` takes `string | null`; blank string still saves `null`. A body `{}` → 400. Unit test + e2e case.
2. **Empty watch PATCH is a no-op.** `WatchesService.update`: if the DTO has no keys, return the current watch without writing or auditing (keeps `updatedAt` stable for the sync cron).
3. **E2E coverage.** `test/watches.e2e-spec.ts`: Staff gets 403 on `POST /watches`, `PATCH /watches/:id`, `PATCH /matches/:id/status`, `PATCH /matches/:id`; 404 on `PATCH /watches/999999` and `PATCH /matches/999999`.

Done = `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass in `server/`; then `graphify update .` from the repo root. Report commands, outputs, changed files.
