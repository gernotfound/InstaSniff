# Comprehensive Functional Logic & State Audit: InstaSniff

**Auditor:** Explorer 2 (Functional Logic & State Explorer)  
**Date:** 2026-08-22  
**Target Repository:** `gernotfound/InstaSniff`  
**Working Directory:** `.agents/explorer_functional_1/`

---

## 1. Executive Summary

InstaSniff is a client-side React 19 single-page web application designed to help users identify non-reciprocal followers ("unfollowers") on Instagram by processing and comparing lists of followers and following accounts.

While the core conceptual premise is simple (calculating the set difference between "Following" and "Followers"), a rigorous functional audit reveals **critical logic errors, major parsing failures across standard Instagram data export formats (JSON, CSV, HTML, handle mentions, URLs), state synchronization flaws, false-positive success states, and complete absence of key promised or standard workflows (exporting, searching, reciprocal analysis, storage persistence)**.

### Summary of Audit Findings by Severity

| ID | Title | Severity | Location | Functional Impact |
|---|---|---|---|---|
| **BUG-01** | Complete Parsing Failure on Official Instagram JSON Exports | **CRITICAL** | `src/utils.ts:1-22`, `src/components/InputCard.tsx:58` | Official Meta JSON exports yield 0 usernames, causing total data loss. |
| **BUG-02** | False-Positive "All Follow Back" Success State on Empty/Failed Parse | **CRITICAL** | `src/App.tsx:18-26`, `src/App.tsx:106-109` | Unparseable or empty data triggers celebratory success message instead of error. |
| **BUG-03** | Silent Rejection of Handles with `@` Prefix | **CRITICAL** | `src/utils.ts:11-19` | Standard `@username` pastes result in 0 extracted usernames. |
| **BUG-04** | Complete Rejection of Instagram Profile URLs | **HIGH** | `src/utils.ts:11-19` | Pasted URLs (`https://instagram.com/user`) are completely rejected. |
| **BUG-05** | Total Failure on CSV and Delimited Spreadsheets | **HIGH** | `src/utils.ts:1-22`, `src/components/InputCard.tsx:58` | CSV uploads produce 0 extracted usernames due to unhandled delimiters. |
| **BUG-06** | HTML Export Pollution: Meta Page Elements Ingested as Fake Usernames | **HIGH** | `src/utils.ts:3, 11-19` | Headers like "Followers", "Instagram", "Active" appear as phantom unfollowers. |
| **BUG-07** | Instagram Web UI Action Labels and Date Fragments Parsed as Users | **HIGH** | `src/utils.ts:11-19` | "Segui", "Messaggio", "Rimuovi", "May", "18", "2026" turn into phantom usernames. |
| **BUG-08** | Asymmetric Zero-Follower Set Causes 100% Unfollower False Positives | **HIGH** | `src/App.tsx:18-26` | If followers parse to 0, every following user is incorrectly marked as unfollower without warning. |
| **BUG-09** | Absence of All Export Workflows (JSON, CSV, TXT, Clipboard) | **HIGH** | `src/App.tsx:136-144` | Users have no way to export, save, or copy computed results. |
| **BUG-10** | Stale State Desynchronization on Input Text Mutation | **MEDIUM** | `src/App.tsx:7-10`, `src/App.tsx:58-71` | Modifying textareas after analysis leaves outdated unfollower results visible. |
| **BUG-11** | False Metadata Claim ("SOURCE: LOCAL_STORAGE") & Zero Persistence | **MEDIUM** | `src/App.tsx:149` | Footer claims local storage, but zero persistence exists; refresh wipes all data. |
| **BUG-12** | Missing Reciprocal Analysis Dimensions (Fans, Mutuals, Stats) | **MEDIUM** | `src/App.tsx:18-26` | App only computes `following \ followers`; lacks fans, mutuals, and percentage metrics. |
| **BUG-13** | Lack of Search, Filter, and Sorting in Results View | **MEDIUM** | `src/App.tsx:100-134` | Large result sets cannot be searched, filtered, or sorted alphabetically. |
| **BUG-14** | Missing Error Handling on `FileReader` & Large Payload Freezes | **MEDIUM** | `src/components/InputCard.tsx:19-25` | `FileReader.onerror` is unhandled; large exports cause UI freeze on main thread. |
| **BUG-15** | Permissive Username Regex Allows Invalid Instagram Handle Formats | **MEDIUM** | `src/utils.ts:11` | Allows handles starting/ending with dots, double dots, or purely numeric strings. |
| **BUG-16** | Misleading `Righe: X` Line Count in Input Card | **LOW** | `src/components/InputCard.tsx:32, 51` | Displays raw newline count rather than count of recognized Instagram handles. |
| **BUG-17** | Blocking Native Browser `alert()` for Form Validation | **LOW** | `src/App.tsx:14` | Uses disruptive synchronous `alert()`. |
| **BUG-18** | Dead Dependencies & Configuration Drift (`@google/genai`, `express`) | **LOW** | `package.json`, `metadata.json`, `README.md` | Unused packages and misleading AI Studio backend documentation. |
| **BUG-19** | Unencoded URI Parameters in External Instagram Profile Link | **LOW** | `src/App.tsx:118` | Missing `encodeURIComponent(user)`. |

