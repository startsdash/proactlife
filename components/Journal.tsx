
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Book, Sparkles, Send, Trash2, X, MoreHorizontal, Edit3, Calendar, Search, Filter, Gem, BrainCircuit, Globe, ChevronDown, Check, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

// --- HELPERS ---

const allowDataUrls = (url: string) => url;

const findFirstUrl = (text: string): string | null => {
    const match = text.match(/(https?:\/\/[^\s\)]+)/);
    return match ? match[0] : null;
};

const LinkPreview = React.memo(({ url }: { url: string }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(false);
        fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(json => {
                if (mounted) {
                    if (json.status === 'success') setData(json.data);
                    else setError(true);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (mounted) { setError(true); setLoading(false); }
            });
        return () => { mounted = false; };
    }, [url]);

    if (error || loading || !data) return null;

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block mt-2 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex max-w-sm group hover:border-indigo-300 transition-colors">
            {data.image?.url && <div className="w-24 h-24 shrink-0"><img src={data.image.url} className="w-full h-full object-cover" alt="" /></div>}
            <div className="p-3 flex flex-col justify-center min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mb-1">{data.title}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{data.description}</div>
            </div>
        </a>
    );
});

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-300 dark:border-indigo-700 pl-4 italic text-slate-600 dark:text-slate-400 my-2" {...props} />,
};

