// components/DeleteConfirmModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  type?: string;
  description?: string;
  isLoading?: boolean;
  type?: "task" | "project" | "default";
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description = "This action cannot be undone.",
  isLoading = false,
  type = "default",
}: DeleteConfirmModalProps) {
  const getTitle = () => {
    if (type === "task") return "Delete Task";
    if (type === "project") return "Delete Project";
    return "Delete";
  };

  const getButtonText = () => {
    if (type === "task") return "Delete Task";
    if (type === "project") return "Delete Project";
    return "Delete";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-lg">{getTitle()}</DialogTitle>
          </div>
          <DialogDescription className="mt-3">
            Are you sure you want to delete <strong>{title}</strong>?
            <br />
            <span className="text-xs text-muted-foreground">{description}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              getButtonText()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
