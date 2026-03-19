import { type SocialTemplate } from "./types";
import { SOCIAL_TEMPLATES } from "./templates";

/**
 * Get upcoming dated templates within the next N days (default 21).
 * Sorts by days until event (soonest first).
 */
export function getUpcomingTemplates(
  windowDays = 21,
  referenceDate = new Date()
): (SocialTemplate & { daysUntil: number; nextOccurrence: Date })[] {
  const today = referenceDate;
  const currentYear = today.getFullYear();

  const upcoming: (SocialTemplate & {
    daysUntil: number;
    nextOccurrence: Date;
  })[] = [];

  for (const template of SOCIAL_TEMPLATES) {
    if (!template.eventDate) continue;

    const [month, day] = template.eventDate.split("-").map(Number);

    // Check this year and next year
    for (const year of [currentYear, currentYear + 1]) {
      const eventDate = new Date(year, month - 1, day);
      const diffMs = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= -1 && diffDays <= windowDays) {
        upcoming.push({
          ...template,
          daysUntil: diffDays,
          nextOccurrence: eventDate,
        });
        break; // Only include the nearest occurrence
      }
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}
