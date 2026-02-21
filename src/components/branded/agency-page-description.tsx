interface AgencyPageDescriptionProps {
  description: string | null;
}

export function AgencyPageDescription({ description }: AgencyPageDescriptionProps) {
  if (!description) return null;

  return (
    <section>
      <div className="prose prose-gray max-w-none">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
