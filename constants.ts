import React from 'react';
import { AppConfig, AIToolConfig, ModuleConfig, Module } from "./types";
import { BrainCircuit, ShieldAlert, Crown, BookOpen, Shield, Scroll, Hourglass, Shapes, Zap, Search, Feather, User, Book, Flame, Repeat, Calendar, CheckCircle, LayoutDashboard, Briefcase, Sprout, Heart, Target, Image, Palette, Smile, Frown, Meh, Activity, Thermometer } from 'lucide-react';

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
  'Book': Book,
  'Flame': Flame,
  'Repeat': Repeat,
  'Calendar': Calendar,
  'CheckCircle': CheckCircle,
  'LayoutDashboard': LayoutDashboard,
  'Briefcase': Briefcase,
  'Sprout': Sprout,
  'Heart': Heart,
  'Target': Target,
  'Image': Image,
  'Palette': Palette,
  'Smile': Smile,
  'Frown': Frown,
  'Meh': Meh,
  'Activity': Activity,
  'Thermometer': Thermometer
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const SPHERES = [
  { 
    id: 'productivity', 
    label: 'Дело', 
    icon: 'Briefcase',
    color: 'indigo',
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800'
  },
  { 
    id: 'growth', 
    label: 'Рост', 
    icon: 'Sprout',
    color: 'emerald',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  { 
    id: 'relationships', 
    label: 'Люди', 
    icon: 'Heart',
    color: 'rose',
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800'
  }
];

export const MOOD_TAGS = [
    { id: 'sleep', label: 'Сон', emoji: '🛌' },
    { id: 'work', label: 'Работа', emoji: '💼' },
    { id: 'social', label: 'Общение', emoji: '💬' },
    { id: 'health', label: 'Здоровье', emoji: '🍏' },
    { id: 'hobby', label: 'Хобби', emoji: '🎨' },
    { id: 'weather', label: 'Погода', emoji: '🌧' },
    { id: 'stress', label: 'Стресс', emoji: '🤯' },
    { id: 'flow', label: 'Поток', emoji: '🌊' },
];

export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Cheap)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Fastest)' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27b' },
];

export const DEFAULT_MODEL = 'gemma-3-27b-it';

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
   - analysis: Глубокий анализ (2–3 предложения) в стиле выбранного ментора. Соблюдай редполитику (кавычки «», тире —).
   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.
   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).
   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).
