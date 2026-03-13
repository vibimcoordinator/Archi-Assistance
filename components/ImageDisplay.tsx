import React from 'react';
import { GeneratedImage } from '../types';
import { ArrowUpIcon, DocumentTextIcon, DownloadIcon, SpinnerIcon, TrashIcon } from './IconComponents';
import { applyCanvasAdjustments } from '../utils';

interface ImageDisplayProps {
    images: GeneratedImage[];
    onDelete: (id: string) => void;
    onImageMouseDown: (id: string, e: React.MouseEvent<HTMLDivElement>) => void;
    selectedImageIds: string[];
    onDescribe: (id: string) => void;
    describingImageId: string | null;
    mode: string;
    onGenerateAnglePrompt: (direction: string) => void;
}

const getAspectRatioClass = (aspectRatio?: string) => {
    switch (aspectRatio) {
        case '16:9': return 'aspect-[16/9]';
        case '9:16': return 'aspect-[9/16]';
        case '4:3': return 'aspect-[4/3]';
        case '3:4': return 'aspect-[3/4]';
        case '1:1':
        default:
            return 'aspect-square';
    }
}

const generateAdjustmentStyles = (adjustments?: GeneratedImage['adjustments']) => {
    if (!adjustments) {
        return { filter: '', temperatureOverlayStyle: { display: 'none' }, tintOverlayStyle: { display: 'none' } };
    }

    const { brightness = 100, contrast = 100, saturation = 100, temperature = 0, tint = 0 } = adjustments;

    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    const tempAbs = Math.abs(temperature);
    const tempColor = temperature > 0 ? `rgba(255, 165, 0, ${tempAbs / 150})` : `rgba(0, 100, 255, ${tempAbs / 150})`;
    const temperatureOverlayStyle: React.CSSProperties = {
        backgroundColor: tempColor,
        mixBlendMode: 'soft-light',
        display: temperature !== 0 ? 'block' : 'none',
    };

    const tintAbs = Math.abs(tint);
    const tintColor = tint > 0 ? `rgba(255, 0, 255, ${tintAbs / 200})` : `rgba(0, 255, 0, ${tintAbs / 200})`;
     const tintOverlayStyle: React.CSSProperties = {
        backgroundColor: tintColor,
        mixBlendMode: 'soft-light',
        display: tint !== 0 ? 'block' : 'none',
    };

    return { filter, temperatureOverlayStyle, tintOverlayStyle };
};


interface AngleControlsProps {
    onGenerateAnglePrompt: (direction: string) => void;
}

const AngleControls: React.FC<AngleControlsProps> = React.memo(({ onGenerateAnglePrompt }) => {
    const controls = [
        { dir: 'top',          pos: 'top-2 left-1/2 -translate-x-1/2', rotate: 'rotate-0' },
        { dir: 'top-right',    pos: 'top-2 right-2',                   rotate: 'rotate-45' },
        { dir: 'right',        pos: 'top-1/2 right-2 -translate-y-1/2',  rotate: 'rotate-90' },
        { dir: 'bottom-right', pos: 'bottom-2 right-2',                rotate: 'rotate-135' },
        { dir: 'bottom',       pos: 'bottom-2 left-1/2 -translate-x-1/2',rotate: 'rotate-180' },
        { dir: 'bottom-left',  pos: 'bottom-2 left-2',                 rotate: '-rotate-135' },
        { dir: 'left',         pos: 'top-1/2 left-2 -translate-y-1/2',   rotate: '-rotate-90' },
        { dir: 'top-left',     pos: 'top-2 left-2',                    rotate: '-rotate-45' },
    ];

    return (
        <div className="absolute inset-0 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {controls.map(({ dir, pos, rotate }) => (
                <button
                    key={dir}
                    onClick={() => onGenerateAnglePrompt(dir)}
                    className={`absolute ${pos} p-1.5 bg-black/60 hover:bg-viettel-red rounded-full transition-all duration-200 pointer-events-auto transform-gpu hover:scale-110`}
                    title={`Chuyển góc chụp ${dir}`}
                >
                    <ArrowUpIcon className={`w-5 h-5 text-white transform ${rotate}`} />
                </button>
            ))}
        </div>
    );
});


