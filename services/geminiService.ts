
import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Mentor, ChallengeAuthor, Task, Note, AIToolConfig, JournalEntry } from "../types";
import { DEFAULT_CONFIG, DEFAULT_AI_TOOLS, DEFAULT_MODEL, applyTypography, BASE_OUTPUT_INSTRUCTION } from '../constants';

// --- API Access ---
// Safely obtain API key to prevent "Uncaught ReferenceError: process is not defined"
const getApiKey = (): string => {
  try {
    // Check global process (bundlers often replace this)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    // Check manual window polyfill
    if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
      return (window as any).process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Error reading API key:", e);
  }
  return '';
};

// Initialize client lazily to prevent crash on module load if key is missing
const getAiClient = () => {
    const apiKey = getApiKey();
    return new GoogleGenAI({ apiKey: apiKey || 'MISSING_KEY' });
};

// Helper to check if model requires legacy/chat handling (Gemma doesn't support systemInstruction in config)
const isGemmaModel = (model: string) => model.toLowerCase().includes('gemma');

// Helper to get dynamic config for Gemma to prevent determinism
const getGemmaConfig = () => ({
  temperature: 0.85,
  topP: 0.95,
  topK: 40,
  seed: Math.floor(Math.random() * 2147483647), // Use a random seed to force variety
});

// Helper for safe JSON parsing to handle potential markdown formatting or extra text
const parseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    // Locate the JSON object within the text (handles markdown blocks or preamble text)
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start === -1 || end === -1 || start > end) {
       // If no object braces found, try cleaning markdown just in case it's a bare value or array (unlikely for our schemas)
       const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
       return JSON.parse(cleanText) as T;
    }

    const jsonStr = text.substring(start, end + 1);
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("JSON Parse Error:", e, "Text:", text);
    return fallback;
  }
};

const getToolConfig = (id: string, config: AppConfig): AIToolConfig => {
  return config.aiTools?.find(t => t.id === id) || 
         DEFAULT_AI_TOOLS.find(t => t.id === id) || 
         { 
           id: 'default', 
           name: 'Default Tool',
           systemPrompt: 'You are a helpful assistant.', 
           model: DEFAULT_MODEL 
         };
};

export const autoTagNote = async (content: string, config: AppConfig): Promise<string[]> => {
  const tool = getToolConfig('tagger', config);
  const model = tool.model || DEFAULT_MODEL;
  const fullPrompt = `${tool.systemPrompt}\n\nБаза знаний (контекст): ${config.coreLibrary}`;
  const ai = getAiClient();

  try {
    let response;
    
    if (isGemmaModel(model)) {
        // Gemma Strategy: Prompt Engineering instead of Config
        const gemmaPrompt = `${fullPrompt}\n\n[TASK]\nAnalyze the text below and extract 1-5 relevant tags.\nText: "${content}"\n\n[OUTPUT]\nReturn ONLY raw JSON in this format: { "tags": ["tag1", "tag2"] }`;
        response = await ai.models.generateContent({
            model,
            contents: gemmaPrompt,
            config: getGemmaConfig()
        });
    } else {
        // Gemini Strategy: Native Config
        response = await ai.models.generateContent({
          model,
          contents: content,
          config: {
            systemInstruction: fullPrompt,
            responseMimeType: tool.responseMimeType || "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: { tags: { type: Type.ARRAY, items: { type: Type.STRING } } }
            }
          }
        });
    }

    const json = parseJSON<{tags: string[]}>(response.text, { tags: [] });
    return json.tags || [];

  } catch (error) {
    console.error("AutoTag Error", error);
    return [];
  }
};

export const findNotesByMood = async (notes: Note[], mood: string, config: AppConfig): Promise<string[]> => {
    const tool = getToolConfig('mood_matcher', config);
    const model = tool.model || DEFAULT_MODEL;
    const ai = getAiClient();
    
    // Prepare simplified notes for context
    const notesContext = notes.map(n => `ID: ${n.id}\nContent: ${n.content.substring(0, 200)}...`).join('\n---\n');
    const fullPrompt = `${tool.systemPrompt}\n\n[NOTES DATABASE]\n${notesContext}`;

    try {
        let response;
        if (isGemmaModel(model)) {
             const gemmaPrompt = `${fullPrompt}\n\n[TASK]\nUser Mood: "${mood}"\nFind relevant Note IDs.\n\n[OUTPUT]\nReturn ONLY raw JSON: { "ids": ["id1", "id2"] }`;
             response = await ai.models.generateContent({
                model,
                contents: gemmaPrompt,
                config: getGemmaConfig()
             });
        } else {
            response = await ai.models.generateContent({
                model,
                contents: `Mood: ${mood}`,
                config: {
                    systemInstruction: fullPrompt,
                    responseMimeType: tool.responseMimeType || "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { ids: { type: Type.ARRAY, items: { type: Type.STRING } } }
                    }
                }
            });
        }
        
        const json = parseJSON<{ids: string[]}>(response.text, { ids: [] });
        return json.ids || [];
    } catch (e) {
        console.error("Mood Match Error", e);
        return [];
    }
};

