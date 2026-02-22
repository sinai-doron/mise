import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CookingContainer } from './CookingContainer';
import { UnitToggle } from './UnitToggle';
import { ShareRecipeModal } from './ShareRecipeModal';
import { AddToCollectionModal } from '../AddToCollectionModal';
import { useRecipeEngine } from '../../hooks/useRecipeEngine';
import { useTimerManager } from '../../hooks/useTimerManager';
import { useRecipeStore } from '../../stores/recipeStore';
import { formatQuantity, isRTL } from '../../types/Recipe';
import type { Recipe } from '../../types/Recipe';
import { generateRecipePlaceholder } from '../../utils/recipePlaceholder';
import { sanitize } from '../../utils/sanitize';

// Helper to format seconds to human readable
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} שניות`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours} שעה`;
  return `${hours} שעה ו-${remainingMins} דקות`;
};

// Color palette from design
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  amber500: '#f59e0b',
  orange50: '#fff7ed',
  orange200: '#fed7aa',
};

const Container = styled.div<{ $rtl?: boolean }>`
  background: ${colors.backgroundLight};
  min-height: 100vh;
  direction: ${(props) => (props.$rtl ? 'rtl' : 'ltr')};
  text-align: ${(props) => (props.$rtl ? 'right' : 'left')};
`;

const HeroSection = styled.div`
  position: relative;
  width: 100%;
  height: 350px;
  overflow: hidden;

  @media (min-width: 768px) {
    height: 450px;
  }

  @media (min-width: 1024px) {
    height: 500px;
  }
`;

const HeroImage = styled.div<{ $image?: string }>`
  width: 100%;
  height: 100%;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.backgroundLight} 0%, #e0e0e0 100%)`};
  transition: transform 0.7s ease-out;

  ${HeroSection}:hover & {
    transform: scale(1.05);
  }
`;

const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 50%);
  z-index: 1;
`;

const CloseButton = styled.button<{ $rtl?: boolean }>`
  position: absolute;
  top: 16px;
  ${(props) => (props.$rtl ? 'right: 16px;' : 'left: 16px;')}
  z-index: 20;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.05);
  }

  .material-symbols-outlined {
    font-size: 24px;
    transform: ${(props) => (props.$rtl ? 'scaleX(-1)' : 'none')};
  }
`;

const MobileMeta = styled.div`
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;

  @media (min-width: 768px) {
    display: none;
  }
`;

const HeroStartButton = styled.button`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: none;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: ${colors.primary};
  color: white;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

  @media (min-width: 768px) {
    display: flex;
  }

  &:hover {
    background: ${colors.primaryDark};
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  }

  .material-symbols-outlined {
    font-size: 22px;
  }
`;

const MetaBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  padding: 8px 12px;
  border-radius: 9999px;

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const TitleSection = styled.div`
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 32px;
  border-bottom: 1px solid rgba(44, 62, 80, 0.1);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

const TitleContent = styled.div`
  flex: 1;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  background: rgba(44, 62, 80, 0.1);
  color: ${colors.primary};
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 12px;
`;

const RatingContainer = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  vertical-align: middle;
`;

const StarIcon = styled.span`
  color: ${colors.amber500};
  font-size: 18px;
`;

const ReviewCount = styled.span`
  font-size: 12px;
  color: ${colors.slate500};
  margin-left: 4px;
`;

const RecipeTitle = styled.h1`
  margin: 12px 0 8px;
  font-size: 36px;
  font-weight: 900;
  color: ${colors.textMain};
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-family: 'Playfair Display', Georgia, serif;

  @media (min-width: 768px) {
    font-size: 48px;
  }
`;

const AuthorText = styled.p`
  margin: 0;
  font-size: 18px;
  color: ${colors.slate600};
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
`;

const SourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: ${colors.slate500};
  text-decoration: none;
  transition: color 0.15s;

  &:hover {
    color: ${colors.primary};
    text-decoration: underline;
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

// Helper to ensure URL has a protocol
const ensureProtocol = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return 'https://' + url;
};

