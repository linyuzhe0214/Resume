/**
 * Parses a mileage string into meters.
 * Supports formats like:
 * - 166k+587
 * - 166+587
 * - 166.587
 * - 166.587km
 * - 166587
 */
export function parseMileage(input: string): number | null {
  if (!input) return null;
  
  // Remove spaces and common units
  let clean = input.toLowerCase().replace(/\s/g, '').replace(/km/g, '').replace(/m/g, '');
  
  // Handle k+ format (e.g., 166k+587, 166+587, 166k587)
  if (clean.includes('k') || clean.includes('+')) {
    const parts = clean.split(/[k+]/).filter(p => p !== '');
    if (parts.length === 2) {
      const km = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(km) && !isNaN(m)) {
        return km * 1000 + m;
      }
    } else if (parts.length === 1) {
      const val = parseInt(parts[0], 10);
      if (!isNaN(val)) {
        return val * 1000;
      }
    }
  }
  
  // Handle decimal format (e.g., 166.587)
  if (clean.includes('.')) {
    const val = parseFloat(clean);
    if (!isNaN(val)) {
      return Math.round(val * 1000);
    }
  }
  
  // Handle plain number
  const val = parseInt(clean, 10);
  if (!isNaN(val)) {
    return val;
  }
  
  return null;
}

/**
 * Formats meters into k+ format.
 */
export function formatMileage(meters: number): string {
  const km = Math.floor(meters / 1000);
  const m = Math.floor(meters % 1000);
  return `${km}k+${m.toString().padStart(3, '0')}`;
}
