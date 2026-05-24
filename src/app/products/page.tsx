'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [selectedWarehouses, setSelectedWarehouses] = useState<Record<string, string>>({});
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const router = useRouter();

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Failed to fetch product catalog.');
        }
        const data = await response.json();
        setProducts(data.products || []);
        setIsMockMode(data.isMockMode || false);

        // Pre-select first warehouse with stock for each product
        const initialSelections: Record<string, string> = {};
        data.products.forEach((p: Product) => {
          const firstWithStock = p.stocks.find((s) => s.availableUnits > 0);
          if (firstWithStock) {
            initialSelections[p.id] = firstWithStock.warehouseId;
          } else if (p.stocks.length > 0) {
            initialSelections[p.id] = p.stocks[0].warehouseId;
          }
        });
        setSelectedWarehouses(initialSelections);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleWarehouseChange = (productId: string, warehouseId: string) => {
    setSelectedWarehouses((prev) => ({
      ...prev,
      [productId]: warehouseId,
    }));
  };

  const handleReserve = async (productId: string, productName: string) => {
    const warehouseId = selectedWarehouses[productId];
    if (!warehouseId) {
      alert('Please select a warehouse.');
      return;
    }

    setReservingId(productId);
    setError(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        router.push(`/checkout/${data.id}`);
      } else if (response.status === 409) {
        setError(`Conflict: The last unit of "${productName}" in that warehouse has just been reserved by another shopper. Please select another warehouse or try again later.`);
        const refreshResponse = await fetch('/api/products');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setProducts(refreshData.products || []);
        }
      } else {
        throw new Error(data.error || 'Failed to place reservation.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to reservations server.');
    } finally {
      setReservingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Allo Health catalog...</p>
      </div>
    );
  }

  return (
    <div>
      <section className="hero" id="page-hero" style={{ padding: '2rem 0' }}>
        <h1>Product <span>Catalog</span></h1>
        <p>Browse our list of premium products and secure holds on units across our logistics hubs.</p>
      </section>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '2rem' }} id="products-error-banner">
          <span className="alert-icon">❌</span>
          <div className="alert-content">{error}</div>
          <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="product-grid" id="product-grid-container">
        {products.map((product) => {
          const selectedWarehouseId = selectedWarehouses[product.id];
          const selectedWarehouseStock = product.stocks.find(
            (s) => s.warehouseId === selectedWarehouseId
          );
          const isOutOfStock = !selectedWarehouseStock || selectedWarehouseStock.availableUnits <= 0;

          return (
            <article className="card product-card-horizontal" key={product.id} id={`product-card-${product.id}`}>
              <div className="pulse-glow"></div>
              
              {/* Left Column: Image */}
              <div className="product-horizontal-image-container">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="product-image"
                    loading="lazy"
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    No Image
                  </div>
                )}
              </div>

              {/* Middle Column: Details (SKU, Title, Description) */}
              <div className="product-horizontal-details">
                <div className="product-sku">{product.sku}</div>
                <h2 className="product-title" style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{product.name}</h2>
                <p className="product-description" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, minHeight: 'unset', height: 'auto' }}>
                  {product.description}
                </p>
              </div>

              {/* Right Column: Stock table, Selector, Button */}
              <div className="product-horizontal-actions">
                <table className="stock-table" style={{ marginBottom: '1rem', borderTop: 'none' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.25rem 0' }}>Fulfillment Center</th>
                      <th style={{ padding: '0.25rem 0', textAlign: 'right' }}>Stock Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.stocks.map((stock) => {
                      const isLow = stock.availableUnits > 0 && stock.availableUnits <= 2;
                      const isNone = stock.availableUnits === 0;

                      return (
                        <tr key={stock.id} className="stock-row">
                          <td style={{ padding: '0.45rem 0' }}>{stock.warehouseName}</td>
                          <td style={{ padding: '0.45rem 0', textAlign: 'right' }}>
                            {isNone ? (
                              <span className="badge badge-danger">Out of stock</span>
                            ) : isLow ? (
                              <span className="badge badge-warning">{stock.availableUnits} left (Low)</span>
                            ) : (
                              <span className="badge badge-success">{stock.availableUnits} available</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor={`warehouse-select-${product.id}`} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Fulfill From:
                    </label>
                    <select
                      id={`warehouse-select-${product.id}`}
                      className="form-select"
                      value={selectedWarehouseId || ''}
                      onChange={(e) => handleWarehouseChange(product.id, e.target.value)}
                    >
                      {product.stocks.map((stock) => (
                        <option key={stock.warehouseId} value={stock.warehouseId}>
                          {stock.warehouseName} ({stock.availableUnits} avail)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="price-row" style={{ marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    
                    <button
                      className="btn btn-primary"
                      disabled={isOutOfStock || reservingId === product.id}
                      onClick={() => handleReserve(product.id, product.name)}
                      id={`reserve-button-${product.id}`}
                    >
                      {reservingId === product.id ? (
                        <>
                          <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                          Hold Units...
                        </>
                      ) : isOutOfStock ? (
                        'Out of Stock'
                      ) : (
                        'Reserve Unit'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
