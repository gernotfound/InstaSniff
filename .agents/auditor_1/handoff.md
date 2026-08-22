# Forensic Integrity Audit & Handoff Report

**Project:** InstaSniff (Instagram Non-Reciprocal Follower Analyzer)  
**Auditor:** Forensic Integrity Auditor (`auditor_1`)  
**Target Repository:** `gernotfound/InstaSniff`  
**Date:** 2026-08-22  
**Active Profile:** General Project  
**Integrity Mode:** Development Mode (as determined directly from `ORIGINAL_REQUEST.md`)  
**Verdict:** **CLEAN** (Zero integrity violations detected)

---

## Forensic Audit Report

**Work Product**: InstaSniff Codebase & Remediation Suite  
**Profile**: General Project  
**Verdict**: **CLEAN**

### Phase 1: Source Code & Integrity Analysis
- **Hardcoded test results detection**: **PASS** — Comprehensive code search across `src/utils.ts`, `src/App.tsx`, and `src/components/*.tsx` confirmed zero hardcoded strings, fixed return values, or pre-computed lookup tables targeting specific test cases.
- **Facade / Dummy implementation detection**: **PASS** — No dummy stubs, `return <constant>`, or `NotImplementedError` placeholders found. All parser, state, and UI components are genuinely implemented with full logic.
- **Pre-populated artifact detection**: **PASS** — Zero pre-populated `.log` files, fake test dumps, or artificial verification files found in the repository.
- **Self-certifying / Tautological test detection**: **PASS** — Inspected `src/utils.test.ts` (18 unit tests) and `src/challenger_stress.test.ts` (23 unit & stress tests). Tests validate against independently generated synthetic fixtures (Meta JSON AST, dirty HTML strings, CSVs, `@` handles, edge-case usernames) and assert authentic outputs.
- **Dependency & delegation audit**: **PASS** — No third-party scraping services, external APIs, or black-box parsing libraries. The app runs 100% client-side with native TypeScript, React 19, and Tailwind CSS.

### Phase 2: Behavioral Verification
- **ESLint & TypeScript Static Analysis (`npm run lint`)**: **PASS** — `eslint . && tsc --noEmit` executed cleanly with exit code `0` (0 errors, 0 warnings).
- **Automated Test Suite Execution (`npm run test`)**: **PASS** — `vitest run` executed 2 test files, 41 tests total, all passing with exit code `0`.
- **Production Build Execution (`npm run build`)**: **PASS** — `tsc --noEmit && vite build` bundled the application cleanly into `dist/` with exit code `0`.
- **Audit Documentation Accuracy**: **PASS** — `audit_report.md` in the repository root accurately reflects the real state of findings and remediation across Code Quality, Functional Bugs, and UI/UX pillars.

---

## 1. Observation

Direct observations from independent tool execution and source code inspection:

### 1.1 Command Executions & Exit Codes
1. **ESLint & Strict TypeScript (`npm run lint`)**:
   - Command: `npm.cmd run lint`
   - Exit code: `0`
   - Output:
     ```
     > instasniff@1.0.0 lint
     > eslint . && tsc --noEmit
     ```
2. **Automated Unit & Stress Tests (`npm run test`)**:
   - Command: `npm.cmd run test`
   - Exit code: `0`
   - Output:
     ```
     RUN  v4.1.11 C:/Users/gerar/Documents/GitHub/InstaSniff

     ✓ src/utils.test.ts (18 tests) 14ms
     ✓ src/challenger_stress.test.ts (23 tests) 71ms

     Test Files  2 passed (2)
          Tests  41 passed (41)
       Duration  406ms
     ```
3. **Vite Production Bundle (`npm run build`)**:
   - Command: `npm.cmd run build`
   - Exit code: `0`
   - Output:
     ```
     > instasniff@1.0.0 build
     > tsc --noEmit && vite build

     vite v6.4.3 building for production...
     transforming...
     ✓ 1681 modules transformed.
     rendering chunks...
     computing gzip size...
     dist/index.html                   1.49 kB │ gzip:  0.77 kB
     dist/assets/index-Cw4_x2zl.css   31.08 kB │ gzip:  6.47 kB
     dist/assets/index-D3ndIOoP.js   239.44 kB │ gzip: 72.48 kB
     ✓ built in 3.35s
     ```

### 1.2 Core Parser Architecture (`src/utils.ts`)
- **JSON AST Recursion (`traverseJsonForUsernames`)**: Recursively navigates arbitrary JSON AST structures, extracting usernames from `string_list_data[].value`, `href`, `title`, and generic fields (`username`, `user`, `handle`, `name`).
- **Username Sanitization (`sanitizeUsername`)**: Automatically normalizes URLs (`instagram.com/user`), strips `@` prefixes, removes query parameters and trailing slashes, and enforces Instagram username rules via `isValidInstagramUsername`.
- **Delimited & HTML Tokenization (`parseInstagramText`)**: Extracts links from HTML tags via regex, tokenizes CSV/TSV data on commas, semicolons, tabs, and pipes, and breaks whitespace tokens.
- **Stopword & Noise Filtering (`INSTAGRAM_STOPWORDS`)**: Contains a comprehensive bilingual dictionary of 180+ UI action words (`segui`, `messaggio`, `follow`, `message`), month names (`gennaio`, `january`, etc.), weekday names, date tokens, and table headers.

