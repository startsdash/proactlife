
import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Mentor, ChallengeAuthor, Task, Note, AIToolConfig } from "../types";
import { DEFAULT_CONFIG, DEFAULT_AI_TOOLS, DEFAULT_MODEL } from '../constants';

// --- API Access ---
const getApiKey = () => {
  let key = '';

  // 1. Try process.env (Standard/IDX/Node)
  try {
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      key = process.env.API_KEY;
    }
  } catch (e) {}

  // 2. Try import.meta.env (Vite/Vercel Client-Side)
  if (!key) {
    try {
      // @ts-ignore
      if (import.meta.env?.VITE_GEMINI_API_KEY) {
        // @ts-ignore
        key = import.meta.env.VITE_GEMINI_API_KEY;
      }
    } catch (e) {}
  }

  if (!key) {
    console.warn("Gemini API Key is missing. AI features will not work. Ensure VITE_GEMINI_API_KEY is set in Vercel.");
  }

  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
  const fullPrompt = `${tool.systemPrompt}\n\nБаза знаний (контекст): ${config.coreLibrary}`;

  try {
    const response = await ai.models.generateContent({
      model: tool.model || DEFAULT_MODEL,
      contents: content,
      config: {
        systemInstruction: fullPrompt,
        responseMimeType: tool.responseMimeType || "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { tags: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["tags"]
        }
      }
    });
    const result = parseJSON<{ tags: string[] }>(response.text, { tags: [] });
    return result.tags || [];
  } catch (error) {
    console.error("AutoTag Error:", error);
    return [];
  }
};

export const findNotesByMood = async (notes: Note[], mood: string, config: AppConfig): Promise<string[]> => {
  const tool = getToolConfig('mood_matcher', config);
  
  // Optimization: Send simplified objects to save context tokens
  const simplifiedNotes = notes.map(n => ({ id: n.id, content: n.content.slice(0, 300), tags: n.tags }));
  
  try {
    const response = await ai.models.generateContent({
      model: tool.model || DEFAULT_MODEL,
      contents: `User Mood/State: "${mood}". Notes Library: ${JSON.stringify(simplifiedNotes)}`,
      config: {
        systemInstruction: tool.systemPrompt,
        responseMimeType: tool.responseMimeType || "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { ids: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["ids"]
        }
      }
    });
    
    const result = parseJSON<{ ids: string[] }>(response.text, { ids: [] });
    return result.ids || [];
  } catch (error) {
    console.error("Mood Match Error:", error);
    return [];
  }
};

export interface SandboxAnalysis {
  analysis: string;
  suggestedTask: string;
  suggestedFlashcardFront: string;
  suggestedFlashcardBack: string;
}

export const analyzeSandboxItem = async (content: string, mentorId: string, config: AppConfig): Promise<SandboxAnalysis> => {
  const mentor = config.mentors.find(m => m.id === mentorId) || config.mentors[0];
  
  // Combine Core Library with Mentor Prompt
  const fullPrompt = `${mentor.systemPrompt}\n\n[CONTEXT LIBRARY]\n${config.coreLibrary}`;

  try {
    // Note: Sandbox analysis strictly requires structured output for the app to function, 
    // so we force JSON schema here regardless of mentor generic settings, but use the Mentor's chosen model.
    const response = await ai.models.generateContent({
      model: mentor.model || DEFAULT_MODEL,
      contents: `User Note: "${content}"`,
      config: {
        systemInstruction: fullPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            suggestedTask: { type: Type.STRING },
            suggestedFlashcardFront: { type: Type.STRING },
            suggestedFlashcardBack: { type: Type.STRING }
          },
          required: ["analysis", "suggestedTask", "suggestedFlashcardFront", "suggestedFlashcardBack"]
        }
      }
    });
    
    return parseJSON<SandboxAnalysis>(response.text, {
      analysis: "Сбой анализа.",
      suggestedTask: "Повторить",
      suggestedFlashcardFront: "Error",
      suggestedFlashcardBack: "Try again"
    });
  } catch (e) {
    console.error("Analysis Error:", e);
    return {
      analysis: "Сбой связи с ментором.",
      suggestedTask: "Повторить",
      suggestedFlashcardFront: "Error",
      suggestedFlashcardBack: "Try again"
    };
  }
};

