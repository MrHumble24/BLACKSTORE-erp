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

## After each finished feature
When one full feature is implemented, run the `code-reviewer` agent and the `security-reviewer` agent (in parallel), then report both results to the user before starting the next feature. Fix CRITICAL and HIGH security findings before calling the feature done.
