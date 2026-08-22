# InstaSniff Code Quality & Architectural Audit Report

**Author:** Explorer 1 (React / TypeScript Code Quality Explorer)  
**Date:** 2026-08-22  
**Target Codebase:** `InstaSniff` (React 19, Vite, TypeScript, Tailwind CSS v4)

---

## Executive Summary

The InstaSniff application is a lightweight, client-side single-page utility designed to compare exported Instagram follower and following lists. While the functional core is concise and the application successfully builds with Vite, the codebase suffers from several significant code quality, architectural, and type safety issues:
1. **TypeScript rigor is compromised**: `@types/react` and `@types/react-dom` are absent from `package.json`, and `tsconfig.json` runs without `strict` mode. Under strict checking, 50+ type errors surface.
2. **ESLint is missing entirely**: No ESLint config or React Hook linting is present; `npm run lint` only delegates to a relaxed `tsc --noEmit`.
3. **React Anti-Patterns & Fragility**: Lack of an `ErrorBoundary`, unmemoized heavy line calculations on every keystroke, unhandled `FileReader` errors, blocking `alert()` browser modals, and stale results state.
4. **Parser & Format Deficiencies**: The core parsing utility (`src/utils.ts`) uses a simplistic regex that rejects `@username` tags, fails completely on Meta JSON exports (`.json`), and falsely extracts date words as usernames.
5. **Severe Dependency Bloat & Template Drift**: 6 unused production/dev packages (`@google/genai`, `express`, `dotenv`, `motion`, `tsx`, `esbuild`), duplicated dependencies, and obsolete Google AI Studio boilerplate.

---

## Findings by Category

---

### 1. TypeScript Configuration & Typing Rigor

#### 1.1 Missing `@types/react` and `@types/react-dom` in `package.json`
- **Severity:** High
- **File:** `package.json:25-34`
- **Description:** `devDependencies` does not include `@types/react` or `@types/react-dom`.
- **Evidence:**
  ```json
  "devDependencies": {
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3",
    "@types/express": "^4.17.21"
  }
  ```
  When running `npx tsc --noEmit --strict`, TypeScript reports:
  ```text
  src/main.tsx(1,26): error TS7016: Could not find a declaration file for module 'react'.
  src/main.tsx(2,26): error TS7016: Could not find a declaration file for module 'react-dom/client'.
  src/components/InputCard.tsx(35,5): error TS7026: JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists.
  ```
- **Remediation:** Install `@types/react: ^19.0.1` and `@types/react-dom: ^19.0.1` in `devDependencies`.

---

#### 1.2 Non-Strict TypeScript Configuration (`tsconfig.json`)
- **Severity:** High
- **File:** `tsconfig.json:1-26`
- **Description:** `compilerOptions` does not enable `"strict": true` and omits critical safety checks (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- **Evidence:**
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "experimentalDecorators": true,
      "useDefineForClassFields": false,
      "module": "ESNext",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "isolatedModules": true,
      "moduleDetection": "force",
      "allowJs": true,
      "jsx": "react-jsx",
      "paths": {
        "@/*": ["./*"]
      },
      "allowImportingTsExtensions": true,
      "noEmit": true
    }
  }
  ```
- **Remediation:** Update `tsconfig.json` to enable strict mode and safety checks:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "jsx": "react-jsx",
      "moduleResolution": "bundler",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "skipLibCheck": true,
      "paths": {
        "@/*": ["./src/*"]
      },
      "noEmit": true
    },
    "include": ["src"],
    "exclude": ["node_modules", "dist"]
  }
  ```

---

#### 1.3 Unsafe Type Assertions and Non-Null Assertions
- **Severity:** Medium
- **Files & Lines:**
  - `src/components/InputCard.tsx:22`:
    ```ts
    20: reader.onload = (event) => {
    21:   if (event.target?.result) {
    22:     onChange(event.target.result as string);
    23:   }
    24: };
    ```
    *Issue:* `event.target?.result` has type `string | ArrayBuffer | null`. Casting as `string` blindly bypasses type narrowing.
    *Remediation:* `if (typeof event.target?.result === 'string') { onChange(event.target.result); }`
  - `src/main.tsx:6`:
    ```ts
    6: createRoot(document.getElementById('root')!).render(
    ```
    *Issue:* Non-null assertion operator `!` can throw unhandled runtime errors if the DOM root element is missing.
    *Remediation:* Safely query element:
    ```ts
    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error("Failed to find root element");
    createRoot(rootElement).render(...)
    ```

---

### 2. ESLint Configuration & Static Analysis

#### 2.1 Complete Absence of ESLint Tooling
- **Severity:** High
- **Files:** Root directory, `package.json:11`
- **Description:** No ESLint configuration file exists (`eslint.config.js` or `.eslintrc.*`). `package.json` specifies `"lint": "tsc --noEmit"`.
- **Impact:**
  - React Hook violations (rules of hooks, missing dependencies in `useEffect`/`useCallback`) are never detected.
  - Code formatting, unused variables, and style inconsistencies are unmonitored.
