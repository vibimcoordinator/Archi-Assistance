import React, { useRef, useState, useEffect } from 'react';
import { GenerationMode, GeneratedImage } from '../types';
import {
    GenerateIcon, RotateCameraIcon,
    SpinnerIcon, UploadIcon, XMarkIcon,
    ChevronDownIcon, PlusIcon, ArrowsPointingOutIcon, ResetViewIcon, ClearAllIcon
} from './IconComponents';
import PromptModal from './PromptModal';

const MultiReferenceImageUpload: React.FC<{
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>> | ((files: File[]) => void);
    previewUrls: string[];
    title: string;
    maxFiles: number;
    sourceAspectRatio?: string;
}> = ({ files, setFiles, previewUrls, title, maxFiles, sourceAspectRatio }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleAddFiles = (newFiles: FileList | File[]) => {
        const filesArray = Array.from(newFiles).filter(file => file.type.startsWith('image/'));
        if (typeof setFiles === 'function' && !(setFiles as any).prototype) {
             // This is our async handler from App.tsx
            (setFiles as (files: File[]) => void)([...files, ...filesArray].slice(0, maxFiles));
        } else {
            // This is a standard React state setter
            const combined = [...files, ...filesArray];
            const limitedFiles = combined.slice(0, maxFiles);
            (setFiles as React.Dispatch<React.SetStateAction<File[]>>)(limitedFiles);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) handleAddFiles(event.target.files);
        event.target.value = ''; // Reset input to allow re-uploading the same file
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); event.stopPropagation();
        setIsDraggingOver(false);
        if (event.dataTransfer.files) handleAddFiles(event.dataTransfer.files);
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (event.clipboardData.files.length > 0) {
            event.preventDefault(); event.stopPropagation();
            handleAddFiles(event.clipboardData.files);
        }
    };
    
    const handleRemoveImage = (e: React.MouseEvent, indexToRemove: number) => {
        e.stopPropagation();
        const updatedFiles = files.filter((_, index) => index !== indexToRemove);
        if (typeof setFiles === 'function' && !(setFiles as any).prototype) {
            (setFiles as (files: File[]) => void)(updatedFiles);
        } else {
            (setFiles as React.Dispatch<React.SetStateAction<File[]>>)(updatedFiles);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.types.includes('Files')) {
            setIsDraggingOver(true);
        }
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const div = event.currentTarget;
        if (!div.contains(event.relatedTarget as Node)) {
            setIsDraggingOver(false);
        }
    };
    
    const aspectContainerStyle = sourceAspectRatio ? { aspectRatio: sourceAspectRatio.replace(':', ' / ') } : {};

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onPaste={handlePaste}
            className={`p-2 rounded-lg border-2 border-transparent transition-all duration-200 ${isDraggingOver ? 'border-dashed bg-viettel-red/10 border-viettel-red' : ''}`}

        >
            <label className="block text-sm font-medium text-gray-300 mb-2">{title}</label>
            <div className="flex flex-col gap-2">
                {previewUrls.map((url, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border-2 border-gray-600 bg-gray-900/20" style={aspectContainerStyle}>
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleRemoveImage(e, index)} className="text-white bg-red-600/80 hover:bg-red-500 rounded-full p-1"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
                {files.length < maxFiles && (
                     <div
                        onClick={() => fileInputRef.current?.click()} 
                        className="w-full h-32 flex flex-col items-center justify-center bg-gray-700/50 hover:bg-gray-700 rounded-lg border-2 border-dashed border-gray-600 cursor-pointer transition-colors"
                     >
                         <UploadIcon className="w-8 h-8 text-gray-400 mb-1" />
                         <p className="text-gray-400 text-xs text-center px-2">Tải lên, dán, hoặc thả ảnh</p>
                     </div>
                )}
            </div>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden"/>
        </div>
    );
};

const AdjustmentSlider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    onReset: () => void;
    min: number;
    max: number;
    step?: number;
}> = ({ label, value, onChange, onReset, min, max, step = 1 }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-sm text-gray-300">{label}</label>
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono bg-gray-900/50 px-2 py-0.5 rounded w-12 text-center">{value.toFixed(0)}</span>
                    <button onClick={onReset} className="text-gray-400 hover:text-white" title={`Reset ${label}`}>
                        <ResetViewIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-viettel-red"
            />
        </div>
    );
};

