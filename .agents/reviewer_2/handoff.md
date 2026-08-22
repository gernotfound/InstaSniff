# Handoff Report: Reviewer 2 (Functional & UI/UX Specialist)

**Task:** Functional & UI/UX Independent Review for InstaSniff  
**Date:** 2026-08-22  
**Working Directory:** `c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\reviewer_2\`  
**Target Repository:** `gernotfound/InstaSniff`  
**Verdict:** **APPROVE**  

---

## 1. Observation

### 1.1 Automated Build, Test, and Lint Tooling Verification
Direct tool execution outputs on Windows PowerShell (`C:\Users\gerar\Documents\GitHub\InstaSniff`):

1. **Unit Test Suite (`npm.cmd test -- --run`)**:
   ```
   RUN  v4.1.11 C:/Users/gerar/Documents/GitHub/InstaSniff

   ✓ src/utils.test.ts (18 tests) 11ms

   Test Files  1 passed (1)
        Tests  18 passed (18)
     Duration  307ms
   ```
   - **Exit code**: `0`

2. **Strict Linter and Typecheck (`npm.cmd run lint` -> `eslint . && tsc --noEmit`)**:
   ```
   > instasniff@1.0.0 lint
   > eslint . && tsc --noEmit
   ```
   - **Exit code**: `0` (Zero ESLint warnings/errors; zero TypeScript strict compilation errors).

3. **Production Vite Build (`npm.cmd run build` -> `tsc --noEmit && vite build`)**:
   ```
   vite v6.4.3 building for production...
   transforming...
   ✓ 1681 modules transformed.
   rendering chunks...
   computing gzip size...
   dist/index.html                   1.49 kB │ gzip:  0.77 kB
   dist/assets/index-Cw4_x2zl.css   31.08 kB │ gzip:  6.47 kB
   dist/assets/index-D3ndIOoP.js   239.44 kB │ gzip: 72.48 kB
   ✓ built in 3.44s
   ```
   - **Exit code**: `0`

---

### 1.2 Inspection of User Workflows & Core Functionality

- **Multi-Format Instagram Parser (`src/utils.ts:367-488`)**:
  - `traverseJsonForUsernames()` handles arbitrary nesting in Meta exports (`followers_1.json`, `following.json`), targeting `string_list_data[].value`, `string_list_data[].href`, `relationships_following[].title`, `title`, and generic user keys.
  - Handles HTML anchor tags, CSV/TSV delimiters (`[\r\n,;\t|]+`), URL paths (`instagram.com/<user>`), and leading `@` characters.
  - Comprehensive bilingual stopword list (`src/utils.ts:5-294`) filters UI labels (`segui`, `messaggio`, `follow`, `message`), table headers, date words (`maggio`, `january`, `ago`, `2026`), and relative time tokens.
  - `isValidInstagramUsername()` (`src/utils.ts:306-325`) enforces 1–30 characters, `[a-z0-9._]`, dot restrictions, and rejects purely numeric strings.

- **False-Positive State Prevention (`src/App.tsx:55-90`, `src/components/ResultsView.tsx:272-281`)**:
  - Input validation explicitly checks for empty/unparseable lists and fires non-blocking error alerts before analysis.
  - Celebratory banner (*"Nessun unfollower! 🎉"*) is conditionally rendered only when valid non-empty lists were processed and `unfollowers.length === 0`.
  - Mutating input text immediately clears previous stats and alerts (`src/App.tsx:20-30`), preventing stale results from being presented.

- **Tab Switching & Multi-Dimensional Analysis (`src/components/ResultsView.tsx:40-51`, `src/utils.ts:502-532`)**:
  - Three distinct tabs:
    1. `unfollowers`: Non ti seguono (`Following \ Followers`)
    2. `fans`: Non ricambi / Fan (`Followers \ Following`)
    3. `mutuals`: Amici reciproci (`Followers ∩ Following`)
  - Real-time counts on tab triggers.
  - `StatsCard` (`src/components/StatsCard.tsx`) provides a 6-stat dashboard with follow-back percentage ratio.

- **Search, Filter & Sort (`src/components/ResultsView.tsx:54-69`, `229-266`)**:
  - Live search input dynamically filters usernames in the active tab.
  - Cycle sort button toggles between Default (original order), A–Z ascending, and Z–A descending.

- **Export & Clipboard Workflows (`src/components/ResultsView.tsx:71-114`, `src/utils.ts:537-600`)**:
  - "Copia Lista" copies newline-separated usernames to clipboard with animated visual feedback and fallback to `document.execCommand('copy')` if Clipboard API is restricted.
  - Multi-format file export dropdown generates TXT, CSV (with URL column), and structured JSON with statistical metadata.

---

### 1.3 Inspection of UI/UX & Accessibility

- **WCAG 2.1 Contrast Compliance**:
  - Backgrounds: `bg-slate-950` (#020617), `bg-slate-900` (#0f172a).
  - Text tokens: `text-white` (17.5:1, AAA), `text-slate-200` (14:1, AAA), `text-slate-300` (9.87:1, AAA), `text-slate-400` (6.32:1, AA).
  - All alerts and buttons meet WCAG AA/AAA minimum contrast requirements.

- **CSS Grid Scroll Containment (`src/App.tsx:128-178`, `src/components/ResultsView.tsx:127-269`)**:
  - Parent grid column applies `min-h-0`.
  - Results container bounds height to `min-h-[500px] lg:max-h-[640px] h-full`.
  - Inner scroll area applies `flex-grow min-h-0 overflow-y-auto space-y-2 custom-scrollbar`.
  - Tested against large lists: prevents page blowout and enables smooth internal scrolling.

- **Accessibility (a11y) & Semantic Structure**:
  - `index.html`: `lang="it"`, responsive viewport, description, and SVG favicon.
  - `InputCard.tsx`: Explicit `<label>` elements linked via `useId()` (`htmlFor={textareaId}`).
  - `ResultsView.tsx`: Region marked with `role="region"` and `aria-live="polite"`. External profile links have descriptive `aria-label` (`"Apri profilo Instagram di @username (si apre in una nuova scheda)"`), `target="_blank"`, and `rel="noopener noreferrer"`.
  - `focus-visible`: Uniform keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none`) applied to all interactive elements.

