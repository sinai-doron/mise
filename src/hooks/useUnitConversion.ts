import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  UnitSystem,
  TemperatureSystem,
  UnitPreferences,
  ConvertedQuantity
} from '../types/UnitConversion';
import {
  convertQuantity,
  convertTemperatureInText
} from '../utils/unitConversion';
import {
  loadUnitPreferences,
  saveUnitPreferences
} from '../utils/recipeStorage';

interface UseUnitConversionResult {
  // Current preferences
  preferences: UnitPreferences;

  // Individual preference values
  unitSystem: UnitSystem;
  temperatureSystem: TemperatureSystem;

  // Actions
  setUnitSystem: (system: UnitSystem) => void;
  setTemperatureSystem: (temp: TemperatureSystem) => void;

  // Conversion helpers
  convertIngredient: (quantity: number, unit: string) => ConvertedQuantity;
  convertStepText: (text: string) => string;
}

export function useUnitConversion(): UseUnitConversionResult {
  const [preferences, setPreferences] = useState<UnitPreferences>(() =>
    loadUnitPreferences()
  );

  // Save preferences whenever they change
  useEffect(() => {
    saveUnitPreferences(preferences);
  }, [preferences]);

  const setUnitSystem = useCallback((system: UnitSystem) => {
    setPreferences(prev => ({ ...prev, system }));
  }, []);

  const setTemperatureSystem = useCallback((temperature: TemperatureSystem) => {
    setPreferences(prev => ({ ...prev, temperature }));
  }, []);

  // Memoized conversion function for ingredients
  const convertIngredient = useCallback(
    (quantity: number, unit: string): ConvertedQuantity => {
      return convertQuantity(quantity, unit, preferences.system);
    },
    [preferences.system]
  );

  // Memoized conversion function for step text
  const convertStepText = useCallback(
    (text: string): string => {
      return convertTemperatureInText(text, preferences.temperature);
    },
    [preferences.temperature]
  );

  return useMemo(
    () => ({
      preferences,
      unitSystem: preferences.system,
      temperatureSystem: preferences.temperature,
      setUnitSystem,
      setTemperatureSystem,
      convertIngredient,
      convertStepText,
    }),
    [
      preferences,
      setUnitSystem,
      setTemperatureSystem,
      convertIngredient,
      convertStepText,
    ]
  );
}
