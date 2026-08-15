## 2026-07-15T22:52:50Z
You are worker_refine_1 of archetype teamwork_preview_worker.
Your working directory is: c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\.agents\teamwork_preview_worker_refine_1

Task:
Refactor and optimize `index.html` and `test_interactive.ts` at the workspace root to resolve all issues identified in reviews, challenges, and lint checks.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Edits for `index.html`:
1. FOUC & theme-color meta tag:
   - Move the theme loading script from the bottom of the body to the `<head>` of the page.
   - Update `enableLightTheme()` and `enableDarkTheme()` to dynamically select the `meta[name="theme-color"]` tag and set its content attribute to `#F6F8F5` and `#002210` respectively.
2. Light Theme contrast:
   - Change `--color-gold-bright` in `body.light-theme` from `#D4AF37` to `#94710B` (or another dark bronze/gold that passes WCAG AA contrast).
3. Mockup styling bleed:
   - Permanently scope the mockup components to dark theme variables by defining all theme variables (e.g. `--bg-primary`, `--color-emerald-dark`, `--color-gold-accent`, `--text-primary`, `--border-color`, `--glass-bg`, etc.) directly inside the CSS selector `.phone-device` (lines 374-385). This forces the device screen to remain dark and high-contrast in both global dark and light themes.
4. Viewport overflow:
   - In `.phone-device` styles, change `width: 320px;` to `width: 100%; max-width: 320px;` so it shrinks gracefully on small devices.
5. Mobile Navigation Menu:
   - Add a `<button class="mobile-menu-btn" aria-label="افتح القائمة" id="mobile-menu-btn">☰</button>` right before `</nav>` in the HTML.
   - In the `@media (max-width: 768px)` block, add styling for `.nav-links.mobile-active` to display as a vertical layout overlay under the header:
     ```css
     .nav-links.mobile-active {
       display: flex !important;
       flex-direction: column;
       position: absolute;
       top: 80px;
       left: 0;
       right: 0;
       background-color: var(--bg-secondary);
       border-bottom: 1px solid var(--border-color);
       padding: 20px;
       gap: 16px;
       z-index: 999;
     }
     ```
   - In JavaScript, register click event to toggle `.mobile-active` on the `.nav-links` container when `#mobile-menu-btn` is clicked. Also, ensure clicking any link in `.nav-links` removes `.mobile-active` so the menu closes on navigation.
6. Vibration button crash:
   - Update inline HTML onclick="vibrateDevice()" to onclick="vibrateDevice(this)".
   - Update JS function vibrateDevice(btn): receive the button element, use it directly (with fallback: `if (!btn) btn = document.querySelector('.tasbeeh-btn-small');`), and toggle settings without referencing global `event`.
7. Quran page verses count:
   - Add id="quran-verses-count" to the verses span (`الآيات: ٤`) in the Quran mockup layout.
   - Update updateQuranScreen() script to set the textContent of `quran-verses-count` to `الآيات: ` + quran.verses.
8. Qibla compass lag and consistent numerals:
   - Remove `transition: transform 0.1s ease;` from `.compass-wrapper` in CSS.
   - In JavaScript mousemove listener, set `compassWheel.style.transition = 'none'` before rotating.
   - In JavaScript mouseleave listener, set `compassWheel.style.transition = 'transform 0.5s ease'` before resetting to rotate(0deg).
   - Implement a Hindi digits converter helper function in JavaScript:
     ```javascript
     function toHindiDigits(num) {
       const hindiDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
       return num.toString().replace(/[0-9]/g, w => hindiDigits[+w]);
     }
     ```
     Use it on mousemove to display Hindi numerals: `qiblaText.textContent = 'درجة القبلة: ' + toHindiDigits(Math.abs(Math.round(qiblaAngle))) + '°';`
9. Accessibility enhancements:
   - Add role="tabpanel" and aria-labelledby to mock screen content panels:
     `role="tabpanel" aria-labelledby="tab-btn-quran"` (make sure buttons have corresponding ids `tab-btn-quran`, `tab-btn-prayer`, etc.).
   - Wrap Kaaba emoji `🕋` in `<span role="img" aria-label="الكعبة المشرفة">🕋</span>`.
   - Add `aria-hidden="true"` to all purely decorative SVGs.
   - Symmetrical gradient underline: change `.section-title::after` background to a centered gradient: `linear-gradient(to right, transparent, var(--color-gold-accent), transparent);`.
   - Heading structure outline: change privacy title from `<h3>` to `<h2>` and update CSS selector `.privacy h3` to `.privacy h2`. Change footer headings from `<h4>` to `<h3>` and update CSS selector `.footer-brand h4` to `.footer-brand h3`.

Edits for `test_interactive.ts`:
1. Fix all TypeScript type errors and type narrowing errors so the file compiles under `npm run lint` (`tsc --noEmit`).
   - Cast checking variables to any or string: e.g. `((titleEl as any).innerHTML !== "سُورَة...")` or `((timerEl.textContent as string) !== "05:30:00")`.
   - Change `countEl.textContent !== 1` to `(countEl.textContent as string) !== "1"`.

Verification:
- Run `npm run lint` to verify that there are no TypeScript errors.
- Run `npm run build` to verify the project builds cleanly.
- Write handoff.md once both files compile and run error-free. Notify parent orchestrator (conversation ID f7e57b5e-609f-46c9-8768-39928bbe81e7) via send_message when complete.