- **Remediation:**
  1. Install `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
  2. Create standard modern flat config `eslint.config.js`.
  3. Update `package.json` script: `"lint": "eslint . && tsc --noEmit"`.

---

### 3. React Anti-Patterns & Lifecycle

#### 3.1 Missing React Error Boundary
- **Severity:** High
- **File:** `src/main.tsx:6-10`
- **Description:** The root `<App />` component is mounted directly into `createRoot()` without an `ErrorBoundary`.
- **Impact:** Any uncaught JavaScript exception during rendering or parsing will crash the whole React tree to an unrecoverable blank white screen.
- **Remediation:** Create a generic `ErrorBoundary` component with fallback UI (e.g. "Something went wrong. [Reload Page]") and wrap `<App />`.

---

#### 3.2 Performance Bottleneck: Synchronous Line Counting on Every Render
- **Severity:** Medium
- **File:** `src/components/InputCard.tsx:32`
- **Description:** `const lineCount = value.split('\n').filter(l => l.trim()).length;` is executed on every single render / keystroke.
- **Impact:** When users paste large export files (thousands or tens of thousands of lines), splitting and filtering the entire string on every character input causes severe UI lag and dropped frames.
- **Remediation:** Memoize calculation:
  ```ts
  const lineCount = useMemo(() => {
    if (!value) return 0;
    return value.split('\n').filter(l => l.trim().length > 0).length;
  }, [value]);
  ```

---

#### 3.3 Unhandled `FileReader` Error States & Missing File Size Guard
- **Severity:** Medium
- **File:** `src/components/InputCard.tsx:15-30`
- **Description:**
  ```ts
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
      }
    };
    reader.readAsText(file);
  ```
- **Impact:**
  - If a corrupt or binary file is read, `reader.onerror` is not handled, leaving the user with zero feedback.
  - If an enormous file (e.g., 500MB+) is selected, reading the entire string into memory can cause browser tab OOM crashes.
- **Remediation:** Add file size check (e.g., max 10MB), handle `reader.onerror`, and display an error state if file reading fails.

---

#### 3.4 Native `alert()` Usage in React UI
- **Severity:** Medium
- **File:** `src/App.tsx:13-16`
- **Description:**
  ```ts
  const handleProcess = () => {
    if (!followers.trim() || !following.trim()) {
      alert("Inserisci entrambe le liste (Follower e Seguiti) per continuare.");
      return;
    }
  ```
- **Impact:** Browser-native modal dialogs (`alert()`) freeze execution, disrupt UX, and cannot be styled or tested cleanly.
- **Remediation:** Replace with an inline validation state or animated error banner in the UI.

---

#### 3.5 Stale Results State Desynchronization
- **Severity:** Low
- **File:** `src/App.tsx:9-27`
- **Description:** `unfollowers` is stored in state and calculated only when clicking the action button. If the user edits the input textareas after calculating, `unfollowers` retains the stale result, showing an out-of-sync list.
- **Remediation:** Add a visual indicator or reset/dirty state when inputs are modified after analysis.

---

### 4. Component Architecture, Modularity & Logic Quality

#### 4.1 Parser Flaws & Fragility in `src/utils.ts`
- **Severity:** High
- **File:** `src/utils.ts:1-22`
- **Description:**
  ```ts
  export function parseInstagramText(rawText: string): string[] {
    const textWithoutTags = rawText.replace(/<[^>]*>?/gm, '\n');
    const lines = textWithoutTags.split(/\r?\n/);
    const usernames = new Set<string>();
    const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine && usernameRegex.test(cleanLine)) {
        usernames.add(cleanLine.toLowerCase());
      }
    }
    return Array.from(usernames);
  }
  ```
- **Detailed Issues:**
  1. **Rejection of `@username` syntax**: If a user pastes `@alberto_barnus99`, `usernameRegex.test('@alberto_barnus99')` returns `false` because `@` is not in `[a-zA-Z0-9._]`.
  2. **Failure on Meta JSON Export Files**: `InputCard.tsx` accepts `.json` files (`accept=".txt,.html,.json,.csv"`). Meta's official data export (`followers_1.json` and `following.json`) contains objects like:
     ```json
     {"string_list_data": [{"value": "johndoe", "href": "https://www.instagram.com/johndoe"}]}
     ```
     `parseInstagramText` treats this as raw text. The line `"value": "johndoe",` fails `usernameRegex` due to quotes and colons. Result: **0 usernames parsed** from official JSON exports!
  3. **False Positive Usernames from Dates and UI Words**: Single-word lines (like `Yesterday`, `Profile`, `Following`, `Ago`, `Jan`, `Feb`, `Message`, `Verified`) match `/^[a-zA-Z0-9._]{1,30}$/` and get falsely included as usernames.
- **Remediation:**
  - Add JSON detection (`try { const data = JSON.parse(rawText); ... } catch {}`).
  - Strip leading `@` characters.
  - Filter out common UI stop-words and month/date abbreviations.

---

#### 4.2 Monolithic Architecture & Complex Nested Ternaries
- **Severity:** Medium
- **File:** `src/App.tsx:86-146`
- **Description:** `App.tsx` contains all layout, results card, link toggling, input triggers, and footer in a single component with nested ternaries:
  ```tsx
  {!unfollowers ? (
    <div>...In attesa dei dati...</div>
  ) : unfollowers.length === 0 ? (
    <div>...Grande! Tutti quelli che segui ti seguono...</div>
  ) : (
    unfollowers.map(user => ...)
  )}
  ```
- **Remediation:** Decompose into modular components: `Header`, `InputSection`, `ResultsSection`, `UnfollowerItem`, `EmptyState`, and `Footer`.

---

#### 4.3 Accessibility (a11y) Omissions
- **Severity:** Low
- **File:** `src/components/InputCard.tsx:43-67`, `src/App.tsx:90-97`
- **Description:**
  - `<textarea>` lacks `id` or `aria-label` / `<label htmlFor="...">`.
  - Icon-only button (`<RefreshCcw size={16} />`) lacks `aria-label="Ricomincia"`.
- **Remediation:** Add accessible labels and associations.

---

### 5. Dead Code, Dependency Bloat & Configuration Drift

#### 5.1 Unused Dependencies in `package.json`
- **Severity:** Medium
- **File:** `package.json:13-34`
- **Dead/Unused Packages:**
  - `@google/genai` (`^2.4.0`): 0 imports across codebase.
  - `express` (`^4.21.2`) & `@types/express` (`^4.17.21`): 0 imports (pure client-side app).
  - `dotenv` (`^17.2.3`): 0 imports.
  - `motion` (`^12.23.24`): 0 imports.
  - `tsx` (`^4.21.0`): 0 scripts/uses.
  - `esbuild` (`^0.25.0`): 0 scripts/uses.
  - `autoprefixer` (`^10.4.21`): Redundant in Tailwind CSS v4.
  - `vite` is duplicated in both `dependencies` and `devDependencies`.
  - `@vitejs/plugin-react` and `@tailwindcss/vite` belong in `devDependencies`.
- **Remediation:** Prune `package.json` dependencies to keep only active, required packages.

---

#### 5.2 Project Metadata & AI Studio Template Drift
- **Severity:** Low
- **Files:** `package.json:2`, `metadata.json:5`, `.env.example:1-10`, `README.md:1-21`, `src/App.tsx:149`
- **Description:**
  - `package.json`: `"name": "react-example"` (placeholder).
  - `metadata.json`: References `"MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"`.
  - `.env.example` & `README.md`: Contain boilerplate instructions for configuring `GEMINI_API_KEY`.
  - `package.json` script `"clean": "rm -rf dist server.js"` references non-existent `server.js` and uses Unix-specific syntax.
  - `src/App.tsx:149`: `SOURCE: LOCAL_STORAGE` (local storage is not utilized).
- **Remediation:** Align project metadata and documentation with the actual application identity.

---

### 6. Build and Typecheck Health Summary

| Check | Command | Status | Details |
|---|---|---|---|
| **Vite Production Build** | `npm run build` | ✅ PASS | Builds in ~12s into `dist/` (`index.html`, `index.css`, `index.js`). |
| **Current Typecheck / Lint** | `npm run lint` (`tsc --noEmit`) | ⚠️ PASS (Loose) | Passes only because `strict` is disabled and missing types are ignored. |
| **Strict Typecheck** | `npx tsc --noEmit --strict` | ❌ FAIL | 50+ type errors due to missing `@types/react` and implicit any types. |
| **ESLint Analysis** | `npm run lint` | ❌ NOT CONFIGURED | ESLint is not installed or configured. |

---

## Prioritized Remediation Roadmap

1. **Phase 1: Tooling & Type Safety (High Priority)**
   - Install `@types/react` and `@types/react-dom` in `devDependencies`.
   - Configure `tsconfig.json` with `"strict": true`, correct `@/*` path mapping, and explicit `include`/`exclude`.
   - Setup `eslint.config.js` with `typescript-eslint` and `eslint-plugin-react-hooks`.
   - Prune dead dependencies (`@google/genai`, `express`, `dotenv`, `motion`, etc.) from `package.json`.

2. **Phase 2: Core Logic & Parser Robustness (High Priority)**
   - Upgrade `src/utils.ts` to parse JSON exports (Meta structure), handle `@` prefixed handles, and ignore common stopwords/timestamps.
   - Add error handling and file size guards to `handleFileUpload` in `InputCard.tsx`.

3. **Phase 3: React Architecture & User Experience (Medium Priority)**
   - Wrap app in an `ErrorBoundary`.
   - Memoize `lineCount` in `InputCard.tsx`.
   - Replace native `alert()` with in-app error feedback.
   - Decompose `App.tsx` into clean, testable subcomponents.

4. **Phase 4: Hygiene & Documentation (Low Priority)**
   - Update `package.json` name to `instasniff`.
   - Clean up `README.md`, `.env.example`, and metadata.
