import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const Container = styled.div<{ $isComplete: boolean; $isRunning: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${(props) =>
    props.$isComplete
      ? 'rgba(34, 197, 94, 0.1)'
      : props.$isRunning
      ? 'rgba(245, 158, 11, 0.1)'
      : '#f5f5f5'};
  border-radius: 8px;
  border: 1px solid ${(props) =>
    props.$isComplete
      ? 'rgba(34, 197, 94, 0.3)'
      : props.$isRunning
      ? 'rgba(245, 158, 11, 0.3)'
      : '#e0e0e0'};

  ${(props) =>
    props.$isComplete &&
    css`
      animation: ${pulse} 1s ease-in-out infinite;
    `}
`;

const TimeDisplay = styled.span<{ $isComplete: boolean }>`
  font-size: 18px;
  font-weight: 600;
  font-family: monospace;
  color: ${(props) => (props.$isComplete ? '#22c55e' : '#333')};
  min-width: 60px;
`;

const Controls = styled.div`
  display: flex;
  gap: 4px;
`;

const IconButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  background: ${(props) =>
    props.$variant === 'primary' ? '#f59e0b' : 'white'};
  color: ${(props) => (props.$variant === 'primary' ? 'white' : '#666')};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:hover {
    background: ${(props) =>
      props.$variant === 'primary' ? '#d97706' : '#f0f0f0'};
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const ProgressBar = styled.div<{ $progress: number }>`
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${(props) => props.$progress}%;
    height: 100%;
    background: #f59e0b;
    transition: width 0.5s linear;
  }
`;

interface TimerDisplayProps {
  remaining: number;
  totalDuration: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  remaining,
  totalDuration,
  isRunning,
  onStart,
  onPause,
  onReset,
}) => {
  const isComplete = remaining === 0;
  const progress = ((totalDuration - remaining) / totalDuration) * 100;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container $isComplete={isComplete} $isRunning={isRunning}>
      <span className="material-symbols-outlined" style={{ color: isComplete ? '#22c55e' : '#f59e0b' }}>
        {isComplete ? 'check_circle' : 'timer'}
      </span>
      <TimeDisplay $isComplete={isComplete}>
        {formatTime(remaining)}
      </TimeDisplay>
      <ProgressBar $progress={progress} />
      <Controls>
        {!isComplete && (
          isRunning ? (
            <IconButton onClick={onPause} title="Pause">
              <span className="material-symbols-outlined">pause</span>
            </IconButton>
          ) : (
            <IconButton onClick={onStart} $variant="primary" title="Start">
              <span className="material-symbols-outlined">play_arrow</span>
            </IconButton>
          )
        )}
        <IconButton onClick={onReset} title="Reset">
          <span className="material-symbols-outlined">replay</span>
        </IconButton>
      </Controls>
    </Container>
  );
};
