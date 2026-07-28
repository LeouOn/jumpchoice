import { nanoid } from "nanoid";
import type { CYOAExtraction, CYOAChoice, CYOADocument } from "./cyoa-types.js";

export function mergeExtractions(extractions: CYOAExtraction[]): CYOADocument {
  const title =
    extractions.find((e) => e.title !== null)?.title ?? "Untitled CYOA";

  const description =
    extractions.find((e) => e.description !== null)?.description ?? "";

  const pointBudget =
    extractions.find((e) => e.pointBudget !== null)?.pointBudget ?? null;

  const categoryMap = new Map<string, string>();
  for (const ext of extractions) {
    for (const cat of ext.categories) {
      const lower = cat.toLowerCase();
      if (!categoryMap.has(lower)) {
        categoryMap.set(lower, cat);
      }
    }
  }
  const categories = Array.from(categoryMap.values());

  const choiceMap = new Map<
    string,
    {
      name: string;
      description: string;
      category: string;
      pointCost: number;
      prerequisites: string[];
      tags: Set<string>;
      sourceImageIds: Set<string>;
      confidence: number;
    }
  >();

  for (const ext of extractions) {
    for (const choice of ext.choices) {
      const key = choice.name.toLowerCase();
      const existing = choiceMap.get(key);

      if (!existing) {
        choiceMap.set(key, {
          name: choice.name,
          description: choice.description,
          category: choice.category,
          pointCost: choice.pointCost,
          prerequisites: [...choice.prerequisites],
          tags: new Set(choice.tags),
          sourceImageIds: new Set([ext.imageId]),
          confidence: choice.confidence,
        });
      } else {
        existing.sourceImageIds.add(ext.imageId);

        for (const tag of choice.tags) {
          existing.tags.add(tag);
        }

        if (choice.confidence > existing.confidence) {
          existing.name = choice.name;
          existing.category = choice.category;
          existing.pointCost = choice.pointCost;
          existing.confidence = choice.confidence;
        }

        if (choice.description.length > existing.description.length) {
          existing.description = choice.description;
        }

        for (const prereq of choice.prerequisites) {
          if (!existing.prerequisites.includes(prereq)) {
            existing.prerequisites.push(prereq);
          }
        }
      }
    }
  }

  const nameToId = new Map<string, string>();
  for (const [key, _merged] of choiceMap) {
    nameToId.set(key, nanoid());
  }

  const choices: CYOAChoice[] = Array.from(choiceMap.entries()).map(
    ([key, merged]) => ({
      id: nameToId.get(key)!,
      name: merged.name,
      description: merged.description,
      category: merged.category,
      pointCost: merged.pointCost,
      prerequisites: merged.prerequisites,
      tags: Array.from(merged.tags),
      sourceImageIds: Array.from(merged.sourceImageIds),
    }),
  );

  const imageCount = new Set(extractions.map((e) => e.imageId)).size;

  return {
    title,
    description,
    pointBudget,
    categories,
    choices,
    imageCount,
    mergedAt: new Date().toISOString(),
  };
}
