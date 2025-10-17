import { useEffect } from "react";

export const useAuthCleanup = () => {
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k =>
        k.includes("supabase") || k.includes("sb-")
      );

      // On garde la clé officielle de Supabase, on supprime seulement les doublons
      const officialKey = keys.find(k => k.startsWith("sb-") && !k.endsWith("-old"));
      keys.forEach(k => {
        if (k !== officialKey) {
          localStorage.removeItem(k);
          console.log("🧹 Ancienne clé supprimée:", k);
        }
      });
    } catch (error) {
      console.error("❌ Erreur nettoyage tokens:", error);
    }
  }, []);
};
