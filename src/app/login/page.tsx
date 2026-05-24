'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const user = localStorage.getItem('allo_user');
    if (user) {
      // Ensure session cookie is set if localStorage exists
      if (!document.cookie.includes('allo_logged_in=')) {
        document.cookie = 'allo_logged_in=true; path=/; max-age=86400; SameSite=Lax';
      }
      router.push('/');
    }
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      // Reset database and mock activity state for the new user session
      await fetch('/api/auth/reset', { method: 'POST' });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const userData = {
        name: isLogin ? email.split('@')[0] : name,
        email: email,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('allo_user', JSON.stringify(userData));
      
      // Set session cookie for middleware
      document.cookie = 'allo_logged_in=true; path=/; max-age=86400; SameSite=Lax';
      
      // Dispatch custom storage event to notify Sidebar instantly
      window.dispatchEvent(new Event('storage'));
      
      router.push('/');
    } catch (err: any) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      // Reset database and mock activity state for the new user session
      await fetch('/api/auth/reset', { method: 'POST' });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const userData = {
        name: 'Allo Partner',
        email: 'partner@google.com',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('allo_user', JSON.stringify(userData));
      
      // Set session cookie for middleware
      document.cookie = 'allo_logged_in=true; path=/; max-age=86400; SameSite=Lax';
      
      // Dispatch custom storage event to notify Sidebar instantly
      window.dispatchEvent(new Event('storage'));
      
      router.push('/');
    } catch (err: any) {
      setError('Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }} id="auth-root">
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="pulse-glow"></div>

        {/* Portal Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            Allo <span>Portal</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            {isLogin ? 'Sign in to access your inventory holds' : 'Create an account to begin reserving stock'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', gap: '1.5rem' }}>
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            style={{
              background: 'none',
              border: 'none',
              color: isLogin ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              paddingBottom: '0.5rem',
              borderBottom: isLogin ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'var(--transition-fast)',
            }}
            id="tab-login"
          >
            Log In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            style={{
              background: 'none',
              border: 'none',
              color: !isLogin ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              paddingBottom: '0.5rem',
              borderBottom: !isLogin ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'var(--transition-fast)',
            }}
            id="tab-signup"
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ fontSize: '0.95rem' }} id="auth-error-alert">
            <span className="alert-icon">❌</span>
            <div className="alert-content">{error}</div>
          </div>
        )}

        {/* Auth Credentials Form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} id="auth-form">
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="auth-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Dr. Alexander Allo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="auth-email" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="alex@allohealth.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="auth-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
            id="auth-submit-btn"
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                Authenticating...
              </>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '0.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        {/* Continue with Google button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            background: '#ffffff',
            color: '#1f2937',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '1rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition-normal)',
            width: '100%',
          }}
          className="google-btn"
          id="google-auth-btn"
        >
          <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <style jsx>{`
        .google-btn:hover {
          background: #f3f4f6 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }
        .google-btn:active {
          transform: translateY(0);
        }
        .google-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
