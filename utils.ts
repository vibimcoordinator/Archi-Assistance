import { GeneratedImage } from "./types";

export const fileToBase64 = (file: File): Promise<{ data: string, mimeType: string, src: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const [header, data] = result.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            resolve({ data, mimeType, src: result });
        };
        reader.onerror = (error) => reject(error);
    });
};

export const dataUrlToBlobData = (dataUrl: string): { data: string, mimeType: string } => {
    const [metadata, data] = dataUrl.split(',');
    const mimeType = metadata.split(':')[1].split(';')[0];
    return { data, mimeType };
}

export const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error("Invalid dataURL format");
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};


export const getImageDimensions = (src: string): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = (err) => {
            reject(err);
        };
        img.src = src;
    });
};

export const resizeImageAndCover = (fileOrSrc: File | string, targetAspectRatio: number): Promise<{ src: string }> => {
    return new Promise((resolve, reject) => {
        const processImage = (src: string) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Không thể lấy context của canvas"));

                const sourceWidth = img.width;
                const sourceHeight = img.height;
                const sourceAspectRatio = sourceWidth / sourceHeight;

                const baseSize = 1024;
                let canvasWidth, canvasHeight;
                if (targetAspectRatio >= 1) { 
                    canvasWidth = baseSize;
                    canvasHeight = baseSize / targetAspectRatio;
                } else {
                    canvasHeight = baseSize;
                    canvasWidth = baseSize * targetAspectRatio;
                }
                
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                let sx = 0, sy = 0, sWidth = sourceWidth, sHeight = sourceHeight;

                if (sourceAspectRatio > targetAspectRatio) {
                    // Nguồn rộng hơn, cắt hai bên
                    sWidth = sourceHeight * targetAspectRatio;
                    sx = (sourceWidth - sWidth) / 2;
                } else if (sourceAspectRatio < targetAspectRatio) {
                    // Nguồn cao hơn, cắt trên dưới
                    sHeight = sourceWidth / targetAspectRatio;
                    sy = (sourceHeight - sHeight) / 2;
                }

                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
                resolve({ src: canvas.toDataURL('image/png') });
            };
            img.onerror = reject;
            img.src = src;
        };

        if (typeof fileOrSrc === 'string') {
            processImage(fileOrSrc);
        } else {
            const reader = new FileReader();
            reader.readAsDataURL(fileOrSrc);
            reader.onload = () => {
                processImage(reader.result as string);
            };
            reader.onerror = reject;
        }
    });
};

export const applyCanvasAdjustments = (
    src: string, 
    adjustments: NonNullable<GeneratedImage['adjustments']>
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Không thể lấy context của canvas"));

            canvas.width = img.width;
            canvas.height = img.height;

            const { 
                brightness = 100, 
                contrast = 100, 
                saturation = 100, 
                temperature = 0, 
                tint = 0 
            } = adjustments;

            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            
            ctx.drawImage(img, 0, 0);

            if (temperature !== 0) {
                const tempAbs = Math.abs(temperature);
                const tempColor = temperature > 0 
                    ? `rgba(255, 165, 0, ${tempAbs / 150})`
                    : `rgba(0, 100, 255, ${tempAbs / 150})`;
                
                ctx.globalCompositeOperation = 'soft-light';
                ctx.fillStyle = tempColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            if (tint !== 0) {
                const tintAbs = Math.abs(tint);
                const tintColor = tint > 0 
                    ? `rgba(255, 0, 255, ${tintAbs / 200})`
                    : `rgba(0, 255, 0, ${tintAbs / 200})`;
                
                if (temperature === 0) {
                     ctx.globalCompositeOperation = 'soft-light';
                }
                ctx.fillStyle = tintColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.globalCompositeOperation = 'source-over';

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            console.error("Image loading failed for canvas adjustments:", err);
            reject(new Error("Không thể tải ảnh để áp dụng hiệu chỉnh."));
        };
        img.src = src;
    });
};
