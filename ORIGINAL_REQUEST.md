# Original User Request

## Initial Request — 2026-07-13T21:10:59+03:00

Extract Islamic Tasabih (praises) from the provided IslamBook URL, add a selection menu for them in the Tasbeeh interface, and redesign home services icons to match the clean vector line style of the bottom navigation bar.

Working directory: C:\Users\DrCreative xeon\Downloads\quran-light-app (4)
Integrity mode: development

## Requirements

### R1. Tasabih List Extraction & Menu Selection
- Add a dropdown/selector menu to [TasbeehSection.tsx](file:///C:/Users/DrCreative%20xeon/Downloads/quran-light-app%20(4)/src/components/TasbeehSection.tsx) that allows users to select which praise (tasbih) they want to recite.
- The list of available tasbihs should contain the items extracted from the IslamBook page:
  1. سُبْحَانَ اللَّهِ
  2. سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
  3. سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ
  4. سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ
  5. لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ
  6. سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ
  7. لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ
  8. أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ
  9. اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ
  10. سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ
- When a tasbih is selected, update the displayed Arabic text dynamically in the UI.
- Reset the active click counter to 0 whenever a different praise is selected.
- Provide a clean, beautiful interactive modal or dropdown menu styled to match the dark glassmorphism design.

### R2. Homepage Service Icons Matching Bottom Bar (Custom Gold & Emerald Line Icons)
- Modify the homepage services grid layout in [App.tsx](file:///C:/Users/DrCreative%20xeon/Downloads/quran-light-app%20(4)/src/App.tsx) to replace the 3D circular PNG image assets with clean, custom line/vector icons matching the style of the bottom navigation bar.
- The style must use custom line/vector graphics (SVGs or Lucide styled components) styled with **emerald green and gold** colors to ensure harmony with the bottom bar and the app's overall color palette.

## Acceptance Criteria

### Verification & Correctness
- [ ] Tasbeeh UI features a working dropdown list showing all 10 tasbihs.
- [ ] Selecting a tasbih updates the main counter display Arabic text instantly.
- [ ] Home services icons are custom line/vector icons styled in gold and emerald green.
- [ ] App builds successfully using `npm run build` with zero errors.
- [ ] Capacitor sync command `npx cap sync android` executes successfully.
