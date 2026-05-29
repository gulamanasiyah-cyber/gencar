"use client";

import { useState, useEffect } from "react";

export default function NewsTicker({ articles = [], customText }: { articles?: any[], customText?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const defaultText = "Portal informasi dan berita kegiatan Generus Muda Cengkareng • Mari berbagi inspirasi! Punya cerita atau liputan kegiatan menarik? Yuk, kirimkan karya tulismu dan jadilah kontributor artikel di website ini!";
  const displayText = customText || defaultText;

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
