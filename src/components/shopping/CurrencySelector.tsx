import React from 'react';
import styled from 'styled-components';
import { SUPPORTED_CURRENCIES } from '../../types/ShoppingList';

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(44, 62, 80, 0.2);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  background: white;
  outline: none;
  cursor: pointer;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 36px;

  &:focus {
    border-color: #2C3E50;
  }
`;

interface CurrencySelectorProps {
  value?: string;
  onChange: (currencyCode: string) => void;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ value, onChange }) => {
  return (
    <Select
      value={value || 'USD'}
      onChange={(e) => onChange(e.target.value)}
    >
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </Select>
  );
};
