"use client";

import { useCallback, useState, useTransition } from "react";
import { Asterisk } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  INTAKE_FIELD_SECTIONS,
  type IntakeFieldsConfig,
} from "@/lib/intake/field-registry";
import { updateIntakeFieldsConfig } from "@/lib/actions/intake";

interface IntakeFieldConfigProps {
  initialConfig: IntakeFieldsConfig;
}

export function IntakeFieldConfig({ initialConfig }: IntakeFieldConfigProps) {
  const [config, setConfig] = useState<IntakeFieldsConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const persist = useCallback(
    (next: IntakeFieldsConfig) => {
      startTransition(async () => {
        const result = await updateIntakeFieldsConfig(next);
        if (result.success) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
          setTimeout(() => setSaveStatus("idle"), 3000);
        }
      });
    },
    [],
  );

  const toggleEnabled = useCallback(
    (key: string, enabled: boolean) => {
      const next: IntakeFieldsConfig = {
        ...config,
        [key]: {
          ...config[key],
          enabled,
          // If disabling, also turn off required
          required: enabled ? config[key].required : false,
        },
      };
      setConfig(next);
      persist(next);
    },
    [config, persist],
  );

  const toggleRequired = useCallback(
    (key: string, required: boolean) => {
      const next: IntakeFieldsConfig = {
        ...config,
        [key]: { ...config[key], required },
      };
      setConfig(next);
      persist(next);
    },
    [config, persist],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Form Fields</h3>
          <p className="text-sm text-muted-foreground">
            Choose which fields appear on your intake form
          </p>
        </div>
        <div className="text-sm">
          {isPending && (
            <span className="text-muted-foreground">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-green-600">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-destructive">Failed to save</span>
          )}
        </div>
      </div>

      {INTAKE_FIELD_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {section.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {section.description}
            </p>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            <div className="divide-y">
              {section.fields.map((field) => {
                const fc = config[field.key];
                if (!fc) return null;

                return (
                  <div
                    key={field.key}
                    className={cn(
                      "flex items-center justify-between px-6 py-3 transition-colors",
                      !fc.enabled && "opacity-50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`enable-${field.key}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {field.label}
                      </Label>

                      {/* Required badge — only visible when field is enabled */}
                      {fc.enabled && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleRequired(field.key, !fc.required)
                          }
                          disabled={isPending}
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                            fc.required
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground hover:bg-muted/80",
                          )}
                        >
                          <Asterisk className="h-2.5 w-2.5" />
                          {fc.required ? "Required" : "Optional"}
                        </button>
                      )}
                    </div>

                    {/* Enabled toggle */}
                    <Switch
                      id={`enable-${field.key}`}
                      checked={fc.enabled}
                      disabled={isPending}
                      onCheckedChange={(val) =>
                        toggleEnabled(field.key, val)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