interface ImageCardProps {
    image: GeneratedImage;
    onDelete: (id: string) => void;
    onMouseDown: (id: string, e: React.MouseEvent<HTMLDivElement>) => void;
    isSelected: boolean;
    onDescribe: (id: string) => void;
    describingImageId: string | null;
    mode: string;
    onGenerateAnglePrompt: (direction: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = React.memo(({ image, onDelete, onMouseDown, isSelected, mode, onDescribe, describingImageId, onGenerateAnglePrompt }) => {
    
    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();

        let downloadSrc = image.src;
        const hasAdjustments = image.adjustments && (
            image.adjustments.brightness !== 100 ||
            image.adjustments.contrast !== 100 ||
            image.adjustments.saturation !== 100 ||
            image.adjustments.temperature !== 0 ||
            image.adjustments.tint !== 0
        );

        if (hasAdjustments) {
            try {
                downloadSrc = await applyCanvasAdjustments(image.src, image.adjustments!);
            } catch (error) {
                console.error("Không thể áp dụng hiệu chỉnh để tải xuống:", error);
                alert("Không thể áp dụng hiệu chỉnh để tải xuống. Tệp gốc sẽ được tải xuống.");
            }
        }

        const link = document.createElement('a');
        link.href = downloadSrc;
        link.download = `archi-ai-${image.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(image.id);
    };
    
    const handleDescribe = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDescribe(image.id);
    };

    const baseWrapperClass = `group absolute flex flex-col rounded-lg transition-[transform,border-color] duration-500 ease-in-out border-4 cursor-grab w-[320px] shadow-lg`;
    
    const cardStyle = {
        transform: `translate(${image.x}px, ${image.y}px)`,
    };
    
    const isDescribing = describingImageId === image.id;

    if (image.isLoading) {
        return (
             <div className={`${baseWrapperClass} border-dashed border-gray-700 overflow-hidden`} style={cardStyle}>
                <div className={`w-full bg-gray-800/50 flex flex-col items-center justify-center p-4 relative ${getAspectRatioClass(image.aspectRatio)}`}>
                    <div className="absolute top-0 left-0 h-full bg-viettel-red/10 animate-pulse-slow w-full" style={{ animation: 'progress 10s ease-in-out infinite' }}></div>
                    <SpinnerIcon className="w-12 h-12 text-viettel-red-light z-10" />
                    <p className="mt-4 text-sm text-gray-400 z-10">Đang tạo ảnh...</p>
                    <style>{`
                        @keyframes progress {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                        }
                        .animate-pulse-slow {
                            animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    if (image.error) {
        return (
            <div className={`${baseWrapperClass} bg-gray-800 border-red-700/50 justify-center items-center p-4 cursor-default`} style={cardStyle}>
                <p className="text-red-400 text-sm font-semibold">Tạo ảnh thất bại</p>
                <p className="mt-2 text-xs text-red-500 text-center">{image.error}</p>
                 <button onClick={(e) => handleDelete(e)} className="mt-4 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-md">
                    Đóng
                </button>
            </div>
        );
    }
    
    const hasDimensions = image.width && image.height;
    const aspectRatioStyle = hasDimensions ? { aspectRatio: `${image.width} / ${image.height}` } : {};
    const aspectRatioClass = !hasDimensions ? getAspectRatioClass(image.aspectRatio) : '';
    const { filter, temperatureOverlayStyle, tintOverlayStyle } = generateAdjustmentStyles(image.adjustments);

    return (
        <div 
            id={`image-card-${image.id}`}
            data-image-card-id={image.id}
            className={`${baseWrapperClass.replace('overflow-hidden', '')} ${!isSelected ? 'border-transparent hover:border-gray-700/50' : 'border-transparent'}`}
            style={cardStyle}
            onMouseDown={(e) => onMouseDown(image.id, e)}
        >
            <div className="flex items-center space-x-0 p-1 bg-white/10 rounded-t-lg">
                <button 
                    onClick={handleDescribe} 
                    disabled={isDescribing} 
                    className="p-1.5 border-2 border-black bg-white/90 text-gray-700 hover:bg-viettel-red hover:text-white transition-colors" 
                    title="Phân tích ảnh"
                >
                    {isDescribing ? <SpinnerIcon className="w-5 h-5" /> : <DocumentTextIcon className="w-5 h-5" />}
                </button>
                <button 
                    onClick={handleDownload} 
                    className="p-1.5 border-2 border-black border-l-0 bg-white/90 text-gray-700 hover:bg-viettel-red hover:text-white transition-colors" 
                    title="Tải xuống"
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleDelete} 
                    className="p-1.5 border-2 border-black border-l-0 bg-white/90 text-gray-700 hover:bg-red-600 hover:text-white transition-colors" 
                    title="Xóa"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
            <div 
                className={`relative w-full overflow-hidden transition-shadow duration-200 ${aspectRatioClass} ${isSelected ? 'shadow-[0_0_15px_4px] shadow-viettel-red/60' : ''}`}
                style={aspectRatioStyle}
            >
                <img src={image.src} alt={image.prompt || 'Uploaded image'} className="w-full h-full object-contain" draggable="false" style={{ filter }}/>
                <div className="absolute inset-0 pointer-events-none" style={temperatureOverlayStyle}></div>
                <div className="absolute inset-0 pointer-events-none" style={tintOverlayStyle}></div>
                
                {isSelected && mode === 'camera-angle' && (
                    <AngleControls onGenerateAnglePrompt={onGenerateAnglePrompt} />
                )}
            </div>
             {hasDimensions && (
                <div className="text-center text-xs text-gray-400 font-mono py-1 bg-gray-900/50 rounded-b-lg cursor-default">
                    {image.width}x{image.height}
                </div>
            )}
        </div>
    );
});


const ImageDisplay: React.FC<ImageDisplayProps> = ({ images, onDelete, onImageMouseDown, selectedImageIds, mode, onDescribe, describingImageId, onGenerateAnglePrompt }) => {
    return (
        <div className="absolute top-0 left-0 w-full h-full">
             {images.map(img => (
                <ImageCard 
                    key={img.id}
                    image={img} 
                    onDelete={onDelete}
                    onMouseDown={onImageMouseDown}
                    isSelected={selectedImageIds.includes(img.id)}
                    mode={mode}
                    onDescribe={onDescribe}
                    describingImageId={describingImageId}
                    onGenerateAnglePrompt={onGenerateAnglePrompt}
                />
            ))}
        </div>
    );
};

export default ImageDisplay;