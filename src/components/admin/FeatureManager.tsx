import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";

type FeatureStage = "coming_soon" | "development" | "beta_launch" | "stable" | "retire_soon" | "retired";

interface Feature {
  id: string;
  name: string;
  description: string | null;
  stage: FeatureStage;
  display_order: number;
  retire_date: string | null;
  created_at: string;
  updated_at: string;
}

const stageColors: Record<FeatureStage, string> = {
  coming_soon: "bg-gray-500",
  development: "bg-blue-500",
  beta_launch: "bg-purple-500",
  stable: "bg-green-500",
  retire_soon: "bg-yellow-500",
  retired: "bg-red-500",
};

const stageLabels: Record<FeatureStage, string> = {
  coming_soon: "Coming Soon",
  development: "Development",
  beta_launch: "Beta Launch",
  stable: "Stable",
  retire_soon: "Retire Soon",
  retired: "Retired",
};

export function FeatureManager() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stage: "coming_soon" as FeatureStage,
    display_order: 0,
    retire_date: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading features",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (feature?: Feature) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        name: feature.name,
        description: feature.description || "",
        stage: feature.stage,
        display_order: feature.display_order,
        retire_date: feature.retire_date || "",
      });
    } else {
      setEditingFeature(null);
      setFormData({
        name: "",
        description: "",
        stage: "coming_soon",
        display_order: features.length,
        retire_date: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        stage: formData.stage,
        display_order: formData.display_order,
        retire_date: formData.retire_date || null,
      };

      if (editingFeature) {
        const { error } = await supabase
          .from("features")
          .update(payload)
          .eq("id", editingFeature.id);

        if (error) throw error;
        toast({ title: "Feature updated successfully" });
      } else {
        const { error } = await supabase.from("features").insert(payload);

        if (error) throw error;
        toast({ title: "Feature created successfully" });
      }

      setDialogOpen(false);
      loadFeatures();
    } catch (error: any) {
      toast({
        title: "Error saving feature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return;

    try {
      const { error } = await supabase.from("features").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Feature deleted successfully" });
      loadFeatures();
    } catch (error: any) {
      toast({
        title: "Error deleting feature",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Feature Management</CardTitle>
            <CardDescription>Control feature stages and visibility</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Retire Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.id}>
                <TableCell>{feature.display_order}</TableCell>
                <TableCell className="font-medium">{feature.name}</TableCell>
                <TableCell className="max-w-xs truncate">{feature.description}</TableCell>
                <TableCell>
                  <Badge className={stageColors[feature.stage]}>
                    {stageLabels[feature.stage]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {feature.retire_date ? new Date(feature.retire_date).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(feature)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(feature.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFeature ? "Edit Feature" : "Add Feature"}</DialogTitle>
            <DialogDescription>
              Configure feature stage and visibility settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Feature Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter feature name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter feature description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value: FeatureStage) =>
                    setFormData({ ...formData, stage: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="beta_launch">Beta Launch</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="retire_soon">Retire Soon</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="retire_date">Retire Date (Optional)</Label>
              <Input
                id="retire_date"
                type="date"
                value={formData.retire_date}
                onChange={(e) => setFormData({ ...formData, retire_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingFeature ? "Update" : "Create"} Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
