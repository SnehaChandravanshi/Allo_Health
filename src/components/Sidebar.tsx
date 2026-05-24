'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface UserSession {
  name: string;
  email: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);

  // Sync user state on mount and when localStorage updates
  const syncUser = () => {
    try {
      const stored = localStorage.getItem('allo_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('allo_user');
    // Clear session cookie for middleware
    document.cookie = 'allo_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
    setUser(null);
    // Dispatch event to trigger re-renders elsewhere
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Products', path: '/products', icon: '🛍️' },
    { name: 'Warehouses', path: '/warehouses', icon: '🏢' },
    { name: 'Inventory', path: '/inventory', icon: '📦' },
    { name: 'Reservations', path: '/reservations', icon: '⏱️' }
  ];

  return (
    <aside className="sidebar" id="sidebar-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Link href="/" className="sidebar-brand" id="sidebar-brand-logo">
        Allo Health <span className="brand-dot"></span>
      </Link>
      
      {/* Primary Navigation Menu */}
      <nav style={{ flex: 1, overflowY: 'auto' }}>
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`sidebar-item-link ${isActive ? 'active' : ''}`}
                  id={`sidebar-link-${item.name.toLowerCase()}`}
                >
                  <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Auth State Bottom Section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} id="sidebar-user-profile">
            {/* User Profile Card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '1.1rem',
                flexShrink: 0
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '0.5rem' }}
              id="sidebar-btn-logout"
            >
              <span>🚪</span> Log Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className={`sidebar-item-link ${pathname === '/login' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: '0.5rem' }}
            id="sidebar-link-signin"
          >
            <span>🔐</span> Access Account
          </Link>
        )}
      </div>
    </aside>
  );
}
