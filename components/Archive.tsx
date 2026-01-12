
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { Task, Note, JournalEntry } from '../types';
import { RotateCcw, Trash2, Calendar, CheckCircle2, FileText, X, Zap, Circle, Archive as ArchiveIcon, CakeSlice, StickyNote, Book, Link, ListTodo, History, MessageCircle, Bot, Plus, Minus, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';

interface Props {
  tasks: Task[];
  notes: Note[];
  journal: JournalEntry[];
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  deleteNote: (id: string) => void;
  deleteJournalEntry: (id: string) => void;
  restoreJournalEntry: (id: string) => void;
}

// --- UTILS & STYLES ---

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';
const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';
const getTaskColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const NOISE_PATTERN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

const breakpointColumnsObj = {
  default: 3,
  1100: 2,
  700: 1
};

const allowDataUrls = (url: string) => url;

const extractImages = (content: string): string[] => {
    const matches = content.matchAll(/!\[.*?\]\((.*?)\)/g);
    return Array.from(matches, m => m[1]);
};

const getPreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    const sentences = cleanText.match(/[^\.!\?]+[\.!\?]+(?=\s|$)/g) || [cleanText];
    let limit = 0;
    let sentenceCount = 0;
    for (let s of sentences) {
        if (sentenceCount >= 3) break;
        if (limit + s.length > 300 && sentenceCount >= 1) break;
        limit += s.length;
        sentenceCount++;
    }
    let preview = sentences.slice(0, sentenceCount).join(' ');
    if (preview.length === 0 && cleanText.length > 0) preview = cleanText;
    if (preview.length > 300) {
        preview = preview.slice(0, 300);
        const lastSpace = preview.lastIndexOf(' ');
        if (lastSpace > 0) preview = preview.slice(0, lastSpace);
    }
    if (preview.length < cleanText.length) preview = preview.replace(/[\.!\?,\s]+$/, '') + '...';
    return preview;
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

// --- LOCAL HELPERS FOR DETAIL VIEW ---

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCard?: boolean;
}> = ({ title, children, icon, isCard = false }) => {
  const [isOpen, setIsOpen] = useState(true); // Default open in read-only

  return (
    <div className={`${isCard ? 'bg-slate-50/50 dark:bg-slate-800/30 mb-2' : 'bg-transparent mb-4'} rounded-xl ${isCard ? 'border border-slate-100 dark:border-slate-700/50' : ''} overflow-hidden`}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between ${isCard ? 'p-2' : 'p-0 pb-2'} cursor-pointer ${isCard ? 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30' : ''} transition-colors group/header`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className="text-slate-500 dark:text-slate-400 group-hover/header:text-indigo-500 transition-colors">
            {isOpen ? <Minus size={12} /> : <Plus size={12} />}
        </div>
      </div>
      {isOpen && (
        <div className={`${isCard ? 'px-2 pb-2' : 'px-0 pb-2'} pt-0 animate-in slide-in-from-top-1 duration-200`}>
           <div className={`pt-2 ${isCard ? 'border-t border-slate-200/30 dark:border-slate-700/30' : ''} text-sm`}>
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const StaticChallengeRenderer: React.FC<{ 
    content: string,
    mode: 'draft' | 'history'
}> = ({ content, mode }) => {
    const cleanContent = content.trim().replace(/^#+\s*[^\n]*(\n+|$)/, '').trim();
    const lines = cleanContent.split('\n');
    const renderedParts: React.ReactNode[] = [];
    let textBuffer = '';

    const flushBuffer = (keyPrefix: string) => {
        if (textBuffer) {
             const trimmedBuffer = textBuffer.trim();
             if (trimmedBuffer) {
                renderedParts.push(
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-[#2F3437] dark:text-slate-300 font-sans mb-1 last:mb-0">
                        <ReactMarkdown components={markdownComponents}>{applyTypography(textBuffer)}</ReactMarkdown>
                    </div>
                );
             }
            textBuffer = '';
        }
    };

    lines.forEach((line, i) => {
        const match = line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
        if (match) {
            flushBuffer(`line-${i}`);
            const isChecked = match[1].toLowerCase() === 'x';
            const label = match[2];
            const leadingSpaces = line.search(/\S|$/);
            const indent = leadingSpaces * 4; 

            let Icon = Circle;
            let iconClass = "text-slate-300 dark:text-slate-600";
            
            if (isChecked) {
                Icon = CheckCircle2;
                iconClass = "text-emerald-500";
            } else if (mode === 'history') {
                Icon = XCircle;
                iconClass = "text-red-400";
            } else {
                Icon = Circle;
                iconClass = "text-slate-300 dark:text-slate-600";
            }

            renderedParts.push(
                <div 
                    key={`cb-${i}`}
                    className="flex items-start gap-2 w-full text-left py-1 px-1 mb-0.5 cursor-default"
                    style={{ marginLeft: `${indent}px` }}
                >
                    <div className={`mt-0.5 shrink-0 ${iconClass}`}>
                        <Icon size={16} />
                    </div>
                    <span className={`text-sm text-[#2F3437] dark:text-slate-300 font-sans`}>
                        <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{applyTypography(label)}</ReactMarkdown>
                    </span>
                </div>
            );
        } else {
            textBuffer += line + '\n';
        }
    });
    flushBuffer('end');
    return <>{renderedParts}</>;
};

// --- MAIN COMPONENT ---

type SelectedItem = 
  | { type: 'task', data: Task }
  | { type: 'note', data: Note }
  | { type: 'journal', data: JournalEntry };

const Archive: React.FC<Props> = ({ tasks, notes, journal, restoreTask, deleteTask, moveNoteToInbox, deleteNote, deleteJournalEntry, restoreJournalEntry }) => {
  const [activeTab, setActiveTab] = useState<'hall_of_fame' | 'notes' | 'journal'>('hall_of_fame');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  // --- DATA FILTERING ---
  const archivedTasks = tasks
    .filter(t => t.isArchived)
    .sort((a, b) => b.createdAt - a.createdAt);

  const archivedNotes = notes
    .filter(n => n.status === 'trash')
    .sort((a, b) => b.createdAt - a.createdAt);

  const archivedJournal = journal
    .filter(j => j.isArchived)
    .sort((a, b) => b.date - a.date);

  const renderHallOfFame = () => (
    <>
      {archivedTasks.length === 0 ? (
          <div className="py-10">
              <EmptyState 
                  icon={ArchiveIcon} 
                  title="Все впереди!" 
                  description="Заверши первую миссию, чтобы начать историю побед" 
                  color="amber"
              />
          </div>
      ) : (
          <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
            {archivedTasks.map(task => {
                const sphere = task.spheres?.[0];
                const sphereColor = sphere && sphere === 'productivity' ? '#6366f1' : sphere === 'growth' ? '#10b981' : sphere === 'relationships' ? '#f43f5e' : '#6366f1';
                
                return (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedItem({ type: 'task', data: task })}
                    className={`${getTaskColorClass(task.color)} backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative group overflow-hidden mb-6 cursor-pointer hover:shadow-md transition-all`}
                  >
                    {task.coverUrl && (
                        <div className="h-32 w-full shrink-0 relative overflow-hidden"><img src={task.coverUrl} alt="Cover" className="w-full h-full object-cover" /></div>
                    )}

                    <div className="p-5 pb-16 flex flex-col gap-0 h-full">
                        <div className="flex justify-between items-start gap-2 mb-2">
                             <div className="flex-1 pt-0.5 min-w-0">
                                {task.title && (
                                    <h4 className="font-sans text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug break-words tracking-tight">
                                        {applyTypography(task.title)}
                                    </h4>
                                )}
                             </div>
                             <div className="shrink-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                </span>
                             </div>
                        </div>

                        <div className="mb-3">
                            <div className="text-slate-700 dark:text-slate-400 font-sans text-sm leading-relaxed line-clamp-4">
                                 <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                            </div>
                        </div>
                    </div>

                    {/* Footer: Ghost Style - Hover Only */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end">
                        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                            <Tooltip content="Вернуть в спринты">
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("Вернуть в спринты?")) restoreTask(task.id);
                                    }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"
                                >
                                    <RotateCcw size={16} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <Tooltip content="Удалить навсегда">
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("Удалить задачу из истории навсегда?")) deleteTask(task.id);
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-60 hover:opacity-100"
                                >
                                    <Trash2 size={16} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                        </div>
                        
                        <div className="p-2 font-mono text-[8px] text-slate-900 dark:text-white select-none opacity-30 tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sphereColor }} />
                            {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                  </div>
                )
            })}
          </Masonry>
      )}
    </>
  );

  const renderNotes = () => (
    <>
      {archivedNotes.length === 0 ? (
          <div className="py-10">
              <EmptyState 
                  icon={StickyNote} 
                  title="Корзина пуста" 
                  description="Здесь будут удаленные заметки" 
                  color="indigo"
              />
          </div>
      ) : (
          <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
            {archivedNotes.map(note => {
                const previewText = getPreviewContent(note.content);
                const contentImages = extractImages(note.content);
                const imagesToShow = contentImages.filter(img => img !== note.coverUrl).slice(0, 1);

                return (
                  <div 
                    key={note.id} 
                    onClick={() => setSelectedItem({ type: 'note', data: note })}
                    className={`${getNoteColorClass(note.color)} rounded-3xl transition-all relative group overflow-hidden mb-6 flex flex-col shadow-sm border border-slate-200/50 dark:border-slate-800 cursor-pointer hover:shadow-md`}
                  >
                    <div style={{ backgroundImage: NOISE_PATTERN }} className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>

                    {note.coverUrl && (
                        <div className="h-40 w-full shrink-0 relative z-10"><img src={note.coverUrl} alt="Cover" className="w-full h-full object-cover" /></div>
                    )}
                    
                    <div className="p-8 pb-16 relative z-10 flex-1">
                        <div className="block w-full mb-2">
                            {note.title && <h3 className={`font-sans text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-tight break-words`}>{applyTypography(note.title)}</h3>}
                            <div className={`text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed overflow-hidden break-words relative max-h-[300px]`}>
                                <ReactMarkdown 
                                    components={markdownComponents} 
                                    urlTransform={allowDataUrls} 
                                    remarkPlugins={[remarkGfm]} 
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {previewText}
                                </ReactMarkdown>
                            </div>
                            
                            {imagesToShow.length > 0 && (
                                <div className="mt-3 rounded-xl overflow-hidden relative h-32 w-full">
                                    <img src={imagesToShow[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                                </div>
                            )}

                            {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {note.tags.map(tag => (
                                        <span key={tag} className="text-[9px] text-slate-500/80 dark:text-slate-400/80 font-sans uppercase tracking-[0.15em]">
                                            #{tag.replace(/^#/, '')}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer: Ghost Style - Hover Only */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end">
                        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                            <Tooltip content="Восстановить">
                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Восстановить заметку?")) moveNoteToInbox(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><RotateCcw size={16} strokeWidth={1.5} /></button>
                            </Tooltip>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <Tooltip content="Удалить навсегда">
                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Удалить навсегда?')) deleteNote(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Trash2 size={16} strokeWidth={1.5} /></button>
                            </Tooltip>
                        </div>
                        
                        <div className="p-2 font-mono text-[8px] text-slate-900 dark:text-white select-none opacity-30 tracking-widest">
                            {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                  </div>
                );
            })}
          </Masonry>
      )}
    </>
  );

  const renderJournal = () => (
    <>
      {archivedJournal.length === 0 ? (
          <div className="py-10">
              <EmptyState 
                  icon={Book} 
                  title="Корзина пуста" 
                  description="Здесь будут удаленные записи из дневника" 
                  color="cyan"
              />
          </div>
      ) : (
          <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
            {archivedJournal.map(entry => {
                const previewText = getPreviewContent(entry.content);
                const hasTask = !!entry.linkedTaskId;
                
                const sphere = entry.spheres?.[0];
                const sphereColor = sphere && sphere === 'productivity' ? '#6366f1' : sphere === 'growth' ? '#10b981' : sphere === 'relationships' ? '#f43f5e' : null;

                return (
                  <div 
                    key={entry.id} 
                    onClick={() => setSelectedItem({ type: 'journal', data: entry })}
                    className={`${getJournalColorClass(entry.color)} rounded-3xl transition-all relative group overflow-hidden mb-6 flex flex-col shadow-sm border border-slate-200/50 dark:border-slate-800 cursor-pointer hover:shadow-md`}
                  >
                    <div style={{ backgroundImage: NOISE_PATTERN }} className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>

                    {entry.coverUrl && (
                        <div className="h-40 w-full shrink-0 relative z-10"><img src={entry.coverUrl} alt="Cover" className="w-full h-full object-cover" /></div>
                    )}
                    
                    <div className="p-8 pb-16 relative z-10 flex-1">
                        <div className="block w-full mb-2">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString()}</span>
                                {entry.isInsight && <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider flex items-center gap-1"><Zap size={10} className="fill-current"/> Insight</span>}
                            </div>

                            {entry.title && <h3 className={`font-sans text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-tight break-words`}>{applyTypography(entry.title)}</h3>}
                            <div className={`text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed overflow-hidden break-words relative max-h-[300px]`}>
                                <ReactMarkdown 
                                    components={markdownComponents} 
                                    urlTransform={allowDataUrls} 
                                    remarkPlugins={[remarkGfm]} 
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {previewText}
                                </ReactMarkdown>
                            </div>

                            {hasTask && (
                                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                    <Link size={10} />
                                    <span>Связано с задачей</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer: Ghost Style - Hover Only */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end">
                        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                            <Tooltip content="Вернуть в дневник">
                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Вернуть в дневник?")) restoreJournalEntry(entry.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><RotateCcw size={16} strokeWidth={1.5} /></button>
                            </Tooltip>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <Tooltip content="Удалить навсегда">
                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Удалить навсегда?')) deleteJournalEntry(entry.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Trash2 size={16} strokeWidth={1.5} /></button>
                            </Tooltip>
                        </div>
                        
                        <div className="p-2 font-mono text-[8px] text-slate-900 dark:text-white select-none opacity-30 tracking-widest flex items-center gap-2">
                            {sphereColor && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sphereColor }} />}
                            {new Date(entry.date).toLocaleDateString()}
                        </div>
                    </div>
                  </div>
                );
            })}
          </Masonry>
      )}
    </>
  );

  return (
    <div className="h-full p-4 md:p-8 flex flex-col overflow-hidden relative bg-[#f8fafc] dark:bg-[#0f172a]">
      <header className="mb-6 shrink-0">
        <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">
            Архив
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Хранилище опыта и достижений</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none shrink-0">
        <button 
            onClick={() => setActiveTab('hall_of_fame')} 
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'hall_of_fame' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50 border border-transparent'}`}
        >
            <CakeSlice size={16} /> Зал славы
        </button>
        <button 
            onClick={() => setActiveTab('notes')} 
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'notes' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50 border border-transparent'}`}
        >
            <Trash2 size={16} /> Корзина (Заметки)
        </button>
        <button 
            onClick={() => setActiveTab('journal')} 
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'journal' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50 border border-transparent'}`}
        >
            <Book size={16} /> Дневник
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar-light">
        <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {activeTab === 'hall_of_fame' && renderHallOfFame()}
            {activeTab === 'notes' && renderNotes()}
            {activeTab === 'journal' && renderJournal()}
        </motion.div>
      </div>

      {/* DETAIL MODAL (Read-Only) */}
      <AnimatePresence>
        {selectedItem && (
            <div className="fixed inset-0 z-[150] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={`
                        w-full max-w-lg backdrop-blur-[40px] saturate-150 border border-black/5 dark:border-white/10 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col max-h-[90vh] relative overflow-hidden
                        ${selectedItem.type === 'note' ? getNoteColorClass(selectedItem.data.color) : selectedItem.type === 'task' ? getTaskColorClass(selectedItem.data.color) : getJournalColorClass(selectedItem.data.color)}
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Image */}
                    {selectedItem.data.coverUrl && (
                        <div className="h-40 shrink-0 relative mb-6 -mx-8 -mt-8 md:-mx-10 md:-mt-10 w-[calc(100%_+_4rem)] md:w-[calc(100%_+_5rem)] group overflow-hidden">
                            <img src={selectedItem.data.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Metadata Header */}
                    <div className="flex justify-between items-start mb-6 shrink-0">
                        <div className="flex flex-col gap-1 pr-4 w-full">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 font-mono">
                                {selectedItem.type === 'journal' ? new Date((selectedItem.data as JournalEntry).date).toLocaleDateString() : new Date((selectedItem.data as any).createdAt).toLocaleDateString()}
                                <span className="opacity-50 mx-1">/</span> ID: {selectedItem.data.id.slice(-4)}
                            </div>
                            <h3 className="text-2xl font-sans font-semibold text-slate-900 dark:text-white leading-tight break-words">
                                {selectedItem.data.title || (selectedItem.type === 'journal' ? 'Без названия' : 'Заметка')}
                            </h3>
                        </div>
                        <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><X size={20}/></button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar-ghost min-h-0 pr-1 -mr-2">
                        {/* TASK SPECIFIC UI */}
                        {selectedItem.type === 'task' && (() => {
                            const task = selectedItem.data as Task;
                            const subtasksTotal = task.subtasks?.length || 0;
                            const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
                            
                            return (
                                <div className="space-y-6">
                                    {task.spheres && task.spheres.length > 0 && (
                                        <div className="flex gap-2">
                                            {task.spheres.map(sid => {
                                                const s = SPHERES.find(x => x.id === sid);
                                                if (!s) return null;
                                                return (
                                                    <div key={sid} className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
                                                        {s.label}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {task.description && (
                                        <CollapsibleSection title="Контекст" icon={<FileText size={12}/>}>
                                            <div className="text-xs text-[#6B6E70] dark:text-slate-400 leading-relaxed font-sans">
                                                <ReactMarkdown components={markdownComponents}>{applyTypography(task.description)}</ReactMarkdown>
                                            </div>
                                        </CollapsibleSection>
                                    )}
                                    
                                    <div className="text-slate-700 dark:text-slate-300 text-sm font-normal leading-relaxed font-sans">
                                        <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                                    </div>

                                    {task.subtasks && task.subtasks.length > 0 && (
                                        <CollapsibleSection title={`Чек-лист (${subtasksDone}/${subtasksTotal})`} icon={<ListTodo size={14}/>}>
                                            <div className="space-y-1">
                                                {task.subtasks.map(s => (
                                                    <div key={s.id} className="flex items-start gap-3 p-2 rounded-lg opacity-70">
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${s.isCompleted ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                            {s.isCompleted && <CheckCircle2 size={10} className="text-white" />}
                                                        </div>
                                                        <span className={`text-sm flex-1 leading-relaxed ${s.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>{s.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    )}

                                    {task.activeChallenge && (
                                        <CollapsibleSection title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} icon={<Zap size={14}/>}>
                                            <div className="text-slate-700 dark:text-slate-300 font-sans text-sm leading-relaxed">
                                                <StaticChallengeRenderer content={task.activeChallenge} mode={task.isChallengeCompleted ? 'history' : 'draft'} />
                                            </div>
                                        </CollapsibleSection>
                                    )}

                                    {((task.challengeHistory && task.challengeHistory.length > 0) || (task.consultationHistory && task.consultationHistory.length > 0)) && (
                                        <CollapsibleSection title="История" icon={<History size={14}/>}>
                                            <div className="space-y-4">
                                                {task.challengeHistory?.map((h, i) => (<div key={`ch-${i}`} className="text-sm bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50"><div className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Zap size={10}/> Архивный челлендж</div><StaticChallengeRenderer content={h} mode="history" /></div>))}
                                                {task.consultationHistory?.map((h, i) => (<div key={`cons-${i}`} className="text-sm bg-violet-50/30 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100/50 dark:border-violet-800/30"><div className="text-[9px] font-bold text-violet-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Bot size={10}/> Консультация</div><ReactMarkdown components={markdownComponents}>{applyTypography(h)}</ReactMarkdown></div>))}
                                            </div>
                                        </CollapsibleSection>
                                    )}
                                </div>
                            );
                        })()}

                        {/* NOTE SPECIFIC UI */}
                        {selectedItem.type === 'note' && (() => {
                            const note = selectedItem.data as Note;
                            return (
                                <div className="space-y-4">
                                    <div className="text-slate-800 dark:text-slate-200 text-base leading-relaxed font-serif font-normal min-h-[4rem]">
                                        <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                            {note.content.replace(/\n/g, '  \n')}
                                        </ReactMarkdown>
                                    </div>
                                    {note.tags && note.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                                            {note.tags.map(tag => <span key={tag} className="text-[9px] text-slate-500/80 dark:text-slate-400/80 font-sans uppercase tracking-[0.15em]">#{tag.replace(/^#/, '')}</span>)}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* JOURNAL SPECIFIC UI */}
                        {selectedItem.type === 'journal' && (() => {
                            const entry = selectedItem.data as JournalEntry;
                            return (
                                <div className="space-y-6">
                                    <div className="font-serif text-[#2F3437] dark:text-slate-200 leading-[1.8] text-base">
                                        <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                            {entry.content.replace(/\n/g, '  \n')}
                                        </ReactMarkdown>
                                    </div>
                                    
                                    {entry.spheres && entry.spheres.length > 0 && (
                                        <div className="flex gap-2 pt-2">
                                            {entry.spheres.map(sid => {
                                                const s = SPHERES.find(x => x.id === sid);
                                                if (!s) return null;
                                                return (
                                                    <div key={sid} className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
                                                        {s.label}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {entry.aiFeedback && (
                                        <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5">
                                             <div className="flex items-center gap-2 mb-3">
                                                <Bot size={12} className="text-indigo-400" />
                                                <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">Ментор</span>
                                             </div>
                                             <div className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed font-serif">
                                                <ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown>
                                             </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Archive;
