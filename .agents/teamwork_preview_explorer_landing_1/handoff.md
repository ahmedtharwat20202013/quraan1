# Handoff Report: Muslim Bag (حقيبة المسلم) App Analysis

## 1. Observation

Direct observations and file references:
* **App Identification & Configuration**:
  * In `capacitor.config.json` (lines 2-3):
    ```json
    "appId": "com.muslim.bag.app",
    "appName": "حقيبة المسلم",
    ```
  * In `android/app/build.gradle` (line 4):
    ```groovy
    namespace = "com.muslim.bag.app"
    ```
  * In `android/app/src/main/res/values/strings.xml` (lines 3-5):
    ```xml
    <string name="app_name">حقيبة المسلم</string>
    <string name="title_activity_main">حقيبة المسلم</string>
    <string name="package_name">com.muslim.bag.app</string>
    ```
* **SDK Boundaries**:
  * In `android/variables.gradle` (lines 2-4):
    ```groovy
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 36
    ```
* **Local Permissions Used**:
  * In `android/app/src/main/AndroidManifest.xml` (lines 6-19):
    ```xml
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    <uses-permission android:name="com.android.alarm.permission.SET_ALARM" />
    ```
* **Visual & Theme Behaviors**:
  * In `src/index.css` (lines 9-14):
    ```css
    --color-islamic-dark: #002210;
    --color-islamic-green: #004420;
    --color-gold-accent: #D4AF37;
    --color-gold-bright: #E5C76B;
    --color-text-beige: #F5F5F0;
    ```
  * In `src/App.tsx` (lines 587-593):
    ```tsx
    className={cn(
      "min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl transition-colors duration-500",
      state.darkMode ? "bg-black" : "bg-neutral-950" // High contrast eye-safe deep slate-black color
    )}
    ```
* **Asset Audits**:
  * Public directory `public/` files:
    * `public/quran.pdf` (Used for rendering Holy Quran text)
    * `public/audio/alignment_soft.mp3`, `public/audio/did_you_know_soft.mp3`, `public/audio/fajr_azan.mp3`, `public/audio/other_azan.mp3`
    * `public/images/mosque_location.png`, `public/images/pocket_compass.png`, `public/images/praying_hands.png`, `public/images/tasbeeh_counter.png`
    * `public/sound/dragon-studio-pop-402324.mp3`, `public/sound/dragon-studio-simple-whoosh-382724.mp3`, `public/sound/freesound_community-ding-101492.mp3`, `public/sound/game-lose.wav`, `public/sound/game-win.wav`, `public/sound/u_edtmwfwu7c-beep-329314.mp3`
  * Android resources `android/app/src/main/res/`:
    * Notification Small Icon: `drawable/ic_stat_icon_default.png`
    * Splash Screens: `drawable/splash.png` (and variants in `drawable-land-*` & `drawable-port-*`)
    * Raw Audio (in `res/raw/`): `custom_azan_ringtone.mp3`, `custom_azan_sound.mp3`, `did_you_know_sound.mp3`, `fajr_azan.mp3`, `other_azan.mp3`
    * Launcher Icons: `mipmap-*/ic_launcher.png`, `mipmap-*/ic_launcher_round.png`, `mipmap-*/ic_launcher_foreground.png`
* **Privacy Policy details**:
  * Observed in `public/privacy.html`. It guarantees absolute offline local storage and data privacy:
    * "تطبيق حقيبة المسلم لا يقوم بجمع أو تخزين أو مشاركة أي بيانات شخصية أو حساسة عنك على الإطلاق. جميع تفضيلاتك ... يتم معالجتها وحفظها محلياً بالكامل على جهازك الشخصي عبر مساحة التخزين المحلية (Local Storage)" (lines 51-52)
    * "لا يستخدم التطبيق أي خدمات تتبع أو إعلانات خارجية من أطراف ثالثة" (lines 63-64)
