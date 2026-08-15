# QURAN READER AUDIT REPORT (Phase 0)

**Date**: 2026-08-15
**Target**: Stabilization and Root Cause Resolution for Quran Reader

---

## 1. Current Page Data Source
- `public/quran_pages_v3.json`: Immutable JSON file mapping pages 1 to 604 to surah sections (`fromAyah` .. `toAyah`, `startsHere`, `endsHere`).
- `public/quran.json`: Canonical Quran text containing 114 surahs and 6,236 ayahs.
- `src/services/quranDataLoader.ts`: Data loader providing `QuranDataLoader.getMushafPage(pageNumber)` which reads `quran_pages_v3.json` and fetches ayahs from `quran.json`.

---

## 2. Current Page-Rendering Path
- Entry Component: `src/components/SurahReader.tsx`
- Mode: `'official'` (`'official-json'`) rendering `MushafPageContent`.
- Sub-components:
  - `SurahTopBar`: Top application bar containing navigation back button, mode switcher, title ("المصحف الشريف"), search, bookmark, and theme toggle.
  - `SurahContentHeader`: Rendered inside the Quran content region when `section.startsHere === true`.
  - `BasmalaBlock`: Rendered inside the Quran content region directly below `SurahContentHeader` when `section.startsHere === true` (except Surah At-Tawbah 9 and Surah Al-Fatihah 1).
  - `MushafPageContent`: Maps over `pageData.sections` and renders assigned ayahs in continuous text flow with gold verse end markers.

---

## 3. Current Source of Displayed Ayahs
- Read directly from `quran_pages_v3.json` section definitions: `allAyas.filter(a => a.index >= section.fromAyah && a.index <= section.toAyah)`.
- Guaranteed 100% fidelity to `quran_pages_v3.json` in official mode.

---

## 4. Current Source of Surah Names
- `section.name` from `quran_pages_v3.json` rendered inside `SurahContentHeader` (`سورة ${section.name}`) within the Quran content region.

---

## 5. Current Source of Basmala Insertion
- `BasmalaBlock` rendered when `section.startsHere === true && section.id !== 9 && section.id !== 1`.

---

## 6. CSS Rules Affecting Page Height, Overflow, Font Size, & Alignment
- `.reader-shell`: `width: 100%`, `height: 100dvh`, `max-height: 100dvh`, `overflow: hidden`, `display: flex`, `flex-direction: column`.
- `.quran-page-viewport`: `flex: 1 1 auto`, `min-height: 0`, `overflow: hidden`, `display: flex`, `flex-direction: column`.
- `.quran-page-content`: `width: 100%`, `height: 100%`, `overflow: hidden`, `display: flex`, `flex-direction: column`, `justify-content: flex-start`, `align-items: stretch`, `padding: 12px 14px calc(12px + env(safe-area-inset-bottom))`.
- Alignment: `justify-start` (top-aligned, zero vertical centering, zero `my-auto`, zero `justify-center`).
- Typography: `font-size: 31px`, `line-height: 1.65`, `font-family: "Tehaf", "AmiriQuran", "Noto Sans Arabic", serif`.

---

## 7. Storage / LocalStorage Keys
- `quran_light_state`: Stores last read position `{ surahId, pageNumber, timestamp }`.
- `mushaf_theme`: Stores active theme (`'paper'` | `'dark'`).
- `quran_font_size_v2`: Stores user font size preference (clamped between `26px` and `44px`, default `31px`).
- `quran_layout_version`: Keyed to `official-json-render-v1`.

---

## 8. Duplicated Rendering Paths
- `MushafPageContent` (for official 604 mode).
- `BalancedPageContent` (for optional balanced mode, disabled by feature flag in official mode).

---

## 9. Observed TypeScript & Build Errors
- **`0 ERRORS`** across `npx tsc --noEmit` and `npm run build`.

---

## 10. List of Files That Must NOT Be Changed
- `public/quran.json`
- `public/quran_pages_v3.json`
- Core Capacitor / Native configuration files.
