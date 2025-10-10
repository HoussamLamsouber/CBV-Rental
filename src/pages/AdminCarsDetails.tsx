// src/pages/AdminVehicleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type CarRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean | null;
  created_at: string;
  updated_at: string;
  quantity: number;
  image_url: string | null;
  fuel?: string | null;
  seats?: number | null;
  transmission?: string | null;
};

type ReservationRow = {
  id: string;
  car_id: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  pickup_date: string; // Ajout de ces champs
  return_date: string;
};

type AvailabilityRow = {
  id: string;
  car_id: string;
  date: string; // YYYY-MM-DD
  available_quantity: number;
};

export default function AdminVehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [vehicle, setVehicle] = useState<CarRow | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number | "">>({});
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockEdit, setStockEdit] = useState<number | "">("");

  useEffect(() => {
    if (!id) return;
    const today = new Date();
    const nextDays = Array.from({ length: 30 }, (_, i) =>
      format(addDays(today, i), "yyyy-MM-dd")
    );
    setDates(nextDays);
  }, [id]);

  useEffect(() => {
    if (!id || dates.length === 0) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // fetch vehicle
        const { data: vData, error: vErr } = await supabase
          .from("cars")
          .select("*")
          .eq("id", id)
          .single();

        if (vErr) throw vErr;
        if (!mounted) return;
        setVehicle(vData as CarRow);
        setStockEdit((vData as CarRow).quantity ?? "");

        // CORRECTION : Récupérer toutes les réservations pour ce véhicule
        // sans filtrer par dates pour avoir toutes les réservations actives
        const { data: rData } = await supabase
          .from("reservations")
          .select("*")
          .eq("car_id", id);

        setReservations((rData as ReservationRow[]) || []);

        // fetch overrides (vehicle_availabilities) pour ces dates
        const { data: oData } = await supabase
          .from("vehicle_availabilities")
          .select("*")
          .eq("car_id", id)
          .in("date", dates);

        const mapOverrides: Record<string, number | ""> = {};
        (oData || []).forEach((o: AvailabilityRow) => {
          mapOverrides[o.date] = o.available_quantity;
        });
        // initialiser les dates manquantes avec une chaîne vide
        dates.forEach(d => {
          if (mapOverrides[d] === undefined) mapOverrides[d] = "";
        });

        setOverrides(mapOverrides);
      } catch (err: any) {
        console.error("Erreur load vehicle detail:", err);
        toast({ title: "Erreur", description: String(err.message || err), variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id, dates, toast]);

  // CORRECTION : Fonction pour déterminer si une date est dans une période de réservation
  const isDateInReservation = (date: string, reservation: ReservationRow) => {
    const reservationDate = new Date(date);
    const pickupDate = new Date(reservation.pickup_date);
    const returnDate = new Date(reservation.return_date);
    
    // La date doit être entre pickup_date et return_date (inclus)
    return reservationDate >= pickupDate && reservationDate <= returnDate;
  };

  // CORRECTION : Nouvelle fonction pour calculer les réservations par date
  const getReservedForDate = (date: string) => {
    return reservations
      .filter(r => isDateInReservation(date, r))
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
  };

  const getAvailabilityForDate = (date: string) => {
    // si override existe et n'est pas vide -> l'utiliser
    const override = overrides[date];
    if (override !== undefined && override !== "" && override !== null) {
      return Number(override);
    }
    // sinon utiliser la quantité de base moins les réservations
    const base = vehicle?.quantity ?? 0;
    const reserved = getReservedForDate(date);
    return Math.max(0, base - reserved);
  };

  const handleOverrideChange = (date: string, value: string) => {
    const parsed = value === "" ? "" : Number(value);
    setOverrides(prev => ({ ...prev, [date]: parsed }));
  };

  const handleSave = async () => {
    if (!id || !vehicle) return;
    setSaving(true);
    try {
      // 1) mettre à jour la quantité de base si modifiée
      if (stockEdit !== "" && Number(stockEdit) !== vehicle.quantity) {
        const { error: qErr } = await supabase
          .from("cars")
          .update({ quantity: Number(stockEdit) })
          .eq("id", id);
        if (qErr) throw qErr;
        setVehicle(prev => prev ? { ...prev, quantity: Number(stockEdit) } : prev);
      }

      // 2) upsert les overrides et supprimer les overrides vides
      const toUpsert: any[] = [];
      const toDelete: string[] = [];
      for (const d of dates) {
        const val = overrides[d];
        if (val === "" || val === null || val === undefined) {
          toDelete.push(d);
        } else {
          toUpsert.push({
            car_id: id,
            date: d,
            available_quantity: Number(val),
          });
        }
      }

      if (toUpsert.length > 0) {
        const { error: upErr } = await supabase
          .from("vehicle_availabilities")
          .upsert(toUpsert, { onConflict: "car_id,date" });
        if (upErr) throw upErr;
      }

      for (const d of toDelete) {
        const { error: delErr } = await supabase
          .from("vehicle_availabilities")
          .delete()
          .match({ car_id: id, date: d });
        if (delErr) {
          console.warn("delete override error:", delErr);
        }
      }

      toast({ title: "Sauvegardé", description: "Disponibilités mises à jour." });
    } catch (err: any) {
      console.error("Erreur save overrides:", err);
      toast({ title: "Erreur", description: String(err.message || err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!id) return <div><Header /><main className="container mx-auto p-6">ID manquant</main><Footer/></div>;
  if (loading) return <div><Header /><main className="container mx-auto p-6">Chargement...</main><Footer/></div>;
  if (!vehicle) return <div><Header /><main className="container mx-auto p-6">Véhicule introuvable</main><Footer/></div>;

  return (
    <>
      <Header />
      <main className="container mx-auto p-6">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-48">
            {vehicle.image_url ? (
              <img src={vehicle.image_url} alt={vehicle.name} className="w-full h-auto object-cover rounded-lg" />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">No image</div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{vehicle.name}</h1>
            <p className="text-muted-foreground mb-2">{vehicle.category}</p>
            <p className="mb-2">Prix: <strong>{vehicle.price} / jour</strong></p>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Stock total (quantity)</label>
              <Input
                value={stockEdit}
                onChange={(e) => setStockEdit(e.target.value === "" ? "" : Number(e.target.value))}
                type="number"
                min={0}
                className="w-40"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate("/admin/vehicles")}>Retour</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Sauvegarder modifications"}
              </Button>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        <h2 className="text-xl font-semibold mb-3">Disponibilités (30 jours)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Saisis une valeur pour forcer la disponibilité ce jour-là (laisser vide pour utiliser stock - réservations).
        </p>

        {/* CORRECTION : Affichage des réservations actives pour debug */}
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Réservations actives:</h3>
          {reservations.map(r => (
            <div key={r.id} className="text-sm">
              {r.pickup_date} → {r.return_date} (Quantité: {r.quantity})
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2 border text-left">Date</th>
                <th className="p-2 border text-left">Réservés</th>
                <th className="p-2 border text-left">Override (disponible)</th>
                <th className="p-2 border text-left">Calcul (affiché)</th>
              </tr>
            </thead>
            <tbody>
              {dates.map(d => {
                const reserved = getReservedForDate(d);
                const override = overrides[d];
                const calc = getAvailabilityForDate(d);
                return (
                  <tr key={d}>
                    <td className="p-2 border">{format(new Date(d), "dd/MM/yyyy (EEE)")}</td>
                    <td className="p-2 border">{reserved}</td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={override === "" ? "" : String(override)}
                        onChange={(e) => handleOverrideChange(d, e.target.value)}
                      />
                    </td>
                    <td className="p-2 border font-semibold">{calc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </>
  );
}