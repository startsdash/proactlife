
import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Heading1, Heading2, Heading3, Heading4, Type, Palette, ChevronDown, Check } from 'lucide-react';

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

const COLORS = [
  { label: 'Красный', color: '#ef4444' }, // red-500
  { label: 'Оранжевый', color: '#f97316' }, // orange-500
  { label: 'Янтарь', color: '#f59e0b' }, // amber-500
  { label: 'Изумруд', color: '#10b981' }, // emerald-500
  { label: 'Синий', color: '#3b82f6' }, // blue-500
  { label: 'Индиго', color: '#6366f1' }, // indigo-500
  { label: 'Фиолетовый', color: '#a855f7' }, // purple-500
  { label: 'Розовый', color: '#ec4899' }, // pink-500
  { label: 'Серый', color: '#64748b' }, // slate-500
];

const MarkdownToolbar: React.FC<Props> = ({ textareaRef, value, onChange }) => {
  const [showHeadings, setShowHeadings] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const headingsRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headingsRef.current && !headingsRef.current.contains(event.target as Node)) {
        setShowHeadings(false);
      }
      if (colorsRef.current && !colorsRef.current.contains(event.target as Node)) {
        setShowColors(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertText = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    let newText = '';
    let newCursorPos = 0;

    // Handle block formatting (Headers) specifically to ensure they start on a new line or valid position
    if (prefix.trim().startsWith('#')) {
        // Check if we are at the start of a line
        const lastNewLine = beforeText.lastIndexOf('\n');
        const charsBeforeOnLine = beforeText.substring(lastNewLine + 1);
        
        // If line already has a header, replace it
        if (/^#+\s/.test(charsBeforeOnLine)) {
             const cleanLineStart = charsBeforeOnLine.replace(/^#+\s/, '');
             const newBeforeText = beforeText.substring(0, lastNewLine + 1) + cleanLineStart;
             newText = newBeforeText + prefix + selectedText + suffix + afterText;
             newCursorPos = start - charsBeforeOnLine.length + prefix.length + selectedText.length;
        } else {
            // Just insert
            newText = beforeText + prefix + selectedText + suffix + afterText;
            newCursorPos = start + prefix.length + selectedText.length;
        }
    } else {
        // Standard wrapping
        newText = beforeText + prefix + selectedText + suffix + afterText;
        newCursorPos = start + prefix.length + selectedText.length; // Cursor after selection
    }

    onChange(newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const applyColor = (hex: string) => {
    insertText(`<span style="color: ${hex}">`, '</span>');
    setShowColors(false);
  };

  return (
    <div className="flex items-center gap-1 p-1 border-b border-slate-100 bg-slate-50/50 rounded-t-xl overflow-x-auto scrollbar-none">
      {/* HEADINGS DROPDOWN */}
      <div className="relative" ref={headingsRef}>
        <button 
          onClick={() => setShowHeadings(!showHeadings)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all flex items-center gap-1"
          title="Заголовки"
        >
          <Type size={16} />
          <ChevronDown size={10} />
        </button>
        
        {showHeadings && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 min-w-[140px] p-1 flex flex-col gap-1">
                <button onClick={() => { insertText('# '); setShowHeadings(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md text-left font-bold text-lg"><Heading1 size={16}/> H1</button>
                <button onClick={() => { insertText('## '); setShowHeadings(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md text-left font-bold text-base"><Heading2 size={16}/> H2</button>
                <button onClick={() => { insertText('### '); setShowHeadings(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md text-left font-bold text-sm"><Heading3 size={16}/> H3</button>
                <button onClick={() => { insertText('#### '); setShowHeadings(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md text-left font-bold text-xs"><Heading4 size={16}/> H4</button>
            </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      {/* STANDARD FORMATTING */}
      <button onClick={() => insertText('**', '**')} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all" title="Жирный"><Bold size={16} /></button>
      <button onClick={() => insertText('*', '*')} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all" title="Курсив"><Italic size={16} /></button>
      <button onClick={() => insertText('<u>', '</u>')} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all" title="Подчеркнутый"><Underline size={16} /></button>
      
      <div className="w-px h-4 bg-slate-200 mx-1" />

      {/* COLOR PICKER */}
       <div className="relative" ref={colorsRef}>
        <button 
          onClick={() => setShowColors(!showColors)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all flex items-center gap-1"
          title="Цвет текста"
        >
          <Palette size={16} />
          <ChevronDown size={10} />
        </button>
        
        {showColors && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 w-[180px] p-2 grid grid-cols-5 gap-2">
                {COLORS.map(c => (
                    <button 
                        key={c.color}
                        onClick={() => applyColor(c.color)}
                        className="w-6 h-6 rounded-full border border-slate-100 hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                    />
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownToolbar;