const StatCards = styled.div`
  display: none;
  gap: 16px;

  @media (min-width: 768px) {
    display: flex;
  }
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${colors.surface};
  width: 112px;
  height: 112px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(44, 62, 80, 0.05);

  .material-symbols-outlined {
    font-size: 28px;
    color: ${colors.primary};
    margin-bottom: 4px;
  }
`;

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: ${colors.slate500};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  margin-top: 40px;

  @media (min-width: 1024px) {
    grid-template-columns: 380px 1fr;
  }
`;

const IngredientsPanel = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px -10px rgba(44, 62, 80, 0.15);
  height: fit-content;

  @media (min-width: 1024px) {
    position: sticky;
    top: 96px;
  }
`;

const IngredientHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const IngredientTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textMain};
  font-family: 'Playfair Display', Georgia, serif;
  margin: 0;
`;

const ServingsControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ServingsButton = styled.button`
  color: ${colors.primary};
  padding: 8px;
  border-radius: 9999px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const ServingsValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  width: 24px;
  text-align: center;
`;

const IngredientList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const IngredientItem = styled.li`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const IngredientLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  user-select: none;

  &:hover span {
    color: ${colors.primary};
  }
`;

const Checkbox = styled.input`
  appearance: none;
  background: transparent;
  border: 2px solid ${colors.primary};
  border-radius: 6px;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  display: grid;
  place-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    transform: scale(0);
    transition: transform 0.12s ease-in-out;
    box-shadow: inset 1em 1em white;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }

  &:checked {
    background: ${colors.primary};
  }

  &:checked::before {
    transform: scale(1);
  }
`;

const IngredientText = styled.span<{ $checked?: boolean }>`
  color: ${(props) => (props.$checked ? colors.slate500 : colors.textMain)};
  line-height: 1.4;
  transition: color 0.15s;
  text-decoration: ${(props) => (props.$checked ? 'line-through' : 'none')};
`;

const IngredientQuantity = styled.span`
  font-weight: 700;
`;

const ShoppingListDivider = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px dashed ${colors.slate500};
`;

const ShoppingListButton = styled.button`
  width: 100%;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${colors.primary};
  font-weight: 700;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.05);
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const SidebarStartButton = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: ${colors.primary};
  color: white;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.25);

  &:hover {
    background: ${colors.primaryDark};
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(44, 62, 80, 0.3);
  }

  .material-symbols-outlined {
    font-size: 22px;
  }
`;

const ContentColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const AboutSection = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
`;

const SectionTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textMain};
  font-family: 'Playfair Display', Georgia, serif;
  margin: 0 0 16px;
`;

const AboutText = styled.p`
  color: ${colors.slate700};
  font-size: 18px;
  line-height: 1.7;
  margin: 0 0 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const NutritionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const NutritionCard = styled.div`
  background: rgba(255, 255, 255, 0.5);
  padding: 16px;
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(44, 62, 80, 0.05);
`;

const NutritionValue = styled.span`
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: ${colors.primary};
`;

const NutritionLabel = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${colors.slate500};
`;

const ChefTipSection = styled.div`
  margin-top: 8px;
`;

const ChefTipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .material-symbols-outlined {
    color: ${colors.primary};
    font-size: 20px;
  }
`;

const ChefTipTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0;
`;

const ChefTipCard = styled.div<{ $rtl?: boolean }>`
  background: ${colors.orange50};
  padding: 16px;
  ${(props) => props.$rtl ? `
    border-right: 4px solid ${colors.orange200};
    border-radius: 8px 0 0 8px;
  ` : `
    border-left: 4px solid ${colors.orange200};
    border-radius: 0 8px 8px 0;
  `}
`;

const ChefTipText = styled.p`
  font-size: 14px;
  color: ${colors.slate700};
  font-style: italic;
  margin: 0;
  line-height: 1.6;
`;

const StepsSection = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
`;

const StepsList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: step-counter;
`;

const StepItem = styled.li<{ $rtl?: boolean }>`
  position: relative;
  padding-bottom: 24px;
  margin-bottom: 8px;

  ${(props) => props.$rtl ? `
    padding-right: 56px;
    border-right: 2px solid rgba(44, 62, 80, 0.1);
    margin-right: 20px;
  ` : `
    padding-left: 56px;
    border-left: 2px solid rgba(44, 62, 80, 0.1);
    margin-left: 20px;
  `}

  &:last-child {
    ${(props) => props.$rtl ? 'border-right: 2px solid transparent;' : 'border-left: 2px solid transparent;'}
    padding-bottom: 0;
    margin-bottom: 0;
  }

  &::before {
    counter-increment: step-counter;
    content: counter(step-counter);
    position: absolute;
    ${(props) => props.$rtl ? 'right: -21px;' : 'left: -21px;'}
    top: 0;
    width: 40px;
    height: 40px;
    background: ${colors.primary};
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
  }
`;

