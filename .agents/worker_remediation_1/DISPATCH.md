## 2026-08-22T07:34:00Z
You are Worker 1: Lead Remediation Engineer for InstaSniff.
Your working directory is: c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\worker_remediation_1\
You MUST read c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\ORIGINAL_REQUEST.md first.
Also read the audit findings from:
- c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_codequality_1\analysis.md
- c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_functional_1\analysis.md
- c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_uiux_1\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Generate `c:\Users\gerar\Documents\GitHub\InstaSniff\audit_report.md` in the project root:
   - Must contain Executive Summary, Section 1 (React/TypeScript Code Quality), Section 2 (Functional Bugs & Logic Flaws), Section 3 (UI/UX & Accessibility Inconsistencies), and a Remediation Summary table.

2. Code Quality & Tooling Remediation:
   - Clean `package.json`: Remove unused dependencies (`@google/genai`, `express`, `@types/express`, `dotenv`, `motion`, `tsx`, `esbuild`, `autoprefixer`). Add `@types/react` (`^19.0.10` or compatible) and `@types/react-dom` (`^19.0.4` or compatible) to `devDependencies`. Ensure devDependencies and dependencies are properly organized.
   - Configure `tsconfig.json`: Enable `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`, fix `"paths": { "@/*": ["./src/*"] }`, set `"include": ["src"]`.
   - Set up ESLint (`eslint.config.js` or eslint packages if present, or configure `npm run lint` to execute comprehensive strict type check + linter). Ensure `npm run lint` and `npm run build` exit with code 0.

3. Functional Logic & Business Rules Remediation:
   - Overhaul `src/utils.ts`:
     - Robust Instagram Parser:
       - Parse official Instagram JSON exports (handling nested formats like `string_list_data[].value`, `relationships_following`, direct arrays, key-value objects).
       - Strip `@` prefixes (e.g., `@user`).
       - Parse Instagram profile URLs (`https://instagram.com/user`, `https://www.instagram.com/user/`).
       - Parse CSV / TSV / comma-separated / space-separated inputs.
       - Clean HTML tags and filter out Meta export headers (`Followers`, `Following`, `Instagram`, `Active`, `Close`, `Search`, etc.).
       - Comprehensive stopword filter for UI buttons and dates (`segui`, `messaggio`, `rimuovi`, `follow`, `following`, `message`, `remove`, `modifica`, `edit`, `profilo`, `profile`, `post`, `follower`, `seguiti`, `gennaio`, `maggio`, `january`, `may`, timestamps, etc.).
       - Strict regex validation for Instagram usernames (1-30 chars, alphanumeric + dots/underscores, no leading/trailing dots, no consecutive dots).
     - Overhaul `src/App.tsx` and state:
       - Fix false-positive celebration: Only celebrate if `followingSet.size > 0 && followersSet.size > 0 && unfollowers.length === 0`.
       - If either set is 0 after parsing, display an informative non-blocking warning banner explaining that no valid usernames were parsed.
       - Implement analysis views/tabs:
         1. "Non ti seguono" (Unfollowers: Following \ Followers)
         2. "Non li segui" / "Fan" (Fans: Followers \ Following)
         3. "Amici reciproci" (Mutuals: Followers ∩ Following)
         4. Statistics summary (Total Following, Total Followers, Unfollowers Count, Fan Count, Mutuals Count, Follow-back Ratio).
       - Add Export & Copy features:
         - "Copia Lista" (Copy active list to clipboard with "Copiato!" toast/feedback).
         - "Esporta TXT" / "Esporta CSV" / "Esporta JSON" file downloads.
       - Add Search / Filter and Sort (A-Z, Z-A) for the results list.
       - Replace native blocking `window.alert()` with inline alert banners / dismissible alerts.
       - State synchronization: Clear/invalidate results when inputs change.
       - In `src/components/InputCard.tsx`: Add `useMemo` for line/username counts, add `FileReader.onerror` handling and file size limit guard (max 15MB), add clear text button.

4. UI/UX, Responsive & Accessibility Remediation:
   - Fix CSS Grid results container bug: add `min-h-0` and bounded max-height (e.g. `lg:max-h-[calc(100vh-14rem)]` or `max-h-[620px]`) so `.custom-scrollbar` scrolls internally without page blowout.
   - Fix WCAG Color Contrast: Update all low-contrast text tokens (`text-slate-500`/`text-slate-600` on dark backgrounds to `text-slate-400`/`text-slate-300`).
   - Add Accessibility: `<label>` / `aria-label` / `id` for textareas, file inputs, icon buttons; `role="region"` and `aria-live="polite"` on results; set `lang="it"` in `index.html`.
   - Add focus styles: `:focus-visible:ring-2 focus-visible:ring-indigo-500` on buttons and inputs.
   - Add mobile auto-scroll to the results section after clicking scan.
   - Add `<ErrorBoundary>` in `src/components/ErrorBoundary.tsx` wrapping the application in `src/main.tsx`.

5. Verification:
   - Run `npm run lint` and `npm run build`. Verify both exit with code 0.
   - Test various inputs (JSON files, @ handles, URLs, HTML text, CSV text, invalid text).
   - Document everything in `c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\worker_remediation_1\handoff.md` and update your `progress.md`.
   - Report back to the orchestrator when finished.
