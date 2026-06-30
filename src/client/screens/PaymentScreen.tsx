import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAppContext } from '../context/AppStateContext';

export function PaymentScreen() {
  const { goTo, dispatch } = useAppContext();
  const [confirmed, setConfirmed] = useState(false);

  const handleSimulate = () => {
    setConfirmed(true);
    setTimeout(() => {
      dispatch({ type: 'START_TIMER' });
      goTo('template');
    }, 800);
  };

  return (
    <section className="screen" role="main" aria-label="Payment screen">
      <ScreenHeader title="Payment" step="Step 1 of 5" onBack={confirmed ? undefined : () => goTo('idle')} />
      <div className="payment-body">
        <p className="payment-instruction">
          Scan the QRIS code below with your e-wallet app
        </p>
        <div className="qris-frame" role="img" aria-label="QRIS payment QR code">
          <svg
            className="qris-svg"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="200" height="200" fill="#fff" />
            <rect x="10" y="10" width="55" height="55" fill="none" stroke="#000" strokeWidth="6" />
            <rect x="20" y="20" width="35" height="35" fill="#000" />
            <rect x="135" y="10" width="55" height="55" fill="none" stroke="#000" strokeWidth="6" />
            <rect x="145" y="20" width="35" height="35" fill="#000" />
            <rect x="10" y="135" width="55" height="55" fill="none" stroke="#000" strokeWidth="6" />
            <rect x="20" y="145" width="35" height="35" fill="#000" />
            {/* Additional QRIS decorative pattern blocks */}
            <rect x="80" y="10" width="6" height="6" fill="#000" />
            <rect x="92" y="10" width="6" height="6" fill="#000" />
            <rect x="104" y="10" width="6" height="6" fill="#000" />
            <rect x="116" y="10" width="6" height="6" fill="#000" />
            <rect x="80" y="25" width="12" height="12" fill="#000" />
            <rect x="100" y="30" width="18" height="6" fill="#000" />
            <rect x="80" y="55" width="24" height="12" fill="#000" />
            <rect x="115" y="50" width="12" height="18" fill="#000" />
            <rect x="20" y="80" width="18" height="12" fill="#000" />
            <rect x="25" y="100" width="30" height="6" fill="#000" />
            <rect x="45" y="115" width="12" height="12" fill="#000" />
            <rect x="80" y="80" width="40" height="40" fill="none" stroke="#000" strokeWidth="6" />
            <rect x="92" y="92" width="16" height="16" fill="#000" />
            <rect x="140" y="80" width="24" height="12" fill="#000" />
            <rect x="150" y="100" width="12" height="24" fill="#000" />
            <rect x="170" y="115" width="18" height="12" fill="#000" />
            <rect x="80" y="135" width="12" height="18" fill="#000" />
            <rect x="100" y="145" width="24" height="12" fill="#000" />
            <rect x="115" y="165" width="12" height="12" fill="#000" />
            <rect x="145" y="135" width="18" height="12" fill="#000" />
            <rect x="160" y="155" width="24" height="24" fill="#000" />
            <text x="100" y="197" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#555">
              QRIS • SnapBooth
            </text>
          </svg>
          <div className="qris-label" aria-label="Amount: 25 thousand rupiah">
            <span className="qris-amount">Rp 25.000</span>
            <span className="qris-note">Valid for 10 minutes</span>
          </div>
        </div>
        <button
          className={`btn-primary btn-large${confirmed ? ' btn-confirmed' : ''}`}
          onClick={handleSimulate}
          disabled={confirmed}
          aria-label={confirmed ? 'Payment confirmed' : 'Simulate payment success'}
        >
          {confirmed ? '✓ Payment Confirmed!' : '✓ Simulate Payment Success'}
        </button>
        {confirmed && <p role="status" aria-live="assertive" className="sr-only">Payment succeeded. Redirecting to template selection.</p>}
      </div>
    </section>
  );
}
