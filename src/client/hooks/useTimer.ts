import { useEffect } from 'react';
import { useAppContext } from '../context/AppStateContext';

export function useSessionTimer() {
  const { state, dispatch, showToast } = useAppContext();

  useEffect(() => {
    if (!state.timerStarted || state.screen === 'print') {
      return;
    }
    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.timerStarted, state.screen, dispatch]);

  useEffect(() => {
    if (state.sessionTimeLeft <= 0 && state.timerStarted) {
      showToast('Waktu sesi habis!');
      dispatch({ type: 'RESET' });
    }
  }, [state.sessionTimeLeft, state.timerStarted, dispatch, showToast]);

  const showTimer = state.timerStarted && state.screen !== 'print' && state.screen !== 'idle';
  const minutes = Math.floor(state.sessionTimeLeft / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (state.sessionTimeLeft % 60).toString().padStart(2, '0');
  const display = `${minutes}:${seconds}`;
  const isDanger = state.sessionTimeLeft <= 30;

  return { showTimer, display, isDanger };
}
