import { useState, type SubmitEvent } from "react";
import type { EmployeeFormOptions, EmployeeInput } from "@smt/shared/api-types";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { formatCountry } from "@/lib/format";
import { FORM_COPY } from "./employees.constants";

type Field = keyof EmployeeInput;

const EMPTY: EmployeeInput = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  department: "",
  country: "",
  currency: "",
  salary: "",
  hiredAt: "",
};

interface EmployeeFormDialogProps {
  open: boolean;
  options: EmployeeFormOptions;
  onOpenChange: (open: boolean) => void;
  /** Rejects with an ApiError whose `details` name the bad fields. */
  onSubmit: (input: EmployeeInput) => Promise<void>;
}

export function EmployeeFormDialog({ open, options, onOpenChange, onSubmit }: EmployeeFormDialogProps) {
  const [values, setValues] = useState<EmployeeInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      // Anything that isn't an ApiError is a bug: rethrow inside React so the error boundary reports it.
      if (!(err instanceof ApiError)) {
        setSaving(() => {
          throw err;
        });
        return;
      }
      if (err.details) setErrors(err.details);
      else setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const fieldProps = (field: Field) => ({
    id: `employee-${field}`,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `employee-${field}-error` : undefined,
  });
  const fieldError = (field: Field) =>
    errors[field] && (
      <p id={`employee-${field}-error`} className="text-sm text-destructive">
        {errors[field]}
      </p>
    );

  const textField = (field: Field, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`employee-${field}`}>{label}</Label>
      <Input
        {...fieldProps(field)}
        value={values[field]}
        onChange={(event) => {
          set(field, event.target.value);
        }}
        required
        {...props}
      />
      {fieldError(field)}
    </div>
  );

  const selectField = (field: Field, label: string, items: { value: string; label: string }[], onPick = set) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`employee-${field}`}>{label}</Label>
      <Select
        value={values[field]}
        onValueChange={(value) => {
          onPick(field, value);
        }}
      >
        <SelectTrigger {...fieldProps(field)} className="w-full">
          <SelectValue placeholder={FORM_COPY.choose} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldError(field)}
    </div>
  );

  // Choosing a country pre-fills its usual currency; HR can still pick another (expats, contractors).
  const pickCountry = (_field: Field, code: string) => {
    const usual = options.countries.find((c) => c.code === code)?.currency;
    setValues((current) => ({ ...current, country: code, currency: usual ?? current.currency }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{FORM_COPY.addTitle}</DialogTitle>
          <DialogDescription>{FORM_COPY.description}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid grid-cols-2 gap-4">
            {textField("firstName", FORM_COPY.firstName)}
            {textField("lastName", FORM_COPY.lastName)}
          </div>
          {textField("jobTitle", FORM_COPY.jobTitle)}
          {selectField(
            "department",
            FORM_COPY.department,
            options.departments.map((d) => ({ value: d, label: d })),
          )}
          <div className="grid grid-cols-2 gap-4">
            {selectField(
              "country",
              FORM_COPY.country,
              options.countries.map((c) => ({ value: c.code, label: formatCountry(c.code) })),
              pickCountry,
            )}
            {selectField(
              "currency",
              FORM_COPY.currency,
              options.currencies.map((c) => ({ value: c, label: c })),
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {textField("salary", FORM_COPY.salary, { inputMode: "decimal", autoComplete: "off" })}
            {textField("hiredAt", FORM_COPY.hiredAt, { type: "date" })}
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {FORM_COPY.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {FORM_COPY.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