export const generateTaskChallenge = async (taskContent: string, config: AppConfig): Promise<string> => {
  const author: Partial<ChallengeAuthor> = config.challengeAuthors[0] || { systemPrompt: 'Challenge the user.', model: DEFAULT_MODEL };
  const fullPrompt = `${author.systemPrompt}\n\n[CONTEXT LIBRARY]\n${config.coreLibrary}`;

  try {
    const response = await ai.models.generateContent({
      model: author.model || DEFAULT_MODEL,
      contents: `Task: "${taskContent}"`,
      config: { 
        systemInstruction: fullPrompt,
        responseMimeType: author.responseMimeType
      }
    });
    return response.text || "Нет ответа.";
  } catch (e) {
    console.error("Challenge Error:", e);
    return "Не удалось сгенерировать вызов.";
  }
};

export const getKanbanTherapy = async (taskContent: string, state: 'stuck' | 'completed', config: AppConfig): Promise<string> => {
  const tool = getToolConfig('kanban_therapist', config);
  const fullPrompt = `${tool.systemPrompt}\n\n[CONTEXT LIBRARY]\n${config.coreLibrary}`;

  try {
    const userMessage = state === 'stuck' 
      ? `Пользователь застрял на задаче: "${taskContent}". Дай совет или упражнение.`
      : `Пользователь завершил задачу: "${taskContent}". Проведи краткую рефлексию.`;

    const response = await ai.models.generateContent({
      model: tool.model || DEFAULT_MODEL,
      contents: userMessage,
      config: {
        systemInstruction: fullPrompt,
        responseMimeType: tool.responseMimeType // Use configured format (text or json)
      }
    });
    return response.text || "Продолжай.";
  } catch (e) {
    console.error("Therapy Error:", e);
    return "Система поддержки недоступна.";
  }
};

export interface JournalReflection {
  feedback: string;
  mentorId: string;
}

export const generateJournalReflection = async (
  entryContent: string, 
  linkedTask: Task | undefined, 
  config: AppConfig
): Promise<JournalReflection> => {
  try {
    // Select a random mentor for variety, or use a specific strategy
    const randomMentor = config.mentors[Math.floor(Math.random() * config.mentors.length)];
    
    let prompt = `Пользователь написал запись в дневнике: "${entryContent}".`;
    if (linkedTask) {
      prompt += `\nЗапись привязана к задаче (${linkedTask.column === 'done' ? 'ВЫПОЛНЕНО' : 'В ПРОЦЕССЕ'}): "${linkedTask.content}".`;
      if (linkedTask.activeChallenge) prompt += `\nАктивный челлендж задачи: "${linkedTask.activeChallenge}".`;
    }
    
    prompt += `\nДай краткий (1-2 предложения), глубокий философский комментарий или вопрос, который поможет пользователю осознать опыт.`;

    const fullPrompt = `${randomMentor.systemPrompt}\n\n[CONTEXT LIBRARY]\n${config.coreLibrary}\n\nВАЖНО: Отвечай от лица ${randomMentor.name}. Будь краток.`;

    const response = await ai.models.generateContent({
      model: randomMentor.model || DEFAULT_MODEL,
      contents: prompt,
      config: { systemInstruction: fullPrompt }
    });

    return {
      feedback: response.text || "Продолжай наблюдение.",
      mentorId: randomMentor.id
    };
  } catch (e) {
    console.error("Reflection Error:", e);
    return {
      feedback: "Тишина...",
      mentorId: 'system'
    };
  }
};