- **Non-blocking Alerts (`src/components/AlertBanner.tsx`)**:
  - Zero use of blocking `window.alert()`. Inline dismissible alert banners with `role="alert"`.

- **Mobile Experience (`src/App.tsx:95-98`)**:
  - Viewports `< 1024px` smoothly auto-scroll down to the results section upon initiating a scan.

---

### 1.4 Integrity Violations Assessment

- **Hardcoded test outputs in source code**: None. Logic is fully generalized and algorithmic.
- **Dummy or facade implementations**: None. All features (parsing, AST traversal, clipboard fallback, blob download, sorting, filtering, error boundaries) are genuinely implemented.
- **Shortcuts or delegation to external APIs**: None. 100% client-side privacy-first implementation as required.
- **Fabricated verification outputs**: None. All commands were run directly in the environment.

---

## 2. Logic Chain

1. **Premise 1**: The application must parse Meta JSON exports, HTML, CSV, `@` handles, and URLs without false positives or UI stopword pollution.
   - *Evidence*: `src/utils.ts` implements AST traversal, delimiter splitting, stopword filtering, and strict username validation. 18 automated tests in `src/utils.test.ts` pass with exit code 0.
2. **Premise 2**: User workflows must support tabs (Unfollowers, Fans, Mutuals), statistical calculations, live search/sort, and multi-format exports.
   - *Evidence*: `src/components/ResultsView.tsx` and `src/components/StatsCard.tsx` provide complete interactive state handling, search filtering, A-Z / Z-A sorting, clipboard copying with fallback, and TXT/CSV/JSON downloads.
3. **Premise 3**: UI/UX must comply with WCAG color contrast, maintain internal CSS Grid scrolling without layout blowout, provide accessible labels and focus rings, and replace native blocking alerts.
   - *Evidence*: Tested and verified in `src/App.tsx`, `src/components/InputCard.tsx`, `src/components/AlertBanner.tsx`, `src/index.css`, and `index.html`.
4. **Premise 4**: Codebase must pass strict linting, typechecking, and production bundling.
   - *Evidence*: `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` all returned exit code 0.
5. **Conclusion**: The codebase meets all functional, UI/UX, and accessibility standards without defects or integrity violations.

---

## 3. Caveats

- **No Live Instagram Scraping**: The app relies exclusively on client-side parsing of user exports and does not scrape Instagram directly (respecting Meta Terms of Service).
- **15 MB File Limit**: Files larger than 15 MB are rejected by design to protect the browser main thread from out-of-memory crashes.

---

## 4. Conclusion

**Verdict: APPROVE**

The InstaSniff web application is functionally complete, robust across all expected data formats, and delivers an accessible, WCAG-compliant, responsive user experience. All verification criteria have been satisfied with zero defects.

---

## 5. Verification Method

To independently verify the implementation, run the following commands in powershell at the project root:

```powershell
# 1. Run full unit test suite (18 tests)
npm.cmd test -- --run

# 2. Run ESLint and TypeScript strict check
npm.cmd run lint

# 3. Run production build
npm.cmd run build
```

Files to inspect:
- `src/utils.ts` & `src/utils.test.ts`
- `src/App.tsx`
- `src/components/ResultsView.tsx`
- `src/components/InputCard.tsx`
- `src/components/StatsCard.tsx`
- `src/components/AlertBanner.tsx`
- `src/components/Header.tsx` & `src/components/Footer.tsx`
- `src/components/ErrorBoundary.tsx`
- `index.html` & `src/index.css`
