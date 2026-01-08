
import { applyTypography } from '../constants';

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

export const htmlToMarkdown = (html: string): string => {
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
            
            // Handle Images first
            if (tag === 'img') {
                const alt = (el as HTMLImageElement).alt || 'image';
                const src = (el as HTMLImageElement).src;
                return `\n![${alt}](${src})\n`;
            }

            el.childNodes.forEach(child => content += walk(child));
            
            if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700) content = wrap(content, '**');
            if (el.style.fontStyle === 'italic') content = wrap(content, '*');
            if (el.style.textDecoration && el.style.textDecoration.includes('underline')) content = `<u>${content}</u>`;
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'u': return content.trim() ? `<u>${content}</u>` : '';
                case 'code': return `\`${content}\``;
                case 'h1': return `\n# ${content}\n`;
                case 'h2': return `\n## ${content}\n`;
                case 'div': 
                case 'p': 
                    // Verify if it's just a spacer line
                    return content.trim() ? `\n${content}\n` : '\n';
                case 'br': return '\n';
                case 'li': return `\n- ${content}`;
                case 'ul': return `\n${content}\n`;
                case 'ol': return `\n${content}\n`; // Simplified OL
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    // Cleanup excessive newlines
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    md = md.replace(/&nbsp;/g, ' ');
    return applyTypography(md);
};

export const markdownToHtml = (md: string): string => {
    if (!md) return '';
    let html = md;
    
    // Protect Code Blocks (simplified)
    // html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    
    // Bold/Italic
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__([\s\S]*?)__/g, '<b>$1</b>');
    html = html.replace(/_([\s\S]*?)_/g, '<i>$1</i>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    
    // Images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%; cursor: pointer;" />`;
    });
    
    // Lists (Basic)
    html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
    
    // Line breaks - critical fix
    // We replace newlines with <br> ONLY if not adjacent to block tags
    html = html.replace(/\n/g, '<br>');
    
    // Cleanup block tags having extra BRs
    html = html.replace(/(<\/h1>|<\/h2>|<\/p>|<\/div>|<\/li>)<br>/gi, '$1');
    html = html.replace(/<br>(<h1>|<h2>|<p>|<div>|<li>)/gi, '$1');

    return html;
};
