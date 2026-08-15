## 2026-07-15T22:48:14+03:00

Generate a single, standalone `index.html` file directly in the workspace root (`c:\Users\DrCreative xeon\Downloads\quran-light-app (4)`) for the "Muslim Bag" (حقيبة المسلم) application, exactly matching the requirements below:

Technical & Functional Requirements:
1. Zero External Dependencies: Do not use Tailwind CDN, Bootstrap libraries, React/Vue/Angular, FontAwesome CDN, Google Fonts link (use local or web-safe fallback fonts), or any remote JS scripts. Everything (HTML, Vanilla CSS, and Vanilla JavaScript) must be fully contained within this single file.
2. Color Palette & Styling:
   - Emerald/Green: Dark Emerald (#002210), Islamic Green (#004420)
   - Gold/Accent: Gold Accent (#D4AF37), Gold Bright (#E5C76B)
   - Backgrounds: High contrast eye-safe deep dark neutrals (#090909) and clean white/light theme variants.
   - Design aesthetics: Responsive layout (desktop and mobile viewports), RTL (Arabic) default direction, automatic system theme detection (CSS media query) + manual toggle switch, elegant CSS transitions, glassmorphic panels, and smooth scroll.
3. Content & Sections (in Arabic):
   - Hero Section: App name ("حقيبة المسلم"), slogan, download buttons for Google Play (market link or store link using com.muslim.bag.app) and Android APK (relative path download).
   - Features Grid/Slider: Detail the real features extracted from the codebase:
     * مواقيت الصلاة (Prayer times: computed offline using coordinates/geolocator, showing countdowns)
     * المصحف الشريف (Holy Quran reader: offline PDF rendering of Quran text)
     * بوصلة القبلة (Qibla compass: interactive sensor fusion tracking of direction)
     * المسبحة الإلكترونية (Digital Tasbeeh: counter with dhikr selection)
     * الأذكار والأدعية (Duas: categories of morning/evening prayers)
     * المواقع القريبة (Mosques: locating local mosques offline/online)
   - App Mockup/Interactive UI: Include an interactive preview panel showing mobile screen mockups of these features. Use inline SVGs to draw modern, clean mobile screen designs matching the actual app screens (e.g. Qibla compass needle, Tasbih counter button, Prayer times ring). Allow the user to click tabs (Quran, Prayer, Qibla, Tasbih) to switch the mockups!
   - Technical Specifications & Permissions:
     * Min SDK: 24 (Android 7.0), Target SDK: 36 (Android 14+)
     * Fully offline operation
     * Local permissions table with explanations: Location (ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION) for calculations, Alerts (POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM) for prayer times, Wake lock (WAKE_LOCK, RECEIVE_BOOT_COMPLETED) for alarms persistence.
   - Privacy Policy Section: Arabic summary emphasizing absolute privacy. Explain that the app collects zero user data, uses no tracker/ads, and processes/stores everything local-only.
   - Footer: Developer contact, social links, links back to code/email.
4. SEO & Metadata:
   - Add standard metadata, Open Graph (OG:title, OG:image, etc.), Twitter Cards, and structured schema JSON-LD for a SoftwareApplication.
   - Add clean ARIA accessibility tags.

Ensure the file is saved at `c:\Users\DrCreative xeon\Downloads\quran-light-app (4)\index.html`.
When complete, notify parent orchestrator (conversation ID f7e57b5e-609f-46c9-8768-39928bbe81e7) via send_message. Do not run commands yourself; write the file and let us know.
