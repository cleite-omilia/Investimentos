"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteOperationDialogProps {
  operationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteOperationDialog({
  operationId,
  open,
  onOpenChange,
  onDeleted,
}: DeleteOperationDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!operationId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/operations/${operationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = (await res.json()) as any;
        toast.error(data.error || "Erro ao excluir operacao");
        return;
      }

      toast.success("Operacao excluida com sucesso!");
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("Erro ao excluir operacao");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir Operacao</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta operacao? Esta acao nao pode ser
            desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
