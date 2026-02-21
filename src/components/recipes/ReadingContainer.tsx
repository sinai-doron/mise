import React from 'react';
import styled from 'styled-components';
import type { RecipeStep } from '../../types/Recipe';
import { formatQuantity, CATEGORY_LABELS } from '../../types/Recipe';
import type { IngredientCategory } from '../../types/Recipe';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div``;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    color: #f59e0b;
  }
`;

const CategoryGroup = styled.div`
  margin-bottom: 20px;
`;

const CategoryLabel = styled.h4`
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 0;
`;

const IngredientList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const IngredientItem = styled.li`
  padding: 10px 12px;
  background: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 6px;
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

const Quantity = styled.span`
  font-weight: 600;
  color: #f59e0b;
  min-width: 60px;
`;

const IngredientName = styled.span`
  color: #333;
`;

const IngredientNotes = styled.span`
  color: #888;
  font-size: 13px;
`;

const StepList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: step-counter;
`;

const StepItem = styled.li`
  counter-increment: step-counter;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 12px;
  position: relative;
  padding-left: 48px;

  &::before {
    content: counter(step-counter);
    position: absolute;
    left: 12px;
    top: 16px;
    width: 24px;
    height: 24px;
    background: #f59e0b;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }
`;

const StepDescription = styled.p`
  margin: 0;
  color: #333;
  line-height: 1.6;
`;

const StepMeta = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 8px;
`;

const StepTimer = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #f59e0b;

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const StepTip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
  font-style: italic;

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

interface ScaledIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  notes?: string;
  scaledQuantity: number;
  originalQuantity: number;
}

interface ReadingContainerProps {
  ingredients: ScaledIngredient[];
  steps: RecipeStep[];
  groceryByCategory: Record<IngredientCategory, ScaledIngredient[]>;
  sortedCategories: IngredientCategory[];
}

export const ReadingContainer: React.FC<ReadingContainerProps> = ({
  steps,
  groceryByCategory,
  sortedCategories,
}) => {
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <Container>
      <Section>
        <SectionTitle>
          <span className="material-symbols-outlined">grocery</span>
          Ingredients
        </SectionTitle>
        {sortedCategories.map((category) => (
          <CategoryGroup key={category}>
            <CategoryLabel>{CATEGORY_LABELS[category]}</CategoryLabel>
            <IngredientList>
              {groceryByCategory[category].map((ing) => (
                <IngredientItem key={ing.id}>
                  <Quantity>
                    {formatQuantity(ing.scaledQuantity)} {ing.unit}
                  </Quantity>
                  <IngredientName>{ing.name}</IngredientName>
                  {ing.notes && <IngredientNotes>({ing.notes})</IngredientNotes>}
                </IngredientItem>
              ))}
            </IngredientList>
          </CategoryGroup>
        ))}
      </Section>

      <Section>
        <SectionTitle>
          <span className="material-symbols-outlined">format_list_numbered</span>
          Instructions
        </SectionTitle>
        <StepList>
          {steps.map((step) => (
            <StepItem key={step.id}>
              <StepDescription>{step.description}</StepDescription>
              {(step.timer || step.tips) && (
                <StepMeta>
                  {step.timer && (
                    <StepTimer>
                      <span className="material-symbols-outlined">timer</span>
                      {formatTimer(step.timer)}
                    </StepTimer>
                  )}
                  {step.tips && (
                    <StepTip>
                      <span className="material-symbols-outlined">lightbulb</span>
                      {step.tips}
                    </StepTip>
                  )}
                </StepMeta>
              )}
            </StepItem>
          ))}
        </StepList>
      </Section>
    </Container>
  );
};
