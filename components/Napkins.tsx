
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline } from 'lucide-react';

interface Props {
  notes: Note[];
  config: AppConfig;
  addNote: (note: Note) => void;
  moveNoteToSandbox: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  archiveNote: (id: string) => void;
  deleteNote: (id: string) => void;
  reorderNote: (draggedId: string, targetId: string) => void;
  updateNote: (note: Note) => void;
  onAddTask: (task: Task) => void;
}

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', border: 'border-slate-100 dark:border-slate-700', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-800/50', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800/50', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800/50', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800/50', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800/50', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800/50', hex: '#faf5ff' },
];

const ORACLE_VIBES = [
    { id: 'cosmos', icon: Orbit, label: 'Инсайт', color: 'from-indigo-500 to-purple-600', text: 'text-indigo-100' },
    { id: 'fire', icon: Flame, label: 'Энергия', color: 'from-orange-500 to-red-600', text: 'text-orange-100' },
    { id: 'zen', icon: Waves, label: 'Дзен', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-100' },
    { id: 'luck', icon: Clover, label: 'Случай', color: 'from-slate-700 to-slate-900', text: 'text-slate-200' },
];

// --- HELPER: ALLOW DATA URIS ---
const allowDataUrls = (url: string) => url;

// --- HELPER: IMAGE COMPRESSION ---
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
                const MAX_WIDTH = 800; // Improved quality
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

// Markdown Styles for Notes
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mt-2 mb-1" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mt-1 mb-1" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 italic text-slate-500 dark:text-slate-400 my-2" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400" {...props}>{children}</code>
            : <code className="block bg-slate-900 dark:bg-black text-slate-50 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    },
    img: ({node, ...props}: any) => <img className="rounded-lg max-h-60 object-cover my-2 block" {...props} loading="lazy" />
};

// --- HELPER: HTML <-> MARKDOWN CONVERTERS ---
const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    
    html = html.replace(/!\[(.*?)\]\((data:image\/[^;]+;base64,[^)]+)\)/g, '<img src="$2" alt="$1" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%;" />');
    html = html.replace(/!\[(.*?)\]\((?!data:)(.*?)\)/g, '<img src="$2" alt="$1" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%;" />');

    html = html
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/_(.*?)_/g, '<i>$1</i>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
        
    return html;
};

const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    let md = '';
    
    const process = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            md += applyTypography(node.textContent || '');
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            switch(el.tagName) {
                case 'B': case 'STRONG':
                    md += '**';
                    el.childNodes.forEach(process);
                    md += '**';
                    break;
                case 'I': case 'EM':
                    md += '_';
                    el.childNodes.forEach(process);
                    md += '_';
                    break;
                case 'CODE':
                    md += '`';
                    el.childNodes.forEach(process);
                    md += '`';
                    break;
                case 'DIV':
                    if (md.length > 0 && !md.endsWith('\n')) md += '\n';
                    el.childNodes.forEach(process);
                    md += '\n';
                    break;
                case 'P':
                    if (md.length > 0 && !md.endsWith('\n')) md += '\n';
                    el.childNodes.forEach(process);
                    md += '\n';
                    break;
                case 'BR':
                    md += '\n';
                    break;
                case 'IMG':
                    const img = el as HTMLImageElement;
                    const cleanSrc = img.src.replace(/\s/g, '');
                    md += `\n![${img.alt || 'image'}](${cleanSrc})\n`;
                    break;
                case 'UL':
                    if (md.length > 0 && !md.endsWith('\n')) md += '\n';
                    el.childNodes.forEach(process);
                    md += '\n';
                    break;
                case 'LI':
                    md += '- ';
                    el.childNodes.forEach(process);
                    md += '\n';
                    break;
                default:
                    el.childNodes.forEach(process);
            }
        }
    };
    
    temp.childNodes.forEach(process);
    return md.trim();
};

