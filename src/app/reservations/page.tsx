'use client';

import { useState, useEffect } from 'react';

interface Reservation {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  createdAt: string;
}

export default function ReservationsDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // holds reservation ID that is being cancelled
  const [now, setNow] = useState<number>(Date.now());

  // Periodically refresh the 'now' timestamp for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/reservations');
      if (!response.ok) {
        throw new Error('Failed to load reservations.');
      }
      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleRelease = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const response = await fetch(`/api/reservations/${id}/release`, {
        method: 'POST',
      });
      if (response.ok) {
        setCleanupMessage('Hold cancelled successfully. Stock released.');
        fetchReservations();
        setTimeout(() => setCleanupMessage(null), 3000);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel hold.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel hold.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGlobalCleanup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reservations/cleanup', {
        method: 'POST',
      });
      const data = await response.json();
      setCleanupMessage(`Success: Reclaimed stock from ${data.cleanedCount || 0} expired reservation holds.`);
      fetchReservations();
      setTimeout(() => setCleanupMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Global cleanup failed.');
      setLoading(false);
    }
  };

  // Helper to format remaining time
  const getRemainingTime = (expiresAtStr: string) => {
    const expiry = new Date(expiresAtStr).getTime();
    const diff = Math.max(0, Math.floor((expiry - now) / 1000));
    if (diff <= 0) return 'EXPIRED';
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading reservations...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Reservation <span>Console</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track and manage active stock holds, payments, and releases.</p>
        </div>
        <button className="btn btn-outline" onClick={handleGlobalCleanup} id="btn-force-cleanup">
          ⚡ Force Expiry Scan
        </button>
      </header>

      {cleanupMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }} id="console-success-alert">
          <span className="alert-icon">✅</span>
          <div className="alert-content">{cleanupMessage}</div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }} id="console-error-alert">
          <span className="alert-icon">❌</span>
          <div className="alert-content">{error}</div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }} id="reservations-table-card">
        {reservations.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No reservation holds found in the system. Use the catalog to create a temporary stock hold!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Reservation ID / Date</th>
                <th style={{ padding: '1rem' }}>Product</th>
                <th style={{ padding: '1rem' }}>Fulfillment Center</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Units</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Time Remaining / Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => {
                const isPending = res.status === 'PENDING';
                const isExpired = isPending && new Date(res.expiresAt).getTime() < now;
                const formattedDate = new Date(res.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={res.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }} className="stock-row-interactive">
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {res.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {formattedDate}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{res.productName}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{res.warehouseName}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{res.quantity}</td>
                    <td style={{ padding: '1rem' }}>
                      {isExpired ? (
                        <span className="badge badge-danger">EXPIRED</span>
                      ) : res.status === 'CONFIRMED' ? (
                        <span className="badge badge-success">CONFIRMED</span>
                      ) : res.status === 'RELEASED' ? (
                        <span className="badge badge-danger">RELEASED</span>
                      ) : (
                        <span className="badge badge-warning">PENDING</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isPending && !isExpired ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', minWidth: '70px' }}>
                            {getRemainingTime(res.expiresAt)}
                          </span>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.25rem' }}
                            disabled={actionLoading === res.id}
                            onClick={() => handleRelease(res.id)}
                          >
                            {actionLoading === res.id ? 'Releasing...' : 'Release Hold'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Hold Ended
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