const AdjustmentPanel: React.FC<{
    adjustments: GeneratedImage['adjustments'];
    onAdjustmentChange: (key: keyof NonNullable<GeneratedImage['adjustments']>, value: number) => void;
    onResetAll: () => void;
}> = ({ adjustments, onAdjustmentChange, onResetAll }) => {
    const defaults = { brightness: 100, contrast: 100, saturation: 100, temperature: 0, tint: 0 };
    const values = { ...defaults, ...adjustments };

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                 <label className="text-base font-semibold text-gray-200">Hiệu chỉnh ảnh</label>
                 <button onClick={onResetAll} className="flex items-center text-xs text-viettel-red-light hover:text-white font-semibold">
                    <ClearAllIcon className="w-4 h-4 mr-1"/>
                    Reset Tất cả
                 </button>
            </div>
            <div className="space-y-4">
                <AdjustmentSlider 
                    label="Độ sáng"
                    value={values.brightness}
                    onChange={v => onAdjustmentChange('brightness', v)}
                    onReset={() => onAdjustmentChange('brightness', defaults.brightness)}
                    min={0} max={200}
                />
                 <AdjustmentSlider 
                    label="Tương phản"
                    value={values.contrast}
                    onChange={v => onAdjustmentChange('contrast', v)}
                    onReset={() => onAdjustmentChange('contrast', defaults.contrast)}
                    min={0} max={200}
                />
                 <AdjustmentSlider 
                    label="Bão hòa"
                    value={values.saturation}
                    onChange={v => onAdjustmentChange('saturation', v)}
                    onReset={() => onAdjustmentChange('saturation', defaults.saturation)}
                    min={0} max={200}
                />
                 <AdjustmentSlider 
                    label="Nhiệt độ màu"
                    value={values.temperature}
                    onChange={v => onAdjustmentChange('temperature', v)}
                    onReset={() => onAdjustmentChange('temperature', defaults.temperature)}
                    min={-100} max={100}
                />
                 <AdjustmentSlider 
                    label="Sắc thái"
                    value={values.tint}
                    onChange={v => onAdjustmentChange('tint', v)}
                    onReset={() => onAdjustmentChange('tint', defaults.tint)}
                    min={-100} max={100}
                />
            </div>
        </div>
    );
}

const cameraAngles = [
    'cận cảnh', 'siêu cận cảnh', 'trung cảnh', 'toàn cảnh', 'góc rộng', 'góc từ trên xuống', 'góc từ dưới lên', 'ngang tầm mắt'
];

const floorPlan3DOptions = {
    "Style Image": ["3D view", "3D cutaway view"],
    "Visual style": ["Scandinavian High-Key", "Modern Minimalist", "Industrial", "Japandi", "Tropical Modern", "Rustic"],
    "Living Room Floor": ["Marble", "Polished Concrete", "Oak Wood", "Walnut Wood", "Ceramic blue", "Chevron flooring"],
    "Beb Room Floor": ["Chevron flooring", "Oak Wood", "Walnut Wood", "Carpet"],
    "Bad Room Floor": ["Ceramic blue", "Marble", "Tiles"],
    "Kitchen Floor": ["Polished Concrete", "Marble", "Tiles"],
    "Lobby Floor": ["Marble", "Polished Concrete"],
    "Stair Floor": ["Oak Wood", "Walnut Wood", "Marble"]
};

