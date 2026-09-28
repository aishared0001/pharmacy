// MediGo delivers ONLY within the Chandigarh area. Chandigarh PIN codes fall in
// the 160xxx series (roughly 160001-160104). We keep the rule in one place so
// the checkout screen and any server-side check stay in sync.

export const CITY_NAME = 'Chandigarh';

// Inclusive PIN-code range for Chandigarh.
export const CHANDIGARH_PIN_MIN = 160001;
export const CHANDIGARH_PIN_MAX = 160104;

/** Returns true if the given PIN code is inside the Chandigarh delivery area. */
export function isChandigarhPincode(pincode: string): boolean {
  const trimmed = (pincode ?? '').trim();
  if (!/^\d{6}$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return n >= CHANDIGARH_PIN_MIN && n <= CHANDIGARH_PIN_MAX;
}

export const OUT_OF_AREA_MESSAGE =
  'We currently deliver only within Chandigarh (PIN codes 160001–160104). ' +
  'Please enter a Chandigarh delivery address.';
