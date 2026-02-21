import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import type { IngredientCategory, PurchaseHistoryEntry } from '../../types/Recipe';
import { detectCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '../../types/Recipe';
import { useProductSearch, type ProductSuggestion } from '../../hooks/useProductSearch';
import { getProductByBarcode, mapOFFCategoryToIngredientCategory, formatProductName } from '../../services/openFoodFacts';
import { BarcodeScanner } from './BarcodeScanner';

const Container = styled.div`
  position: relative;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px -2px rgba(44, 62, 80, 0.1);
  border: 1px solid rgba(44, 62, 80, 0.08);
  overflow: visible;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
`;

const SearchIcon = styled.span`
  color: #94a3b8;
  flex-shrink: 0;

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  background: transparent;
  min-width: 0;

  &::placeholder {
    color: #94a3b8;
  }
`;

const ScanButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border: none;
  background: #f8fafc;
  color: #2C3E50;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  touch-action: manipulation;

  &:hover {
    background: #e2e8f0;
  }

  &:active {
    transform: scale(0.95);
  }

  .material-symbols-outlined {
    font-size: 24px;
  }

  @media (hover: none) {
    /* Show more prominently on touch devices */
    background: #e0f2fe;
    color: #0369a1;
  }
`;

const AddButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border: none;
  background: #2C3E50;
  color: white;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    background: #1a252f;
    transform: scale(1.05);
  }

  &:disabled {
    background: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const DetailsRow = styled.div<{ $visible: boolean }>`
  display: ${(props) => (props.$visible ? 'flex' : 'none')};
  align-items: center;
  gap: 12px;
  padding: 0 16px 12px;
  flex-wrap: wrap;
`;

const QuantityInput = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f8fafc;
  border-radius: 10px;
  padding: 4px;
`;

const NumberInput = styled.input`
  width: 48px;
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  background: transparent;
  color: #333;
`;

const UnitSelect = styled.select`
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  background: #f8fafc;
  color: #333;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
`;

const CategoryBadge = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(props) => (props.$active ? '#2C3E50' : '#f8fafc')};
  color: ${(props) => (props.$active ? 'white' : '#64748b')};

  &:hover {
    background: ${(props) => (props.$active ? '#1a252f' : '#e2e8f0')};
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const Suggestions = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(44, 62, 80, 0.08);
  margin-top: 4px;
  max-height: 280px;
  overflow-y: auto;
  z-index: 100;
  display: ${(props) => (props.$visible ? 'block' : 'none')};
`;

const SuggestionHeader = styled.div`
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
`;

const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f8fafc;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #f1f5f9;
  }
`;

const SuggestionImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  background: #f1f5f9;
`;

const SuggestionImagePlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const SuggestionContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const SuggestionName = styled.span`
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SuggestionMeta = styled.span`
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
`;

const SuggestionSource = styled.span<{ $source: 'history' | 'openfoodfacts' }>`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${(props) =>
    props.$source === 'history' ? '#e0f2fe' : '#fef3c7'};
  color: ${(props) =>
    props.$source === 'history' ? '#0369a1' : '#92400e'};
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #94a3b8;
  font-size: 13px;
  gap: 8px;

  .material-symbols-outlined {
    font-size: 18px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const COMMON_UNITS = [
  '',
  'piece',
  'lb',
  'oz',
  'kg',
  'g',
  'L',
  'ml',
  'cup',
  'tbsp',
  'tsp',
  'bottle',
  'can',
  'bag',
  'box',
  'pack',
];

interface QuickAddInputProps {
  onAdd: (
    name: string,
    quantity: number,
    unit: string,
    category: IngredientCategory,
    notes?: string
  ) => void;
  purchaseHistory: PurchaseHistoryEntry[];
}

export const QuickAddInput: React.FC<QuickAddInputProps> = ({
  onAdd,
  purchaseHistory,
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('other');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the product search hook
  const { suggestions, isLoading, search, clearSuggestions } = useProductSearch({
    purchaseHistory,
    debounceMs: 400,
    maxResults: 8,
    preferHebrew: true,
  });

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    setScanProcessing(true);

    try {
      const product = await getProductByBarcode(barcode);

      if (product && product.product_name) {
        const productName = formatProductName(product, true);
        const productCategory = mapOFFCategoryToIngredientCategory(product.categories_tags);

        // Add the product
        onAdd(productName, 1, '', productCategory);

        setScanSuccess(`Added: ${productName}`);

        // Close scanner after showing success
        setTimeout(() => {
          setShowScanner(false);
          setScanSuccess(null);
          setScanProcessing(false);
        }, 1500);
      } else {
        // Product not found - let user enter manually
        setScanSuccess(`Barcode ${barcode} not found. Enter manually.`);
        setTimeout(() => {
          setShowScanner(false);
          setScanSuccess(null);
          setScanProcessing(false);
          // Pre-fill the barcode in the input
          setName(barcode);
          inputRef.current?.focus();
        }, 2000);
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      setScanSuccess('Lookup failed. Try again.');
      setTimeout(() => {
        setScanProcessing(false);
        setScanSuccess(null);
      }, 2000);
    }
  }, [onAdd]);

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
    setScanProcessing(false);
    setScanSuccess(null);
  }, []);

  // Auto-detect category when name changes (fallback if no suggestion selected)
  useEffect(() => {
    if (name.length >= 2 && suggestions.length === 0) {
      const detected = detectCategory(name);
      setCategory(detected);
    }
  }, [name, suggestions.length]);

  // Group suggestions by source
  const historySuggestions = suggestions.filter((s) => s.source === 'history');
  const offSuggestions = suggestions.filter((s) => s.source === 'openfoodfacts');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    search(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), quantity, unit, category);
    setName('');
    setQuantity(1);
    setUnit('');
    setCategory('other');
    setShowSuggestions(false);
    clearSuggestions();
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: ProductSuggestion) => {
    onAdd(
      suggestion.name,
      quantity,
      unit,
      suggestion.category
    );
    setName('');
    setQuantity(1);
    setUnit('');
    setCategory('other');
    setShowSuggestions(false);
    clearSuggestions();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatLastPurchased = (timestamp: number): string => {
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const hasSuggestions = suggestions.length > 0 || isLoading;

  return (
    <Container ref={containerRef}>
      <InputRow>
        <SearchIcon>
          <span className="material-symbols-outlined">add_circle</span>
        </SearchIcon>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Add item..."
          value={name}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(name.length >= 2)}
          onKeyDown={handleKeyDown}
        />
        <ScanButton onClick={() => setShowScanner(true)} title="Scan barcode">
          <span className="material-symbols-outlined">qr_code_scanner</span>
        </ScanButton>
        <AddButton onClick={handleSubmit} disabled={!name.trim()}>
          <span className="material-symbols-outlined">add</span>
        </AddButton>
      </InputRow>

      <DetailsRow $visible={name.length > 0}>
        <QuantityInput>
          <NumberInput
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </QuantityInput>
        <UnitSelect value={unit} onChange={(e) => setUnit(e.target.value)}>
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u}>
              {u || 'unit'}
            </option>
          ))}
        </UnitSelect>
        <CategoryBadge $active={true}>
          <span className="material-symbols-outlined">
            {CATEGORY_ICONS[category]}
          </span>
          {CATEGORY_LABELS[category]}
        </CategoryBadge>
      </DetailsRow>

      <Suggestions $visible={showSuggestions && hasSuggestions}>
        {historySuggestions.length > 0 && (
          <>
            <SuggestionHeader>Recent Purchases</SuggestionHeader>
            {historySuggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <SuggestionImagePlaceholder>
                  <span className="material-symbols-outlined">history</span>
                </SuggestionImagePlaceholder>
                <SuggestionContent>
                  <SuggestionName>{suggestion.displayName}</SuggestionName>
                  <SuggestionMeta>
                    {CATEGORY_LABELS[suggestion.category]}
                    {suggestion.lastPurchased &&
                      ` • ${formatLastPurchased(suggestion.lastPurchased)}`}
                  </SuggestionMeta>
                </SuggestionContent>
                <SuggestionSource $source="history">History</SuggestionSource>
              </SuggestionItem>
            ))}
          </>
        )}

        {offSuggestions.length > 0 && (
          <>
            <SuggestionHeader>Products</SuggestionHeader>
            {offSuggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.imageUrl ? (
                  <SuggestionImage
                    src={suggestion.imageUrl}
                    alt={suggestion.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <SuggestionImagePlaceholder>
                    <span className="material-symbols-outlined">
                      {CATEGORY_ICONS[suggestion.category]}
                    </span>
                  </SuggestionImagePlaceholder>
                )}
                <SuggestionContent>
                  <SuggestionName>{suggestion.displayName}</SuggestionName>
                  <SuggestionMeta>
                    {suggestion.brand && `${suggestion.brand} • `}
                    {CATEGORY_LABELS[suggestion.category]}
                  </SuggestionMeta>
                </SuggestionContent>
                <SuggestionSource $source="openfoodfacts">OFF</SuggestionSource>
              </SuggestionItem>
            ))}
          </>
        )}

        {isLoading && suggestions.length === 0 && (
          <LoadingIndicator>
            <span className="material-symbols-outlined">hourglass_empty</span>
            Searching products...
          </LoadingIndicator>
        )}
      </Suggestions>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={handleCloseScanner}
          isProcessing={scanProcessing}
          successMessage={scanSuccess || undefined}
        />
      )}
    </Container>
  );
};
