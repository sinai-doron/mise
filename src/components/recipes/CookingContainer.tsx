import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { keyframes, css } from 'styled-components';
import type { RecipeStep, TimerState } from '../../types/Recipe';
import { formatQuantity } from '../../types/Recipe';
import { UnitToggle } from './UnitToggle';
import type { UnitSystem, TemperatureSystem } from '../../types/UnitConversion';

// Scaled ingredient type (from useRecipeEngine)
interface ScaledIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  notes?: string;
  scaledQuantity: number;
  originalQuantity: number;
  convertedQuantity: number;
  convertedUnit: string;
  canConvert: boolean;
}

// Color palette
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#131712',
  slate200: '#e2e8f0',
  slate500: '#64748b',
  slate700: '#334155',
};

const FullScreenContainer = styled.div<{ $rtl?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: ${colors.backgroundLight};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  direction: ${(props) => (props.$rtl ? 'rtl' : 'ltr')};

  &::selection {
    background: ${colors.primary};
    color: white;
  }
`;

const BackgroundDecor = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
`;

const DecorCircle = styled.div<{ $position: 'top' | 'bottom' }>`
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.6;

  ${(props) =>
    props.$position === 'top'
      ? `
    top: -10%;
    right: -5%;
    width: 40vw;
    height: 40vw;
    background: #dae4ea;
  `
      : `
    bottom: -10%;
    left: -5%;
    width: 30vw;
    height: 30vw;
    background: #dce7ee;
  `}
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  width: 100%;
  z-index: 20;
  flex-shrink: 0;
`;

const LogoGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  user-select: none;
`;

const LogoIcon = styled.div`
  color: ${colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;

  .material-symbols-outlined {
    font-size: 32px;
  }
`;

const LogoText = styled.h1`
  font-family: 'Noto Serif', Georgia, serif;
  font-size: 30px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0;
  letter-spacing: -0.02em;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  border: 1px solid ${colors.slate200};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
  }

  .material-symbols-outlined {
    font-size: 24px;
    color: ${colors.textMain};
    transition: transform 0.3s;
  }
`;

const CloseButton = styled(HeaderButton)`
  &:hover .material-symbols-outlined {
    transform: rotate(90deg);
  }
`;

const FullscreenButton = styled(HeaderButton)`
  &:hover .material-symbols-outlined {
    transform: scale(1.1);
  }
`;

const NewSessionButton = styled(HeaderButton)`
  &:hover .material-symbols-outlined {
    transform: rotate(360deg);
  }
`;

const WakeLockIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const MainContent = styled.main`
  flex: 1;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  z-index: 10;
  padding-bottom: 140px;

  @media (min-width: 768px) {
    padding: 0 48px;
    padding-bottom: 160px;
  }
`;

const ProgressSection = styled.div`
  width: 100%;
  max-width: 896px;
  margin: 0 auto 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ProgressLabels = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 4px;
`;

const StepLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${colors.primary};
`;

const PhaseLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.slate500};
`;

const ProgressBar = styled.div`
  display: flex;
  gap: 8px;
  height: 8px;
  width: 100%;
`;

const ProgressSegment = styled.div<{ $active: boolean }>`
  flex: 1;
  height: 100%;
  border-radius: 9999px;
  background: ${(props) => (props.$active ? colors.primary : colors.slate200)};
  transition: background 0.3s;
`;

const StepCard = styled.div`
  width: 100%;
  max-width: 896px;
  margin: 0 auto;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 40px -10px rgba(44, 62, 80, 0.15);
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.003);
  }

  @media (min-width: 768px) {
    border-radius: 40px;
    padding: 56px;
    gap: 40px;
  }

  @media (min-width: 1024px) {
    padding: 64px;
  }
`;

const StepContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (min-width: 768px) {
    gap: 32px;
  }
`;

const StepDescription = styled.h2`
  font-size: 28px;
  line-height: 1.15;
  font-weight: 600;
  color: ${colors.textMain};
  letter-spacing: -0.02em;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 40px;
  }

  @media (min-width: 1024px) {
    font-size: 48px;
  }
`;

const TipBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  background: #fff7ed;
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.2);
  font-size: 14px;
  font-weight: 600;

  .material-symbols-outlined {
    font-size: 18px;
    color: #f59e0b;
  }
`;

const TimerSection = styled.div`
  width: 100%;
  padding-top: 32px;
  border-top: 1px solid #f1f5f9;
