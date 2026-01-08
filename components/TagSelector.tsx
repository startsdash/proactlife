
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Tag as TagIcon } from 'lucide-react';

interface TagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    existingTags: string[];
    placeholder?: string;
    variant?: 'default' | 'ghost';
    direction?: 'up' | 'down';
}

export const TagSelector: React.FC<TagSelectorProps> = ({ selectedTags, onChange, existingTags, placeholder = "Добавить теги...", variant = 'default', direction = 'down' }) => {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const handleTagChange = (newTags: string[]) => {
        const uniqueTags = Array.from(new Set(newTags));
        onChange(uniqueTags);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isWrapper = wrapperRef.current && wrapperRef.current.contains(target);
            const isDropdown = dropdownRef.current && dropdownRef.current.contains(target);
            
            if (!isWrapper && !isDropdown) {
                setIsOpen(false);
            }
        };
        
        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('scroll', handleScroll, true); 
            window.addEventListener('resize', handleScroll);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const style: React.CSSProperties = {
                position: 'fixed',
                left: rect.left,
                width: Math.max(rect.width, 200),
                zIndex: 99999,
            };
            
            if (direction === 'down') {
                style.top = rect.bottom + 4;
            } else {
                style.bottom = window.innerHeight - rect.top + 4;
            }
            setDropdownStyle(style);
        }
    }, [isOpen, direction]);

    const filteredSuggestions = existingTags.filter(tag => !selectedTags.some(st => st.toLowerCase() === tag.toLowerCase()) && tag.toLowerCase().includes(input.toLowerCase()));

    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        if (selectedTags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) { setInput(''); setIsOpen(false); return; }
        
        handleTagChange([...selectedTags, existingTags.find(t => t.toLowerCase() === cleanTag.toLowerCase()) || cleanTag]);
        setInput(''); setIsOpen(false);
    };

    const hasContent = input.length > 0 || filteredSuggestions.length > 0;

    return (
        <div className="relative portal-popup" ref={wrapperRef}>
            <div className={`flex flex-wrap items-center gap-3 min-h-[36px] ${variant === 'ghost' ? 'px-0 py-2' : 'p-2'}`}>
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 group cursor-default">
                        #{tag.replace(/^#/, '')} 
                        <button onClick={() => handleTagChange(selectedTags.filter(t => t !== tag))} className="text-slate-300 hover:text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={10} strokeWidth={2} />
                        </button>
                    </span>
                ))}
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => { setInput(e.target.value); setIsOpen(true); }} 
                    onFocus={() => setIsOpen(true)} 
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addTag(input); } }} 
                    placeholder={selectedTags.length === 0 ? placeholder : ''} 
                    className={`flex-1 min-w-[80px] bg-transparent text-xs font-sans outline-none ${variant === 'ghost' ? 'text-slate-600 dark:text-slate-300 placeholder:text-slate-300' : 'text-slate-600 dark:text-slate-300 placeholder:text-slate-400'}`} 
                />
            </div>
            {isOpen && hasContent && createPortal(
                <div 
                    ref={dropdownRef}
                    className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-75 portal-popup"
                    style={dropdownStyle}
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    {input.length > 0 && !filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase()) && (
                        <button onClick={() => addTag(input)} className="w-full text-left px-3 py-2 text-xs font-sans text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold"><Plus size={12} /> Создать «{input}»</button>
                    )}
                    {filteredSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-xs font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"><TagIcon size={12} className="text-slate-400" /> {tag}</button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};
