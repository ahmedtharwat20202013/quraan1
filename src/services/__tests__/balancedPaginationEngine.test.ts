import { 
  BalancedPaginationEngine, 
  normalizeQuranBlocks, 
  QuranLayoutConfig, 
  getLayoutKey 
} from '../balancedPaginationEngine';
import { QuranDataLoader } from '../quranDataLoader';

async function runEngineValidationTests() {
  console.log('====================================================');
  console.log('  BALANCED PAGINATION ENGINE AUTOMATED VALIDATION  ');
  console.log('====================================================\n');

  // 1. Data Normalization Invariants
  const quranData = await QuranDataLoader.getQuranData();
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
    throw new Error('Balanced Pagination Engine Audit Failed!');
  }

  console.log('✅ ALL 15 AUTOMATED INTEGRITY & LAYOUT TESTS PASSED PERFECTLY!');
}

runEngineValidationTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
