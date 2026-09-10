# AGENTS.md

This file is the operational guide for AI coding agents working on **InstaSniff**. It applies to the entire repository unless a more specific `AGENTS.md` is added in a subdirectory.

## 1. Project purpose

InstaSniff is a static, browser-based Instagram relationship analyzer published with GitHub Pages at:

- `https://gernotfound.github.io/InstaSniff/`

Its primary job is to compare the accounts a user follows with the accounts that follow the user, and derive:

- accounts the user follows that do not follow back;
- followers the user does not follow back (`fans` in the current UI/domain model);
- mutual follows;
- follow-back ratio.

The app must remain useful without an Instagram login, Instagram API token, backend, database, or server-side processing.

Important semantic rule: InstaSniff knows the **current relationship state contained in the imported export**. It does **not** know that somebody historically "unfollowed" the user unless a future feature explicitly compares separate snapshots. UI copy should prefer wording such as "Non ti seguono" / "non ricambiano il follow" rather than claiming a historical unfollow event.

## 2. Technology and deployment

Core stack:

- React 19
- TypeScript with `strict` enabled
- Vite
- Tailwind CSS
- Vitest
- ESLint
- Lucide React icons
- GitHub Pages
- GitHub Actions

GitHub Pages is a project site, so Vite uses:

```ts
base: '/InstaSniff/'
```

Do not change this to `/` unless the deployment topology also changes.

The deployment workflow is `.github/workflows/deploy.yml`. It currently runs on pushes to `main` and must keep the following quality gates before deployment:

1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. GitHub Pages deployment

The workflow uses Node 24.

## 3. Repository workflow for agents

The repository owner's current preference is:

- work directly on `main`;
- do not create feature branches or pull requests unless explicitly requested;
- keep commits focused and descriptive;
- after changes, verify the latest GitHub Actions run and do not consider work complete until lint, type-check, tests, build, and deployment succeed.

Because the Pages workflow uses `cancel-in-progress: true`, rapid consecutive commits can cancel intermediate workflow runs. This is expected. What matters is that the workflow for the final commit completes successfully.

Never force-push or rewrite `main` history unless the owner explicitly asks for it.

## 4. Commands

Use these commands when validating changes locally or conceptually matching CI:

```bash
npm ci
npm run lint
npm test
npm run build
```

Useful development commands:

```bash
npm run dev
npm run preview
```

`npm run lint` also performs TypeScript type-checking. `npm run build` performs a type-check before Vite build as an additional safeguard.

## 5. Architecture overview

Important files:

- `src/App.tsx` — top-level UI state and orchestration.
- `src/utils.ts` — username validation/parsing, relationship analysis, clipboard/export helpers.
- `src/instagramZip.ts` — direct parsing and validation of Instagram/Meta ZIP exports.
- `src/processingClient.ts` — creates cancellable Web Worker jobs and isolates heavy processing from the UI thread.
- `src/processing.worker.ts` — worker-side manual parsing and ZIP processing.
- `src/components/ZipImportCard.tsx` — primary ZIP import UX.
- `src/components/InputCard.tsx` — manual JSON/HTML/CSV/TXT/paste fallback.
- `src/components/ResultsView.tsx` — result tabs, filtering, sorting, progressive rendering, copy/export.
- `src/components/StatsCard.tsx` — summary metrics.
- `src/components/ErrorBoundary.tsx` — last-resort React render failure containment.
- `src/components/PrivacyBanner.tsx` — dismissible privacy notice shown at the bottom of the page.
- `src/components/Header.tsx` / `Footer.tsx` — app framing/status.
- `src/instagramZip.test.ts` — ZIP and official-export parser tests.

Keep pure data logic outside React components whenever practical.

## 6. Critical stability invariants

Stability is a first-class requirement. Changes that make the app simpler but reintroduce browser freezes, excessive allocation, or unsafe ZIP handling are regressions.

### Heavy work must stay off the main UI thread

Manual parsing and ZIP processing use a Web Worker via `src/processingClient.ts` and `src/processing.worker.ts`.