`;

const TimerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 2.5rem;
  border: 1px solid ${colors.slate200};
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const TimerDisplay = styled.div`
  width: 100%;
  height: 80px;
  background: white;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(44, 62, 80, 0.05);
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover::before {
    opacity: 1;
  }

  @media (min-width: 640px) {
    flex: 1;
    height: 96px;
  }
`;

const TimerValue = styled.span`
  font-size: 48px;
  font-weight: 700;
  color: ${colors.primary};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.05em;
  position: relative;
  z-index: 1;

  @media (min-width: 640px) {
    font-size: 60px;
  }
`;

const TimerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
  padding: 0 8px 8px;

  @media (min-width: 640px) {
    width: auto;
    padding: 0 16px 0 0;
  }
`;

const ResetButton = styled.button`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${colors.primary};
    background: white;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  .material-symbols-outlined {
    font-size: 30px;
  }

  @media (min-width: 640px) {
    width: 64px;
    height: 64px;
  }
`;

const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
`;

const PlayButton = styled.button<{ $isRunning?: boolean }>`
  height: 64px;
  padding: 0 40px 0 32px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  box-shadow: 0 10px 20px -5px rgba(44, 62, 80, 0.3);
  transition: all 0.3s;

  &:hover {
    background: ${colors.primaryDark};
    box-shadow: 0 15px 30px -5px rgba(44, 62, 80, 0.4);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0) scale(0.95);
  }

  .material-symbols-outlined {
    font-size: 36px;
    transition: transform 0.2s;
  }

  &:hover .material-symbols-outlined {
    transform: scale(1.1);
  }

  @media (min-width: 640px) {
    height: 80px;
    padding: 0 40px 0 32px;

    .material-symbols-outlined {
      font-size: 40px;
    }
  }

  ${(props) =>
    props.$isRunning &&
    css`
      animation: ${pulseAnimation} 2s ease-in-out infinite;
    `}
`;

const PlayButtonText = styled.span`
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.025em;

  @media (min-width: 640px) {
    font-size: 20px;
  }
`;

const Footer = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 24px;
  background: linear-gradient(
    to top,
    ${colors.backgroundLight} 0%,
    ${colors.backgroundLight} 60%,
    transparent 100%
  );
  z-index: 30;

  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const FooterContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
`;

const NavButton = styled.button<{ $variant: 'back' | 'next' | 'finish'; $disabled?: boolean }>`
  height: 56px;
  padding: 0 24px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 16px;
  cursor: ${(props) => (props.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(props) => (props.$disabled ? 0.4 : 1)};
  transition: all 0.2s;

  .material-symbols-outlined {
    font-size: 24px;
  }

  ${(props) =>
    props.$variant === 'back'
      ? `
    background: transparent;
    border: 2px solid transparent;
    color: ${colors.slate700};

    &:hover:not(:disabled) {
      background: ${colors.slate200};
      border-color: #cbd5e1;
    }
  `
      : props.$variant === 'finish'
      ? `
    background: #22c55e;
    border: none;
    color: white;
    box-shadow: 0 10px 20px -5px rgba(34, 197, 94, 0.3);

    &:hover:not(:disabled) {
      background: #16a34a;
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -5px rgba(34, 197, 94, 0.4);
    }
  `
      : `
    background: ${colors.primary};
    border: none;
    color: white;
    box-shadow: 0 10px 20px -5px rgba(44, 62, 80, 0.3);

    &:hover:not(:disabled) {
      background: ${colors.primaryDark};
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -5px rgba(44, 62, 80, 0.4);
    }
  `}

  @media (min-width: 768px) {
    height: 64px;
    padding: 0 32px;
    font-size: 18px;
  }
`;

const ActiveTimersBar = styled.div`
  position: fixed;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: calc(100% - 48px);
`;

const ActiveTimerChip = styled.div<{ $isComplete: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${(props) => (props.$isComplete ? '#dcfce7' : 'white')};
  border: 1px solid ${(props) => (props.$isComplete ? '#22c55e' : colors.slate200)};
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => (props.$isComplete ? '#16a34a' : colors.textMain)};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

// Ingredients Drawer Styles
const IngredientsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid ${colors.slate200};
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.primary};
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    background: ${colors.backgroundLight};
    border-color: ${colors.primary};
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const DrawerOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.2s;
  z-index: 100;
