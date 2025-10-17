import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user, isUserAdmin, authLoading } = useAuth();

  if (authLoading) return <p>Chargement...</p>;

  if (!user) return <p>Veuillez vous connecter</p>;

  return (
    <div>
      <h1>Bienvenue {user.email}</h1>

      {isUserAdmin ? (
        <button>Changer la disponibilité d’un véhicule</button>
      ) : (
        <p>Vous pouvez réserver une voiture</p>
      )}
    </div>
  );
}
