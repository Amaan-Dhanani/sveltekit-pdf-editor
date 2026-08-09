export function readAsArrayBuffer(file: Blob | File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

export function readAsImage(src: string | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        if (src instanceof Blob) {
            const url = window.URL.createObjectURL(src);
            img.src = url;
        } else {
            img.src = src;
        }
    });
}

export function readAsDataURL(file: Blob | File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}