import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { MealSlot } from './MealSlot';
import { MEAL_TYPE_ORDER } from '../../types/MealPlan';
import type { MealPlanDay } from '../../types/MealPlan';
import type { Recipe } from '../../types/Recipe';

const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  todayBg: 'rgba(44, 62, 80, 0.05)',
  todayBorder: '#2C3E50',
};

const Column = styled.div<{ $isToday: boolean }>`
  display: flex;
  flex-direction: column;
  background: ${(props) => (props.$isToday ? colors.todayBg : colors.surface)};
  border: 2px solid ${(props) => (props.$isToday ? colors.todayBorder : 'transparent')};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
`;

const DayHeader = styled.div<{ $isToday: boolean }>`
  padding: 16px;
  text-align: center;
  background: ${(props) => (props.$isToday ? colors.primary : colors.backgroundLight)};
  color: ${(props) => (props.$isToday ? 'white' : colors.textMain)};
`;

const DayName = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
`;

const DayNumber = styled.div`
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
`;

const SlotsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
`;

interface MealPlanDayColumnProps {
  day: MealPlanDay;
  recipes: Recipe[];
}

export function MealPlanDayColumn({ day, recipes }: MealPlanDayColumnProps) {
  const { t } = useTranslation();

  // Get day name based on day of week
  const getDayName = (dayOfWeek: number): string => {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return t(`mealPlan.days.${dayKeys[dayOfWeek]}`);
  };

  // Get day number from date string
  const getDayNumber = (dateString: string): number => {
    const [, , day] = dateString.split('-').map(Number);
    return day;
  };

  return (
    <Column $isToday={day.isToday}>
      <DayHeader $isToday={day.isToday}>
        <DayName>{getDayName(day.dayOfWeek)}</DayName>
        <DayNumber>{getDayNumber(day.date)}</DayNumber>
      </DayHeader>

      <SlotsContainer>
        {MEAL_TYPE_ORDER.map((mealType) => (
          <MealSlot
            key={`${day.date}-${mealType}`}
            date={day.date}
            mealType={mealType}
            meals={day.meals[mealType]}
            recipes={recipes}
          />
        ))}
      </SlotsContainer>
    </Column>
  );
}