`;

export const DEFAULT_AI_TOOLS: AIToolConfig[] = [
  {
    "id": "tagger",
    "name": "Авто-тегирование (Салфетки)",
    "systemPrompt": "Ты библиотекарь. Твоя задача — категоризировать заметку 1-3 тегами (на русском). Отвечай только JSON.",
    "model": "gemma-3-27b-it",
    "responseMimeType": "application/json",
    "accessLevel": "owner_only",
    "isDisabled": true
  },
  {
    "id": "mood_matcher",
    "name": "Подбор заметок по теме",
    "systemPrompt": "Ты — эмпатичный куратор архива мыслей. \n    Пользователь опишет свое настроение или состояние.\n    Твоя задача: выбрать из предоставленного списка заметок те, которые наиболее резонируют, могут помочь, утешить или дать инсайт в этом состоянии.\n    Верни только ID выбранных заметок.",
    "model": "gemma-3-27b-it",
    "responseMimeType": "application/json",
    "accessLevel": "owner_only",
    "isDisabled": false
  },
  {
    "id": "kanban_therapist",
    "name": "ИИ Консультант (Задачи)",
    "systemPrompt": "Ты — мудрый наставник и терапевт продуктивности. Задача: Сгенерируй Совет путешественнику. Твоя цель — помочь пользователю преодолеть сопротивление (если задача застряла) или осознать ценность достижения (если задача выполнена). Используй принципы стоицизма и когнитивной психологии.",
    "model": "gemma-3-27b-it",
    "responseMimeType": "text/plain",
    "accessLevel": "owner_only",
    "isDisabled": false
  },
  {
    "id": "journal_mentor",
    "name": "Наставник (Дневник)",
    "systemPrompt": "Ты — мудрый наставник, анализирующий Путь Героя по его записям. \nТвоя задача: Проанализируй предоставленные записи дневника (хронологию, содержание, эмоциональный фон). \n1. Выяви скрытые паттерны мышления и повторяющиеся сюжеты.\n2. Оцени динамику состояния (прогресс, стагнация, регресс).\n3. Дай глубокую обратную связь и философское напутствие для следующего этапа.\nБудь проницателен, краток и конструктивен. Используй Markdown для форматирования.",
    "model": "gemma-3-27b-it",
    "responseMimeType": "text/plain",
    "accessLevel": "owner_only",
    "isDisabled": false
  }
];

export const DEFAULT_MODULE_CONFIGS: ModuleConfig[] = [
    { id: Module.NAPKINS, name: 'Заметки', accessLevel: 'public' },
    { id: Module.SANDBOX, name: 'Хаб', accessLevel: 'public' },
    { id: Module.KANBAN, name: 'Спринты', accessLevel: 'public' },
    { id: Module.RITUALS, name: 'Трекер', accessLevel: 'public' },
    { id: Module.JOURNAL, name: 'Дневник', accessLevel: 'public' },
    { id: Module.DASHBOARD, name: 'Обзор', accessLevel: 'public' },
    { id: Module.ARCHIVE, name: 'Архив', accessLevel: 'public' },
    // Lab Modules
    { id: Module.SKETCHPAD, name: 'Скетчпад', accessLevel: 'public' },
    { id: Module.ETHER, name: 'Ether', accessLevel: 'public' },
    { id: Module.MENTAL_GYM, name: 'Скиллы', accessLevel: 'public' },
    { id: Module.PROFILE, name: 'Профиль', accessLevel: 'public' },
];

export const DEFAULT_CONFIG: AppConfig = {
  "_version": 1766510000003,
  "ownerEmail": "rukomrus@gmail.com",
  "isGuestModeEnabled": false,
  "inviteCodes": [],
  "coreLibrary": DEFAULT_CORE_LIBRARY,
  "mentors": [
  {
    "id": "peterson",
    "name": "Питерсон",
    "icon": "BrainCircuit",
    "color": "text-indigo-600",
    "systemPrompt": "Ты Джордан Питерсон. Фокус: Ответственность, Хаос и Порядок, Смысл. Спроси: Не лжет ли пользователь сам себе? Важно: Отвечай только на русском языке.\n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "model": "gemma-3-27b-it",
    "accessLevel": "owner_only",
    "isDisabled": true,
    "allowedEmails": [
      "rukomru@gmail.com"
    ]
  },
  {
    "id": "taleb",
    "name": "Талеб",
    "icon": "ShieldAlert",
    "color": "text-emerald-600",
    "systemPrompt": "Ты Нассим Талеб. Фокус: Антихрупкость, Via Negativa, Шкура на кону. \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "model": "gemma-3-27b-it",
    "accessLevel": "owner_only"
  },
  {
    "id": "greene",
    "name": "Грин",
    "icon": "Crown",
    "color": "text-amber-600",
    "systemPrompt": "Ты Роберт Грин. Фокус: Власть, Стратегия, Социальная динамика. \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "accessLevel": "owner_only",
    "model": "gemini-2.5-flash",
    "isDisabled": true
  },
  {
    "id": "bible",
    "name": "Библия",
    "icon": "BookOpen",
    "color": "text-blue-600",
    "systemPrompt": "Ты Мудрец Экклезиаст. Фокус: Вечная истина, Этический анализ, Притча. \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "accessLevel": "owner_only",
    "model": "gemini-2.5-flash"
  },
  {
    "id": "epictetus",
    "name": "Эпиктет",
    "icon": "Shield",
    "color": "text-slate-600",
    "systemPrompt": "Ты Эпиктет. Фокус: Дихотомия Контроля. Что зависит от нас, а что нет? \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "accessLevel": "owner_only",
    "model": "gemini-2.5-flash"
  },
  {
    "id": "aurelius",
    "name": "Аврелий",
    "icon": "Scroll",
    "color": "text-purple-600",
    "systemPrompt": "Ты Марк Аврелий. Фокус: Космическая перспектива, Долг, Внутренняя цитадель. \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "accessLevel": "owner_only",
    "model": "gemini-2.5-flash"
  },
  {
    "id": "seneca",
    "name": "Сенека",
    "icon": "Hourglass",
    "color": "text-red-600",
    "systemPrompt": "Ты Сенека. Фокус: Управление временем, Premeditatio Malorum. \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "model": "gemini-2.5-flash",
    "accessLevel": "owner_only"
  },
  {
    "id": "pageau",
    "name": "Пажо",
    "icon": "Shapes",
    "color": "text-cyan-600",
    "systemPrompt": "Ты Matthieu Pageau. Фокус: Символизм, Небо и Земля, Паттерны творения. \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "accessLevel": "owner_only",
    "model": "gemini-2.5-flash",
    "isDisabled": true
  },
  {
    "id": "Carlin",
    "name": "Джордж Карлин",
    "icon": "Feather",
    "color": "text-slate-600",
    "systemPrompt": "Ты Джордж Карлин. Отвечай в его манере и тоне.\n \n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).\n",
    "model": "gemini-2.5-flash",
    "accessLevel": "owner_only"
  },
  {
    "id": "1765831830338",
    "name": "Психолог: Beta",
    "icon": "User",
    "color": "text-slate-600",
    "systemPrompt": "# Роль\nТы — интегрированный помощник по личностному развитию. В твоей основе — синтез опыта экзистенциального психотерапевта (по Виктору Франклу), клинического психотерапевта (психодинамическое направление), когнитивно-поведенческого терапевта (3-я волна — CBT, ACT), нейропсихолога, психиатра с интегративным подходом и психолога развития взрослой личности. \n\n# Директива\nТвоя задача — сопровождать пользователя в работе над его личностью так, чтобы он:  \n- стал более открытым и сочувствующим другим людям,  \n- развил уверенность в себе,  \n- научился получать радость от жизни,  \n- добился успеха в предпринимательстве.  \n\n# Ограничения\n- Не использовать поверхностный «коучинговый» стиль.  \n- Не сводить ответы к абстрактной мотивации — опираться на научные подходы.  \n- Не уходить в религиозные или духовные практики.\n\n4. Вердикт (JSON Output):\n   - analysis: Глубокий анализ (2-3 предложения) в стиле выбранного ментора.\n   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.\n   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).\n   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).",
    "model": "gemini-2.5-flash",
    "accessLevel": "restricted",
    "allowedEmails": [
      "rukomru@gmail.com"
    ]
  }
],
  "challengeAuthors": [
  {
    "id": "popper",
    "name": "Поппер",
    "systemPrompt": "Ты действует в режиме Карла Поппера. Задача: Сгенерируй ОДИН Челлендж фальсификации (Челлендж на опровержение текущего убеждения или стратегии).",
    "model": "gemma-3-27b-it",
    "isDisabled": false,
    "accessLevel": "owner_only"
  }
],
  "aiTools": DEFAULT_AI_TOOLS,
  "modules": DEFAULT_MODULE_CONFIGS
};

export const applyTypography = (text: string): string => {
  if (!text) return text;
  let res = text;
  res = res.replace(/(\S)[ \t]+-[ \t]+/g, '$1 — ');
  res = res.replace(/(^|[\s(\[{])"/g, '$1«');
  res = res.replace(/"/g, '»');
  res = res.replace(/(^|[\s(\[{])'/g, '$1«');
  res = res.replace(/'(?=[.,:;!?\s)\]}]|$)/g, '»');
  const nestedPattern = /«([^»]*)«([^»]*)»([^»]*)»/g;
  let prev = '';
  while (res !== prev) {
      prev = res;
      res = res.replace(nestedPattern, '«$1„$2“$3»');
  }
  return res;
};