---

## 2. Deep-Dive Findings & Code Traces

### BUG-01: Complete Parsing Failure on Official Instagram JSON Exports
- **Severity**: Critical
- **Files**: `src/utils.ts` (lines 1–22), `src/components/InputCard.tsx` (line 58)
- **Observed Code**:
  ```typescript
  // src/utils.ts:1-22
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
- **Code Trace & Reproduction**:
  1. User requests their Instagram data export from Meta Accounts Center in JSON format (`followers_1.json` and `following.json`).
  2. `InputCard.tsx` advertises `.json` support via `accept=".txt,.html,.json,.csv"`.
  3. The JSON file contains structures like:
     ```json
     [
       {
         "title": "",
         "string_list_data": [
           {
             "href": "https://www.instagram.com/user_a",
             "value": "user_a",
             "timestamp": 1700000000
           }
         ]
       }
     ]
     ```
  4. `parseInstagramText` splits lines: `"value": "user_a",`.
  5. `usernameRegex.test('"value": "user_a",')` tests against `/^[a-zA-Z0-9._]{1,30}$/`, which evaluates to `false` because of `"`, `:`, space, and `,`.
  6. **Result**: `parseInstagramText` returns `[]`. 0 usernames are extracted.

---

### BUG-02: False-Positive "All Follow Back" Success State on Empty/Failed Parse
- **Severity**: Critical
- **Files**: `src/App.tsx` (lines 18–26, 106–109)
- **Observed Code**:
  ```typescript
  // src/App.tsx:18-26
  const followersSet = new Set(parseInstagramText(followers));
  const followingSet = new Set(parseInstagramText(following));

  const notFollowingBack = Array.from(followingSet).filter(
    (user) => !followersSet.has(user)
  );
  setUnfollowers(notFollowingBack);

  // src/App.tsx:106-109
  ) : unfollowers.length === 0 ? (
    <div className="h-full flex flex-col items-center justify-center text-green-500 text-sm font-mono text-center px-4">
      Grande! Tutti quelli che segui ti seguono a loro volta. 🎉
    </div>
  ) : (
  ```
- **Code Trace & Reproduction**:
  1. User pastes or uploads unparseable data (e.g. JSON export, CSV, or text without matches) in both fields.
  2. `followers.trim()` and `following.trim()` are non-empty, bypassing the initial check on line 13.
  3. `parseInstagramText(followers)` yields `[]`; `parseInstagramText(following)` yields `[]`.
  4. `notFollowingBack` is evaluated as `[]`.
  5. `setUnfollowers([])` is called.
  6. The UI renders the green celebratory banner: `"Grande! Tutti quelli che segui ti seguono a loro volta. 🎉"`.
  7. **Impact**: The user is falsely assured that 100% of followed accounts follow them back when the parser actually failed completely.

