'use client';

import { useState, useEffect } from 'react';

interface WarehouseStock {
  id: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
  product: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  stocks: WarehouseStock[];
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWarehouses() {
      try {
        const response = await fetch('/api/warehouses');
        if (!response.ok) {
          throw new Error('Failed to load warehouses.');
        }
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchWarehouses();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading fulfillment hubs and stock mappings...</p>
      </div>
    );
  }

  return (
    <div>
      <section className="hero" id="warehouses-hero" style={{ padding: '2rem 0', textAlign: 'left', maxWidth: '100%' }}>
        <h1 style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>Warehouses</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>Manage warehouse locations and their inventory.</p>
      </section>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '2rem' }}>
          <span className="alert-icon">❌</span>
          <div className="alert-content">{error}</div>
        </div>
      )}

      {/* Warehouse Layout Container - Large Card list spanning the full window width */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
        {warehouses.map((wh) => (
          <div className="card" key={wh.id} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', padding: '2rem' }}>
            <div className="pulse-glow"></div>
            
            {/* Warehouse Header */}
            <div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                {wh.name}
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                {wh.location || 'Unknown Location'}
              </p>
            </div>
            
            {/* Products stock table inside the warehouse */}
            <div style={{ overflowX: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '0.75rem 0', fontWeight: 500 }}>Product</th>
                    <th style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 500, width: '15%' }}>Total Stock</th>
                    <th style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 500, width: '15%' }}>Reserved</th>
                    <th style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 500, width: '15%' }}>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {(!wh.stocks || wh.stocks.length === 0) ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No product stocks allocated in this warehouse.
                      </td>
                    </tr>
                  ) : (
                    wh.stocks.map((stock) => {
                      const prodName = stock.product ? stock.product.name : 'Unknown Product';
                      const isNone = stock.availableUnits === 0;
                      
                      return (
                        <tr key={stock.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.95rem' }} className="stock-row-interactive">
                          <td style={{ padding: '0.85rem 0', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {prodName}
                          </td>
                          <td style={{ padding: '0.85rem 0', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {stock.totalUnits}
                          </td>
                          <td style={{ 
                            padding: '0.85rem 0', 
                            textAlign: 'right', 
                            color: stock.reservedUnits > 0 ? 'var(--warning)' : 'var(--text-secondary)',
                            fontWeight: stock.reservedUnits > 0 ? 600 : 400
                          }}>
                            {stock.reservedUnits}
                          </td>
                          <td style={{ 
                            padding: '0.85rem 0', 
                            textAlign: 'right', 
                            color: isNone ? 'var(--danger)' : 'var(--success)', 
                            fontWeight: 700 
                          }}>
                            {stock.availableUnits}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
