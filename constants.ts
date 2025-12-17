
import React from 'react';
import { AppConfig, AIToolConfig } from "./types";
import { BrainCircuit, ShieldAlert, Crown, BookOpen, Shield, Scroll, Hourglass, Shapes, Zap, Search, Feather, User, Book } from 'lucide-react';

// --- ICON REGISTRY ---
export const ICON_MAP: Record<string, React.ElementType> = {
  'BrainCircuit': BrainCircuit,
  'ShieldAlert': ShieldAlert,
  'Crown': Crown,
  'BookOpen': BookOpen,
  'Shield': Shield,
  'Scroll': Scroll,
  'Hourglass': Hourglass,
  'Shapes': Shapes,
  'Zap': Zap,
  'Search': Search,
  'Feather': Feather,
  'User': User,
  'Book': Book
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Cheap)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Fastest)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (High Intelligence)' },
];

export const DEFAULT_MODEL = 'gemini-2.5-flash';

// --- DEFAULTS ---
export const DEFAULT_CORE_LIBRARY = `
БАЗА ЗНАНИЙ КОНСИЛИУМА (Использовать как абсолютный референс):
1. Библия (Синодальный перевод).
2. Matthieu Pageau: "The Language of Creation".
3. Joseph Campbell: "The Hero with a Thousand Faces".
4. Daniel Kahneman: "Thinking, Fast and Slow", "Noise".
5. Jordan Peterson: "Maps of Meaning", "12 Rules for Life".
6. Robert Greene: "48 Laws of Power", "33 Strategies of War".
7. Karl Popper: "The Logic of Scientific Discovery".
8. Thomas Schelling: "The Strategy of Conflict".
9. Nassim Nicholas Taleb: "Antifragile", "Skin in the Game".
10. Stoicism Classics: Epictetus, Marcus Aurelius, Seneca.
`;

export const BASE_OUTPUT_INSTRUCTION = `
4. Вердикт (JSON Output):
   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.
   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.
   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).
   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).
`;

export const DEFAULT_AI_TOOLS: AIToolConfig[] = [
  {
    id: 'tagger',
    name: 'Авто-тегирование (Салфетки)',
    systemPrompt: `Ты библиотекарь. Твоя задача — категоризировать заметку 1-3 тегами (на русском). Отвечай только JSON.`,
    model: DEFAULT_MODEL,
    responseMimeType: 'application/json',
    accessLevel: 'public'
  },
  {
    id: 'mood_matcher',
    name: 'Подбор по настроению',
    systemPrompt: `Ты — эмпатичный куратор архива мыслей. 
    Пользователь опишет свое настроение или состояние.
    Твоя задача: выбрать из предоставленного списка заметок те, которые наиболее резонируют, могут помочь, утешить или дать инсайт в этом состоянии.
    Верни только ID выбранных заметок.`,
    model: DEFAULT_MODEL,
    responseMimeType: 'application/json',
    accessLevel: 'public'
  },
  {
    id: 'kanban_therapist',
    name: 'Канбан Терапевт',
    systemPrompt: `Ты — мудрый наставник и терапевт продуктивности. Твоя цель — помочь пользователю преодолеть сопротивление (если задача застряла) или осознать ценность достижения (если задача выполнена). Используй принципы стоицизма и когнитивной психологии.`,
    model: DEFAULT_MODEL,
    responseMimeType: 'text/plain',
    accessLevel: 'public'
  }
];

export const DEFAULT_CONFIG: AppConfig = {
  coreLibrary: DEFAULT_CORE_LIBRARY,
  mentors: [
    { 
      id: 'peterson', 
      name: 'Питерсон', 
      icon: 'BrainCircuit', 
      color: 'text-indigo-600',
      systemPrompt: `Ты Джордан Питерсон. Фокус: Ответственность, Хаос и Порядок, Смысл. Спроси: Не лжет ли пользователь сам себе? ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    },
    { 
      id: 'taleb', 
      name: 'Талеб', 
      icon: 'ShieldAlert', 
      color: 'text-emerald-600',
      systemPrompt: `Ты Нассим Талеб. Фокус: Антихрупкость, Via Negativa, Шкура на кону. ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    },
    { 
      id: 'greene', 
      name: 'Грин', 
      icon: 'Crown', 
      color: 'text-amber-600',
      systemPrompt: `Ты Роберт Грин. Фокус: Власть, Стратегия, Социальная динамика. ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    },
    { 
      id: 'bible', 
      name: 'Библия', 
      icon: 'BookOpen', 
      color: 'text-blue-600',
      systemPrompt: `Ты Мудрец Экклезиаст. Фокус: Вечная истина, Этический анализ, Притча. ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    },
    { 
      id: 'epictetus', 
      name: 'Эпиктет', 
      icon: 'Shield', 
      color: 'text-slate-600',
      systemPrompt: `Ты Эпиктет. Фокус: Дихотомия Контроля. Что зависит от нас, а что нет? ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    },
    { 
      id: 'aurelius', 
      name: 'Аврелий', 
      icon: 'Scroll', 
      color: 'text-purple-600',
      systemPrompt: `Ты Марк Аврелий. Фокус: Космическая перспектива, Долг, Внутренняя цитадель. ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    },
    { 
      id: 'seneca', 
      name: 'Сенека', 
      icon: 'Hourglass', 
      color: 'text-red-600',
      systemPrompt: `Ты Сенека. Фокус: Управление временем, Premeditatio Malorum. ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    },
    { 
      id: 'pageau', 
      name: 'Пажо', 
      icon: 'Shapes', 
      color: 'text-cyan-600',
      systemPrompt: `Ты Matthieu Pageau. Фокус: Символизм, Небо и Земля, Паттерны творения. ${BASE_OUTPUT_INSTRUCTION}`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    }
  ],
  challengeAuthors: [
    {
      id: 'popper',
      name: 'Поппер & Грин',
      systemPrompt: `Ты действует в режиме Карла Поппера и Роберта Грина. Задача: Сгенерируй ОДИН "Falsification Challenge" (Челлендж на опровержение текущего убеждения или стратегии).`,
      model: DEFAULT_MODEL,
      accessLevel: 'public'
    }
  ],
  aiTools: DEFAULT_AI_TOOLS
};
