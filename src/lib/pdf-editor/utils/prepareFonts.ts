export interface FontConfig {
    src: string;
    correction: (size: number, lineHeight: number) => number;
    subset: boolean;
}

export interface LoadedFont extends FontConfig {
    buffer: ArrayBuffer;
}

// Available fonts
export const Fonts: Record<string, FontConfig> = {
    Roboto: {
        src: '/fonts/Roboto-Regular.ttf',
        correction(size: number, lineHeight: number): number {
            return (size * lineHeight - size) / 2 + size / 7;
        },
        subset: true
    },
    'Noto Sans CJK': {
        src: '/fonts/NotoSansSC-Regular.ttf',
        correction(size: number, lineHeight: number): number {
            return (size * lineHeight - size) / 2 + size / 7;
        },
        subset: false
    },
    'KaiTi Regular': {
        src: '/fonts/KaiTi-Regular.ttf',
        correction(size: number, lineHeight: number): number {
            return (size * lineHeight - size) / 2 + size / 7;
        },
        subset: false
    }
};

export async function fetchFont(name: string): Promise<LoadedFont> {
    if (!Fonts || !Fonts[name]) {
        throw new Error(`Font '${name}' does not exist.`);
    }

    const font = Fonts[name];

    try {
        const response = await fetch(font.src);
        const fontBuffer = await response.arrayBuffer();
        const fontFace = new FontFace(name, fontBuffer);
        
        fontFace.display = 'swap';
        await fontFace.load();
        document.fonts.add(fontFace);

        return {
            ...font,
            buffer: fontBuffer
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch font '${name}':${message}`);
    }
}

export const fetchFontbyName = async (fontFamily: string): Promise<Response> => {
    const font = Fonts[fontFamily];

    if (font) {
        return fetch(font.src);
    } else {
        throw new Error(`Font '${fontFamily}' not found.`);
    }
};