// --- INTERNAL COMPONENT: TAG SELECTOR ---
interface TagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    existingTags: string[];
    placeholder?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({ selectedTags, onChange, existingTags, placeholder = "Добавить теги..." }) => {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredSuggestions = existingTags.filter(
        tag => !selectedTags.some(st => st.toLowerCase() === tag.toLowerCase()) && 
               tag.toLowerCase().includes(input.toLowerCase())
    );

    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        const lowerInput = cleanTag.toLowerCase();
        const isAlreadySelected = selectedTags.some(t => t.toLowerCase() === lowerInput);
        if (isAlreadySelected) {
            setInput('');
            setIsOpen(false);
            return;
        }
        const existingMatch = existingTags.find(t => t.toLowerCase() === lowerInput);
        const finalTag = existingMatch || cleanTag;
        onChange([...selectedTags, finalTag]);
        setInput('');
        setIsOpen(false);
    };

    const removeTag = (tagToRemove: string) => {
        onChange(selectedTags.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (input.trim()) addTag(input);
        } else if (e.key === 'Backspace' && !input && selectedTags.length > 0) {
            removeTag(selectedTags[selectedTags.length - 1]);
        }
    };

    const isExactMatchInSuggestions = filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase());
    const isExactMatchInSelected = selectedTags.some(t => t.toLowerCase() === input.trim().toLowerCase());

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-transparent transition-all min-h-[36px]">
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md animate-in zoom-in-95 duration-100">
                        <TagIcon size={10} />
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-500 dark:hover:text-red-400 ml-1">
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedTags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[80px] bg-transparent text-xs outline-none text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
            </div>

            {isOpen && (input.length > 0 || filteredSuggestions.length > 0) && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {input.length > 0 && !isExactMatchInSuggestions && !isExactMatchInSelected && (
                        <button onClick={() => addTag(input)} className="w-full text-left px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2">
                            <Plus size={14} /> Создать «{input}»
                        </button>
                    )}
                    {filteredSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2">
                            <TagIcon size={14} className="text-slate-400" /> {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MASONRY GRID LAYOUT ---
const MasonryGrid = ({ items, renderItem }: { items: any[], renderItem: (item: any) => React.ReactNode }) => {
    const [columns, setColumns] = useState(1);

    useEffect(() => {
        const updateColumns = () => {
            setColumns(window.innerWidth >= 768 ? 2 : 1);
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    if (columns === 1) {
        return <div className="flex flex-col gap-3 pb-20 md:pb-0">{items.map(renderItem)}</div>;
    }

    const col1 = items.filter((_, i) => i % 2 === 0);
    const col2 = items.filter((_, i) => i % 2 === 1);

    return (
        <div className="flex gap-3 items-start pb-20 md:pb-0">
            <div className="flex-1 flex flex-col gap-3 min-w-0">{col1.map(renderItem)}</div>
            <div className="flex-1 flex flex-col gap-3 min-w-0">{col2.map(renderItem)}</div>
        </div>
    );
};

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask }) => {
  const [title, setTitle] = useState('');
  const [creationTags, setCreationTags] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'library'>('inbox');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Editor State
  const [isExpanded, setIsExpanded] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeColorFilter, setActiveColorFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagQuery, setTagQuery] = useState('');

  const [showMoodInput, setShowMoodInput] = useState(false);
  const [moodQuery, setMoodQuery] = useState('');
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [isMoodAnalyzing, setIsMoodAnalyzing] = useState(false);
  
  const [showOracle, setShowOracle] = useState(false);
  const [oracleState, setOracleState] = useState<'select' | 'thinking' | 'result'>('select');
  const [oracleVibe, setOracleVibe] = useState(ORACLE_VIBES[0]);
  const [oracleNote, setOracleNote] = useState<Note | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTagsList, setEditTagsList] = useState<string[]>([]);
  const editContentRef = useRef<HTMLDivElement>(null);

  const allExistingTags = useMemo(() => {
      const uniqueTagsMap = new Map<string, string>();
      notes.forEach(note => {
          if (note.tags && Array.isArray(note.tags)) {
              note.tags.forEach(tag => {
                  const clean = tag.replace(/^#/, '');
                  const lower = clean.toLowerCase();
                  if (!uniqueTagsMap.has(lower)) {
                      uniqueTagsMap.set(lower, clean);
                  }
              });
          }
      });
      return Array.from(uniqueTagsMap.values()).sort();
  }, [notes]);

  const hasMoodMatcher = useMemo(() => config.aiTools.some(t => t.id === 'mood_matcher'), [config.aiTools]);
  const hasTagger = useMemo(() => config.aiTools.some(t => t.id === 'tagger'), [config.aiTools]);

  // --- EDITOR LOGIC ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
            if (isExpanded) {
                handleDump();
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, title]);

  const insertImageAtCursor = (base64: string, targetEl: HTMLElement) => {
        targetEl.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (targetEl.contains(range.commonAncestorContainer)) {
                const img = document.createElement('img');
                img.src = base64;
                img.style.maxWidth = '100%';
                img.style.borderRadius = '8px';
                img.style.display = 'block';
                img.style.margin = '8px 0';
                
                range.deleteContents();
                range.insertNode(img);
                range.setStartAfter(img);
                range.setEndAfter(img);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }
        }
        // Fallback
        const img = document.createElement('img');
        img.src = base64;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.display = 'block';
        img.style.margin = '8px 0';
        targetEl.appendChild(img);
  };

  // Handle Paste for Images with Compression
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    try {
                        const compressedBase64 = await processImage(blob);
                        insertImageAtCursor(compressedBase64, target);
                    } catch (err) {
                        console.error("Image paste failed", err);
                        alert("Не удалось вставить изображение. Возможно, файл поврежден или формат не поддерживается.");
                    }
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const compressedBase64 = await processImage(file);
              const target = isEditing ? editContentRef.current : contentEditableRef.current;
              if (target) {
                  insertImageAtCursor(compressedBase64, target);
              }
          } catch (err) {
              console.error("Image upload failed", err);
              alert("Ошибка загрузки изображения.");
          }
          // Reset input
          e.target.value = '';
      }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (contentEditableRef.current && isExpanded) contentEditableRef.current.focus();
      else if (editContentRef.current && isEditing) editContentRef.current.focus();
  };

  const handleDump = async () => {
    const rawHtml = contentEditableRef.current?.innerHTML || '';
    const cleanHtml = rawHtml.replace(/^(<br>)+$/, '').trim();
    
    if (!cleanHtml && !title.trim()) {
        setIsExpanded(false);
        return;
    }
    
    setIsProcessing(true);
    const markdownContent = htmlToMarkdown(cleanHtml);

    let autoTags: string[] = [];
    if (hasTagger && creationTags.length === 0 && markdownContent.length > 20) {
        autoTags = await autoTagNote(markdownContent, config);
    }
    
    const newNote: Note = {
      id: Date.now().toString(),
      title: title.trim() ? applyTypography(title.trim()) : undefined,
      content: markdownContent,
      tags: [...creationTags, ...autoTags],
      createdAt: Date.now(),
      status: 'inbox',
      color: 'white',
      isPinned: false
    };
    addNote(newNote);
    setTitle('');
    if (contentEditableRef.current) contentEditableRef.current.innerHTML = '';
    setCreationTags([]);
    setIsProcessing(false);
    setIsExpanded(false);
  };

  const handleMoodSearch = async () => {
      if (!moodQuery.trim()) return;
      setIsMoodAnalyzing(true);
      const relevantList = activeTab === 'inbox' ? notes.filter(n => n.status === 'inbox') : notes.filter(n => n.status === 'archived');
      const matchedIds = await findNotesByMood(relevantList, moodQuery, config);
      setAiFilteredIds(matchedIds);
      setIsMoodAnalyzing(false);
      setShowMoodInput(false);
  };

  const clearMoodFilter = () => {
      setAiFilteredIds(null);
      setMoodQuery('');
  };

  const startOracle = () => {
      if (notes.length === 0) {
          alert("Сначала добавь пару мыслей в Заметки");
          return;
      }
      setShowOracle(true);
      setOracleState('select');
  };

  const castOracleSpell = (vibe: typeof ORACLE_VIBES[0]) => {
      setOracleVibe(vibe);
      setOracleState('thinking');
      setTimeout(() => {
          const allNotes = notes;
          const random = allNotes[Math.floor(Math.random() * allNotes.length)];
          setOracleNote(random);
          setOracleState('result');
      }, 1500);
  };

  const closeOracle = () => {
      setShowOracle(false);
      setTimeout(() => setOracleState('select'), 300);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('noteId', id);
      e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('noteId');
      if (draggedId && draggedId !== targetId) reorderNote(draggedId, targetId);
  };

  const handleOpenNote = (note: Note) => {
      setSelectedNote(note);
      setEditTitle(note.title || '');
      setEditTagsList(note.tags ? note.tags.map(t => t.replace(/^#/, '')) : []);
      setIsEditing(false);
  };

  const handleSaveEdit = () => {
      if (selectedNote) {
          const rawHtml = editContentRef.current?.innerHTML || '';
          const markdownContent = htmlToMarkdown(rawHtml);
          
          if (markdownContent.trim() !== '' || editTitle.trim() !== '') {
              const updated = { 
                  ...selectedNote, 
                  title: editTitle.trim() ? applyTypography(editTitle.trim()) : undefined,
                  content: markdownContent, 
                  tags: editTagsList 
              };
              updateNote(updated);
              setSelectedNote(updated);
              setIsEditing(false);
          }
      }
  };

  const togglePin = (e: React.MouseEvent, note: Note) => {
      e.stopPropagation();
      updateNote({ ...note, isPinned: !note.isPinned });
      if (selectedNote?.id === note.id) setSelectedNote({ ...selectedNote, isPinned: !note.isPinned });
  };

  const setColor = (colorId: string) => {
      if (selectedNote) {
          const updated = { ...selectedNote, color: colorId };
          updateNote(updated);
          setSelectedNote(updated);
      }
  };

  const filterNotes = (list: Note[]) => {
    return list.filter(note => {
      if (showTagInput && tagQuery) {
          const q = tagQuery.toLowerCase().replace('#', '');
          if (!note.tags || !note.tags.some(t => t.toLowerCase().includes(q))) return false;
      }
      if (!showTagInput && searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = note.content.toLowerCase().includes(query) || (note.title && note.title.toLowerCase().includes(query)) || (note.tags && note.tags.some(t => t.toLowerCase().includes(query)));
          if (!matchesSearch) return false;
      }
      const matchesColor = activeColorFilter === null || note.color === activeColorFilter;
      const matchesMood = aiFilteredIds === null || aiFilteredIds.includes(note.id);
      return matchesColor && matchesMood;
    });
  };

  const rawInboxNotes = notes.filter(n => n.status === 'inbox').sort((a, b) => (Number(b.isPinned || 0) - Number(a.isPinned || 0)));
  const rawArchivedNotes = notes.filter(n => n.status === 'archived').sort((a, b) => (Number(b.isPinned || 0) - Number(a.isPinned || 0)));
  const inboxNotes = filterNotes(rawInboxNotes);
  const archivedNotes = filterNotes(rawArchivedNotes);

  const getNoteColorClass = (colorId?: string) => {
      const c = colors.find(c => c.id === colorId);
      return c ? c.class : 'bg-white dark:bg-[#1e293b]';
  };
  const getNoteBorderClass = (colorId?: string) => {
      const c = colors.find(c => c.id === colorId);
      return c ? c.border : 'border-slate-100 dark:border-slate-700';
  };

  const renderNoteCard = (note: Note, isArchived: boolean) => (
      <div 
        key={note.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, note.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, note.id)}
        onClick={() => handleOpenNote(note)}
        className={`${getNoteColorClass(note.color)} p-4 rounded-xl border ${getNoteBorderClass(note.color)} shadow-sm hover:shadow-md transition-shadow group flex flex-col cursor-default relative break-inside-avoid ${isArchived && !note.isPinned ? 'opacity-90' : ''}`}
    >
        {/* TEXT CONTENT WRAPPER */}
        <div className="block w-full mb-2">
             {/* PIN BUTTON - Floated Right */}
             <div className="float-right ml-2 mb-1 relative z-10">
                 <Tooltip content={note.isPinned ? "Открепить" : "Закрепить"}>
                     <button 
                        onClick={(e) => togglePin(e, note)}
                        className={`p-1 rounded transition-all ${
                            note.isPinned 
                            ? 'text-indigo-500 dark:text-indigo-400 opacity-100' 
                            : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                     >
                        <Pin size={16} fill={note.isPinned ? "currentColor" : "none"} className={note.isPinned ? "transform rotate-45" : ""} />
                     </button>
                 </Tooltip>
             </div>

             {/* Title Block */}
             {note.title && (
                <div className="font-bold text-slate-800 dark:text-slate-100 mb-2 text-sm md:text-base leading-snug break-words">
                    {note.title}
                </div>
             )}

             {/* Content */}
             <div className={`text-slate-800 dark:text-slate-200 font-normal leading-relaxed text-sm overflow-hidden break-words line-clamp-[4]`}>
                <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls}>{note.content}</ReactMarkdown>
             </div>
        </div>

        {/* FOOTER ACTIONS - Restored separator and flow layout */}
        <div className="mt-auto pt-3 border-t border-slate-900/5 dark:border-white/5 flex justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="flex gap-1">
                <Tooltip content="В Спринты">
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В Спринты?')) { onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); } }} className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1.5 rounded-lg transition-colors"><Kanban size={14} /></button>
                </Tooltip>
                <Tooltip content="В Хаб">
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В Хаб?')) moveNoteToSandbox(note.id); }} className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1.5 rounded-lg transition-colors"><Box size={14} /></button>
                </Tooltip>
                {!isArchived && (
                    <Tooltip content="В Библиотеку">
                        <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В Библиотеку?')) archiveNote(note.id); }} className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1.5 rounded-lg transition-colors"><Library size={14} /></button>
                    </Tooltip>
                )}
             </div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-3 md:p-8 space-y-4 md:space-y-6 relative overflow-y-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 mb-6">
        <div>
          <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Заметки</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">На скорости мысли</p>
        </div>
        <div className="flex bg-white dark:bg-[#1e293b] p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 self-start md:self-auto w-full md:w-auto">
            <button onClick={() => { setActiveTab('inbox'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm rounded-md transition-all ${activeTab === 'inbox' ? 'bg-slate-900 dark:bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}><LayoutGrid size={16} /> Входящие</button>
            <button onClick={() => { setActiveTab('library'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm rounded-md transition-all ${activeTab === 'library' ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}><Library size={16} /> Библиотека</button>
        </div>
      </header>

      {/* SEARCH & FILTER BAR */}
      <div className="shrink-0 flex flex-col gap-2">
         {/* ... (Search Bar Logic remains unchanged) ... */}
         <div className="flex gap-2">
            <div className="relative flex-1">
                {showMoodInput ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                         <div className="relative flex-1">
                             <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                             <input type="text" placeholder="На какую тему подобрать заметки?" value={moodQuery} onChange={(e) => setMoodQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMoodSearch()} className="w-full pl-9 pr-4 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-300 transition-all text-purple-900 dark:text-purple-300 placeholder:text-purple-300" autoFocus />
                         </div>
                         <button onClick={handleMoodSearch} disabled={isMoodAnalyzing || !moodQuery.trim()} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50">{isMoodAnalyzing ? 'Думаю...' : 'Найти'}</button>
                         <button onClick={() => setShowMoodInput(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                    </div>
                ) : showTagInput ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                         <div className="relative flex-1">
                             <TagIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                             <input type="text" placeholder="Поиск по #тегам..." value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300 transition-all text-indigo-900 dark:text-indigo-300 placeholder:text-indigo-300" autoFocus />
                         </div>
                         <button onClick={() => setShowTagInput(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                    </div>
                ) : (
                    <>
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Поиск по ключевым словам..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 focus:border-indigo-200 dark:text-slate-200 transition-all shadow-sm" />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                        )}
                    </>
                )}
            </div>
            
            {!showMoodInput && !showTagInput && (
                <>
                    <Tooltip content="Поиск по тегам" side="bottom">
                        <button onClick={() => setShowTagInput(true)} className="p-2 rounded-xl border transition-all bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800"><TagIcon size={18} /></button>
                    </Tooltip>
                    <Tooltip content="Фильтр по цвету" side="bottom">
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl border transition-all ${showFilters || activeColorFilter ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}><Palette size={18} /></button>
                    </Tooltip>
                    {hasMoodMatcher && (
                        <Tooltip content="Подбор по теме (ИИ)" side="bottom">
                            <button onClick={() => setShowMoodInput(true)} className={`p-2 rounded-xl border transition-all ${aiFilteredIds !== null ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-purple-500 hover:border-purple-200'}`}><Sparkles size={18} /></button>
                        </Tooltip>
                    )}
                    <Tooltip content="Рандом" side="bottom">
                        <button onClick={startOracle} className="group relative p-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg hover:shadow-purple-200 dark:hover:shadow-none">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                            <Dices size={18} className="relative z-10 text-white transition-transform duration-500 group-hover:rotate-180" />
                        </button>
                    </Tooltip>
                </>
            )}
         </div>
         
         {aiFilteredIds !== null && !showMoodInput && (
             <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-top-1">
                 <div className="flex items-center gap-2 text-xs text-purple-800 dark:text-purple-300"><Sparkles size={12} /><span>Найдено {aiFilteredIds.length} заметок на тему: <b>«{moodQuery}»</b></span></div>
                 <button onClick={clearMoodFilter} className="text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-700 dark:hover:text-purple-200 flex items-center gap-1"><X size={12} /> Сброс</button>
             </div>
         )}
         
         {(showFilters || activeColorFilter) && (
             <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-in slide-in-from-top-2 duration-200">
                 <button onClick={() => setActiveColorFilter(null)} className={`px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${activeColorFilter === null ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>Все</button>
                 {colors.map(c => (
                     <button key={c.id} onClick={() => setActiveColorFilter(activeColorFilter === c.id ? null : c.id)} className={`w-6 h-6 rounded-full border shadow-sm transition-transform ${activeColorFilter === c.id ? 'ring-2 ring-indigo-400 ring-offset-2 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c.hex, borderColor: '#cbd5e1' }} title={c.id} />
                 ))}
             </div>
         )}
      </div>

      {activeTab === 'inbox' && (
        <>
            {!searchQuery && !activeColorFilter && aiFilteredIds === null && !showMoodInput && !tagQuery && !showTagInput && (
                <div 
                    ref={editorRef}
                    className={`bg-white dark:bg-[#1e293b] rounded-2xl border transition-all duration-300 shrink-0 ${isExpanded ? 'shadow-lg border-slate-300 dark:border-slate-600' : 'shadow-sm border-slate-200 dark:border-slate-700 hover:shadow-md'}`}
                >
                    {!isExpanded ? (
                        <div 
                            onClick={() => { setIsExpanded(true); setTimeout(() => contentEditableRef.current?.focus(), 10); }}
                            className="p-3 md:p-4 text-slate-500 dark:text-slate-400 cursor-text text-sm font-medium flex items-center justify-between"
                        >
                            <span>Заметка...</span>
                            <div className="flex gap-3 text-slate-400">
                                <ImageIcon size={18} />
                                <PenTool size={18} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col animate-in fade-in duration-200">
                            <input 
                                type="text"
                                placeholder="Заголовок"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="px-4 pt-4 pb-2 bg-transparent text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                            />
                            
                            {/* Rich Editor Area */}
                            <div
                                ref={contentEditableRef}
                                contentEditable
                                className="w-full min-h-[120px] outline-none text-sm text-slate-700 dark:text-slate-200 px-4 py-2 leading-relaxed"
                                style={{ whiteSpace: 'pre-wrap' }}
                                data-placeholder="О чём ты думаешь?"
                            />
                            
                            <div className="px-4 py-2">
                                <TagSelector selectedTags={creationTags} onChange={setCreationTags} existingTags={allExistingTags} placeholder="Теги..." />
                            </div>

                            <div className="flex items-center justify-between px-2 py-2 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-1">
                                    <Tooltip content="Жирный">
                                        <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                                            <Bold size={18} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Курсив">
                                        <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                                            <Italic size={18} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Список">
                                        <button onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                                            <List size={18} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Вставить картинку">
                                        <label className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center">
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleImageUpload} 
                                            />
                                            <ImageIcon size={18} />
                                        </label>
                                    </Tooltip>
                                </div>
                                <button 
                                    onClick={handleDump} 
                                    disabled={isProcessing} 
                                    className="text-sm font-medium px-4 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {inboxNotes.length > 0 ? (
                <MasonryGrid items={inboxNotes} renderItem={(note) => renderNoteCard(note, false)} />
            ) : (
                <div className="py-6">
                    <EmptyState 
                      icon={PenTool} 
                      title="Чистый лист" 
                      description={searchQuery || activeColorFilter || aiFilteredIds || tagQuery ? 'Ничего не найдено по вашему запросу' : 'Входящие пусты. Отличное начало для новых мыслей'}
                    />
                </div>
            )}
        </>
      )}
      {activeTab === 'library' && (
        <>
            {archivedNotes.length > 0 ? (
                <MasonryGrid items={archivedNotes} renderItem={(note) => renderNoteCard(note, true)} />
            ) : (
                <div className="py-6">
                    <EmptyState 
                      icon={Library} 
                      title="Библиотека пуста" 
                      description={searchQuery || activeColorFilter || aiFilteredIds || tagQuery ? 'В архиве ничего не найдено.' : 'Собери лучшие мысли и идеи здесь'}
                      color="indigo"
                    />
                </div>
            )}
        </>
      )}
      
      {/* ... (Oracle component remains same) ... */}
      {showOracle && (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-gradient-to-br ${oracleVibe.color} w-[90vw] max-w-md rounded-3xl shadow-2xl p-1 overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col min-h-[420px] max-h-[85vh]`}>
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[20px] w-full h-full flex flex-col relative overflow-hidden flex-1">
                  <button onClick={closeOracle} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-200 p-2 z-20 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={24} /></button>
                  <div className="p-6 md:p-8 flex flex-col h-full overflow-hidden">
                      {oracleState === 'select' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex flex-col items-center justify-center">
                              <h3 className="text-xl font-light text-slate-800 dark:text-slate-200 mb-2">Рандом</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Что ищем?</p>
                              <div className="grid grid-cols-2 gap-4 w-full">
                                  {ORACLE_VIBES.map(vibe => (
                                      <button key={vibe.id} onClick={() => castOracleSpell(vibe)} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg hover:scale-105 border border-slate-100 dark:border-slate-700 transition-all duration-300 group">
                                          <vibe.icon size={32} strokeWidth={1.5} className="mb-3 text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform duration-300" />
                                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{vibe.label}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}
                      {oracleState === 'thinking' && (
                          <div className="flex flex-col items-center justify-center animate-pulse h-full">
                              <oracleVibe.icon size={64} strokeWidth={1} className="mb-6 animate-pulse text-slate-700 dark:text-slate-300" />
                              <p className="text-slate-500 dark:text-slate-400 font-medium">Связь с хаосом...</p>
                          </div>
                      )}
                      {oracleState === 'result' && oracleNote && (
                           <div className="flex flex-col h-full animate-in zoom-in-95 duration-500 min-h-0">
                               <div className="shrink-0 flex items-center justify-center gap-2 mb-6 text-xs font-bold uppercase tracking-widest text-slate-400"><oracleVibe.icon size={14} /><span>{oracleVibe.label}</span></div>
                               <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0 pr-2">
                                  <div className="min-h-full flex flex-col">
                                      <div className="m-auto w-full py-2">
                                          {oracleNote.title && <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-2">{oracleNote.title}</h3>}
                                          <div className="text-base md:text-lg text-slate-800 dark:text-slate-200 font-normal leading-relaxed relative py-4 text-center">
                                              <div className="relative z-10 px-3"><ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span>{children}</span>}} urlTransform={allowDataUrls}>{oracleNote.content}</ReactMarkdown></div>
                                          </div>
                                      </div>
                                  </div>
                               </div>
                               <div className="mt-6 flex flex-col gap-3 shrink-0 pt-2 border-t border-transparent">
                                  <button onClick={() => { closeOracle(); handleOpenNote(oracleNote); }} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r ${oracleVibe.color} hover:opacity-90 transition-opacity flex items-center justify-center gap-2 active:scale-[0.98]`}>Открыть заметку <ArrowRight size={18} /></button>
                                  <div className="flex flex-col gap-1 items-center">
                                      <button onClick={() => castOracleSpell(oracleVibe)} className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-1 py-2"><Shuffle size={12} /> Попробовать еще раз</button>
                                      <button onClick={() => setOracleState('select')} className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-1 py-2"><ArrowLeft size={12} /> Попробовать другой вайб</button>
                                  </div>
                               </div>
                           </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
      )}

      {selectedNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedNote(null)}>
            <div className={`${getNoteColorClass(selectedNote.color)} w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 border ${getNoteBorderClass(selectedNote.color)} transition-colors duration-300 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-800 dark:text-slate-200">
                        {isEditing ? 'Редактирование' : 'Детали'}
                        <Tooltip content={selectedNote.isPinned ? "Открепить" : "Закрепить сверху"}>
                            <button onClick={(e) => togglePin(e, selectedNote)} className={`p-1.5 rounded-full transition-colors ${selectedNote.isPinned ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-500'}`}><Pin size={16} fill={selectedNote.isPinned ? "currentColor" : "none"} /></button>
                        </Tooltip>
                    </h3>
                    <div className="flex items-center">
                        {!isEditing && (
                            <>
                                <Tooltip content="Редактировать">
                                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded mr-1">
                                        <Edit3 size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Удалить">
                                    <button onClick={() => { if(window.confirm('Удалить заметку?')) { deleteNote(selectedNote.id); setSelectedNote(null); } }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white/50 dark:bg-black/20 rounded hover:bg-white dark:hover:bg-black/40 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                                <div className="w-px h-5 bg-slate-400/30 dark:bg-white/20 mx-2"></div>
                            </>
                        )}
                        <button onClick={() => setSelectedNote(null)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-white/50 dark:bg-black/20 rounded hover:bg-white dark:hover:bg-black/40"><X size={20}/></button>
                    </div>
                </div>
                {isEditing ? (
                    <div className="mb-6 space-y-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Заголовок</label>
                            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-white/50 dark:bg-black/20 rounded-lg p-2.5 text-base font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 focus:border-indigo-300 dark:focus:border-indigo-500 outline-none" placeholder="Заголовок..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Содержание</label>
                            <div className="relative">
                                {/* TOOLBAR FOR EDIT MODAL */}
                                <div className="flex items-center gap-1 mb-1 pb-1 border-b border-slate-200 dark:border-slate-600/50 overflow-x-auto">
                                    <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><Bold size={14} /></button>
                                    <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><Italic size={14} /></button>
                                    <button onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><List size={14} /></button>
                                    <label className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer text-slate-500 dark:text-slate-400"><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><ImageIcon size={14} /></label>
                                </div>
                                <div 
                                    ref={editContentRef}
                                    contentEditable
                                    className="w-full h-48 bg-white/50 dark:bg-black/20 rounded-lg p-3 text-base text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 focus:border-indigo-300 dark:focus:border-indigo-500 outline-none overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedNote.content) }} // Initialize with HTML
                                />
                            </div>
                        </div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Теги</label><TagSelector selectedTags={editTagsList} onChange={setEditTagsList} existingTags={allExistingTags} /></div>
                    </div>
                ) : (
                    <div className="mb-6">
                        {selectedNote.title && <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{selectedNote.title}</h2>}
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-base font-normal min-h-[4rem] mb-4 overflow-x-hidden">
                            <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls}>{selectedNote.content}</ReactMarkdown>
                        </div>
                        {selectedNote.tags && selectedNote.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {selectedNote.tags.map(tag => (
                                    <span key={tag} className="text-xs text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-black/20 px-2 py-1 rounded-md border border-slate-100/50 dark:border-slate-700/50 flex items-center gap-1"><TagIcon size={10} /> {tag.replace(/^#/, '')}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                    {colors.map(c => (
                        <button key={c.id} onClick={() => setColor(c.id)} className={`w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110 ${selectedNote.color === c.id ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`} style={{ backgroundColor: c.hex, borderColor: '#e2e8f0' }} title={c.id} />
                    ))}
                </div>
                {isEditing && (
                    <div className="flex flex-col-reverse md:flex-row justify-end items-stretch md:items-center gap-3 pt-4 border-t border-slate-900/5 dark:border-white/5">
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 w-full md:w-auto text-center">Отмена</button>
                            <button onClick={handleSaveEdit} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium text-sm flex items-center justify-center gap-2 w-full md:w-auto"><Check size={16} /> Сохранить</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
export default Napkins;
