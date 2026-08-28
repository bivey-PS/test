const ExcelJS = require('exceljs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'test-plans', 'PS-8972-manual-test-cases.xlsx');

const TICKET = {
  key: 'PS-8972',
  summary: 'Presentation Editor — Anchor Cell Comments to the Quote, Not the Grid Position',
  url: 'https://plansight.atlassian.net/browse/PS-8972',
  testPlanTicket: 'PS-9332',
  branch: 'PS-8972-cell-anchor',
};

const TEST_CASES = [
  {
    id: 'TC-1',
    category: 'Market Response',
    title: 'Note follows carrier after add/reorder',
    priority: 'Critical',
    preconditions: 'RFP with ≥2 carriers; presentation with Market Response page',
    steps:
      '1. Type CARRIER-NOTE-A in Notes cell on 2nd/3rd carrier row\n2. Save\n3. Add quote or reorder rows\n4. Reload editor',
    expected: 'CARRIER-NOTE-A stays on same carrier, not old row position',
  },
  {
    id: 'TC-2',
    category: 'Medical Grid',
    title: 'Cell edit follows quote after column shift',
    priority: 'Critical',
    preconditions: 'Medical grid with ≥2 quotes in plan group',
    steps:
      '1. Edit cell on quote column 2 (GRID-MED-Q2-EE)\n2. Save\n3. Add quote so columns shift\n4. Reload',
    expected: 'Edit stays on original quote, not positional column 2',
  },
  {
    id: 'TC-3',
    category: 'Medical Grid',
    title: 'Reorder quotes within plan group',
    priority: 'High',
    preconditions: 'Annotated quote in plan group',
    steps: '1. Reorder quotes within plan group\n2. Reload editor',
    expected: 'Annotation follows quote to new column',
  },
  {
    id: 'TC-4',
    category: 'Dental / Vision Grid',
    title: 'Grid annotations follow quote (Dental/Vision)',
    priority: 'High',
    preconditions: 'Presentation with Dental and/or Vision grid pages',
    steps: '1. Annotate quote column 2\n2. Add/reorder quotes\n3. Reload',
    expected: 'Same anchor behaviour as Medical',
  },
  {
    id: 'TC-5',
    category: 'Backward Compatibility',
    title: 'Legacy presentation opens unchanged',
    priority: 'Critical',
    preconditions: 'Presentation saved before PS-8972 deploy; pre-change screenshot',
    steps: '1. Open legacy presentation on branch build\n2. Compare to screenshot',
    expected: 'All annotations in same positions as before (including pre-existing misplacement)',
  },
  {
    id: 'TC-6',
    category: 'Backward Compatibility',
    title: 'Legacy upgrade-on-save',
    priority: 'Critical',
    preconditions: 'Legacy presentation from TC-5',
    steps: '1. Re-save legacy presentation\n2. Reorder quotes\n3. Reload',
    expected: 'Annotations now follow quotes after re-save',
  },
  {
    id: 'TC-7',
    category: 'Quote Lifecycle',
    title: 'Deleting annotated quote drops annotation',
    priority: 'High',
    preconditions: 'Quote with saved cell annotation',
    steps: '1. Delete annotated quote\n2. Reload presentation',
    expected: 'Annotation gone; not moved to neighbouring quote',
  },
  {
    id: 'TC-8',
    category: 'Export — PDF',
    title: 'PDF matches editor',
    priority: 'Critical',
    preconditions: 'Passing TC-1 and TC-2 scenarios',
    steps: '1. Generate PDF\n2. Compare to editor',
    expected: 'PDF annotation placement matches editor',
  },
  {
    id: 'TC-9',
    category: 'Export — Excel',
    title: 'Excel matches editor',
    priority: 'Critical',
    preconditions: 'Passing TC-1 and TC-2; hidden row available',
    steps: '1. Generate Excel\n2. Compare values/styling\n3. Confirm hidden rows hide',
    expected: 'Excel matches editor; hidden rows still hide',
  },
  {
    id: 'TC-10',
    category: 'Editor Regression',
    title: 'Borders, selection, navigator, hidden rows, theme',
    priority: 'High',
    preconditions: 'Presentation with grid cells',
    steps:
      '1. Border controls on row\n2. Template row selection\n3. Navigator names\n4. Hidden row toggle\n5. Row theme styling',
    expected: 'All editor behaviours unchanged from pre-change',
  },
  {
    id: 'TC-11',
    category: 'Out of Scope Check',
    title: 'Sticky notes and shapes unchanged',
    priority: 'Medium',
    preconditions: 'Presentation editor open',
    steps: '1. Add sticky note and shape\n2. Save and reload',
    expected: 'Note/shape positions unchanged',
  },
  {
    id: 'TC-12',
    category: 'Plan Group Anchors',
    title: 'Summary/aggregate cells anchor to plan group',
    priority: 'Medium',
    preconditions: 'Grid with aggregate column outside quote-col',
    steps: '1. Edit aggregate cell\n2. Reorder quotes\n3. Reload',
    expected: 'Aggregate annotation stays with plan group',
  },
  {
    id: 'TC-13',
    category: 'Plan Group Anchors',
    title: 'Buffered summary columns stay paired',
    priority: 'Medium',
    preconditions: 'Plan group with summary columns after quote loop',
    steps: '1. Annotate quote + summary column\n2. Reorder\n3. Reload',
    expected: 'Each annotation stays with correct identity',
  },
  {
    id: 'TC-14',
    category: 'Multi-page Grid',
    title: 'Page 2 annotation survives reorder',
    priority: 'Medium',
    preconditions: 'Grid spanning ≥2 pages',
    steps: '1. Annotate cell on page 2\n2. Save, reorder, reload page 2',
    expected: 'Annotation on correct quote on correct page',
  },
];

async function buildWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Plansight QA';
  workbook.created = new Date();

  const overview = workbook.addWorksheet('Overview');
  overview.columns = [
    { header: 'Field', key: 'field', width: 24 },
    { header: 'Value', key: 'value', width: 80 },
  ];
  [
    ['Ticket', `${TICKET.key} — ${TICKET.summary}`],
    ['Jira URL', TICKET.url],
    ['Test Plan Ticket', TICKET.testPlanTicket],
    ['Branch', TICKET.branch],
    ['Total Test Cases', String(TEST_CASES.length)],
    ['Critical Cases', String(TEST_CASES.filter((tc) => tc.priority === 'Critical').length)],
    ['Markdown Source', 'test-plans/PS-8972-test-plan.md'],
  ].forEach(([field, value]) => overview.addRow({ field, value }));

  const sheet = workbook.addWorksheet('Test Cases');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Title', key: 'title', width: 36 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Preconditions', key: 'preconditions', width: 40 },
    { header: 'Steps', key: 'steps', width: 50 },
    { header: 'Expected Result', key: 'expected', width: 50 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Tester', key: 'tester', width: 16 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  sheet.getRow(1).font = { bold: true };
  TEST_CASES.forEach((testCase) => {
    sheet.addRow({
      ...testCase,
      status: 'Not Run',
      tester: '',
      date: '',
      notes: '',
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    row.alignment = { wrapText: true, vertical: 'top' };
  });

  await workbook.xlsx.writeFile(OUTPUT_PATH);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

buildWorkbook().catch((error) => {
  console.error(error);
  process.exit(1);
});
