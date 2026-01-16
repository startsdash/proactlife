
import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Mentor, ChallengeAuthor, Task, Note, AIToolConfig, JournalEntry } from "../types";
import { applyTypography, BASE_OUTPUT_INSTRUCTION } from '../constants';

// --- API Access ---
// Directly use process.env.API_KEY for initialization as per guidelines

// Helper to determine the best model for the task
const TEXT_TASK_MODEL = 'gemini-3-flash-preview';
const COMPLEX_TASK_MODEL = 'gemini-3-pro-preview';

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
  const DEFAULT_AI_TOOLS = config.aiTools || [];
  return config.aiTools?.find(t => t.id === id) || 
         DEFAULT_AI_TOOLS.find(t => t.id === id) || 
         { 
           id: 'default', 
           name: 'Default Tool',
           systemPrompt: 'You are a helpful assistant.', 
           model: TEXT_TASK_MODEL 
         };
};

export const autoTagNote = async (content: string, config: AppConfig): Promise<string[]> => {
  const tool = getToolConfig('tagger', config);
  const fullPrompt = `${tool.systemPrompt}\n\nБаза знаний (контекст): ${config.coreLibrary}`;
  
  // Create instance right before call using process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Using Gemini 3 series model with native JSON support
    const response = await ai.models.generateContent({
      model: TEXT_TASK_MODEL,
      contents: content,
      config: {
        systemInstruction: fullPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { tags: { type: Type.ARRAY, items: { type: Type.STRING } } }
        }
      }
    });

    // Access .text property directly
    const json = parseJSON<{tags: string[]}>(response.text, { tags: [] });
    return json.tags || [];

  } catch (error) {
    console.error("AutoTag Error", error);
    return [];
  }
};

export const findNotesByMood = async (notes: Note[], mood: string, config: AppConfig): Promise<string[]> => {
    const tool = getToolConfig('mood_matcher', config);
    
    // Prepare simplified notes for context
    const notesContext = notes.map(n => `ID: ${n.id}\nContent: ${n.content.substring(0, 200)}...`).join('\n---\n');
    const fullPrompt = `${tool.systemPrompt}\n\n[NOTES DATABASE]\n${notesContext}`;

    // Create instance right before call using process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: TEXT_TASK_MODEL,
            contents: `Mood: ${mood}`,
            config: {
                systemInstruction: fullPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { ids: { type: Type.ARRAY, items: { type: Type.STRING } } }
                }
            }
        });
        
        // Access .text property directly
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
    const systemInstruction = `${mentor.systemPrompt}\n\n${BASE_OUTPUT_INSTRUCTION}\n\nCONTEXT:\n${config.coreLibrary}`;

    // Create instance right before call using process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
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

        // Access .text property directly
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
    
    const context = type === 'stuck' 
        ? "The user is STUCK on this task. Help them unblock it using stoic/cognitive reframing." 
        : "The user COMPLETED this task. Help them integrate this win and reflect on the value.";
    
    const fullPrompt = `${tool.systemPrompt}\n\nCONTEXT: ${context}\n\nTASK: "${taskContent}"`;

    // Create instance right before call using process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: fullPrompt,
            config: { systemInstruction: tool.systemPrompt }
        });
        // Access .text property directly
        return applyTypography(response.text || "Thinking...");
    } catch (e) {
        console.error("Kanban Therapy Error", e);
        return "Thinking process interrupted.";
    }
};

export const generateTaskChallenge = async (taskContent: string, config: AppConfig): Promise<string> => {
    const author = config.challengeAuthors[0]; // Default to first author (Popper usually)
    if (!author) return "No challenge author configured.";
    
    const fullPrompt = `${author.systemPrompt}\n\nTASK: "${taskContent}"\n\nGenerate a challenge description (Markdown). Do not use checklists.`;
    
    // Create instance right before call using process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: fullPrompt,
            config: { systemInstruction: author.systemPrompt }
        });
        // Access .text property directly
        return applyTypography(response.text || "");
    } catch (e) {
        console.error("Challenge Generation Error", e);
        return "Could not generate challenge.";
    }
};

export const analyzeJournalPath = async (entries: JournalEntry[], config: AppConfig): Promise<string> => {
    const tool = getToolConfig('journal_mentor', config);

    // Prepare journal context (last 10 entries to fit context window)
    const contextEntries = entries.slice(0, 10).map(e => `[${new Date(e.date).toLocaleDateString()}] ${e.content}`).join('\n---\n');
    const fullPrompt = `${tool.systemPrompt}\n\nJOURNAL ENTRIES:\n${contextEntries}`;

    // Create instance right before call using process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: fullPrompt,
            config: { systemInstruction: tool.systemPrompt }
        });
        // Access .text property directly
        return applyTypography(response.text || "");
    } catch (e) {
        console.error("Journal Analysis Error", e);
        return "Analysis failed.";
    }
};
