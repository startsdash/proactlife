
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, RotateCw, Heading1, Heading2, Bold, Italic, Eraser, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { htmlToMarkdown, markdownToHtml, processImage } from '../utils/editorConverters';

interface EditorExtensions {
    images?: boolean;
    formatting?: boolean;
    headings?: boolean;
}

interface Props {
    initialContent: string;
    onChange: (markdown: string) => void;
    placeholder?: string;
    minHeight?: string;
    extensions?: EditorExtensions;
    className?: string;
    autoFocus?: boolean;
}

const UniversalEditor: React.FC<Props> = ({ 
    initialContent, 
    onChange, 
    placeholder = "Напишите что-нибудь...", 
    minHeight = "150px", 
    extensions = { images: true, formatting: true, headings: true },
    className = "",
    autoFocus = false
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // History Stack
    const [history, setHistory] = useState<string[]>([markdownToHtml(initialContent)]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
    const lastSelectionRange = useRef<Range | null>(null);
    const isInitializedRef = useRef(false);

    // Initial Load
    useEffect(() => {
        if (!isInitializedRef.current && editorRef.current) {
            editorRef.current.innerHTML = history[0];
            isInitializedRef.current = true;
            if (autoFocus) {
                // Focus at end of text
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }
    }, []);

    // Save History & Propagate Change
    const saveSnapshot = useCallback((htmlContent: string) => {
        // Debounce actual history push to avoid char-by-char undo
        if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        
        historyTimeoutRef.current = setTimeout(() => {
            setHistory(prev => {
                const current = prev[historyIndex];
                if (htmlContent === current) return prev;
                
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(htmlContent);
                if (newHistory.length > 50) newHistory.shift(); // Limit stack
                return newHistory;
            });
            setHistoryIndex(prev => Math.min(prev + 1, 50));
            
            // Convert to MD and notify parent
            const md = htmlToMarkdown(htmlContent);
            onChange(md);
        }, 600);
    }, [historyIndex, onChange]);

    const handleInput = () => {
        if (editorRef.current) {
            // Immediate update for parent (optional, but good for responsiveness)
            // const md = htmlToMarkdown(editorRef.current.innerHTML);
            // onChange(md); 
            // We use the debounced saveSnapshot to trigger onChange to avoid perf hit on heavy MD conversion
            saveSnapshot(editorRef.current.innerHTML);
        }
    };

    // --- SELECTION & CURSOR ---
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
            lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (sel && lastSelectionRange.current) {
            sel.removeAllRanges();
            sel.addRange(lastSelectionRange.current);
        }
    };

    // --- COMMANDS ---
    const execCmd = (command: string, value: string | undefined = undefined) => {
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        if (editorRef.current) saveSnapshot(editorRef.current.innerHTML);
    };

    const handleUndo = (e: React.MouseEvent) => {
        e.preventDefault();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
                onChange(htmlToMarkdown(history[newIndex]));
            }
        }
    };

    const handleRedo = (e: React.MouseEvent) => {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
                onChange(htmlToMarkdown(history[newIndex]));
            }
        }
    };

    // --- IMAGE HANDLING ---
    const insertImageAtCursor = (base64: string) => {
        restoreSelection();
        editorRef.current?.focus();
        
        // Use execCommand insertImage for better undo/redo support compared to manual DOM manipulation
        // However, standard insertImage only takes URL. 
        document.execCommand('insertImage', false, base64);
        
        // Clean up styles immediately after insertion if possible, 
        // or just rely on CSS rules for img tags in the editor.
        if (editorRef.current) saveSnapshot(editorRef.current.innerHTML);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                insertImageAtCursor(base64);
            } catch (err) { console.error("Upload failed", err); }
            e.target.value = '';
        }
    };

    const handlePaste = async (e: ClipboardEvent) => {
        // If pasting text, let default handle it (browser usually handles plain text okay-ish)
        // If pasting image, intercept.
        const items = e.clipboardData?.items;
        if (!items) return;

        let hasImage = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                hasImage = true;
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    try {
                        const base64 = await processImage(blob);
                        insertImageAtCursor(base64);
                    } catch (err) { console.error("Paste failed", err); }
                }
                break; // Handle one image at a time
            }
        }
    };

    useEffect(() => {
        const el = editorRef.current;
        if (el) {
            el.addEventListener('paste', handlePaste);
            return () => el.removeEventListener('paste', handlePaste);
        }
    }, []);

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            if (activeImage && activeImage !== target) activeImage.style.outline = 'none';
            target.style.outline = '3px solid #6366f1'; 
            target.style.borderRadius = '4px';
            setActiveImage(target as HTMLImageElement);
        } else {
            if (activeImage) { activeImage.style.outline = 'none'; setActiveImage(null); }
        }
        saveSelection();
    };

    const deleteActiveImage = (e?: React.MouseEvent) => {
        if(e) { e.preventDefault(); e.stopPropagation(); }
        if (activeImage) {
            activeImage.remove();
            setActiveImage(null);
            if (editorRef.current) saveSnapshot(editorRef.current.innerHTML);
        }
    };

    // --- KEYBOARD SHORTCUTS ---
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo
                if (historyIndex < history.length - 1) {
                    const newIndex = historyIndex + 1;
                    setHistoryIndex(newIndex);
                    if (editorRef.current) {
                        editorRef.current.innerHTML = history[newIndex];
                        onChange(htmlToMarkdown(history[newIndex]));
                    }
                }
            } else {
                // Undo
                if (historyIndex > 0) {
                    const newIndex = historyIndex - 1;
                    setHistoryIndex(newIndex);
                    if (editorRef.current) {
                        editorRef.current.innerHTML = history[newIndex];
                        onChange(htmlToMarkdown(history[newIndex]));
                    }
                }
            }
        }
    };

    return (
        <div className={`flex flex-col w-full ${className}`}>
            
            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-2 mb-2 shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mask-fade-right">
                    <Tooltip content="Отменить"><button onMouseDown={handleUndo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30 transition-colors"><RotateCcw size={16} /></button></Tooltip>
                    <Tooltip content="Повторить"><button onMouseDown={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30 transition-colors"><RotateCw size={16} /></button></Tooltip>
                    
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                    
                    {extensions.headings && (
                        <>
                            <Tooltip content="Заголовок 1"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H1'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 transition-colors"><Heading1 size={16} /></button></Tooltip>
                            <Tooltip content="Заголовок 2"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H2'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 transition-colors"><Heading2 size={16} /></button></Tooltip>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                        </>
                    )}

                    {extensions.formatting && (
                        <>
                            <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 transition-colors"><Bold size={16} /></button></Tooltip>
                            <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 transition-colors"><Italic size={16} /></button></Tooltip>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                            <Tooltip content="Очистить стиль"><button onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); execCmd('formatBlock', 'div'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 transition-colors"><Eraser size={16} /></button></Tooltip>
                        </>
                    )}

                    {extensions.images && (
                        <>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                            <Tooltip content="Вставить картинку">
                                <label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 transition-colors flex items-center justify-center">
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    <ImageIcon size={16} />
                                </label>
                            </Tooltip>
                            {activeImage && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors"><Trash2 size={16} /></button></Tooltip>}
                        </>
                    )}
                </div>
            </div>

            {/* EDITOR AREA */}
            <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={saveSelection}
                onMouseUp={() => { saveSelection(); }}
                onKeyUp={(e) => { saveSelection(); handleKeyDown(e); }}
                onClick={handleEditorClick}
                className="w-full flex-1 outline-none text-base text-slate-700 dark:text-slate-200 leading-relaxed font-serif break-words overflow-y-auto custom-scrollbar-ghost [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:font-sans [&_h1]:text-slate-900 [&_h1]:dark:text-slate-100 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-slate-900 [&_h2]:dark:text-slate-100 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-2"
                style={{ minHeight: minHeight, whiteSpace: 'pre-wrap' }}
                data-placeholder={placeholder}
            />
        </div>
    );
};

export default UniversalEditor;
