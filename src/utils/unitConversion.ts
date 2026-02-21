import type {
  UnitSystem,
  TemperatureSystem,
  UnitCategory,
  UnitDefinition,
  ConvertedQuantity
} from '../types/UnitConversion';

// Volume units (base: ml)
const VOLUME_UNITS: UnitDefinition[] = [
  { canonical: 'ml', category: 'volume', aliases: ['ml', 'milliliter', 'milliliters', 'מ"ל'], toBase: 1, isMetric: true },
  { canonical: 'l', category: 'volume', aliases: ['l', 'liter', 'liters', 'ליטר', 'ל'], toBase: 1000, isMetric: true },
  { canonical: 'cup', category: 'volume', aliases: ['cup', 'cups', 'c', 'כוס', 'כוסות'], toBase: 240, isMetric: false },
  { canonical: 'tbsp', category: 'volume', aliases: ['tbsp', 'tablespoon', 'tablespoons', 'tbs', 'כף', 'כפות'], toBase: 15, isMetric: false },
  { canonical: 'tsp', category: 'volume', aliases: ['tsp', 'teaspoon', 'teaspoons', 'כפית', 'כפיות'], toBase: 5, isMetric: false },
  { canonical: 'fl oz', category: 'volume', aliases: ['fl oz', 'fl. oz', 'fluid ounce', 'fluid ounces'], toBase: 29.57, isMetric: false },
];

// Weight units (base: g)
const WEIGHT_UNITS: UnitDefinition[] = [
  { canonical: 'g', category: 'weight', aliases: ['g', 'gram', 'grams', 'גרם', 'ג'], toBase: 1, isMetric: true },
  { canonical: 'kg', category: 'weight', aliases: ['kg', 'kilogram', 'kilograms', 'ק"ג', 'קילו'], toBase: 1000, isMetric: true },
  { canonical: 'oz', category: 'weight', aliases: ['oz', 'ounce', 'ounces'], toBase: 28.35, isMetric: false },
  { canonical: 'lb', category: 'weight', aliases: ['lb', 'lbs', 'pound', 'pounds'], toBase: 453.6, isMetric: false },
];

// All units combined
const ALL_UNITS: UnitDefinition[] = [...VOLUME_UNITS, ...WEIGHT_UNITS];

// Build a lookup map for faster parsing
const unitLookup: Map<string, UnitDefinition> = new Map();
ALL_UNITS.forEach(unit => {
  unit.aliases.forEach(alias => {
    unitLookup.set(alias.toLowerCase(), unit);
  });
});

// Preferred metric units for display
const PREFERRED_METRIC_VOLUME: { threshold: number; unit: UnitDefinition }[] = [
  { threshold: 1000, unit: VOLUME_UNITS.find(u => u.canonical === 'l')! },
  { threshold: 0, unit: VOLUME_UNITS.find(u => u.canonical === 'ml')! },
];

const PREFERRED_METRIC_WEIGHT: { threshold: number; unit: UnitDefinition }[] = [
  { threshold: 1000, unit: WEIGHT_UNITS.find(u => u.canonical === 'kg')! },
  { threshold: 0, unit: WEIGHT_UNITS.find(u => u.canonical === 'g')! },
];

// Preferred imperial units for display
const PREFERRED_IMPERIAL_VOLUME: { threshold: number; unit: UnitDefinition }[] = [
  { threshold: 240, unit: VOLUME_UNITS.find(u => u.canonical === 'cup')! },
  { threshold: 15, unit: VOLUME_UNITS.find(u => u.canonical === 'tbsp')! },
  { threshold: 0, unit: VOLUME_UNITS.find(u => u.canonical === 'tsp')! },
];

const PREFERRED_IMPERIAL_WEIGHT: { threshold: number; unit: UnitDefinition }[] = [
  { threshold: 453.6, unit: WEIGHT_UNITS.find(u => u.canonical === 'lb')! },
  { threshold: 0, unit: WEIGHT_UNITS.find(u => u.canonical === 'oz')! },
];

/**
 * Parse a unit string and identify its definition
 */
export function parseUnit(unitStr: string): UnitDefinition | null {
  const normalized = unitStr.trim().toLowerCase();
  return unitLookup.get(normalized) || null;
}

/**
 * Get the category of a unit
 */
export function getUnitCategory(unitStr: string): UnitCategory {
  const unit = parseUnit(unitStr);
  return unit?.category || 'unknown';
}

/**
 * Select the best unit for displaying a value in the target system
 */
function selectBestUnit(
  baseValue: number,
  category: UnitCategory,
  targetSystem: UnitSystem
): UnitDefinition {
  const isMetric = targetSystem === 'metric';

  let preferredUnits: { threshold: number; unit: UnitDefinition }[];

  if (category === 'volume') {
    preferredUnits = isMetric ? PREFERRED_METRIC_VOLUME : PREFERRED_IMPERIAL_VOLUME;
  } else {
    preferredUnits = isMetric ? PREFERRED_METRIC_WEIGHT : PREFERRED_IMPERIAL_WEIGHT;
  }

  // Find the best unit based on threshold
  for (const { threshold, unit } of preferredUnits) {
    if (baseValue >= threshold) {
      return unit;
    }
  }

  // Fallback to smallest unit
  return preferredUnits[preferredUnits.length - 1].unit;
}

