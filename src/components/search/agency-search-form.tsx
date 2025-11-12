"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FILTERABLE_ATTRIBUTES, SERVICE_TYPES } from "@/lib/constants/listings";
import { US_STATES } from "@/lib/data/us-states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  state: z.string().min(1, "Choose a state"),
  serviceType: z.string().optional(),
});

type AgencySearchFormValues = z.infer<typeof formSchema>;

const ANY_SERVICE_TYPE = "any";

export function AgencySearchForm() {
  const router = useRouter();
  const form = useForm<AgencySearchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      state: "",
      serviceType: "",
    },
  });

  const primaryFilters = useMemo(
    () => FILTERABLE_ATTRIBUTES.slice(0, 3),
    [],
  );

  const onSubmit = (values: AgencySearchFormValues) => {
    const searchParams = new URLSearchParams();
    searchParams.set("state", values.state);
    if (values.serviceType) {
      searchParams.set("serviceType", values.serviceType);
    }
    router.push(`/${values.state}?${searchParams.toString()}`);
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur md:grid md:grid-cols-[1.2fr_1fr_auto] md:items-end md:gap-6 md:p-6"
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="state">
          State or territory
        </label>
        <Select value={form.watch("state") || undefined} onValueChange={(value) => form.setValue("state", value, { shouldValidate: true })}>
          <SelectTrigger id="state" className="h-11 text-left">
            <SelectValue placeholder="Select a state" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((state) => (
              <SelectItem key={state.value} value={state.value} className="capitalize">
                {state.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.state && (
          <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="serviceType">
          Service setting
        </label>
        <Select
          value={form.watch("serviceType") || ANY_SERVICE_TYPE}
          onValueChange={(value) =>
            form.setValue("serviceType", value === ANY_SERVICE_TYPE ? "" : value, {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger id="serviceType" className="h-11 text-left">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_SERVICE_TYPE}>Any</SelectItem>
            {SERVICE_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" className="h-11 md:self-center">
        Search agencies
      </Button>

      <div className="col-span-full grid gap-3 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground md:grid-cols-3">
        {primaryFilters.map((filter) => (
          <div key={filter.key}>
            <p className="font-medium text-foreground">{filter.label}</p>
            <p>{filter.description}</p>
          </div>
        ))}
      </div>
    </form>
  );
}