### 1.3 Business Logic & State Computation (`src/utils.ts` & `src/App.tsx`)
- **Set Mathematics (`computeAnalysis`)**:
  - Unfollowers: `followingList.filter((user) => !followersSet.has(user))` ($Following \setminus Followers$)
  - Fans: `followersList.filter((user) => !followingSet.has(user))` ($Followers \setminus Following$)
  - Mutuals: `followingList.filter((user) => followersSet.has(user))` ($Followers \cap Following$)
  - Follow-Back Ratio: `Math.round((mutuals.length / followingList.length) * 100)`
- **False-Positive Prevention**: In `src/App.tsx`, celebratory states are strictly conditioned on non-empty inputs and valid parsed results (`followersList.length > 0 && followingList.length > 0`). Empty or non-matching lists produce explicit error alerts.

### 1.4 Interactive UI/UX & Accessibility Components
- **Error Boundary (`src/components/ErrorBoundary.tsx`)**: Class-based React ErrorBoundary catching runtime exceptions with custom fallback UI and page reload/reset triggers.
- **Results View (`src/components/ResultsView.tsx`)**: 3 tab views (Unfollowers, Fans, Mutuals), live search filter, A-Z / Z-A / default sorting, animated clipboard copy with feedback toast, TXT/CSV/JSON file export downloads, and CSS Grid bounded scrolling (`min-h-0`, `lg:max-h-[640px]`).
- **Input Form (`src/components/InputCard.tsx`)**: Memoized line/account counts, `FileReader.onerror` handling, 15 MB file size limit, clipboard paste, clear button, and accessible `<label>` / `id` bindings.
- **Accessibility & Contrast**: WCAG 2.1 compliant contrast (`text-slate-200`, `text-slate-300`, `text-white`), `:focus-visible` rings on all interactive elements, `aria-label` on icon buttons, and `lang="it"` on `index.html`.

---

## 2. Logic Chain

1. **Integrity Mode Extraction**: `ORIGINAL_REQUEST.md` was read directly. The project mandates a thorough audit and remediation of an existing SPA without third-party server-side delegation. This sets the integrity enforcement baseline to Development Mode, while also fulfilling Demo Mode authenticity standards.
2. **Empirical Verification of No Cheating**:
   - Step 1: Examined `src/utils.ts` and confirmed that username validation, sanitization, JSON AST parsing, and set differences are computed algorithmically from input strings.
   - Step 2: Confirmed that `src/utils.test.ts` and `src/challenger_stress.test.ts` assert actual functional outputs against valid, corrupt, and edge-case inputs.
   - Step 3: Verified that no fake outputs, mocked test passes, or pre-rendered artifacts exist in the repository.
3. **Execution Verification**:
   - `npm.cmd run lint` executed ESLint and TypeScript strict typechecking, resulting in 0 errors and exit code `0`.
   - `npm.cmd run test` executed Vitest, running 41 tests across 2 test suites with 100% pass rate and exit code `0`.
   - `npm.cmd run build` executed Vite production bundling, generating optimized JS/CSS bundles in `dist/` with exit code `0`.
4. **Audit Report Verification**:
   - Cross-referenced all 18 entries in `audit_report.md` with the codebase. All remediations are genuinely implemented in source files.

---

## 3. Caveats

- **No Caveats**: The audit was comprehensive and empirical. All files, tests, scripts, and build artifacts were verified directly in the active workspace.

---

## 4. Conclusion

The InstaSniff repository and its remediation work product have passed all forensic integrity checks.
- Zero hardcoded test shortcuts or facade implementations exist.
- The parser in `src/utils.ts` genuinely processes JSON AST, HTML, CSV/TSV, `@` handles, and URLs.
- The UI components genuinely calculate set differences, statistical metrics, search filters, and file exports.
- `npm run lint`, `npm run build`, and `npm run test` all pass with exit code `0`.
- `audit_report.md` is complete, accurate, and faithful to the codebase state.

**Verdict: CLEAN**

---

## 5. Verification Method

To independently reproduce the forensic verification:

```powershell
# 1. Verify ESLint and strict TypeScript typechecking
npm.cmd run lint

# 2. Verify all automated unit and stress tests
npm.cmd run test

# 3. Verify production build bundling
npm.cmd run build
```

Key inspection targets:
- `src/utils.ts` (lines 5–601: Stopwords, JSON AST recursion, tokenization, set analysis, export utilities)
- `src/utils.test.ts` & `src/challenger_stress.test.ts` (41 unit & stress tests)
- `src/App.tsx` & `src/components/*.tsx` (React SPA architecture, accessibility, state synchronization)
- `audit_report.md` (Project root comprehensive documentation)