const JournalEntrySphereSelector: React.FC<{ entry: JournalEntry, updateEntry: (e: JournalEntry) => void, align?: 'left' | 'right', direction?: 'up' | 'down' }> = ({ entry, updateEntry, align = 'right', direction = 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleSphere = (sphereId: string) => {
        const current = entry.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                {entry.spheres && entry.spheres.length > 0 ? (
                    <div className="flex -space-x-1">
                        {entry.spheres.map(s => {
                            const sp = SPHERES.find(x => x.id === s);
                            return sp ? <div key={s} className={`w-3 h-3 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`} /> : null;
                        })}
                    </div>
                ) : (
                    <Globe size={14} className="text-slate-400" />
                )}
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    {entry.spheres?.length ? entry.spheres.length : 'Сфера'}
                </span>
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
                    <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'} w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5`} onClick={e => e.stopPropagation()}>
                        {SPHERES.map(s => {
                            const isSelected = entry.spheres?.includes(s.id);
                            const Icon = ICON_MAP[s.icon];
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => toggleSphere(s.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
                                    <span className="flex-1">{s.label}</span>
                                    {isSelected && <Check size={12} className="text-indigo-500" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

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
  onClearInitialTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

const Journal: React.FC<Props> = ({ 
    entries, mentorAnalyses, tasks, config, 
    addEntry, deleteEntry, updateEntry, 
    addMentorAnalysis, deleteMentorAnalysis,
    initialTaskId, onClearInitialTask, onNavigateToTask 
}) => {
    const [newContent, setNewContent] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [filter, setFilter] = useState<'all' | 'insights'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    
    // Linked Task Logic
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId || null);

    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const linkedTask = tasks.find(t => t.id === linkedTaskId);

    const handleAdd = () => {
        if (!newContent.trim()) return;
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: applyTypography(newContent),
            linkedTaskId: linkedTaskId || undefined,
            isInsight: false
        };
        addEntry(entry);
        setNewContent('');
        setLinkedTaskId(null);
    };

    const handleAnalyze = async () => {
        if (entries.length < 3) {
            alert("Нужно хотя бы 3 записи для анализа.");
            return;
        }
        setIsAnalyzing(true);
        const analysis = await analyzeJournalPath(entries, config);
        addMentorAnalysis({
            id: Date.now().toString(),
            date: Date.now(),
            content: analysis,
            mentorName: 'Mentor AI'
        });
        setIsAnalyzing(false);
    };

    const toggleInsight = (entry: JournalEntry) => {
        updateEntry({ ...entry, isInsight: !entry.isInsight });
    };

    const startEditing = (entry: JournalEntry) => {
        setEditingId(entry.id);
        setEditContent(entry.content);
    };

    const saveEdit = () => {
        if (editingId) {
            const entry = entries.find(e => e.id === editingId);
            if (entry) {
                updateEntry({ ...entry, content: applyTypography(editContent) });
            }
            setEditingId(null);
            setEditContent('');
        }
    };

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => {
                if (filter === 'insights' && !e.isInsight) return false;
                if (searchQuery && !e.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
            })
            .sort((a, b) => b.date - a.date);
    }, [entries, filter, searchQuery]);

    const selectedLinkedTask = selectedEntry?.linkedTaskId ? tasks.find(t => t.id === selectedEntry.linkedTaskId) : null;

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            
            {/* Header */}
            <div className="p-6 md:p-8 pb-4 shrink-0 z-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути</p>
                </div>
                <div className="flex gap-2">
                    <Tooltip content="Анализ пути (ИИ)">
                        <button 
                            onClick={handleAnalyze} 
                            disabled={isAnalyzing}
                            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all disabled:opacity-50"
                        >
                            {isAnalyzing ? <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" /> : <BrainCircuit size={20} strokeWidth={1.5} />}
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* LIST / INPUT COLUMN */}
                <div className={`flex-1 flex flex-col min-w-0 ${selectedEntry ? 'hidden md:flex' : 'flex'}`}>
                    
                    {/* INPUT AREA */}
                    <div className="px-6 md:px-8 pb-6 shrink-0">
                        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-shadow focus-within:shadow-md">
                            {linkedTask && (
                                <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg mb-3">
                                    <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 truncate">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                                        <span className="font-bold uppercase tracking-wider">Контекст:</span>
                                        <span className="truncate">{linkedTask.title || linkedTask.content}</span>
                                    </div>
                                    <button onClick={() => setLinkedTaskId(null)} className="text-indigo-400 hover:text-indigo-600 p-1"><X size={14}/></button>
                                </div>
                            )}
                            <textarea 
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(); }}
                                placeholder="О чем думаешь?"
                                className="w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-serif text-base min-h-[80px]"
                            />
                            <div className="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-700 pt-2">
                                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                                    {new Date().toLocaleDateString()}
                                </div>
                                <button 
                                    onClick={handleAdd}
                                    disabled={!newContent.trim()}
                                    className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-md"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div className="px-6 md:px-8 pb-4 flex gap-4 overflow-x-auto scrollbar-none shrink-0">
                        <div className="relative flex-1 max-w-xs">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Поиск..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800/50 pl-9 pr-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-400 transition-colors"
                            />
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shrink-0">
                            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}>Все</button>
                            <button onClick={() => setFilter('insights')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${filter === 'insights' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}><Gem size={12} /> Инсайты</button>
                        </div>
                    </div>

                    {/* LIST */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar-light px-6 md:px-8 pb-20 space-y-4">
                        {mentorAnalyses.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Sparkles size={14} className="text-indigo-500" /> Анализ Ментора
                                </h3>
                                <div className="space-y-4">
                                    {mentorAnalyses.map(analysis => (
                                        <div key={analysis.id} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">{new Date(analysis.date).toLocaleDateString()}</div>
                                                <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-indigo-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-indigo-100 leading-relaxed font-serif">
                                                <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{analysis.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredEntries.length === 0 ? (
                            <EmptyState icon={Book} title="Дневник пуст" description="Начни писать свою историю" color="cyan" />
                        ) : (
                            filteredEntries.map(entry => (
                                <motion.div 
                                    key={entry.id}
                                    layoutId={entry.id}
                                    onClick={() => setSelectedEntry(entry)}
                                    className={`p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md group ${entry.isInsight ? 'bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-[#1e293b] border-violet-100 dark:border-violet-800/50' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(entry.date).toLocaleDateString()}</span>
                                            {entry.mood && <span className="text-sm">{['😖','😕','😐','🙂','🤩'][entry.mood - 1]}</span>}
                                        </div>
                                        {entry.isInsight && <Gem size={14} className="text-violet-500" />}
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 font-serif leading-relaxed">
                                        <ReactMarkdown components={markdownComponents} allowedElements={['p', 'strong', 'em']} unwrapDisallowed={true}>{entry.content}</ReactMarkdown>
                                    </div>
                                    {entry.moodTags && entry.moodTags.length > 0 && (
                                        <div className="flex gap-1 mt-3 flex-wrap">
                                            {entry.moodTags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">{t}</span>)}
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* DETAIL VIEW (Right Panel / Overlay on Mobile) */}
                <AnimatePresence>
                    {selectedEntry && (
                        <motion.div 
                            initial={{ opacity: 0, x: '100%' }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed md:relative inset-0 md:inset-auto z-50 md:z-0 w-full md:w-[500px] bg-white dark:bg-[#1e293b] md:border-l border-slate-200 dark:border-slate-700 md:shadow-xl flex flex-col"
                        >
                            <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar-light flex flex-col">
                                <div className="flex justify-between items-center mb-8 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedEntry(null)} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                                            <X size={20} />
                                        </button>
                                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                            {new Date(selectedEntry.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        {editingId === selectedEntry.id ? (
                                            <button onClick={saveEdit} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Check size={18}/></button>
                                        ) : (
                                            <button onClick={() => startEditing(selectedEntry)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Edit3 size={18}/></button>
                                        )}
                                        <button onClick={() => { if(confirm('Удалить?')) { deleteEntry(selectedEntry.id); setSelectedEntry(null); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                </div>

                                {editingId === selectedEntry.id ? (
                                    <textarea 
                                        className="w-full h-full bg-transparent border-none outline-none resize-none font-serif text-base leading-relaxed text-slate-800 dark:text-slate-200 p-0"
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <div className="font-serif text-[#2F3437] dark:text-slate-200 leading-[1.8] text-base">
                                                <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                                    {selectedEntry.content.replace(/\n/g, '  \n')}
                                                </ReactMarkdown>
                                            </div>
                                            {(() => { const url = findFirstUrl(selectedEntry.content); return url ? <LinkPreview url={url} /> : null; })()}

                                            {selectedEntry.aiFeedback && (
                                                <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
                                                     <div className="flex items-center gap-2 mb-3">
                                                        <Sparkles size={12} className="text-indigo-400" />
                                                        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">Ментор</span>
                                                     </div>
                                                     <div className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed font-serif">
                                                        <ReactMarkdown components={markdownComponents}>{selectedEntry.aiFeedback}</ReactMarkdown>
                                                     </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* AETHER FOOTER REPLICA */}
                                        <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-6 shrink-0">
                                            {selectedLinkedTask && !editingId && (
                                                <div className="font-mono text-[10px] text-slate-400 flex items-center gap-2 group/ctx">
                                                    <span className="opacity-50">[ CONTEXT: </span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(selectedLinkedTask.id); }}
                                                        className="hover:text-indigo-500 underline decoration-dotted underline-offset-4 truncate max-w-[200px] transition-colors"
                                                    >
                                                        {selectedLinkedTask.content}
                                                    </button>
                                                    <span className="opacity-50"> ]</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center">
                                                <JournalEntrySphereSelector entry={selectedEntry} updateEntry={updateEntry} align="left" direction="up" />
                                                
                                                {!editingId && (
                                                    <button 
                                                        onClick={() => toggleInsight(selectedEntry)} 
                                                        className={`font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedEntry.isInsight ? 'text-violet-500' : 'text-slate-300 hover:text-slate-500'}`}
                                                    >
                                                        <Gem size={12} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                                        {selectedEntry.isInsight ? "Insight" : "Mark Insight"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Journal;
