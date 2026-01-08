
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { htmlToMarkdown, markdownToHtml, processImage } from '../utils/editorConverters';
import { TagSelector } from './TagSelector';
import { Bold, Italic, Heading1, Heading2, Eraser, Image as ImageIcon, RotateCcw, RotateCw, Trash2, Layout, Palette } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface EditorExtensions {
    formatting?: boolean;
    images?: boolean;
    tags?: boolean;
    cover?: boolean;
    color?: boolean;
}

interface UniversalEditorProps {
    initialContent: string;
    onChange: (markdown: string) => void;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
    className?: string;
    extensions?: EditorExtensions;
    
    // Optional Extras
    tags?: string[];
    onTagsChange?: (tags: string[]) => void;
    allTags?: string[];
    
    // Actions/Toolbar Slots
    extraToolbarItems?: React.ReactNode;
    footerContent?: React.ReactNode;
}

export const UniversalEditor: React.FC<UniversalEditorProps> = ({ 
    initialContent, 
    onChange, 
    placeholder = "Type something...", 
    minHeight = "140px",
    maxHeight = "none",
    className = "",
    extensions = { formatting: true, images: true, tags: false },
    tags = [],
    onTagsChange,
    allTags = [],
    extraToolbarItems,
    footerContent
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [history, setHistory] = useState<string[]>(['']);
    const [historyIndex, setHistoryIndex] = useState(0);
    const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
    const lastSelectionRange = useRef<Range | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Initial Load
    useEffect(() => {
        if (editorRef.current) {
            const html = markdownToHtml(initialContent);
            if (editorRef.current.innerHTML !== html) {
                editorRef.current.innerHTML = html;
                setHistory([html]);
                setHistoryIndex(0);
            }
        }
    }, [initialContent]);

    // History & Change Management
    const saveSnapshot = useCallback((content: string) => {
        if (content === history[historyIndex]) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        
        // Notify Parent
        onChange(htmlToMarkdown(content));
    }, [history, historyIndex, onChange]);

    const handleInput = () => {
        if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = setTimeout(() => {
            if (editorRef.current) saveSnapshot(editorRef.current.innerHTML);
        }, 500);
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
            saveSnapshot(editorRef.current.innerHTML);
        }
    };

    const undo = (e: React.MouseEvent) => {
        e.preventDefault();
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            setHistoryIndex(prevIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[prevIndex];
                onChange(htmlToMarkdown(history[prevIndex]));
            }
        }
    };

    const redo = (e: React.MouseEvent) => {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            setHistoryIndex(nextIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[nextIndex];
                onChange(htmlToMarkdown(history[nextIndex]));
            }
        }
    };

    // Selection Handling
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
                lastSelectionRange.current = range.cloneRange();
            }
        }
    };

    // Image Handling
    const insertImage = (base64: string) => {
        if (!editorRef.current) return;
        
        editorRef.current.focus();
        let range = lastSelectionRange.current;
        
        if (!range || !editorRef.current.contains(range.commonAncestorContainer)) {
             range = document.createRange();
             range.selectNodeContents(editorRef.current);
             range.collapse(false);
        }

        const img = document.createElement('img');
        img.src = base64;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.display = 'block';
        img.style.margin = '8px 0';
        img.style.cursor = 'pointer';
        
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.setEndAfter(img);
        
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        
        saveSnapshot(editorRef.current.innerHTML);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                insertImage(base64);
            } catch (err) {
                console.error(err);
            }
            e.target.value = '';
        }
    };

    // Paste Handling
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (!editorRef.current || !editorRef.current.contains(document.activeElement)) return;
            
            const items = e.clipboardData?.items;
            if (!items) return;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const base64 = await processImage(blob);
                        insertImage(base64);
                    }
                }
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, []);

    // Click on Image to Select
    const handleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            if (activeImage) activeImage.style.outline = 'none';
            const img = target as HTMLImageElement;
            img.style.outline = '3px solid #6366f1'; 
            img.style.borderRadius = '4px';
            setActiveImage(img);
        } else {
            if (activeImage) { 
                activeImage.style.outline = 'none'; 
                setActiveImage(null); 
            }
        }
        saveSelection();
    };

    const deleteActiveImage = (e: React.MouseEvent) => {
        e.preventDefault();
        if (activeImage) {
            activeImage.remove();
            setActiveImage(null);
            if (editorRef.current) saveSnapshot(editorRef.current.innerHTML);
        }
    };

    return (
        <div className={`flex flex-col ${className}`}>
            <div 
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onClick={handleClick}
                onBlur={saveSelection}
                onKeyUp={saveSelection}
                onFocus={() => setIsFocused(true)}
                className={`
                    w-full outline-none text-base text-slate-700 dark:text-slate-200 leading-relaxed font-serif 
                    [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:font-sans 
                    [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:font-sans 
                    [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1
                    empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400
                `}
                style={{ minHeight, maxHeight, whiteSpace: 'pre-wrap', overflowY: maxHeight !== 'none' ? 'auto' : 'visible' }}
                data-placeholder={placeholder}
            />

            {extensions.tags && onTagsChange && (
                <div className="pt-2">
                    <TagSelector 
                        selectedTags={tags} 
                        onChange={onTagsChange} 
                        existingTags={allTags} 
                        variant="ghost"
                        direction="up"
                    />
                </div>
            )}

            {/* Toolbar Area */}
            {(extensions.formatting || extensions.images || extraToolbarItems) && (
                <div className="flex items-center justify-between pt-3 gap-2 border-t border-black/5 dark:border-white/5 mt-2">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 mask-fade-right">
                        {extensions.formatting && (
                            <>
                                <Tooltip content="Отменить"><button onMouseDown={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCcw size={18} /></button></Tooltip>
                                <Tooltip content="Повторить"><button onMouseDown={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCw size={18} /></button></Tooltip>
                                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Заголовок 1"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H1'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Heading1 size={18} /></button></Tooltip>
                                <Tooltip content="Заголовок 2"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H2'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Heading2 size={18} /></button></Tooltip>
                                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Bold size={18} /></button></Tooltip>
                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Italic size={18} /></button></Tooltip>
                                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Очистить стиль"><button onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); execCmd('formatBlock', 'div'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={18} /></button></Tooltip>
                            </>
                        )}
                        
                        {extensions.images && (
                            <>
                                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Картинка">
                                    <label className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center">
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        <ImageIcon size={18} />
                                    </label>
                                </Tooltip>
                                {activeImage && (
                                    <Tooltip content="Удалить фото">
                                        <button onMouseDown={deleteActiveImage} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </Tooltip>
                                )}
                            </>
                        )}
                        
                        {extraToolbarItems}
                    </div>
                    
                    {footerContent}
                </div>
            )}
        </div>
    );
};
