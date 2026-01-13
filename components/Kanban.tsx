import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { applyTypography } from '../constants';
import { 
  Plus, MoreHorizontal, Calendar, Zap, CheckCircle2, Circle, 
  RotateCcw, Trash2, Edit3, X, Layout, Palette, Image as ImageIcon, 
  Bold, Italic, Eraser, RotateCw, Play, Search, Upload, Shuffle, ArrowRight, RefreshCw,
  MessageCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
  addTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  archiveTask: (id: string) => void;
  onReflectInJournal: (taskId: string) => void;
  initialTaskId: string | null;
  onClearInitialTask: () => void;
}

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getTaskColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const processImage = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image'));
            return;
        }
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
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                } else {
                    reject(new Error('Canvas context failed'));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// Cover Picker
const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void, triggerRef: React.RefObject<HTMLElement> }> = ({ onSelect, onClose, triggerRef }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS);
    const [loading, setLoading] = useState(false);
    const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
    
    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportH = window.innerHeight;
            const viewportW = window.innerWidth;
            const pickerHeight = 320; 
            
            const style: React.CSSProperties = {};
            
            const spaceBelow = viewportH - rect.bottom;
            if (spaceBelow < pickerHeight && rect.top > spaceBelow) {
                style.bottom = viewportH - rect.top + 8;
                style.maxHeight = rect.top - 20;
            } else {
                style.top = rect.bottom + 8;
                style.maxHeight = spaceBelow - 20;
            }

            if (rect.left + 320 > viewportW) {
                style.right = 16;
            } else {
                style.left = rect.left;
            }
            
            setPickerStyle(style);
        }
    }, [triggerRef]);
    
    const searchUnsplash = async (q?: string) => {
        const key = process.env.REACT_APP_UNSPLASH_ACCESS_KEY || ''; // Simplified env access
        if (!key) {
            if (q) alert("Ключ Unsplash не найден.");
            return;
        }
        
        setLoading(true);
        try {
            const page = Math.floor(Math.random() * 10) + 1;
            const endpoint = q 
                ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&page=${page}&client_id=${key}`
                : `https://api.unsplash.com/photos/random?count=20&client_id=${key}`;
            
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            
            const urls = q 
                ? data.results.map((img: any) => img.urls.regular) 
                : data.map((img: any) => img.urls.regular);
            
            setResults(urls);
        } catch (e) {
            console.error("Unsplash Fetch Error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { onSelect(await processImage(file)); onClose(); } catch (err) { console.error(err); }
        }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3 portal-popup" 
                style={pickerStyle}
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUnsplash(query)}
                        className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                    />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button onClick={() => searchUnsplash(query)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"><ArrowRight size={12} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light min-h-[60px]">
                    {loading ? <RefreshCw size={16} className="animate-spin m-auto text-slate-400" /> : results.map((url, i) => (
                        <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded overflow-hidden bg-slate-100 hover:ring-2 hover:ring-indigo-500 relative">
                            <img src={url} className="w-full h-full object-cover" loading="lazy" alt="" />
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-xs font-medium cursor-pointer text-slate-600 dark:text-slate-300">
                        <Upload size={12} /> Своя 
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                    <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-xs font-medium text-slate-600 dark:text-slate-300">
                        <Shuffle size={12} /> Случайные
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

// Color Picker Popover
const ColorPickerPopover: React.FC<{
    onSelect: (colorId: string) => void,
    onClose: () => void,
    triggerRef: React.RefObject<HTMLElement>
}> = ({ onSelect, onClose, triggerRef }) => {
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                zIndex: 9999,
            });
        }
    }, [triggerRef]);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999] flex-wrap max-w-[240px]" style={style} onMouseDown={e => e.stopPropagation()}>
                {colors.map(c => (
                    <button key={c.id} onMouseDown={(e) => { e.preventDefault(); onSelect(c.id); onClose(); }} className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform`} style={{ backgroundColor: c.hex }} title={c.id} />
                ))}
            </div>
        </>,
        document.body
    );
};

const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    let md = temp.innerText; // Simplified for robustness in this context
    return applyTypography(md);
};

const markdownToHtml = (md: string) => {
    // Simplified markdown to html for contentEditable initial value
    // In a real app, use a proper parser or just text
    return md; 
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [columns] = useState([
    { id: 'todo', title: 'Очередь', icon: Circle, color: 'text-slate-400' },
    { id: 'doing', title: 'В процессе', icon: Play, color: 'text-indigo-500' },
    { id: 'done', title: 'Завершено', icon: CheckCircle2, color: 'text-emerald-500' }
  ]);

  const [newTaskContent, setNewTaskContent] = useState('');
  const [isEditingTask, setIsEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCover, setEditCover] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('white');
  
  // Editor Refs & State
  const editContentRef = useRef<HTMLDivElement>(null);
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const lastSelectionRange = useRef<Range | null>(null);
  const editPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const editColorTriggerRef = useRef<HTMLButtonElement>(null);
  const [showEditCoverPicker, setShowEditCoverPicker] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);
  
  // AI State
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [isTherapyLoading, setIsTherapyLoading] = useState(false);

  useEffect(() => {
      if (initialTaskId) {
          const t = tasks.find(x => x.id === initialTaskId);
          if (t) openEdit(t);
          onClearInitialTask();
      }
  }, [initialTaskId, tasks, onClearInitialTask]);

  useEffect(() => {
      if (isEditingTask && editContentRef.current) {
          editContentRef.current.innerHTML = markdownToHtml(isEditingTask.content);
          setEditTitle(isEditingTask.title || '');
          setEditCover(isEditingTask.coverUrl || null);
          setEditColor(isEditingTask.color || 'white');
          setEditHistory([editContentRef.current.innerHTML]);
      }
  }, [isEditingTask]);

  const handleAddNew = () => {
      if (!newTaskContent.trim()) return;
      addTask({
          id: Date.now().toString(),
          content: newTaskContent,
          column: 'todo',
          createdAt: Date.now(),
          color: 'white'
      });
      setNewTaskContent('');
  };

  const openEdit = (task: Task) => {
      setIsEditingTask(task);
  };

  const closeEdit = () => {
      setIsEditingTask(null);
      setEditTitle('');
      setEditCover(null);
      setEditColor('white');
  };

  const saveEdit = () => {
      if (isEditingTask && editContentRef.current) {
          const content = editContentRef.current.innerText; // Simplified
          updateTask({
              ...isEditingTask,
              title: editTitle,
              content: content,
              coverUrl: editCover || undefined,
              color: editColor
          });
          closeEdit();
      }
  };

  // --- EDITOR HANDLERS ---
  const execEditCmd = (cmd: string, val?: string) => {
      document.execCommand(cmd, false, val);
      if (editContentRef.current) saveEditHistorySnapshot(editContentRef.current.innerHTML);
  };

  const saveEditHistorySnapshot = (content: string) => {
      const newHist = editHistory.slice(0, editHistoryIndex + 1);
      newHist.push(content);
      setEditHistory(newHist);
      setEditHistoryIndex(newHist.length - 1);
  };

  const execEditUndo = () => {
      if (editHistoryIndex > 0) {
          setEditHistoryIndex(prev => prev - 1);
          if(editContentRef.current) editContentRef.current.innerHTML = editHistory[editHistoryIndex - 1];
      }
  };

  const execEditRedo = () => {
      if (editHistoryIndex < editHistory.length - 1) {
          setEditHistoryIndex(prev => prev + 1);
          if(editContentRef.current) editContentRef.current.innerHTML = editHistory[editHistoryIndex + 1];
      }
  };

  const handleClearEditStyle = () => {
      execEditCmd('removeFormat');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editContentRef.current) {
          const base64 = await processImage(file);
          // Insert logic (simplified)
          const img = document.createElement('img');
          img.src = base64;
          img.style.maxWidth = '100%';
          editContentRef.current.appendChild(img);
          saveEditHistorySnapshot(editContentRef.current.innerHTML);
      }
  };

  const deleteActiveImage = () => {
      if (activeImage) {
          activeImage.remove();
          setActiveImage(null);
      }
  };

  // --- AI HANDLERS ---
  const handleGenerateChallenge = async () => {
      if (!isEditingTask) return;
      setIsGeneratingChallenge(true);
      const challenge = await generateTaskChallenge(isEditingTask.content, config);
      updateTask({
          ...isEditingTask,
          activeChallenge: challenge,
          isChallengeCompleted: false
      });
      setIsGeneratingChallenge(false);
      // Refresh local state to show new challenge immediately
      setIsEditingTask(prev => prev ? ({ ...prev, activeChallenge: challenge, isChallengeCompleted: false }) : null);
  };

  const handleTherapy = async () => {
      if (!isEditingTask) return;
      setIsTherapyLoading(true);
      const advice = await getKanbanTherapy(isEditingTask.content, 'stuck', config);
      // Append advice to description or separate field
      const newDesc = (isEditingTask.description || '') + `\n\n**Совет:** ${advice}`;
      updateTask({ ...isEditingTask, description: newDesc });
      setIsTherapyLoading(false);
      setIsEditingTask(prev => prev ? ({ ...prev, description: newDesc }) : null);
  };

  // --- DRAG HANDLERS ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('taskId', id);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      const task = tasks.find(t => t.id === taskId);
      if (task && task.column !== columnId) {
          updateTask({ ...task, column: columnId as any });
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
      <header className="mb-6 flex justify-between items-end shrink-0">
        <div>
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Спринты</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Поток выполнения</p>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-6 min-w-[800px]">
              {columns.map(col => (
                  <div 
                    key={col.id} 
                    className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                              <col.icon size={16} className={col.color} strokeWidth={2} />
                              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">{col.title}</h3>
                              <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  {tasks.filter(t => t.column === col.id).length}
                              </span>
                          </div>
                          {col.id === 'todo' && (
                              <button onClick={() => document.getElementById('new-task-input')?.focus()} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                  <Plus size={16} />
                              </button>
                          )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-ghost">
                          {col.id === 'todo' && (
                              <div className="mb-4">
                                  <input 
                                    id="new-task-input"
                                    type="text" 
                                    placeholder="+ Новая задача" 
                                    value={newTaskContent}
                                    onChange={e => setNewTaskContent(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                                  />
                              </div>
                          )}

                          {tasks.filter(t => t.column === col.id).map(task => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={() => openEdit(task)}
                                className={`${getTaskColorClass(task.color)} p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all group`}
                              >
                                  {task.coverUrl && <div className="h-24 w-full mb-3 rounded-lg overflow-hidden"><img src={task.coverUrl} className="w-full h-full object-cover" alt="" /></div>}
                                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 leading-snug line-clamp-3">
                                      {task.content}
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                      <div className="flex items-center gap-2">
                                          {task.activeChallenge && <Zap size={12} className="text-amber-500 fill-amber-500" />}
                                          {task.description && <MessageCircle size={12} className="text-indigo-400" />}
                                      </div>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                          <button onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
          {isEditingTask && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={closeEdit}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${getTaskColorClass(editColor)}`}
                    onClick={e => e.stopPropagation()}
                  >
                      {/* Toolbar */}
                      <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-1">
                              <Tooltip content="Жирный"><button onClick={() => execEditCmd('bold')} className="p-2 hover:bg-black/5 rounded"><Bold size={16} /></button></Tooltip>
                              <Tooltip content="Курсив"><button onClick={() => execEditCmd('italic')} className="p-2 hover:bg-black/5 rounded"><Italic size={16} /></button></Tooltip>
                              <Tooltip content="Очистить"><button onClick={handleClearEditStyle} className="p-2 hover:bg-black/5 rounded"><Eraser size={16} /></button></Tooltip>
                              <div className="w-px h-4 bg-black/10 mx-2" />
                              
                              <div className="relative">
                                <Tooltip content="Обложка">
                                    <button 
                                        ref={editPickerTriggerRef} 
                                        onClick={() => setShowEditCoverPicker(!showEditCoverPicker)} 
                                        className="p-2 hover:bg-black/5 rounded"
                                    >
                                        <Layout size={16} className={editCover ? "text-indigo-500" : ""} />
                                    </button>
                                </Tooltip>
                                {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} triggerRef={editPickerTriggerRef} />}
                              </div>

                              <div className="relative">
                                <Tooltip content="Цвет">
                                    <button 
                                        ref={editColorTriggerRef} 
                                        onClick={() => setShowEditColorPicker(!showEditColorPicker)} 
                                        className="p-2 hover:bg-black/5 rounded"
                                    >
                                        <Palette size={16} className={editColor !== 'white' ? "text-indigo-500" : ""} />
                                    </button>
                                </Tooltip>
                                {showEditColorPicker && <ColorPickerPopover onSelect={setEditColor} onClose={() => setShowEditColorPicker(false)} triggerRef={editColorTriggerRef} />}
                              </div>
                          </div>
                          <button onClick={closeEdit} className="p-2 hover:bg-black/5 rounded-full"><X size={20} /></button>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 overflow-y-auto p-6">
                          {editCover && (
                              <div className="h-40 w-full mb-6 rounded-xl overflow-hidden relative group">
                                  <img src={editCover} className="w-full h-full object-cover" alt="Cover" />
                                  <button onClick={() => setEditCover(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                              </div>
                          )}
                          
                          <input 
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Название задачи (опционально)"
                            className="w-full bg-transparent text-xl font-bold mb-4 outline-none placeholder:text-slate-300"
                          />

                          <div 
                            ref={editContentRef}
                            contentEditable
                            className="outline-none text-base leading-relaxed min-h-[100px] empty:before:content-['Описание...'] empty:before:text-slate-400"
                          />

                          {/* AI Actions Area */}
                          <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-4">
                              <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-2">
                                      <Zap size={14} /> Челлендж
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                                      {isEditingTask.activeChallenge || "Нет активного челленджа."}
                                  </p>
                                  <button 
                                    onClick={handleGenerateChallenge} 
                                    disabled={isGeneratingChallenge}
                                    className="w-full py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                                  >
                                      {isGeneratingChallenge ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                      {isEditingTask.activeChallenge ? "Обновить" : "Создать"}
                                  </button>
                              </div>

                              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2 flex items-center gap-2">
                                      <MessageCircle size={14} /> Терапевт
                                  </h4>
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed max-h-24 overflow-y-auto">
                                      {isEditingTask.description ? "Есть заметки." : "Нужен совет?"}
                                  </div>
                                  <button 
                                    onClick={handleTherapy} 
                                    disabled={isTherapyLoading}
                                    className="w-full py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                                  >
                                      {isTherapyLoading ? <Loader2 size={14} className="animate-spin" /> : "Получить совет"}
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
                          <button onClick={() => onReflectInJournal(isEditingTask.id)} className="text-xs font-bold text-slate-500 hover:text-indigo-500 flex items-center gap-2">
                              <ArrowRight size={14} /> Рефлексия в дневнике
                          </button>
                          <button onClick={saveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors">
                              Сохранить
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Kanban;