/**
 * Round to a reasonable precision for cooking
 */
function roundForCooking(value: number): number {
  if (value === 0) return 0;

  // For very small values, keep more precision
  if (Math.abs(value) < 0.1) {
    return Math.round(value * 100) / 100;
  }

  // For small values, round to 1 decimal
  if (Math.abs(value) < 10) {
    return Math.round(value * 10) / 10;
  }

  // For larger values, round to whole numbers
  return Math.round(value);
}

/**
 * Convert a quantity to the target unit system
 */
export function convertQuantity(
  quantity: number,
  unitStr: string,
  targetSystem: UnitSystem
): ConvertedQuantity {
  const result: ConvertedQuantity = {
    original: { value: quantity, unit: unitStr },
    converted: { value: quantity, unit: unitStr },
    category: 'unknown',
    canConvert: false,
  };

  // If original system, no conversion needed
  if (targetSystem === 'original') {
    return result;
  }

  // Parse the input unit
  const sourceUnit = parseUnit(unitStr);
  if (!sourceUnit) {
    return result;
  }

  result.category = sourceUnit.category;

  // Check if conversion is needed (unit already in target system)
  const needsConversion = targetSystem === 'metric' ? !sourceUnit.isMetric : sourceUnit.isMetric;
  if (!needsConversion) {
    result.converted = { value: quantity, unit: sourceUnit.canonical };
    result.canConvert = true;
    return result;
  }

  // Convert to base units (ml or g)
  const baseValue = quantity * sourceUnit.toBase;

  // Select the best target unit
  const targetUnit = selectBestUnit(baseValue, sourceUnit.category, targetSystem);

  // Convert to target unit
  const convertedValue = baseValue / targetUnit.toBase;

  result.converted = {
    value: roundForCooking(convertedValue),
    unit: targetUnit.canonical,
  };
  result.canConvert = true;

  return result;
}

/**
 * Convert temperature between Celsius and Fahrenheit
 */
export function convertTemperature(
  value: number,
  from: TemperatureSystem,
  to: TemperatureSystem
): number {
  if (from === to) return value;

  if (from === 'celsius' && to === 'fahrenheit') {
    return Math.round((value * 9/5) + 32);
  } else {
    return Math.round((value - 32) * 5/9);
  }
}

/**
 * Detect temperature system from text (e.g., "350°F" or "180°C")
 */
function detectTemperatureSystem(tempStr: string): TemperatureSystem | null {
  const upperStr = tempStr.toUpperCase();
  if (upperStr.includes('F') || upperStr.includes('FAHRENHEIT')) {
    return 'fahrenheit';
  }
  if (upperStr.includes('C') || upperStr.includes('CELSIUS')) {
    return 'celsius';
  }
  return null;
}

/**
 * Convert temperatures in step descriptions
 * Matches patterns like: 350°F, 180°C, 350 F, 180 degrees C, etc.
 */
export function convertTemperatureInText(
  text: string,
  targetSystem: TemperatureSystem
): string {
  // Pattern to match temperatures
  // Matches: 350°F, 350° F, 350 °F, 350F, 350 F, 350 degrees F, 180°C, etc.
  const tempPattern = /(\d+)\s*[°]?\s*(degrees?\s*)?(F|C|fahrenheit|celsius)\b/gi;

  return text.replace(tempPattern, (match, valueStr, _degrees, unit) => {
    const value = parseInt(valueStr, 10);
    const sourceSystem = detectTemperatureSystem(unit);

    if (!sourceSystem || sourceSystem === targetSystem) {
      return match;
    }

    const convertedValue = convertTemperature(value, sourceSystem, targetSystem);
    const targetUnit = targetSystem === 'celsius' ? 'C' : 'F';

    return `${convertedValue}°${targetUnit}`;
  });
}

/**
 * Format a quantity for display (handles fractions)
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  // Handle common fractions
  const fractions: Record<number, string> = {
    0.25: '1/4',
    0.33: '1/3',
    0.5: '1/2',
    0.67: '2/3',
    0.75: '3/4',
  };

  const wholePart = Math.floor(quantity);
  const decimalPart = Math.round((quantity - wholePart) * 100) / 100;

  // Check if decimal matches a common fraction
  let fractionStr = '';
  for (const [decimal, fraction] of Object.entries(fractions)) {
    if (Math.abs(decimalPart - parseFloat(decimal)) < 0.02) {
      fractionStr = fraction;
      break;
    }
  }

  let valueStr: string;
  if (wholePart === 0 && fractionStr) {
    valueStr = fractionStr;
  } else if (wholePart > 0 && fractionStr) {
    valueStr = `${wholePart} ${fractionStr}`;
  } else if (wholePart > 0 && decimalPart === 0) {
    valueStr = wholePart.toString();
  } else {
    valueStr = quantity.toFixed(1).replace(/\.0$/, '');
  }

  return `${valueStr} ${unit}`;
}
