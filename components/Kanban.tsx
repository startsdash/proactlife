import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { generateTaskChallenge, getKanbanTherapy } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Tooltip } from './Tooltip';
import { 
  Plus, MoreHorizontal, Calendar, Zap, MessageCircle, ArrowRight, 
  Trash2, Archive, RotateCcw, CheckCircle2, Circle, Clock, AlertCircle, 
  X, Loader2, Sparkles, Layout, Palette, Eraser, Search, Shuffle, RefreshCw, Upload, Image as ImageIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  archiveTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  onReflectInJournal: (taskId: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
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

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

// Helper for Image processing
const processImage = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                } else reject(new Error('Canvas failed'));
            };
        };
        reader.onerror = reject;
    });
};

const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void, triggerRef?: React.RefObject<HTMLButtonElement> }> = ({ onSelect, onClose, triggerRef }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                if (triggerRef?.current && triggerRef.current.contains(event.target as Node)) return;
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, triggerRef]);

    const getUnsplashKey = () => {
        const keys = ['UNSPLASH_ACCESS_KEY', 'VITE_UNSPLASH_ACCESS_KEY', 'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 'REACT_APP_UNSPLASH_ACCESS_KEY'];
        for (const k of keys) {
            // @ts-ignore
            if (typeof process !== 'undefined' && process.env?.[k]) return process.env[k];
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env?.[k]) return import.meta.env[k];
        }
        return '';
    };

    const searchUnsplash = async (q?: string) => {
        const key = getUnsplashKey();
        if (!key) return;
        setLoading(true);
        try {
            const page = Math.floor(Math.random() * 10) + 1;
            const endpoint = q 
                ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&page=${page}&client_id=${key}`
                : `https://api.unsplash.com/photos/random?count=20&client_id=${key}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            const urls = q ? data.results.map((img: any) => img.urls.regular) : data.map((img: any) => img.urls.regular);
            setResults(urls);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { onSelect(await processImage(file)); onClose(); } catch (err) { console.error(err); }
        }
    };

    return (
        <div ref={ref} className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 w-72 flex flex-col gap-3">
            <div className="flex gap-2">
                <input type="text" placeholder="Поиск..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUnsplash(query)} className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none" />
                <button onClick={() => searchUnsplash(query)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg"><Search size={14} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light">
                {loading ? <div className="col-span-3 text-center py-4"><RefreshCw className="animate-spin mx-auto text-slate-400" size={16} /></div> : results.map((url, i) => (
                    <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-square rounded-md overflow-hidden bg-slate-100 hover:opacity-80 transition-opacity"><img src={url} className="w-full h-full object-cover" /></button>
                ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs cursor-pointer hover:bg-slate-100"><Upload size={12} /> Своя <input type="file" className="hidden" onChange={handleUpload} /></label>
                <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs hover:bg-slate-100"><Shuffle size={12} /> Случайные</button>
            </div>
        </div>
    );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, archiveTask, reorderTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
    // ... State ...
    const [columns] = useState(['todo', 'doing', 'done']);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creationTitle, setCreationTitle] = useState('');
    const [creationContent, setCreationContent] = useState('');
    const [creationColumn, setCreationColumn] = useState<'todo' | 'doing' | 'done'>('todo');
    const [creationCover, setCreationCover] = useState<string | null>(null);
    const [creationColor, setCreationColor] = useState('white');
    const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
    const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
    const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);

    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editCover, setEditCover] = useState<string | null>(null);
    const [editColor, setEditColor] = useState('white');
    const [showEditCoverPicker, setShowEditCoverPicker] = useState(false);
    const [showEditColorPicker, setShowEditColorPicker] = useState(false);
    const editPickerTriggerRef = useRef<HTMLButtonElement>(null);

    // ... Effects ...
    useEffect(() => {
        if (initialTaskId) {
            const t = tasks.find(x => x.id === initialTaskId);
            if (t) {
                setActiveTask(t);
                onClearInitialTask?.();
            }
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const handleCreateTask = () => {
        if (!creationContent.trim()) return;
        const newTask: Task = {
            id: Date.now().toString(),
            title: creationTitle.trim() ? applyTypography(creationTitle.trim()) : undefined,
            content: applyTypography(creationContent),
            column: creationColumn,
            createdAt: Date.now(),
            color: creationColor,
            coverUrl: creationCover || undefined,
            subtasks: []
        };
        addTask(newTask);
        setCreationTitle('');
        setCreationContent('');
        setCreationCover(null);
        setCreationColor('white');
        setCreateModalOpen(false);
    };

    const handleClearCreationStyle = (e: React.MouseEvent) => {
        e.preventDefault();
        setCreationCover(null);
        setCreationColor('white');
    };

    const handleSaveEdit = () => {
        if (activeTask) {
            updateTask({
                ...activeTask,
                title: editTitle.trim() ? applyTypography(editTitle.trim()) : undefined,
                content: applyTypography(editContent),
                coverUrl: editCover || undefined,
                color: editColor
            });
            setEditMode(false);
        }
    };

    const handleClearEditStyle = (e: React.MouseEvent) => {
        e.preventDefault();
        setEditCover(null);
        setEditColor('white');
    };

    const openTask = (task: Task) => {
        setActiveTask(task);
        setEditMode(false);
        setEditTitle(task.title || '');
        setEditContent(task.content);
        setEditCover(task.coverUrl || null);
        setEditColor(task.color || 'white');
    };

    // ... Drag and Drop ...
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('taskId', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, col: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (task && task.column !== col) {
            updateTask({ ...task, column: col as any });
        }
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    // ... AI Actions ...
    const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
    
    const handleGenerateChallenge = async () => {
        if (!activeTask) return;
        setIsGeneratingChallenge(true);
        try {
            const challenge = await generateTaskChallenge(activeTask.content, config);
            const history = activeTask.challengeHistory || [];
            if (activeTask.activeChallenge) history.push(activeTask.activeChallenge);
            
            updateTask({
                ...activeTask,
                activeChallenge: challenge,
                isChallengeCompleted: false,
                challengeHistory: history
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingChallenge(false);
        }
    };

    const completeChallenge = () => {
        if (activeTask && activeTask.activeChallenge) {
            updateTask({ ...activeTask, isChallengeCompleted: true });
        }
    };

    // ... Render ...
    return (
        <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Действуй</p>
                </div>
                <button onClick={() => setCreateModalOpen(true)} className="bg-slate-900 dark:bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"><Plus size={24} /></button>
            </header>

            {/* Board */}
            <div className="flex-1 flex gap-4 md:gap-6 overflow-x-auto pb-4 custom-scrollbar-light">
                {columns.map(col => {
                    const colTasks = tasks.filter(t => t.column === col && !t.isArchived);
                    return (
                        <div 
                            key={col} 
                            className="flex-1 min-w-[280px] max-w-sm flex flex-col bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-200/50 dark:border-slate-700/50"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col)}
                        >
                            <div className="flex justify-between items-center p-3 mb-2">
                                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-widest">{col === 'todo' ? 'Надо сделать' : col === 'doing' ? 'В процессе' : 'Готово'}</span>
                                <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{colTasks.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-1 space-y-3">
                                {colTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        draggable 
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onClick={() => openTask(task)}
                                        className={`bg-white dark:bg-[#1e293b] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden`}
                                    >
                                        {task.coverUrl && <div className="h-32 -mx-4 -mt-4 mb-3"><img src={task.coverUrl} className="w-full h-full object-cover" /></div>}
                                        {task.title && <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight">{task.title}</h4>}
                                        <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-3">{task.content}</div>
                                        <div className="flex justify-between items-center mt-auto">
                                            <div className="flex gap-2">
                                                {task.activeChallenge && (
                                                    <Tooltip content={task.isChallengeCompleted ? "Челлендж выполнен" : "Активный челлендж"}>
                                                        <div className={`p-1 rounded ${task.isChallengeCompleted ? 'text-emerald-500 bg-emerald-50' : 'text-amber-500 bg-amber-50'}`}><Zap size={14} /></div>
                                                    </Tooltip>
                                                )}
                                                {task.description && <div className="text-slate-400"><MessageCircle size={14} /></div>}
                                            </div>
                                            <div className="text-[10px] text-slate-400">{new Date(task.createdAt).toLocaleDateString(undefined, {day:'numeric', month:'short'})}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {createModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 overflow-y-auto">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Новая задача</h3>
                                {creationCover && (
                                    <div className="relative h-40 mb-4 rounded-xl overflow-hidden group">
                                        <img src={creationCover} className="w-full h-full object-cover" />
                                        <button onClick={() => setCreationCover(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                                    </div>
                                )}
                                <input className="w-full text-lg font-bold bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-2 text-slate-800 dark:text-slate-100" placeholder="Заголовок (необязательно)" value={creationTitle} onChange={e => setCreationTitle(e.target.value)} />
                                <textarea className="w-full h-32 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm text-slate-800 dark:text-slate-200 resize-none" placeholder="Описание задачи..." value={creationContent} onChange={e => setCreationContent(e.target.value)} />
                                
                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex gap-2">
                                        <Tooltip content="Очистить"><button onMouseDown={handleClearCreationStyle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={16} /></button></Tooltip>
                                        <div className="relative">
                                            <Tooltip content="Обложка">
                                                <button ref={creationPickerTriggerRef} onMouseDown={(e) => { e.preventDefault(); setShowCreationCoverPicker(!showCreationCoverPicker); }} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`}><Layout size={16} /></button>
                                            </Tooltip>
                                            {showCreationCoverPicker && <CoverPicker onSelect={setCreationCover} onClose={() => setShowCreationCoverPicker(false)} triggerRef={creationPickerTriggerRef} />}
                                        </div>
                                        <div className="relative">
                                            <Tooltip content="Фон">
                                                <button onMouseDown={(e) => { e.preventDefault(); setShowCreationColorPicker(!showCreationColorPicker); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Palette size={16} /></button>
                                            </Tooltip>
                                            {showCreationColorPicker && (
                                                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-1 z-50">
                                                    {colors.map(c => <button key={c.id} onMouseDown={(e) => { e.preventDefault(); setCreationColor(c.id); setShowCreationColorPicker(false); }} className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 ${creationColor === c.id ? 'ring-2 ring-indigo-400' : ''}`} style={{ backgroundColor: c.hex }} title={c.id} />)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Отмена</button>
                                        <button onClick={handleCreateTask} disabled={!creationContent.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Создать</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Task Detail Modal */}
            <AnimatePresence>
                {activeTask && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${colors.find(c => c.id === (editMode ? editColor : activeTask.color))?.class || 'bg-white dark:bg-[#1e293b]'}`}
                        >
                            <div className="p-6 overflow-y-auto custom-scrollbar-light flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        {editMode ? (
                                            <input className="w-full text-xl font-bold bg-transparent border-none outline-none mb-2" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Заголовок" />
                                        ) : (
                                            activeTask.title && <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeTask.title}</h2>
                                        )}
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        {!editMode && (
                                            <>
                                                <Tooltip content="Редактировать"><button onClick={() => setEditMode(true)} className="p-2 text-slate-400 hover:text-indigo-500"><Palette size={18} /></button></Tooltip>
                                                <Tooltip content="В архив"><button onClick={() => { archiveTask(activeTask.id); setActiveTask(null); }} className="p-2 text-slate-400 hover:text-emerald-500"><Archive size={18} /></button></Tooltip>
                                                <Tooltip content="Удалить"><button onClick={() => { if(confirm('Delete?')) { deleteTask(activeTask.id); setActiveTask(null); } }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button></Tooltip>
                                            </>
                                        )}
                                        <button onClick={() => setActiveTask(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
                                    </div>
                                </div>

                                {((editMode && editCover) || (!editMode && activeTask.coverUrl)) && (
                                    <div className="relative h-48 mb-4 rounded-xl overflow-hidden">
                                        <img src={editMode ? editCover! : activeTask.coverUrl!} className="w-full h-full object-cover" />
                                        {editMode && <button onClick={() => setEditCover(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><X size={16}/></button>}
                                    </div>
                                )}

                                {editMode ? (
                                    <div className="space-y-4">
                                        <textarea className="w-full h-48 bg-white/50 dark:bg-black/20 p-4 rounded-xl border-none outline-none resize-none" value={editContent} onChange={e => setEditContent(e.target.value)} />
                                        <div className="flex gap-2 items-center">
                                            <Tooltip content="Очистить"><button onMouseDown={handleClearEditStyle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Eraser size={16} /></button></Tooltip>
                                            <div className="relative">
                                                <Tooltip content="Обложка">
                                                    <button ref={editPickerTriggerRef} onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg ${editCover ? 'text-indigo-500' : ''}`}><Layout size={16} /></button>
                                                </Tooltip>
                                                {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} triggerRef={editPickerTriggerRef} />}
                                            </div>
                                            <div className="relative">
                                                <Tooltip content="Фон">
                                                    <button onMouseDown={(e) => { e.preventDefault(); setShowEditColorPicker(!showEditColorPicker); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Palette size={16} /></button>
                                                </Tooltip>
                                                {showEditColorPicker && (
                                                    <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl flex gap-1 z-50">
                                                        {colors.map(c => <button key={c.id} onMouseDown={(e) => { e.preventDefault(); setEditColor(c.id); setShowEditColorPicker(false); }} className={`w-5 h-5 rounded-full border border-slate-300 ${editColor === c.id ? 'ring-2 ring-indigo-400' : ''}`} style={{ backgroundColor: c.hex }} />)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditMode(false)} className="px-4 py-2 text-slate-500">Отмена</button>
                                            <button onClick={handleSaveEdit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Сохранить</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose dark:prose-invert max-w-none mb-6">
                                        <ReactMarkdown>{activeTask.content}</ReactMarkdown>
                                    </div>
                                )}

                                {!editMode && (
                                    <div className="space-y-4">
                                        {/* AI Challenge Section */}
                                        <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold uppercase text-indigo-500 flex items-center gap-2"><Zap size={14} /> Челлендж</h4>
                                                {!activeTask.isChallengeCompleted && activeTask.activeChallenge && <button onClick={completeChallenge} className="text-xs text-emerald-500 hover:underline flex items-center gap-1"><CheckCircle2 size={12} /> Завершить</button>}
                                            </div>
                                            {activeTask.activeChallenge ? (
                                                <div className={`text-sm ${activeTask.isChallengeCompleted ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-70' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    <ReactMarkdown>{activeTask.activeChallenge}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <button onClick={handleGenerateChallenge} disabled={isGeneratingChallenge} className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                                                    {isGeneratingChallenge ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Сгенерировать челлендж
                                                </button>
                                            )}
                                        </div>

                                        {activeTask.description && (
                                            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl">
                                                <div className="text-xs font-bold uppercase text-slate-400 mb-1">Контекст</div>
                                                <div className="text-sm text-slate-600 dark:text-slate-400 italic line-clamp-3">{activeTask.description}</div>
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                            <button onClick={() => { onReflectInJournal(activeTask.id); setActiveTask(null); }} className="text-sm font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-2">
                                                <MessageCircle size={16} /> Рефлексия в дневнике <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Kanban;