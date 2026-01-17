
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry, Flashcard, Habit, Module } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, Clock, Diamond, Tablet, Book, BrainCircuit, Star, Pause, Play, Maximize2, Zap, Circle, Gem, Aperture, Layers, Filter } from 'lucide-react';

interface Props {
  notes: Note[];
  flashcards?: Flashcard[];
  tasks?: Task[];
  habits?: Habit[];
  sketchItems?: SketchItem[];
  config: AppConfig;
  addNote: (note: Note) => void;
  moveNoteToSandbox: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  archiveNote: (id: string) => void;
  deleteNote: (id: string) => void;
  reorderNote: (draggedId: string, targetId: string) => void;
  updateNote: (note: Note) => void;
  onAddTask: (task: Task) => void;
  onAddJournalEntry: (entry: JournalEntry) => void;
  addSketchItem?: (item: SketchItem) => void;
  deleteSketchItem?: (id: string) => void;
  updateSketchItem?: (item: SketchItem) => void;
  
  deleteFlashcard: (id: string) => void;
  toggleFlashcardStar: (id: string) => void;

  defaultTab?: 'inbox' | 'library' | 'flashcards';
  initialNoteId?: string | null;
  onClearInitialNote?: () => void;
  journalEntries?: JournalEntry[];
  onNavigate: (module: Module) => void;
  onNavigateToItem?: (module: Module, itemId: string) => void;
}

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const ORACLE_VIBES = [
    { id: 'cosmos', icon: Gem, label: 'Инсайт', color: 'from-indigo-500 to-purple-600', text: 'text-indigo-100' },
    { id: 'fire', icon: Zap, label: 'Энергия', color: 'from-orange-500 to-red-600', text: 'text-orange-100' },
    { id: 'zen', icon: Circle, label: 'Дзен', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-100' },
    { id: 'luck', icon: Dices, label: 'Случай', color: 'from-slate-700 to-slate-900', text: 'text-slate-200' },
];

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

const NOISE_PATTERN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

const breakpointColumnsObj = {
  default: 4,
  1600: 3,
  1100: 2,
  700: 1
};

// --- HELPER FUNCTIONS ---

const allowDataUrls = (url: string) => url;

const extractImages = (content: string): string[] => {
    const matches = content.matchAll(/!\[.*?\]\((.*?)\)/g);
    return Array.from(matches, m => m[1]);
};

const getPreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    const sentences = cleanText.match(/[^\.!\?]+[\.!\?]+(?=\s|$)/g) || [cleanText];
    let limit = 0;
    let sentenceCount = 0;
    for (let s of sentences) {
        if (sentenceCount >= 3) break;
        if (limit + s.length > 300 && sentenceCount >= 1) break;
        limit += s.length;
        sentenceCount++;
    }
    let preview = sentences.slice(0, sentenceCount).join(' ');
    if (preview.length === 0 && cleanText.length > 0) preview = cleanText;
    if (preview.length > 300) {
        preview = preview.slice(0, 300);
        const lastSpace = preview.lastIndexOf(' ');
        if (lastSpace > 0) preview = preview.slice(0, lastSpace);
    }
    if (preview.length < cleanText.length) preview = preview.replace(/[\.!\?,\s]+$/, '') + '...';
    return preview;
};

const processImage = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image'));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                } else {
                    reject(new Error('Canvas context failed'));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const findFirstUrl = (text: string): string | null => {
    const maskedText = text.replace(/!\[.*?\]\(.*?\)/g, '');
    const match = maskedText.match(/(https?:\/\/[^\s\)]+)/);
    return match ? match[0] : null;
};

const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const wrap = (text: string, marker: string) => {
        const match = text.match(/^(\s*)(.*?)(\s*)$/s);
        if (match && match[2]) {
            return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
        }
        return text.trim() ? `${marker}${text}${marker}` : '';
    };

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            let content = '';
            el.childNodes.forEach(child => content += walk(child));
            
            if (el.style.textDecoration && el.style.textDecoration.includes('underline')) return `<u>${content}</u>`;
            if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700) return wrap(content, '**');
            if (el.style.fontStyle === 'italic') return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'u': return content.trim() ? `<u>${content}</u>` : '';
                case 'code': return `\`${content}\``;
                case 'h1': return `\n# ${content}\n`;
                case 'h2': return `\n## ${content}\n`;
                case 'div': return content ? `\n${content}` : '\n'; 
                case 'p': return `\n${content}\n`;
                case 'br': return '\n';
                case 'img': return `\n![${(el as HTMLImageElement).alt || 'image'}](${(el as HTMLImageElement).src})\n`;
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    md = md.replace(/&nbsp;/g, ' ');
    return applyTypography(md);
};

const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__([\s\S]*?)__/g, '<b>$1</b>');
    html = html.replace(/_([\s\S]*?)_/g, '<i>$1</i>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" style="max-height: 300px; border-radius: 8px