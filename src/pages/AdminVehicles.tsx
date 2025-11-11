// import { useState, useEffect } from "react";
// import { useTranslation } from "react-i18next";
// import { supabase } from "@/integrations/supabase/client";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { Plus, Edit, Trash2, Car, Search } from "lucide-react";

// interface CarModel {
//   id: string;
//   name: string;
//   category: string;
//   transmission: string;
//   price: number;
//   fuel: string;
//   seats: number;
//   available: boolean;
//   image_url: string;
// }

// const AdminVehicles = () => {
//   const { t } = useTranslation();
//   const [models, setModels] = useState<CarModel[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("all");
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [editingModel, setEditingModel] = useState<CarModel | null>(null);

//   const categories = ["electric", "suv", "urban_suv", "sedan"];

//   useEffect(() => {
//     fetchModels();
//   }, []);

//   const fetchModels = async () => {
//     try {
//       setLoading(true);
//       const { data, error } = await supabase
//         .from("cars")
//         .select("*")
//         .is("is_deleted", false)
//         .order("name");

//       if (error) throw error;
//       setModels(data || []);
//     } catch (error) {
//       console.error("Erreur lors du chargement des modèles:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredModels = models.filter(model => {
//     const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesCategory = selectedCategory === "all" || model.category === selectedCategory;
//     return matchesSearch && matchesCategory;
//   });

//   const handleEdit = (model: CarModel) => {
//     setEditingModel(model);
//     setIsDialogOpen(true);
//   };

//   const handleDelete = async (id: string) => {
//     if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;

//     try {
//       const { error } = await supabase
//         .from("cars")
//         .update({ is_deleted: true })
//         .eq("id", id);

//       if (error) throw error;
      
//       setModels(models.filter(model => model.id !== id));
//     } catch (error) {
//       console.error("Erreur lors de la suppression:", error);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
//           <p className="text-gray-600">Chargement des modèles...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* En-tête */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">
//             {t("models_management.title")}
//           </h1>
//           <p className="text-gray-600">
//             {t("models_management.subtitle")}
//           </p>
//         </div>

//         {/* Filtres et actions */}
//         <Card className="mb-6">
//           <CardContent className="p-6">
//             <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
//               <div className="flex flex-col sm:flex-row gap-4 flex-1">
//                 <div className="space-y-2">
//                   <Label htmlFor="search">{t("models_management.search")}</Label>
//                   <div className="relative">
//                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                     <Input
//                       id="search"
//                       placeholder={t("models_management.search_placeholder")}
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       className="pl-10"
//                     />
//                   </div>
//                 </div>
                
//                 <div className="space-y-2">
//                   <Label htmlFor="category">{t("models_management.category")}</Label>
//                   <Select value={selectedCategory} onValueChange={setSelectedCategory}>
//                     <SelectTrigger className="w-[180px]">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">{t("models_management.all_categories")}</SelectItem>
//                       {categories.map(category => (
//                         <SelectItem key={category} value={category}>
//                           {t(`reservation_modal.categories.${category}`)}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>

//               <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//                 <DialogTrigger asChild>
//                   <Button className="flex items-center gap-2">
//                     <Plus className="h-4 w-4" />
//                     {t("models_management.add_model")}
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>
//                       {editingModel ? t("models_management.edit_model") : t("models_management.add_model")}
//                     </DialogTitle>
//                   </DialogHeader>
//                   {/* Formulaire d'ajout/modification */}
//                   <div className="space-y-4">
//                     <div>
//                       <Label htmlFor="name">{t("models_management.model_name")}</Label>
//                       <Input id="name" defaultValue={editingModel?.name} />
//                     </div>
//                     <div>
//                       <Label htmlFor="category">{t("models_management.category")}</Label>
//                       <Select defaultValue={editingModel?.category}>
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {categories.map(category => (
//                             <SelectItem key={category} value={category}>
//                               {t(`reservation_modal.categories.${category}`)}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <div>
//                       <Label htmlFor="price">{t("models_management.price")}</Label>
//                       <Input id="price" type="number" defaultValue={editingModel?.price} />
//                     </div>
//                     <Button className="w-full">
//                       {editingModel ? t("models_management.update") : t("models_management.create")}
//                     </Button>
//                   </div>
//                 </DialogContent>
//               </Dialog>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Tableau des modèles */}
//         <Card>
//           <CardHeader>
//             <CardTitle>
//               {t("models_management.models_list")} ({filteredModels.length})
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>{t("models_management.model")}</TableHead>
//                   <TableHead>{t("models_management.category")}</TableHead>
//                   <TableHead>{t("models_management.transmission")}</TableHead>
//                   <TableHead>{t("models_management.price")}</TableHead>
//                   <TableHead>{t("models_management.status")}</TableHead>
//                   <TableHead>{t("models_management.actions")}</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {filteredModels.map((model) => (
//                   <TableRow key={model.id}>
//                     <TableCell>
//                       <div className="flex items-center gap-3">
//                         <img
//                           src={model.image_url || "/placeholder-car.jpg"}
//                           alt={model.name}
//                           className="w-10 h-10 object-cover rounded"
//                         />
//                         <span className="font-medium">{model.name}</span>
//                       </div>
//                     </TableCell>
//                     <TableCell>
//                       <Badge variant="secondary">
//                         {t(`reservation_modal.categories.${model.category}`)}
//                       </Badge>
//                     </TableCell>
//                     <TableCell>
//                       {t(`car_card.transmission_types.${model.transmission}`)}
//                     </TableCell>
//                     <TableCell className="font-semibold">
//                       {model.price} MAD/jour
//                     </TableCell>
//                     <TableCell>
//                       <Badge variant={model.available ? "default" : "secondary"}>
//                         {model.available ? "Disponible" : "Indisponible"}
//                       </Badge>
//                     </TableCell>
//                     <TableCell>
//                       <div className="flex gap-2">
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => handleEdit(model)}
//                         >
//                           <Edit className="h-4 w-4" />
//                         </Button>
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => handleDelete(model.id)}
//                         >
//                           <Trash2 className="h-4 w-4" />
//                         </Button>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>

//             {filteredModels.length === 0 && (
//               <div className="text-center py-12">
//                 <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                   {t("models_management.no_models")}
//                 </h3>
//                 <p className="text-gray-600">
//                   {searchTerm || selectedCategory !== "all" 
//                     ? t("models_management.no_results")
//                     : t("models_management.no_models_description")
//                   }
//                 </p>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default AdminVehicles;