`;

const DrawerContainer = styled.div<{ $isOpen: boolean; $rtl?: boolean }>`
  position: fixed;
  top: 0;
  ${props => props.$rtl ? 'left: 0;' : 'right: 0;'}
  height: 100%;
  width: 100%;
  max-width: 400px;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  transform: translateX(${props => props.$isOpen ? '0' : (props.$rtl ? '-100%' : '100%')});
  transition: transform 0.3s ease;
  z-index: 101;
  display: flex;
  flex-direction: column;
`;

const DrawerHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${colors.slate200};
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const DrawerTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DrawerTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${colors.textMain};
`;

const DrawerCloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  color: ${colors.slate500};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;

  &:hover {
    background: ${colors.backgroundLight};
    color: ${colors.textMain};
  }

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const DrawerControls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const ServingsControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${colors.backgroundLight};
  padding: 4px;
  border-radius: 8px;
`;

const ServingsBtn = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: ${colors.primary};
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: ${colors.primary};
    color: white;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const ServingsNum = styled.span`
  font-size: 16px;
  font-weight: 700;
  min-width: 28px;
  text-align: center;
`;

const DrawerContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
`;

const IngredientsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const IngredientRow = styled.li`
  padding: 12px 0;
  border-bottom: 1px solid ${colors.backgroundLight};

  &:last-child {
    border-bottom: none;
  }
`;

const IngredientCheckLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
`;

const IngredientCheckbox = styled.input`
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid ${colors.primary};
  border-radius: 6px;
  margin-top: 2px;
  cursor: pointer;
  display: grid;
  place-content: center;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    transform: scale(0);
    transition: transform 0.1s;
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

const IngredientInfo = styled.span<{ $checked: boolean }>`
  color: ${props => props.$checked ? colors.slate500 : colors.textMain};
  text-decoration: ${props => props.$checked ? 'line-through' : 'none'};
  transition: all 0.15s;
  line-height: 1.4;
`;

const IngredientQty = styled.span`
  font-weight: 700;
`;

interface CookingContainerProps {
  steps: RecipeStep[];
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  onClose: () => void;
  onResetSession?: () => void;
  timers: TimerState[];
  onStartTimer: (stepId: string, recipeId: string, duration: number) => void;
  onPauseTimer: (stepId: string) => void;
  onResumeTimer: (stepId: string) => void;
  onResetTimer: (stepId: string) => void;
  getTimerForStep: (stepId: string) => TimerState | undefined;
  recipeId: string;
  recipeTitle?: string;
  rtl?: boolean;
  // Ingredients drawer props
  scaledIngredients?: ScaledIngredient[];
  servings?: number;
  incrementServings?: () => void;
  decrementServings?: () => void;
  unitSystem?: UnitSystem;
  setUnitSystem?: (system: UnitSystem) => void;
  temperatureSystem?: TemperatureSystem;
  setTemperatureSystem?: (temp: TemperatureSystem) => void;
}

