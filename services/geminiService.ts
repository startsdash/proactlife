

import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Mentor, ChallengeAuthor, Task, Note, AIToolConfig, JournalEntry } from "../types";
import { DEFAULT_CONFIG, DEFAULT_AI_TOOLS, DEFAULT_MODEL, applyTypography, BASE_OUTPUT_INSTRUCTION } from '../constants';

// --- API Access ---
const getApiKey = (): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
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

// Helper to check if model requires legacy/chat handling
const isGemmaModel = (model: string) => model.toLowerCase().includes('gemma');

// Helper to get dynamic config for Gemma to prevent determinism
const getGemmaConfig = () => ({
  temperature: 0.85,
  topP: 0.95,
  topK: 40,
  seed: Math.floor(Math.random() * 2147483647), // Use a random seed to force variety
});

// Improved JSON Parser that finds the first valid JSON object block
const parseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    // 1. Try simple strict parse first (fastest)
    try {
        return JSON.parse(text) as T;
    } catch (e) {}

    // 2. Locate the first '{' and attempt to find its matching '}' by counting depth
    const start = text.indexOf('{');
    if (start === -1) return fallback;

    let depth = 0;
    let end = -1;

    for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;

        if (depth === 0) {
            end = i;
            break;
        }
    }

    if (end !== -1) {
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr) as T;
    }
    
    // 3. Last resort: Try cleaning markdown code blocks
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText) as T;

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
    const fullPrompt = `${author.systemPrompt}\n\nTASK: "${taskContent}"\n\nGenerate a challenge description (Markdown). Do not use checklists.`;
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

// --- HERO JOURNEY RPG GENERATOR ---
export interface CyberpunkQuestData {
    title: string;
    briefing: string;
    objectives: string[]; // 3 Tasks
    systemProtocol: string; // 1 Habit
    theme: 'corpo' | 'nomad' | 'street_kid';
}

export const generateCyberpunkQuest = async (noteContent: string, config: AppConfig): Promise<CyberpunkQuestData | null> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash'; // Good balance of speed and roleplay capability

    const prompt = `
    ROLE: You are a "Fixer" in a Cyberpunk 2077 world. High tech, low life. Slang: choom, eddies, delta, preem, nova.
    TASK: Analyze the "INTEL" (User Note) and convert it into a dangerous "Gig" (Quest).
    
    INTEL: "${noteContent}"

    OUTPUT SCHEMA (JSON):
    {
        "title": "Operation Name (Cyberpunk style)",
        "briefing": "Atmospheric briefing text explaining why this matters in the dark future (max 3 sentences).",
        "objectives": [
            "Actionable Task 1 (Recon/Prep)",
            "Actionable Task 2 (Execution)",
            "Actionable Task 3 (Closing/Payoff)"
        ],
        "systemProtocol": "A daily habit/ritual to maintain stability during this op.",
        "theme": "corpo" | "nomad" | "street_kid" (Select best fit)
    }
    
    Be immersive. Use Russian language.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        briefing: { type: Type.STRING },
                        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                        systemProtocol: { type: Type.STRING },
                        theme: { type: Type.STRING, enum: ['corpo', 'nomad', 'street_kid'] }
                    }
                }
            }
        });

        return parseJSON<CyberpunkQuestData>(response.text, {
            title: "Сбой сети",
            briefing: "Данные повреждены. Требуется ручное вмешательство.",
            objectives: ["Проверить соединение", "Перезагрузить протокол", "Связаться с фиксером"],
            systemProtocol: "Диагностика системы",
            theme: "street_kid"
        });
    } catch (e) {
        console.error("Cyberpunk Quest Generation Error", e);
        return null;
    }
};