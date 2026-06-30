import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type { AppState, AppAction, Screen } from '../types';
import { applyFilterToImageData } from '../utils/filters';

const initialState: AppState = {
  screen: 'idle',
  selectedTemplate: null,
  activeFilter: 'none',
  photosNeeded: 1,
  capturedCount: 0,
  sessionTimeLeft: 300,
  timerStarted: false,
  sessionId: null,
  printStatus: 'idle',
  doodleEnabled: false,
  selectedDoodleTheme: 'auto',
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };
    case 'SELECT_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'SET_FILTER':
      return { ...state, activeFilter: action.payload };
    case 'SET_PHOTOS_NEEDED':
      return { ...state, photosNeeded: action.payload };
    case 'INCREMENT_CAPTURED':
      return { ...state, capturedCount: state.capturedCount + 1 };
    case 'RESET_CAPTURED':
      return { ...state, capturedCount: 0 };
    case 'SET_CAPTURED_COUNT':
      return { ...state, capturedCount: action.payload };
    case 'SET_SESSION_TIME':
      return { ...state, sessionTimeLeft: action.payload };
    case 'TICK_TIMER':
      return { ...state, sessionTimeLeft: state.sessionTimeLeft - 1 };
    case 'START_TIMER':
      return { ...state, timerStarted: true, sessionTimeLeft: 300 };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_PRINT_STATUS':
      return { ...state, printStatus: action.payload };
    case 'TOGGLE_DOODLES':
      return { ...state, doodleEnabled: action.payload };
    case 'SET_DOODLE_THEME':
      return { ...state, selectedDoodleTheme: action.payload };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  capturedImages: React.MutableRefObject<ImageData[]>;
  filteredImages: React.MutableRefObject<ImageData[]>;
  doodledImages: React.MutableRefObject<ImageData[]>;
  sessionVideo: React.MutableRefObject<Blob | null>;
  goTo: (screen: Screen) => void;
  resetApp: () => void;
  applyFilter: (filterName: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const capturedImages = useRef<ImageData[]>([]);
  const filteredImages = useRef<ImageData[]>([]);
  const doodledImages = useRef<ImageData[]>([]);
  const sessionVideo = useRef<Blob | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const goTo = useCallback(
    (screen: Screen) => {
      dispatch({ type: 'SET_SCREEN', payload: screen });
    },
    [dispatch]
  );

  const resetApp = useCallback(() => {
    capturedImages.current = [];
    filteredImages.current = [];
    doodledImages.current = [];
    sessionVideo.current = null;
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const applyFilter = useCallback(
    (filterName: string) => {
      dispatch({ type: 'SET_FILTER', payload: filterName });
      filteredImages.current = capturedImages.current.map((img) =>
        applyFilterToImageData(img, filterName)
      );
      // Reset doodled images since base filtered images changed
      doodledImages.current = [];
    },
    [dispatch]
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        capturedImages,
        filteredImages,
        doodledImages,
        sessionVideo,
        goTo,
        resetApp,
        applyFilter,
        toastMessage,
        showToast,
        clearToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
