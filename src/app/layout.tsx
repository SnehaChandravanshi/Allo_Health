import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import DevOverlayStyler from '@/components/DevOverlayStyler';

export const metadata: Metadata = {
  title: 'Allo Health | Inventory Management & Reservation Console',
  description: 'Ultra-secure, race-condition-free inventory reservation system designed for multi-warehouse retail and D2C brands.',
  keywords: 'allo health, inventory, reservation, nextjs, checkout, race conditions, postgresql, locking',
  authors: [{ name: 'Allo Health Engineering' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DevOverlayStyler />
        <div className="app-container">
          <Sidebar />
          <div className="main-content">
            <main className="content-pane" id="main-content-pane">
              {children}
            </main>
            <footer className="footer" id="site-footer" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '2rem 0' }}>
              <div className="container">
                <p>&copy; {new Date().getFullYear()} Allo Health. Built for scalable retail operations.</p>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
