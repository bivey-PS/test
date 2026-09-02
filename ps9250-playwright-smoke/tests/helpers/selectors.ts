/**
 * Central selector map for the Plansight UI.
 *
 * IMPORTANT (for the reviewer wiring this into `plansight`):
 * These selectors are best-guess placeholders derived from the PS-9250 plan and
 * the app's known stack (Laravel + jQuery/DataTables). Confirm each against the
 * real DOM on test.plansight.com (use `npm run codegen` to capture real
 * locators) and update values here in ONE place. Prefer stable attributes
 * (data-test / id) over text where possible.
 *
 * Locators are expressed as objects the page objects know how to resolve:
 *  - { role, name }         -> page.getByRole(role, { name })
 *  - { label }              -> page.getByLabel(label)
 *  - { placeholder }        -> page.getByPlaceholder(placeholder)
 *  - { text }               -> page.getByText(text)
 *  - { testId }             -> page.getByTestId(testId)
 *  - { css }                -> page.locator(css)
 */
export type SelectorSpec =
  | { role: 'button' | 'link' | 'textbox' | 'tab' | 'heading' | 'row' | 'cell' | 'combobox' | 'menuitem'; name?: string | RegExp; exact?: boolean }
  | { label: string | RegExp }
  | { placeholder: string | RegExp }
  | { text: string | RegExp }
  | { testId: string }
  | { css: string };

