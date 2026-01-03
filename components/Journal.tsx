import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Calendar, Edit3, Trash2, Plus, Search, Sparkles, Bot, ArrowRight, X, Link as LinkIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask: () => void;
  onNavigateToTask: (taskId: string) => void;
}

// Helper
const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const Journal: React.FC<Props> = ({ 
    entries, 
    mentorAnalyses, 
    tasks, 
    config, 
    addEntry, 
    deleteEntry, 
    updateEntry, 
    addMentorAnalysis, 
    deleteMentorAnalysis,
    initialTaskId,
    onClearInitialTask,
    onNavigateToTask
}) => {
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Initial Task Handling (Create entry for a task)
    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                const newEntry: JournalEntry = {
                    id: Date.now().toString(),
                    date: Date.now(),
                    content: `Рефлексия по задаче: **${task.title || 'Без названия'}**\n\n`,
                    linkedTaskId: task.id,
                    isInsight: false
                };
                addEntry(newEntry);
                setSelectedEntry(newEntry);
                setIsEditing(true);
                setEditContent(newEntry.content);
            }
            onClearInitialTask();
        }
    }, [initialTaskId, tasks, addEntry, onClearInitialTask]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const handleCreateEntry = () => {
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: '',
            isInsight: false
        };
        addEntry(newEntry);
        setSelectedEntry(newEntry);
        setIsEditing(true);
        setEditContent('');
    };

    const handleSave = () => {
        if (selectedEntry) {
            updateEntry({ ...selectedEntry, content: editContent });
            setIsEditing(false);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Удалить запись?')) {
            deleteEntry(id);
            if (selectedEntry?.id === id) setSelectedEntry(null);
        }
    };

    const handleAnalysis = async () => {
        if (entries.length < 3) {
            alert("Нужно хотя бы 3 записи для анализа.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(entries, config);
            const newAnalysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: 'AI Mentor'
            };
            addMentorAnalysis(newAnalysis);
        } catch (e) {
            console.error(e);
            alert("Ошибка анализа.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            {/* LEFT SIDEBAR (LIST) */}
            <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#1e293b] absolute md:relative z-10 h-full transition-transform duration-300 ${selectedEntry ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Дневник</h2>
                        <button onClick={handleCreateEntry} className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 transition-colors">
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-2 space-y-2">
                    {/* Analysis Button */}
                    <button 
                        onClick={handleAnalysis}
                        disabled={isAnalyzing || entries.length < 3}
                        className="w-full p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg flex items-center justify-center gap-2 text-sm font-medium mb-4 hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {isAnalyzing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Sparkles size={16} />}
                        <span>{isAnalyzing ? 'Анализирую...' : 'Анализ Пути (ИИ)'}</span>
                    </button>

                    {filteredEntries.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">Нет записей</div>
                    ) : (
                        filteredEntries.map(entry => (
                            <div 
                                key={entry.id} 
                                onClick={() => { setSelectedEntry(entry); setIsEditing(false); }}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedEntry?.id === entry.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800/50 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className="text-xs text-slate-400 mb-1 flex items-center gap-2">
                                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                                    {entry.isInsight && <Sparkles size={12} className="text-amber-500" />}
                                    {entry.mood && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">Mood: {entry.mood}</span>}
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-medium">
                                    {entry.content || 'Пустая запись...'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE (DETAIL) */}
            <div className={`flex-1 flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] h-full absolute md:relative w-full z-20 transition-transform duration-300 ${selectedEntry ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                {selectedEntry ? (
                    <>
                        <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] flex justify-between items-start shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedEntry(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600">
                                    <ArrowRight size={20} className="rotate-180" />
                                </button>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-2xl font-sans font-bold text-slate-900 dark:text-white leading-tight mb-1">Детали записи</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                                        <Calendar size={12} strokeWidth={1} /> {formatDate(selectedEntry.date)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing ? (
                                    <>
                                        <Tooltip content="Инсайт">
                                            <button 
                                                onClick={() => updateEntry({...selectedEntry, isInsight: !selectedEntry.isInsight})}
                                                className={`p-2 rounded-lg transition-colors ${selectedEntry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                            >
                                                <Sparkles size={18} />
                                            </button>
                                        </Tooltip>
                                        <button onClick={() => { setIsEditing(true); setEditContent(selectedEntry.content); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(selectedEntry.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                                        Сохранить
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar-light">
                            <div className="max-w-3xl mx-auto">
                                {isEditing ? (
                                    <textarea 
                                        value={editContent} 
                                        onChange={(e) => setEditContent(e.target.value)} 
                                        className="w-full h-[60vh] bg-transparent resize-none outline-none text-base md:text-lg leading-relaxed text-slate-800 dark:text-slate-200 font-sans p-0"
                                        placeholder="О чем вы думаете?..."
                                        autoFocus
                                    />
                                ) : (
                                    <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-300 leading-loose text-base md:text-lg">
                                        <ReactMarkdown>{selectedEntry.content}</ReactMarkdown>
                                    </div>
                                )}

                                {selectedEntry.linkedTaskId && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                            <LinkIcon size={12} /> Связанная задача
                                        </div>
                                        <button 
                                            onClick={() => onNavigateToTask(selectedEntry.linkedTaskId!)}
                                            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                                        >
                                            Перейти к задаче <ArrowRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                        {mentorAnalyses.length > 0 && (
                            <div className="w-full max-w-2xl mb-10 space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><Bot size={16}/> Последние анализы ИИ</h3>
                                {mentorAnalyses.map(analysis => (
                                    <div key={analysis.id} className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                        <div className="text-xs text-slate-400 mb-2 flex justify-between">
                                            <span>{formatDate(analysis.date)}</span>
                                            <span className="font-bold text-indigo-500">{analysis.mentorName}</span>
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                            <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                        </div>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <EmptyState 
                            icon={Book} 
                            title="Выберите запись" 
                            description="Или создайте новую, чтобы начать рефлексию" 
                            actionLabel="Создать запись"
                            onAction={handleCreateEntry}
                            color="cyan"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;