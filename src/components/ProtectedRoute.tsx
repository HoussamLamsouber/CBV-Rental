import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, isUserAdmin, authLoading, adminLoading } = useAuth();
  const { t } = useTranslation();

  // ✅ Tant que Supabase charge la session → on attend
  if (authLoading || adminLoading) {
    return <LoadingSpinner message={t('protected_route.messages.checking_session')} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-9V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v2m4 6h.01M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('protected_route.messages.access_denied')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('protected_route.messages.must_be_logged_in')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/auth")}>
              {t('auth.tabs.login')}
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              {t('protected_route.actions.back_to_home')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (adminOnly && !isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('protected_route.messages.access_forbidden')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('protected_route.messages.admin_rights_required')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/")}>
              {t('protected_route.actions.back_to_home')}
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              {t('protected_route.actions.go_to_dashboard')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};