export const selectors = {
  login: {
    // Confirmed against https://test.plansight.com (2026-08-26): auth is Auth0
    // Universal Login (redirects to devauth.plansight.com), identifier-first:
    //   #username -> "Continue" -> #password -> "Continue".
    email: { css: '#username' } as SelectorSpec,
    continueButton: { role: 'button', name: /continue|next/i } as SelectorSpec,
    password: { css: '#password' } as SelectorSpec,
    submit: { role: 'button', name: /continue|log ?in|sign ?in|submit/i } as SelectorSpec,
    form: { css: 'form' } as SelectorSpec,
  },
  shell: {
    // Landmarks proving we are "in the app"
    mainNav: { css: 'nav, [role="navigation"]' } as SelectorSpec,
    navGroups: { role: 'link', name: /groups/i } as SelectorSpec,
    navRfps: { role: 'link', name: /rfps?|request for proposals/i } as SelectorSpec,
    navTemplates: { role: 'link', name: /templates/i } as SelectorSpec,
    userMenu: { css: '[data-test="user-menu"], .user-menu' } as SelectorSpec,
    logout: { role: 'link', name: /log ?out|sign ?out/i } as SelectorSpec,
  },
  groups: {
    list: { css: 'table, .group-list, [data-test="group-list"]' } as SelectorSpec,
    anyRow: { css: 'table tbody tr' } as SelectorSpec,
    groupLinkByName: (name: string) => ({ role: 'link', name } as SelectorSpec),
    groupHome: { css: '[data-test="group-home"], .group-profile' } as SelectorSpec,
    createGroupButton: { role: 'button', name: /add group|create group|new group/i } as SelectorSpec,
  },
  rfpWizard: {
    startRfpButton: { role: 'button', name: /start (marketing|rfp)|new rfp|create rfp|marketing event/i } as SelectorSpec,
    rfpNameInput: { label: /rfp name|name/i } as SelectorSpec,
    effectiveDate: { label: /effective date/i } as SelectorSpec,
    rfpOwner: { label: /rfp owner|owner/i } as SelectorSpec,
    planAttributesTemplate: { label: /plan design attributes? template|plan attributes? template|template/i } as SelectorSpec,
    saveAndContinue: { role: 'button', name: /save (&|and) continue|save & go|next/i } as SelectorSpec,
    benefitTypeMedical: { role: 'checkbox' as unknown as 'button', name: /medical/i } as unknown as SelectorSpec,
    benefitTypeDental: { text: /dental/i } as SelectorSpec,
    benefitTypeVision: { text: /vision/i } as SelectorSpec,
    communityRatedNo: { role: 'button', name: /^no$/i } as SelectorSpec,
    skipCensus: { role: 'button', name: /skip( census)?/i } as SelectorSpec,
    distributionEllipsis: { css: '[data-test="distribution-actions"], .ellipsis, .dropdown-toggle' } as SelectorSpec,
    backToEmployerProfile: { role: 'link', name: /back to employer profile|employer profile/i } as SelectorSpec,
    reviewAndSend: { role: 'button', name: /review (&|and) send|send/i } as SelectorSpec,
    coverLetterSelect: { label: /cover letter/i } as SelectorSpec,
  },
  rfpList: {
    section: { text: /request for proposals/i } as SelectorSpec,
    rowByName: (name: string) => ({ role: 'row', name } as SelectorSpec),
    nameLink: (name: string) => ({ role: 'link', name } as SelectorSpec),
  },
  quotes: {
    addQuoteButton: { role: 'button', name: /add quote|\+/i } as SelectorSpec,
    carrierCombobox: { label: /carrier/i } as SelectorSpec,
    uploadDropzone: { text: /click to upload|drag|upload/i } as SelectorSpec,
    fileInput: { css: 'input[type="file"]' } as SelectorSpec,
    submitQuote: { role: 'button', name: /submit|create|save/i } as SelectorSpec,
    saveChanges: { role: 'button', name: /save changes/i } as SelectorSpec,
    medicalTab: { role: 'tab', name: /medical/i } as SelectorSpec,
    visionTab: { role: 'tab', name: /vision/i } as SelectorSpec,
    dentalTab: { role: 'tab', name: /dental/i } as SelectorSpec,
    grid: { css: 'table, .quotes-grid, [data-test="quotes-grid"]' } as SelectorSpec,
  },
  plansights: {
    view: { css: '[data-test="plansights"], .plansights' } as SelectorSpec,
    anyEditableAttribute: { css: 'input, select, [contenteditable="true"]' } as SelectorSpec,
    contributionTab: { role: 'tab', name: /contribution|modeler/i } as SelectorSpec,
    calculateButton: { role: 'button', name: /calculate/i } as SelectorSpec,
  },
  presentation: {
    sideBySide: { role: 'link', name: /side.?by.?side|compare/i } as SelectorSpec,
    openOrCreate: { role: 'button', name: /presentation|create presentation/i } as SelectorSpec,
    exportButton: { role: 'button', name: /export|download|pdf|excel/i } as SelectorSpec,
  },
  templates: {
    planAttributes: { role: 'link', name: /plan attributes?/i } as SelectorSpec,
    list: { css: 'table, .template-list' } as SelectorSpec,
    firstTemplate: { css: 'table tbody tr:first-child a' } as SelectorSpec,
    planLibrary: { role: 'link', name: /plan library|presentations/i } as SelectorSpec,
  },
  documents: {
    list: { css: '[data-test="documents"], .documents-list, table' } as SelectorSpec,
    uploadInput: { css: 'input[type="file"]' } as SelectorSpec,
    aiAction: { role: 'button', name: /process|planfacts|ai|extract/i } as SelectorSpec,
  },
  // PS-9410 — Create an Employer. TODO: confirm all against the live form via
  // `npm run codegen` (field names are expected values, not yet verified live).
  employerCreate: {
    // Entry point (may match the groups "Add group" affordance).
    createButton: { role: 'button', name: /add employer|create employer|add group|create group|new (employer|group)/i } as SelectorSpec,
    form: { css: 'form' } as SelectorSpec,
    nameInput: { label: /employer name|group name|company name|name/i } as SelectorSpec,
    effectiveDate: { label: /effective date/i } as SelectorSpec,
    situsState: { label: /situs|home state|state/i } as SelectorSpec,
    industrySic: { label: /industry|sic/i } as SelectorSpec,
    ein: { label: /ein|tax id/i } as SelectorSpec,
    contactName: { label: /contact name|primary contact/i } as SelectorSpec,
    contactEmail: { label: /contact email|email/i } as SelectorSpec,
    brokerOwner: { label: /broker|owner|account manager/i } as SelectorSpec,
    save: { role: 'button', name: /save|create|add|submit/i } as SelectorSpec,
    cancel: { role: 'button', name: /cancel/i } as SelectorSpec,
    validationError: { css: '.error, .invalid-feedback, [aria-invalid="true"], .field-error' } as SelectorSpec,
  },

  admin: {
    brokerageUsers: { role: 'link', name: /users|brokerage/i } as SelectorSpec,
    settings: { role: 'link', name: /settings/i } as SelectorSpec,
    planAttributesDefault: { text: /default/i } as SelectorSpec,
  },
} as const;
