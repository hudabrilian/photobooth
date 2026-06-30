import { useEffect, useRef, useState } from "react";
import { useAppContext } from "./context/AppStateContext";
import type { Screen } from "./types";
import { IdleScreen } from "./screens/IdleScreen";
import { PaymentScreen } from "./screens/PaymentScreen";
import { TemplateScreen } from "./screens/TemplateScreen";
import { CaptureScreen } from "./screens/CaptureScreen";
import { FilterScreen } from "./screens/FilterScreen";
import { FormScreen } from "./screens/FormScreen";
import { PrintScreen } from "./screens/PrintScreen";
import { useSessionTimer } from "./hooks/useTimer";
import { useDevShortcuts } from "./hooks/useDevShortcuts";
import { Toast } from "./components/Toast";

const SCREENS = {
  idle: IdleScreen,
  payment: PaymentScreen,
  template: TemplateScreen,
  capture: CaptureScreen,
  filter: FilterScreen,
  form: FormScreen,
  print: PrintScreen,
} as const;

const SCREEN_ORDER: Screen[] = [
  "idle", "payment", "template", "capture", "filter", "form", "print",
];

type TransitionDir = "forward" | "backward" | "reset";

function getDirection(from: Screen, to: Screen): TransitionDir {
  if (to === "idle" && from !== "idle") return "reset";
  const fi = SCREEN_ORDER.indexOf(from);
  const ti = SCREEN_ORDER.indexOf(to);
  return ti > fi ? "forward" : "backward";
}

export function App() {
  const { state, goTo, toastMessage, clearToast } = useAppContext();
  const renderedScreenRef = useRef(state.screen);
  const [wrapperClass, setWrapperClass] = useState("");
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showTimer, display, isDanger } = useSessionTimer();

  useDevShortcuts({
    onTrigger: () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      exitTimerRef.current = null;
      enterTimerRef.current = null;
      renderedScreenRef.current = "filter";
      setWrapperClass("");
      goTo("filter");
    },
  });

  useEffect(() => {
    const target = state.screen;
    const current = renderedScreenRef.current;
    if (target === current) return;

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    exitTimerRef.current = null;
    enterTimerRef.current = null;

    const dir = getDirection(current, target);

    if ('startViewTransition' in document) {
      // Modern View Transitions API (progressive enhancement)
      (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        renderedScreenRef.current = target;
        setWrapperClass(`view-transition-${dir}`);
      });
      const timer = setTimeout(() => {
        setWrapperClass("");
      }, 350);
      return () => clearTimeout(timer);
    } else {
      // Fallback for older browsers
      const exitMs = dir === "reset" ? 200 : 250;
      const enterMs = dir === "reset" ? 250 : 300;

      setWrapperClass(`screen-exit-${dir}`);

      exitTimerRef.current = setTimeout(() => {
        exitTimerRef.current = null;
        renderedScreenRef.current = target;
        setWrapperClass(`screen-enter-${dir}`);

        enterTimerRef.current = setTimeout(() => {
          enterTimerRef.current = null;
          setWrapperClass("");
        }, enterMs);
      }, exitMs);

      return () => {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      };
    }
  }, [state.screen]);

  const ScreenComponent = SCREENS[renderedScreenRef.current];

  return (
    <>
      {showTimer && (
        <div
          id="global-timer"
          className={isDanger ? "danger" : ""}
          role="timer"
          aria-live="polite"
          aria-label={`Session time remaining: ${display}`}
        >
          {display}
        </div>
      )}
      <div className={wrapperClass ? `screen-wrap ${wrapperClass}` : "screen-wrap"}>
        <ScreenComponent />
      </div>
      {toastMessage && <Toast message={toastMessage} onClose={clearToast} />}
    </>
  );
}
