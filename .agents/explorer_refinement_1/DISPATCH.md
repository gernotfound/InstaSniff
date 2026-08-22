## 2026-08-22T07:42:26Z
You are Explorer 4: Parser Refinement Explorer for InstaSniff.
Your working directory is: c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_refinement_1\
You MUST read c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\ORIGINAL_REQUEST.md first.
Also read:
- c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\challenger_1\handoff.md
- c:\Users\gerar\Documents\GitHub\InstaSniff\src\utils.ts

Mission:
Investigate the 3 parser edge cases identified by Challenger 1:
1. `sanitizeUsername` order of operations rejecting handles wrapped in quotes or brackets (e.g., `"@user"`, `(@user)`).
2. HTML export `hrefRegex` failing on Instagram URLs with query parameters (`?hl=it`, `?utm_source`) and causing display names to leak as phantom usernames.
3. Stopword leakage for Italian/English UI prepositions and footer/time tokens (`fa`, `alle`, `per`, `te`, `gia`, `tutti`, `tutte`, `tutto`, `mostra`, `nascondi`, `carica`, `at`, `of`, `and`, `the`, `to`, `by`, `for`, `with`, `from`, `list`, `lists`, `platforms`, `copyright`, `rights`, `reserved`, `privacy`, `terms`).

Formulate the exact fix strategy for `src/utils.ts` and test assertions to verify the fix.
Deliver your report to `c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_refinement_1\handoff.md` and report back when finished.