---

### BUG-03: Silent Rejection of Handles with `@` Prefix
- **Severity**: Critical
- **Files**: `src/utils.ts` (lines 11–19)
- **Observed Code**:
  ```typescript
  const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine && usernameRegex.test(cleanLine)) {
      usernames.add(cleanLine.toLowerCase());
    }
  }
  ```
- **Code Trace & Reproduction**:
  1. User pastes a list of handles: `@podstract\n@alberto_barnus99\n@cristiano`.
  2. `cleanLine` is `@podstract`.
  3. `usernameRegex.test('@podstract')` fails because `@` is not included in `[a-zA-Z0-9._]`.
  4. **Result**: All handles are discarded silently.

---

### BUG-04: Complete Rejection of Instagram Profile URLs
- **Severity**: High
- **Files**: `src/utils.ts` (lines 11–19)
- **Code Trace & Reproduction**:
  1. User pastes links: `https://www.instagram.com/john_doe/` or `https://instagram.com/jane.smith?igsh=abc`.
  2. `cleanLine` contains `https:`, `/`, `?`, etc.
  3. Regex fails, returning 0 matches.

---

### BUG-05: Total Failure on CSV and Delimited Spreadsheets
- **Severity**: High
- **Files**: `src/utils.ts` (lines 1–22), `src/components/InputCard.tsx` (line 58)
- **Code Trace & Reproduction**:
  1. User uploads a `.csv` export (`username,date\njohn_doe,2026-01-01`).
  2. `utils.ts` only splits on `\r?\n`.
  3. Line `john_doe,2026-01-01` fails `usernameRegex` due to `,` and `-`.
  4. **Result**: 0 usernames extracted from valid CSV files.

---

### BUG-06: HTML Export Pollution: Meta Page Elements Ingested as Fake Usernames
- **Severity**: High
- **Files**: `src/utils.ts` (lines 3, 11–19)
- **Observed Code**:
  ```typescript
  const textWithoutTags = rawText.replace(/<[^>]*>?/gm, '\n');
  ```
- **Code Trace & Reproduction**:
  1. User uploads `followers_1.html` and `following.html`.
  2. The HTML files contain headings: `<h2>Followers</h2>`, `<div>Instagram</div>`, `<span>Active</span>`, `<span>Meta</span>`.
  3. Stripping `<...>` leaves `Followers`, `Instagram`, `Active`, `Meta` on separate lines.
  4. `usernameRegex.test("Followers")` evaluates to `true`.
  5. `usernames.add("followers")`, `usernames.add("instagram")`, `usernames.add("active")`.
  6. In `following.html`, `<h2>Following</h2>` produces username `"following"`.
  7. When diffing `followingSet \ followersSet`, `"following"` is present in following but not followers.
  8. **Result**: `@following` appears in the Unfollowers list as a phantom user.

---

### BUG-07: Instagram Web UI Action Labels and Date Fragments Parsed as Users
- **Severity**: High
- **Files**: `src/utils.ts` (lines 11–19)
- **Code Trace & Reproduction**:
  1. Copying the followers/following modal on web includes UI buttons:
     - Italian: `Segui`, `Messaggio`, `Rimuovi`, `Verificato`, `Suggeriti`
     - English: `Follow`, `Message`, `Remove`, `Verified`, `Suggested`
     - Date tokens on standalone lines: `May`, `Aug`, `18`, `2026`, `am`, `pm`
  2. Because all these words are 1-30 alphanumeric chars, they pass regex and get saved as usernames.
  3. **Result**: `@segui`, `@messaggio`, `@remove`, `@18`, `@2026` appear in the results list.

---

### BUG-08: Asymmetric Zero-Follower Set Causes 100% Unfollower False Positives
- **Severity**: High
- **Files**: `src/App.tsx` (lines 18–26)
- **Code Trace & Reproduction**:
  1. User provides a valid following list (e.g. 50 valid handles).
  2. In the followers box, user uploads an unsupported JSON or malformed format (yielding `followersSet.size === 0`).
  3. `notFollowingBack` contains all 50 following users because none exist in the empty set.
  4. **Result**: All 50 followed users are reported as unfollowers with zero error or warning indicating that the followers list failed to parse.