export interface SandboxAnalysis {
  analysis: string;
  suggestedTask: string;
  suggestedFlashcardFront: string;
  suggestedFlashcardBack: string;
}

export const analyzeSandboxItem = async (content: string, mentorId: string, config: AppConfig): Promise<SandboxAnalysis | null> => {
    const mentor = config.mentors.find(m => m.id === mentorId) || config.mentors[0];
    const model = mentor.model || DEFAULT_MODEL;
    const ai = getAiClient();
    
    const systemInstruction = `${mentor.systemPrompt}\n\n${BASE_OUTPUT_INSTRUCTION}\n\nCONTEXT:\n${config.coreLibrary}`;

    try {
        let response;
        if (isGemmaModel(model)) {
             const gemmaPrompt = `${systemInstruction}\n\n[INPUT TEXT]\n"${content}"\n\n[OUTPUT]\nReturn ONLY raw JSON conforming to the schema described above.`;
             response = await ai.models.generateContent({
                model,
                contents: gemmaPrompt,
                config: getGemmaConfig()
             });
        } else {
             response = await ai.models.generateContent({
                model,
                contents: content,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            analysis: { type: Type.STRING },
                            suggestedTask: { type: Type.STRING },
                            suggestedFlashcardFront: { type: Type.STRING },
                            suggestedFlashcardBack: { type: Type.STRING },
                        }
                    }
                }
             });
        }

        return parseJSON<SandboxAnalysis>(response.text, { 
            analysis: "Could not analyze.", 
            suggestedTask: "Review content", 
            suggestedFlashcardFront: "Key Concept", 
            suggestedFlashcardBack: "Definition" 
        });

    } catch (e) {
        console.error("Sandbox Analysis Error", e);
        return null;
    }
};

export const getKanbanTherapy = async (taskContent: string, type: 'stuck' | 'completed', config: AppConfig): Promise<string> => {
    const tool = getToolConfig('kanban_therapist', config);
    const model = tool.model || DEFAULT_MODEL;
    const ai = getAiClient();
    
    const context = type === 'stuck' 
        ? "The user is STUCK on this task. Help them unblock it using stoic/cognitive reframing." 
        : "The user COMPLETED this task. Help them integrate this win and reflect on the value.";
    
    const fullPrompt = `${tool.systemPrompt}\n\nCONTEXT: ${context}\n\nTASK: "${taskContent}"`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: fullPrompt, // Simple text generation
            config: isGemmaModel(model) ? getGemmaConfig() : { systemInstruction: tool.systemPrompt }
        });
        return applyTypography(response.text || "Thinking...");
    } catch (e) {
        console.error("Kanban Therapy Error", e);
        return "Thinking process interrupted.";
    }
};

export const generateTaskChallenge = async (taskContent: string, config: AppConfig): Promise<string> => {
    const author = config.challengeAuthors[0]; // Default to first author (Popper usually)
    if (!author) return "No challenge author configured.";
    
    const model = author.model || DEFAULT_MODEL;
    const fullPrompt = `${author.systemPrompt}\n\nTASK: "${taskContent}"\n\nGenerate a challenge checklist (Markdown).`;
    const ai = getAiClient();

    try {
        const response = await ai.models.generateContent({
            model,
            contents: fullPrompt,
            config: isGemmaModel(model) ? getGemmaConfig() : { systemInstruction: author.systemPrompt }
        });
        return applyTypography(response.text || "");
    } catch (e) {
        console.error("Challenge Generation Error", e);
        return "Could not generate challenge.";
    }
};

export const analyzeJournalPath = async (entries: JournalEntry[], config: AppConfig): Promise<string> => {
    const tool = getToolConfig('journal_mentor', config);
    const model = tool.model || DEFAULT_MODEL;
    const ai = getAiClient();

    // Prepare journal context (last 10 entries to fit context window)
    const contextEntries = entries.slice(0, 10).map(e => `[${new Date(e.date).toLocaleDateString()}] ${e.content}`).join('\n---\n');
    
    const fullPrompt = `${tool.systemPrompt}\n\nJOURNAL ENTRIES:\n${contextEntries}`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: fullPrompt,
            config: isGemmaModel(model) ? getGemmaConfig() : { systemInstruction: tool.systemPrompt }
        });
        return applyTypography(response.text || "");
    } catch (e) {
        console.error("Journal Analysis Error", e);
        return "Analysis failed.";
    }
};
