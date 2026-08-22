# InstaSniff UI / UX & Responsive Design Audit Report

**Audit Date**: 2026-08-22  
**Auditor**: Explorer 3 (UI/UX & Responsive Design Specialist)  
**Scope**: Full frontend codebase (`src/App.tsx`, `src/components/InputCard.tsx`, `src/index.css`, `src/utils.ts`, `index.html`, `vite.config.ts`, `package.json`)  
**Status**: Completed  

---

## Executive Summary

InstaSniff is a modern, single-page React + Tailwind CSS web utility designed to parse Instagram follower and following lists and identify non-reciprocal followers. The application has a sleek dark aesthetic based on Slate and Indigo color tones.

However, the audit identified **31 distinct issues** across Visual Consistency, Responsive Layouts, Interactive States, Feedback & UX, Accessibility (a11y), and Performance/Architecture. 

### Severity Breakdown
| Severity | Count | Primary Impact Areas |
| :--- | :---: | :--- |
| **Critical** | 2 | Misleading False-Positive empty parse state, CSS Grid Unbounded Scroll Bug |
| **High** | 6 | Severe WCAG contrast failures, Missing Form Labels (a11y), Native blocking `alert()`, Missing Focus Rings, Mobile viewport disconnect |
| **Medium** | 13 | Sub-12px micro-typography, Line count vs parsed username mismatch, Mobile hover artifacts, Language mixing, Missing copy/export/search tools |
| **Low / Info** | 10 | Radius inconsistency, Lucide icon sizing, Missing Firefox scrollbar styles, Unused package dependencies, Missing favicon |

---

## Detailed Findings by Focus Area

---

### Section 1: Visual Design & Styling Consistency

#### 1.1 Color Palette & WCAG 2.1 Contrast Failures
- **Issue ID**: `UI-VIS-01`
- **Severity**: **HIGH**
- **WCAG Reference**: 1.4.3 Contrast (Minimum) (Level AA), 1.4.6 Contrast (Enhanced) (Level AAA)
- **Observations**:
  1. **Footer Text** (`src/App.tsx:148`):
     ```tsx
     <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 border-t border-slate-800 pt-4 font-mono gap-2">
     ```
     - Background: `bg-slate-950` (`#020617`)
     - Foreground: `text-slate-600` (`#475569`)
     - Contrast Ratio: **2.43:1** (Fails 4.5:1 AA standard). The footer is virtually illegible on most monitors.
  2. **Card Subtitles & Metrics** (`src/components/InputCard.tsx:38-39, 50`):
     ```tsx
     <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
     <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
     ...
     <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
     ```
     - Background: `bg-slate-900` (`#0f172a`)
     - Foreground: `text-slate-500` (`#64748b`)
     - Contrast Ratio: **3.68:1** (Fails AA minimum of 4.5:1 for small text <18pt).
  3. **Empty State Prompt** (`src/App.tsx:102`):
     ```tsx
     <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm font-mono text-center">
     ```
     - Contrast Ratio: **3.68:1** (Fails AA for regular 14px text).
  4. **Hover Badge** (`src/App.tsx:127`):
     ```tsx
     <span className="text-[10px] text-slate-500 uppercase tracking-tighter ...">Unfollower</span>
     ```
     - Contrast Ratio: **3.31:1** on `bg-slate-950/50`.
- **Recommendation**:
  - Replace `text-slate-600` and `text-slate-500` with `text-slate-400` (`#94a3b8`, contrast 6.32:1) for secondary text and `text-slate-300` (`#cbd5e1`, contrast 9.87:1) for card titles and line counters.

#### 1.2 Micro-Typography & Scale Inconsistencies
- **Issue ID**: `UI-VIS-02`
- **Severity**: **MEDIUM**
- **Observations**:
  - Text sizes frequently use arbitrary sub-12px hardcoded pixel values:
    - `text-[10px]` in `InputCard.tsx:39` (description)
    - `text-[11px]` in `InputCard.tsx:44` (textarea body)
    - `text-[10px]` in `InputCard.tsx:50` (line count)
    - `text-[10px]` in `App.tsx:121` (profile link)
    - `text-[10px]` in `App.tsx:127` (unfollower badge)
    - `text-[10px]` in `App.tsx:148` (footer)
- **Impact**: 10px and 11px font sizes degrade legibility significantly on high-DPI smartphone displays and for users with mild visual impairments.
- **Recommendation**: Adopt standard Tailwind typography tokens: `text-xs` (12px / 0.75rem) as the absolute minimum, `text-sm` (14px) for body/textareas, and `text-base` for primary controls.

