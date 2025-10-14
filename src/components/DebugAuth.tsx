 // components/DebugAuth.tsx (temporaire)
 import { useAuth } from "@/contexts/AuthContext";
 import { useAdmin } from "@/contexts/AdminContext";

 export const DebugAuth = () => {
   const auth = useAuth();
   const admin = useAdmin();

   console.log("🔍 DEBUG - Auth:", {
     user: auth.user?.email,
     role: auth.role,
     loading: auth.loading,
     isAuthenticated: auth.isAuthenticated
   });

   console.log("🔍 DEBUG - Admin:", {
     isAdminMode: admin.isAdminMode,
     isUserAdmin: admin.isUserAdmin
   });

   return null;
 };