const samplePrompts = {
  "Bối cảnh": [
    "trên một con phố yên tĩnh ở Việt Nam",
    "trong một con hẻm nhỏ ở Sài Gòn",
    "giữa khu đô thị hiện đại, sầm uất",
    "bên bờ biển Nha Trang",
    "trên một sườn đồi ở Đà Lạt",
    "giữa vùng nông thôn đồng bằng Bắc Bộ",
    "nhìn ra Hồ Tây, Hà Nội",
    "trong một khu vườn nhiệt đới",
    "tại một làng chài ven biển",
    "ẩn mình trong khu phố cổ Hội An",
  ],
  "Ánh sáng": [
    "ánh nắng dịu nhẹ buổi sáng",
    "nắng gắt giữa trưa đổ bóng mạnh",
    "ánh sáng vàng ấm của hoàng hôn",
    "bầu trời u ám trước cơn mưa",
    "ánh sáng khuếch tán trong ngày nhiều mây",
    "đèn đường và ánh sáng nhân tạo ban đêm",
    "tia nắng xuyên qua kẽ lá",
    "phản chiếu ánh sáng trên mặt nước",
    "ánh sáng neon từ các biển hiệu",
    "trong làn sương sớm mờ ảo",
  ],
};

const SamplePrompts: React.FC<{ setPrompt: React.Dispatch<React.SetStateAction<string>> }> = ({ setPrompt }) => {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const handleToggleCategory = (category: string) => {
        setExpandedCategory(prev => prev === category ? null : category);
    };

    const handlePromptClick = (sample: string) => {
        setPrompt(prev => {
            const trimmedPrev = prev.trim();
            if (!trimmedPrev) return sample.charAt(0).toUpperCase() + sample.slice(1);
            if (trimmedPrev.endsWith(',')) return `${trimmedPrev} ${sample}`;
            return `${trimmedPrev}, ${sample}`;
        });
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gợi ý Prompt</label>
            <div className="space-y-2">
                {Object.entries(samplePrompts).map(([category, prompts]) => (
                    <div key={category} className="bg-gray-700/50 rounded-lg transition-all duration-300">
                        <button
                            onClick={() => handleToggleCategory(category)}
                            className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-200"
                        >
                            <span>{category}</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${expandedCategory === category ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedCategory === category && (
                            <div className="p-3 border-t border-gray-600/50">
                                <div className="flex flex-wrap gap-2">
                                    {prompts.map(prompt => (
                                        <button
                                            key={prompt}
                                            onClick={() => handlePromptClick(prompt)}
                                            className="flex items-center text-xs bg-gray-600/70 text-gray-300 px-2.5 py-1.5 rounded-full hover:bg-viettel-red hover:text-white transition-colors duration-150"
                                        >
                                            <PlusIcon className="w-4 h-4 mr-1.5" />
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


const aspectRatios = [{ id: '1:1', name: '1:1' }, { id: '16:9', name: '16:9' }, { id: '9:16', name: '9:16' }, { id: '4:3', name: '4:3' }, { id: '3:4', name: '3:4' }];

interface ControlPanelProps {
    mode: GenerationMode;
    prompt: string; setPrompt: React.Dispatch<React.SetStateAction<string>>;
    onGenerate: () => void;
    refineReferenceFiles: File[];
    setRefineReferenceFiles: React.Dispatch<React.SetStateAction<File[]>>;
    refineReferencePreviewUrls: string[];
    aspectRatio: string; setAspectRatio: React.Dispatch<React.SetStateAction<string>>;
    numberOfImages: number; setNumberOfImages: React.Dispatch<React.SetStateAction<number>>;
    selectedImageId: string | null;
    hasMoodboard: boolean;
    isGeneratingMoodboard: boolean;
    moodboardError: string | null;
    onGenerateMoodboard: () => void;
    onOpenMoodboard: () => void;
    sourceAspectRatio?: string;
    activeImageAdjustments?: GeneratedImage['adjustments'];
    onAdjustmentChange: (key: keyof NonNullable<GeneratedImage['adjustments']>, value: number) => void;
    onResetAdjustments: () => void;
    showGridAndDimensions?: boolean;
    setShowGridAndDimensions?: (value: boolean) => void;
    isPromptModalOpen: boolean;
    setIsPromptModalOpen: (value: boolean) => void;
    onClose?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    const { mode, prompt, setPrompt, onGenerate, selectedImageId,
        aspectRatio, setAspectRatio,
        numberOfImages, setNumberOfImages,
        refineReferenceFiles, setRefineReferenceFiles, refineReferencePreviewUrls,
        hasMoodboard, isGeneratingMoodboard, moodboardError, onGenerateMoodboard, onOpenMoodboard,
        sourceAspectRatio,
        activeImageAdjustments, onAdjustmentChange, onResetAdjustments,
        showGridAndDimensions, setShowGridAndDimensions,
        isPromptModalOpen, setIsPromptModalOpen,
        onClose
     } = props;
     
    const [isAngleDropdownOpen, setAngleDropdownOpen] = useState(false);
    const angleDropdownRef = useRef<HTMLDivElement>(null);

    const promptLabel = "Mô tả (Prompt)";
    const promptPlaceholder = "VD: Một biệt thự hiện đại bên bờ biển lúc hoàng hôn, phong cách tối giản...";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (angleDropdownRef.current && !angleDropdownRef.current.contains(event.target as Node)) {
                setAngleDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAngleSelect = (angle: string) => {
        setPrompt(prev => {
            const trimmed = prev.trim();
            if (!trimmed) return `Góc chụp ${angle}`;
            if (trimmed.endsWith(',')) return `${trimmed} góc chụp ${angle}`;
            return `${trimmed}, góc chụp ${angle}`;
        });
        setAngleDropdownOpen(false);
    };

    const imageEditingModes: GenerationMode[] = ['refine', 'camera-angle', 'adjust', 'floor-plan', 'floor-plan-3d'];

    const [expanded3DCategory, setExpanded3DCategory] = useState<string | null>(null);

    const handle3DOptionClick = (category: string, option: string) => {
        setPrompt(prev => {
            let newPrompt = prev;
            if (category === "Style Image") {
                // Replace existing style image if any, or add new
                if (newPrompt.includes("3D view")) newPrompt = newPrompt.replace("3D view", option);
                else if (newPrompt.includes("3D cutaway view")) newPrompt = newPrompt.replace("3D cutaway view", option);
                else newPrompt = `${option} of ${newPrompt}`;
            } else if (category === "Visual style") {
                const visualStyleRegex = /visual style:\s*[^/\]]+/i;
                if (newPrompt.match(visualStyleRegex)) {
                    newPrompt = newPrompt.replace(visualStyleRegex, `visual style: ${option}`);
                } else if (newPrompt.includes("Style:")) {
                    newPrompt = newPrompt.replace(/Style: \[.*?\]/, `Style: [visual style: ${option}]`);
                } else {
                    newPrompt += `, Style: [visual style: ${option}]`;
                }
            } else {
                // Handle room floors
                const roomName = category.replace(" Floor", "");
                // The prompt template uses "Beb room" and "Living room" and "Bad Room" (or "WC")
                // We'll try to match the room name in the prompt
                const regex = new RegExp(`${roomName}\\s*:\\s*[^,\\]]+`, 'i');
                
                // Special case for WC/Bad Room
                const wcRegex = /WC\s*:\s*[^,\\]+/i;
                const badRoomRegex = /Bad Room\s*:\s*[^,\\]+/i;
                
                if (roomName === "Bad Room") {
                    if (newPrompt.match(badRoomRegex)) {
                        newPrompt = newPrompt.replace(badRoomRegex, `Bad Room: ${option}`);
                    } else if (newPrompt.match(wcRegex)) {
                        newPrompt = newPrompt.replace(wcRegex, `WC: ${option}`);
                    } else {
                        newPrompt = newPrompt.replace(/materials \/ textures \//, `materials / textures / Bad Room: ${option}, `);
                    }
                } else if (newPrompt.match(regex)) {
                    newPrompt = newPrompt.replace(regex, `${roomName}: ${option}`);
                } else {
                    // If not found, check if materials section exists
                    if (newPrompt.includes("materials / textures / finishes")) {
                        newPrompt = newPrompt.replace(/materials \/ textures \/ finishes(.*?)]/, `materials / textures / finishes$1, ${roomName}: ${option}]`);
                    } else {
                        newPrompt += `, [materials: ${roomName}: ${option}]`;
                    }
                }
            }
            return newPrompt;
        });
        setExpanded3DCategory(null);
    };

    return (
        <div className="bg-gray-800 p-4 shadow-2xl flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">Bảng điều khiển</h2>
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                        title="Đóng bảng điều khiển"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
            
            <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                <div className="space-y-4">
                    {mode !== 'adjust' && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-300">{promptLabel}</label>
                                <div className="flex items-center space-x-2">
                                     <button onClick={() => setIsPromptModalOpen(true)} className="flex items-center text-xs text-gray-400 hover:text-white" title="Mở rộng cửa sổ prompt">
                                         <ArrowsPointingOutIcon className="w-4 h-4 mr-1" />
                                         Mở rộng
                                     </button>
                                    <div className="relative" ref={angleDropdownRef}>
                                        <button 
                                            onClick={() => setAngleDropdownOpen(p => !p)}
                                            className="flex items-center text-xs text-gray-400 hover:text-white"
                                        >
                                            <RotateCameraIcon className="w-4 h-4 mr-1"/>
                                            Góc máy
                                        </button>
                                        {isAngleDropdownOpen && (
                                            <div className="absolute top-full right-0 mt-2 w-40 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 py-1">
                                                {cameraAngles.map(angle => (
                                                    <button key={angle} onClick={() => handleAngleSelect(angle)}
                                                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-viettel-red hover:text-white"
                                                    >
                                                        {angle.charAt(0).toUpperCase() + angle.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setPrompt('')} className="text-xs text-gray-400 hover:text-white flex items-center" title="Xóa toàn bộ prompt">
                                        <ClearAllIcon className="w-4 h-4 mr-1" />
                                        Xóa
                                    </button>
                                </div>
                            </div>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={promptPlaceholder} className="w-full h-40 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:ring-2 focus:ring-viettel-red focus:border-viettel-red transition"/>
                        </div>
                    )}

                    {mode === 'generate' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tỉ lệ</label>
                                <div className="flex space-x-2">{aspectRatios.map(ratio => (<button key={ratio.id} onClick={() => setAspectRatio(ratio.id)} className={`flex-1 text-xs py-2 rounded-md transition-colors cursor-pointer ${aspectRatio === ratio.id ? 'bg-viettel-red text-white' : 'bg-gray-700 hover:bg-gray-600/50'}`}>{ratio.name}</button>))}</div>
                            </div>
                        </div>
                    )}
                    
                    {mode === 'refine' && (
                        <div className="space-y-4">
                            <SamplePrompts setPrompt={setPrompt} />
                            <MultiReferenceImageUpload
                                files={refineReferenceFiles}
                                setFiles={setRefineReferenceFiles}
                                previewUrls={refineReferencePreviewUrls}
                                title="Ảnh tham chiếu (tối đa 3)"
                                maxFiles={3}
                                sourceAspectRatio={sourceAspectRatio}
                            />
                        </div>
                    )}

                    {mode === 'floor-plan' && (
                        <div className="space-y-4">
                            <div className="bg-gray-700/50 p-3 rounded-lg">
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Tải lên bản vẽ sơ bộ hoặc phác thảo mặt bằng để chuyển đổi thành bản vẽ 2D chuyên nghiệp với phong cách tối giản và màu nước.
                                </p>
                            </div>
                            <MultiReferenceImageUpload
                                files={refineReferenceFiles}
                                setFiles={setRefineReferenceFiles}
                                previewUrls={refineReferencePreviewUrls}
                                title="Ảnh tham chiếu"
                                maxFiles={1}
                                sourceAspectRatio={sourceAspectRatio}
                            />
                            <div className="flex items-center space-x-2 bg-gray-700/30 p-3 rounded-lg border border-gray-600/50">
                                <input 
                                    type="checkbox" 
                                    id="showGrid" 
                                    checked={showGridAndDimensions} 
                                    onChange={(e) => setShowGridAndDimensions?.(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 text-viettel-red focus:ring-viettel-red bg-gray-800"
                                />
                                <label htmlFor="showGrid" className="text-sm text-gray-300 cursor-pointer select-none">
                                    Hiển thị lưới trục, ghi kích thước
                                </label>
                            </div>
                        </div>
                    )}

                    {mode === 'floor-plan-3d' && (
                        <div className="space-y-4">
                            <div className="bg-gray-700/50 p-3 rounded-lg">
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Chọn nhanh các tùy chọn để hoàn thiện mô tả mặt bằng 3D của bạn.
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                {Object.entries(floorPlan3DOptions).map(([category, options]) => (
                                    <div key={category} className="relative">
                                        <button
                                            onClick={() => setExpanded3DCategory(expanded3DCategory === category ? null : category)}
                                            className="w-full flex justify-between items-center p-2.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-200 transition-colors"
                                        >
                                            <span>{category}</span>
                                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${expanded3DCategory === category ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expanded3DCategory === category && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-xl z-30 py-1 max-h-48 overflow-y-auto">
                                                {options.map(option => (
                                                    <button
                                                        key={option}
                                                        onClick={() => handle3DOptionClick(category, option)}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-viettel-red hover:text-white transition-colors"
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'camera-angle' && (
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Tạo Multi Prompt</label>
                             <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                                 {!selectedImageId ? (
                                     <p className="text-sm text-gray-400">Chọn một ảnh để tạo multi-prompt.</p>
                                 ) : isGeneratingMoodboard ? (
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <SpinnerIcon className="w-8 h-8 text-viettel-red-light" />
                                        <p className="mt-2 text-gray-400 text-sm">Đang tạo...</p>
                                    </div>
                                 ) : moodboardError ? (
                                     <p className="text-sm text-red-400">{moodboardError}</p>
                                 ) : !hasMoodboard ? (
                                    <>
                                        <p className="text-sm text-gray-400 mb-4">Tạo 30 prompt cho các góc chụp và không gian khác nhau của công trình, kết hợp các yếu tố tiền cảnh, hậu cảnh để tăng tính sống động.</p>
                                        <button 
                                            onClick={onGenerateMoodboard} 
                                            className="w-full flex items-center justify-center px-4 py-2 bg-viettel-red text-white font-semibold rounded-lg hover:bg-viettel-red-dark transition-colors"
                                        >
                                            <GenerateIcon className="w-5 h-5 mr-2" />
                                            Tạo Multi Prompt
                                        </button>
                                    </>
                                 ) : (
                                     <button 
                                        onClick={onOpenMoodboard}
                                        className="w-full flex items-center justify-center px-4 py-2 bg-viettel-red text-white font-semibold rounded-lg hover:bg-viettel-red-dark transition-colors"
                                    >
                                        Mở Bảng Prompt
                                    </button>
                                 )}
                             </div>
                         </div>
                    )}
                    {mode === 'adjust' && (
                        !selectedImageId ? (
                            <div className="bg-gray-700/50 p-4 rounded-lg text-center text-gray-400">
                                <p>Chọn một ảnh để bắt đầu hiệu chỉnh.</p>
                            </div>
                        ) : (
                            <AdjustmentPanel
                                adjustments={activeImageAdjustments}
                                onAdjustmentChange={onAdjustmentChange}
                                onResetAll={onResetAdjustments}
                            />
                        )
                    )}
                </div>
            </div>
            <div className="flex-shrink-0 pt-4">
                 {mode !== 'adjust' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Số lượng ảnh: <span className="font-bold text-viettel-red-light">{numberOfImages}</span></label>
                        <input 
                            type="range" min="1" max="4" step="1" 
                            value={numberOfImages} onChange={(e) => setNumberOfImages(Number(e.target.value))} 
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-viettel-red"
                        />
                    </div>
                )}
                 {mode !== 'adjust' && (
                    <button onClick={onGenerate} disabled={(mode === 'generate' && !prompt.trim()) || (imageEditingModes.includes(mode) && !selectedImageId)} className="w-full flex items-center justify-center px-4 py-3 bg-viettel-red text-white font-semibold rounded-lg hover:bg-viettel-red-dark disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200">
                        <GenerateIcon className="w-5 h-5 mr-2" /> Tạo ảnh
                    </button>
                 )}
            </div>
        </div>
    );
};

export default ControlPanel;