/**
 * Helpers for verifying a plan cell sits under a carrier column on #gridInit/medical.
 *
 * Matching with element.textContent.includes(planFragment) plus loose horizontal
 * overlap is unsafe: ancestor containers aggregate child text from every carrier
 * column, and their bounding boxes span the full grid. A plan under Carrier B
 * plus an empty "Aetna National" header still "overlaps" and false-PASSes S3.16.
 */

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isReasonablePlanText(text, planName, planFragment) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return false;
  }

  if (normalized === planName) {
    return true;
  }

  if (!planFragment || !normalized.includes(planFragment)) {
    return false;
  }

  // Reject aggregating ancestors whose text concatenates many grid cells.
  const maxLength = Math.max(planName.length, planFragment.length) + 48;
  return normalized.length <= maxLength;
}

function overlapsCarrierColumn(elementRect, headerRect, tolerance = 20) {
  if (!elementRect || !headerRect) {
    return false;
  }

  // Multi-column wrappers span the grid and would "overlap" every header.
  if (elementRect.width > headerRect.width * 2.5) {
    return false;
  }

  const headerCenterX = headerRect.left + headerRect.width / 2;
  const centerX = elementRect.left + elementRect.width / 2;
  return (
    Math.abs(centerX - headerCenterX) <=
    Math.max(headerRect.width, elementRect.width) / 2 + tolerance
  );
}

function verifyPlanInCarrierColumn(
  elements,
  {
    carrierName = 'Aetna National',
    planName = '1 - Silver 5000 ValueCare',
    planFragment = 'Silver 5000 ValueCare',
  } = {},
) {
  const visible = (Array.isArray(elements) ? elements : []).filter(
    (element) => element && element.width > 0 && element.height > 0,
  );

  const headerCandidates = visible.filter(
    (element) => normalizeText(element.text) === carrierName,
  );

  if (headerCandidates.length === 0) {
    return {
      ok: false,
      reason: `Column heading "${carrierName}" not found on Medical quotes grid`,
    };
  }

  const header = headerCandidates.sort((left, right) => left.top - right.top)[0];
  const headerRect = {
    left: header.left,
    right: header.right,
    width: header.width,
    top: header.top,
  };

  const planCandidates = visible.filter((element) =>
    isReasonablePlanText(element.text, planName, planFragment),
  );

  if (planCandidates.length === 0) {
    return {
      ok: false,
      reason: `Plan row "${planName}" not found on Medical quotes grid`,
    };
  }

  // Prefer exact plan-name matches, then shortest label (leaf cells over wrappers).
  const ranked = [...planCandidates].sort((left, right) => {
    const leftExact = normalizeText(left.text) === planName ? 0 : 1;
    const rightExact = normalizeText(right.text) === planName ? 0 : 1;
    if (leftExact !== rightExact) {
      return leftExact - rightExact;
    }
    return normalizeText(left.text).length - normalizeText(right.text).length;
  });

  const match = ranked.find((element) =>
    overlapsCarrierColumn(
      {
        left: element.left,
        right: element.right,
        width: element.width,
      },
      headerRect,
    ),
  );

  if (!match) {
    return {
      ok: false,
      reason: `Plan "${planName}" was not found in the "${carrierName}" column`,
    };
  }

  return {
    ok: true,
    carrierName,
    planName: normalizeText(match.text) || planName,
  };
}

module.exports = {
  normalizeText,
  isReasonablePlanText,
  overlapsCarrierColumn,
  verifyPlanInCarrierColumn,
};
