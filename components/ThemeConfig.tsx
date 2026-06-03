"use client";

import { useEffect, useState } from "react";

export default function ThemeConfig() {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const applyTheme = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        
        if (data.site_logo) {
            const hasChanged = data.site_logo !== (window as any).__SITE_LOGO__;
            if (hasChanged) {
                setLogo(data.site_logo);
                // Also update favicon if possible
                const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                if (favicon) favicon.href = data.site_logo;
                
                // Set global logo for components to use
                (window as any).__SITE_LOGO__ = data.site_logo;
                
                // Dispatch event for components to re-render logo
                window.dispatchEvent(new Event('site-logo-updated'));
            }
        }
      } catch (e) {
        console.error("Theme apply error:", e);
      }
    };

    applyTheme();
    
    // Listen for updates from admin page
    window.addEventListener('site-logo-updated', applyTheme);
    return () => window.removeEventListener('site-logo-updated', applyTheme);
  }, []);

  return null; // This component just manages side effects
}
