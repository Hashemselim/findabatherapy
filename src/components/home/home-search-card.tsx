"use client";

import { useMemo, useState } from "react";
import { Building2, Check, MapPin, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const serviceOptions = [
  { id: "in-home", label: "In Home" },
  { id: "in-center", label: "Center" },
] as const;

const insuranceOptions = ["Aetna", "Cigna", "UnitedHealthcare", "Medicaid", "Blue Cross Blue Shield", "TRICARE"];

export function HomeSearchCard() {
  const [open, setOpen] = useState(false);
  const [insurance, setInsurance] = useState<string>();
  const [settingOpen, setSettingOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({
    "in-home": true,
    "in-center": true,
  });

  const displayInsurance = insurance ?? "Select plan";

  const toggleService = (key: string) =>
    setSelectedServices((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  const servicesActive = useMemo(() => {
    const active = serviceOptions.filter((service) => selectedServices[service.id]).map((service) => service.label);
    return active.length ? active.join(", ") : undefined;
  }, [selectedServices]);

  return (
    <div className="rounded-3xl border border-border bg-white p-4 shadow-lg lg:p-6">
      <div className="grid gap-4 md:grid-cols-[1.7fr_1.7fr_1.7fr_auto] md:items-end">
        <label className="text-sm font-medium text-muted-foreground">
          Location
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border px-3">
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Input placeholder="City or ZIP" className="border-0 shadow-none focus-visible:ring-0" />
          </div>
        </label>

        <label className="text-sm font-medium text-muted-foreground">
          Therapy setting
          <Popover open={settingOpen} onOpenChange={setSettingOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-border px-3 py-2 text-left text-sm"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className={cn(!servicesActive && "text-muted-foreground")}>
                  {servicesActive || "Select therapy setting"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Filter settings..." />
                <CommandEmpty>No setting found.</CommandEmpty>
                <CommandGroup>
                  {serviceOptions.map((service) => {
                    const active = selectedServices[service.id];
                    return (
                      <CommandItem
                        key={service.id}
                        value={service.id}
                        onSelect={() => toggleService(service.id)}
                        className="flex items-center gap-2"
                      >
                        <Check className={cn("h-4 w-4", active ? "opacity-100 text-primary" : "opacity-0")} aria-hidden />
                        {service.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </label>

        <label className="text-sm font-medium text-muted-foreground">
          Insurance
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-border px-3 py-2 text-left text-sm"
              >
                <Stethoscope className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className={cn(!insurance && "text-muted-foreground")}>{displayInsurance}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search insurance..." />
                <CommandEmpty>No insurance found.</CommandEmpty>
                <CommandGroup>
                  {insuranceOptions.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={(value) => {
                        setInsurance(value);
                        setOpen(false);
                      }}
                    >
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </label>
        <Button
          className="mt-2 h-12 w-full rounded-full border border-[#FEE720] bg-[#FEE720] px-6 text-base font-semibold text-[#333333] hover:bg-[#f5d900] md:mt-0 md:w-auto md:self-end"
          size="lg"
        >
          Find care
        </Button>
      </div>
    </div>
  );
}
