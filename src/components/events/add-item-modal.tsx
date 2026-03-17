/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddItemModalProps<T extends Record<string, any>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: (data: T) => void;
  fields: { name: keyof T; label: string; type?: string; required?: boolean }[];
}

export const AddItemModal = <T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  onSubmit,
  fields,
}: AddItemModalProps<T>) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const formData = new FormData(e.currentTarget);
    const entries = Array.from(formData.entries()).map(([key, value]) => [
      key,
      typeof value === "string" ? value : "",
    ]);

    onSubmit(Object.fromEntries(entries) as T);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {fields.map(field => (
            <div
              key={String(field.name)}
              className="flex flex-col gap-2"
            >
              <label className="open_sans text-sm font-medium">
                {field.label}
              </label>
              <Input
                name={String(field.name)}
                type={field.type || "text"}
                required={field.required}
              />
            </div>
          ))}
          <DialogFooter className="flex flex-wrap gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
