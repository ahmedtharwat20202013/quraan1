import * as fs from 'fs';
import * as path from 'path';

// Custom test runner to verify interactive features in index.html without a browser.
async function runTests() {
  console.log("=== Starting Verification Tests for index.html ===");

  const htmlPath = path.resolve('index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  // Extract head theme script
  const headScriptRegex = /<!-- Theme Loading Script \(Immediately to prevent FOUC\) -->\s*<script>([\s\S]*?)<\/script>/i;
  const headMatch = htmlContent.match(headScriptRegex);
  const headScriptText = headMatch ? headMatch[1] : '';

  // Extract script from index.html
  // Look for the script near the end of index.html
  const scriptRegex = /<!-- Script for Mockup Interactions, Theme toggling & Offline Calculations -->\s*<script>([\s\S]*?)<\/script>\s*<\/body>/i;
  const match = htmlContent.match(scriptRegex);
  if (!match) {
    throw new Error("Could not extract the interactive script from index.html");
  }
  let scriptText = headScriptText + "\n" + match[1];

  // Append exports to the script so we can access internal functions and variables
  scriptText += `
    window.nextQuranPage = nextQuranPage;
    window.prevQuranPage = prevQuranPage;
    window.updateQuranScreen = updateQuranScreen;
    window.updatePrayerCountdown = updatePrayerCountdown;
    window.resetTasbeeh = resetTasbeeh;
    window.incrementTasbeeh = incrementTasbeeh;
    window.vibrateDevice = vibrateDevice;
    window.getCurrentQuranIdx = () => currentQuranIdx;
    window.getTasbeehCount = () => tasbeehCount;
    window.getVibrateEnabled = () => vibrateEnabled;
  `;

  // Mock DOM implementation
  class MockElement {
    id: string;
    className: string;
    textContent: string = '';
    innerHTML: string = '';
    style: any = {};
    attributes: Map<string, string> = new Map();
    listeners: { [key: string]: Function[] } = {};
    childNodes: MockElement[] = [];

    constructor(id: string = '', className: string = '') {
      this.id = id;
      this.className = className;
    }

    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    }

    getAttribute(name: string): string | undefined {
      return this.attributes.get(name);
    }

    addEventListener(event: string, callback: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }

    removeEventListener(event: string, callback: Function) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    }

    dispatchEvent(event: string, data?: any) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(data));
      }
    }

    classList = {
      add: (cls: string) => {
        const classes = this.className.split(' ').filter(x => x);
        if (!classes.includes(cls)) {
          classes.push(cls);
          this.className = classes.join(' ');
        }
      },
      remove: (cls: string) => {
        const classes = this.className.split(' ').filter(x => x && x !== cls);
        this.className = classes.join(' ');
      },
      contains: (cls: string) => {
        return this.className.split(' ').includes(cls);
      }
    };

    querySelector(selector: string) {
      if (selector.startsWith('.')) {
        const cls = selector.substring(1);
        for (const child of this.childNodes) {
          if (child.className.includes(cls)) return child;
        }
      }
      return null;
    }

    getBoundingClientRect() {
      // Mock bounding rect centered at (100, 100) with size 200x200
      return {
        left: 0,
        top: 0,
        width: 200,
        height: 200,
        right: 200,
        bottom: 200,
        x: 0,
        y: 0
      };
    }
  }

  const elements: { [key: string]: MockElement } = {};

  // Initialize specific elements used in the script
  const elementIds = [
    'theme-toggle', 'sun-icon', 'moon-icon', 'device-time',
    'mock-screen-quran', 'mock-screen-prayer', 'mock-screen-qibla', 'mock-screen-tasbih',
    'quran-surah-title', 'quran-surah-text', 'quran-page-num',
    'next-prayer-name', 'prayer-countdown',
    'prayer-fajr', 'prayer-dhuhr', 'prayer-asr', 'prayer-maghrib', 'prayer-isha',
    'qibla-container', 'compass-wheel', 'qibla-text',
    'tasbeeh-dhikr-select', 'tasbeeh-count'
  ];

  elementIds.forEach(id => {
    elements[id] = new MockElement(id);
  });

  // Setup subelements
  const bellButtons: { [key: string]: MockElement } = {};
  ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
    const parent = elements[`prayer-${p}`];
    const bellBtn = new MockElement('', 'prayer-bell-btn');
    parent.childNodes.push(bellBtn);
    bellButtons[p] = bellBtn;
  });

  // Mock phone device element
  const phoneDevice = new MockElement('', 'phone-device');
  elements['phone-device'] = phoneDevice;

  // Mock localStorage
  const localStorageStore: { [key: string]: string } = {};
  const mockLocalStorage = {
    getItem: (key: string) => localStorageStore[key] || null,
    setItem: (key: string, val: string) => { localStorageStore[key] = val; },
  };

  // Mock document
  const mockDocument = {
    getElementById: (id: string) => {
      if (elements[id]) return elements[id];
      if (id === 'phone-device' || id === 'mock-screen-tasbih') return elements[id];
      elements[id] = new MockElement(id);
      return elements[id];
    },
    querySelectorAll: (selector: string) => {
      if (selector === '.mockup-tab-btn') {
        return [
          new MockElement('', 'mockup-tab-btn active'),
          new MockElement('', 'mockup-tab-btn'),
          new MockElement('', 'mockup-tab-btn'),
          new MockElement('', 'mockup-tab-btn'),
        ];
      }
      if (selector === '.screen-content') {
        return [
          elements['mock-screen-quran'],
          elements['mock-screen-prayer'],
          elements['mock-screen-qibla'],
          elements['mock-screen-tasbih']
        ];
      }
      return [];
    },
    querySelector: (selector: string) => {
      if (selector === '.phone-device') return phoneDevice;
      if (selector === '.tasbeeh-btn-small') return new MockElement('', 'tasbeeh-btn-small');
      return null;
    },
    body: new MockElement('body', ''),
    documentElement: new MockElement('html', '')
  };

  // Mock Date control
  let mockHours = 12;
  let mockMinutes = 0;
  let mockSeconds = 0;

  class MockDate {
    constructor() {}
    getHours() { return mockHours; }
    getMinutes() { return mockMinutes; }
    getSeconds() { return mockSeconds; }
  }

  // Mock window
  const mockWindow: any = {
    matchMedia: (query: string) => {
      return { matches: false };
    },
    localStorage: mockLocalStorage,
    setInterval: (cb: Function, interval: number) => {
      return 123;
    }
  };

  // Setup timeout interceptor
  const deferredTimeouts: { cb: Function; ms: number }[] = [];

  // Build the script sandbox context
  const sandbox: any = {
    document: mockDocument,
    window: mockWindow,
    localStorage: mockLocalStorage,
    Date: MockDate,
    setInterval: mockWindow.setInterval,
    setTimeout: (cb: Function, ms: number) => {
      if (ms > 100) {
        deferredTimeouts.push({ cb, ms });
      } else {
        cb();
      }
    },
    console: console,
    Math: Math,
    event: null // to simulate Firefox behavior
  };

  // Run the script in the sandbox
  const runInSandbox = (code: string, context: any) => {
    const keys = Object.keys(context);
    const vals = keys.map(k => context[k]);
    const runner = new Function(...keys, code);
    runner(...vals);
  };

  runInSandbox(scriptText, sandbox);

  // Assertions and Tests
  const report: string[] = [];

  // ==========================================
  // Test 1: Quran Navigation
  // ==========================================
  report.push("### Test 1: Quran Navigation Functionality");
  try {
    const titleEl = elements['quran-surah-title'];
    const textEl = elements['quran-surah-text'];
    const pageNumEl = elements['quran-page-num'];

    // Initialize HTML fields by calling updateQuranScreen
    mockWindow.updateQuranScreen();

    // Initial state check
    if (((titleEl as any).innerHTML !== "سُورَةُ الإِخْلَاصِ")) {
      throw new Error(`Expected initial surah to be سُورَةُ الإِخْلَاصِ, got ${titleEl.innerHTML}`);
    }
    report.push("   ✓ Initial surah is correct: سُورَةُ الإِخْلَاصِ");

    // Call next page
    mockWindow.nextQuranPage();
    if (((titleEl as any).innerHTML !== "سُورَةُ النَّاسِ")) {
      throw new Error(`Expected next surah to be سُورَةُ النَّاسِ, got ${titleEl.innerHTML}`);
    }
    report.push("   ✓ Next page navigation switches to: سُورَةُ النَّاسِ");

    // Call next page again
    mockWindow.nextQuranPage();
    if (((titleEl as any).innerHTML !== "سُورَةُ الفَلَقِ")) {
      throw new Error(`Expected third surah to be سُورَةُ الفَلَقِ, got ${titleEl.innerHTML}`);
    }
    report.push("   ✓ Next page navigation switches to: سُورَةُ الفَلَقِ");

    // Call next page wraps around
    mockWindow.nextQuranPage();
    if (((titleEl as any).innerHTML !== "سُورَةُ الإِخْلَاصِ")) {
      throw new Error(`Expected wrap around to be سُورَةُ الإِخْلَاصِ, got ${titleEl.innerHTML}`);
    }
    report.push("   ✓ Next page navigation wraps around correctly to index 0");

    // Call prev page wraps around
    mockWindow.prevQuranPage();
    if (((titleEl as any).innerHTML !== "سُورَةُ الفَلَقِ")) {
      throw new Error(`Expected prev wrap around to be سُورَةُ الفَلَقِ, got ${titleEl.innerHTML}`);
    }
    report.push("   ✓ Previous page navigation wraps around correctly to index 2");

    // Verify verses count got updated
    const versesEl = elements['quran-verses-count'];
    mockWindow.nextQuranPage(); // now at index 0 (سُورَةُ الإِخْلَاصِ)
    mockWindow.nextQuranPage(); // now at index 1 (سُورَةُ النَّاسِ)
    if (versesEl.textContent !== "الآيات: ٦ آيات") {
      throw new Error(`Expected verses count to update to 'الآيات: ٦ آيات', got '${versesEl.textContent}'`);
    }
    report.push("   ✓ Quran verses count display updates correctly when changing pages.");

  } catch (err: any) {
    report.push(`   ✗ Quran Navigation Failed: ${err.message}`);
  }

  // ==========================================
  // Test 2: Prayer Times Countdown Timer
  // ==========================================
  report.push("\n### Test 2: Prayer Times Countdown Timer");
  try {
    const nameEl = elements['next-prayer-name'];
    const timerEl = elements['prayer-countdown'];

    // Scenario A: Time is 10:00 AM (Fajr 4:30 is past, next is Dhuhr 12:15)
    mockHours = 10;
    mockMinutes = 0;
    mockSeconds = 0;
    mockWindow.updatePrayerCountdown();

    if (!nameEl.textContent.includes("الظهر")) {
      throw new Error(`Expected next prayer at 10:00 AM to be Dhuhr, got: ${nameEl.textContent}`);
    }
    if (((timerEl.textContent as string) !== "02:15:00")) {
      throw new Error(`Expected countdown at 10:00 AM to Dhuhr to be 02:15:00, got: ${timerEl.textContent}`);
    }
    report.push("   ✓ Correct next prayer (Dhuhr) and countdown (02:15:00) calculated at 10:00 AM.");

    // Scenario B: Time is 11:00 PM (all prayers past, next is Fajr 4:30 next day)
    mockHours = 23;
    mockMinutes = 0;
    mockSeconds = 0;
    mockWindow.updatePrayerCountdown();

    if (!nameEl.textContent.includes("الفجر")) {
      throw new Error(`Expected next prayer at 11:00 PM to be Fajr, got: ${nameEl.textContent}`);
    }
    if (((timerEl.textContent as string) !== "05:30:00")) {
      throw new Error(`Expected countdown at 11:00 PM to Fajr to be 05:30:00, got: ${timerEl.textContent}`);
    }
    report.push("   ✓ Correct next prayer (Fajr) and countdown (05:30:00) calculated at 11:00 PM (next-day wrap around).");

  } catch (err: any) {
    report.push(`   ✗ Prayer Times Countdown Failed: ${err.message}`);
  }

  // ==========================================
  // Test 3: Compass Dial Rotation
  // ==========================================
  report.push("\n### Test 3: Compass Dial Rotation");
  try {
    const container = elements['qibla-container'];
    const compassWheel = elements['compass-wheel'];
    const qiblaText = elements['qibla-text'];

    if (!container.listeners['mousemove']) {
      throw new Error("No mousemove listener registered on qibla-container");
    }

    // Simulate mouse move at 45 degrees relative to center (100, 100)
    container.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });

    if (compassWheel.style.transform !== "rotate(45deg)") {
      throw new Error(`Expected compass rotation to be rotate(45deg) for mouse at 45 deg angle, got: ${compassWheel.style.transform}`);
    }
    report.push("   ✓ Compass rotates correctly according to cursor angle (mouse at 45° -> dial rotated 45°)");

    // Simulate mouseleave
    if (!container.listeners['mouseleave']) {
      throw new Error("No mouseleave listener registered on qibla-container");
    }
    container.dispatchEvent('mouseleave');
    if (compassWheel.style.transform !== "rotate(0deg)") {
      throw new Error(`Expected compass rotation to reset to rotate(0deg) on mouseleave, got: ${compassWheel.style.transform}`);
    }
    report.push("   ✓ Compass resets to rotate(0deg) on mouseleave");

    // Verify Qibla text uses Hindi digits on mousemove
    container.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });
    if (qiblaText.textContent !== "درجة القبلة: ٩٠°") {
      throw new Error(`Expected Qibla text to use Hindi digits on mousemove ('درجة القبلة: ٩٠°'), got: '${qiblaText.textContent}'`);
    }
    report.push("   ✓ Wording and numeral system are consistent (Hindi digits 'درجة القبلة: ٩٠°' used on hover).");

    // Verify transition style updates dynamically to prevent lag
    // On mousemove, transition should be 'none'
    if (compassWheel.style.transition !== "none") {
      throw new Error(`Expected compass transition to be 'none' during mousemove to prevent lag, got: ${compassWheel.style.transition}`);
    }
    // Simulate mouseleave
    container.dispatchEvent('mouseleave');
    // On mouseleave, transition should be 'transform 0.5s ease'
    if (compassWheel.style.transition !== "transform 0.5s ease") {
      throw new Error(`Expected compass transition to reset to 'transform 0.5s ease' on mouseleave, got: ${compassWheel.style.transition}`);
    }
    report.push("   ✓ CSS Transition is disabled during mousemove to prevent lag, and enabled on mouseleave.");

  } catch (err: any) {
    report.push(`   ✗ Compass Dial Rotation Failed: ${err.message}`);
  }

  // ==========================================
  // Test 4: Tasbeeh Counter & Vibration
  // ==========================================
  report.push("\n### Test 4: Tasbeeh Counter & Vibration");
  try {
    const countEl = elements['tasbeeh-count'];
    const screenEl = elements['mock-screen-tasbih'];

    // Reset count
    mockWindow.resetTasbeeh();
    if (countEl.textContent !== '0') {
      throw new Error(`Expected counter to be reset to 0, got: ${countEl.textContent}`);
    }
    report.push("   ✓ Tasbeeh counter successfully resets to 0.");

    // Increment count
    mockWindow.incrementTasbeeh();
    if ((countEl.textContent as string) !== "1") {
      throw new Error(`Expected count to increment to 1, got: ${countEl.textContent}`);
    }
    report.push("   ✓ Tasbeeh counter increments correctly to 1.");

    // Test cycle flash (at 33 increments)
    for (let i = 1; i < 33; i++) {
      mockWindow.incrementTasbeeh();
    }
    if ((countEl.textContent as string) !== "33") {
      throw new Error(`Expected count to reach 33, got: ${countEl.textContent}`);
    }

    // Verify phone device box shadow got updated during cycle flash (it shouldn't be cleared yet)
    if (phoneDevice.style.boxShadow !== "0 0 40px var(--color-gold-accent)") {
      throw new Error(`Expected cycle flash box shadow at 33 counts, got: ${phoneDevice.style.boxShadow}`);
    }
    report.push("   ✓ Cycle completion flash triggers and sets style successfully.");

    // Trigger deferred timeout (which clears the flash)
    if (deferredTimeouts.length === 0) {
      throw new Error("No cleanup timeout was deferred for the cycle flash");
    }
    deferredTimeouts.forEach(t => t.cb());
    if (phoneDevice.style.boxShadow !== "") {
      throw new Error(`Expected box shadow to be cleared by timeout, got: ${phoneDevice.style.boxShadow}`);
    }
    report.push("   ✓ Cycle completion flash style is cleared after timeout.");

    // Test global 'event' bug in vibrateDevice()
    // If window.event / global event is null (Firefox simulation), vibrateDevice() should now succeed without crashing.
    try {
      mockWindow.vibrateDevice();
      report.push("   ✓ vibrateDevice() executes successfully without global event (Firefox fix verified).");
    } catch (e: any) {
      throw new Error(`vibrateDevice crashed: ${e.message}`);
    }

  } catch (err: any) {
    report.push(`   ✗ Tasbeeh Counter / Vibration Test Failed: ${err.message}`);
  }

  console.log("\n=== Verification Results ===");
  console.log(report.join('\n'));
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