* **Dependencies**:
  * Extracted from `package.json` (lines 14-42):
    * `@capacitor/android`: `^8.3.4`
    * `@capacitor/app`: `^8.1.0`
    * `@capacitor/core`: `^8.3.4`
    * `@capacitor/dialog`: `^8.0.1`
    * `@capacitor/geolocation`: `^8.2.0`
    * `@capacitor/local-notifications`: `^8.2.0`
    * `@capacitor/motion`: `^8.0.0`
    * `@google/genai`: `^1.29.0`
    * `@tailwindcss/vite`: `^4.1.14`
    * `adhan`: `^4.4.4`
    * `howler`: `^2.2.4`
    * `react`: `^19.0.0`
    * `react-pdf`: `^10.4.1`
    * `react-window`: `^2.2.7`
    * `react-zoom-pan-pinch`: `^4.0.3`

---

## 2. Logic Chain

1. **AppName & Package ID**: The `appName` and `appId` were identified as `"حقيبة المسلم"` and `"com.muslim.bag.app"` respectively in `capacitor.config.json`. These are mirrored in the Android Gradle configuration (`android/app/build.gradle`) as `namespace = "com.muslim.bag.app"` and in Android resource strings (`strings.xml`). Therefore, the package namespace and target application naming are fully aligned across Capacitor and native configurations.
2. **SDK Boundaries**: `android/variables.gradle` explicitly sets `minSdkVersion = 24` and `targetSdkVersion = 36`. This confirms compatibility with Android 7.0 (API level 24) through Android 14+ (API level 36).
3. **Permissions**: The list of permissions in `AndroidManifest.xml` indicates that the app requires foreground services, boot receivers, and alarm managers to function reliably for off-line prayer alerts, as well as coarse and fine location permissions to perform local calculations.
4. **App Features & Localizations**:
   * Inspecting `src/App.tsx`, `src/components/Home.tsx`, and files inside `src/components/` showed that the application is fully in Arabic. No translation configuration libraries (e.g. `i18next`) exist; strings are directly inline.
   * Key features include the Home screen (greeting, Hijri date, bookmark continuation, daily verse), Prayer times (timetable, alarm setup, calculation method adjustment), Qibla (interactive Compass with sensor fusion and Kalman filters), Quran (surah reader rendering `quran.pdf`), Tasbeeh (tally counter with dhikr selection), Duas, Nearby Mosques, and Settings.
5. **Color/Visual Styles**: The styling in `index.css` explicitly sets colors matching the user-facing visual identity: deep Islamic dark greens (`#002210`, `#004420`) and classic gold accents (`#D4AF37`, `#E5C76B`).

---

## 3. Caveats

* **Visual Assets inspection**: We audited relative paths and files in `public/` and `android/` resources, but did not render or view the PNG/XML contents themselves to confirm their visual quality or dimensions.
* **Network & Reverse Geocoding**: The web-based geocoding fallback in `PrayerSection.tsx` calls `https://nominatim.openstreetmap.org/reverse`. Although this will fail gracefully when the user is offline (relying instead on the offline database defined in `src/services/offlineGeocoder.ts`), we did not test under active cellular data constraints.

---

## 4. Conclusion

The "Muslim Bag" (حقيبة المسلم) application is a React-Capacitor hybrid app designed to run entirely offline. It uses a high-contrast eye-safe design (dark theme with emerald and gold colors), calculates prayer times and Qibla directions locally on-device, and schedules exact alarms/notifications natively using custom alarm services. All key configurations, assets, and dependencies have been fully cataloged without modifying any source code.

---

## 5. Verification Method

To verify the findings:
1. **Dependency Installation**: Run `npm install` in the project root to ensure all dependencies resolve without conflicts.
2. **Build and Compilation**: Run `npm run build` to verify the React project compiles successfully, and then run `npx cap sync android` to sync web assets into the Android native module.
3. **Linting Check**: Run `npm run lint` (`tsc --noEmit`) to verify that the TypeScript configuration is sound.
4. **Source Code Inspection**: Directly check `capacitor.config.json`, `android/variables.gradle`, and `android/app/src/main/AndroidManifest.xml` to verify the observed values.
