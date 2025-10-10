import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user, role, loading } = useAuth();

  if (loading) return <p>Chargement...</p>;

  if (!user) return <p>Veuillez vous connecter</p>;

  return (
    <div>
      <h1>Bienvenue {user.email}</h1>

      {role === "admin" ? (
        <button>Changer la disponibilité d’un véhicule</button>
      ) : (
        <p>Vous pouvez réserver une voiture</p>
      )}
    </div>
  );
}
