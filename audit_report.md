# InstaSniff Comprehensive Audit & Remediation Report

**Project:** InstaSniff (Instagram Non-Reciprocal Follower Analyzer)  
**Repository:** `gernotfound/InstaSniff`  
**Date:** 2026-08-22  
**Auditors & Engineers:** Teamwork Audit & Remediation Suite (Code Quality, Functional Logic, UI/UX Specialists & Lead Remediation Engineer)  
**Target Environment:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4

---

## Executive Summary

InstaSniff is a client-side Single Page Application (SPA) built to analyze Instagram followers and following lists, identifying accounts that do not follow the user back. The application was audited across three core engineering pillars:

1. **React / TypeScript Code Quality & Tooling**: Static typing rigor, dependency tree hygiene, component lifecycle patterns, error boundaries, and static analysis tooling (ESLint / TypeScript strictness).
2. **Functional Bugs & Business Logic**: Core parsing robustness across real-world Instagram export formats (Meta JSON exports, HTML files, CSV/TSV spreadsheets, `@username` handles, and profile URLs), set comparison algorithms, false-positive state handling, export capabilities, and state synchronization.
3. **UI/UX & Accessibility Inconsistencies**: WCAG 2.1 AA/AAA color contrast, responsive layout behaviors (notably CSS Grid flex-scroll constraints), interactive state feedback, keyboard navigation focus rings, screen reader accessibility (`aria` attributes, form labels, `aria-live`), and language consistency.

The audit revealed **critical vulnerabilities** across all three domains:
- **Zero JSON / CSV / @handle support**: The original parser failed completely on official Meta JSON exports (`followers_1.json`, `following.json`), `@` prefixed handles, and CSV files, silently returning 0 parsed accounts.
- **Celebratory False-Positive State**: Any failed parse or empty input produced an immediate congratulatory banner (*"Grande! Tutti quelli che segui ti seguono a loro volta. 🎉"*), misleading users into believing 100% follow-back reciprocity.
- **Unbounded CSS Grid Expansion**: The results section lacked height bounding and `min-h-0` constraints in CSS Grid, causing multi-thousand-pixel page blowouts instead of internal container scrolling.
- **Tooling & Type Safety Deficits**: Missing `@types/react` and `@types/react-dom`, lack of `strict` mode in `tsconfig.json`, total absence of ESLint, and 6+ dead dependencies (`@google/genai`, `express`, `dotenv`, etc.).

This report outlines the full findings and details the comprehensive remediation implemented to bring InstaSniff to production-grade quality.

---

## Section 1: React & TypeScript Code Quality

### 1.1 Missing React Type Declarations & Non-Strict TypeScript Configuration
- **Severity**: High
- **Files Affected**: `package.json`, `tsconfig.json`, `src/main.tsx`
- **Audit Findings**:
  - `@types/react` and `@types/react-dom` were absent from `devDependencies`.
  - `tsconfig.json` had `"strict": false` (disabled by default) and omitted `"noUnusedLocals"`, `"noUnusedParameters"`, and `"noFallthroughCasesInSwitch"`.
  - Under strict TypeScript compilation, over 50 type errors surfaced due to untyped JSX elements and implicit `any` parameters.
  - Path alias `@/*` in `tsconfig.json` was mapped to `"./*"` while `vite.config.ts` mapped to `.` causing divergence from standard `./src/*` conventions.
- **Remediation**:
  - Installed `@types/react: ^19.0.10` and `@types/react-dom: ^19.0.4` in `devDependencies`.
  - Configured `tsconfig.json` with `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`, `"include": ["src"]`, and `"paths": { "@/*": ["./src/*"] }`.
  - Aligned Vite alias to resolve `@` to `path.resolve(__dirname, './src')`.

