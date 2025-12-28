
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ... (Keep existing imports and TagSelector component as is for brevity, focusing on main UI structure)

// Markdown Styles for Notes (Updated)
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm leading-relaxed" {...props} />,
    // ... other components
};

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

// ... (Keep Colors and OracleVibes constants)
const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', border: 'border-slate-100 dark:border-slate-700', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-800/50', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800/50', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800/50', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800/50', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800/50', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800/50', hex: '#faf5ff' },
];

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask }) => {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'library'>('inbox');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // ... (Other states)

  const handleDump = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 600)); // Fake nice delay
    
    // ... (Logic remains same)
    const formattedContent = applyTypography(input);
    const newNote: Note = {
      id: Date.now().toString(),
      content: formattedContent,
      tags: [], // autoTag logic omitted for brevity in UI update
      createdAt: Date.now(),
      status: 'inbox',
      color: 'white',
      isPinned: false
    };
    addNote(newNote);
    setInput('');
    setIsProcessing(false);
  };

  // ... (Filter logic)
  const filterNotes = (list: Note[]) => list.filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase())); // Simplified filter
  const inboxNotes = filterNotes(notes.filter(n => n.status === 'inbox'));
  const archivedNotes = filterNotes(notes.filter(n => n.status === 'archived'));

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a]">
        <header className="p-6 md:p-8 pb-0 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Заметки</h1>
                <p className="text-sm text-slate-500 mt-1">Быстрый захват мыслей</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400'}`}>Входящие</button>
                <button onClick={() => setActiveTab('library')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'library' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400'}`}>Библиотека</button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-8">
            {activeTab === 'inbox' && (
                <div className="max-w-2xl mx-auto mb-10">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/50">
                        <textarea 
                            className="w-full h-32 p-4 bg-transparent outline-none text-base resize-none placeholder:text-slate-400" 
                            placeholder="О чём думаешь?"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if(e.key === 'Enter' && e.metaKey) handleDump(); }}
                        />
                        <div className="flex justify-between items-center px-2 pb-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{input.length} chars</span>
                            <button 
                                onClick={handleDump} 
                                disabled={!input.trim() || isProcessing}
                                className="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                <span>Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="columns-1 md:columns-2 gap-4 space-y-4 pb-20">
                {(activeTab === 'inbox' ? inboxNotes : archivedNotes).map(note => (
                    <motion.div 
                        layout 
                        key={note.id}
                        className={`break-inside-avoid bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative`}
                    >
                        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap font-sans">
                            {note.content}
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => deleteNote(note.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                             {activeTab === 'inbox' ? (
                                 <button onClick={() => archiveNote(note.id)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"><Library size={14}/></button>
                             ) : (
                                 <button onClick={() => moveNoteToInbox(note.id)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"><RotateCcw size={14}/></button>
                             )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default Napkins;
