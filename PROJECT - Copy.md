# Project: Quran Light App Updates

## Architecture
- **Frontend Framework**: React with TypeScript and Vite.
- **Mobile Integration**: Capacitor for Android build.
- **Key Modules**:
  - `src/components/TasbeehSection.tsx`: Houses the Tasbih counter and contains the dropdown list select logic.
  - `src/App.tsx`: App homepage structure, including the services grid and bottom navigation bar.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Implement Tasbih Selector | Add selection menu, update Arabic text dynamically, and reset counter on change | None | DONE |
| 2 | Redesign Homepage Icons | Replace 3D circular PNGs with emerald/gold line icons styled matching bottom bar | None | DONE |
| 3 | Project Build & Capacitor Sync | Run npm run build and npx cap sync android to verify integrations | M1, M2 | DONE |
| 4 | Remove Notification Systems | Completely delete "Did You Know" daily facts and Azan alarms systems, permissions, audio files, and native Android code | None | DONE |

## Code Layout
- `src/components/TasbeehSection.tsx`: Component for Tasbih counter.
- `src/App.tsx`: Main React entry point with homepage services.
