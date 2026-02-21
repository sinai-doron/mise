import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Button = styled.button`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    background: #2C3E50;
    color: white;
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const Value = styled.span`
  min-width: 32px;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #333;
`;

interface QuantityControlProps {
  value: number;
  min?: number;
  max?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  showValue?: boolean;
}

export const QuantityControl: React.FC<QuantityControlProps> = ({
  value,
  min = 0,
  max = 999,
  onIncrement,
  onDecrement,
  showValue = true,
}) => {
  return (
    <Container>
      <Button onClick={onDecrement} disabled={value <= min}>
        <span className="material-symbols-outlined">remove</span>
      </Button>
      {showValue && <Value>{value}</Value>}
      <Button onClick={onIncrement} disabled={value >= max}>
        <span className="material-symbols-outlined">add</span>
      </Button>
    </Container>
  );
};
