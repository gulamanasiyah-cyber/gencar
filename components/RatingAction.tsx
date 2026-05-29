"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export default function RatingAction({ articleId, initialRating, ratingCount }: { articleId: string, initialRating: number, ratingCount: number }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAvg, setCurrentAvg] = useState(initialRating);
  const [currentCount, setCurrentCount] = useState(ratingCount);

  const handleRate = async (value: number) => {
    if (submitted || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/artikel/${articleId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value })
      });
      if (res.ok) {
        const data = await res.json();
        setSubmitted(true);
        setRating(value);
        if (data.ratingSum !== undefined && data.ratingCount !== undefined) {
          setCurrentAvg(data.ratingCount > 0 ? data.ratingSum / data.ratingCount : 0);
          setCurrentCount(data.ratingCount);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '40px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>
        {submitted ? "Terima kasih atas penilaian Anda!" : "Beri penilaian untuk artikel ini"}
      </h3>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={submitted || loading}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: submitted || loading ? 'default' : 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: (hover || rating) >= star ? '#eab308' : '#cbd5e1',
              transition: 'color 0.2s, transform 0.1s',
              transform: hover === star && !submitted ? 'scale(1.2)' : 'scale(1)'
            }}
          >
            <Star fill={(hover || rating) >= star ? "currentColor" : "none"} size={32} />
          </button>
        ))}
      </div>
      
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        {currentCount > 0 ? (
          <>Rata-rata: <strong>{currentAvg.toFixed(1)}</strong> dari {currentCount} penilaian</>
        ) : (
          "Belum ada penilaian. Jadilah yang pertama!"
        )}
      </div>
    </div>
  );
}
