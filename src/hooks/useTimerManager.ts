import { useEffect, useCallback, useRef } from 'react';
import { useRecipeStore } from '../stores/recipeStore';
import type { TimerState } from '../types/Recipe';

interface UseTimerManagerResult {
  timers: TimerState[];
  startTimer: (stepId: string, recipeId: string, duration: number) => void;
  pauseTimer: (stepId: string) => void;
  resumeTimer: (stepId: string) => void;
  resetTimer: (stepId: string) => void;
  removeTimer: (stepId: string) => void;
  getTimerForStep: (stepId: string) => TimerState | undefined;
  hasRunningTimers: boolean;
  completedTimers: TimerState[];
}

// Play sound using Web Audio API
const playTimerComplete = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();

    // Create a pattern: beep-beep-beep
    setTimeout(() => {
      gainNode.gain.value = 0;
    }, 150);
    setTimeout(() => {
      gainNode.gain.value = 0.3;
    }, 250);
    setTimeout(() => {
      gainNode.gain.value = 0;
    }, 400);
    setTimeout(() => {
      gainNode.gain.value = 0.3;
    }, 500);
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 650);
  } catch (error) {
    console.warn('Could not play timer sound:', error);
  }
};

export function useTimerManager(): UseTimerManagerResult {
  const timers = useRecipeStore((s) => s.activeTimers);
  const tickTimers = useRecipeStore((s) => s.tickTimers);
  const startTimerAction = useRecipeStore((s) => s.startTimer);
  const pauseTimerAction = useRecipeStore((s) => s.pauseTimer);
  const resumeTimerAction = useRecipeStore((s) => s.resumeTimer);
  const resetTimerAction = useRecipeStore((s) => s.resetTimer);
  const removeTimerAction = useRecipeStore((s) => s.removeTimer);

  // Track which timers have already played their completion sound
  const completedSoundPlayed = useRef<Set<string>>(new Set());

  // Interval to tick all timers
  useEffect(() => {
    const hasRunning = timers.some((t) => t.isRunning && t.remaining > 0);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      tickTimers();
    }, 1000);

    return () => clearInterval(interval);
  }, [timers, tickTimers]);

  // Check for completed timers and play sound
  useEffect(() => {
    timers.forEach((timer) => {
      if (
        timer.remaining === 0 &&
        timer.isRunning &&
        !completedSoundPlayed.current.has(timer.stepId)
      ) {
        completedSoundPlayed.current.add(timer.stepId);
        playTimerComplete();

        // Auto-pause when complete
        pauseTimerAction(timer.stepId);
      }
    });
  }, [timers, pauseTimerAction]);

  // Clear completed sound tracking when timer is reset or removed
  const resetTimer = useCallback(
    (stepId: string) => {
      completedSoundPlayed.current.delete(stepId);
      resetTimerAction(stepId);
    },
    [resetTimerAction]
  );

  const removeTimer = useCallback(
    (stepId: string) => {
      completedSoundPlayed.current.delete(stepId);
      removeTimerAction(stepId);
    },
    [removeTimerAction]
  );

  // Get timer for a specific step
  const getTimerForStep = useCallback(
    (stepId: string) => {
      return timers.find((t) => t.stepId === stepId);
    },
    [timers]
  );

  // Check if any timers are running
  const hasRunningTimers = timers.some((t) => t.isRunning && t.remaining > 0);

  // Get completed timers
  const completedTimers = timers.filter((t) => t.remaining === 0);

  return {
    timers,
    startTimer: startTimerAction,
    pauseTimer: pauseTimerAction,
    resumeTimer: resumeTimerAction,
    resetTimer,
    removeTimer,
    getTimerForStep,
    hasRunningTimers,
    completedTimers,
  };
}