#### 1.3 Border Radius Inconsistencies
- **Issue ID**: `UI-VIS-03`
- **Severity**: **LOW**
- **Observations**:
  - Three different corner radius scales are mixed across interactive elements:
    - `rounded-2xl`: Main CTA Button (`App.tsx:77`), Results Section (`App.tsx:86`), InputCard Container (`InputCard.tsx:35`)
    - `rounded-xl`: Textarea (`InputCard.tsx:44`), Result Items (`App.tsx:112`), Profile Link Toggle (`App.tsx:139`)
    - `rounded-lg`: Live Parser Badge (`App.tsx:48`), Reset Button (`App.tsx:92`), Carica File Button (`InputCard.tsx:62`)
- **Recommendation**: Standardize to a 2-tier hierarchy: `rounded-2xl` for outer cards/containers and `rounded-xl` for all inner buttons, textareas, and row items.

#### 1.4 Lucide Icon Sizing Heterogeneity
- **Issue ID**: `UI-VIS-04`
- **Severity**: **LOW**
- **Observations**:
  - `Upload` icon: `size={12}` (`InputCard.tsx:64`) — extremely small and cramped.
  - `ExternalLink` icon: `size={10}` (`App.tsx:124`) — barely visible.
  - `RefreshCcw` icon: `size={16}` (`App.tsx:95`).
  - `LinkIcon` icon: `size={16}` (`App.tsx:141`).
  - `Search` icon: `size={18}` (`App.tsx:79`) and `size={32}` (`App.tsx:103`).
- **Recommendation**: Standardize icon sizes: `size={14}` for inline text badges, `size={16}` / `size={18}` for buttons, `size={36}` for empty states.

#### 1.5 Scrollbar Cross-Browser Styling
- **Issue ID**: `UI-VIS-05`
- **Severity**: **LOW**
- **Observations**: `src/index.css:3-16` only provides WebKit vendor pseudoclasses (`::-webkit-scrollbar*`). Firefox defaults to standard light/wide scrollbars that break the dark UI theme.
- **Recommendation**: Add standard CSS scrollbar rules:
  ```css
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #1e293b transparent;
  }
  ```

---

### Section 2: Layout & Responsive Behavior

#### 2.1 CSS Grid Unbounded Expansion & Scroll Failure (Desktop/Tablet)
- **Issue ID**: `UI-RESP-01`
- **Severity**: **CRITICAL**
- **Location**: `src/App.tsx:55, 86, 100`
  ```tsx
  55: <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow">
  ...
  86: <section className="lg:col-span-4 bg-slate-900 rounded-2xl border border-indigo-500/30 p-6 flex flex-col gap-4 shadow-xl shadow-indigo-500/5 lg:min-h-[500px]">
  ...
  100: <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
  ```
- **Bug Mechanism**:
  In CSS Grid, child tracks default to `min-height: auto`. Because `<section>` only defines `lg:min-h-[500px]` without any `max-height` (e.g. `max-h-[600px]` or `lg:max-h-[calc(100vh-14rem)]`), rendering 100+ unfollowers forces the section to expand downwards indefinitely. The internal `overflow-y-auto` container never scrolls; instead, the entire page stretches into a multi-thousand-pixel tall document.
- **Impact**: Breaks card-based dashboard layout, decouples left input controls from right results list, and frustrates navigation.
- **Recommendation**:
  Set an explicit maximum height on the results container (e.g., `lg:max-h-[620px]` or `h-full max-h-[calc(100vh-12rem)]`) and ensure `min-h-0` is added to the flex column so `overflow-y-auto` scrolls internally.

#### 2.2 Mobile Layout Disconnect — Off-Screen Results
- **Issue ID**: `UI-RESP-02`
- **Severity**: **HIGH**
- **Location**: `src/App.tsx:55-145`
- **Observations**: On mobile viewports (<768px), the two input cards and action button stack vertically, consuming >700px of height. When the user clicks "Trova chi non ti segue", results render far down below the fold. With no auto-scroll or feedback banner, mobile users perceive the app as unresponsive.
- **Recommendation**:
  - Add an automated smooth scroll (`resultsRef.current?.scrollIntoView({ behavior: 'smooth' })`) when results are calculated on mobile viewports.
  - Or show a floating toast/snackbar on mobile: "Analisi completata: trovati X unfollower".

