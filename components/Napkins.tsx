import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { findNotesByMood } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Send, Tag as TagIcon, RotateCcw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Filter, Hash, Plus, Sparkles, Kanban } from 'lucide-react';

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
  
  // Mood Search State
  const [showMoodInput, setShowMoodInput] = useState(false);
  const [moodQuery, setMoodQuery] = useState('');
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [isMoodAnalyzing, setIsMoodAnalyzing] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTagsList, setEditTagsList] = useState<string[]>([]);

  // Collect all unique tags from all notes (Case-insensitive unique)
  const allExistingTags = useMemo(() => {
      const uniqueTagsMap = new Map<string, string>(); // lowercase -> original
      notes.forEach(note => {
          note.tags.forEach(tag => {
              const clean = tag.replace(/^#/, '');
              const lower = clean.toLowerCase();
              if (!uniqueTagsMap.has(lower)) {
                  uniqueTagsMap.set(lower, clean);
              }
          });
      });
      return Array.from(uniqueTagsMap.values()).sort();
  }, [notes]);

  const handleDump = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    
    // Simulate slight delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 600));

    // APPLY TYPOGRAPHY
    const formattedContent = applyTypography(input);

    const newNote: Note = {
      id: Date.now().toString(),
      content: formattedContent,
      tags: creationTags, // Use the array directly
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
      setEditTagsList(note.tags.map(t => t.replace(/^#/, ''))); // Ensure clean tags
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
      // 1. Text Search
      const query = searchQuery.toLowerCase();
      const matchesSearch = query === '' || 
        note.content.toLowerCase().includes(query) || 
        note.tags.some(t => t.toLowerCase().includes(query));
      
      // 2. Color Filter
      const matchesColor = activeColorFilter === null || note.color === activeColorFilter;
      
      // 3. AI Mood Filter (if active)
      const matchesMood = aiFilteredIds === null || aiFilteredIds.includes(note.id);
      
      return matchesSearch && matchesColor && matchesMood;
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
            {note.tags.length > 0 && (
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
};
export default Napkins;