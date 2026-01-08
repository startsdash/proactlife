
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Bold, Italic, Eraser, Image as ImageIcon, Heading1, Heading2, 
    RotateCcw, RotateCw, Layout, Palette, Trash2, Maximize2 
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import TagSelector from './TagSelector';
import { htmlToMarkdown, markdownToHtml, processImage } from '../utils/editorConverters';

// --- CONSTANTS ---
const COLORS = [
    { id: 'white', hex: '#ffffff' },
    { id: 'red', hex: '#fef2f2' },
    { id: 'amber', hex: '#fffbeb' },
    { id: 'emerald', hex: '#ecfdf5' },
    { id: 'blue', hex: '#eff6ff' },
    { id: 'indigo', hex: '#eef2ff' },
    { id: 'purple', hex: '#faf5ff' },
];

export interface EditorExtensions {
    images?: boolean;
    tags?: boolean;
    cover?: boolean;
    color?: boolean;
    formatting?: boolean;
}

interface UniversalEditorProps {
    initialContent?: string;
    onChange?: (markdown: string) => void;
    onTitleChange?: (title: string) => void;
    title?: string;
    
    // Extensions
    extensions?: EditorExtensions;
    
    // Tag Props
    tags?: string[];
    existingTags?: string[];
    onTagsChange?: (tags: string[]) => void;
    
    // Metadata Props
    coverUrl?: string;
    onCoverChange?: (url: string | null) => void;
    color?: string;
    onColorChange?: (color: string) => void;
    
    // Styling
    placeholder?: string;
    minHeight?: string;
    className?: string;
    autoFocus?: boolean;
}

// Cover Picker (Internal)
const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => {
    // Simplified for internal use, assumes parent handles positioning or fixed center
    const presets = [
        'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
        'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
    ];

    return (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 w-64">
            <div className="grid grid-cols-2 gap-2 mb-2">
                {presets.map((url, i) => (
                    <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500">
                        <img src={url} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
            <label className="block w-full text-center py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                Загрузить свою
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        try { onSelect(await processImage(file)); onClose(); } catch {}
                    }
                }} />
            </label>
        </div>
    );
};