const StepDescription = styled.p`
  font-size: 16px;
  color: ${colors.textMain};
  line-height: 1.6;
  margin: 0 0 8px 0;
`;

const StepMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
`;

const StepTimer = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(44, 62, 80, 0.08);
  color: ${colors.primary};
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const StepTip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: ${colors.orange50};
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: ${colors.slate700};
  margin-top: 12px;

  .material-symbols-outlined {
    font-size: 16px;
    color: ${colors.amber500};
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const ActionButtonsContainer = styled.div<{ $rtl?: boolean }>`
  position: absolute;
  top: 16px;
  ${(props) => (props.$rtl ? 'left: 16px;' : 'right: 16px;')}
  z-index: 20;
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 22px;
  }
`;

const DeleteButton = styled(ActionButton)`
  &:hover {
    background: rgba(239, 68, 68, 0.9);
  }
`;

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Determine if the recipe is RTL based on language
  const rtl = isRTL(recipe.language);

  const {
    servings,
    scaledIngredients,
    incrementServings,
    decrementServings,
    unitSystem,
    temperatureSystem,
    setUnitSystem,
    setTemperatureSystem,
    convertedSteps,
  } = useRecipeEngine(recipe.id);

  const {
    timers,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    getTimerForStep,
  } = useTimerManager();

  const addToGroceryList = useRecipeStore((s) => s.addToGroceryList);
  const resetCookingSession = useRecipeStore((s) => s.resetCookingSession);

  const totalTime = recipe.prepTime + recipe.cookTime;

  const handleToggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon key={`full-${i}`} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          star
        </StarIcon>
      );
    }
    if (hasHalfStar) {
      stars.push(
        <StarIcon key="half" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          star_half
        </StarIcon>
      );
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="material-symbols-outlined">
          star
        </StarIcon>
      );
    }
    return stars;
  };

  const getDifficultyLabel = (difficulty: string) => {
    return t(`recipe.difficultyShort.${difficulty}`, { defaultValue: difficulty });
  };

  const handleStartCooking = () => {
    setIsCookingMode(true);
    setCurrentStepIndex(0);
  };

  const handleExitCooking = () => {
    setIsCookingMode(false);
  };

  const handleNextStep = () => {
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinishCooking = () => {
    setIsCookingMode(false);
    setCurrentStepIndex(0);
  };

  const handleResetSession = () => {
    resetCookingSession(recipe.id);
    setCurrentStepIndex(0);
  };

  const handleAddToShoppingList = () => {
    addToGroceryList(recipe.id);
    navigate('/shopping');
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleAddToCollection = () => {
    setShowCollectionModal(true);
  };

  if (isCookingMode) {
    return (
      <CookingContainer
        steps={convertedSteps}
        currentStepIndex={currentStepIndex}
        onNext={handleNextStep}
        onPrev={handlePrevStep}
        onFinish={handleFinishCooking}
        onClose={handleExitCooking}
        onResetSession={handleResetSession}
        timers={timers}
        onStartTimer={startTimer}
        onPauseTimer={pauseTimer}
        onResumeTimer={resumeTimer}
        onResetTimer={resetTimer}
        getTimerForStep={getTimerForStep}
        recipeId={recipe.id}
        recipeTitle={recipe.title}
        rtl={rtl}
        // Ingredients drawer props
        scaledIngredients={scaledIngredients}
        servings={servings}
        incrementServings={incrementServings}
        decrementServings={decrementServings}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        temperatureSystem={temperatureSystem}
        setTemperatureSystem={setTemperatureSystem}
      />
    );
  }

  return (
    <Container $rtl={rtl}>
      <HeroSection>
        <HeroOverlay />
        <CloseButton $rtl={rtl} onClick={onClose}>
          <span className="material-symbols-outlined">arrow_back</span>
        </CloseButton>
        <ActionButtonsContainer $rtl={rtl}>
          <ActionButton
            onClick={handleAddToCollection}
            title={t('collection.addToCollection')}
          >
            <span className="material-symbols-outlined">library_add</span>
          </ActionButton>
          <ActionButton
            onClick={handleShare}
            title={t('recipe.detail.shareRecipe')}
          >
            <span className="material-symbols-outlined">share</span>
          </ActionButton>
          {onEdit && (
            <ActionButton onClick={onEdit} title={t('recipe.detail.editRecipe')}>
              <span className="material-symbols-outlined">edit</span>
            </ActionButton>
          )}
          {onDelete && (
            <DeleteButton onClick={onDelete} title={t('recipe.detail.deleteRecipe')}>
              <span className="material-symbols-outlined">delete</span>
            </DeleteButton>
          )}
        </ActionButtonsContainer>
        <HeroImage $image={recipe.image || generateRecipePlaceholder(recipe.id, recipe.title)} />
        <MobileMeta>
          <MetaBadge>
            <span className="material-symbols-outlined">schedule</span>
            {totalTime}m
          </MetaBadge>
          <MetaBadge>
            <span className="material-symbols-outlined">group</span>
            {servings}
          </MetaBadge>
        </MobileMeta>
        <HeroStartButton onClick={handleStartCooking}>
          <span className="material-symbols-outlined">play_circle</span>
          {t('recipe.detail.startCooking')}
        </HeroStartButton>
      </HeroSection>

      <TitleSection>
        <TitleContent>
          <div style={{ marginBottom: 12 }}>
            <CategoryBadge>{recipe.category}</CategoryBadge>
            {recipe.rating && (
              <RatingContainer>
                {renderStars(recipe.rating)}
                {recipe.reviewCount && (
                  <ReviewCount>({recipe.reviewCount} {t('recipe.reviews')})</ReviewCount>
                )}
              </RatingContainer>
            )}
          </div>
          <RecipeTitle>{sanitize(recipe.title)}</RecipeTitle>
          {recipe.author && <AuthorText>{t('common.by')} {recipe.author}</AuthorText>}
          {recipe.sourceUrl && (
            <SourceLink href={ensureProtocol(recipe.sourceUrl)} target="_blank" rel="noopener noreferrer">
              <span className="material-symbols-outlined">open_in_new</span>
              {t('recipe.viewOriginal', { defaultValue: 'View original recipe' })}
            </SourceLink>
          )}
        </TitleContent>

        <StatCards>
          <StatCard>
            <span className="material-symbols-outlined">schedule</span>
            <StatValue>{totalTime}</StatValue>
            <StatLabel>{t('common.mins')}</StatLabel>
          </StatCard>
          <StatCard>
            <span className="material-symbols-outlined">signal_cellular_alt</span>
            <StatValue>{getDifficultyLabel(recipe.difficulty)}</StatValue>
            <StatLabel>{t('recipe.level')}</StatLabel>
          </StatCard>
          <StatCard>
            <span className="material-symbols-outlined">restaurant</span>
            <StatValue>{servings}</StatValue>
            <StatLabel>{t('recipe.servings')}</StatLabel>
          </StatCard>
        </StatCards>
      </TitleSection>

      <MainGrid>
        <IngredientsPanel>
          <IngredientHeader>
            <IngredientTitle>{t('recipe.ingredients')}</IngredientTitle>
            <ControlsRow>
              <ServingsControls>
                <ServingsButton onClick={decrementServings} disabled={servings <= 1}>
                  <span className="material-symbols-outlined">remove</span>
                </ServingsButton>
                <ServingsValue>{servings}</ServingsValue>
                <ServingsButton onClick={incrementServings} disabled={servings >= 100}>
                  <span className="material-symbols-outlined">add</span>
                </ServingsButton>
              </ServingsControls>
              <UnitToggle
                unitSystem={unitSystem}
                temperatureSystem={temperatureSystem}
                onUnitSystemChange={setUnitSystem}
                onTemperatureChange={setTemperatureSystem}
                showTemperature
                compact
              />
            </ControlsRow>
          </IngredientHeader>

          <IngredientList>
            {scaledIngredients.map((ing) => {
              const isChecked = checkedIngredients.has(ing.id);
              // Show converted quantity if unit system is not original and conversion is possible
              const showConverted = unitSystem !== 'original' && ing.canConvert;
              const displayQty = showConverted ? ing.convertedQuantity : ing.scaledQuantity;
              const displayUnit = showConverted ? ing.convertedUnit : ing.unit;
              return (
                <IngredientItem key={ing.id}>
                  <IngredientLabel>
                    <Checkbox
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleIngredient(ing.id)}
                    />
                    <IngredientText $checked={isChecked}>
                      <IngredientQuantity>
                        {formatQuantity(displayQty)} {displayUnit}
                      </IngredientQuantity>{' '}
                      {ing.name}
                      {ing.notes && ` (${ing.notes})`}
                    </IngredientText>
                  </IngredientLabel>
                </IngredientItem>
              );
            })}
          </IngredientList>

          <ShoppingListDivider>
            <ShoppingListButton onClick={handleAddToShoppingList}>
              <span className="material-symbols-outlined">shopping_cart</span>
              {t('recipe.detail.addToShoppingList')}
            </ShoppingListButton>
          </ShoppingListDivider>

          <SidebarStartButton onClick={handleStartCooking}>
            <span className="material-symbols-outlined">play_circle</span>
            {t('recipe.detail.startCooking')}
          </SidebarStartButton>
        </IngredientsPanel>

        <ContentColumn>
          {(recipe.aboutDish || recipe.description) && (
            <AboutSection>
              <SectionTitle>{t('recipe.aboutDish')}</SectionTitle>
              <AboutText>{sanitize(recipe.aboutDish || recipe.description)}</AboutText>
            </AboutSection>
          )}

          {recipe.nutrition && (
            <NutritionGrid>
              <NutritionCard>
                <NutritionValue>{recipe.nutrition.calories}</NutritionValue>
                <NutritionLabel>{t('recipe.nutrition.calories')}</NutritionLabel>
              </NutritionCard>
              <NutritionCard>
                <NutritionValue>{recipe.nutrition.protein}g</NutritionValue>
                <NutritionLabel>{t('recipe.nutrition.protein')}</NutritionLabel>
              </NutritionCard>
              <NutritionCard>
                <NutritionValue>{recipe.nutrition.carbs}g</NutritionValue>
                <NutritionLabel>{t('recipe.nutrition.carbs')}</NutritionLabel>
              </NutritionCard>
              <NutritionCard>
                <NutritionValue>{recipe.nutrition.fat}g</NutritionValue>
                <NutritionLabel>{t('recipe.nutrition.fat')}</NutritionLabel>
              </NutritionCard>
            </NutritionGrid>
          )}

          {recipe.chefTip && (
            <ChefTipSection>
              <ChefTipHeader>
                <span className="material-symbols-outlined">tips_and_updates</span>
                <ChefTipTitle>{t('recipe.chefTips')}</ChefTipTitle>
              </ChefTipHeader>
              <ChefTipCard $rtl={rtl}>
                <ChefTipText>"{sanitize(recipe.chefTip)}"</ChefTipText>
              </ChefTipCard>
            </ChefTipSection>
          )}

          {convertedSteps.length > 0 && (
            <StepsSection>
              <SectionTitle>{t('recipe.instructions')}</SectionTitle>
              <StepsList>
                {convertedSteps.map((step) => (
                  <StepItem key={step.id} $rtl={rtl}>
                    <StepDescription>{sanitize(step.description)}</StepDescription>
                    {(step.timer || step.tips) && (
                      <StepMeta>
                        {step.timer && (
                          <StepTimer>
                            <span className="material-symbols-outlined">timer</span>
                            {formatDuration(step.timer)}
                          </StepTimer>
                        )}
                      </StepMeta>
                    )}
                    {step.tips && (
                      <StepTip>
                        <span className="material-symbols-outlined">lightbulb</span>
                        {sanitize(step.tips)}
                      </StepTip>
                    )}
                  </StepItem>
                ))}
              </StepsList>
            </StepsSection>
          )}
        </ContentColumn>
      </MainGrid>

      {showShareModal && (
        <ShareRecipeModal
          recipe={recipe}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showCollectionModal && (
        <AddToCollectionModal
          recipeId={recipe.id}
          onClose={() => setShowCollectionModal(false)}
        />
      )}
    </Container>
  );
};
