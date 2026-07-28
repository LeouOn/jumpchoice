import { DIFFICULTY_LABELS, type CyoaDifficulty } from "./CyoaChatSettings";
import { useTranslation as useUiTranslation } from "react-i18next";

interface DifficultySlidersProps {
  difficulty: CyoaDifficulty;
  onChange: (difficulty: CyoaDifficulty) => void;
}

const SLIDERS: Array<{
  key: "directorAggression" | "worldEscalation" | "informationLeakage";
  label: string;
  description: string;
}> = [
  {
    key: "directorAggression",
    label: "Director Aggression",
    description: "How ruthlessly the Director controls information and misdirects the player.",
  },
  {
    key: "worldEscalation",
    label: "World Escalation",
    description: "How quickly the opposition reacts to the player's actions and growing power.",
  },
  {
    key: "informationLeakage",
    label: "Information Leakage",
    description: "How much the Narrator learns from the World. Lower = more information, higher = more mystery.",
  },
];

export function DifficultySliders({ difficulty, onChange }: DifficultySlidersProps) {
  const { t: localizeUi } = useUiTranslation();
  const update = (key: "directorAggression" | "worldEscalation" | "informationLeakage", value: number) => {
    const stealthDisabled = key === "informationLeakage" && value === 5;
    onChange({ ...difficulty, [key]: value, stealthDisabled: difficulty.stealthDisabled || stealthDisabled });
  };

  const toggleAdversary = (enabled: boolean) => {
    onChange({ ...difficulty, adversaryEnabled: enabled });
  };

  return (
    <div className="space-y-6">
      {SLIDERS.map((slider) => {
        const value = difficulty[slider.key];
        const labels = DIFFICULTY_LABELS[slider.key];
        return (
          <div key={slider.key}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--foreground)]">{slider.label}</label>
              <span className="text-xs font-semibold text-[var(--primary)]">
                {labels[value as 1 | 2 | 3 | 4 | 5]} ({value}/5)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={value}
              onChange={(e) => update(slider.key, Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{slider.description}</p>
            {slider.key === "informationLeakage" && value === 5 && (
              <p className="mt-1 text-[10px] text-amber-400">{localizeUi("ui.cyoa.difficultysliders.atBlackoutDifficultyStealthAbilitiesAreRevealedToAll")}</p>
            )}
          </div>
        );
      })}

      <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={difficulty.adversaryEnabled}
            onChange={(e) => toggleAdversary(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          <div>
            <p className="text-xs font-medium text-[var(--foreground)]">{localizeUi("ui.cyoa.difficultysliders.enableAdversaryAgent")}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.difficultysliders.theDevilOnTheShoulderActivelyExploitsWeaknessesEngineers")}</p>
          </div>
        </label>
      </div>

      <p className="text-[10px] text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.difficultysliders.higherDifficultyMeansTheWorldReactsFasterTheDirector")}</p>
    </div>
  );
}
