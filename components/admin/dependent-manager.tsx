"use client";

import { Pencil, Plus, Trash, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Dependent = {
  id?: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  coveredUnder: string[];
};

type DependentManagerProps = {
  dependents: Dependent[];
  onChange: (dependents: Dependent[]) => void;
};

export function DependentManager({
  dependents,
  onChange,
}: DependentManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Dependent>({
    fullName: "",
    relationship: "child",
    dateOfBirth: "",
    coveredUnder: [],
  });

  const handleAdd = () => {
    setFormData({
      fullName: "",
      relationship: "child",
      dateOfBirth: "",
      coveredUnder: [],
    });
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const handleEdit = (index: number) => {
    setFormData(dependents[index]);
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSave = () => {
    // Validate date of birth is not in the future
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
    birthDate.setHours(0, 0, 0, 0);

    if (birthDate > today) {
      toast.error("Date of birth cannot be in the future");
      return;
    }

    if (editingIndex !== null) {
      const updated = [...dependents];
      updated[editingIndex] = formData;
      onChange(updated);
    } else {
      onChange([...dependents, formData]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    const updated = dependents.filter((_, i) => i !== index);
    onChange(updated);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const toggleCoverage = (coverage: string) => {
    if (formData.coveredUnder.includes(coverage)) {
      setFormData({
        ...formData,
        coveredUnder: formData.coveredUnder.filter((c) => c !== coverage),
      });
    } else {
      setFormData({
        ...formData,
        coveredUnder: [...formData.coveredUnder, coverage],
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Dependents
            </CardTitle>
            <CardDescription>
              {dependents.length} dependent{dependents.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Button onClick={handleAdd} size="sm" type="button">
            <Plus className="mr-2 h-4 w-4" />
            Add Dependent
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {dependents.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No dependents added
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Covered Under</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dependents.map((dependent, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {dependent.fullName}
                  </TableCell>
                  <TableCell className="capitalize">
                    {dependent.relationship}
                  </TableCell>
                  <TableCell>{calculateAge(dependent.dateOfBirth)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {dependent.coveredUnder.map((coverage) => (
                        <Badge key={coverage} variant="secondary">
                          {coverage}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(index)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(index)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? "Edit" : "Add"} Dependent
              </DialogTitle>
              <DialogDescription>
                Enter dependent information and select coverage options
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="John Doe"
                  value={formData.fullName}
                />
              </div>

              <div>
                <Label htmlFor="relationship">
                  Relationship <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, relationship: value })
                  }
                  value={formData.relationship}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="domestic_partner">
                      Domestic Partner
                    </SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                  type="date"
                  value={formData.dateOfBirth}
                />
                {formData.dateOfBirth && (
                  <p className="mt-1 text-muted-foreground text-sm">
                    Age: {calculateAge(formData.dateOfBirth)}
                  </p>
                )}
              </div>

              <div>
                <Label>Covered Under</Label>
                <div className="mt-2 space-y-2">
                  {["medical", "dental", "vision"].map((coverage) => (
                    <div className="flex items-center gap-2" key={coverage}>
                      <input
                        checked={formData.coveredUnder.includes(coverage)}
                        className="h-4 w-4"
                        id={`coverage-${coverage}`}
                        onChange={() => toggleCoverage(coverage)}
                        type="checkbox"
                      />
                      <label
                        className="text-sm capitalize"
                        htmlFor={`coverage-${coverage}`}
                      >
                        {coverage}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !formData.fullName ||
                  !formData.relationship ||
                  !formData.dateOfBirth
                }
                onClick={handleSave}
                type="button"
              >
                {editingIndex !== null ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
