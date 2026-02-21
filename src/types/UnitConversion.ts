// Unit system preference
export type UnitSystem = 'metric' | 'imperial' | 'original';

// Temperature system
export type TemperatureSystem = 'celsius' | 'fahrenheit';

// Unit categories
export type UnitCategory = 'volume' | 'weight' | 'temperature' | 'unknown';

// Known unit definition
export interface UnitDefinition {
  canonical: string;       // Normalized name (e.g., "cup")
  category: UnitCategory;
  aliases: string[];       // All recognized forms including Hebrew
  toBase: number;          // Conversion factor to base unit (ml for volume, g for weight)
  isMetric: boolean;       // Whether this is a metric unit
}

// Conversion result
export interface ConvertedQuantity {
  original: { value: number; unit: string };
  converted: { value: number; unit: string };
  category: UnitCategory;
  canConvert: boolean;
}

// User preferences for unit conversion
export interface UnitPreferences {
  system: UnitSystem;
  temperature: TemperatureSystem;
}

// Scaled ingredient with conversion info
export interface ConvertedIngredient {
  id: string;
  name: string;
  originalQuantity: number;
  originalUnit: string;
  scaledQuantity: number;
  convertedQuantity: number;
  convertedUnit: string;
  category: string;
  notes?: string;
  canConvert: boolean;
}
