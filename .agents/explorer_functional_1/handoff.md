# Handoff Report: Functional Logic & State Explorer

**Agent:** Explorer 2 (Functional Logic & State Explorer)  
**Parent Agent:** `0e83418c-acf3-4d0a-833a-03567274a421`  
**Date:** 2026-08-22  
**Handoff Type:** Hard Handoff (Task Complete)

---

## 1. Observation

### 1.1 Direct Source Code Observations
1. **`src/utils.ts` (lines 1–22)**:
   ```typescript
   export function parseInstagramText(rawText: string): string[] {
     // Rimuoviamo eventuali tag html nel caso in cui l'utente carichi un file html esportato
     const textWithoutTags = rawText.replace(/<[^>]*>?/gm, '\n');
     const lines = textWithoutTags.split(/\r?\n/);
     
     const usernames = new Set<string>();
     
     // I nomi utente Instagram possono contenere solo lettere, numeri, punti e underscore.
     // Escludiamo tutto ciò che contiene spazi, virgole o due punti (tipici delle date).
     // La lunghezza massima è 30 caratteri.
     const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;

     for (const line of lines) {
       const cleanLine = line.trim();
       // Se la riga non è vuota e rispetta il formato di un username IG
       if (cleanLine && usernameRegex.test(cleanLine)) {
         usernames.add(cleanLine.toLowerCase());
       }
     }
     
     return Array.from(usernames);
   }
   ```
2. **`src/App.tsx` (lines 12–27, 106–109, 117–124, 149)**:
   - Line 14: `alert("Inserisci entrambe le liste (Follower e Seguiti) per continuare.");`
   - Lines 18–26:
     ```typescript
     const followersSet = new Set(parseInstagramText(followers));
     const followingSet = new Set(parseInstagramText(following));
     const notFollowingBack = Array.from(followingSet).filter(
       (user) => !followersSet.has(user)
     );
     setUnfollowers(notFollowingBack);
     ```
   - Lines 106–109:
     ```tsx
     ) : unfollowers.length === 0 ? (
       <div className="h-full flex flex-col items-center justify-center text-green-500 text-sm font-mono text-center px-4">
         Grande! Tutti quelli che segui ti seguono a loro volta. 🎉
       </div>
     ```
   - Lines 117–124:
     ```tsx
     <a 
       href={`https://instagram.com/${user}`} 
       target="_blank" 
       rel="noopener noreferrer"
       className="text-[10px] text-indigo-400 font-bold hover:underline transition-opacity shrink-0 flex items-center gap-1"
       title="Apri su Instagram"
     >
       PROFILO <ExternalLink size={10} />
     </a>
     ```
   - Line 149:
     ```tsx
     <div>SOURCE: LOCAL_STORAGE / REPO: GITHUB_UI</div>
     ```
3. **`src/components/InputCard.tsx` (lines 15–30, 32, 58)**:
   - Line 58: `<input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.html,.json,.csv" />`
   - Lines 19–25: `reader.readAsText(file)` without `reader.onerror`.
   - Line 32: `const lineCount = value.split('\n').filter(l => l.trim()).length;`
4. **`package.json` (lines 13–24)**:
   - Dependencies include `@google/genai`, `express`, `dotenv`, `motion`, `@types/express`.

### 1.2 Empirical Test Suite Results
Executed Node.js validation test suite (`.agents/explorer_functional_1/test_parser.cjs`):
```
--- TEST 1: Handles starting with @ ---
Input: @john_doe, @jane.smith, @user123
Result: []

--- TEST 2: Instagram URLs ---
Input: https://www.instagram.com/john_doe/, https://instagram.com/jane.smith
Result: []

--- TEST 3: Instagram official JSON export ---
Result: []

--- TEST 4: Instagram HTML export with Meta UI labels ---
Result: [ 'followers', 'instagram', 'realuser', 'active' ]

--- TEST 5: CSV export ---
Result: []

--- TEST 6: Date words & UI words in raw copy-paste ---
Result: [ 'segui', 'messaggio', 'may', '18', '2026', 'followers', 'remove' ]

--- TEST 7: Comma/space separated usernames ---
Result: []

--- TEST 8: Invalid IG handles (dots at start/end, double dots) ---
Result: [ '.invalid', 'invalid.', 'in..valid', 'valid_user' ]
```

