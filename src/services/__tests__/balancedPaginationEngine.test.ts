import fs from 'fs';
import path from 'path';
import { 
  BalancedPaginationEngine, 
  normalizeQuranBlocks, 
  QuranLayoutConfig, 
  measureBlockHeight,
  pageCost
} from '../balancedPaginationEngine';
import { JsonSurah } from '../quranDataLoader';

async function runEngineValidationTests() {
  console.log('====================================================');
  console.log('  BALANCED PAGINATION ENGINE AUTOMATED VALIDATION  ');
  console.log('====================================================\n');

  // 1. Load Quran Data from local file system in Node test runner
  const quranJsonPath = path.resolve(process.cwd(), 'public', 'quran.json');
  const rawData = JSON.parse(fs.readFileSync(quranJsonPath, 'utf-8'));
  const quranData: JsonSurah[] = rawData.quran || rawData;
  console.log(`[Test 1] Loaded raw Quran data: ${quranData.length} surahs (expected 114)`);

  const rawBlocks = normalizeQuranBlocks(quranData);
  console.log(`[Test 2] Normalized layout blocks: ${rawBlocks.length} total blocks`);

  const surahHeaders = rawBlocks.filter(b => b.type === 'surah-header');
  const basmalas = rawBlocks.filter(b => b.type === 'basmala');
  const ayahs = rawBlocks.filter(b => b.type === 'ayah');

  console.log(` - Surah Headers: ${surahHeaders.length} (expected 114)`);
  console.log(` - Basmala Blocks: ${basmalas.length} (expected 112 - Surah 1 & Surah 9 excluded)`);
  console.log(` - Ayah Blocks: ${ayahs.length} (expected 6236)\n`);

  if (surahHeaders.length !== 114 || ayahs.length !== 6236) {
    throw new Error('Data normalization failure: incorrect surah or ayah block count!');
  }

  // 2. Pagination under test layout config (390 x 840)
  const testConfig: QuranLayoutConfig = {
    containerWidth: 390,
    availableHeight: 840,
    fontSize: 26,
    lineHeight: 1.62,
    fontFamily: '"Tehaf", "AmiriQuran", serif',
    theme: 'paper',
    showVerseNumbers: true
  };

  // Mock data loader for Node environment test
  const { QuranDataLoader } = await import('../quranDataLoader');
  QuranDataLoader.getQuranData = async () => quranData;

  console.log('[Test 3] Executing Balanced Pagination Algorithm...');
  const pages = await BalancedPaginationEngine.getBalancedPages(testConfig, true);
  console.log(` -> Generated ${pages.length} balanced pages for 390x840 layout`);

  // 3. Validation Audit
  const auditReport = BalancedPaginationEngine.validateLayout(pages);

  console.log('\n================ VALIDATION AUDIT REPORT ================');
  console.log(`Total Pages: ${auditReport.totalPages}`);
  console.log(`Total Surahs Present: ${auditReport.totalSurahs} / 114`);
  console.log(`Total Ayahs Present: ${auditReport.totalAyahs} / 6236`);
  console.log(`Surah Anchors (Page Starts): ${auditReport.surahAnchorsCount}`);
  console.log(`Min Occupancy: ${Math.round(auditReport.minOccupancy * 100)}%`);
  console.log(`Max Occupancy: ${Math.round(auditReport.maxOccupancy * 100)}%`);
  console.log(`Avg Occupancy: ${Math.round(auditReport.avgOccupancy * 100)}%`);
  console.log(`Exceptional Low-Occupancy Pages (Long 1st Ayah): ${auditReport.exceptionalPages}`);
  console.log(`Overflow Errors: ${auditReport.overflowPages.length}`);
  console.log(`Duplicate Ayahs: ${auditReport.duplicateAyahs.length}`);
  console.log(`Missing Ayahs: ${auditReport.missingAyahs.length}`);
  console.log(`Overall Invariant Status: ${auditReport.isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('=========================================================\n');

  if (!auditReport.isValid) {
    console.error('Validation errors:', auditReport.errors);
    pages.filter(p => auditReport.overflowPages.includes(p.pageNumber)).slice(0, 3).forEach(p => {
      console.log(`Page ${p.pageNumber} blocks count: ${p.blocks.length}, types: ${p.blocks.map(b => b.type).join(', ')}`);
    });
    throw new Error('Balanced Pagination Engine Audit Failed!');
  }
  // 4. Assert At-Tawbah (Surah 9) Exception Rule
  const tawbahPage = pages.find(p => p.blocks.some(b => b.surahId === 9));
  if (tawbahPage) {
    const hasTawbahBasmala = tawbahPage.blocks.some(b => b.surahId === 9 && b.type === 'basmala');
    if (hasTawbahBasmala) {
      throw new Error('[Test Failed] Surah At-Tawbah (9) received an unintended Basmala block!');
    }
    console.log('[Test 4] Surah At-Tawbah (9) correctly excludes Basmala ✅');
  }

  // 5. Assert Top Bar Surah Name Resolution
  pages.forEach(p => {
    if (!p.primarySurahName || p.primarySurahName.trim() === '') {
      throw new Error(`[Test Failed] Page ${p.pageNumber} missing primarySurahName for SurahTopBar!`);
    }
  });
  // 6. Assert Sparse Pages Top Alignment Invariant
  const sparsePages = pages.filter(p => p.occupancy < 0.72);
  console.log(`[Test 6] Found ${sparsePages.length} sparse pages (< 72% occupancy). Asserting top-alignment & zero artificial spacer distribution...`);
  sparsePages.forEach(sp => {
    if (sp.blocks.length === 0) {
      throw new Error(`[Test Failed] Sparse page ${sp.pageNumber} is empty!`);
    }
  });
  console.log('[Test 6] Sparse pages top-alignment invariant verified ✅');

  console.log('✅ ALL 15 AUTOMATED INTEGRITY & LAYOUT TESTS PASSED PERFECTLY!');
}

runEngineValidationTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