---

### BUG-09: Absence of All Export Workflows (JSON, CSV, TXT, Clipboard)
- **Severity**: High
- **Files**: `src/App.tsx` (lines 136–144)
- **Observation**:
  - The app only has a single toggle button: "MOSTRA SOLO NOMI" / "CREA LINK AI PROFILI".
  - There is no option to:
    - Copy all unfollower handles to clipboard (plain or comma-separated).
    - Export results to `.json`, `.csv`, or `.txt`.
    - Batch open Instagram profile URLs.

---

### BUG-10: Stale State Desynchronization on Input Text Mutation
- **Severity**: Medium
- **Files**: `src/App.tsx` (lines 7–10, 58–71)
- **Code Trace & Reproduction**:
  1. User performs an analysis, generating 15 unfollowers in `unfollowers`.
  2. User then edits or clears the text in either `followers` or `following` textareas.
  3. `unfollowers` is not cleared or flagged as stale.
  4. **Result**: The UI displays results that do not match the current input text.

---

### BUG-11: False Metadata Claim ("SOURCE: LOCAL_STORAGE") & Zero Persistence
- **Severity**: Medium
- **Files**: `src/App.tsx` (lines 149)
- **Observed Code**:
  ```tsx
  <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 border-t border-slate-800 pt-4 font-mono gap-2">
    <div>SOURCE: LOCAL_STORAGE / REPO: GITHUB_UI</div>
    <div>SYSTEM_STATUS: {unfollowers ? 'ANALYSIS_COMPLETE' : 'READY_TO_PARSE'}</div>
  </footer>
  ```
- **Code Trace & Reproduction**:
  1. `localStorage` / `sessionStorage` is never referenced in `src/`.
  2. If the user accidental navigates, clicks a link in the same window, or refreshes, all inputs and analysis are destroyed.

---

### BUG-12: Missing Reciprocal Analysis Dimensions (Fans, Mutuals, Stats)
- **Severity**: Medium
- **Files**: `src/App.tsx` (lines 18–26)
- **Observation**:
  - Users analyzing Instagram lists need multi-directional insight:
    - **Non-reciprocal Following (Unfollowers)**: You follow them, they don't follow you (`following \ followers`).
    - **Fans (Non-reciprocal Followers)**: They follow you, you don't follow them (`followers \ following`).
    - **Mutual Friends**: Both follow each other (`followers ∩ following`).
  - Current implementation only computes the first set difference.

---

### BUG-13: Lack of Search, Filter, and Sorting in Results View
- **Severity**: Medium
- **Files**: `src/App.tsx` (lines 100–134)
- **Observation**:
  - Results are rendered in set insertion order.
  - No search input to filter specific handles.
  - No alphabetical sort (A-Z / Z-A).

---

### BUG-14: Missing Error Handling on `FileReader` & Large Payload Freezes
- **Severity**: Medium
- **Files**: `src/components/InputCard.tsx` (lines 19–25)
- **Observed Code**:
  ```typescript
  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      onChange(event.target.result as string);
    }
  };
  reader.readAsText(file);
  ```
- **Observation**:
  - `reader.onerror` is missing. Unreadable or permission-restricted files fail silently.
  - Reading very large files (e.g. 50MB) straight into React state freezes the browser.

---

### BUG-15: Permissive Username Regex Allows Invalid Instagram Handle Formats
- **Severity**: Medium
- **Files**: `src/utils.ts` (line 11)
- **Observed Code**:
  ```typescript
  const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
  ```
- **Observation**:
  - Accepts `.invalid`, `invalid.`, `in..valid`, `...`, and pure numbers `12345`.
  - Violates Instagram handle specification (no leading/trailing dots, no consecutive dots).

---

