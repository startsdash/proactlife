
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { Book, Search, Plus, X, Calendar, Filter, Sparkles, Gem, Edit3, Trash2, ChevronRight, MessageCircle, Globe, Link2, Layout } from 'lucide-react';
import EmptyState from './EmptyState';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { Tooltip } from './Tooltip';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

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
                    if (json.status === 'success') {
                        setData(json.data);
                    } else {
                        setError(true);
                    }
                    setLoading(false);
                }
            })
            .catch(() => {
                if (mounted) {
                    setError(true);
                    setLoading(false);
                }
            });
        return () => { mounted = false; };
    }, [url]);

    if (error || loading) return null;
    if (!data || !data.title) return null;

    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => e.stopPropagation()} 
            className="block mt-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800 transition-all rounded-xl overflow-hidden group/link relative no-underline break-inside-avoid border border-black/5 dark:border-white/5 shadow-sm"
        >
            {data.image?.url && (
                <div className="h-32 w-full overflow-hidden relative">
                    <img 
                        src={data.image.url} 
                        alt="Preview" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/link:scale-105 opacity-90 group-hover/link:opacity-100" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            )}
            <div className="p-3">
                <h4 className="font-sans font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 leading-snug">{data.title}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed font-sans">{data.description}</p>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase tracking-wider font-bold font-sans">
                    {data.logo?.url ? (
                        <img src={data.logo.url} className="w-3 h-3 rounded-full" alt="" />
                    ) : (
                        <Globe size={10} />
                    )}
                    <span className="truncate">{data.publisher || new URL(url).hostname}</span>
                </div>
            </div>
        </a>
    );
});

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer underline-offset-4 decoration-slate-300 dark:decoration-slate-600 transition-colors font-sans text-sm font-medium relative z-20 break-all" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-2xl mt-4 mb-2 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-sans font-bold text-lg mt-2 mb-1 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-pink-600 dark:text-pink-400" {...props}>{children}</code>
            : <code className="block bg-slate-900 dark:bg-black text-slate-50 p-3 rounded-xl text-xs font-mono my-3 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    },
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} />;
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, config, addEntry, updateEntry, deleteEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
  const [newEntryContent, setNewEntryContent] = useState('');
  const [isInsight, setIsInsight] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [hasActiveDateFilter, setHasActiveDateFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
      const previous = scrollY.getPrevious() || 0;
      const diff = latest - previous;
      const isScrollingDown = diff > 0;
      if (latest > 100 && isScrollingDown) setIsHeaderHidden(true);
      else setIsHeaderHidden(false);
  });

  useEffect(() => {
      if (initialTaskId) {
          const task = tasks.find(t => t.id === initialTaskId);
          if (task) {
              setNewEntryContent(`**${task.title}**\n\n`);
              setIsCreatorOpen(true);
          }
          onClearInitialTask?.();
      }
  }, [initialTaskId, tasks, onClearInitialTask]);

  const displayedEntries = useMemo(() => {
      let filtered = entries.sort((a, b) => b.date - a.date);
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(e => e.content.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q));
      }
      return filtered;
  }, [entries, searchQuery]);

  const handleCreate = () => {
      if (!newEntryContent.trim()) return;
      
      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          date: Date.now(),
          content: applyTypography(newEntryContent),
          isInsight,
          linkedTaskId: initialTaskId || undefined
      };
      
      addEntry(newEntry);
      setNewEntryContent('');
      setIsInsight(false);
      setIsCreatorOpen(false);
  };

  const toggleInsight = (entry: JournalEntry) => {
      updateEntry({ ...entry, isInsight: !entry.isInsight });
  };

  const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString('ru-RU', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
      });
  };

  const formatTimelineDate = (timestamp: number) => {
      const d = new Date(timestamp);
      return `${d.getDate()} ${d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar-light"
        >
            <motion.div 
                className="sticky top-0 z-40 w-full mb-[-20px]"
                animate={{ y: isHeaderHidden ? '-100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
                <div className="absolute inset-0 h-[140%] pointer-events-none -z-10">
                    <div 
                        className="absolute inset-0 backdrop-blur-xl"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)'
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f8fafc]/95 to-transparent dark:from-[#0f172a] dark:via-[#0f172a]/95 dark:to-transparent" />
                </div>

                <div className="relative z-10 w-full px-4 md:px-8 pt-4 pb-2">
                    <div className="max-w-3xl mx-auto w-full">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                            </div>
                        </header>

                        {/* Search & Create Block - Centered */}
                        <div className="space-y-4">
                            {!isCreatorOpen ? (
                                <div className="flex gap-2">
                                    <div className="relative flex-1 group">
                                        <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                                        <input 
                                            type="text" 
                                            placeholder="Поиск по записям..." 
                                            value={searchQuery} 
                                            onChange={(e) => setSearchQuery(e.target.value)} 
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400" 
                                        />
                                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={16} /></button>}
                                    </div>
                                    <button 
                                        onClick={() => setIsCreatorOpen(true)}
                                        className="p-3 bg-white dark:bg-[#1e293b] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl shadow-sm transition-all"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-4 shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                                    <textarea 
                                        autoFocus
                                        placeholder="О чем ты думаешь?"
                                        className="w-full h-32 bg-transparent resize-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-serif text-base leading-relaxed"
                                        value={newEntryContent}
                                        onChange={(e) => setNewEntryContent(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                handleCreate();
                                            }
                                        }}
                                    />
                                    <div className="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                        <button 
                                            onClick={() => setIsInsight(!isInsight)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isInsight ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                            <Gem size={14} className={isInsight ? 'fill-current' : ''} />
                                            Инсайт
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsCreatorOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">Отмена</button>
                                            <button onClick={handleCreate} disabled={!newEntryContent.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors disabled:opacity-50">Записать</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="w-full px-4 md:px-8 pt-12 pb-24 min-h-0">
                {displayedEntries.length === 0 ? (
                <div className="py-10">
                    <EmptyState 
                        icon={Book} 
                        title="Страницы пусты" 
                        description={searchQuery ? 'Ничего не найдено по вашему запросу' : 'Записывай свои мысли, связывай их с задачами, чтобы отслеживать свой путь'}
                        color="cyan"
                    />
                </div>
                ) : (
                <div className="w-full relative">
                    {/* The Ghost Line */}
                    <div className="absolute left-[3rem] md:left-[4rem] top-8 bottom-8 border-l border-slate-900/5 dark:border-white/5 width-px" />

                    <div className="space-y-8">
                        {displayedEntries.map(entry => {
                        const mentor = config.mentors.find(m => m.id === entry.mentorId);
                        const isEditing = editingId === entry.id;
                        const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                        const linkUrl = findFirstUrl(entry.content);
                        
                        const primarySphereId = entry.spheres?.[0];
                        const sphereConfig = SPHERES.find(s => s.id === primarySphereId);
                        const nodeColorClass = sphereConfig 
                            ? sphereConfig.text.replace('text-', 'border-') 
                            : 'border-slate-300 dark:border-slate-600';
                        const iconColorClass = 'text-violet-500';

                        return (
                            <div key={entry.id} className="relative pl-20 md:pl-28 group">
                                {/* Time Label */}
                                <div className="absolute left-0 top-[2.25rem] w-[2.5rem] md:w-[3.5rem] text-right pr-2 select-none">
                                    <span className="font-mono text-[9px] text-slate-300 dark:text-slate-600 font-bold tracking-tighter block leading-none">
                                        {formatTimelineDate(entry.date).split(' ')[0]}
                                    </span>
                                    <span className="font-mono text-slate-300 dark:text-slate-600 font-bold tracking-tighter block leading-none text-[8px] uppercase">
                                        {formatTimelineDate(entry.date).split(' ')[1]}
                                    </span>
                                </div>

                                {/* Node Marker */}
                                <div className="absolute left-[3rem] md:left-[4rem] top-[2.25rem] -translate-x-1/2 -translate-y-1/2 z-10 bg-[#f8fafc] dark:bg-[#0f172a] p-1.5 transition-colors duration-300">
                                    {entry.isInsight ? (
                                        <Gem size={10} strokeWidth={2} className={iconColorClass} />
                                    ) : (
                                        <div className={`w-1.5 h-1.5 rounded-full bg-transparent border-[1.5px] ${nodeColorClass}`} />
                                    )}
                                </div>

                                {/* Entry Card */}
                                <div 
                                    onClick={() => setSelectedEntryId(entry.id)} 
                                    className={`relative rounded-2xl border transition-all duration-300 group cursor-pointer overflow-hidden
                                        ${entry.isInsight 
                                            ? 'bg-gradient-to-br from-violet-50/80 via-fuchsia-50/50 to-white dark:from-violet-900/20 dark:via-fuchsia-900/10 dark:to-[#1e293b] border-violet-200/50 dark:border-violet-800/30 shadow-sm' 
                                            : `${getJournalColorClass(entry.color)} border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md`
                                        }
                                    `}
                                >
                                {entry.coverUrl && (
                                    <div className="h-32 w-full relative overflow-hidden">
                                        <img src={entry.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="p-6 md:p-8">
                                {/* CARD HEADER - ALIGNED */}
                                <div className="flex justify-between items-center mb-4">
                                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 tracking-widest uppercase flex items-center gap-2">
                                        <span>{formatDate(entry.date)}</span>
                                    </div>

                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        {!isEditing && (
                                            <>
                                                <button 
                                                    onClick={() => toggleInsight(entry)} 
                                                    className={`p-1.5 rounded-lg transition-all ${
                                                        entry.isInsight 
                                                        ? "text-violet-600 dark:text-violet-300 bg-gradient-to-tr from-violet-100 via-fuchsia-50 to-cyan-50 dark:from-violet-900/30 dark:via-fuchsia-900/20 dark:to-cyan-900/20 shadow-[0_0_12px_rgba(139,92,246,0.3)]" 
                                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    }`}
                                                >
                                                    <Gem 
                                                        size={16} 
                                                        strokeWidth={1.5} 
                                                        className={entry.isInsight ? "fill-violet-200/50" : "fill-transparent"} 
                                                    />
                                                </button>
                                                <button onClick={() => { if(confirm('Удалить запись?')) deleteEntry(entry.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {entry.title && (
                                    <h3 className="font-sans text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{entry.title}</h3>
                                )}

                                <div className="font-serif text-[#2F3437] dark:text-slate-300 leading-relaxed text-base">
                                    <ReactMarkdown 
                                        components={markdownComponents} 
                                        urlTransform={allowDataUrls} 
                                        remarkPlugins={[remarkGfm]} 
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {entry.content.replace(/\n/g, '  \n')}
                                    </ReactMarkdown>
                                </div>
                                {linkUrl && <LinkPreview url={linkUrl} />}

                                {/* Context Link */}
                                {linkedTask && !isEditing && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(linkedTask.id); }}
                                            className="font-mono text-[10px] text-[#6B6E70] dark:text-slate-500 hover:text-indigo-500 transition-colors flex items-center gap-2 group/ctx w-full"
                                        >
                                            <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                                                [ CONTEXT: <span className="truncate max-w-[200px] inline-block align-bottom">{linkedTask.content}</span> ]
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {entry.aiFeedback && (
                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-3 relative mt-3 border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`p-0.5 rounded ${mentor?.color || 'text-slate-500'}`}><RenderIcon name={mentor?.icon || 'User'} className="w-3 h-3" /></div>
                                        <span className={`text-[10px] font-bold uppercase ${mentor?.color || 'text-slate-500'}`}>{mentor?.name || 'Ментор'}</span>
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed pl-1 font-serif"><ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown></div>
                                    </div>
                                )}
                                </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Journal;
