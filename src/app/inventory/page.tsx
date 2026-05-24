'use client';

import { useState, useEffect } from 'react';

interface WarehouseStock {
  id: string;
  warehouseId: string;
  warehouseName: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  imageUrl: string;
  stocks: WarehouseStock[];
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Failed to load inventory.');
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading inventory records...</p>
      </div>
    );
  }

  // Flatten the product stocks for table representation
  const stockRows = products.flatMap((p) => 
    p.stocks.map((s) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      warehouseId: s.warehouseId,
      warehouseName: s.warehouseName,
      totalUnits: s.totalUnits,
      reservedUnits: s.reservedUnits,
      availableUnits: s.availableUnits
    }))
  );

  return (
    <div>
      <section className="hero" id="inventory-hero" style={{ padding: '2rem 0', textAlign: 'left', maxWidth: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Inventory <span>Control</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Real-time stock matrix showing capacity, reserved holds, and available units.</p>
      </section>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '2rem' }}>
          <span className="alert-icon">❌</span>
          <div className="alert-content">{error}</div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }} id="inventory-table-card">
        {stockRows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No inventory stock records found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem 1.5rem' }}>SKU / Product</th>
                <th style={{ padding: '1rem' }}>Fulfillment Center</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Total Stock</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Reserved Holds</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Available Units</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((row, idx) => {
                const isNone = row.availableUnits === 0;
                const isLow = row.availableUnits > 0 && row.availableUnits <= 2;
                
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }} className="stock-row-interactive">
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                        {row.sku}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{row.warehouseName}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.totalUnits}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--warning)', fontWeight: 600 }}>{row.reservedUnits}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: isNone ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 700 }}>
                      {row.availableUnits}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {isNone ? (
                        <span className="badge badge-danger">Out of stock</span>
                      ) : isLow ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
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
