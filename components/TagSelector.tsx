
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Tag as TagIcon, Plus } from 'lucide-react';

interface TagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    existingTags: string[];
    placeholder?: string;
    variant?: 'default' | 'ghost';
    direction?: 'up' | 'down' | 'auto';
}

const TagSelector: React.FC<TagSelectorProps> = ({ 
    selectedTags, 
    onChange, 
    existingTags, 
    placeholder = "Добавить теги...", 
    variant = 'default', 
    direction = 'auto' 
}) => {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const handleTagChange = (newTags: string[]) => {
        const uniqueTags = Array.from(new Set(newTags));
        onChange(uniqueTags);
    };

    const calculatePosition = () => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 200; // Max height

        let openUp = false;
        if (direction === 'auto') {
            openUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
        } else {
            openUp = direction === 'up';
        }

        const style: React.CSSProperties = {
            position: 'fixed',
            left: rect.left,
            width: Math.max(rect.width, 200),
            zIndex: 99999,
        };

        if (openUp) {
            style.bottom = viewportHeight - rect.top + 4;
            style.maxHeight = Math.min(dropdownHeight, spaceAbove - 10);
        } else {
            style.top = rect.bottom + 4;
            style.maxHeight = Math.min(dropdownHeight, spaceBelow - 10);
        }
        setDropdownStyle(style);
    };

    useEffect(() => {
        if (isOpen) {
            calculatePosition();
            window.addEventListener('scroll', calculatePosition, true);
            window.addEventListener('resize', calculatePosition);
        }
        return () => {
            window.removeEventListener('scroll', calculatePosition, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                const dropdown = document.getElementById('tag-dropdown-portal');
                if (dropdown && !dropdown.contains(e.target as Node)) {
                    setIsOpen(false);
                }
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const filteredSuggestions = existingTags.filter(tag => 
        !selectedTags.some(st => st.toLowerCase() === tag.toLowerCase()) && 
        tag.toLowerCase().includes(input.toLowerCase())
    );

    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        if (selectedTags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) { 
            setInput(''); 
            setIsOpen(false); 
            return; 
        }
        
        handleTagChange([...selectedTags, existingTags.find(t => t.toLowerCase() === cleanTag.toLowerCase()) || cleanTag]);
        setInput(''); 
        setIsOpen(false);
    };

    const hasContent = input.length > 0 || filteredSuggestions.length > 0;

    return (
        <div className="relative" ref={wrapperRef}>
            <div className={`flex flex-wrap items-center gap-2 min-h-[36px] ${variant === 'ghost' ? 'px-0 py-2' : 'p-2'}`}>
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 group cursor-default bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        #{tag.replace(/^#/, '')} 
                        <button onClick={() => handleTagChange(selectedTags.filter(t => t !== tag))} className="text-slate-300 hover:text-red-500 ml-1">
                            <X size={10} strokeWidth={2} />
                        </button>
                    </span>
                ))}
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => { setInput(e.target.value); setIsOpen(true); }} 
                    onFocus={() => setIsOpen(true)} 
                    onKeyDown={(e) => { 
                        if(e.key === 'Enter') { 
                            e.preventDefault(); 
                            addTag(input); 
                        } 
                        if (e.key === 'Backspace' && input === '' && selectedTags.length > 0) {
                            handleTagChange(selectedTags.slice(0, -1));
                        }
                    }} 
                    placeholder={selectedTags.length === 0 ? placeholder : ''} 
                    className={`flex-1 min-w-[80px] bg-transparent text-xs font-sans outline-none ${variant === 'ghost' ? 'text-slate-600 dark:text-slate-300 placeholder:text-slate-300' : 'text-slate-600 dark:text-slate-300 placeholder:text-slate-400'}`} 
                />
            </div>
            {isOpen && hasContent && createPortal(
                <div 
                    id="tag-dropdown-portal"
                    className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-y-auto animate-in fade-in zoom-in-95 duration-75 custom-scrollbar-light"
                    style={dropdownStyle}
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    {input.length > 0 && !filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase()) && (
                        <button onClick={() => addTag(input)} className="w-full text-left px-3 py-2 text-xs font-sans text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 flex items-center gap-2 font-bold transition-colors">
                            <Plus size={12} /> Создать «{input}»
                        </button>
                    )}
                    {filteredSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-xs font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-medium transition-colors">
                            <TagIcon size={12} className="text-slate-400" /> {tag}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default TagSelector;
