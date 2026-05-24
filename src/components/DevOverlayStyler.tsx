'use client';

import { useEffect } from 'react';

export default function DevOverlayStyler() {
  useEffect(() => {
    // Only target development mode
    if (process.env.NODE_ENV !== 'development') return;

    const injectStyles = () => {
      const portals = document.querySelectorAll('nextjs-portal');
      portals.forEach((portal) => {
        if (portal.shadowRoot && !portal.shadowRoot.querySelector('#custom-dev-style')) {
          const style = document.createElement('style');
          style.id = 'custom-dev-style';
          style.textContent = `
            /* Upscale Next.js Dev tools bottom-left / bottom-right indicator button */
            button[data-nextjs-indicator], 
            button[aria-label="Next.js Developer Tools"], 
            button[class*="indicator"],
            button[class*="toast"],
            [class*="Indicator"],
            .nextjs-toast-errors-parent,
            div[class*="Toast"] {
              transform: scale(1.6) !important;
              transform-origin: bottom left !important;
              margin: 15px !important;
            }

            /* Upscale preferences window overlay dialog and fonts */
            div[data-nextjs-dialog],
            div[class*="dialog"],
            div[class*="panel"],
            div[role="dialog"],
            .nextjs-toast-errors-parent div {
              font-size: 1.25rem !important;
              padding: 1.5rem !important;
            }

            div[data-nextjs-dialog] h1,
            div[data-nextjs-dialog] h2,
            div[data-nextjs-dialog] h3,
            div[class*="dialog"] h2,
            div[role="dialog"] h2 {
              font-size: 1.6rem !important;
              margin-bottom: 1rem !important;
            }

            div[data-nextjs-dialog] p,
            div[data-nextjs-dialog] span,
            div[data-nextjs-dialog] select,
            div[data-nextjs-dialog] button,
            div[class*="dialog"] select,
            div[class*="dialog"] button {
              font-size: 1.15rem !important;
            }

            /* If there is an N logo inside a round button */
            svg {
              transform: scale(1.3) !important;
            }
          `;
          portal.shadowRoot.appendChild(style);
        }
      });
    };

    // Run styling inject and monitor updates
    injectStyles();
    const observer = new MutationObserver(injectStyles);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