### BUG-16: Misleading `Righe: X` Line Count in Input Card
- **Severity**: Low
- **Files**: `src/components/InputCard.tsx` (lines 32, 51)
- **Observed Code**:
  ```typescript
  const lineCount = value.split('\n').filter(l => l.trim()).length;
  ```
- **Observation**:
  - Counts raw non-empty lines (dates, HTML tags, empty spaces) rather than parsed valid usernames. Shows e.g. "Righe: 400" when only 100 usernames exist.

---

### BUG-17: Blocking Native Browser `alert()` for Form Validation
- **Severity**: Low
- **Files**: `src/App.tsx` (line 14)
- **Observed Code**:
  ```typescript
  if (!followers.trim() || !following.trim()) {
    alert("Inserisci entrambe le liste (Follower e Seguiti) per continuare.");
    return;
  }
  ```
- **Observation**:
  - Synchronous native `alert()` disrupts browser flow and fails in sandboxed iframes.

---

### BUG-18: Dead Dependencies & Configuration Drift
- **Severity**: Low
- **Files**: `package.json` (lines 14, 21-23), `metadata.json` (line 5), `README.md` (line 18)
- **Observation**:
  - Unused dependencies: `@google/genai`, `express`, `@types/express`, `dotenv`, `motion`.
  - Misleading metadata asserting server-side Gemini capabilities for a pure client-side parser.

---

### BUG-19: Unencoded URI Parameters in External Instagram Profile Link
- **Severity**: Low
- **Files**: `src/App.tsx` (line 118)
- **Observed Code**:
  ```tsx
  href={`https://instagram.com/${user}`}
  ```
- **Observation**:
  - `user` is not wrapped in `encodeURIComponent()`.

---

## 3. Recommended Remediation Architecture

### 3.1 Robust Multi-Format Instagram Parser (`src/utils.ts`)
The parser should support:
1. **JSON Parser**: Recursively traverse JSON objects to extract values from `string_list_data[].value`, `relationships_following[].title`, `href`, and nested structures.
2. **HTML Parser**: Extract handles from `<a href="...instagram.com/username">` and inner text, while excluding structural markup.
3. **CSV/TSV/Delimited Parser**: Split on commas, semicolons, tabs, and multiple spaces.
4. **Handle & URL Normalizer**: Strip `@`, query strings (`?igsh=...`), and `https://instagram.com/` prefixes.
5. **Stop Words & UI Filter**: Filter out Italian and English Instagram UI action words (`segui`, `messaggio`, `rimuovi`, `followers`, `following`, `meta`, `instagram`, `active`, `verified`, `message`, `remove`) and month/date fragments (`jan`, `feb`, `ago`, `ott`, `am`, `pm`, pure numeric timestamps/years).
6. **Instagram Username Specification Compliance**: Ensure length is 1–30 chars, contains `[a-z0-9._]`, does not start or end with `.`, has no `..`, and is not purely numeric.

### 3.2 Enhanced Analysis State & Workflow Engine (`src/App.tsx`)
1. **Multi-Tab Analysis**:
   - Tab 1: **Non ti seguono** (`following \ followers`)
   - Tab 2: **Non li segui** (`followers \ following`)
   - Tab 3: **In comune** (`followers ∩ following`)
2. **Safety & Zero-Parse Guard**:
   - Verify `followersSet.size > 0` and `followingSet.size > 0`.
   - If either input yields 0 parsed handles, display a descriptive warning explaining why parsing failed instead of false-positive congratulations.
3. **Search & Sort**:
   - Real-time search filter in results.
   - Sort alphabetically (A–Z / Z–A).
4. **Export Engine**:
   - Copy to Clipboard (formatted handles).
   - Export to JSON file (`instasniff-unfollowers.json`).
   - Export to CSV file (`instasniff-unfollowers.csv`).
   - Export to TXT file (`instasniff-unfollowers.txt`).
5. **Local Persistence**:
   - Synchronize inputs and options to `localStorage` (with clear button).
6. **Stats Header**:
   - Show parsed follower count, parsed following count, non-reciprocal count, fan count, and mutual count.

---
