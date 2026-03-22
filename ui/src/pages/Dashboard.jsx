import { useProducts } from '../hooks/useProducts.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { useFilterStore } from '../store/filterStore.js';
import { FilterBar } from '../components/FilterBar/FilterBar.jsx';
import { ProductTile } from '../components/ProductTile/ProductTile.jsx';

function LoadingSkeleton() {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap:                 '16px',
      padding:             '20px',
    }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding:      '16px',
          height:       '200px',
          animation:    'shimmer 1.8s infinite',
        }} />
      ))}
    </div>
  );
}

export function Dashboard() {
  useWebSocket();

  const { data: allProducts = [], isLoading, error } = useProducts();
  const { product: selectedProduct } = useFilterStore();

  // Filter products by selection
  const products = selectedProduct
    ? allProducts.filter((p) => p.id === selectedProduct)
    : allProducts;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes shimmer {
          0%   { opacity: 1; }
          50%  { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes pulse {
          0%   { opacity: 0.6; }
          50%  { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>

      <FilterBar />

      {/* Main content */}
      <div style={{ flex: 1, padding: '20px' }}>
        {/* Page header */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              CI/CD Pipeline Dashboard
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isLoading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#18C964', display: 'inline-block' }} />
            Live
          </div>
        </div>

        {error && (
          <div style={{
            background:   'rgba(243,18,96,0.1)',
            border:       '1px solid rgba(243,18,96,0.3)',
            borderRadius: 'var(--radius-md)',
            padding:      '16px',
            color:        'var(--color-failure)',
            marginBottom: '20px',
          }}>
            Failed to load products. Make sure the API server is running at{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>{import.meta.env.VITE_API_URL}</code>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap:                 '16px',
          }}>
            {products.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
            {products.length === 0 && !isLoading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                No products found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding:      '12px 20px',
        borderTop:    '1px solid var(--border-subtle)',
        fontSize:     '0.7rem',
        color:        'var(--text-muted)',
        display:      'flex',
        justifyContent: 'space-between',
      }}>
        <span>Observability Dashboard</span>
        <span>API: {import.meta.env.VITE_API_URL}</span>
      </div>
    </div>
  );
}

export default Dashboard;
