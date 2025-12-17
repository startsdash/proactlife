
import React, { useState } from 'react';
import { AppConfig, Mentor, ChallengeAuthor, AIToolConfig, AccessControl } from '../types';
import { AVAILABLE_ICONS, ICON_MAP, DEFAULT_AI_TOOLS, AVAILABLE_MODELS, DEFAULT_MODEL } from '../constants';
import { Save, Plus, Trash2, Edit3, X, Database, Users, Zap, Bot, Cpu, FileJson, FileType, Shield, Lock, Globe, Code, Copy, Check } from 'lucide-react';

interface Props {
  config: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
}

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
       
       <div className="flex flex-col md:flex-row gap-4 mb-4">
          <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg border transition-all ${currentLevel === 'public' ? 'bg-white border-indigo-200 ring-1 ring-indigo-50 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
             <input 
               type="radio" 
               className="accent-indigo-600"
               checked={currentLevel === 'public'} 
               onChange={() => onChange({ ...data, accessLevel: 'public' })}
             />
             <Globe size={14} className="text-emerald-500" />
             <span className="text-slate-700">Все пользователи</span>
          </label>
          <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg border transition-all ${currentLevel === 'owner_only' ? 'bg-white border-indigo-200 ring-1 ring-indigo-50 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
             <input 
               type="radio" 
               className="accent-indigo-600"
               checked={currentLevel === 'owner_only'} 
               onChange={() => onChange({ ...data, accessLevel: 'owner_only' })}
             />
             <Lock size={14} className="text-red-500" />
             <span className="text-slate-700">Только владелец</span>
          </label>
          <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg border transition-all ${currentLevel === 'restricted' ? 'bg-white border-indigo-200 ring-1 ring-indigo-50 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
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

const Settings: React.FC<Props> = ({ config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState<'core' | 'mentors' | 'authors' | 'tools'>('core');
  
  const [localCore, setLocalCore] = useState(config.coreLibrary);
  const [mentors, setMentors] = useState<Mentor[]>(config.mentors);
  const [authors, setAuthors] = useState<ChallengeAuthor[]>(config.challengeAuthors);
  
  // Initialize AI Tools by merging Defaults with User Config
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
      coreLibrary: localCore,
      mentors: mentors,
      challengeAuthors: authors,
      aiTools: aiTools 
    });
    alert("Конфигурация сохранена локально!");
  };

  const handleExportCode = () => {
      const currentConfig: AppConfig = {
          coreLibrary: localCore,
          mentors: mentors,
          challengeAuthors: authors,
          aiTools: aiTools
      };
      
      const json = JSON.stringify(currentConfig, null, 2);
      // Clean up common repetitive strings to constants if needed, or just keep raw JSON.
      // We will export a variable declaration.
      const codeBlock = `export const DEFAULT_CONFIG: AppConfig = ${json};`;
      
      navigator.clipboard.writeText(codeBlock).then(() => {
          setCopyStatus(true);
          setTimeout(() => setCopyStatus(false), 2000);
      });
  };

  const handleSaveMentor = () => {
    if (editingMentor) {
      if (isNewMentor) {
        setMentors([...mentors, editingMentor]);
      } else {
        setMentors(mentors.map(m => m.id === editingMentor.id ? editingMentor : m));
      }
      setEditingMentor(null);
    }
  };

  const deleteMentor = (id: string) => {
    if (confirm("Удалить ментора?")) {
      setMentors(mentors.filter(m => m.id !== id));
    }
  };

  const handleSaveAuthor = () => {
    if (editingAuthor) {
      if (isNewAuthor) {
        setAuthors([...authors, editingAuthor]);
      } else {
        setAuthors(authors.map(a => a.id === editingAuthor.id ? editingAuthor : a));
      }
      setEditingAuthor(null);
    }
  };

  const deleteAuthor = (id: string) => {
    if (confirm("Удалить автора?")) {
      setAuthors(authors.filter(a => a.id !== id));
    }
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
        className="w-full p-2 border rounded-lg bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {AVAILABLE_MODELS.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="h-full p-4 md:p-8 flex flex-col overflow-hidden bg-slate-50">
      <header className="mb-6 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-light text-slate-800 tracking-tight">Настройки Владельца</h1>
          <p className="text-slate-500 text-sm">Управление ИИ и Базой Знаний</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleExportCode} 
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${copyStatus ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                title="Скопировать код для constants.ts"
            >
                {copyStatus ? <Check size={18} /> : <Code size={18} />}
                <span className="hidden md:inline">{copyStatus ? 'Скопировано!' : 'Код для constants.ts'}</span>
            </button>
            <button onClick={saveAll} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all">
                <Save size={18} /> Сохранить
            </button>
        </div>
      </header>
      
      {/* INFO BANNER */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-800 flex items-start gap-2 shrink-0">
          <Database size={14} className="mt-0.5 shrink-0" />
          <p>
              <strong>Внимание:</strong> Изменения здесь сохраняются локально. Чтобы применить их для <strong>всех пользователей</strong>, 
              используйте кнопку "Код для constants.ts" и обновите файл исходного кода приложения.
          </p>
      </div>

      <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('core')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'core' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
          <Database size={16} /> Ядро Знаний
        </button>
        <button onClick={() => setActiveTab('mentors')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'mentors' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
          <Users size={16} /> Менторы
        </button>
        <button onClick={() => setActiveTab('authors')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'authors' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
          <Zap size={16} /> Авторы Челленджей
        </button>
        <button onClick={() => setActiveTab('tools')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'tools' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
          <Bot size={16} /> AI Генераторы
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* CORE LIBRARY TAB */}
        {activeTab === 'core' && (
          <div className="flex-1 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Глобальный контекст (# SYSTEM)</h3>
            <textarea 
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
              value={localCore}
              onChange={(e) => setLocalCore(e.target.value)}
              placeholder="Введите список книг и базовых принципов..."
            />
          </div>
        )}

        {/* MENTORS TAB */}
        {activeTab === 'mentors' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Mentor List */}
            <div className="w-1/3 border-r border-slate-100 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
              <button 
                onClick={() => {
                  setEditingMentor({ id: Date.now().toString(), name: 'Новый Ментор', icon: 'User', color: 'text-slate-600', systemPrompt: '', model: DEFAULT_MODEL, accessLevel: 'public' });
                  setIsNewMentor(true);
                }}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-medium hover:border-indigo-300 hover:text-indigo-500 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} /> Добавить
              </button>
              {mentors.map(m => (
                <div key={m.id} onClick={() => { setEditingMentor(m); setIsNewMentor(false); }} className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${editingMentor?.id === m.id ? 'bg-white shadow border-indigo-200 ring-1 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-100'}`}>
                  <div className={`p-2 rounded-lg bg-slate-50 ${m.color}`}>
                    <RenderIcon name={m.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <div className="font-medium text-slate-700 truncate">{m.name}</div>
                        {m.accessLevel === 'owner_only' && <Lock size={10} className="text-red-400" />}
                        {m.accessLevel === 'restricted' && <Users size={10} className="text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400">{m.model || DEFAULT_MODEL}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mentor Editor */}
            <div className="flex-1 p-6 overflow-y-auto">
              {editingMentor ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">{isNewMentor ? 'Создание ментора' : 'Редактирование'}</h3>
                    {!isNewMentor && (
                      <button onClick={() => deleteMentor(editingMentor.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Имя</label>
                      <input 
                        className="w-full p-2 border rounded-lg bg-slate-50" 
                        value={editingMentor.name} 
                        onChange={(e) => setEditingMentor({...editingMentor, name: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID (лат.)</label>
                      <input 
                        className="w-full p-2 border rounded-lg bg-slate-50" 
                        value={editingMentor.id} 
                        disabled={!isNewMentor}
                        onChange={(e) => setEditingMentor({...editingMentor, id: e.target.value})} 
                      />
                    </div>
                  </div>
                  
                  {/* MODEL SELECTION */}
                  <ModelSelector 
                     value={editingMentor.model} 
                     onChange={(val) => setEditingMentor({...editingMentor, model: val})} 
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Иконка</label>
                    <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {AVAILABLE_ICONS.map(iconName => (
                        <button
                          key={iconName}
                          onClick={() => setEditingMentor({...editingMentor, icon: iconName})}
                          className={`p-2 rounded-md transition-all ${editingMentor.icon === iconName ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-400 hover:text-indigo-500'}`}
                          title={iconName}
                        >
                          <RenderIcon name={iconName} className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Цвет (Tailwind Class)</label>
                    <input 
                        className="w-full p-2 border rounded-lg bg-slate-50" 
                        value={editingMentor.color} 
                        onChange={(e) => setEditingMentor({...editingMentor, color: e.target.value})} 
                        placeholder="text-indigo-600"
                      />
                  </div>
                  
                  {/* ACCESS CONTROL */}
                  <AccessControlEditor 
                    data={editingMentor} 
                    onChange={(d) => setEditingMentor({ ...editingMentor, ...d })} 
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 mt-4">Системный Промпт (# SYSTEM)</label>
                    <textarea 
                      className="w-full h-64 p-3 border rounded-lg bg-slate-50 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={editingMentor.systemPrompt}
                      onChange={(e) => setEditingMentor({...editingMentor, systemPrompt: e.target.value})}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button onClick={() => setEditingMentor(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Отмена</button>
                    <button onClick={handleSaveMentor} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сохранить</button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300">Выберите ментора для редактирования</div>
              )}
            </div>
          </div>
        )}

        {/* AUTHORS TAB */}
        {activeTab === 'authors' && (
          <div className="flex-1 flex overflow-hidden">
             <div className="w-1/3 border-r border-slate-100 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
              <button 
                onClick={() => {
                  setEditingAuthor({ id: Date.now().toString(), name: 'Новый Автор', systemPrompt: '', model: DEFAULT_MODEL, accessLevel: 'public' });
                  setIsNewAuthor(true);
                }}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-medium hover:border-indigo-300 hover:text-indigo-500 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} /> Добавить
              </button>
              {authors.map(a => (
                <div key={a.id} onClick={() => { setEditingAuthor(a); setIsNewAuthor(false); }} className={`p-4 rounded-xl border cursor-pointer transition-all ${editingAuthor?.id === a.id ? 'bg-white shadow border-indigo-200 ring-1 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-100'}`}>
                    <div className="flex justify-between items-center">
                        <div className="font-medium text-slate-700">{a.name}</div>
                        {a.accessLevel === 'owner_only' && <Lock size={10} className="text-red-400" />}
                        {a.accessLevel === 'restricted' && <Users size={10} className="text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400">{a.model || DEFAULT_MODEL}</div>
                </div>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {editingAuthor ? (
                <div className="max-w-2xl mx-auto space-y-6">
                   <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">{isNewAuthor ? 'Создание автора' : 'Редактирование'}</h3>
                    {!isNewAuthor && (
                      <button onClick={() => deleteAuthor(editingAuthor.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Имя</label>
                      <input 
                        className="w-full p-2 border rounded-lg bg-slate-50" 
                        value={editingAuthor.name} 
                        onChange={(e) => setEditingAuthor({...editingAuthor, name: e.target.value})} 
                      />
                  </div>
                  
                  <ModelSelector 
                     value={editingAuthor.model} 
                     onChange={(val) => setEditingAuthor({...editingAuthor, model: val})} 
                  />
                  
                  {/* Output Format Selector */}
                  <div className="space-y-1">
                     <label className="block text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                        {editingAuthor.responseMimeType === 'application/json' ? <FileJson size={12}/> : <FileType size={12}/>} 
                        Формат вывода
                     </label>
                     <select 
                        value={editingAuthor.responseMimeType || 'text/plain'}
                        onChange={(e) => setEditingAuthor({...editingAuthor, responseMimeType: e.target.value as any})}
                        className="w-full p-2 border rounded-lg bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                     >
                        <option value="text/plain">Текст (Markdown)</option>
                        <option value="application/json">JSON (Strict)</option>
                     </select>
                  </div>
                  
                  {/* ACCESS CONTROL */}
                  <AccessControlEditor 
                    data={editingAuthor} 
                    onChange={(d) => setEditingAuthor({ ...editingAuthor, ...d })} 
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 mt-4">Системный Промпт (# SYSTEM)</label>
                    <textarea 
                      className="w-full h-64 p-3 border rounded-lg bg-slate-50 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={editingAuthor.systemPrompt}
                      onChange={(e) => setEditingAuthor({...editingAuthor, systemPrompt: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button onClick={() => setEditingAuthor(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Отмена</button>
                    <button onClick={handleSaveAuthor} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сохранить</button>
                  </div>
                </div>
              ) : (
                 <div className="h-full flex items-center justify-center text-slate-300">Выберите автора челленджей</div>
              )}
            </div>
          </div>
        )}
        
        {/* AI GENERATORS TAB (FORMERLY TOOLS) */}
        {activeTab === 'tools' && (
          <div className="flex-1 flex overflow-hidden">
             <div className="w-1/3 border-r border-slate-100 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
              <div className="px-2 py-1 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Системные Генераторы</div>
              {aiTools.map(t => (
                <div key={t.id} onClick={() => setEditingTool(t)} className={`p-4 rounded-xl border cursor-pointer transition-all ${editingTool?.id === t.id ? 'bg-white shadow border-indigo-200 ring-1 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <div className="font-medium text-slate-700 text-sm">{t.name}</div>
                        {t.accessLevel === 'owner_only' && <Lock size={10} className="text-red-400" />}
                        {t.accessLevel === 'restricted' && <Users size={10} className="text-amber-400" />}
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded w-max">ID: {t.id}</div>
                        <div className="text-[10px] text-indigo-400">{t.model || DEFAULT_MODEL}</div>
                    </div>
                </div>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {editingTool ? (
                <div className="max-w-2xl mx-auto space-y-6">
                   <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Настройка генератора</h3>
                    <div className="text-xs text-slate-400 font-mono">ID: {editingTool.id}</div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Название (UI)</label>
                      <input 
                        className="w-full p-2 border rounded-lg bg-slate-50" 
                        value={editingTool.name} 
                        onChange={(e) => setEditingTool({...editingTool, name: e.target.value})} 
                      />
                  </div>
                  
                  <ModelSelector 
                     value={editingTool.model} 
                     onChange={(val) => setEditingTool({...editingTool, model: val})} 
                  />

                  {/* Output Format Selector */}
                  <div className="space-y-1">
                     <label className="block text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                        {editingTool.responseMimeType === 'application/json' ? <FileJson size={12}/> : <FileType size={12}/>} 
                        Формат вывода
                     </label>
                     <select 
                        value={editingTool.responseMimeType || 'text/plain'}
                        onChange={(e) => setEditingTool({...editingTool, responseMimeType: e.target.value as any})}
                        className="w-full p-2 border rounded-lg bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                     >
                        <option value="text/plain">Текст (Markdown)</option>
                        <option value="application/json">JSON (Strict)</option>
                     </select>
                     <p className="text-[10px] text-amber-600 mt-1">
                        * Внимание: Изменение формата для системных утилит (например, Tagger) может нарушить работу приложения, если код ожидает строгий JSON.
                     </p>
                  </div>
                  
                  {/* ACCESS CONTROL */}
                  <AccessControlEditor 
                    data={editingTool} 
                    onChange={(d) => setEditingTool({ ...editingTool, ...d })} 
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 mt-4">Системный Промпт (# SYSTEM)</label>
                    <p className="text-[10px] text-slate-400 mb-2">Этот текст определяет роль и поведение ИИ для данной функции.</p>
                    <textarea 
                      className="w-full h-64 p-3 border rounded-lg bg-slate-50 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={editingTool.systemPrompt}
                      onChange={(e) => setEditingTool({...editingTool, systemPrompt: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button onClick={() => setEditingTool(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Отмена</button>
                    <button onClick={handleSaveTool} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сохранить</button>
                  </div>
                </div>
              ) : (
                 <div className="h-full flex items-center justify-center text-slate-300">Выберите генератор для настройки</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;
