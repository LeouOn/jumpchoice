import { nanoid } from "nanoid";
import type { JumpDocumentExtraction, JumpDocumentMerged, JumpDocumentSupplement } from "@jumpchoice/shared";

function mergeSupplements(supplements: JumpDocumentSupplement[]): JumpDocumentSupplement[] {
  const supplementMap = new Map<string, JumpDocumentSupplement>();

  for (const supp of supplements) {
    const key = supp.name.toLowerCase();
    const existing = supplementMap.get(key);

    if (!existing) {
      supplementMap.set(key, { ...supp, id: supp.id ?? nanoid() });
    } else {
      // Merge origins
      for (const origin of supp.origins) {
        if (!existing.origins.some((o) => o.name.toLowerCase() === origin.name.toLowerCase())) {
          existing.origins.push({ ...origin, id: origin.id ?? nanoid() });
        }
      }

      // Merge perks
      for (const perk of supp.perks) {
        if (!existing.perks.some((p) => p.name.toLowerCase() === perk.name.toLowerCase())) {
          existing.perks.push({ ...perk, id: perk.id ?? nanoid() });
        }
      }

      // Merge items
      for (const item of supp.items) {
        if (!existing.items.some((i) => i.name.toLowerCase() === item.name.toLowerCase())) {
          existing.items.push({ ...item, id: item.id ?? nanoid() });
        }
      }

      // Merge drawbacks
      for (const drawback of supp.drawbacks) {
        if (!existing.drawbacks.some((d) => d.name.toLowerCase() === drawback.name.toLowerCase())) {
          existing.drawbacks.push({ ...drawback, id: drawback.id ?? nanoid() });
        }
      }

      // Merge companions
      for (const companion of supp.companions) {
        if (!existing.companions.some((c) => c.name.toLowerCase() === companion.name.toLowerCase())) {
          existing.companions.push({ ...companion, id: companion.id ?? nanoid() });
        }
      }

      // Merge scenarios
      for (const scenario of supp.scenarios) {
        if (!existing.scenarios.some((s) => s.name.toLowerCase() === scenario.name.toLowerCase())) {
          existing.scenarios.push({ ...scenario, id: scenario.id ?? nanoid() });
        }
      }

      // Merge altForms
      for (const altForm of supp.altForms) {
        if (!existing.altForms.some((a) => a.name.toLowerCase() === altForm.name.toLowerCase())) {
          existing.altForms.push({ ...altForm, id: altForm.id ?? nanoid() });
        }
      }

      // Use higher budget
      if (supp.budget > existing.budget) {
        existing.budget = supp.budget;
      }

      // Use longer description
      if (supp.description.length > existing.description.length) {
        existing.description = supp.description;
      }
    }
  }

  return Array.from(supplementMap.values());
}

export function mergeExtractions(extractions: JumpDocumentExtraction[]): JumpDocumentMerged {
  const title = extractions.find((e) => e.title !== null)?.title ?? "Untitled Jump Document";
  const description = extractions.find((e) => e.description !== null)?.description ?? "";

  const allSupplements = extractions.flatMap((e) => e.supplements);
  const mergedSupplements = mergeSupplements(allSupplements);

  const pageCount = new Set(extractions.map((e) => e.pageNumber).filter((p): p is number => p !== null)).size;

  return {
    title,
    description,
    supplements: mergedSupplements,
    mergedAt: new Date().toISOString(),
    pageCount,
  };
}