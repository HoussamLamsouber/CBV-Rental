// components/LoadingSpinner.tsx
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner = ({ message }: LoadingSpinnerProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">
          {message || t("loadingSpinner.message")}
        </p>
      </div>
    </div>
  );
};
