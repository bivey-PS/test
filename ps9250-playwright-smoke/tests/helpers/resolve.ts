import { Page, Locator } from '@playwright/test';
import { SelectorSpec } from './selectors';

/**
 * Resolve a declarative SelectorSpec into a Playwright Locator.
 * Keeps page objects readable and selectors centralized in selectors.ts.
 */
export function resolve(page: Page, spec: SelectorSpec): Locator {
  if ('role' in spec) {
    return page.getByRole(spec.role as any, {
      name: (spec as any).name,
      exact: (spec as any).exact,
    });
  }
  if ('label' in spec) return page.getByLabel(spec.label);
  if ('placeholder' in spec) return page.getByPlaceholder(spec.placeholder);
  if ('text' in spec) return page.getByText(spec.text);
  if ('testId' in spec) return page.getByTestId(spec.testId);
  if ('css' in spec) return page.locator(spec.css);
  throw new Error(`Unsupported selector spec: ${JSON.stringify(spec)}`);
}
