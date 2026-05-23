import { describe, it, expect } from 'vitest';
import { NarrativeContext } from '../src/services/narrative/narrative-context.service.js';

describe('NarrativeContext Integration', () => {
  it('should build complete system prompt with all components', () => {
    const context = new NarrativeContext();
    
    context.setPersona('noir');
    context.setCOTMode('main');
    
    const prompt = context.buildSystemPrompt();
    
    expect(prompt).toContain('ANTI-ASSISTANT BIAS');
    expect(prompt).toContain('NARRATOR PERSONA');
    expect(prompt).toContain('CHAIN OF THOUGHT');
  });
  
  it('should work with only principles', () => {
    const context = new NarrativeContext();
    
    const prompt = context.buildSystemPrompt();
    
    expect(prompt).toContain('ANTI-ASSISTANT BIAS');
    expect(prompt).not.toContain('NARRATOR PERSONA');
    expect(prompt).not.toContain('CHAIN OF THOUGHT');
  });
  
  it('should allow dynamic persona changes', () => {
    const context = new NarrativeContext();
    
    context.setPersona('noir');
    let prompt = context.buildSystemPrompt();
    expect(prompt).toContain('Noir Narrator');
    
    context.setPersona('cozy');
    prompt = context.buildSystemPrompt();
    expect(prompt).toContain('Cozy Narrator');
  });
});