export const CookingContainer: React.FC<CookingContainerProps> = ({
  steps,
  currentStepIndex,
  onNext,
  onPrev,
  onFinish,
  onClose,
  onResetSession,
  timers,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  getTimerForStep,
  recipeId,
  rtl = false,
  // Ingredients drawer props
  scaledIngredients = [],
  servings = 4,
  incrementServings,
  decrementServings,
  unitSystem = 'original',
  setUnitSystem,
  temperatureSystem = 'celsius',
  setTemperatureSystem,
}) => {
  const { t } = useTranslation();

  // Safeguard: ensure steps is a valid array
  const safeSteps = Array.isArray(steps) ? steps : [];
  const currentStep = safeSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === safeSteps.length - 1;
  const activeTimers = Array.isArray(timers) ? timers.filter((timer) => timer.remaining > 0 || timer.isRunning) : [];

  const currentTimer = currentStep ? getTimerForStep(currentStep.id) : undefined;

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ingredients drawer state
  const [showIngredients, setShowIngredients] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Wake Lock - use ref to avoid re-render loops
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  // Wake lock effect - runs once on mount
  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;

      try {
        const lock = await navigator.wakeLock.request('screen');
        if (!isMounted) {
          lock.release();
          return;
        }
        wakeLockRef.current = lock;
        setIsWakeLockActive(true);

        lock.addEventListener('release', () => {
          if (isMounted) {
            wakeLockRef.current = null;
            setIsWakeLockActive(false);
          }
        });
      } catch (err) {
        console.log('Wake Lock request failed:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Fullscreen effect
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.log('Fullscreen toggle failed:', err);
    }
  };

  // Exit fullscreen and release wake lock when closing
  const handleClose = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerAction = () => {
    try {
      if (!currentStep) return;
      const timerDuration = currentStep.timer;
      if (timerDuration === undefined || timerDuration <= 0) return;

      if (currentTimer) {
        if (currentTimer.isRunning) {
          onPauseTimer(currentStep.id);
        } else {
          onResumeTimer(currentStep.id);
        }
      } else {
        onStartTimer(currentStep.id, recipeId, timerDuration);
      }
    } catch (error) {
      console.error('Timer action failed:', error);
    }
  };

  const handleResetTimer = () => {
    if (currentStep && currentTimer) {
      onResetTimer(currentStep.id);
    }
  };

  const getTimerIcon = () => {
    if (!currentTimer) return 'play_arrow';
    if (currentTimer.isRunning) return 'pause';
    if (currentTimer.remaining === 0) return 'check';
    return 'play_arrow';
  };

  const getButtonText = () => {
    if (!currentTimer) return t('cooking.start', 'Start');
    if (currentTimer.isRunning) return t('cooking.pause', 'Pause');
    if (currentTimer.remaining === 0) return t('cooking.done', 'Done');
    return t('cooking.resume', 'Resume');
  };

  if (!currentStep) {
    return null;
  }

  return (
    <FullScreenContainer $rtl={rtl}>
      <BackgroundDecor>
        <DecorCircle $position="top" />
        <DecorCircle $position="bottom" />
      </BackgroundDecor>

      <Header>
        <LogoGroup>
          <LogoIcon>
            <span className="material-symbols-outlined">skillet</span>
          </LogoIcon>
          <LogoText>Mise</LogoText>
          {isWakeLockActive && (
            <WakeLockIndicator title={t('cooking.screenWillStayOn')}>
              <span className="material-symbols-outlined">visibility</span>
              {t('cooking.screenOn')}
            </WakeLockIndicator>
          )}
        </LogoGroup>
        <HeaderActions>
          {scaledIngredients.length > 0 && (
            <IngredientsButton onClick={() => setShowIngredients(true)}>
              <span className="material-symbols-outlined">shopping_basket</span>
              {t('recipe.ingredients')}
            </IngredientsButton>
          )}
          {onResetSession && (
            <NewSessionButton
              onClick={onResetSession}
              aria-label={t('cooking.newSession')}
              title={t('cooking.newSession')}
            >
              <span className="material-symbols-outlined">restart_alt</span>
            </NewSessionButton>
          )}
          <FullscreenButton
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? t('cooking.exitFullscreen') : t('cooking.fullscreen')}
            title={isFullscreen ? t('cooking.exitFullscreen') : t('cooking.fullscreen')}
          >
            <span className="material-symbols-outlined">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </FullscreenButton>
          <CloseButton onClick={handleClose} aria-label={t('cooking.closeCookingMode')}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </HeaderActions>
      </Header>

      {activeTimers.length > 0 && (
        <ActiveTimersBar>
          {activeTimers.map((timer) => {
            const step = safeSteps.find((s) => s.id === timer.stepId);
            const isComplete = timer.remaining === 0;
            return (
              <ActiveTimerChip key={timer.stepId} $isComplete={isComplete}>
                <span className="material-symbols-outlined">
                  {isComplete ? 'check_circle' : 'timer'}
                </span>
                {t('cooking.step')} {step?.order}: {formatTime(timer.remaining)}
              </ActiveTimerChip>
            );
          })}
        </ActiveTimersBar>
      )}

      <MainContent>
        <ProgressSection>
          <ProgressLabels>
            <StepLabel>
              {t('cooking.stepOf', { current: currentStepIndex + 1, total: safeSteps.length })}
            </StepLabel>
            <PhaseLabel>
              {isFirstStep
                ? t('cooking.preparation')
                : isLastStep
                ? t('cooking.finishing')
                : t('cooking.cooking')}
            </PhaseLabel>
          </ProgressLabels>
          <ProgressBar>
            {safeSteps.map((_, idx) => (
              <ProgressSegment key={idx} $active={idx <= currentStepIndex} />
            ))}
          </ProgressBar>
        </ProgressSection>

        <StepCard>
          <StepContent>
            <StepDescription>{currentStep.description}</StepDescription>

            {currentStep.tips && (
              <TipBadge>
                <span className="material-symbols-outlined">lightbulb</span>
                <span>{currentStep.tips}</span>
              </TipBadge>
            )}
          </StepContent>

          {currentStep.timer != null && currentStep.timer > 0 && (
            <TimerSection>
              <TimerContainer>
                <TimerDisplay>
                  <TimerValue>
                    {formatTime(currentTimer?.remaining ?? currentStep.timer)}
                  </TimerValue>
                </TimerDisplay>
                <TimerActions>
                  {currentTimer && (
                    <ResetButton onClick={handleResetTimer} title={t('cooking.resetTimer')}>
                      <span className="material-symbols-outlined">replay</span>
                    </ResetButton>
                  )}
                  <PlayButton onClick={handleTimerAction} $isRunning={currentTimer?.isRunning}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {getTimerIcon()}
                    </span>
                    <PlayButtonText>{getButtonText()}</PlayButtonText>
                  </PlayButton>
                </TimerActions>
              </TimerContainer>
            </TimerSection>
          )}
        </StepCard>
      </MainContent>

      <Footer>
        <FooterContent>
          <NavButton
            $variant="back"
            $disabled={isFirstStep}
            onClick={onPrev}
            disabled={isFirstStep}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>{t('common.back')}</span>
          </NavButton>

          {isLastStep ? (
            <NavButton $variant="finish" onClick={onFinish}>
              <span>{t('cooking.finishCooking')}</span>
              <span className="material-symbols-outlined">celebration</span>
            </NavButton>
          ) : (
            <NavButton $variant="next" onClick={onNext}>
              <span>{t('cooking.nextStep')}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </NavButton>
          )}
        </FooterContent>
      </Footer>

      {/* Ingredients Drawer */}
      <DrawerOverlay $isOpen={showIngredients} onClick={() => setShowIngredients(false)} />
      <DrawerContainer $isOpen={showIngredients} $rtl={rtl}>
        <DrawerHeader>
          <DrawerTitleRow>
            <DrawerTitle>{t('recipe.ingredients')}</DrawerTitle>
            <DrawerCloseButton onClick={() => setShowIngredients(false)}>
              <span className="material-symbols-outlined">close</span>
            </DrawerCloseButton>
          </DrawerTitleRow>
          <DrawerControls>
            {incrementServings && decrementServings && (
              <ServingsControl>
                <ServingsBtn onClick={decrementServings} disabled={servings <= 1}>
                  <span className="material-symbols-outlined">remove</span>
                </ServingsBtn>
                <ServingsNum>{servings}</ServingsNum>
                <ServingsBtn onClick={incrementServings} disabled={servings >= 100}>
                  <span className="material-symbols-outlined">add</span>
                </ServingsBtn>
              </ServingsControl>
            )}
            {setUnitSystem && setTemperatureSystem && (
              <UnitToggle
                unitSystem={unitSystem}
                temperatureSystem={temperatureSystem}
                onUnitSystemChange={setUnitSystem}
                onTemperatureChange={setTemperatureSystem}
                showTemperature
                compact
              />
            )}
          </DrawerControls>
        </DrawerHeader>
        <DrawerContent>
          <IngredientsList>
            {scaledIngredients.map((ing) => {
              const isChecked = checkedIngredients.has(ing.id);
              const showConverted = unitSystem !== 'original' && ing.canConvert;
              const displayQty = showConverted ? ing.convertedQuantity : ing.scaledQuantity;
              const displayUnit = showConverted ? ing.convertedUnit : ing.unit;
              return (
                <IngredientRow key={ing.id}>
                  <IngredientCheckLabel>
                    <IngredientCheckbox
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleIngredient(ing.id)}
                    />
                    <IngredientInfo $checked={isChecked}>
                      <IngredientQty>{formatQuantity(displayQty)} {displayUnit}</IngredientQty>{' '}
                      {ing.name}
                      {ing.notes && ` (${ing.notes})`}
                    </IngredientInfo>
                  </IngredientCheckLabel>
                </IngredientRow>
              );
            })}
          </IngredientsList>
        </DrawerContent>
      </DrawerContainer>
    </FullScreenContainer>
  );
};
