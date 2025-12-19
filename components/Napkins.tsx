
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Send, Tag as TagIcon, RotateCcw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight } from 'lucide-react';

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
    { id: 'white', class: 'bg-white', border: 'border-slate-100', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50', border: 'border-red-100', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50', border: 'border-amber-100', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50', border: 'border-emerald-100', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50', border: 'border-blue-100', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50', border: 'border-indigo-100', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50', border: 'border-purple-100', hex: '#faf5ff' },
];

const ORACLE_VIBES = [
    { id: 'cosmos', emoji: '🌌', label: 'Инсайт', color: 'from-indigo-500 to-purple-600', text: 'text-indigo-100' },
    { id: 'fire', emoji: '🔥', label: 'Энергия', color: 'from-orange-500 to-red-600', text: 'text-orange-100' },
    { id: 'zen', emoji: '🍃', label: 'Дзен', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-100' },
    { id: 'luck', emoji: '🎲', label: 'Случай', color: 'from-slate-700 to-slate-900', text: 'text-slate-200' },
];

// Markdown Styles for Notes
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mt-2 mb-1" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mt-1 mb-1" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-500 my-2" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-pink-600" {...props}>{children}</code>
            : <code className="block bg-slate-900 text-slate-50 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
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

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter suggestions: exclude already selected tags (case-insensitive check)
    const filteredSuggestions = existingTags.filter(
        tag => !selectedTags.some(st => st.toLowerCase() === tag.toLowerCase()) && 
               tag.toLowerCase().includes(input.toLowerCase())
    );

    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;

        const lowerInput = cleanTag.toLowerCase();

        // 1. Check if already selected (case-insensitive)
        const isAlreadySelected = selectedTags.some(t => t.toLowerCase() === lowerInput);
        if (isAlreadySelected) {
            setInput('');
            setIsOpen(false);
            return;
        }

        // 2. Check if exists in existingTags (case-insensitive) to use canonical casing
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
            if (input.trim()) {
                addTag(input);
            }
        } else if (e.key === 'Backspace' && !input && selectedTags.length > 0) {
            removeTag(selectedTags[selectedTags.length - 1]);
        }
    };

    // Determine if input matches an existing tag or selected tag exactly (case-insensitive) to hide "Create" button
    const isExactMatchInSuggestions = filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase());
    const isExactMatchInSelected = selectedTags.some(t => t.toLowerCase() === input.trim().toLowerCase());

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-200 transition-all min-h-[42px]">
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md animate-in zoom-in-95 duration-100">
                        <TagIcon size={10} />
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-500 ml-1">
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedTags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400"
                />
            </div>

            {/* Dropdown Suggestions */}
            {isOpen && (input.length > 0 || filteredSuggestions.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {input.length > 0 && !isExactMatchInSuggestions && !isExactMatchInSelected && (
                        <button
                            onClick={() => addTag(input)}
                            className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                        >
                            <Plus size={14} /> Создать «{input}»
                        </button>
                    )}
                    {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map(tag => (
                            <button
                                key={tag}
                                onClick={() => addTag(tag)}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <TagIcon size={14} className="text-slate-400" /> {tag}
                            </button>
                        ))
                    ) : (
                        input.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 italic">Нет доступных тегов</div>
                    )}
                </div>
            )}
        </div>
    );
};


