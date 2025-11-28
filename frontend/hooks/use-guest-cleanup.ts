"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useGuestCleanup() {
  useEffect(() => {
    const cleanup = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Check if the user is anonymous
      if (user?.is_anonymous) {
        const handleBeforeUnload = () => {
          // Clear all Supabase related items from localStorage
          // Note: This is a synchronous operation
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith("sb-")) {
              localStorage.removeItem(key);
            }
          }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
          window.removeEventListener("beforeunload", handleBeforeUnload);
        };
      }
    };

    cleanup();
  }, []);
}
