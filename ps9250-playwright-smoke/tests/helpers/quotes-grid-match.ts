/**
 * Column-alignment helpers for Medical quotes grid assertions (S3.16).
 * Rejects the false-PASS where plan text only appears under another carrier
 * while the target carrier remains visible as a column header.
 */

/** Playwright boundingBox shape (x/y/width/height). */
export type Box = { x: number; y?: number; width: number; height?: number };

/** True when the plan element's horizontal center falls within the carrier header (±slop). */
export function planCenterInCarrierColumn(
  carrierHeader: Box,
  plan: Box,
  slopPx = 40,
): boolean {
  const center = plan.x + plan.width / 2;
  return center >= carrierHeader.x - slopPx && center <= carrierHeader.x + carrierHeader.width + slopPx;
}

export function anyPlanInCarrierColumn(
  carrierHeader: Box,
  plans: Box[],
  slopPx = 40,
): boolean {
  return plans.some((plan) => planCenterInCarrierColumn(carrierHeader, plan, slopPx));
}
