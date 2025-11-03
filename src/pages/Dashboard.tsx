import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { user, isUserAdmin, authLoading } = useAuth();
  const { t } = useTranslation();

  if (authLoading) return <p>{t("dashboard.loading")}</p>;

  if (!user) return <p>{t("dashboard.login_prompt")}</p>;

  return (
    <div>
      <h1>
        {t("dashboard.welcome")} {user.email}
      </h1>

      {isUserAdmin ? (
        <button>{t("dashboard.change_vehicle_availability")}</button>
      ) : (
        <p>{t("dashboard.user_can_reserve")}</p>
      )}
    </div>
  );
}