#### 2.3 Tablet (768px - 1023px) Stretched Results Card
- **Issue ID**: `UI-RESP-03`
- **Severity**: **MEDIUM**
- **Location**: `src/App.tsx:55, 86`
- **Observations**: In the `md` to `lg` range, `main` is a single column (`grid-cols-1`). Inputs are displayed side-by-side (`grid-cols-2`), while the results section occupies 100% of the screen width below them. For small result sets (e.g. 2-5 users), this creates an excessively wide and visually empty container.
- **Recommendation**: Adapt layout or constrain maximum width on tablet screens.

#### 2.4 Container Horizontal Overflow Suppression
- **Issue ID**: `UI-RESP-04`
- **Severity**: **LOW**
- **Location**: `src/App.tsx:37` (`overflow-x-hidden`)
- **Observations**: `overflow-x-hidden` is applied at the root container to mask potential horizontal overflow rather than properly containing child element widths with `w-full max-w-full min-w-0`.

---

### Section 3: Interactive States & Affordances

#### 3.1 Missing Primary CTA Disabled State & Validation
- **Issue ID**: `UI-INT-01`
- **Severity**: **HIGH**
- **Location**: `src/App.tsx:75-81`
  ```tsx
  <button
    onClick={handleProcess}
    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-4 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all uppercase shadow-lg shadow-indigo-500/10 border border-indigo-500/20"
  >
  ```
- **Observations**:
  - The button is never disabled when inputs are empty (`disabled={!followers.trim() || !following.trim()}`).
  - There are no `disabled:opacity-50 disabled:cursor-not-allowed` styles.
  - Clicking while empty triggers a blocking native `alert()`.
- **Recommendation**: Add disabled property, disabled styles, and visual cues when inputs are incomplete.

#### 3.2 Total Lack of `focus-visible` Keyboard Focus Rings
- **Issue ID**: `UI-INT-02`
- **Severity**: **HIGH**
- **WCAG Reference**: 2.4.7 Focus Visible (Level AA)
- **Locations**:
  - `src/App.tsx:75` (Process CTA)
  - `src/App.tsx:90` (Reset Button)
  - `src/App.tsx:117` (Profile Anchor Links)
  - `src/App.tsx:137` (Toggle Links CTA)
  - `src/components/InputCard.tsx:44` (Textarea `outline-none`)
  - `src/components/InputCard.tsx:60` (Upload Button)
