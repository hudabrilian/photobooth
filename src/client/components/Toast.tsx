import { useEffect } from 'react';

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div id="global-toast">
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}>
        [ OK ]
      </button>
    </div>
  );
}