const UniversalEditor: React.FC<UniversalEditorProps> = ({
    initialContent = '',
    onChange,
    title,
    onTitleChange,
    extensions = { formatting: true, images: true } as EditorExtensions,
    tags = [],
    existingTags = [],
    onTagsChange,
    coverUrl,
    onCoverChange,
    color = 'white',
    onColorChange,
    placeholder = "Start typing...",
    minHeight = '150px',
    className = '',
    autoFocus = false
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // History Management
    const [history, setHistory] = useState<string[]>([markdownToHtml(initialContent)]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // UI State
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
    
    // Init content
    useEffect(() => {
        if (editorRef.current && !editorRef.current.innerHTML) {
            const html = markdownToHtml(initialContent);
            editorRef.current.innerHTML = html;
            if(autoFocus) {
                // Focus at end of text
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }
    }, []); // Only runs on mount

    const saveSnapshot = (content: string) => {
        if (content === history[historyIndex]) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 50) newHistory.shift();
        else setHistoryIndex(newHistory.length - 1);
        setHistory(newHistory);
    };

    const handleInput = () => {
        if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = setTimeout(() => {
            if (editorRef.current) {
                const html = editorRef.current.innerHTML;
                saveSnapshot(html);
                if (onChange) onChange(htmlToMarkdown(html));
            }
        }, 500);
    };

    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
            handleInput(); // Immediate save on command
        }
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
                if (onChange) onChange(htmlToMarkdown(history[newIndex]));
            }
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
                if (onChange) onChange(htmlToMarkdown(history[newIndex]));
            }
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        if (!extensions.images) return;
        const items = e.clipboardData.items;
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

    const insertImage = (base64: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            execCmd('insertImage', base64);
            // Find the image and style it
            const imgs = editorRef.current.querySelectorAll('img');
            const lastImg = imgs[imgs.length - 1];
            if (lastImg) {
                lastImg.style.maxWidth = '100%';
                lastImg.style.borderRadius = '8px';
                lastImg.style.marginTop = '8px';
                lastImg.style.marginBottom = '8px';
            }
            handleInput();
        }
    };

    const handleImageClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            setActiveImage(target as HTMLImageElement);
            target.style.outline = '2px solid #6366f1';
        } else {
            if (activeImage) {
                activeImage.style.outline = 'none';
                setActiveImage(null);
            }
        }
    };

    const deleteActiveImage = (e: React.MouseEvent) => {
        e.preventDefault();
        if (activeImage) {
            activeImage.remove();
            setActiveImage(null);
            handleInput();
        }
    };

    return (
        <div className={`flex flex-col relative ${className}`}>
            {/* Cover Image */}
            {extensions.cover && coverUrl && (
                <div className="relative w-full h-32 md:h-40 group rounded-t-xl overflow-hidden mb-4 shrink-0">
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    {onCoverChange && (
                        <button 
                            onClick={() => onCoverChange(null)} 
                            className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Title Input */}
            {onTitleChange && (
                <input 
                    type="text" 
                    placeholder="Название" 
                    value={title || ''} 
                    onChange={(e) => onTitleChange(e.target.value)} 
                    className="w-full bg-transparent text-xl font-sans font-bold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-300 mb-2 px-1" 
                />
            )}

            {/* Editor Area */}
            <div 
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onClick={handleImageClick}
                onPaste={handlePaste}
                className="w-full outline-none text-base text-slate-700 dark:text-slate-200 leading-relaxed font-serif px-1 py-2 overflow-y-auto custom-scrollbar-ghost [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                style={{ minHeight, whiteSpace: 'pre-wrap' }}
                data-placeholder={placeholder}
            />

            {/* Tags */}
            {extensions.tags && onTagsChange && (
                <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <TagSelector 
                        selectedTags={tags} 
                        onChange={onTagsChange} 
                        existingTags={existingTags} 
                        variant="ghost"
                        direction='up'
                    />
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 mask-fade-right flex-1">
                    <Tooltip content="Отменить">
                        <button onMouseDown={(e) => { e.preventDefault(); undo(); }} disabled={historyIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30 transition-colors"><RotateCcw size={16} /></button>
                    </Tooltip>
                    <Tooltip content="Повторить">
                        <button onMouseDown={(e) => { e.preventDefault(); redo(); }} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30 transition-colors"><RotateCw size={16} /></button>
                    </Tooltip>
                    
                    {extensions.formatting && (
                        <>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
                            <Tooltip content="H1"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H1'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Heading1 size={16} /></button></Tooltip>
                            <Tooltip content="H2"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H2'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Heading2 size={16} /></button></Tooltip>
                            <Tooltip content="Bold"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                            <Tooltip content="Italic"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
                            <Tooltip content="Clear"><button onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                        </>
                    )}

                    {extensions.images && (
                        <>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
                            <Tooltip content="Image">
                                <label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center">
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) insertImage(await processImage(file));
                                        e.target.value = ''; // Reset
                                    }} />
                                    <ImageIcon size={16} />
                                </label>
                            </Tooltip>
                            {activeImage && (
                                <Tooltip content="Delete Image">
                                    <button onMouseDown={deleteActiveImage} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </Tooltip>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {extensions.cover && onCoverChange && (
                        <div className="relative">
                            <Tooltip content="Cover">
                                <button onMouseDown={(e) => { e.preventDefault(); setShowCoverPicker(!showCoverPicker); setShowColorPicker(false); }} className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${coverUrl ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                    <Layout size={16} />
                                </button>
                            </Tooltip>
                            {showCoverPicker && <CoverPicker onSelect={onCoverChange} onClose={() => setShowCoverPicker(false)} />}
                        </div>
                    )}
                    {extensions.color && onColorChange && (
                        <div className="relative">
                            <Tooltip content="Color">
                                <button onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker); setShowCoverPicker(false); }} className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${color !== 'white' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                    <Palette size={16} />
                                </button>
                            </Tooltip>
                            {showColorPicker && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-50">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c.id} 
                                            onMouseDown={(e) => { e.preventDefault(); onColorChange(c.id); setShowColorPicker(false); }} 
                                            className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform ${color === c.id ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`} 
                                            style={{ backgroundColor: c.hex }} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UniversalEditor;