Do not move large JSON parsing, ZIP decompression, relationship comparison, or similarly heavy operations back into React render paths or synchronous click handlers.

Do not automatically retry a failed heavy worker operation on the main thread. A worker may have failed because of memory pressure or malformed input; retrying the same work synchronously can freeze or crash the page.

Worker jobs must remain cancellable. Starting a newer import/analysis should not allow an older asynchronous result to overwrite the newer state.

### Avoid retaining duplicate large datasets

ZIP imports can contain large relationship lists. After analysis, the UI should retain only the data needed to display and export results. Do not keep unnecessary duplicate copies such as:

- raw ZIP bytes;
- decompressed raw relationship text;
- parsed follower arrays;
- newline-joined versions of the same arrays;
- analysis results;

all at the same time if they are not needed.

### Large result sets must not create an unbounded DOM

`ResultsView` uses progressive/limited rendering for large lists. Preserve this behavior or replace it with a proven virtualization strategy.

Filtering, sorting, and search must operate on the complete logical list even if only part of it is rendered. Copy/export should reflect the complete currently filtered and sorted list, not merely the rows currently mounted in the DOM.

### Avoid expensive parsing during render

Do not run `parseInstagramText()` directly during every React render or keystroke for large inputs. The manual input live-count behavior is intentionally limited/debounced.

## 7. Instagram/Meta export support

The preferred user flow is importing the `.zip` downloaded directly from Meta/Instagram.

Typical relationship files appear below a path similar to:

```text
connections/followers_and_following/
```

Relevant filenames commonly include:

```text
followers_1.json
followers_2.json
followers_3.json
...
following.json
```

The importer must:

- discover these files even when nested below an account/export root directory;
- merge multiple `followers_N` parts automatically;
- prefer JSON when JSON and HTML versions both exist;
- support HTML relationship exports as a fallback where practical;
- ignore unrelated archive content such as photos and videos;
- never require extraction of the whole archive to disk;
- never upload the archive anywhere.

Do not assume there will only ever be one follower file.

Official Meta JSON commonly contains relationship records using structures such as `string_list_data`, with fields including `value`, `href`, `timestamp`, and sometimes `title`. Extraction from official files should remain conservative: prefer known relationship fields over recursively treating arbitrary strings as usernames.

## 8. ZIP security and corruption handling

`src/instagramZip.ts` deliberately performs defensive archive validation. Preserve or strengthen these protections.

The ZIP reader must treat archive metadata as untrusted input and validate at least:

- valid EOCD/central directory structure;
- offsets and sizes staying within the physical file bounds;
- ZIP64 values when applicable;
- unsupported multi-volume/spanned archives;
- unsupported compression methods;
- encrypted entries;
- truncated local headers/data;
- declared uncompressed-size limits;
- decompressed output limits;
- CRC/integrity where implemented;
- unreasonable central-directory sizes;
- malformed official JSON/HTML files.

Never allocate memory solely based on an unchecked uncompressed size declared by a ZIP entry.

The importer should read/decompress only the relationship files it needs. Media in a full Instagram export may make the outer ZIP very large; the app should not load all archive contents into memory.

Errors should be user-readable in Italian and should fail closed rather than silently returning partial relationship data that could produce misleading results.

## 9. Username parsing rules

Instagram usernames are normalized to lowercase and validated conservatively. Current accepted syntax is based on:

- 1–30 characters;
- letters, digits, `.`, `_`;
- no leading/trailing `.`;
- no consecutive `..`;
- pure numeric tokens rejected to reduce timestamp/date false positives;
- known UI/export/date stopwords filtered.

`sanitizeUsername()` also accepts Instagram profile URLs and `@username` style input.

For official Meta export files, avoid broad heuristics. A random JSON `name`, prose string, label, date, or HTML display name must not become an account merely because it happens to match the username regex.

Manual pasted text is necessarily more heuristic; changes to that parser require regression tests for false positives as well as successful extraction.

## 10. Relationship analysis invariants

