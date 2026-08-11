const ExcelJS = require('exceljs');
const path = require('path');

const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'test-plans',
  'PS-7853-manual-test-cases.xlsx',
);

const TICKET = {
  key: 'PS-7853',
  summary: 'Critical Illness Rate Update',
  url: 'https://plansight.atlassian.net/browse/PS-7853',
  prototypeUrl:
    'https://plansight-prototypes.vercel.app/project/critical-illness-rate-basis',
};

const TEST_CASES = [
  {
    id: 'TC-1',
    category: 'Backward Compatibility & Defaults',
    title: 'Existing CI quote unchanged after deploy',
    priority: 'Critical',
    preconditions:
      'CI quote saved before PS-7853 deploy; no rate basis field set',
    steps:
      '1. Open pre-existing CI quote\n2. Record monthly/annual totals in cost grid\n3. Re-open quote in feature/release environment\n4. Compare totals to pre-deploy values',
    expected:
      'Monthly and annual totals are identical. Missing rate basis field resolves to per-unit behavior.',
    testData: 'Any production CI quote predating the feature',
  },
  {
    id: 'TC-2',
    category: 'Backward Compatibility & Defaults',
    title: 'New CI quote defaults to Per Unit Purchased',
    priority: 'Critical',
    preconditions: 'User can create a new Critical Illness quote',
    steps:
      '1. Create new CI quote\n2. Inspect Rate Basis selector\n3. Enter rates and census without changing basis',
    expected:
      'Rate Basis defaults to Per Unit Purchased. Entry flow matches current behavior. Premium uses rate × count.',
    testData: 'New CI quote',
  },
  {
    id: 'TC-3',
    category: 'Per Unit Purchased (Default)',
    title: 'Per-unit premium math',
    priority: 'Critical',
    preconditions: 'New CI quote; Rate Basis = Per Unit Purchased',
    steps:
      '1. Set Employee benefit = $20,000\n2. Enter 30-34 EE rate = $9.00 with 4 enrolled\n3. Change benefit amount without changing rate/count',
    expected:
      'Band premium = $36.00 (9.00 × 4). Benefit amount does not scale premium in per-unit mode.',
    testData: 'EE benefit $20,000; 3034-EE rate $9.00; count 4',
  },
  {
    id: 'TC-4',
    category: 'Per Unit Purchased (Default)',
    title: 'Volume display in per-unit mode',
    priority: 'High',
    preconditions: 'Per-unit CI quote with known census and benefits',
    steps:
      '1. Review employee volume total\n2. Review family/spouse volume total\n3. Confirm volume does not affect premium',
    expected:
      'employeeVolume = total EE count × employee benefit; FS volume = total FS count × FS benefit. Volume is display-only.',
    testData: 'Quote with mixed EE/FS census',
  },
  {
    id: 'TC-5',
    category: 'Per $1,000 of Coverage',
    title: 'Acceptance-criteria worked example',
    priority: 'Critical',
    preconditions: 'New CI quote; Rate Basis = Per $1,000 of coverage',
    steps:
      '1. Set Employee benefit = $20,000\n2. Enter 30-34 EE rate = $0.75 with 4 enrolled\n3. Verify band premium',
    expected:
      'Band premium = $60.00 (20,000 ÷ 1,000 × 0.75 × 4). Grid labels show per-$1,000 units.',
    testData: 'EE benefit $20,000; 3034-EE rate $0.75; count 4',
  },
  {
    id: 'TC-6',
    category: 'Per $1,000 of Coverage',
    title: 'Family/Spouse bands use FS benefit',
    priority: 'Critical',
    preconditions: 'Per-$1,000 quote with different EE and FS benefit amounts',
    steps:
      '1. Enter rates and counts for EE and FS bands\n2. Manually verify FS band calculation',
    expected:
      'FS bands use Family/Spouse benefit, not Employee benefit, in premium formula.',
    testData: 'EE benefit $20,000; FS benefit $10,000; distinct EE/FS rates and counts',
  },
  {
    id: 'TC-7',
    category: 'Per $1,000 of Coverage',
    title: 'All 11 age bands calculate correctly',
    priority: 'High',
    preconditions: 'Per-$1,000 quote with census in multiple bands',
    steps:
      '1. Enter rates/counts for bands 24Under through 70Over (EE and FS)\n2. Verify each band premium\n3. Verify rollups to EE total, FS total, and grand total',
    expected:
      'Each band: (benefit ÷ 1,000) × rate × count. Totals roll up correctly.',
    testData: 'Census across at least 4 EE bands and 2 FS bands',
  },
  {
    id: 'TC-8',
    category: 'Per $1,000 of Coverage',
    title: 'Rate conversion round-trip',
    priority: 'High',
    preconditions: 'Converter UI available (if implemented)',
    steps:
      '1. Per-unit quote: $20,000 benefit, rate $9.00/member\n2. Convert: rate_per1000 = rate_perUnit ÷ (benefit ÷ 1,000)\n3. Enter $0.450 in per-$1,000 quote with same census',
    expected:
      'Converted rate = $0.450 per $1,000. Total premium matches per-unit quote to the cent.',
    testData: '$20,000 benefit; $9.00 per unit ↔ $0.450 per $1,000',
  },
  {
    id: 'TC-9',
    category: 'Rate Basis UI & Labeling',
    title: 'Rate Basis selector visibility and persistence',
    priority: 'High',
    preconditions: 'CI quote entry access',
    steps:
      '1. Open CI quote entry\n2. Switch Rate Basis to Per $1,000\n3. Save and re-open quote',
    expected:
      'Rate Basis selector visible. Grid headers relabel when per-$1,000 selected. Selection persists after save.',
    testData: 'New or existing CI quote',
  },
  {
    id: 'TC-10',
    category: 'Rate Basis UI & Labeling',
    title: 'Switching basis does not transform stored rates',
    priority: 'Critical',
    preconditions: 'CI quote with rates entered under Per Unit',
    steps:
      '1. Enter rates under Per Unit (e.g. $9.00)\n2. Switch Rate Basis to Per $1,000\n3. Inspect stored rate values and recalculated premium',
    expected:
      'Stored rate values unchanged. Premium recalculates because calc engine reads rates differently; rates are not auto-converted.',
    testData: 'Rate $9.00 entered under per-unit basis',
  },
  {
    id: 'TC-11',
    category: 'Rate Basis UI & Labeling',
    title: 'Presentation and print output show rate basis',
    priority: 'High',
    preconditions: 'CI quotes in both rate bases; presentation/print access',
    steps:
      '1. Generate output for per-unit CI quote\n2. Generate output for per-$1,000 CI quote\n3. Review printed rate table',
    expected:
      'Rate Basis row visible. Per-unit shows Per Unit Purchased; per-$1,000 shows Per $1,000 of coverage. Print labels match basis.',
    testData: 'One quote per rate basis',
  },
  {
    id: 'TC-12',
    category: 'Zeroing Rules',
    title: 'Enrollment Method = enrolled produces $0 premium',
    priority: 'Critical',
    preconditions: 'CI quote; Enrollment Method = enrolled (not tier)',
    steps:
      '1. Set Enrollment Method = enrolled\n2. Enter rates and census\n3. Repeat in both per-unit and per-$1,000 modes',
    expected:
      'Modeled premium = $0 in both modes. Total headcount still captured via enrolled census field.',
    testData: 'Non-zero rates and census with enrolled method',
  },
  {
    id: 'TC-13',
    category: 'Zeroing Rules',
    title: '70+ band set to N/A',
    priority: 'Critical',
    preconditions: 'CI quote with 70Over counts entered',
    steps:
      '1. Set 70Over Employee Type = N/A; verify 70Over-EE premium\n2. Set 70Over Family/Spouse Type = N/A; verify 70Over-FS premium\n3. Test in both rate bases',
    expected:
      'Rate zeroed for N/A band; count retained. Headcount/volume includes 70+ members; premium for that band = $0.',
    testData: '70Over-EE and 70Over-FS counts > 0',
  },
  {
    id: 'TC-14',
    category: 'Zeroing Rules',
    title: 'Global census source',
    priority: 'Medium',
    preconditions: 'CI quote with multiple plan groups; census source = global',
    steps:
      '1. Set census source to global\n2. Enter census once\n3. Verify premiums across plan groups in both rate bases',
    expected: 'All plan groups read shared census. Calculations use shared counts correctly.',
    testData: 'Multi plan-group CI quote',
  },
  {
    id: 'TC-15',
    category: 'Modeler — Volume Modeling',
    title: 'Modeler shows volume entry in per-$1,000 mode',
    priority: 'High',
    preconditions: 'CI modeler access for per-$1,000 and per-unit plans',
    steps:
      '1. Open modeler for per-$1,000 CI plan\n2. Open modeler for per-unit CI plan',
    expected:
      'Per-$1,000 modeler shows volume row/grid (Voluntary Life pattern). Per-unit modeler remains count-only.',
    testData: 'One plan per rate basis',
  },
  {
    id: 'TC-16',
    category: 'Modeler — Volume Modeling',
    title: 'Modeler totals match quote grid',
    priority: 'Critical',
    preconditions: 'Per-$1,000 CI quote with modeler access',
    steps:
      '1. Enter identical census, benefits, and rates in quote grid and modeler\n2. Compare band and total premiums',
    expected: 'Modeler totals match quote grid totals exactly.',
    testData: 'Same inputs in quote grid and modeler',
  },
  {
    id: 'TC-17',
    category: 'Modeler — Volume Modeling',
    title: 'Derived vs entered volume behavior',
    priority: 'Medium',
    preconditions: 'Per-$1,000 mode; confirm dev implementation of Open Question 1',
    steps:
      '1. If volume is derived: verify volume = count × elected benefit\n2. If volume is entered per band: verify direct volume drives calc\n3. Document implemented approach',
    expected:
      'Behavior matches dev decision (derived-first per Steve, or entered-per-band like Voluntary Life).',
    testData: 'Per-$1,000 quote with known census/benefit',
  },
  {
    id: 'TC-18',
    category: 'Edge Cases & Data Integrity',
    title: 'Employee/company cost duplication preserved',
    priority: 'Medium',
    preconditions: 'Per-$1,000 quote with premium > $0',
    steps: '1. Review costs grid for band and total rows',
    expected:
      'Same premium value written to both employee and company columns (CI is 100% EE-paid).',
    testData: 'Quote with non-zero premium',
  },
  {
    id: 'TC-19',
    category: 'Edge Cases & Data Integrity',
    title: 'Rate precision at 3 decimals',
    priority: 'Medium',
    preconditions: 'Per-$1,000 quote',
    steps:
      '1. Enter rates with 3 decimal places (e.g. $0.450)\n2. Run round-trip conversion at 3-decimal precision',
    expected:
      'Rates accepted and displayed correctly. No cent-level drift in totals after conversion.',
    testData: 'Rate $0.450 per $1,000',
  },
  {
    id: 'TC-20',
    category: 'Edge Cases & Data Integrity',
    title: 'Spouse/dependent benefit display',
    priority: 'Low',
    preconditions: 'CI quote with spouse/dependent coverage percent set',
    steps:
      '1. Set spouse/dependent coverage as % of EE benefit\n2. Verify displayed benefit\n3. Confirm whether value feeds premium in per-$1,000 mode',
    expected:
      'Displayed benefit = (percent ÷ 100) × EE benefit. Document per dev decision on Open Question 2.',
    testData: 'EE benefit $20,000; spouse percent 50%',
  },
  {
    id: 'TC-21',
    category: 'Regression',
    title: 'Group Life and Voluntary Life unchanged',
    priority: 'Critical',
    preconditions: 'Existing Group Life and Voluntary Life quotes',
    steps:
      '1. Open existing Group Life quote; record premiums\n2. Open existing Voluntary Life quote; record premiums\n3. Compare to pre-deploy values',
    expected:
      'Premiums identical to pre-deploy. Voluntary Life volume/1000 math unchanged.',
    testData: 'Pre-existing Life quotes',
  },
  {
    id: 'TC-22',
    category: 'Regression',
    title: 'Sibling worksite products unchanged',
    priority: 'Critical',
    preconditions: 'Existing quotes for Accident, Cancer, Hospital Indemnity, etc.',
    steps:
      '1. Open Accident quote; verify premium\n2. Open Cancer quote; verify premium\n3. Open Hospital Indemnity quote; verify premium\n4. Spot-check ID Theft, OOP, BriteHR if available',
    expected: 'All sibling worksite product premiums unchanged from pre-deploy.',
    testData: 'One quote per worksite product type',
  },
];

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E79' },
};

