# DISPATCH — Worker Remediation 2

## 2026-08-22T07:44:28Z

Task Assignment:
1. Apply the 3 parser refinements to `src/utils.ts`:
   - Refactor `sanitizeUsername` to iteratively clean surrounding quotes/brackets and leading `@` prefixes in a loop.
   - Refactor HTML parsing in `parseInstagramText` to match full href attributes `href=["']([^"']+)["']` (including URLs with query parameters like `?hl=it`) and strip entire `<a ...>...</a>` tags before body tokenization to prevent display names from leaking as phantom accounts.
   - Expand `INSTAGRAM_STOPWORDS` with all missing Italian/English UI prepositions, date tokens, footer keywords, and route segments (`fa`, `alle`, `per`, `te`, `gia`, `tutti`, `tutto`, `mostra`, `nascondi`, `carica`, `at`, `of`, `and`, `the`, `to`, `by`, `for`, `with`, `from`, `list`, `platforms`, `copyright`, `rights`, `reserved`, `privacy`, `terms`, `p`, `tv`, etc.).
2. Update unit tests in `src/utils.test.ts` and stress tests in `src/challenger_stress.test.ts` to assert and verify all 3 edge cases pass with 100% positive assertions.
3. Run `npm test`, `npm run lint`, and `npm run build`. Confirm that all tests pass, and lint/build exit with code 0.
4. Update `c:\Users\gerar\Documents\GitHub\InstaSniff\audit_report.md` if needed with notes on these edge-case remediations.
5. Document your changes in `c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\worker_remediation_2\handoff.md` and report back when finished.
