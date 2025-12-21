import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { StickyNote, Plus, Send, Trash2, Kanban, Box, Library, RotateCcw, Loader2, Tag } from 'lucide-react';
import { autoTagNote } from '../services/geminiService';
import EmptyState from './EmptyState';

interface Props {
  notes: Note[];
  config: AppConfig;
  addNote: (note: Note) => void;
  moveNoteToSandbox: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  deleteNote: (id: string) => void;
  updateNote: (note: Note) => void;
  archiveNote: (id: string) => void;
  reorderNote?: (draggedId: string, targetId: string) => void;
  onAddTask: (task: Task) => void;
}

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, deleteNote, updateNote, archiveNote, onAddTask }) => {
  const [content, setContent] = useState('');
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  // Filter for inbox notes
  const inboxNotes = notes.filter(n => n.status === 'inbox');

  const handleAdd = async () => {
    if (!content.trim()) return;

    setIsAutoTagging(true);
    let tags: string[] = [];
    
    // Attempt auto-tagging
    try {
       tags = await autoTagNote(content, config);
    } catch (e) {
       console.error("Tagging failed", e);
    }

    const newNote: Note = {
      id: Date.now().toString(),
      content: content,
      tags: tags,
      createdAt: Date.now(),
      status: 'inbox',
      color: 'bg-white dark:bg-[#1e293b]'
    };

    addNote(newNote);
    setContent('');
    setIsAutoTagging(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Салфетки <span className="text-blue-500 text-base md:text-lg">/ Capture</span></h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Быстрый захват мыслей. Не фильтруйте, просто пишите.</p>
        </div>
      </header>

      {/* Input Area */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-8 shrink-0 relative">
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="О чем вы думаете сейчас?"
          className="w-full h-24 md:h-20 bg-transparent outline-none resize-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-base"
          onKeyDown={(e) => {
             if (e.key === 'Enter' && e.ctrlKey) handleAdd();
          }}
        />
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
             {isAutoTagging ? <Loader2 size={12} className="animate-spin text-blue-500" /> : <Tag size={12} />}
             {isAutoTagging ? 'AI Тегирование...' : 'AI Auto-Tag'}
          </div>
          <button 
            onClick={handleAdd}
            disabled={!content.trim() || isAutoTagging}
            className="bg-slate-900 dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={14} /> <span className="hidden md:inline">Записать</span>
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0">
         {inboxNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
                <EmptyState 
                    icon={StickyNote} 
                    title="Салфетки чисты" 
                    description="Здесь будут ваши быстрые заметки и инсайты."
                    color="blue"
                />
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
               {inboxNotes.map(note => {
                  const isArchived = note.status === 'archived';
                  return (
                    <div key={note.id} className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative">
                        <div className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed whitespace-pre-wrap flex-1 max-h-60 overflow-y-auto custom-scrollbar-light">
                           <ReactMarkdown>{note.content}</ReactMarkdown>
                        </div>
                        
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                              {note.tags.map(tag => (
                                <span key={tag} className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded font-medium">#{tag}</span>
                              ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center w-full mt-auto pt-3 border-t border-slate-50 dark:border-slate-700">
                             <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Удалить заметку?')) deleteNote(note.id); }} className="p-2 -ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Удалить"><Trash2 size={14} /></button>
                             <div className="flex gap-2 justify-end">
                                {!isArchived ? (
                                    <>
                                         <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В «Действия»?')) { onAddTask({ id: Date.now().toString(), content: note.content, column: 'todo', createdAt: Date.now() }); archiveNote(note.id); } }} className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2 md:px-3 py-1.5 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-800/50" title="В Действия"><Kanban size={14} /></button>
                                         <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В «Песочницу»?')) moveNoteToSandbox(note.id); }} className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-2 md:px-3 py-1.5 rounded-lg transition-colors border border-amber-100 dark:border-amber-800/50" title="В Песочницу"><Box size={14} /></button>
                                         <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В «Библиотеку»?')) archiveNote(note.id); }} className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 md:px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 hover:border-indigo-100" title="В Библиотеку"><Library size={14} /></button>
                                    </>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Вернуть?')) moveNoteToInbox(note.id); }} className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 md:px-3 py-1.5 rounded-lg transition-colors" title="Вернуть во Входящие"><RotateCcw size={14} /></button>
                                )}
                             </div>
                        </div>
                    </div>
                  );
               })}
            </div>
         )}
      </div>
    </div>
  );
};

export default Napkins;