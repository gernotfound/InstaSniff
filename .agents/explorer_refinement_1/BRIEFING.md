# BRIEFING — 2026-08-22T07:44:00Z

## Mission
Investigate 3 parser edge cases from Challenger 1 (sanitizeUsername wrapping, hrefRegex with query params, UI/footer stopword leakage) and formulate exact fix strategy and test assertions for src/utils.ts.

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, parser refinement specialist
- Working directory: c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_refinement_1
- Original parent: 0e83418c-acf3-4d0a-833a-03567274a421
- Milestone: Parser Refinement Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in src/
- Follow 5-component handoff report protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method)
- Communicate via files and send_message

## Current Parent
- Conversation ID: 0e83418c-acf3-4d0a-833a-03567274a421
- Updated: not yet

## Investigation State
- **Explored paths**: `src/utils.ts`, `src/utils.test.ts`, `src/challenger_stress.test.ts`, `src/App.tsx`, `.agents/challenger_1/handoff.md`, `.agents/ORIGINAL_REQUEST.md`
- **Key findings**:
  1. `sanitizeUsername` (`src/utils.ts:331-361`): Stripping `@` before quotes/brackets fails on `'"@cristiano"'` because `startsWith('@')` is false. Punctuation is stripped next, leaving `@cristiano` which is rejected by `isValidInstagramUsername`. Fix: iterative while loop stripping quotes/brackets/parentheses and leading `@`.
  2. `parseInstagramText` HTML regex & display name leakage (`src/utils.ts:448-487`): `hrefRegex` has strict `["']` right after path, failing on query parameters like `?hl=it`. Furthermore, stripping only `<tag>` retains inner anchor text (e.g., `Leo Messi`), creating phantom usernames `leo` and `messi`. Fix: extract full href via `href=["']([^"']+)["']`, pass through `sanitizeUsername`, and strip `<a\b[^>]*>[\s\S]*?<\/a>` blocks from text processing.
  3. Stopword leakage (`src/utils.ts:5-294`): Missing 28+ Italian/English UI prepositions, date particles, footer tokens, and URL path routes (`fa`, `alle`, `per`, `te`, `gia`, `tutti`, `tutte`, `tutto`, `mostra`, `nascondi`, `carica`, `at`, `of`, `and`, `the`, `to`, `by`, `for`, `with`, `from`, `list`, `lists`, `platforms`, `copyright`, `rights`, `reserved`, `privacy`, `terms`, `p`, `tv`). Fix: expand `INSTAGRAM_STOPWORDS` set.
- **Unexplored areas**: None (all 3 edge cases fully analyzed with code-level remedies and test suites).

## Key Decisions Made
- Formulated complete, drop-in replacement strategies for `src/utils.ts` and test assertions for `src/utils.test.ts` and `src/challenger_stress.test.ts`.

## Artifact Index
- c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_refinement_1\handoff.md — Final investigation handoff report
