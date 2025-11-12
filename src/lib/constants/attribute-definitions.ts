import { FILTERABLE_ATTRIBUTES } from "@/lib/constants/listings";

type AttributeSeed = {
  attribute_key: string;
  label: string;
  variant: "text" | "multi_select" | "boolean" | "range" | "number" | "json";
  description?: string;
  options?: string[];
  is_filterable?: boolean;
  is_required?: boolean;
};

export const attributeSeeds: AttributeSeed[] = FILTERABLE_ATTRIBUTES.map((attribute) => ({
  attribute_key: attribute.key,
  label: attribute.label,
  variant:
    attribute.variant === "range"
      ? "range"
      : attribute.variant === "boolean"
      ? "boolean"
      : attribute.variant === "multi-select"
      ? "multi_select"
      : "text",
  description: attribute.description,
  is_filterable: true,
}));

attributeSeeds.push(
  {
    attribute_key: "telehealth",
    label: "Telehealth",
    variant: "boolean",
    description: "Indicates if the agency offers virtual services.",
  },
  {
    attribute_key: "age_min",
    label: "Minimum age",
    variant: "number",
    description: "Lowest age served (in years).",
  },
  {
    attribute_key: "age_max",
    label: "Maximum age",
    variant: "number",
    description: "Highest age served (in years).",
  },
);

export type AttributeSeedKey = (typeof attributeSeeds)[number]["attribute_key"];
