import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import type { UnitSystem, TemperatureSystem } from '../../types/UnitConversion';

const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  textMain: '#333333',
  textMuted: '#64748b',
};

const Container = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: ${props => props.$compact ? 'row' : 'column'};
  gap: ${props => props.$compact ? '8px' : '8px'};
`;

const ToggleGroup = styled.div`
  display: flex;
  background: ${colors.backgroundLight};
  border-radius: 8px;
  padding: 3px;
`;

const ToggleButton = styled.button<{ $active: boolean; $compact?: boolean }>`
  padding: ${props => props.$compact ? '4px 8px' : '6px 12px'};
  border: none;
  border-radius: 6px;
  font-size: ${props => props.$compact ? '11px' : '12px'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  background: ${props => props.$active ? colors.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : colors.textMuted};
  white-space: nowrap;

  &:hover {
    background: ${props => props.$active ? colors.primary : 'rgba(44, 62, 80, 0.1)'};
    color: ${props => props.$active ? 'white' : colors.textMain};
  }
`;

const Label = styled.span<{ $compact?: boolean }>`
  font-size: ${props => props.$compact ? '10px' : '11px'};
  font-weight: 600;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

interface UnitToggleProps {
  unitSystem: UnitSystem;
  temperatureSystem?: TemperatureSystem;
  onUnitSystemChange: (system: UnitSystem) => void;
  onTemperatureChange?: (temp: TemperatureSystem) => void;
  showTemperature?: boolean;
  compact?: boolean;
}

export const UnitToggle: React.FC<UnitToggleProps> = ({
  unitSystem,
  temperatureSystem = 'celsius',
  onUnitSystemChange,
  onTemperatureChange,
  showTemperature = false,
  compact = false,
}) => {
  const { t } = useTranslation();

  return (
    <Container $compact={compact}>
      <Row>
        {!compact && <Label>{t('units.system')}</Label>}
        <ToggleGroup>
          <ToggleButton
            $active={unitSystem === 'original'}
            $compact={compact}
            onClick={() => onUnitSystemChange('original')}
          >
            {t('units.original')}
          </ToggleButton>
          <ToggleButton
            $active={unitSystem === 'metric'}
            $compact={compact}
            onClick={() => onUnitSystemChange('metric')}
          >
            {t('units.metric')}
          </ToggleButton>
          <ToggleButton
            $active={unitSystem === 'imperial'}
            $compact={compact}
            onClick={() => onUnitSystemChange('imperial')}
          >
            {t('units.imperial')}
          </ToggleButton>
        </ToggleGroup>
      </Row>

      {showTemperature && onTemperatureChange && (
        <Row>
          {!compact && <Label>{t('units.temperature')}</Label>}
          <ToggleGroup>
            <ToggleButton
              $active={temperatureSystem === 'celsius'}
              $compact={compact}
              onClick={() => onTemperatureChange('celsius')}
            >
              °C
            </ToggleButton>
            <ToggleButton
              $active={temperatureSystem === 'fahrenheit'}
              $compact={compact}
              onClick={() => onTemperatureChange('fahrenheit')}
            >
              °F
            </ToggleButton>
          </ToggleGroup>
        </Row>
      )}
    </Container>
  );
};
