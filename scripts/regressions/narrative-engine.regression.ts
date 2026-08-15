import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NarrativeContext } from "../../packages/server/src/services/narrative/narrative-context.service.js";
import { NarrativeEngine } from "../../packages/server/src/services/narrative/narrative-engine.service.js";
import { PersonaManager } from "../../packages/server/src/services/narrative/persona-manager.service.js";
import type { ChainOfThoughtMode, NarratorPersona } from "@jumpchoice/shared";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const narrativeConfig = JSON.parse(
  readFileSync(join(repositoryRoot, "packages/server/narrative-config.json"), "utf-8"),
) as { defaultPersona: string; defaultCOTMode: string };

const testPersona: NarratorPersona = {
  id: "noir-narrator",
  name: "Noir Narrator",
  description: "A gritty noir-style narrator",
  prompt: "You narrate in a dark, atmospheric noir style with short punchy sentences.",
  style: {
    prose: "terse and atmospheric",
    dialogue: "clipped, hardboiled",
    tone: "cynical",
  },
};

const testCOTMode: ChainOfThoughtMode = {
  id: "standard",
  name: "Standard COT",
  description: "Standard chain of thought reasoning",
  phases: ["Analyze the scene", "Consider NPC motivations", "Draft narrative beat"],
  cotTag: "think",
};

// NarrativeEngine: default principles pin the core narrative contract.
{
  const engine = new NarrativeEngine();
  const description = engine.getPrinciples().description;
  for (const fragment of [
    "not a helpful assistant",
    "NPCs only know",
    "never decide user",
    "NPCs have their own",
    "real brand names",
    "drive the story forward",
    "morally grey",
    "ANTI-ASSISTANT BIAS",
  ]) {
    assert.ok(description.includes(fragment), `default principles must mention: ${fragment}`);
  }
}

// NarrativeEngine: principle overrides.
{
  const overridden = new NarrativeEngine({ description: "Custom narrator rules" });
  assert.equal(overridden.getPrinciples().description, "Custom narrator rules");
}

// NarrativeEngine: persona handling.
{
  const engine = new NarrativeEngine();
  engine.setPersona(testPersona);
  assert.deepEqual(engine.getPersona(), testPersona);

  const withPersona = engine.buildSystemPrompt();
  assert.ok(withPersona.includes("NARRATOR PERSONA:"));
  assert.ok(withPersona.includes(testPersona.prompt));

  const withoutPersona = new NarrativeEngine().buildSystemPrompt();
  assert.equal(withoutPersona.includes("NARRATOR PERSONA:"), false);

  for (const badPrompt of ["", "   "]) {
    assert.throws(
      () => new NarrativeEngine().setPersona({ ...testPersona, prompt: badPrompt }),
      /Persona prompt must be non-empty/,
    );
  }
}

// NarrativeEngine: PersonaManager takes precedence over a directly set persona.
{
  const engine = new NarrativeEngine();
  assert.equal(engine.getPersonaManager(), null);

  const manager = new PersonaManager();
  manager.setActivePersona("noir");
  engine.setPersonaManager(manager);
  assert.equal(engine.getPersonaManager(), manager);

  const noirPrompt = engine.buildSystemPrompt();
  assert.ok(noirPrompt.includes("NARRATOR PERSONA:"));
  assert.ok(noirPrompt.includes("noir"));

  engine.setPersona(testPersona);
  const managerOnly = new NarrativeEngine();
  managerOnly.setPersona(testPersona);
  const overridingManager = new PersonaManager();
  overridingManager.setActivePersona("cozy");
  managerOnly.setPersonaManager(overridingManager);
  const cozyPrompt = managerOnly.buildSystemPrompt();
  assert.ok(cozyPrompt.includes("cozy"));
  assert.equal(cozyPrompt.includes(testPersona.prompt), false);

  const inactiveManager = new PersonaManager();
  engine.setPersonaManager(inactiveManager);
  assert.ok(engine.buildSystemPrompt().includes(testPersona.prompt));
}

// NarrativeEngine: COT mode handling.
{
  const engine = new NarrativeEngine();
  engine.setCOTMode(testCOTMode);
  assert.deepEqual(engine.getCOTMode(), testCOTMode);

  const cotPrompt = engine.buildSystemPrompt();
  assert.ok(cotPrompt.includes("CHAIN OF THOUGHT:"));
  assert.ok(cotPrompt.includes("1. Analyze the scene"));
  assert.ok(cotPrompt.includes("2. Consider NPC motivations"));
  assert.ok(cotPrompt.includes("3. Draft narrative beat"));
  assert.ok(cotPrompt.includes("<think>"));

  const customTagEngine = new NarrativeEngine();
  customTagEngine.setCOTMode({ ...testCOTMode, cotTag: "reasoning" });
  assert.ok(customTagEngine.buildSystemPrompt().includes("<reasoning>"));

  assert.equal(new NarrativeEngine().buildSystemPrompt().includes("CHAIN OF THOUGHT:"), false);

  assert.throws(
    () => new NarrativeEngine().setCOTMode({ ...testCOTMode, phases: [] }),
    /COT mode must have at least one phase/,
  );
}

