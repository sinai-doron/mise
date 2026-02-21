import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Label = styled.span`
  font-size: 14px;
  color: #666;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 4px;
`;

const Button = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    background: #f59e0b;
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const Value = styled.span`
  min-width: 40px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const ResetButton = styled.button`
  background: none;
  border: none;
  color: #f59e0b;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    text-decoration: underline;
  }
`;

interface ServingsControlProps {
  servings: number;
  defaultServings: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onReset: () => void;
}

export const ServingsControl: React.FC<ServingsControlProps> = ({
  servings,
  defaultServings,
  onIncrement,
  onDecrement,
  onReset,
}) => {
  const isDefault = servings === defaultServings;

  return (
    <Container>
      <Label>Servings:</Label>
      <Controls>
        <Button onClick={onDecrement} disabled={servings <= 1}>
          <span className="material-symbols-outlined">remove</span>
        </Button>
        <Value>{servings}</Value>
        <Button onClick={onIncrement} disabled={servings >= 100}>
          <span className="material-symbols-outlined">add</span>
        </Button>
      </Controls>
      {!isDefault && (
        <ResetButton onClick={onReset}>Reset</ResetButton>
      )}
    </Container>
  );
};
