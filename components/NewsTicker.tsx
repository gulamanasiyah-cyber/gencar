"use client";

import { useState, useEffect } from "react";

export default function NewsTicker({ articles = [], customText }: { articles?: any[], customText?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const defaultText = "Portal informasi dan berita kegiatan GENCAR BERKARYA";
  const displayText = customText || (articles.length > 0
    ? `${defaultText} • ` + articles.map(a => a.judul).join(' • ')
    : defaultText);

  return (
    <div className="breaking" suppressHydrationWarning>
      <div className="wrap">
        <div className="breaking-inner">
          <span className="breaking-label">Info Terkini</span>
          <div className="breaking-track">
            <div className="breaking-scroll">
              <span className="breaking-item">{displayText}</span>
              <span className="breaking-item">{displayText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