// NarrativeEngine: composition ordering — principles, then persona, then COT.
{
  const engine = new NarrativeEngine();
  engine.setPersona(testPersona);
  engine.setCOTMode(testCOTMode);
  const prompt = engine.buildSystemPrompt();
  assert.ok(prompt.includes("ANTI-ASSISTANT BIAS"));
  assert.ok(prompt.includes("NARRATOR PERSONA:"));
  assert.ok(prompt.includes("CHAIN OF THOUGHT:"));
  assert.ok(prompt.indexOf("NARRATOR PERSONA:") < prompt.indexOf("CHAIN OF THOUGHT:"));
}

// NarrativeContext: config defaults, overrides, and prompt structure.
{
  const context = new NarrativeContext();
  context.setPersona(narrativeConfig.defaultPersona);
  context.setCOTMode(narrativeConfig.defaultCOTMode);
  assert.equal(context.getPersonaManager().getActivePersona()?.id, narrativeConfig.defaultPersona);
  assert.equal(context.getCOTManager().getActiveMode()?.id, narrativeConfig.defaultCOTMode);

  context.setPersona("cozy");
  assert.equal(context.getPersonaManager().getActivePersona()?.id, "cozy");
  context.setCOTMode("fast");
  assert.equal(context.getCOTManager().getActiveMode()?.id, "fast");

  const prompt = context.buildSystemPrompt();
  for (const fragment of ["ANTI-ASSISTANT BIAS", "KNOWLEDGE FIREWALL", "USER AGENCY", "NARRATOR PERSONA", "CHAIN OF THOUGHT"]) {
    assert.ok(prompt.includes(fragment), `context prompt must include: ${fragment}`);
  }
  assert.match(prompt, /NARRATOR PERSONA[\s\S]*cozy/i);
  assert.match(prompt, /CHAIN OF THOUGHT\s*\([^)]*fast[^)]*\)/i);
  for (const fragment of ["STYLE:", "Prose:", "Dialogue:", "Tone:", "<think>", "</think>"]) {
    assert.ok(prompt.includes(fragment), `context prompt must include: ${fragment}`);
  }
}

// NarrativeContext: empty and partial states.
{
  const empty = new NarrativeContext().buildSystemPrompt();
  assert.ok(empty.includes("ANTI-ASSISTANT BIAS"));
  assert.equal(empty.includes("NARRATOR PERSONA"), false);
  assert.equal(empty.includes("CHAIN OF THOUGHT"), false);

  const personaOnly = new NarrativeContext();
  personaOnly.setPersona("noir");
  const personaOnlyPrompt = personaOnly.buildSystemPrompt();
  assert.match(personaOnlyPrompt, /NARRATOR PERSONA[\s\S]*noir/i);
  assert.equal(personaOnlyPrompt.includes("CHAIN OF THOUGHT"), false);

  const cotOnly = new NarrativeContext();
  cotOnly.setCOTMode("main");
  const cotOnlyPrompt = cotOnly.buildSystemPrompt();
  assert.equal(cotOnlyPrompt.includes("NARRATOR PERSONA"), false);
  assert.match(cotOnlyPrompt, /CHAIN OF THOUGHT\s*\([^)]*main[^)]*\)/i);

  assert.throws(() => new NarrativeContext().setPersona("invalid"));
  assert.throws(() => new NarrativeContext().setCOTMode("invalid"));
}

// NarrativeContext: full main-mode prompt ordering and COT phases.
{
  const context = new NarrativeContext();
  context.setPersona("noir");
  context.setCOTMode("main");
  const prompt = context.buildSystemPrompt();
  assert.ok(prompt.indexOf("ANTI-ASSISTANT BIAS") < prompt.indexOf("NARRATOR PERSONA"));
  assert.ok(prompt.indexOf("NARRATOR PERSONA") < prompt.indexOf("CHAIN OF THOUGHT"));
  for (const phase of ["1.", "2.", "3.", "4.", "5."]) {
    assert.ok(new RegExp(`${phase}\\s+\\w+`).test(prompt), `main mode must include phase ${phase}`);
  }

  assert.ok(prompt.includes("Noir Narrator"));
  context.setPersona("cozy");
  assert.ok(context.buildSystemPrompt().includes("Cozy Narrator"));
}

process.stdout.write("Narrative engine regression passed.\n");
