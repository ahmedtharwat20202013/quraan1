# RECOVERY AUDIT REPORT (Rule Zero)

**Date**: 2026-08-15
**Project**: Quran Light App (Capacitor + React + TypeScript + Vite)
**Scope**: Complete System Recovery, Baseline Stabilization & Data Integrity Resolution

---

## 1. Current Git Status & Recent Commit History
- Git Working Tree: Clean tracking directory with latest auto-commits.
- Recent Commits:
  - `c888486` Auto update 2026-08-15 22:13:15
  - `d31c5a8` Auto update 2026-08-15 22:12:58
  - `99c4ccd` Auto update 2026-08-15 22:12:27
  - `9720105` Auto update 2026-08-15 22:10:11

---

## 2. Modified Files & Impacted Areas
- [`src/components/SurahReader.tsx`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/components/SurahReader.tsx): Primary reader component handling viewport layout, font sizes, data integrity validation, header/Basmala rendering, and DOM key tags.
- [`src/services/quranDataLoader.ts`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/services/quranDataLoader.ts): Canonical data loader reading `quran_pages_v3.json` and `quran.json`.
- [`src/services/balancedPaginationEngine.ts`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/services/balancedPaginationEngine.ts): Balanced layout engine (isolated from official mode).
- [`src/services/__tests__/balancedPaginationEngine.test.ts`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/services/__tests__/balancedPaginationEngine.test.ts): Automated integrity test suite (15 validation checks).
- [`src/index.css`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/index.css): Global styles and `@font-face` definitions for `Tehaf` (`TEHAFSProTharwatEmara-Regular.ttf`) and `AmiriQuran`.

---

## 3. Current Build Scripts & TypeScript Configuration
- Package Manager: `npm` / `vite` v6.4.2
- TypeScript Compiler: `npx tsc --noEmit` (Strict mode, `0 ERRORS`).
- Vite Production Build Script: `npm run build` (`vite build && esbuild server.ts ...`, `0 ERRORS`).

---

## 4. Application & Server Entry Points
- Application Web Entry: [`src/main.tsx`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/main.tsx) -> [`src/App.tsx`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/App.tsx) -> [`src/components/SurahReader.tsx`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/src/components/SurahReader.tsx).
- SSR Server Entry Point: [`server.ts`](file:///c:/Users/DrCreative%20xeon/Downloads/quran-light-app%20%284%29/server.ts) compiling to `dist/server.cjs`.

---

## 5. Current Quran Data-Loading Path
1. `QuranDataLoader.getQuranData()`: Fetches raw `public/quran.json` (114 surahs, 6,236 ayahs).
2. `QuranDataLoader.getPagesV3Data()`: Fetches raw `public/quran_pages_v3.json` (604 pages mapping `fromAyah` .. `toAyah`).
3. `QuranDataLoader.getMushafPage(pageNumber)`: Combines page mapping with Quran text and returns `ProcessedPageData`.

---

## 6. Current JSON Page-Loading Path
- `public/quran_pages_v3.json` -> Target Page Number (1..604) -> `surahs` sections -> `fromAyah`/`toAyah` -> `quran.json` -> `ProcessedPageData`.

---

## 7. Current Render Path from JSON Data to DOM
1. `buildOfficialPageModel(pageNumber, pageData)`: Generates deterministic `QuranPageModel` with ordered `RenderBlock` objects (`surah-header`, `basmala`, `ayah`).
2. `validateQuranPageModel(model)`: Validates 100% ayah identity and count against JSON definitions before rendering.
3. `MushafPageContent`: React component rendering blocks with `data-ayah-key="${surahId}:${ayahNumber}"`.
4. `auditRenderedDom(root, expectedKeys)`: Runtime DOM auditor verifying non-zero bounding rectangle (`height > 0`) for every expected ayah node.

---

## 8. Locations Inserting Surah Title
- Sole Authorized Location: `SurahContentHeader` inside `MushafPageContent` rendered only when `section.startsHere === true`.
- Navigation Top Bar (`SurahTopBar`): Displays canonical app title ("المصحف الشريف") or page index context, NOT duplicate Quran body content titles.

---

## 9. Locations Inserting Basmala
- Sole Authorized Location: `BasmalaBlock` inside `MushafPageContent` rendered directly below `SurahContentHeader` when `section.startsHere === true` (excluding Surah At-Tawbah 9 and Surah Al-Fatihah 1).

---

## 10. CSS Rules & Layout Attributes
- `.reader-shell`: `width: 100%`, `height: 100dvh`, `max-height: 100dvh`, `overflow: hidden`, `display: flex`, `flex-direction: column`.
- `.quran-page-viewport`: `flex: 1 1 auto`, `min-height: 0`, `overflow: hidden`, `display: flex`, `flex-direction: column`.
- `.quran-page-content`: `width: 100%`, `min-height: 0`, `padding: 12px 14px calc(18px + env(safe-area-inset-bottom))`, `box-sizing: border-box`, `display: flex`, `flex-direction: column`, `justify-content: flex-start`, `align-items: stretch`.
- Typography: `font-size: 31px` (clamped `26px`-`44px`), `line-height: 1.65`, `font-family: "Tehaf", "TEHAFSProTharwatEmara", "AmiriQuran", serif`.
- Alignment: `justify-start` (top-aligned, zero `my-auto`, zero `justify-center` vertical centering).

---

## 11. Storage & Cache Invalidation Versioning
- Cache Version Key: `QURAN_RENDER_VERSION = 'official-json-recovery-v1'`.
- LocalStorage Keys:
  - `quran_font_size_v2`: User font size preference (clamped `26px` to `44px`, default `31px`).
  - `mushaf_theme`: Reading theme (`'paper'` | `'dark'`).
  - `quran_light_state`: User last read position `{ surahId, pageNumber }`.

---

## 12. Current Build & Runtime Diagnostics
- TypeScript Verification (`npx tsc --noEmit`): **`0 ERRORS`**
- Vite Build Compilation (`npm run build`): **`0 ERRORS`**
- Automated Integrity Test Suite (`balancedPaginationEngine.test.ts`): **`PASSED ✅`** (15 validation checks).

---

## 13. Immutable Data Source Files (Must NOT Be Modified)
- `public/quran.json`
- `public/quran_pages_v3.json`

---

## 14. Isolated & Controlled Features
- Balanced Repagination Engine (`balancedPaginationEngine.ts`): Kept 100% separate as an optional experimental feature flag, isolated from the canonical `official-json` 604-page reader path.