Given:

- `following`: accounts the user follows;
- `followers`: accounts following the user;

analysis is:

```text
not-following-back = following − followers
fans               = followers − following
mutuals             = following ∩ followers
```

The follow-back ratio is the percentage of followed accounts that are mutual.

Inputs should be normalized/deduplicated before or during analysis. Be careful not to let duplicate export entries inflate counts.

## 11. Privacy and trust requirements

Privacy is a core product property, not only marketing copy.

The application must not send imported follower/following data, ZIP files, usernames, or derived relationship lists to external servers unless the owner explicitly decides to change the product architecture.

Do not add without explicit approval:

- analytics that transmit imported/user data;
- third-party error reporting containing imported data;
- backend uploads;
- Instagram login flows;
- Instagram credential collection;
- remote parsing APIs;
- external AI/model calls over imported data.

Avoid logging imported usernames or raw export content to production consoles.

The current bottom privacy notice is implemented by `PrivacyBanner.tsx`. It is dismissible and remembers dismissal through local storage when available. If local storage is unavailable, the UI must still function.

The owner explicitly requested removal of these persistent header/footer slogans:

- `Dati solo locali`
- `100% Client-Side: Nessun dato o lista viene inviato a server esterni.`

Do not reintroduce those exact UI elements unless explicitly requested. Privacy information belongs in the dedicated privacy banner or other deliberate privacy UX.

The current header status is intentionally neutral (`Pronto` / `Analisi pronta`).

## 12. Manual import UX

Manual inputs are a fallback for JSON, HTML, CSV, TSV, TXT, URLs, usernames, and pasted data.

Current stability limits are intentional. For example, manual file imports have a size guard and live account counting is disabled/deferred for sufficiently large text.

When changing these limits, consider peak memory and main-thread cost before increasing them.

Clipboard access can fail due to browser permissions. Always keep ordinary textarea paste usable as a fallback.

File inputs should be reset after processing so selecting the same file again still triggers an input event.

## 13. Results UX invariants

`ResultsView` currently supports:

- tabs for non-followers/fans/mutuals;
- filtering/search;
- original, A→Z, and Z→A ordering;
- optional profile-link display;
- copy;
- TXT/CSV/JSON export;
- reset/restart.

Important rules:

- changing to a fresh analysis must reset stale tab/search/sort/export-menu state;
- copy/export must use the current filtered and sorted logical results;
- export filenames should remain understandable;
- external Instagram profile links must open safely with `noopener noreferrer`;
- empty-state copy must distinguish an actually empty relationship set from a search that returned no matches;
- export/dropdown interactions should remain keyboard accessible and closable with Escape/click outside where applicable.

## 14. Accessibility

Do not regress existing accessibility behaviors.

Preserve:

- semantic labels for file inputs and controls;
- `role="alert"`/live feedback for actionable errors where appropriate;
- correct tablist/tab/tabpanel relationships;
- visible keyboard focus;
- keyboard-operable menus/actions;
- useful `aria-label` text on icon-heavy controls;
- `prefers-reduced-motion` support;
- readable mobile layouts without horizontal page overflow.

Do not depend on color alone to communicate critical state.

## 15. Error handling

Expected bad input belongs in normal app-level error handling, not the React ErrorBoundary.

Examples of expected errors:

- wrong file type;
- empty ZIP;
- missing `followers` or `following` files;
- malformed JSON;
- corrupt/truncated ZIP;
- unsupported ZIP features;
- file too large;
- clipboard permission failure;
- zero usable usernames.

These errors should produce concise, actionable Italian messages and leave the rest of the app usable.

`ErrorBoundary` is reserved for unexpected render/runtime failures. It should offer a safe recovery/reload path and must not expose imported sensitive content in its error UI.

## 16. Testing expectations

Parser and archive changes require tests.

At minimum, maintain coverage for:

