import React, { useState, useRef, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note, AppConfig, Task, JournalEntry, SketchItem } from '../types';
import { 
  Box, Kanban, Book, Tablet, Library, RotateCcw, Trash2, 
  Plus, Search, X, Mic, StopCircle, Copy, Check, Palette, StickyNote
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { applyTypography } from '../constants';
import { autoTagNote } from '../services/geminiService';

interface Props {
  notes: Note[];
  config: AppConfig;
  addNote: (note: Note) => void;
  moveNoteToSandbox: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  deleteNote: (id: string) => void;
  reorderNote: (draggedId: string, targetId: string) => void;
  updateNote: (note: Note) => void;
  archiveNote: (id: string) => void;
  onAddTask: (task: Task) => void;
  onAddJournalEntry: (entry: JournalEntry) => void;
  addSketchItem: (item: SketchItem) => void;
}

const CARD_COLORS: Record<string, string> = {
    white: 'bg-white dark:bg-[#1e293b]',
    red: 'bg-rose-50 dark:bg-rose-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    green: 'bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
    purple: 'bg-violet-50 dark:bg-violet-900/20',
};

const NapkinCard = ({ note, handlers }: { note: Note, handlers: Props }) => {
    const isArchived = note.status === 'archived';
    
    const handleToJournal = (e: React.MouseEvent) => {
        e.stopPropagation();
        handlers.onAddJournalEntry({
            id: Date.now().toString(),
            date: Date.now(),
            content: note.content,
            title: note.title,
            isInsight: false
        });
        if(window.confirm('Заметка скопирована в Дневник. Архивировать оригинал?')) {
            handlers.archiveNote(note.id);
        }
    };

    const handleToSketchpad = (e: React.MouseEvent) => {
        e.stopPropagation();
        handlers.addSketchItem({
            id: Date.now().toString(),
            type: 'text',
            content: note.content,
            createdAt: Date.now(),
            rotation: (Math.random() - 0.5) * 10,
            color: 'white'
        });
        if(window.confirm('Заметка отправлена в Скетчпад. Архивировать оригинал?')) {
            handlers.archiveNote(note.id);
        }
    };

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        handlers.archiveNote(note.id);
    };

    const copyToClipboard = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(note.content);
        // Visual feedback could be added here
    };

    return (
        <div className={`relative group/card rounded-3xl p-6 transition-all duration-300 hover:shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col min-h-[180px] ${CARD_COLORS[note.color || 'white'] || CARD_COLORS.white}`}>
            <div className="flex-1 mb-12">
                {note.title && (
                    <h3 className="font-sans font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{note.title}</h3>
                )}
                <div className="prose prose-sm dark:prose-invert font-serif leading-relaxed text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {applyTypography(note.content)}
                    </ReactMarkdown>
                </div>
                {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {note.tags.map(tag => (
                            <span key={tag} className="text-[10px] text-slate-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Actions Overlay */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end rounded-b-3xl pointer-events-none">
                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm pointer-events-auto">
                    {!isArchived ? (
                        <>
                            <Tooltip content="В хаб"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В хаб?')) handlers.moveNoteToSandbox(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Box size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В спринты"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В спринты?')) { handlers.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); handlers.archiveNote(note.id); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Kanban size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В дневник"><button onClick={handleToJournal} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Book size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            {handlers.addSketchItem && <Tooltip content="В скетчпад"><button onClick={handleToSketchpad} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Tablet size={16} strokeWidth={1.5} /></button></Tooltip>}

                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <Tooltip content="В архив">
                                <button onClick={handleArchive} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Library size={16} strokeWidth={1.5} /></button>
                            </Tooltip>
                        </>
                    ) : (
                        <Tooltip content="Вернуть во входящие">
                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Вернуть во входящие?')) { handlers.moveNoteToInbox(note.id); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><RotateCcw size={16} strokeWidth={1.5} /></button>
                        </Tooltip>
                    )}
                </div>
                
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Удалить заметку?')) handlers.deleteNote(note.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 text-[8px] font-mono text-slate-300 dark:text-slate-600 uppercase tracking-widest opacity-0 group-hover/card:opacity-100 transition-opacity">
                ID // {note.id.slice(-5).toLowerCase()}
            </div>
        </div>
    );
};

const Napkins: React.FC<Props> = (props) => {
  const { notes, addNote } = props;
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const filteredNotes = notes.filter(n => 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (n.tags && n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleCreate = async () => {
      if (!inputText.trim()) return;
      
      const newNote: Note = {
          id: Date.now().toString(),
          content: inputText,
          createdAt: Date.now(),
          status: 'inbox',
          tags: [],
          connectedNoteIds: [],
          color: 'white'
      };

      addNote(newNote);
      setInputText('');
      
      // Auto-tagging in background
      try {
          const tags = await autoTagNote(newNote.content, props.config);
          if (tags && tags.length > 0) {
              props.updateNote({ ...newNote, tags });
          }
      } catch (e) { console.error(e); }
  };

  const toggleRecording = () => {
      if (isRecording) {
          recognitionRef.current?.stop();
          setIsRecording(false);
      } else {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SpeechRecognition) {
              recognitionRef.current = new SpeechRecognition();
              recognitionRef.current.continuous = true;
              recognitionRef.current.interimResults = true;
              recognitionRef.current.lang = 'ru-RU';
              
              recognitionRef.current.onresult = (event: any) => {
                  const transcript = Array.from(event.results)
                      .map((result: any) => result[0])
                      .map((result) => result.transcript)
                      .join('');
                  setInputText(prev => {
                      // Append to existing text if needed, here we just replace or append
                      // A simple strategy is to append
                      return transcript; 
                  });
              };
              
              recognitionRef.current.start();
              setIsRecording(true);
          } else {
              alert("Speech recognition not supported in this browser.");
          }
      }
  };

  const breakpointColumnsObj = {
    default: 3,
    1100: 2,
    700: 1
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 overflow-hidden">
        {/* Header Area */}
        <div className="flex justify-between items-start mb-8 shrink-0">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Заметки</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Буфер обмена сознания</p>
            </div>
            
            <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-48 focus:w-64"
                />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>}
            </div>
        </div>

        {/* Input Area */}
        <div className="max-w-2xl mx-auto w-full mb-10 relative z-20 shrink-0">
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 p-2 transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 relative">
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate(); } }}
                    placeholder="О чем ты думаешь?"
                    className="w-full bg-transparent border-none outline-none p-4 min-h-[100px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none font-serif text-lg leading-relaxed rounded-2xl"
                />
                
                <div className="flex justify-between items-center px-4 pb-2">
                    <div className="flex gap-2">
                        <button 
                            onClick={toggleRecording} 
                            className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600'}`}
                        >
                            {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                        </button>
                    </div>
                    <button 
                        onClick={handleCreate}
                        disabled={!inputText.trim()}
                        className="bg-slate-900 dark:bg-white text-white dark:text-black p-3 rounded-xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                        <Plus size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>

        {/* Masonry Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-2 -mx-2 pb-20">
            <Masonry
                breakpointCols={breakpointColumnsObj}
                className="my-masonry-grid"
                columnClassName="my-masonry-grid_column"
            >
                {filteredNotes.map(note => (
                    <div key={note.id} className="mb-6">
                        <NapkinCard note={note} handlers={props} />
                    </div>
                ))}
            </Masonry>
            
            {filteredNotes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <StickyNote size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-400 font-serif italic">Здесь пока пусто...</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default Napkins;