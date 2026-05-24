'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  warehouseName: string;
  availableUnits: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK';
}

interface RecentActivity {
  id: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  createdAt: string;
}

interface DashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  totalInventory: number;
  pendingReservations: number;
  lowStockAlerts: LowStockAlert[];
  recentActivity: RecentActivity[];
  isMockMode: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to load dashboard statistics.');
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

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
        <p style={{ color: 'var(--text-secondary)' }}>Compiling dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div>
      <section className="hero" id="dashboard-hero" style={{ padding: '2rem 0', textAlign: 'left', maxWidth: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Inventory <span>Console</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Overview of your products, warehouses, active holds, and logistics.</p>

        {stats?.isMockMode && (
          <div className="alert alert-warning" style={{ marginTop: '1rem', width: '100%' }} id="dashboard-warning-banner">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>Mock Mode Active:</strong> Running on in-memory storage (DATABASE_URL is not configured). Concurrency safety is secured via a mock Mutex lock.
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '2rem' }} id="dashboard-error-banner">
          <span className="alert-icon">❌</span>
          <div className="alert-content">{error}</div>
        </div>
      )}

      {/* Metrics Row */}
      {stats && (
        <div className="metric-grid" id="metrics-container">
          <div className="metric-card">
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Total Products</div>
              <div className="metric-val">{stats.totalProducts}</div>
            </div>
            <div style={{ fontSize: '1.75rem' }}>🛍️</div>
          </div>

          <div className="metric-card">
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Total Warehouses</div>
              <div className="metric-val">{stats.totalWarehouses}</div>
            </div>
            <div style={{ fontSize: '1.75rem' }}>🏢</div>
          </div>

          <div className="metric-card">
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Inventory Units</div>
              <div className="metric-val">{stats.totalInventory}</div>
            </div>
            <div style={{ fontSize: '1.75rem' }}>📦</div>
          </div>

          <div className="metric-card">
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Pending Holds</div>
              <div className="metric-val" style={{ color: stats.pendingReservations > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {stats.pendingReservations}
              </div>
            </div>
            <div style={{ fontSize: '1.75rem' }}>⏱️</div>
          </div>
        </div>
      )}

      {/* Two Column Split Section */}
      {stats && (
        <div className="dashboard-split">
          {/* Stock Alerts (Left Column) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Stock Alerts</h2>
              <span className="badge badge-danger">{stats.lowStockAlerts.length} Alerts</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '400px', flex: 1 }}>
              {stats.lowStockAlerts.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ✅ All stock levels are healthy!
                </div>
              ) : (
                stats.lowStockAlerts.map((alert, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{alert.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Fulfill Center: {alert.warehouseName}
                      </div>
                    </div>
                    <div>
                      {alert.status === 'OUT_OF_STOCK' ? (
                        <span className="badge badge-danger">OUT OF STOCK</span>
                      ) : (
                        <span className="badge badge-warning">LOW ({alert.availableUnits} left)</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity (Right Column) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Activity</h2>
              <Link href="/reservations" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                View All &rarr;
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '400px', flex: 1 }}>
              {stats.recentActivity.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No recent activities. Secure a hold to start testing.
                </div>
              ) : (
                stats.recentActivity.map((activity, i) => {
                  const isPending = activity.status === 'PENDING';
                  const isExpired = isPending && new Date(activity.expiresAt).getTime() < now;
                  
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {activity.productName} - {activity.quantity} Unit(s)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          FC: {activity.warehouseName} • {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div>
                        {isExpired ? (
                          <span className="badge badge-danger">EXPIRED</span>
                        ) : activity.status === 'CONFIRMED' ? (
                          <span className="badge badge-success">CONFIRMED</span>
                        ) : activity.status === 'RELEASED' ? (
                          <span className="badge badge-danger">RELEASED</span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontFamily: 'monospace' }}>
                            {getRemainingTime(activity.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