### 1.2 ESLint Infrastructure & Static Analysis Absence
- **Severity**: High
- **Files Affected**: `package.json`, root directory
- **Audit Findings**:
  - The repository contained no ESLint configuration (`eslint.config.js` or `.eslintrc.*`).
  - `npm run lint` was merely mapped to `tsc --noEmit`, completely missing React Hook rule validation (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`).
- **Remediation**:
  - Configured ESLint with `@eslint/js`, `typescript-eslint`, and `eslint-plugin-react-hooks`.
  - Created modern flat config `eslint.config.js` targeting `src/**/*.{ts,tsx}`.
  - Updated `npm run lint` to execute `eslint . && tsc --noEmit`.

### 1.3 Missing React Error Boundary
- **Severity**: High
- **Files Affected**: `src/main.tsx`
- **Audit Findings**:
  - The root `<App />` component was mounted directly into `createRoot()` without an `ErrorBoundary`.
  - Any runtime exception during file parsing, clipboard access, or rendering resulted in a blank white screen crash.
- **Remediation**:
  - Created `src/components/ErrorBoundary.tsx` featuring a styled fallback UI with error details and a reload/reset trigger.
  - Wrapped `<App />` inside `<ErrorBoundary>` in `src/main.tsx`.

### 1.4 Unmemoized Expensive Calculations & Main Thread Jitter
- **Severity**: Medium
- **Files Affected**: `src/components/InputCard.tsx`
- **Audit Findings**:
  - Text splitting and filtering (`value.split('\n').filter(l => l.trim()).length`) was performed synchronously on every render and keystroke.
  - For large pasted inputs (10,000+ lines), this caused perceptible input lag and dropped frames.
- **Remediation**:
  - Wrapped line counting and live username parsing in `useMemo` hooks with `[value]` dependency.

### 1.5 Unhandled FileReader Errors & Unbounded File Size Ingestion
- **Severity**: Medium
- **Files Affected**: `src/components/InputCard.tsx`
- **Audit Findings**:
  - `handleFileUpload` did not attach a `reader.onerror` handler, failing silently on unreadable or restricted files.
  - Lacked file size safeguards, allowing multi-hundred-megabyte files to lock the browser tab.
- **Remediation**:
  - Added a 15 MB file size limit with user-facing warning banners.
  - Added `reader.onerror` handling and reset file input references safely.

### 1.6 Dead Dependencies & Configuration Drift
- **Severity**: Low
- **Files Affected**: `package.json`, `metadata.json`, `README.md`
- **Audit Findings**:
  - Unused production packages: `@google/genai`, `express`, `@types/express`, `dotenv`, `motion`, `tsx`, `esbuild`, `autoprefixer`.
  - `metadata.json` contained legacy references to `"MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"`.
- **Remediation**:
  - Purged all unused dependencies from `package.json`.
  - Relocated dev-only plugins (`@vitejs/plugin-react`, `@tailwindcss/vite`) to `devDependencies`.

---

## Section 2: Functional Bugs & Logic Flaws

### 2.1 Complete Parsing Failure on Meta Instagram JSON Exports (BUG-01)
- **Severity**: Critical
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - Official Instagram data exports (`followers_1.json`, `following.json`) contain structured JSON such as:
    ```json
    [
      {
        "title": "",
        "string_list_data": [
          { "href": "https://www.instagram.com/user_name", "value": "user_name", "timestamp": 1700000000 }
        ]
      }
    ]
    ```
  - The previous parser only performed line-by-line regex checks on raw JSON strings, extracting 0 usernames from valid official exports.
- **Remediation**:
  - Implemented automatic JSON detection and recursive AST traversal in `parseInstagramText()`.
  - Traverses nested objects and arrays, targeting `string_list_data[].value`, `relationships_following[].title`, `title`, and profile URLs within `href` properties.

### 2.2 False-Positive "All Follow Back" Success State (BUG-02 / UI-UX-01)
- **Severity**: Critical
- **Files Affected**: `src/App.tsx`
- **Audit Findings**:
  - When either followers or following text failed to parse (or was empty), `followingSet \ followersSet` evaluated to `[]`.
  - The UI immediately rendered: *"Grande! Tutti quelli che segui ti seguono a loro volta. 🎉"*.
- **Remediation**:
  - Conditioned celebratory state strictly on `followingSet.size > 0 && followersSet.size > 0 && unfollowers.length === 0`.
  - Added clear, informative warning banners when either list yields 0 valid usernames after parsing.

### 2.3 Silent Rejection of Handles with `@` Prefix & Instagram URLs (BUG-03, BUG-04)
- **Severity**: High
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - Pasting `@username` or `https://instagram.com/username` failed `/^[a-zA-Z0-9._]{1,30}$/` because `@`, `/`, `:`, and `?` were not permitted characters.
- **Remediation**:
  - Added URL normalization (extracting pathname handles from `instagram.com/<user>`) and automatic stripping of leading `@` characters.

### 2.4 CSV / Delimited File Rejection (BUG-05)
- **Severity**: High
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - CSV files containing `username,timestamp` or semicolon/tab-separated values failed line-based regex matching.
- **Remediation**:
  - Added support for comma, semicolon, tab, and whitespace token delimiters across raw text lines.

### 2.5 Stopword Pollution & UI Action Ingestion (BUG-06, BUG-07)
- **Severity**: High
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - Copied web text and HTML exports injected UI action words (`Segui`, `Messaggio`, `Rimuovi`, `Follow`, `Message`, `Remove`, `Followers`, `Following`) and date tokens (`gennaio`, `maggio`, `jan`, `ago`, `2026`, `18`, `pm`) as phantom usernames.
- **Remediation**:
  - Implemented an extensive bilingual (Italian/English) stopword dictionary covering UI labels, actions, month names, day names, relative times, and timestamps.
  - Added strict validation preventing pure numeric strings from being recognized as usernames.

### 2.6 Username Specification Non-Compliance (BUG-15)
- **Severity**: Medium
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - Allowed handles starting/ending with dots or containing consecutive dots (`..`), violating Instagram handle rules.
- **Remediation**:
  - Enforced strict regex: `^(?![.])(?!.*[.]{2})[a-zA-Z0-9._]{1,30}(?<![.])$` plus non-numeric guard.

### 2.7 Missing Multi-Dimensional Analysis (Fans, Mutuals, Statistics) (BUG-12)
- **Severity**: Medium
- **Files Affected**: `src/App.tsx`
- **Audit Findings**:
  - The app only computed unidirectional non-reciprocal following (`Following \ Followers`). Users could not see "Fans" (`Followers \ Following`), "Mutuals" (`Followers ∩ Following`), or follow-back percentages.
- **Remediation**:
  - Implemented 3 dedicated analysis tabs:
    1. **Non ti seguono** (Unfollowers: `Following \ Followers`)
    2. **Non ricambi / Fan** (Fans: `Followers \ Following`)
    3. **Amici reciproci** (Mutuals: `Followers ∩ Following`)
  - Added a comprehensive statistics card displaying Total Following, Total Followers, Unfollowers Count, Fan Count, Mutuals Count, and Follow-back Ratio (%).

### 2.8 Missing Export & Clipboard Workflows (BUG-09)
- **Severity**: High
- **Files Affected**: `src/App.tsx`
- **Audit Findings**:
  - Zero capabilities to copy or export results to file.
- **Remediation**:
  - Added **"Copia Lista"** with animated feedback toast.
  - Added multi-format file export: **"Esporta TXT"**, **"Esporta CSV"**, and **"Esporta JSON"**.

### 2.9 Search, Filter & Alphabetical Sorting (BUG-13)
- **Severity**: Medium
- **Files Affected**: `src/App.tsx`
- **Audit Findings**:
  - No search bar or sorting options for long lists.
- **Remediation**:
  - Added live search/filter input.
  - Added sort toggles: A–Z, Z–A, and Default order.

### 2.10 Blocking Native `alert()` Usage & Stale State (BUG-10, BUG-17)
- **Severity**: Medium
- **Files Affected**: `src/App.tsx`
- **Audit Findings**:
  - Native `window.alert()` froze execution.
  - Modifying textareas after analysis left stale results visible without warning.
- **Remediation**:
  - Replaced `alert()` with styled inline dismissible alert banners.
  - Invalidate results and prompt re-analysis when inputs are mutated.

### 2.11 Quoted & Bracketed `@` Handle Order of Operations (BUG-CHALLENGE-01)
- **Severity**: High
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - `sanitizeUsername` evaluated `cleaned.startsWith('@')` prior to stripping punctuation delimiters.
  - Handles wrapped in quotes or brackets (e.g., `"@cristiano"`, `(@cristiano)`, `[@cristiano]`, `<<<@art_gallery_official>>>`) had outer punctuation stripped to `@cristiano` without a subsequent `@` removal step, causing syntax validation failure and handle loss.
- **Remediation**:
  - Refactored `sanitizeUsername` to use an iterative while loop that stabilizes delimiter and leading `@` removal across arbitrarily nested quotes, brackets, angle brackets, and parentheses.

### 2.12 HTML `href` Query Parameter Truncation & Display Name Leaks (BUG-CHALLENGE-02)
- **Severity**: High
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - `hrefRegex` expected an immediate closing quote without accommodating URL query parameters (`?hl=it`, `?igsh=...`), failing to extract real handles from valid anchor links.
  - Fallback tag stripping left display names (e.g., `"Leo Messi"`) that were subsequently tokenized into phantom accounts (`leo`, `messi`).
- **Remediation**:
  - Updated `hrefRegex` to extract full href attribute strings (`href=["']([^"']+)["']`), resolving usernames via `sanitizeUsername`.
  - Replaced all `<a ...>...</a>` blocks with newlines prior to inner body tokenization, preventing display name leakage.

### 2.13 Italian / English UI Preposition & Footer Stopword Ingestion (BUG-CHALLENGE-03)
- **Severity**: Medium
- **Files Affected**: `src/utils.ts`
- **Audit Findings**:
  - Common Italian and English UI words, prepositions, date tokens, and footer keywords (`fa`, `alle`, `per`, `te`, `gia`, `tutti`, `mostra`, `nascondi`, `carica`, `at`, `of`, `and`, `the`, `to`, `by`, `list`, `platforms`, `copyright`, `rights`, `reserved`, `privacy`, `terms`, `p`, `tv`) passed username syntax checks and polluted follower lists as phantom accounts.
- **Remediation**:
  - Expanded `INSTAGRAM_STOPWORDS` with over 45 missing Italian/English UI words, prepositions, footer tokens, and route prefixes.

---

## Section 3: UI/UX & Accessibility Inconsistencies

### 3.1 CSS Grid Unbounded Expansion Bug (UI-RESP-01)
- **Severity**: Critical
- **Files Affected**: `src/App.tsx`
- **Audit Findings**:
  - CSS Grid child tracks default to `min-height: auto`. Without `min-h-0` and bounded `max-height`, rendering large result sets pushed the container height to thousands of pixels, disabling internal scrollbar behavior.
- **Remediation**:
  - Added `min-h-0` and `lg:max-h-[calc(100vh-14rem)]` (or `max-h-[640px]`) to results container, ensuring smooth internal `.custom-scrollbar` scrolling on desktop while remaining fluid on mobile.

### 3.2 WCAG 2.1 Color Contrast Failures (UI-VIS-01)
- **Severity**: High
- **Files Affected**: `src/App.tsx`, `src/components/InputCard.tsx`
- **Audit Findings**:
  - Text tokens using `text-slate-600` (2.43:1) and `text-slate-500` (3.68:1) against `bg-slate-950` / `bg-slate-900` failed WCAG AA minimums (4.5:1).
- **Remediation**:
  - Elevated secondary text to `text-slate-400` (6.32:1) and headers/labels to `text-slate-300` (9.87:1) / `text-white` (17.5:1), achieving full WCAG 2.1 AA/AAA compliance.

### 3.3 Missing Keyboard Focus Rings (UI-INT-02)
- **Severity**: High
- **Files Affected**: `src/App.tsx`, `src/components/InputCard.tsx`
- **Audit Findings**:
  - Interactive elements and textareas suppressed outline styles without providing visible focus indicators.
- **Remediation**:
  - Applied `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none` across all buttons, tabs, inputs, and links.

### 3.4 Accessibility (a11y) & Semantic Structure (UI-A11Y-01 to 05)
- **Severity**: High
- **Files Affected**: `index.html`, `src/components/InputCard.tsx`, `src/App.tsx`
- **Audit Findings**:
  - Textareas lacked `<label>` / `id` associations.
  - Icon buttons lacked accessible names.
  - Results container lacked `role="region"` and `aria-live="polite"`.
  - `index.html` was set to `lang="en"` despite Italian UI content.
- **Remediation**:
  - Added explicit `<label>` elements with `htmlFor` and unique IDs.
  - Added `aria-label` to all icon buttons and external profile links (`aria-label="Apri profilo di @username su Instagram (nuova scheda)"`).
  - Added `role="region"` and `aria-live="polite"` on results.
  - Updated `index.html` to `lang="it"` and added descriptive metadata & SVG favicon.

### 3.5 Mobile Experience & Auto-Scroll (UI-RESP-02)
- **Severity**: High
- **Files Affected**: `src/App.tsx`
- **Audit Findings**:
  - On mobile, results rendered far below the fold, giving no feedback upon clicking the scan button.
- **Remediation**:
  - Added automatic smooth scrolling to the results section upon scan execution on mobile viewports.

---

## Remediation Summary Table

| Category | Finding ID | Severity | Status | Remediation Details |
|---|---|---|---|---|
| **Code Quality** | TS-01 | High | **Resolved** | Installed `@types/react` & `@types/react-dom`, configured strict `tsconfig.json`. |
| **Code Quality** | TS-02 | High | **Resolved** | Configured ESLint with React Hooks & TypeScript rules; `npm run lint` passing. |
| **Code Quality** | ARCH-01 | High | **Resolved** | Implemented `ErrorBoundary.tsx` wrapping root `<App />`. |
| **Code Quality** | PERF-01 | Medium | **Resolved** | Memoized line counts & username extraction in `InputCard.tsx`. |
| **Code Quality** | DEPS-01 | Low | **Resolved** | Purged 8 unused packages (`@google/genai`, `express`, `dotenv`, etc.). |
| **Functional** | BUG-01 | Critical | **Resolved** | Added recursive JSON AST parser for official Meta `followers_1.json`/`following.json`. |
| **Functional** | BUG-02 | Critical | **Resolved** | Fixed false celebration: requires valid non-empty sets before congratulations. |
| **Functional** | BUG-03/04 | High | **Resolved** | Normalized `@username` handles and `instagram.com` URLs automatically. |
| **Functional** | BUG-05 | High | **Resolved** | Implemented multi-delimiter parsing (CSV, TSV, comma, semicolon, whitespace). |
| **Functional** | BUG-06/07 | High | **Resolved** | Built comprehensive Italian/English stopword & date filter. |
| **Functional** | BUG-09 | High | **Resolved** | Added "Copia Lista" and "Esporta TXT / CSV / JSON" workflows. |
| **Functional** | BUG-12 | Medium | **Resolved** | Added 3 analysis tabs (Unfollowers, Fans, Mutuals) and statistics dashboard. |
| **Functional** | BUG-13 | Medium | **Resolved** | Added real-time search filter and A-Z / Z-A sorting. |
| **Functional** | BUG-14 | Medium | **Resolved** | Handled `FileReader.onerror` and added 15MB file size limit guard. |
| **Functional** | BUG-17 | Low | **Resolved** | Replaced blocking `window.alert()` with non-blocking dismissible alert banners. |
| **Functional** | BUG-CHALLENGE-01 | High | **Resolved** | Iteratively strip surrounding quotes/brackets and `@` prefixes in a while loop. |
| **Functional** | BUG-CHALLENGE-02 | High | **Resolved** | Capture full `href` attributes (supporting `?hl=it`) and strip `<a>...</a>` tags before body tokenization. |
| **Functional** | BUG-CHALLENGE-03 | Medium | **Resolved** | Expanded `INSTAGRAM_STOPWORDS` with Italian/English UI prepositions, date words, footer terms, and route prefixes. |
| **UI / UX** | UI-RESP-01 | Critical | **Resolved** | Fixed CSS Grid scroll bug with `min-h-0` and bounded max-height container. |
| **UI / UX** | UI-VIS-01 | High | **Resolved** | Elevated text tokens to meet WCAG 2.1 AA/AAA contrast ratios. |
| **UI / UX** | UI-INT-02 | High | **Resolved** | Added standard `:focus-visible` keyboard focus rings on all interactive elements. |
| **UI / UX** | UI-RESP-02 | High | **Resolved** | Implemented mobile smooth auto-scroll to results upon analysis. |
| **UI / UX** | UI-A11Y-01 | High | **Resolved** | Added `<label>`, `id`, `aria-label`, `aria-live`, and `lang="it"` in `index.html`. |

---

## Verification & Health Assessment

- **TypeScript Strict Compilation**: `tsc --noEmit` exits with code `0` (zero errors).
- **ESLint Linting**: `eslint .` exits with code `0` (zero warnings/errors).
- **Vite Production Build**: `npm run build` exits with code `0` (clean production bundle generated).
- **Parser Test Suite**: 44 tests passing (100% pass rate across `src/utils.test.ts` and `src/challenger_stress.test.ts`), verifying Meta JSON exports, raw HTML text, query-parameterized hrefs, CSV rows, bracketed/quoted `@` handles, profile URLs, and stopword-heavy inputs.
