
export const applyTypography = (text: string): string => {
  if (!text) return text;
  let res = text;
  res = res.replace(/(\S)[ \t]+-[ \t]+/g, '$1 — ');
  res = res.replace(/(^|[\s(\[{])"/g, '$1«');
  res = res.replace(/"/g, '»');
  res = res.replace(/(^|[\s(\[{])'/g, '$1«');
  res = res.replace(/'(?=[.,:;!?\s)\]}]|$)/g, '»');
  const nestedPattern = /«([^»]*)«([^»]*)»([^»]*)»/g;
  let prev = '';
  while (res !== prev) {
      prev = res;
      res = res.replace(nestedPattern, '«$1„$2“$3»');
  }
  return res;
};

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
            
            // Robust Block Elements Handling
            if (['div', 'p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'].includes(tag)) {
                const trimmed = content.trim();
                // Add newlines around blocks, but check if we are inside another list
                if (!trimmed && tag !== 'br' && tag !== 'img') return '';
                
                let prefix = '';
                let suffix = '\n';

                if (tag === 'h1') { prefix = '# '; suffix = '\n\n'; }
                else if (tag === 'h2') { prefix = '## '; suffix = '\n\n'; }
                else if (tag === 'li') { prefix = '- '; }
                else if (tag === 'p') { suffix = '\n\n'; }
                
                return `${prefix}${trimmed}${suffix}`;
            }
            
            if (tag === 'blockquote') return `\n> ${content.trim()}\n`;

            const styleBold = el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700;
            const styleItalic = el.style.fontStyle === 'italic';

            if (styleBold) content = wrap(content, '**');
            if (styleItalic) content = wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'code': return `\`${content}\``;
                case 'u': return `<u>${content}</u>`;
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

export const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    // Basic Markdown to HTML for editor initialization
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    // Lists are hard to do with regex perfectly, simplistic approach for contentEditable
    // We mostly rely on the browser to handle lists once initialized, or simple text representation
    
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__([\s\S]*?)__/g, '<b>$1</b>');
    html = html.replace(/_([\s\S]*?)_/g, '<i>$1</i>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%; cursor: pointer;" />`;
    });
    
    // Convert newlines to breaks, but respect block tags
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/(<\/h1>|<\/h2>|<\/p>|<\/div>)<br>/gi, '$1');
    return html;
};