---

## 2. Logic Chain

1. **Premise**: `InputCard.tsx` accepts `.json`, `.csv`, `.html`, and `.txt` file uploads, while users paste `@handles`, URLs, or copied text from Instagram web.
2. **Observation Step 1**: `parseInstagramText` strictly splits input on `\r?\n` and validates lines against `^[a-zA-Z0-9._]{1,30}$`.
3. **Inference 1**: JSON objects (containing quotes, colons, commas), CSV files (containing commas), handles with `@`, URLs with `https://`, and comma-separated text fail the regex test entirely, returning `[]` (0 parsed usernames).
4. **Observation Step 2**: When `parseInstagramText` returns `[]` for both inputs, `followingSet` is empty and `followersSet` is empty. `notFollowingBack` is computed as `[]`.
5. **Inference 2**: `App.tsx` evaluates `unfollowers.length === 0` and displays the celebratory success message `"Grande! Tutti quelli che segui ti seguono a loro volta. 🎉"`. Users who upload official JSON/CSV data or paste `@handles` are given a false-positive assurance that no unfollowers exist.
6. **Observation Step 3**: When HTML exports or web copy-pasting is used, words like `"Followers"`, `"Following"`, `"Instagram"`, `"Active"`, `"Segui"`, `"Messaggio"`, `"Rimuovi"`, `"May"`, `"18"` match `^[a-zA-Z0-9._]{1,30}$`.
7. **Inference 3**: These UI action labels and date fragments are inserted into the sets. Set difference marks them as unfollowers, producing phantom users like `@following` and `@messaggio` with generated profile links.
8. **Observation Step 4**: There are no export functions (JSON, CSV, TXT, Clipboard), no persistence despite footer claims of `SOURCE: LOCAL_STORAGE`, no search/sort, and no bidirectional analysis (fans, mutuals).
9. **Conclusion**: The core business logic requires a comprehensive parser overhaul and expanded application workflows to function reliably.

---

## 3. Caveats

- **External Instagram Live API**: Direct fetching of Instagram user metadata via network requests from client-side browsers is blocked by Meta CORS policies and requires official Graph API access tokens or backend session proxies. Therefore, client-side data parsing of export files and copy-pasted lists remains the correct, secure, and privacy-preserving architecture for InstaSniff.
- **No caveats** regarding local code analysis; 100% of source files in `src/` have been directly inspected.

---

## 4. Conclusion

The application has **19 functional, state, and parsing defects** across 4 severity tiers:
- **2 Critical Bugs**: Official JSON exports yield 0 usernames; empty/failed parsing triggers false-positive success congratulation.
- **6 High-Severity Bugs**: Rejection of `@` handles, profile URLs, CSV files; HTML export pollution with UI headings; web copy UI label ingestion; 100% false-positive unfollowers on asymmetric zero-parse; complete absence of export features.
- **6 Medium-Severity Bugs**: State desynchronization on textarea edit; false `LOCAL_STORAGE` claim and missing persistence; missing fans/mutuals/stats; missing search/sort; unhandled `FileReader.onerror`; permissive username regex.
- **5 Low-Severity Bugs**: Inaccurate line counter; blocking `alert()`; dead dependencies (`@google/genai`, `express`); unencoded URI parameters.

All defects are fully mapped with code snippets and reproduction traces in `analysis.md`.

---

## 5. Verification Method

To independently verify these findings:
1. **Lint & Build Verification**:
   - `cmd /c npm run lint` (runs `tsc --noEmit`) -> Exits with code 0.
   - `cmd /c npm run build` (runs `vite build`) -> Exits with code 0.
2. **Parser Edge-Case Script Execution**:
   - Run: `node .agents/explorer_functional_1/test_parser.cjs`
   - Observe test failures on `@handles`, URLs, JSON, CSV, and pollution with UI strings.
3. **Enhanced Prototype Verification**:
   - Run: `node .agents/explorer_functional_1/test_enhanced_parser.cjs`
   - Observe successful handling across all formats, JSON traversal, HTML extraction, and stop-word filtering.
4. **Primary Report File**:
   - Inspect `c:\Users\gerar\Documents\GitHub\InstaSniff\.agents\explorer_functional_1\analysis.md` for complete breakdown.
