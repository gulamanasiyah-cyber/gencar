"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function AutoLogout({ timeoutMinutes = 5 }: { timeoutMinutes?: number }) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Set timer for auto logout (default 5 minutes)
    timerRef.current = setTimeout(async () => {
      // Inactivity timeout reached
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        
        Swal.fire({
          icon: "info",
          title: "Sesi Habis",
          text: `Anda tidak melakukan aktivitas selama ${timeoutMinutes} menit. Silakan login kembali.`,
          confirmButtonText: "OK"
        }).then(() => {
          router.push("/login");
          router.refresh();
        });
      } catch (error) {
        console.error("Logout failed:", error);
        router.push("/login");
      }
    }, timeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    // Initial setup
    resetTimer();

    // Events to track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "keypress"
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [router, timeoutMinutes]);

  return null;
}
