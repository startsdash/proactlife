import React, { useState } from 'react';
import { AppConfig, Mentor, ChallengeAuthor, AIToolConfig, AccessControl } from '../types';
import { AVAILABLE_ICONS, ICON_MAP, DEFAULT_AI_TOOLS, AVAILABLE_MODELS, DEFAULT_MODEL } from '../constants';
import { Save, Plus, Trash2, Edit3, X, Database, Users, Zap, Bot, Cpu, FileJson, FileType, Shield, Lock, Globe, Code, Copy, Check, ArrowLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface Props {
  config: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  onClose?: () => void; // Added onClose to support modal-like closing
}

// --- HELPER COMPONENT: STATUS TOGGLE ---
const StatusToggle = ({ isDisabled, onChange }: { isDisabled?: boolean, onChange: (val: boolean) => void }) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between mb-4 shadow-sm">
        <div className="flex items-center gap-2">
            {isDisabled ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-emerald-500" />}
            <div>
                <div className="text-sm font-bold text-slate-800">{isDisabled ? 'Отключено' : 'Активно'}</div>
                <div className="text-[10px] text-slate-500">
                    {isDisabled ? 'Скрыто из интерфейса приложения' : 'Доступно для использования'}
                </div>
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={!isDisabled} 
                onChange={(e) => onChange(!e.target.checked)} 
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
    </div>
  );
};

