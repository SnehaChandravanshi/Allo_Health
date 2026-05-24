'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Reservation {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  isExpired: boolean;
  isMockMode?: boolean;
}

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const resolvedParams = use(params);
  const reservationId = resolvedParams.id;
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch reservation details
  useEffect(() => {
    async function fetchReservation() {
      try {
        const response = await fetch(`/api/reservations/${reservationId}`);
        if (!response.ok) {
          throw new Error('Reservation not found or has already expired.');
        }
        const data = await response.json();
        setReservation(data);

        // Calculate time remaining
        const expiresAtTime = new Date(data.expiresAt).getTime();
        const initialTimeLeft = Math.max(0, Math.floor((expiresAtTime - Date.now()) / 1000));
        setTimeLeft(initialTimeLeft);

        if (data.status === 'RELEASED' || data.isExpired || initialTimeLeft <= 0) {
          setError('This reservation hold has expired and the stock has been returned to the catalog.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load reservation.');
      } finally {
        setLoading(false);
      }
    }

    fetchReservation();
  }, [reservationId]);

  // Live countdown timer effect
  useEffect(() => {
    if (!reservation || reservation.status !== 'PENDING' || timeLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(interval);
          setError('Hold expired: Your 10-minute hold has run out. The units are now available to other shoppers.');
          if (reservation) {
            setReservation({ ...reservation, status: 'RELEASED', isExpired: true });
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation, timeLeft]);

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Confirm reservation handler (simulate checkout payment)
  const handleConfirm = async () => {
    if (!reservation) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Generate unique Idempotency Key for confirm request
    const idempotencyKey = crypto.randomUUID();

    try {
      const response = await fetch(`/api/reservations/${reservationId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
      });

      const data = await response.json();

      if (response.status === 200) {
        setSuccessMessage('Order confirmed! Payment processed and stock decremented.');
        setReservation((prev) => prev ? { ...prev, status: 'CONFIRMED' } : null);
      } else if (response.status === 410) {
        setError('Checkout Failed (410 Gone): Your reservation has expired and the stock was released. We cannot complete this transaction.');
        setReservation((prev) => prev ? { ...prev, status: 'RELEASED', isExpired: true } : null);
      } else {
        throw new Error(data.error || 'Failed to confirm reservation.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during confirmation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel reservation early handler
  const handleCancel = async () => {
    if (!reservation) return;
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservationId}/release`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.status === 200) {
        setSuccessMessage('Reservation cancelled. Held stock has been returned to the catalog.');
        setReservation((prev) => prev ? { ...prev, status: 'RELEASED' } : null);
        // Wait 1.5s then redirect back to homepage
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to cancel reservation.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while cancelling.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading reservation details...</p>
      </div>
    );
  }

  const isPending = reservation?.status === 'PENDING';
  const isConfirmed = reservation?.status === 'CONFIRMED';
  const isReleased = reservation?.status === 'RELEASED';
  const isLowTime = timeLeft > 0 && timeLeft < 60; // Less than 1 minute left

  return (
    <div className="checkout-container" id="checkout-root">
      <div className="card timer-card">
        <div className="pulse-glow"></div>
        
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          {isConfirmed ? 'Order Secured!' : isReleased ? 'Reservation Expired' : 'Secure Your Units'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isConfirmed 
            ? 'Thank you! Your inventory allocation has been permanently updated.' 
            : isReleased 
            ? 'The temporary hold on your stock has ended.' 
            : 'Complete your checkout before the hold timer expires to lock in your items.'}
        </p>

        {/* Countdown display */}
        {!isConfirmed && !isReleased && (
          <div>
            <div className={`timer-display ${isLowTime ? 'low' : ''}`} id="timer-clock">
              {formatTime(timeLeft)}
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: isLowTime ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {isLowTime ? '⚠️ Hurry, stock releasing soon!' : 'Hold Timer Active'}
            </p>
          </div>
        )}

        {isConfirmed && (
          <div style={{ margin: '2rem 0' }}>
            <span className="badge badge-success" style={{ fontSize: '1.25rem', padding: '0.5rem 1rem' }} id="success-badge">
              Confirmed
            </span>
          </div>
        )}

        {isReleased && (
          <div style={{ margin: '2rem 0' }}>
            <span className="badge badge-danger" style={{ fontSize: '1.25rem', padding: '0.5rem 1rem' }} id="expired-badge">
              Released
            </span>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ textAlign: 'left', marginTop: '1.5rem' }} id="checkout-error-alert">
            <span className="alert-icon">❌</span>
            <div className="alert-content">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" style={{ textAlign: 'left', marginTop: '1.5rem' }} id="checkout-success-alert">
            <span className="alert-icon">✅</span>
            <div className="alert-content">
              <strong>Success:</strong> {successMessage}
            </div>
          </div>
        )}

        {/* Reservation details panel */}
        {reservation && (
          <div className="checkout-details">
            <div className="detail-row">
              <span>Item:</span>
              <span>{reservation.productName}</span>
            </div>
            <div className="detail-row">
              <span>Quantity:</span>
              <span>{reservation.quantity} Unit(s)</span>
            </div>
            <div className="detail-row">
              <span>Fulfillment Location:</span>
              <span>{reservation.warehouseName}</span>
            </div>
            <div className="detail-row">
              <span>Reservation ID:</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                {reservation.id}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="checkout-actions">
          {isPending ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={actionLoading}
                id="cancel-hold-button"
              >
                Cancel Hold
              </button>
              
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={actionLoading || timeLeft <= 0}
                id="confirm-purchase-button"
              >
                {actionLoading ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                    Verifying...
                  </>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ gridColumn: 'span 2' }}
              onClick={() => router.push('/')}
              id="back-to-products-button"
            >
              Back to Catalog
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