- standard `followers_1.json` extraction;
- `following.json` structures including title-based records;
- nested archive paths;
- multiple `followers_N` files merged together;
- unrelated media ignored;
- HTML fallback extraction;
- malformed JSON;
- invalid/truncated ZIPs;
- integrity/CRC failures where supported;
- valid empty lists versus corrupt data;
- duplicate usernames;
- username normalization;
- boundary/limit checks added by new code.

Tests for ZIP logic should prefer small synthetic archives so CI stays fast and deterministic.

Whenever a bug is found, add a regression test before or together with the fix when practical.

## 17. Dependency policy

Keep the dependency surface small. InstaSniff is a static utility and should not accumulate heavy libraries casually.

Before adding a package, ask:

1. Can this be done safely with browser/platform APIs?
2. Will the dependency significantly increase the JS bundle?
3. Does it introduce network calls, telemetry, dynamic remote code, or privacy concerns?
4. Is it maintained and browser-compatible?
5. Does it materially improve correctness or stability?

For archive handling in particular, a well-maintained dependency may be justified if it demonstrably improves compatibility/security, but do not add one solely for convenience without evaluating bundle and trust costs.

## 18. Browser compatibility

The app relies on modern browser capabilities including Web Workers, Blob/File APIs, typed arrays, and modern JavaScript generated by Vite.

Do not silently degrade heavy processing back onto the UI thread when a required capability is missing. Prefer a clear unsupported-browser message over freezing the page.

Whenever adding a new Web API, consider Chrome/Edge, Firefox, and Safari behavior. Feature-detect APIs that are not universally available.

## 19. Performance review checklist

Before committing a change, consider:

- Does this parse or stringify a large structure more than once?
- Does this copy a potentially large array/string unnecessarily?
- Does this allocate based on untrusted input metadata?
- Does this run in React render or on the main thread?
- Could this mount thousands of DOM nodes?
- Could two asynchronous jobs race and overwrite state?
- Are workers/files/readers terminated or released after completion/cancel?
- Could an object URL, event listener, timer, or stream leak?

For this project, correctness under a large real Instagram export matters more than micro-optimizing tiny inputs.

## 20. Security review checklist

The app consumes untrusted local files. Treat them like hostile input even though they come from a user's disk.

Check changes for:

- ZIP bomb/resource exhaustion risks;
- unchecked offsets/length arithmetic;
- path assumptions;
- malformed Unicode/filenames;
- HTML injection/XSS;
- dangerous use of `innerHTML`;
- CSV formula injection if arbitrary future fields are exported;
- URLs created from unsanitized input;
- leaking raw data into errors/logs;
- navigation/opener vulnerabilities.

React escaping should be preserved. Do not use `dangerouslySetInnerHTML` for imported Instagram HTML.

## 21. UI/product principles

The preferred UX is:

1. ZIP import is the primary, recommended path.
2. Manual import remains available as a fallback.
3. The user should not need to understand Instagram's export internals.
4. Errors should explain exactly how to request the correct Meta export when possible.
5. Successful ZIP import should automatically produce analysis rather than requiring redundant steps.
6. Privacy messaging should be clear but not repetitive or visually noisy.
7. Mobile use must remain practical.

Do not add fake loading delays. Show processing state only for real work.

## 22. README and metadata consistency

Keep `README.md`, in-app wording, package metadata, and actual architecture aligned.

There is no Gemini/AI Studio backend in the product. Do not reintroduce stale AI Studio/Gemini environment setup or metadata unless the application genuinely adopts such functionality.

If supported import formats or required browser capabilities change, update the README at the same time.

## 23. Definition of done

A change is not complete merely because the code was written. For repository modifications, an agent should normally verify all of the following:

- implementation matches the requested behavior;
- no privacy invariant was accidentally weakened;
- no heavy operation was moved to the UI thread;
- relevant regression tests exist;
- `npm run lint` passes;
- `npm test` passes;
- `npm run build` passes;
- the final GitHub Pages Actions run for `main` succeeds;
- no unintended branch/PR was created when direct-to-main work was requested.

When uncertain, prioritize data correctness, failure containment, and keeping the browser responsive over cleverness or cosmetic complexity.
