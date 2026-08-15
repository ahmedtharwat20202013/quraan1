# Project: Muslim Bag (حقيبة المسلم) Presentation Landing Page

## Architecture
- **Tech Stack**: Standalone `index.html` using native HTML5, Vanilla CSS3 (custom responsive grid, flexbox, variables, CSS animations, RTL support, dark/light theme toggle), and Vanilla JS (client-side interactive elements: toggles, scrolls, SVG generation if needed).
- **No external frameworks**: Vanilla only. No external scripts or Tailwind/Bootstrap CDN.
- **RTL Support**: Arabic (RTL) language by default with custom styling.
- **Auto Theme**: CSS `@media (prefers-color-scheme: dark)` and stateful overrides.
- **Asset integration**: Embed local resources from `public/`, `src/assets/`, or `android/` directly using relative paths in `index.html`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Codebase Exploration | Scan codebase for permissions, app settings, package details, translation, resources, and themes | None | DONE |
| 2 | Initial Landing Page Structure | Generate the base index.html with RTL, Dark Mode support, CSS variables, responsive layout and header/nav | M1 | DONE |
| 3 | Feature Content & Asset Integration | Extract exact feature details and screenshots/mockups, and populate all sections of the landing page | M2 | DONE |
| 4 | Verification & Audit | Validate HTML structure, SEO, schema, responsiveness, theme logic, and perform forensic audit verification | M3 | IN_PROGRESS (fb9ec973-62ac-421b-9c57-334c4d49cd65, 26c4e217-820c-43d4-9b91-3c5e300d50ec, d16b2020-6978-4740-96ae-f9225535e72d, a82fefb7-bb6b-4fa7-a7f3-9537f9bf8e3a) |

## Interface Contracts
- The page must compile/merge into a single self-contained `index.html` at the project root directory.

## Code Layout
- Target: `index.html` (workspace root)
- Configuration resources: `android/app/src/main/AndroidManifest.xml`, `package.json`, `capacitor.config.json`
- Component directories: `src/` (screens, hooks, translation assets)
