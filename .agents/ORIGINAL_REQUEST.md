# Original User Request

## 2026-07-15T19:45:03Z

Create a single-file professional presentation website (`index.html`) for the "Muslim Bag" (حقيبة المسلم) application based on an in-depth analysis of the current project codebase.

Working directory: C:\Users\DrCreative xeon\Downloads\quran-light-app (4)
Integrity mode: demo

## Requirements

### R1. Codebase Analysis & Data Extraction
- Perform a thorough scan of all directories, screens, hooks, settings, translation resources, manifest configuration files, build scripts, Gradle parameters, and package dependencies in the workspace.
- Identify and document app name, package namespace, target SDK boundaries, local permissions, active services, Quran features, Azan alerts, and offline/online behaviors.
- Ensure no fictional, mock, or unconfirmed features are added.

### R2. Self-Contained Landing Page (index.html)
- Generate a single, standalone `index.html` file directly in the workspace root directory containing all structural HTML markup, styled layout system (Vanilla CSS), and client-side interactions (Vanilla JavaScript).
- Do not use Tailwind CDN, external Bootstrap libraries, React/Vue/Angular CDN, or unvetted remote scripts.
- Implement responsive layout supporting mobile/desktop viewports, native RTL (Arabic) rendering, automatic system theme matching, smooth-scroll navigations, and glassmorphic panels.
- Include download buttons for Android APK / Google Play, developer contact and social media links, and a Privacy Policy section based on the permissions used.

### R3. Visual Design & Asset Integration
- Mimic the app's visual design style including the exact emerald/gold theme colors, curves, shadows, gradients, and typography.
- Scan for existing app asset files (icons, backgrounds, screenshots) in folders such as `public/`, `src/assets/`, or `android/`. Embed them directly using relative links.
- For missing images/screens, reconstruct mockups dynamically using inline SVG elements modeled after the actual UI structure.

## Acceptance Criteria

### Technical Validation
- [ ] The landing page builds into a single self-contained `index.html` file inside the workspace root directory.
- [ ] No external stylesheet link or JS framework CDN is loaded.
- [ ] Open Graph metadata, Twitter Cards, SEO structured schema, and accessibility tags are present.
- [ ] System theme auto-detects dark/light modes and toggles smoothly.
- [ ] Site loads error-free on local web browser.