// --- ACCESS CONTROL COMPONENT ---
const AccessControlEditor = ({ data, onChange }: { data: AccessControl, onChange: (d: AccessControl) => void }) => {
  const [newEmail, setNewEmail] = useState('');
  
  const addEmail = () => {
    if (newEmail && !data.allowedEmails?.includes(newEmail)) {
      onChange({ ...data, allowedEmails: [...(data.allowedEmails || []), newEmail] });
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    onChange({ ...data, allowedEmails: data.allowedEmails?.filter(e => e !== email) });
  };

  const currentLevel = data.accessLevel || 'public';

  return (
    <div className="bg-slate-100 p-4 rounded-xl mt-6 border border-slate-200">
       <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
         <Shield size={14} className="text-indigo-600" /> Управление доступом
       </h4>
       
       <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-4">
          <label className={`flex items-center gap-2 text-sm cursor-pointer p-3 md:p-2 rounded-lg border transition-all ${currentLevel === 'public' ? 'bg-white border-indigo-200 ring-1 ring-indigo-50 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
             <input 
               type="radio" 
               className="accent-indigo-600"
               checked={currentLevel === 'public'} 
               onChange={() => onChange({ ...data, accessLevel: 'public' })}
             />
             <Globe size={14} className="text-emerald-500" />
             <span className="text-slate-700">Все пользователи</span>
          </label>
          <label className={`flex items-center gap-2 text-sm cursor-pointer p-3 md:p-2 rounded-lg border transition-all ${currentLevel === 'owner_only' ? 'bg-white border-indigo-200 ring-1 ring-indigo-50 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
             <input 
               type="radio" 
               className="accent-indigo-600"
               checked={currentLevel === 'owner_only'} 
               onChange={() => onChange({ ...data, accessLevel: 'owner_only' })}
             />
             <Lock size={14} className="text-red-500" />
             <span className="text-slate-700">Только владелец</span>
          </label>
          <label className={`flex items-center gap-2 text-sm cursor-pointer p-3 md:p-2 rounded-lg border transition-all ${currentLevel === 'restricted' ? 'bg-white border-indigo-200 ring-1 ring-indigo-50 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
             <input 
               type="radio" 
               className="accent-indigo-600"
               checked={currentLevel === 'restricted'} 
               onChange={() => onChange({ ...data, accessLevel: 'restricted' })}
             />
             <Users size={14} className="text-amber-500" />
             <span className="text-slate-700">Избранные</span>
          </label>
       </div>

       {currentLevel === 'restricted' && (
         <div className="animate-in fade-in slide-in-from-top-1 bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Разрешенные пользователи (Email)</div>
            <div className="flex gap-2 mb-2">
               <input 
                 type="email" 
                 placeholder="user@gmail.com" 
                 className="flex-1 p-2 text-sm border border-slate-200 rounded-md outline-none focus:border-indigo-300"
                 value={newEmail}
                 onChange={e => setNewEmail(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && addEmail()}
               />
               <button onClick={addEmail} className="px-3 py-2 bg-slate-100 hover:bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium transition-colors">Add</button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
               {data.allowedEmails?.map(email => (
                 <div key={email} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                    <span className="text-slate-600">{email}</span>
                    <button onClick={() => removeEmail(email)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                 </div>
               ))}
               {(!data.allowedEmails || data.allowedEmails.length === 0) && <div className="text-xs text-slate-400 italic p-1">Список пуст</div>}
            </div>
         </div>
       )}
    </div>
  );
};

const Settings: React.FC<Props> = ({ config, onUpdateConfig, onClose }) => {
  const [activeTab, setActiveTab] = useState<'core' | 'mentors' | 'authors' | 'tools'>('core');
  
  const [localCore, setLocalCore] = useState(config.coreLibrary);
  const [mentors, setMentors] = useState<Mentor[]>(config.mentors);
  const [authors, setAuthors] = useState<ChallengeAuthor[]>(config.challengeAuthors);
  
  // Initialize AI Tools
  const [aiTools, setAiTools] = useState<AIToolConfig[]>(() => {
    const savedTools = config.aiTools || [];
    return DEFAULT_AI_TOOLS.map(def => {
        const saved = savedTools.find(t => t.id === def.id);
        return saved ? { ...def, ...saved } : def;
    });
  });
  
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [isNewMentor, setIsNewMentor] = useState(false);

  const [editingAuthor, setEditingAuthor] = useState<ChallengeAuthor | null>(null);
  const [isNewAuthor, setIsNewAuthor] = useState(false);

  const [editingTool, setEditingTool] = useState<AIToolConfig | null>(null);

  const [copyStatus, setCopyStatus] = useState(false);

  const saveAll = () => {
    onUpdateConfig({
      ...config, // Keep version if exists, or allow loadState to overwrite
      coreLibrary: localCore,
      mentors: mentors,
      challengeAuthors: authors,
      aiTools: aiTools 
    });
    alert("Конфигурация сохранена локально!");
  };

  const handleExportCode = () => {
      // GENERATE VERSION TIMESTAMP
      const version = Date.now();

      // Create a complete content for constants.ts
      const fileContent = `import React from 'react';
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
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Cheap)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Fastest)' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27b' },
];

export const DEFAULT_MODEL = 'gemma-3-27b-it';

// --- DEFAULTS ---
export const DEFAULT_CORE_LIBRARY = \`${localCore.replace(/`/g, '\\`')}\`;

export const BASE_OUTPUT_INSTRUCTION = \`
4. Вердикт (JSON Output):
   - analysis: Глубокий анализ (2–3 предложения) в стиле выбранного ментора. Соблюдай редполитику (кавычки «», тире —).
   - suggestedTask: Конкретное действие (Task) для Канбана. Должно быть выполнимым шагом.
   - suggestedFlashcardFront: Концепт или Вопрос (Сторона А).
   - suggestedFlashcardBack: Принцип или Ответ (Сторона Б).
\`;

export const DEFAULT_AI_TOOLS: AIToolConfig[] = ${JSON.stringify(aiTools, null, 2)};

export const DEFAULT_CONFIG: AppConfig = {
  "_version": ${version},
  "coreLibrary": DEFAULT_CORE_LIBRARY,
  "mentors": ${JSON.stringify(mentors, null, 2)},
  "challengeAuthors": ${JSON.stringify(authors, null, 2)},
  "aiTools": DEFAULT_AI_TOOLS
};

export const applyTypography = (text: string): string => {
  if (!text) return text;
  let res = text;
  
  // 1. Hyphens to Em-dashes (space - space) -> (space — space)
  res = res.replace(/(\\s)-(\\s)/g, '$1—$2');
  
  // 2. Quotes
  // Open quote: start of line or whitespace/punctuation opening before it
  res = res.replace(/(^|[\\s(\\[{])"/g, '$1«');
  // Close quote: everything else
  res = res.replace(/"/g, '»');
  
  // 3. Nested quotes: simple one-level fix
  // Finds «...«...»...» and converts inner to „...“
  const nestedPattern = /«([^»]*)«([^»]*)»([^»]*)»/g;
  let prev = '';
  // Repeat to handle multiple/sequential nested occurrences if regex overlaps allow, 
  // though global replace handles non-overlapping well. 
  // Loop ensures complex cases get treated.
  while (res !== prev) {
      prev = res;
      res = res.replace(nestedPattern, '«$1„$2“$3»');
  }

  return res;
};
`;

      navigator.clipboard.writeText(fileContent).then(() => {
          setCopyStatus(true);
          setTimeout(() => setCopyStatus(false), 2000);
      });
  };

  const handleSaveMentor = () => {
    if (editingMentor) {
      if (isNewMentor) setMentors([...mentors, editingMentor]);
      else setMentors(mentors.map(m => m.id === editingMentor.id ? editingMentor : m));
      setEditingMentor(null);
    }
  };

  const deleteMentor = (id: string) => {
    if (confirm("Удалить ментора?")) setMentors(mentors.filter(m => m.id !== id));
  };

  const handleSaveAuthor = () => {
    if (editingAuthor) {
      if (isNewAuthor) setAuthors([...authors, editingAuthor]);
      else setAuthors(authors.map(a => a.id === editingAuthor.id ? editingAuthor : a));
      setEditingAuthor(null);
    }
  };

  const deleteAuthor = (id: string) => {
    if (confirm("Удалить автора?")) setAuthors(authors.filter(a => a.id !== id));
  };

  const handleSaveTool = () => {
    if (editingTool) {
        setAiTools(aiTools.map(t => t.id === editingTool.id ? editingTool : t));
        setEditingTool(null);
    }
  };

  const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} />;
  };

  const ModelSelector = ({ value, onChange }: { value?: string, onChange: (val: string) => void }) => (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Cpu size={12}/> AI Model</label>
      <select 
        value={value || DEFAULT_MODEL} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 md:p-2 border rounded-lg bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {AVAILABLE_MODELS.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] md:relative md:inset-auto md:z-auto flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-300">
      
      {/* Mobile-Only Close Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
            <span className="font-bold text-slate-800">Владелец</span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-8">
        <header className="mb-6 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="hidden md:block">
            <h1 className="text-2xl font-light text-slate-800 tracking-tight">Настройки Владельца</h1>
            <p className="text-slate-500 text-sm">Управление ИИ и Базой Знаний</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                  onClick={handleExportCode} 
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 border rounded-xl md:rounded-lg text-sm font-medium transition-all ${copyStatus ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                  {copyStatus ? <Check size={18} /> : <Code size={18} />}
                  <span className="hidden md:inline">{copyStatus ? 'Скопировано!' : 'Код для constants.ts'}</span>
                  <span className="md:hidden">Export Code</span>
              </button>
              <button onClick={saveAll} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-indigo-600 text-white rounded-xl md:rounded-lg hover:bg-indigo-700 shadow-md transition-all">
                  <Save size={18} /> Сохранить
              </button>
          </div>
        </header>
        
        {/* INFO BANNER */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 text-xs text-blue-800 flex items-start gap-2 shrink-0">
            <Database size={14} className="mt-0.5 shrink-0" />
            <p>
                <strong>Внимание:</strong> Изменения сохраняются локально. Для глобального применения обновите <code>constants.ts</code>.
            </p>
        </div>

        {/* Tab Navigation - Horizontal Scroll on Mobile */}
        <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'core', label: 'Ядро Знаний', icon: Database },
            { id: 'mentors', label: 'Менторы', icon: Users },
            { id: 'authors', label: 'Авторы челленджей', icon: Zap },
            { id: 'tools', label: 'AI Генераторы', icon: Bot },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingMentor(null);
                setEditingAuthor(null);
                setEditingTool(null);
              }} 
              className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm border border-slate-200 text-indigo-600' : 'text-slate-500 hover:bg-white/50 border border-transparent'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-3xl md:rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          
          {/* CORE LIBRARY TAB */}
          {activeTab === 'core' && (
            <div className="flex-1 p-6 flex flex-col">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Глобальный контекст (# SYSTEM)</h3>
              <textarea 
                className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-sm text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none resize-none leading-relaxed"
                value={localCore}
                onChange={(e) => setLocalCore(e.target.value)}
                placeholder="Введите список книг и базовых принципов..."
              />
            </div>
          )}

          {/* MENTORS TAB */}
          {activeTab === 'mentors' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* List (Hide on mobile when editing) */}
              <div className={`${editingMentor ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-slate-100 flex-col overflow-y-auto p-4 space-y-2 bg-slate-50/50`}>
                <button 
                  onClick={() => {
                    setEditingMentor({ id: Date.now().toString(), name: 'Новый Ментор', icon: 'User', color: 'text-slate-600', systemPrompt: '', model: DEFAULT_MODEL, accessLevel: 'public', isDisabled: false });
                    setIsNewMentor(true);
                  }}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium hover:border-indigo-300 hover:text-indigo-500 flex items-center justify-center gap-2 transition-colors bg-white/50"
                >
                  <Plus size={18} /> Добавить
                </button>
                {mentors.map(m => (
                  <div key={m.id} onClick={() => { setEditingMentor(m); setIsNewMentor(false); }} className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${editingMentor?.id === m.id ? 'bg-white shadow-md border-indigo-200 ring-1 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-100 hover:shadow-sm'} ${m.isDisabled ? 'opacity-60' : ''}`}>
                    <div className={`p-2.5 rounded-xl bg-slate-50 ${m.color}`}>
                      <RenderIcon name={m.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                          <div className={`font-bold truncate ${m.isDisabled ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.name}</div>
                          {/* ACCESS LEVEL ICON */}
                          <div className="ml-2 flex items-center" title={m.accessLevel || 'public'}>
                             {m.accessLevel === 'owner_only' && <Lock size={12} className="text-red-400" />}
                             {(m.accessLevel === 'public' || !m.accessLevel) && <Globe size={12} className="text-emerald-400" />}
                             {m.accessLevel === 'restricted' && <Users size={12} className="text-amber-400" />}
                          </div>
                          <div className="flex-1" />
                          <ChevronRight size={14} className="text-slate-300 md:hidden" />
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-tight">{m.model || DEFAULT_MODEL}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Editor */}
              {editingMentor && (
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar-light">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditingMentor(null)} className="md:hidden p-2 -ml-2 text-slate-400">
                          <ArrowLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-slate-800">{isNewMentor ? 'Новый ментор' : editingMentor.name}</h3>
                      </div>
                      {!isNewMentor && (
                        <button onClick={() => deleteMentor(editingMentor.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors">
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                    
                    <StatusToggle isDisabled={editingMentor.isDisabled} onChange={(val) => setEditingMentor({...editingMentor, isDisabled: val})} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Имя</label>
                        <input className="w-full p-3 md:p-2 border rounded-xl md:rounded-lg bg-slate-50" value={editingMentor.name} onChange={(e) => setEditingMentor({...editingMentor, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID (лат.)</label>
                        <input className="w-full p-3 md:p-2 border rounded-xl md:rounded-lg bg-slate-50" value={editingMentor.id} disabled={!isNewMentor} onChange={(e) => setEditingMentor({...editingMentor, id: e.target.value})} />
                      </div>
                    </div>
                    
                    <ModelSelector value={editingMentor.model} onChange={(val) => setEditingMentor({...editingMentor, model: val})} />

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Иконка</label>
                      <div className="grid grid-cols-5 md:flex md:flex-wrap gap-2 bg-slate-50 p-3 rounded-2xl md:rounded-lg border border-slate-100">
                        {AVAILABLE_ICONS.map(iconName => (
                          <button
                            key={iconName}
                            onClick={() => setEditingMentor({...editingMentor, icon: iconName})}
                            className={`p-3 md:p-2 rounded-xl md:rounded-md transition-all flex items-center justify-center ${editingMentor.icon === iconName ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-400'}`}
                          >
                            <RenderIcon name={iconName} className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Цвет (Tailwind Class)</label>
                      <input className="w-full p-3 md:p-2 border rounded-xl md:rounded-lg bg-slate-50" value={editingMentor.color} onChange={(e) => setEditingMentor({...editingMentor, color: e.target.value})} placeholder="text-indigo-600" />
                    </div>
                    
                    <AccessControlEditor data={editingMentor} onChange={(d) => setEditingMentor({ ...editingMentor, ...d })} />

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Системный Промпт</label>
                      <textarea 
                        className="w-full h-80 md:h-64 p-3 border rounded-2xl md:rounded-lg bg-slate-50 font-mono text-xs leading-relaxed outline-none"
                        value={editingMentor.systemPrompt}
                        onChange={(e) => setEditingMentor({...editingMentor, systemPrompt: e.target.value})}
                      />
                    </div>

                    <div className="flex gap-2 pt-6 pb-12 border-t md:pb-6">
                      <button onClick={() => setEditingMentor(null)} className="flex-1 md:flex-none px-6 py-3 md:py-2 text-slate-500 hover:bg-slate-50 rounded-xl">Отмена</button>
                      <button onClick={handleSaveMentor} className="flex-1 md:flex-none px-8 py-3 md:py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">Сохранить</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUTHORS TAB - Same Master-Detail Optimization */}
          {activeTab === 'authors' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               <div className={`${editingAuthor ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-slate-100 flex-col overflow-y-auto p-4 space-y-2 bg-slate-50/50`}>
                <button 
                  onClick={() => {
                    setEditingAuthor({ id: Date.now().toString(), name: 'Новый Автор', systemPrompt: '', model: DEFAULT_MODEL, accessLevel: 'public', isDisabled: false });
                    setIsNewAuthor(true);
                  }}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium hover:border-indigo-300 hover:text-indigo-500 flex items-center justify-center gap-2 transition-colors bg-white/50"
                >
                  <Plus size={18} /> Добавить
                </button>
                {authors.map(a => (
                  <div key={a.id} onClick={() => { setEditingAuthor(a); setIsNewAuthor(false); }} className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${editingAuthor?.id === a.id ? 'bg-white shadow-md border-indigo-200 ring-1 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-100'} ${a.isDisabled ? 'opacity-60' : ''}`}>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                              <div className={`font-bold ${a.isDisabled ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{a.name}</div>
                              <ChevronRight size={14} className="text-slate-300 md:hidden" />
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">{a.model || DEFAULT_MODEL}</div>
                      </div>
                  </div>
                ))}
              </div>

              {editingAuthor && (
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar-light">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditingAuthor(null)} className="md:hidden p-2 -ml-2 text-slate-400">
                          <ArrowLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-slate-800">{isNewAuthor ? 'Новый автор' : editingAuthor.name}</h3>
                      </div>
                      {!isNewAuthor && (
                        <button onClick={() => deleteAuthor(editingAuthor.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl">
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                    
                    <StatusToggle isDisabled={editingAuthor.isDisabled} onChange={(val) => setEditingAuthor({...editingAuthor, isDisabled: val})} />

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Имя</label>
                        <input className="w-full p-3 md:p-2 border rounded-xl md:rounded-lg bg-slate-50" value={editingAuthor.name} onChange={(e) => setEditingAuthor({...editingAuthor, name: e.target.value})} />
                    </div>
                    
                    <ModelSelector value={editingAuthor.model} onChange={(val) => setEditingAuthor({...editingAuthor, model: val})} />
                    
                    <div className="space-y-1">
                       <label className="block text-xs font-bold text-slate-400 uppercase flex items-center gap-1">Формат вывода</label>
                       <select value={editingAuthor.responseMimeType || 'text/plain'} onChange={(e) => setEditingAuthor({...editingAuthor, responseMimeType: e.target.value as any})} className="w-full p-3 md:p-2 border rounded-xl md:rounded-lg bg-slate-50 text-sm outline-none">
                          <option value="text/plain">Текст (Markdown)</option>
                          <option value="application/json">JSON (Strict)</option>
                       </select>
                    </div>
                    
                    <AccessControlEditor data={editingAuthor} onChange={(d) => setEditingAuthor({ ...editingAuthor, ...d })} />

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Системный Промпт</label>
                      <textarea 
                        className="w-full h-80 md:h-64 p-3 border rounded-2xl md:rounded-lg bg-slate-50 font-mono text-xs leading-relaxed outline-none"
                        value={editingAuthor.systemPrompt}
                        onChange={(e) => setEditingAuthor({...editingAuthor, systemPrompt: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2 pt-6 pb-12 md:pb-6 border-t">
                      <button onClick={() => setEditingAuthor(null)} className="flex-1 md:flex-none px-6 py-3 md:py-2 text-slate-500 hover:bg-slate-50 rounded-xl">Отмена</button>
                      <button onClick={handleSaveAuthor} className="flex-1 md:flex-none px-8 py-3 md:py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Сохранить</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* TOOLS TAB - Same Master-Detail Optimization */}
          {activeTab === 'tools' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               <div className={`${editingTool ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-slate-100 flex-col overflow-y-auto p-4 space-y-2 bg-slate-50/50`}>
                <div className="px-2 py-1 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Системные Генераторы</div>
                {aiTools.map(t => (
                  <div key={t.id} onClick={() => setEditingTool(t)} className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${editingTool?.id === t.id ? 'bg-white shadow-md border-indigo-200 ring-1 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-100'} ${t.isDisabled ? 'opacity-60' : ''}`}>
                      <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm mb-1 ${t.isDisabled ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.name}</div>
                          <div className="text-[10px] text-indigo-400 font-mono">{t.model || DEFAULT_MODEL}</div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 md:hidden" />
                  </div>
                ))}
              </div>

              {editingTool && (
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar-light">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditingTool(null)} className="md:hidden p-2 -ml-2 text-slate-400">
                          <ArrowLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-slate-800">{editingTool.name}</h3>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {editingTool.id}</div>
                    </div>
                    
                    <StatusToggle isDisabled={editingTool.isDisabled} onChange={(val) => setEditingTool({...editingTool, isDisabled: val})} />

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Название (UI)</label>
                        <input className="w-full p-3 md:p-2 border rounded-xl md:rounded-lg bg-slate-50" value={editingTool.name} onChange={(e) => setEditingTool({...editingTool, name: e.target.value})} />
                    </div>
                    
                    <ModelSelector value={editingTool.model} onChange={(val) => setEditingTool({...editingTool, model: val})} />

                    <div className="space-y-1">
                       <label className="block text-xs font-bold text-slate-400 uppercase">Формат вывода</label>
                       <select value={editingTool.responseMimeType || 'text/plain'} onChange={(e) => setEditingTool({...editingTool, responseMimeType: e.target.value as any})} className="w-full p-3 md:p-2 border rounded-xl md:rounded-lg bg-slate-50 text-sm outline-none">
                          <option value="text/plain">Текст (Markdown)</option>
                          <option value="application/json">JSON (Strict)</option>
                       </select>
                    </div>
                    
                    <AccessControlEditor data={editingTool} onChange={(d) => setEditingTool({ ...editingTool, ...d })} />

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Системный Промпт</label>
                      <textarea 
                        className="w-full h-80 md:h-64 p-3 border rounded-2xl md:rounded-lg bg-slate-50 font-mono text-xs leading-relaxed outline-none"
                        value={editingTool.systemPrompt}
                        onChange={(e) => setEditingTool({...editingTool, systemPrompt: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2 pt-6 pb-12 md:pb-6 border-t">
                      <button onClick={() => setEditingTool(null)} className="flex-1 md:flex-none px-6 py-3 md:py-2 text-slate-500 hover:bg-slate-50 rounded-xl">Отмена</button>
                      <button onClick={handleSaveTool} className="flex-1 md:flex-none px-8 py-3 md:py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Сохранить</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;