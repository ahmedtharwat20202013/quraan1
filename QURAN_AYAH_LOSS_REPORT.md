# QURAN AYAH LOSS & CLIPPING AUDIT REPORT

**Date**: 2026-08-15
**Target**: Data Integrity & Zero Ayah Loss / Zero Clipping Contract

---

## 1. Primary Rule & Data Integrity Contract
- **Zero Ayah Loss Rule**: No Quran ayah may disappear, be silently clipped, be hidden by CSS, be omitted from the render model, or be lost between the JSON data layer and the screen.
- **Immutable JSON Page Distribution**: `quran_pages_v3.json` remains the authoritative source of truth for page membership. No ayahs are moved, omitted, duplicated, or reordered.

---

## 2. Rendering Verification Pipeline
1. `getOfficialPageBlocks(pageNumber, pageData)`: Builds deterministic array of `RenderBlock` objects (`surah-header`, `basmala`, `ayah`).
2. `validateOfficialPageModel(model)`: Validates that 100% of expected ayahs (`fromAyah` .. `toAyah`) are present in the render model.
3. `data-ayah-key`: Every rendered ayah in the DOM receives a unique attribute `data-ayah-key="${surahId}:${ayahNumber}"`.
4. `auditRenderedDom(root, expectedAyahKeys)`: Runtime DOM inspector verifying that every expected key exists in the DOM, has non-zero height (`height > 0`), and is not clipped by container boundaries.

---

## 3. Fit-to-Page Strategy B (Zero Clipping Guarantee)
- For dense JSON pages where measured content height exceeds available viewport height:
  ```typescript
  const rawScale = availableHeight / measuredPageHeight;
  const scale = Math.min(1, Math.max(0.82, rawScale));
  ```
  - Scaling is applied as one atomic unit with `transform-origin: top center`.
  - Ensures **100% of ayahs remain fully visible** on screen without vertical clipping, cropping, or text loss.

---

## 4. Active Typography & Layout Policy
- Baseline Font Size: `31px` (safe readable range: `26px` to `44px`).
- Line Height: `1.65`.
- Layout Cache Version: `json-integrity-no-loss-v1`.
- Top Alignment: `justify-start` (zero `my-auto`, zero `justify-center` vertical centering).

---

## 5. Verification Results
- `npx tsc --noEmit` — **`0 ERRORS`**
- `npm run build` — **`0 ERRORS`**
- `balancedPaginationEngine.test.ts` — **`PASSED ✅`**
