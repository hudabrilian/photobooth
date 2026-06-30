import { useEffect } from 'react';
import { useAppContext } from '../context/AppStateContext';
import { generateTestImages } from '../utils/testData';

interface DevShortcutParams {
  onTrigger: () => void;
}

export function useDevShortcuts({ onTrigger }: DevShortcutParams) {
  const { capturedImages, dispatch } = useAppContext();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F' && import.meta.env.DEV) {
        e.preventDefault();
        capturedImages.current = generateTestImages(3);
        dispatch({ type: 'SELECT_TEMPLATE', payload: 'frame1' });
        dispatch({ type: 'SET_PHOTOS_NEEDED', payload: 3 });
        dispatch({ type: 'SET_CAPTURED_COUNT', payload: 3 });
        onTrigger();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [capturedImages, dispatch, onTrigger]);
}
