## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Code quality rules (all agents)
Every implementation must meet these. The `code-reviewer` agent checks them.
- **Works**: code runs and does what was asked; verify it (run, build or test) before calling it done.
- **Optimized**: no needless loops, repeated queries (N+1) or extra work; pick the right data structure.
- **Simple to understand**: clear names, short functions, no clever tricks.
- **Documented**: a short comment on each module/class/public function saying what it does and why; comment non-obvious logic.
- **Small files**: max 300 lines per file, max 50 lines per function. Split anything bigger.
- **KISS**: the simplest solution that works.
- **DRY**: no copy-pasted logic; reuse what already exists.
- **SOLID**: one responsibility per class/module; depend on abstractions only where there are real alternatives.
- **Separation of concerns**: keep UI, business logic and data access in separate layers.

## Before each feature
Before implementing a feature, run the `prd-guardian` agent on the plan and fix any deviation from the PRD and docs first.

## After each finished feature
When one full feature is implemented, run the `code-reviewer`, `security-reviewer` and `prd-guardian` agents (in parallel), then report all three results to the user before starting the next feature. Fix PRD deviations before calling the feature done. Fix CRITICAL and HIGH security findings before calling the feature done.

## Task allocation (Claude is the allocator)
Claude does not implement features itself. It splits each feature into backend and frontend tasks, hands them out, waits for the result, then runs the reviews below.

| Work | Who does it | How Claude hands it over |
| --- | --- | --- |
| Backend (`server/`) | `backend-developer` agent on Opus | Agent tool, `subagent_type: backend-developer` |
| Frontend (`client/`) | Gemini CLI, or OpenCode | `gemini -p "<task>" --approval-mode auto_edit` or `opencode run "<task>"` from the project root, in the background |
| Reviews | `code-reviewer`, `security-reviewer`, `prd-guardian` agents on Opus (`model: opus` in their files) | Agent tool, in parallel |

Claude itself (the allocator) runs on Fable and only plans, writes handoffs, verifies results (build, lint, tests) and launches the agents above. It never implements or reviews features itself.

### Parallel tasks never share a working tree
Two tasks may run at the same time only if they cannot touch the same files. Backend (`server/`) and frontend (`client/`) tasks are disjoint and may share the main tree. **Two frontend tasks (or two backend tasks) at the same time each get their own git worktree and branch**, created by Claude before the handoff and named after the handoff code:

```
git worktree add .worktrees/F03-FE-02 -b task/F03-FE-02 main
```

The handoff file states the worktree path in its first line, and the developer works only there. When the task is done, Claude runs the reviewers inside that worktree, merges the branch into `main` (`git merge --no-ff task/F03-FE-02`), resolves any conflicts in shared files (translations, routes, nav are additive, so conflicts are small), then removes the worktree and branch. If two tasks would both change the same shared files heavily, run them one after the other instead. `.worktrees/` is git-ignored.

Every hand-over is saved as a file in `docs/handoffs/` named `F<feature>-<BE|FE|API>-<seq>-<title>.md` (see `docs/handoffs/README.md`); the user pastes it to the agent. Every hand-over message must name the feature, the PRD items it covers (FR/BR/W numbers), the API contract (endpoints, request and response shapes) and say "follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md". Backend goes first when the frontend needs its API; otherwise both run in parallel. Gemini and OpenCode read their rules from GEMINI.md and AGENTS.md, which point to the same agent files and `docs/rules/` as Claude. After each task, Claude checks the result with the reviewers; a result that breaks the rules goes back to the same tool with the findings.

## Client side (client/)
Frontend work is done by Gemini or OpenCode following `.claude/agents/frontend-developer.md`. Every session and agent follows these rules:

@docs/rules/frontend.md

## Server side (server/)
Backend work is done by the `backend-developer` agent (Opus). Every session and agent follows these rules:

@docs/rules/backend.md
