
import { applyTypography } from '../constants';

// --- IMAGE PROCESSING ---
export const processImage = (file: File | Blob): Promise<string> => {
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

// --- MARKDOWN <-> HTML CONVERTERS ---

export const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    
    // Headers
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    
    // Bold/Italic
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__([\s\S]*?)__/g, '<b>$1</b>');
    html = html.replace(/_([\s\S]*?)_/g, '<i>$1</i>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    
    // Code/Underline
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    // Images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%; cursor: pointer;" />`;
    });
    
    // Lists (Simple implementation for visual editor)
    // Note: Complex lists usually handled by the browser's execCommand 'insertUnorderedList'
    // but for rendering MD back to HTML for editing:
    html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
    // Wrap consecutive lis in ul (simplified)
    // Ideally, we rely on the browser's contentEditable behavior for lists, 
    // this converter is mostly for initial load.
    
    // Line Breaks: Convert newlines to BR, but not around block tags
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/(<\/h1>|<\/h2>|<\/p>|<\/div>|<\/li>)<br>/gi, '$1');
    
    return html;
};

export const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const wrap = (text: string, marker: string) => {
        const match = text.match(/^([\s\u00A0]*)(.*?)([\s\u00A0]*)$/s);
        if (match) {
            if (!match[2]) return match[1] + match[3];
            return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
        }
        return text;
    };

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return (node.textContent || '').replace(/\u00A0/g, ' ');
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            
            if (tag === 'br') return '\n';
            if (tag === 'img') return `\n![${(el as HTMLImageElement).alt || 'image'}](${(el as HTMLImageElement).src})\n`;
            
            let content = '';
            el.childNodes.forEach(child => content += walk(child));
            
            // Block Elements
            if (tag === 'div' || tag === 'p') {
                const trimmed = content.trim();
                return trimmed ? `${trimmed}\n` : '\n'; 
            }
            if (tag === 'li') return `\n- ${content.trim()}`;
            if (tag === 'ul' || tag === 'ol') return `\n${content}\n`;
            if (tag === 'blockquote') return `\n> ${content.trim()}\n`;

            // Inline Styles
            const styleBold = el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700;
            const styleItalic = el.style.fontStyle === 'italic';
            const styleUnderline = el.style.textDecoration && el.style.textDecoration.includes('underline');

            if (styleBold) content = wrap(content, '**');
            if (styleItalic) content = wrap(content, '*');
            // Markdown doesn't standardly support underline, using HTML tag
            if (styleUnderline || tag === 'u') return `<u>${content}</u>`;
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'code': return `\`${content}\``;
                case 'h1': return `\n# ${content}\n`;
                case 'h2': return `\n## ${content}\n`;
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    
    // Cleanup excessive newlines
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    
    return applyTypography(md);
};
