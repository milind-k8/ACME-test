import { useState } from "react";
import type { Employee } from "@smt/shared/api-types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { DELETE_COPY } from "./employees.constants";

interface DeleteEmployeeDialogProps {
  /** The employee to delete; null keeps the dialog closed. */
  employee: Employee | null;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function DeleteEmployeeDialog({ employee, onConfirm, onOpenChange }: DeleteEmployeeDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A plain button rather than AlertDialogAction, which would close the dialog before the delete finishes.
  async function confirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      // Anything that isn't an ApiError is a bug: rethrow inside React so the error boundary reports it.
      if (!(err instanceof ApiError)) {
        setDeleting(() => {
          throw err;
        });
        return;
      }
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={employee !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{employee && DELETE_COPY.title(employee)}</AlertDialogTitle>
          <AlertDialogDescription>{DELETE_COPY.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{DELETE_COPY.cancel}</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={() => void confirm()}>
            {DELETE_COPY.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
