// components/DebugRole.tsx (temporaire)
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const DebugRole = () => {
  const [result, setResult] = useState<any>(null);

  const testRoleQuery = async () => {
    try {
      console.log("🧪 Début du test rôle...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setResult("❌ Pas de session");
        return;
      }
      
      console.log("👤 User ID:", session.user.id);
      
      // Test 1: Requête simple
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1);
      
      console.log("📊 Résultat:", { data, error });
      setResult({ data, error });
      
      // Test 2: Vérifier toutes les entrées de la table
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("*");
      
      console.log("🔍 Tous les rôles:", allRoles);
      
    } catch (error) {
      console.error("💥 Erreur test:", error);
      setResult({ error: error.message });
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-yellow-100 p-4 rounded-lg border">
      <Button onClick={testRoleQuery} variant="outline" size="sm">
        🐛 Debug Rôle
      </Button>
      {result && (
        <pre className="mt-2 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};