const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask }) => {
  const [input, setInput] = useState('');
  // Creation state now holds array of strings
  const [creationTags, setCreationTags] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'library'>('inbox');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeColorFilter, setActiveColorFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Tag Search State
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagQuery, setTagQuery] = useState('');

  // Mood Search State
  const [showMoodInput, setShowMoodInput] = useState(false);
  const [moodQuery, setMoodQuery] = useState('');
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [isMoodAnalyzing, setIsMoodAnalyzing] = useState(false);
  
  // Oracle (Serendipity) State
  const [showOracle, setShowOracle] = useState(false);
  const [oracleState, setOracleState] = useState<'select' | 'thinking' | 'result'>('select');
  const [oracleVibe, setOracleVibe] = useState(ORACLE_VIBES[0]);
  const [oracleNote, setOracleNote] = useState<Note | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTagsList, setEditTagsList] = useState<string[]>([]);

  // Collect all unique tags from all notes (Case-insensitive unique)
  const allExistingTags = useMemo(() => {
      const uniqueTagsMap = new Map<string, string>(); // lowercase -> original
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

  // Check Availability of Tools
  const hasMoodMatcher = useMemo(() => config.aiTools.some(t => t.id === 'mood_matcher'), [config.aiTools]);
  const hasTagger = useMemo(() => config.aiTools.some(t => t.id === 'tagger'), [config.aiTools]);

  const handleDump = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    
    // Simulate slight delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 600));

    // Auto-Tagging (Only if tool is available)
    let autoTags: string[] = [];
    if (hasTagger && creationTags.length === 0) {
        autoTags = await autoTagNote(input, config);
    }

    // APPLY TYPOGRAPHY
    const formattedContent = applyTypography(input);

    const newNote: Note = {
      id: Date.now().toString(),
      content: formattedContent,
      tags: [...creationTags, ...autoTags], // Use the array directly
      createdAt: Date.now(),
      status: 'inbox',
      color: 'white',
      isPinned: false
    };
    
    addNote(newNote); // Prepends by default in App.tsx now

    setInput('');
    setCreationTags([]);
    setIsProcessing(false);
  };

  const handleMoodSearch = async () => {
      if (!moodQuery.trim()) return;
      setIsMoodAnalyzing(true);
      
      const relevantList = activeTab === 'inbox' ? notes.filter(n => n.status === 'inbox') : notes.filter(n => n.status === 'archived');
      
      const matchedIds = await findNotesByMood(relevantList, moodQuery, config);
      
      setAiFilteredIds(matchedIds);
      setIsMoodAnalyzing(false);
      setShowMoodInput(false); // Hide input, show results
  };

  const clearMoodFilter = () => {
      setAiFilteredIds(null);
      setMoodQuery('');
  };

  const startOracle = () => {
      if (notes.length === 0) {
          alert("Сначала добавь пару мыслей во Входящие или Библиотеку.");
          return;
      }
      setShowOracle(true);
      setOracleState('select');
  };

  const castOracleSpell = (vibe: typeof ORACLE_VIBES[0]) => {
      setOracleVibe(vibe);
      setOracleState('thinking');
      
      // Simulate Deep Thought / Shuffle
      setTimeout(() => {
          const allNotes = notes;
          const random = allNotes[Math.floor(Math.random() * allNotes.length)];
          setOracleNote(random);
          setOracleState('result');
      }, 1500);
  };

  const closeOracle = () => {
      setShowOracle(false);
      setTimeout(() => setOracleState('select'), 300); // Reset after close animation
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('noteId', id);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('noteId');
      if (draggedId && draggedId !== targetId) {
          reorderNote(draggedId, targetId);
      }
  };

  const moveNoteVertical = (e: React.MouseEvent, noteId: string, direction: 'up' | 'down') => {
      e.stopPropagation();
      const list = activeTab === 'inbox' ? inboxNotes : archivedNotes;
      const currentIndex = list.findIndex(n => n.id === noteId);
      if (currentIndex === -1) return;
      let targetId = '';
      if (direction === 'up' && currentIndex > 0) targetId = list[currentIndex - 1].id;
      else if (direction === 'down' && currentIndex < list.length - 1) targetId = list[currentIndex + 1].id;
      if (targetId) reorderNote(noteId, targetId);
  };

  const handleOpenNote = (note: Note) => {
      setSelectedNote(note);
      setEditContent(note.content);
      setEditTagsList(note.tags ? note.tags.map(t => t.replace(/^#/, '')) : []); // Ensure clean tags
      setIsEditing(false);
  };

  const handleSaveEdit = () => {
      if (selectedNote && editContent.trim() !== '') {
          // APPLY TYPOGRAPHY
          const formattedContent = applyTypography(editContent);
          
          const updated = { 
              ...selectedNote, 
              content: formattedContent,
              tags: editTagsList
          };
          updateNote(updated);
          setSelectedNote(updated);
          setIsEditing(false);
      }
  };

  const togglePin = (e: React.MouseEvent, note: Note) => {
      e.stopPropagation();
      updateNote({ ...note, isPinned: !note.isPinned });
      // If modal open, update it too
      if (selectedNote?.id === note.id) {
          setSelectedNote({ ...selectedNote, isPinned: !note.isPinned });
      }
  };

  const setColor = (colorId: string) => {
      if (selectedNote) {
          const updated = { ...selectedNote, color: colorId };
          updateNote(updated);
          setSelectedNote(updated);
      }
  };

  // --- FILTERING LOGIC ---
  const filterNotes = (list: Note[]) => {
    return list.filter(note => {
      // 1. Tag Search (Specific Mode)
      if (showTagInput && tagQuery) {
          const q = tagQuery.toLowerCase().replace('#', '');
          if (!note.tags || !note.tags.some(t => t.toLowerCase().includes(q))) {
              return false;
          }
      }

      // 2. Text Search (Standard Mode) - Only if not in Tag Mode (or allow combined if desired, but UI implies specific modes)
      if (!showTagInput && searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = note.content.toLowerCase().includes(query) || 
            (note.tags && note.tags.some(t => t.toLowerCase().includes(query)));
          if (!matchesSearch) return false;
      }
      
      // 3. Color Filter
      const matchesColor = activeColorFilter === null || note.color === activeColorFilter;
      
      // 4. AI Mood Filter (if active)
      const matchesMood = aiFilteredIds === null || aiFilteredIds.includes(note.id);
      
      return matchesColor && matchesMood;
    });
  };

  // Base lists (sorted)
  const rawInboxNotes = notes
    .filter(n => n.status === 'inbox')
    .sort((a, b) => (Number(b.isPinned || 0) - Number(a.isPinned || 0)));

  const rawArchivedNotes = notes
    .filter(n => n.status === 'archived')
    .sort((a, b) => (Number(b.isPinned || 0) - Number(a.isPinned || 0)));

  // Final filtered lists
  const inboxNotes = filterNotes(rawInboxNotes);
  const archivedNotes = filterNotes(rawArchivedNotes);

  const getNoteColorClass = (colorId?: string) => {
      const c = colors.find(c => c.id === colorId);
      return c ? c.class : 'bg-white';
  };
  
  const getNoteBorderClass = (colorId?: string) => {
      const c = colors.find(c => c.id === colorId);
      return c ? c.border : 'border-slate-100';
  };

  const renderNoteCard = (note: Note, isArchived: boolean) => (
      <div 
        key={note.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, note.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, note.id)}
        onClick={() => handleOpenNote(note)}
        className={`${getNoteColorClass(note.color)} p-4 rounded-xl border ${getNoteBorderClass(note.color)} shadow-sm hover:shadow-md transition-shadow group flex flex-col cursor-default relative ${isArchived && !note.isPinned ? 'opacity-90' : ''}`}
    >
        {/* HEADER */}
        <div className="flex justify-between items-start mb-2 relative">
             <div className="text-slate-300 cursor-move hover:text-slate-500 p-1 -ml-2 -mt-2" title="Перетащить">
                <GripVertical size={14} />
             </div>

             {/* Right Side: Pin & Reorder Arrows */}
             <div className="flex items-center -mr-2 -mt-2">
                 <div className={`flex gap-0.5 md:opacity-0 group-hover:opacity-100 transition-opacity mr-1 ${note.isPinned ? 'mr-7' : 'mr-1'}`}>
                    <button onClick={(e) => moveNoteVertical(e, note.id, 'up')} className="p-1 hover:bg-black/5 rounded text-slate-400"><ChevronUp size={12}/></button>
                    <button onClick={(e) => moveNoteVertical(e, note.id, 'down')} className="p-1 hover:bg-black/5 rounded text-slate-400"><ChevronDown size={12}/></button>
                 </div>
                 
                 {/* Pin Absolute */}
                 {note.isPinned && (
                    <div className="absolute top-2 right-2 text-indigo-500 transform rotate-45 pointer-events-none">
                        <Pin size={12} fill="currentColor" />
                    </div>
                 )}
             </div>
        </div>

        {/* CONTENT */}
        <div className="text-slate-800 mb-3 font-normal leading-relaxed line-clamp-3 text-sm">
             {/* Use a simplified renderer for card preview if desired, or full markdown clamped by CSS */}
            <ReactMarkdown components={markdownComponents}>{note.content}</ReactMarkdown>
        </div>
        
        {/* FOOTER */}
        <div className="mt-auto flex flex-col gap-3 pt-3 border-t border-slate-900/5">
            {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 w-full">
                    {note.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-medium text-slate-500 bg-white/60 px-2 py-1 rounded-md flex items-center gap-1">
                            <TagIcon size={10} /> {tag.replace(/^#/, '')}
                        </span>
                    ))}
                </div>
            )}
            
            <div className="flex justify-between items-center w-full">
                 {/* Left: Delete */}
                 <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if(window.confirm('Вы уверены, что хотите удалить заметку?')) deleteNote(note.id); 
                    }} 
                    className="p-2 -ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                >
                    <Trash2 size={14} />
                </button>
                 
                 {/* Right: Actions */}
                 <div className="flex gap-2 justify-end">
                    {!isArchived ? (
                        <>
                             <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(window.confirm('Создать задачу и перенести заметку в «Библиотеку»?')) {
                                        onAddTask({
                                            id: Date.now().toString(),
                                            content: note.content,
                                            column: 'todo',
                                            createdAt: Date.now()
                                        });
                                        archiveNote(note.id);
                                    }
                                }} 
                                className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 md:px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                                title="В «Действия»"
                             >
                                <Kanban size={14} />
                             </button>

                             <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(window.confirm('Поиграть в «Песочнице» и перенести заметку в «Библиотеку»?')) moveNoteToSandbox(note.id); 
                                }} 
                                className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 md:px-3 py-1.5 rounded-lg transition-colors border border-amber-100"
                                title="В «Песочницу»"
                             >
                                <Box size={14} />
                             </button>

                             <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(window.confirm('Перенести заметку в «Библиотеку»?')) archiveNote(note.id); 
                                }} 
                                className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 px-2 md:px-3 py-1.5 rounded-lg transition-colors border border-slate-200 hover:border-indigo-100" 
                                title="В «Библиотеку»"
                             >
                                <Library size={14} />
                             </button>
                        </>
                    ) : (
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if(window.confirm('Вернуть заметку во «Входящие»?')) moveNoteToInbox(note.id); 
                            }} 
                            className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 md:px-3 py-1.5 rounded-lg transition-colors"
                            title="Вернуть во «Входящие»"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                 </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-3 md:p-8 space-y-4 md:space-y-6 relative overflow-y-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-slate-800 tracking-tight">Салфетки <span className="text-blue-400 text-lg">/ Лови момент</span></h1>
          <p className="text-slate-500 mt-1 md:mt-2 text-sm">Сбрось хаос мыслей.</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0 self-start md:self-auto w-full md:w-auto">
            <button onClick={() => { setActiveTab('inbox'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm rounded-md transition-all ${activeTab === 'inbox' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}><LayoutGrid size={16} /> Входящие</button>
            <button onClick={() => { setActiveTab('library'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm rounded-md transition-all ${activeTab === 'library' ? 'bg-slate-100 text-slate-700' : 'text-slate-500'}`}><Library size={16} /> Библиотека</button>
        </div>
      </header>

      {/* SEARCH & FILTER BAR */}
      <div className="shrink-0 flex flex-col gap-2">
         <div className="flex gap-2">
            <div className="relative flex-1">
                {showMoodInput ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                         <div className="relative flex-1">
                             <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                             <input 
                                type="text" 
                                placeholder="На какую тему подобрать заметки?" 
                                value={moodQuery}
                                onChange={(e) => setMoodQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleMoodSearch()}
                                className="w-full pl-9 pr-4 py-2 bg-purple-50 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all text-purple-900 placeholder:text-purple-300"
                                autoFocus
                            />
                         </div>
                         <button 
                             onClick={handleMoodSearch} 
                             disabled={isMoodAnalyzing || !moodQuery.trim()}
                             className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                         >
                            {isMoodAnalyzing ? 'Думаю...' : 'Найти'}
                         </button>
                         <button onClick={() => setShowMoodInput(false)} className="p-2 text-slate-400 hover:text-slate-600">
                             <X size={20} />
                         </button>
                    </div>
                ) : showTagInput ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                         <div className="relative flex-1">
                             <TagIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                             <input 
                                type="text" 
                                placeholder="Поиск по #тегам..." 
                                value={tagQuery}
                                onChange={(e) => setTagQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-indigo-900 placeholder:text-indigo-300"
                                autoFocus
                            />
                         </div>
                         <button onClick={() => setShowTagInput(false)} className="p-2 text-slate-400 hover:text-slate-600">
                             <X size={20} />
                         </button>
                    </div>
                ) : (
                    <>
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск по ключевым словам..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                <X size={14} />
                            </button>
                        )}
                    </>
                )}
            </div>
            
            {!showMoodInput && !showTagInput && (
                <>
                    <button 
                        onClick={() => setShowTagInput(true)}
                        className="p-2 rounded-xl border transition-all bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200"
                        title="Поиск по тегам"
                    >
                        <TagIcon size={18} />
                    </button>

                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className={`p-2 rounded-xl border transition-all ${showFilters || activeColorFilter ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                        title="Фильтр по цвету"
                    >
                        <Palette size={18} />
                    </button>

                    {hasMoodMatcher && (
                        <button 
                            onClick={() => setShowMoodInput(true)}
                            className={`p-2 rounded-xl border transition-all ${aiFilteredIds !== null ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-slate-200 text-slate-400 hover:text-purple-500 hover:border-purple-200'}`}
                            title="Подбор по теме (ИИ)"
                        >
                            <Sparkles size={18} />
                        </button>
                    )}

                    <button 
                        onClick={startOracle}
                        className="p-2 rounded-xl border transition-all bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                        title="Оракул Смыслов"
                    >
                        <Dices size={18} />
                    </button>
                </>
            )}
         </div>
         
         {/* ACTIVE MOOD FILTER BANNER */}
         {aiFilteredIds !== null && !showMoodInput && (
             <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-top-1">
                 <div className="flex items-center gap-2 text-xs text-purple-800">
                     <Sparkles size={12} />
                     <span>Найдено {aiFilteredIds.length} заметок на тему: <b>«{moodQuery}»</b></span>
                 </div>
                 <button onClick={clearMoodFilter} className="text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-700 flex items-center gap-1">
                     <X size={12} /> Сброс
                 </button>
             </div>
         )}
         
         {/* Color Filters */}
         {(showFilters || activeColorFilter) && (
             <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-in slide-in-from-top-2 duration-200">
                 <button 
                    onClick={() => setActiveColorFilter(null)} 
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${activeColorFilter === null ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                 >
                    Все
                 </button>
                 {colors.map(c => (
                     <button
                        key={c.id}
                        onClick={() => setActiveColorFilter(activeColorFilter === c.id ? null : c.id)}
                        className={`w-6 h-6 rounded-full border shadow-sm transition-transform ${activeColorFilter === c.id ? 'ring-2 ring-indigo-400 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c.hex, borderColor: '#e2e8f0' }}
                        title={c.id}
                     />
                 ))}
             </div>
         )}
      </div>

      {activeTab === 'inbox' && (
        <>
            {/* Input only visible if not searching/filtering or if explicit action needed */}
            {!searchQuery && !activeColorFilter && aiFilteredIds === null && !showMoodInput && !tagQuery && !showTagInput && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 md:p-4 shrink-0">
                    <textarea className="w-full h-24 md:h-32 resize-none outline-none text-base text-slate-700 bg-transparent" placeholder="О чём ты думаешь? (Поддерживается Markdown)" value={input} onChange={(e) => setInput(e.target.value)} />
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 border-t border-slate-50 pt-3 gap-2">
                        <div className="w-full md:w-2/3">
                            <TagSelector 
                                selectedTags={creationTags} 
                                onChange={setCreationTags} 
                                existingTags={allExistingTags}
                                placeholder="Добавить теги..." 
                            />
                        </div>
                        <button onClick={handleDump} disabled={isProcessing || !input.trim()} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium h-[42px]">{isProcessing ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/> : <Send size={16} />} Записать</button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20 md:pb-0">
                {inboxNotes.length > 0 ? (
                    inboxNotes.map(note => renderNoteCard(note, false))
                ) : (
                    <div className="col-span-1 md:col-span-2 text-center py-10 text-slate-400 text-sm">
                        {searchQuery || activeColorFilter || aiFilteredIds || tagQuery ? 'Ничего не найдено' : '«Входящие» пусты. Запиши что-нибудь.'}
                    </div>
                )}
            </div>
        </>
      )}
      {activeTab === 'library' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20 md:pb-0">
            {archivedNotes.length > 0 ? (
                archivedNotes.map(note => renderNoteCard(note, true))
            ) : (
                <div className="col-span-1 md:col-span-2 text-center py-10 text-slate-400 text-sm">
                    {searchQuery || activeColorFilter || aiFilteredIds || tagQuery ? 'Ничего не найдено в библиотеке' : 'Библиотека пуста'}
                </div>
            )}
        </div>
      )}
      
      {/* ORACLE (SERENDIPITY) MODAL */}
      {showOracle && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <div className={`bg-gradient-to-br ${oracleVibe.color} w-full max-w-md rounded-3xl shadow-2xl p-1 overflow-hidden animate-in zoom-in-95 duration-300 relative`}>
                <div className="bg-white/95 backdrop-blur-sm rounded-[20px] p-6 md:p-8 h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                    
                    <button onClick={closeOracle} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2 z-20">
                        <X size={24} />
                    </button>

                    {/* PHASE 1: SELECT VIBE */}
                    {oracleState === 'select' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex flex-col items-center justify-center">
                            <Quote size={48} className="text-slate-200 mb-6" />
                            <h3 className="text-xl font-light text-slate-800 mb-2">Оракул Смыслов</h3>
                            <p className="text-sm text-slate-500 mb-8">Какую энергию ты ищешь?</p>
                            
                            <div className="grid grid-cols-2 gap-4 w-full">
                                {ORACLE_VIBES.map(vibe => (
                                    <button 
                                        key={vibe.id}
                                        onClick={() => castOracleSpell(vibe)}
                                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-white hover:shadow-lg hover:scale-105 border border-slate-100 transition-all duration-300 group"
                                    >
                                        <span className="text-3xl mb-2 group-hover:animate-bounce">{vibe.emoji}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{vibe.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PHASE 2: THINKING/ANIMATION */}
                    {oracleState === 'thinking' && (
                        <div className="flex flex-col items-center justify-center animate-pulse">
                            <div className="text-6xl mb-6 animate-spin duration-[2000ms]">{oracleVibe.emoji}</div>
                            <p className="text-slate-500 font-medium">Связь с хаосом...</p>
                        </div>
                    )}

                    {/* PHASE 3: RESULT */}
                    {oracleState === 'result' && oracleNote && (
                         <div className="w-full h-full flex flex-col animate-in zoom-in-95 duration-500">
                             <div className="flex items-center justify-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                                 <span>{oracleVibe.emoji}</span>
                                 <span>{oracleVibe.label}</span>
                             </div>
                             
                             <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar-light my-2">
                                <div className="text-lg md:text-xl text-slate-800 font-medium leading-relaxed italic relative px-4">
                                    <span className="absolute -top-4 -left-2 text-4xl text-slate-200 font-serif">“</span>
                                    <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span>{children}</span>}}>{oracleNote.content}</ReactMarkdown>
                                    <span className="absolute -bottom-6 -right-2 text-4xl text-slate-200 font-serif">”</span>
                                </div>
                             </div>

                             <div className="mt-6 flex flex-col gap-3 w-full">
                                <button 
                                    onClick={() => {
                                        closeOracle();
                                        handleOpenNote(oracleNote);
                                    }}
                                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r ${oracleVibe.color} hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
                                >
                                    Открыть заметку <ArrowRight size={18} />
                                </button>
                                <button 
                                    onClick={() => castOracleSpell(oracleVibe)}
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 py-2"
                                >
                                    <Shuffle size={12} /> Попробовать еще раз
                                </button>
                             </div>
                         </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {selectedNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedNote(null)}>
            <div className={`${getNoteColorClass(selectedNote.color)} w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 border ${getNoteBorderClass(selectedNote.color)} transition-colors duration-300 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-3">
                        {isEditing ? 'Редактирование' : 'Детали'}
                        {/* Pin Button */}
                        <button 
                            onClick={(e) => togglePin(e, selectedNote)}
                            className={`p-1.5 rounded-full transition-colors ${selectedNote.isPinned ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:text-indigo-500'}`}
                            title={selectedNote.isPinned ? "Открепить" : "Закрепить сверху"}
                        >
                            <Pin size={16} fill={selectedNote.isPinned ? "currentColor" : "none"} />
                        </button>
                    </h3>
                    <div className="flex gap-2">
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-white/50 rounded hover:bg-white" title="Редактировать">
                                <Edit3 size={18} />
                            </button>
                        )}
                        <button onClick={() => setSelectedNote(null)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-white/50 rounded hover:bg-white"><X size={20}/></button>
                    </div>
                </div>

                {isEditing ? (
                    <div className="mb-6 space-y-3">
                        <textarea 
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full h-48 bg-white/50 rounded-lg p-3 text-base text-slate-800 border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-100 outline-none resize-none leading-relaxed font-mono text-sm"
                            placeholder="Поддерживается Markdown..."
                        />
                        <div>
                             <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Теги</label>
                             <TagSelector 
                                selectedTags={editTagsList} 
                                onChange={setEditTagsList} 
                                existingTags={allExistingTags} 
                             />
                        </div>
                    </div>
                ) : (
                    <div className="mb-6">
                        <div className="text-slate-800 leading-relaxed text-base font-normal min-h-[4rem] mb-4 overflow-x-hidden">
                            <ReactMarkdown components={markdownComponents}>{selectedNote.content}</ReactMarkdown>
                        </div>
                        {selectedNote.tags && selectedNote.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {selectedNote.tags.map(tag => (
                                    <span key={tag} className="text-xs text-slate-500 bg-white/60 px-2 py-1 rounded-md border border-slate-100/50 flex items-center gap-1">
                                        <TagIcon size={10} /> {tag.replace(/^#/, '')}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Color Palette */}
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                    {colors.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setColor(c.id)}
                            className={`w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110 ${selectedNote.color === c.id ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                            style={{ backgroundColor: c.hex, borderColor: '#e2e8f0' }}
                            title={c.id}
                        />
                    ))}
                </div>

                <div className="flex flex-col-reverse md:flex-row justify-between items-stretch md:items-center gap-3 pt-4 border-t border-slate-900/5">
                    <button 
                        onClick={() => { 
                            if(window.confirm('Вы уверены, что хотите удалить заметку?')) {
                                deleteNote(selectedNote.id); 
                                setSelectedNote(null);
                            }
                        }} 
                        className="px-4 py-2 bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg text-sm transition-colors border border-transparent hover:border-red-100 w-full md:w-auto"
                    >
                        Удалить
                    </button>
                    
                    {isEditing && (
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 w-full md:w-auto text-center">Отмена</button>
                            <button onClick={handleSaveEdit} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm flex items-center justify-center gap-2 w-full md:w-auto">
                                <Check size={16} /> Сохранить
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
export default Napkins;