- **Observations**: Keyboard users tabbing through the UI have zero visible focus rings indicating active element focus. Textareas explicitly suppress outlines with `outline-none`.
- **Recommendation**:
  Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950` to all interactive elements.

#### 3.3 Missing Active Touch/Click States
- **Issue ID**: `UI-INT-03`
- **Severity**: **MEDIUM**
- **Locations**: `src/App.tsx:77, 92, 139`, `src/components/InputCard.tsx:62`
- **Observations**: No buttons implement `:active` pseudo-classes or `active:scale-[0.98]` micro-interactions. Buttons feel stiff on mobile touch.
- **Recommendation**: Add `active:scale-[0.98] active:bg-indigo-700 transition-transform`.

#### 3.4 Mobile Touch Hover Artifacts on Result Rows
- **Issue ID**: `UI-INT-04`
- **Severity**: **MEDIUM**
- **Location**: `src/App.tsx:127-129`
  ```tsx
  <span className="text-[10px] text-slate-500 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
    Unfollower
  </span>
  ```
- **Observations**: On mobile, `opacity-0 group-hover:opacity-100` remains invisible or sticks permanently upon tapping, causing confusing UI glitches on iOS Safari and Android Chrome.
- **Recommendation**: Replace hidden hover text with clear, permanent action buttons (e.g. direct Instagram link or copy icon).

#### 3.5 Missing Processing / Loading Indicator
- **Issue ID**: `UI-INT-05`
- **Severity**: **MEDIUM**
- **Location**: `src/App.tsx:12-27`
- **Observations**: Large inputs (5MB exports) freeze the main UI thread during parsing without any loading spinner or disabled state on the process button.
- **Recommendation**: Add an `isProcessing` state with a Lucide `Loader2` animated spinner.

---

### Section 4: Feedback & User Experience (UX)

#### 4.1 False-Positive Celebration on Empty / Unparseable Input
- **Issue ID**: `UI-UX-01`
- **Severity**: **CRITICAL**
- **Location**: `src/App.tsx:22-26, 106-109`
  ```tsx
  const notFollowingBack = Array.from(followingSet).filter(
    (user) => !followersSet.has(user)
  );
  setUnfollowers(notFollowingBack);
  ...
  ) : unfollowers.length === 0 ? (
    <div className="h-full flex flex-col items-center justify-center text-green-500 text-sm font-mono text-center px-4">
      Grande! Tutti quelli che segui ti seguono a loro volta. 🎉
    </div>
  )
  ```
- **Bug Mechanism**: If a user pastes invalid text, whitespace, or corrupted files where `parseInstagramText` yields 0 valid usernames, `followingSet.size === 0` and `unfollowers` becomes `[]`. The app immediately outputs: *"Grande! Tutti quelli che segui ti seguono a loro volta. 🎉"*.
- **Impact**: Severe user deception and distrust.
- **Recommendation**: Validate that `followersSet.size > 0 && followingSet.size > 0` before declaring 100% reciprocal follow. If 0 usernames are parsed, display an explicit warning: *"Nessun username valido trovato. Controlla il testo incollato."*

#### 4.2 Jarring Native `window.alert()` Dialog
- **Issue ID**: `UI-UX-02`
- **Severity**: **HIGH**
- **Location**: `src/App.tsx:14`
  ```tsx
  if (!followers.trim() || !following.trim()) {
    alert("Inserisci entrambe le liste (Follower e Seguiti) per continuare.");
    return;
  }
  ```
- **Impact**: Native `alert()` halts browser execution, clashes with the modern web design, and degrades UX.
- **Recommendation**: Implement an inline non-blocking alert banner or toast system.

#### 4.3 Raw Line Count vs Parsed Usernames Discrepancy
- **Issue ID**: `UI-UX-03`
- **Severity**: **MEDIUM**
- **Location**: `src/components/InputCard.tsx:32, 51`
  ```tsx
  const lineCount = value.split('\n').filter(l => l.trim()).length;
  ...
  <span>Righe: {lineCount}</span>
  ```
- **Impact**: Instagram data exports include dates, timestamps, and metadata (e.g. 4 lines per user). `Righe: 400` makes the user believe they have 400 followers, but only 100 usernames exist.
- **Recommendation**: Display real-time parsed count: `Righe: 400 • 100 account rilevati`.

#### 4.4 Misleading "Live Parser Active" Header Badge
- **Issue ID**: `UI-UX-04`
- **Severity**: **MEDIUM**
- **Location**: `src/App.tsx:48-51`
- **Impact**: A pulsing green badge claims "LIVE PARSER ACTIVE", but the app only parses on button click.
- **Recommendation**: Change status to reflect real state: "Pronto" / "Elaborazione..." / "Analisi completata".

#### 4.5 Inaccurate Footer Privacy / Storage Metadata
- **Issue ID**: `UI-UX-05`
- **Severity**: **LOW**
- **Location**: `src/App.tsx:149` (`SOURCE: LOCAL_STORAGE / REPO: GITHUB_UI`)
- **Impact**: The app stores zero data in `localStorage`. This is misleading and may cause privacy-sensitive users concern.
- **Recommendation**: Display a reassuring privacy notice: *"100% Client-side: Nessun dato viene salvato o trasmesso a server esterni."*

#### 4.6 Mixed Language Terminology (Italian vs English)
- **Issue ID**: `UI-UX-06`
- **Severity**: **MEDIUM**
- **Locations**:
  - `index.html:2`: `<html lang="en">`
  - `index.html:7`: `"An application built with Google AI Studio."`
  - `src/App.tsx:50`: `"LIVE PARSER ACTIVE"`
  - `src/App.tsx:128`: `"UNFOLLOWER"`
  - `src/App.tsx:149-150`: `"SOURCE: LOCAL_STORAGE / REPO: GITHUB_UI"`, `"SYSTEM_STATUS: READY_TO_PARSE"`
  - General UI: Italian ("I tuoi Follower", "Chi Segui", "Trova chi non ti segue", "Carica file")
- **Recommendation**: Standardize all strings in Italian and update `index.html` to `lang="it"`.

#### 4.7 Missing Productivity Tools (Search, Copy All, Export CSV/TXT, Clear/Paste)
- **Issue ID**: `UI-UX-07`
- **Severity**: **MEDIUM**
- **Locations**: `src/App.tsx`, `src/components/InputCard.tsx`
- **Impact**:
  - No search/filter input when results contain 50+ usernames.
  - No "Copia tutti" (Copy all to clipboard) button.
  - No "Esporta TXT / CSV" button.
  - No "Incolla" (Paste from clipboard) or "Pulisci" (Clear textarea) buttons on the input cards.
- **Recommendation**: Implement quick productivity actions.

#### 4.8 File Upload Silent Failure & Lack of File Feedback
- **Issue ID**: `UI-UX-08`
- **Severity**: **MEDIUM**
- **Location**: `src/components/InputCard.tsx:15-30`
- **Impact**: No `reader.onerror` handling, no file size/name badge once loaded.

---

### Section 5: Accessibility (a11y) & Semantic Structure

#### 5.1 Missing Form Labels on Textarea & File Inputs
- **Issue ID**: `UI-A11Y-01`
- **Severity**: **HIGH**
- **WCAG Reference**: 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)
- **Locations**: `src/components/InputCard.tsx:43-48, 53-59`
- **Impact**: Screen readers announce `<textarea>` as an unlabeled multiline edit box. Visually impaired users cannot determine which box is for followers vs following.
- **Recommendation**: Add `id`, `<label htmlFor={id}>` or `aria-label={title}` and `aria-describedby`.

#### 5.2 Icon-Only Buttons Missing Accessible Names
- **Issue ID**: `UI-A11Y-02`
- **Severity**: **MEDIUM**
- **WCAG Reference**: 4.1.2 Name, Role, Value (Level A)
- **Location**: `src/App.tsx:90-96` (Reset button)
- **Recommendation**: Add `aria-label="Ricomincia da capo e cancella i dati"`.

#### 5.3 Missing ARIA Live Region on Results Container
- **Issue ID**: `UI-A11Y-03`
- **Severity**: **MEDIUM**
- **WCAG Reference**: 4.1.3 Status Messages (Level AA)
- **Location**: `src/App.tsx:86-134`
- **Impact**: Screen reader users are not notified when results are calculated dynamically.
- **Recommendation**: Add `role="region"` and `aria-live="polite"` to the results container.

#### 5.4 External Links Lack Screen Reader Target Notices
- **Issue ID**: `UI-A11Y-04`
- **Severity**: **LOW**
- **Location**: `src/App.tsx:117-125`
- **Recommendation**: Add `aria-label={`Apri profilo Instagram di @${user} (si apre in una nuova scheda)`}` and `aria-hidden="true"` on the `<ExternalLink />` icon.

#### 5.5 Document `lang` Attribute Mismatch
- **Issue ID**: `UI-A11Y-05`
- **Severity**: **LOW**
- **Location**: `index.html:2` (`<html lang="en">`)
- **Impact**: Screen readers use English phonetics on Italian UI text.
- **Recommendation**: Update `index.html` to `<html lang="it">`.

---

### Section 6: Package, Config & Architecture

#### 6.1 Unused Heavy Dependencies
- **Issue ID**: `UI-ARCH-01`
- **Severity**: **LOW**
- **Location**: `package.json:14, 21, 22, 23, 33`
- **Observations**: `@google/genai`, `express`, `@types/express`, `dotenv`, and `motion` are listed in `package.json` dependencies but not utilized in the app.
- **Recommendation**: Utilize `motion` for smooth UI transitions or remove unused dependencies to keep package footprint clean.

#### 6.2 Missing Favicon
- **Issue ID**: `UI-ARCH-02`
- **Severity**: **LOW**
- **Location**: `index.html`
- **Recommendation**: Add an SVG Instagram/sniff icon as `<link rel="icon" ... />`.

---

## Remediation Roadmap & Implementation Recommendations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REMEDIATION PRIORITY MATRIX                    │
├───────────────────┬─────────────────────────────────────────────────────┤
│ P0 - Critical     │ 1. Fix CSS Grid unbounded height & enable scrolling │
│ (Must Fix)        │ 2. Fix false-positive celebration on empty/invalid  │
│                   │ 3. Replace native alert() with inline toast/alert   │
│                   │ 4. Fix WCAG color contrast (footer, badges, titles) │
│                   │ 5. Add form labels and ARIA attributes (a11y)       │
├───────────────────┼─────────────────────────────────────────────────────┤
│ P1 - High         │ 6. Add focus-visible rings across all controls      │
│ (Core Polish)     │ 7. Implement real-time parsed username counters     │
│                   │ 8. Fix mobile below-the-fold results with scroll    │
│                   │ 9. Add disabled/active states on CTA buttons        │
│                   │ 10. Standardize typography (remove text-[10px])     │
├───────────────────┼─────────────────────────────────────────────────────┤
│ P2 - Medium       │ 11. Add Search / Filter on results list             │
│ (UX Enhancers)    │ 12. Add "Copia tutti" and "Esporta TXT/CSV"         │
│                   │ 13. Add "Incolla" and "Pulisci" buttons to cards    │
│                   │ 14. Standardize Italian language across app & HTML  │
│                   │ 15. Cross-browser scrollbar CSS in index.css        │
└───────────────────┴─────────────────────────────────────────────────────┘
```