const HEADER_FONT = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const CATEGORY_FILLS = {
  'Backward Compatibility & Defaults': 'FFE2EFDA',
  'Per Unit Purchased (Default)': 'FFFCE4D6',
  'Per $1,000 of Coverage': 'FFD9E1F2',
  'Rate Basis UI & Labeling': 'FFE4DFEC',
  'Zeroing Rules': 'FFFFF2CC',
  'Modeler — Volume Modeling': 'FFD5F5E3',
  'Edge Cases & Data Integrity': 'FFF8CBAD',
  Regression: 'FFF4CCCC',
};

function styleHeaderRow(sheet, columnCount) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = headerRow.getCell(col);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }
}

function applyBodyBorders(sheet, rowNumber, columnCount) {
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = sheet.getRow(rowNumber).getCell(col);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
    cell.alignment = { vertical: 'top', wrapText: true };
  }
}

async function buildWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Plansight QA';
  workbook.created = new Date();
  workbook.modified = new Date();

  const overview = workbook.addWorksheet('Overview', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  overview.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 90 },
  ];

  const overviewRows = [
    ['Jira Ticket', `${TICKET.key} — ${TICKET.summary}`],
    ['Ticket URL', TICKET.url],
    ['Prototype', TICKET.prototypeUrl],
    ['Feature Summary', 'Adds optional Per $1,000 of coverage rate basis to Critical Illness alongside default Per Unit Purchased, plus volume modeling in the CI modeler.'],
    ['Default Rate Basis', 'Per Unit Purchased (existing behavior; field absent = per unit)'],
    ['New Rate Basis', 'Per $1,000 of coverage: bandPremium = (benefit ÷ 1,000) × rate × count'],
    ['Per-Unit Formula', 'bandPremium = rate × count'],
    ['Worked Example', 'Benefit $20,000; 30-34 EE rate $0.75; 4 enrolled = $60.00 monthly band premium'],
    ['Test Environments', 'Dev (Jeff/Dale/Trevor) → Test → Stage smoke test per QA Test Workflow'],
    ['Evidence Required', 'Screenshots of cost grids, rate basis selector, presentation/print output, clean console, modeler vs quote totals'],
    ['Pass Criteria', 'Legacy quotes unchanged; new quotes default per-unit; per-$1,000 math correct; zeroing rules identical in both modes; no regression on Life or sibling worksite products'],
    ['Fail Criteria', 'Premium drift on legacy quotes; incorrect band math; missing rate basis labels; switching basis auto-transforms stored rates; changes to out-of-scope products'],
    ['Open Question 1', 'Modeler volume: derived (count × benefit) vs entered per band — confirm with dev before TC-17 sign-off'],
    ['Open Question 2', 'Spouse/dependent percent-of-EE benefit: display-only vs feeds premium in per-$1,000 mode'],
    ['Total Test Cases', String(TEST_CASES.length)],
  ];

  overview.addRows(overviewRows.map(([field, value]) => ({ field, value })));
  styleHeaderRow(overview, 2);
  overview.getColumn('field').font = { bold: true };
  overview.getRow(1).height = 22;

  const testCases = workbook.addWorksheet('Test Cases', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 2 }],
  });

  testCases.columns = [
    { header: 'TC ID', key: 'id', width: 10 },
    { header: 'Category', key: 'category', width: 28 },
    { header: 'Title', key: 'title', width: 34 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Preconditions', key: 'preconditions', width: 34 },
    { header: 'Steps', key: 'steps', width: 46 },
    { header: 'Expected Result', key: 'expected', width: 46 },
    { header: 'Test Data', key: 'testData', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Tester', key: 'tester', width: 16 },
    { header: 'Date Tested', key: 'dateTested', width: 14 },
    { header: 'Notes / Evidence', key: 'notes', width: 30 },
  ];

  TEST_CASES.forEach((tc) => {
    const row = testCases.addRow({
      ...tc,
      status: '',
      tester: '',
      dateTested: '',
      notes: '',
    });

    const fillColor = CATEGORY_FILLS[tc.category];
    if (fillColor) {
      row.getCell('category').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };
    }

    if (tc.priority === 'Critical') {
      row.getCell('priority').font = { bold: true, color: { argb: 'FFC00000' } };
    }

    applyBodyBorders(testCases, row.number, testCases.columnCount);
  });

  styleHeaderRow(testCases, testCases.columnCount);
  testCases.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: TEST_CASES.length + 1, column: testCases.columnCount },
  };

  testCases.getColumn('status').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    if (rowNumber === 1) return;
    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Pass,Fail,Blocked,Not Run,In Progress"'],
      showErrorMessage: true,
      errorTitle: 'Invalid status',
      error: 'Choose Pass, Fail, Blocked, Not Run, or In Progress.',
    };
  });

  const formulas = workbook.addWorksheet('Formulas & Reference');
  formulas.columns = [
    { header: 'Topic', key: 'topic', width: 28 },
    { header: 'Reference', key: 'reference', width: 90 },
  ];

  formulas.addRows([
    {
      topic: 'Per Unit Purchased',
      reference: 'bandPremium = rate[band] × count[band]',
    },
    {
      topic: 'Per $1,000 of Coverage',
      reference:
        'bandPremium = (benefit ÷ 1,000) × rate[band] × count[band]; EE bands use criticalIllnessBenefitEmployee; FS bands use criticalIllnessBenefitFamilySpouse',
    },
    {
      topic: 'Rate Conversion (helper only)',
      reference:
        'rate_per1000 = rate_perUnit ÷ (benefit ÷ 1,000); rate_perUnit = rate_per1000 × (benefit ÷ 1,000). Switching basis must NOT auto-transform stored rates.',
    },
    {
      topic: 'Age Bands',
      reference:
        '24Under, 2529, 3034, 3539, 4044, 4549, 5054, 5559, 6064, 6569, 70Over — each with EE and FS columns',
    },
    {
      topic: 'Enrollment Method = enrolled',
      reference: 'Both count and rate zeroed → $0 modeled premium; headcount captured separately',
    },
    {
      topic: '70+ N/A',
      reference: 'Rate zeroed for N/A band; count retained for headcount/volume',
    },
    {
      topic: 'Volume (display)',
      reference:
        'employeeVolumeTot = total EE count × employee benefit; familySpouseVolumeTot = total FS count × FS benefit',
    },
    {
      topic: 'Out of Scope',
      reference:
        'Accident, Cancer, Hospital Indemnity, ID Theft, OOP, BriteHR, Group Life, Voluntary Life, Excel import, data migration',
    },
  ]);

  styleHeaderRow(formulas, 2);
  formulas.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    applyBodyBorders(formulas, rowNumber, 2);
  });

  await workbook.xlsx.writeFile(OUTPUT_PATH);
  return OUTPUT_PATH;
}

buildWorkbook()
  .then((filePath) => {
    console.log(`Created: ${filePath}`);
    console.log(`Test cases: ${TEST_CASES.length}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
