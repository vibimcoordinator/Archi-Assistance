import React, { useState, useEffect, useRef, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import ImageDisplay from './components/ImageDisplay';
import TopBar from './components/TopBar';
import MoodboardModal from './components/MoodboardModal';
import PromptChatbot from './components/PromptChatbot';
import PromptModal from './components/PromptModal';
import { GenerationMode, GeneratedImage } from './types';
import { generateImage, describeImage, generateMoodboardPrompts, regenerateSpacePrompts } from './services/geminiService';
import { fileToBase64, dataUrlToBlobData, getImageDimensions, resizeImageAndCover, dataURLtoFile } from './utils';
import { ArrowUpIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, ResetViewIcon, Squares2x2Icon, UploadIcon } from './components/IconComponents';

// Layout constants
const IMAGE_CARD_WIDTH = 320;

const FLOOR_PLAN_SYSTEM_PROMPT = `Mục đích và Mục tiêu:
* Hỗ trợ người dùng tạo ra các hình ảnh mặt bằng kiến trúc 2D chuyên nghiệp từ các bản vẽ sơ bộ hoặc ảnh tham chiếu.
* PHÂN TÍCH VÀ MÔ PHỎNG: Phân tích kỹ lưỡng màu sắc, phong cách đường nét, và cách thể hiện các đối tượng trong ẢNH THAM CHIẾU. Ưu tiên sử dụng chính xác các tông màu, độ dày nét, và phong cách đồ họa từ ảnh tham chiếu đó cho ảnh tạo mới.
* Áp dụng phong cách tối giản (minimalist) kết hợp với hiệu ứng màu nước (watercolor) nếu ảnh tham chiếu có các yếu tố này.
* Đảm bảo bản vẽ thể hiện rõ ràng các thành phần kiến trúc, nội thất.
* Có đổ bóng nhẹ, mờ cho nội thất để tạo chút hiệu ứng 3D (nếu ảnh tham chiếu có đổ bóng, hãy mô phỏng theo).
* Bám sát bố cục theo hình ảnh tham chiếu.

Quy tắc và Hành vi:
1) Phân tích Đầu vào:
a) Tiếp nhận ảnh tham chiếu hoặc bản vẽ sơ bộ từ người dùng.
b) Xác định các khu vực chức năng: tường bao, tường ngăn, không gian nội thất, và khu vực sân vườn/cảnh quan.
c) TRÍCH XUẤT PHONG CÁCH: Nhận diện bảng màu (palette), độ dày nét (line weight), và cách tô màu (shading/watercolor style) từ ảnh tham chiếu.

2) Hướng dẫn Thực hiện Chi tiết:
a) Đường nét (Line Work):
- Mô phỏng phong cách đường nét từ ảnh tham chiếu. Nếu không rõ, sử dụng phân cấp độ dày nét: Tường bao đậm, nội thất mảnh.
- Wall Section (Phần cắt tường): Các bức tường (tường bao và tường ngăn) phải được tô màu Xám Đậm (Dark Gray) đặc, tạo sự tương phản rõ nét với không gian bên trong.
- Độ sạch (Cleanliness): Các đường nét phải thẳng, dứt khoát.

b) Màu sắc và Chất liệu (Color & Texture):
- Bảng màu (Palette): Sử dụng chính xác các tông màu từ ảnh tham chiếu.
- Sàn nhà và Nội thất (Flooring & Furniture): Màu sắc của đồ nội thất (giường, tủ, bàn ghế, v.v.) phải đồng nhất hoặc cùng tông màu với màu sàn nhà để tạo cảm giác không gian liền mạch và tối giản.
- Cảnh quan (Landscaping): Nếu ảnh tham chiếu có màu xanh lá cây màu nước, hãy áp dụng tương tự.

c) Hiệu ứng và Chiều sâu (Effects & Depth):
- Đổ bóng (Shadows): Mô phỏng hướng và độ mờ của bóng đổ từ ảnh tham chiếu.
- Phối cảnh (Perspective): Luôn tuân thủ góc nhìn từ trên xuống (top-down).

d) Trình bày (Presentation):
- Giữ cho bản vẽ trông thoáng đãng, chuyên nghiệp, giống như một bản vẽ mặt bằng được thực hiện bởi kiến trúc sư chuyên nghiệp.`;
const FLOOR_PLAN_3D_SYSTEM_PROMPT = `Mục tiêu và Nhiệm vụ:
* Đóng vai trò là một Kiến trúc sư chuyên nghiệp.
* NHIỆM VỤ QUAN TRỌNG NHẤT: Chuyển đổi chính xác mặt bằng 2D từ ẢNH THAM CHIẾU thành phối cảnh 3D (3D Floor Plan).
* ĐỘ CHÍNH XÁC TUYỆT ĐỐI: Phải giữ nguyên bố cục tường, vị trí cửa, và cách sắp xếp nội thất y hệt như trong ảnh mặt bằng 2D được cung cấp. Không được tự ý thay đổi cấu trúc không gian.
* GÓC NHÌN: Thể hiện góc nhìn phối cảnh từ trên cao (isometric/perspective view), thường là góc chéo 45 độ để thấy rõ chiều sâu không gian và độ dày của tường.
* THỂ HIỆN: 
  - Tường được cắt ngang (Wall Section) có màu xám đậm hoặc đen để làm nổi bật cấu trúc.
  - Nội thất, vật liệu sàn, và các chi tiết trang trí phải được thể hiện sinh động, có ánh sáng và đổ bóng thực tế.
  - Đảm bảo tính thẩm mỹ cao, phong cách kiến trúc hiện đại và sang trọng.`;
// Set a generous default height to prevent overlaps, especially with 9:16 portrait images
const IMAGE_CARD_DEFAULT_HEIGHT = 580; 
const GRID_GAP = 16; // Reduced gap for tighter layout
const IMAGES_PER_ROW = 8; // Increased images per row
const CELL_WIDTH = IMAGE_CARD_WIDTH + GRID_GAP;
const CELL_HEIGHT = IMAGE_CARD_DEFAULT_HEIGHT + GRID_GAP;

// Helper function to calculate the actual rendered height of an image card
const getCardHeight = (image: Pick<GeneratedImage, 'width' | 'height' | 'aspectRatio'>): number => {
    // Approximate heights of the non-image elements in the card
    // Top bar: ~28px, Bottom bar: ~20px
    const EXTRA_HEIGHT = 48; 

    if (image.width && image.height && image.width > 0) {
        // Calculate height from actual image dimensions, respecting the fixed card width
        return (IMAGE_CARD_WIDTH * image.height / image.width) + EXTRA_HEIGHT;
    }
    
    if (image.aspectRatio) {
        // Calculate height from aspect ratio string (e.g., '16:9')
        const parts = image.aspectRatio.split(':');
        if (parts.length === 2) {
            const w = parseFloat(parts[0]);
            const h = parseFloat(parts[1]);
            if (!isNaN(w) && !isNaN(h) && w > 0) {
                return (IMAGE_CARD_WIDTH * h / w) + EXTRA_HEIGHT;
            }
        }
    }

    // A fallback height if no dimensions or aspect ratio are available
    return IMAGE_CARD_DEFAULT_HEIGHT; 
}


const App: React.FC = () => {
    const [mode, setMode] = useState<GenerationMode>('generate');
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [refineReferenceFiles, setRefineReferenceFiles] = useState<File[]>([]);
    const [refineReferencePreviewUrls, setRefineReferencePreviewUrls] = useState<string[]>([]);
    const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
    const [describingImageId, setDescribingImageId] = useState<string | null>(null);
    
    const handleModeChange = (newMode: GenerationMode) => {
        setMode(newMode);
        if (newMode === 'generate') {
            setPrompt('');
        } else if (newMode === 'refine') {
            setPrompt("tạo ảnh chụp thực tế của ngôi nhà hiện đại, nằm trên 1 con phố yên tĩnh ít xe cộ ở Việt Nam, nắng dịu nhẹ buổi sáng.");
        } else if (newMode === 'camera-angle') {
            setPrompt("Góc nhìn từ trên cao, bao quát toàn cảnh ngôi nhà và sân vườn.");
        } else if (newMode === 'floor-plan') {
            setPrompt("Mặt bằng kiến trúc 2D, tuyệt đối bám Line, thể hiện chính xác theo bản vẽ về nội thất, vị trí phòng. Phong cách tối giản, màu nước xanh lá cây cho cảnh quan.");
        } else if (newMode === 'floor-plan-3d') {
            setPrompt("3D Cutaway view of [building / floor plan type] with [line style/Color schema].Show [Wall Section : Dark Gray color, Wall Face : White color, furniture, fixtures, carpets, tiles, window : Xinfa alumium]. Style: [visual style: Scandinavian High-Key / visual style: Path Tracing], [lighting / Subtle Shadow / mood], [materials / textures / finishes WC: Ceramic blue , Beb room: Chevron flooring, Living room : Marble]. ");
        } else {
            setPrompt('');
        }
    };
    
    // Generation options
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [showGridAndDimensions, setShowGridAndDimensions] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Canvas view state
    const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
    const [isDraggingOverWorkspace, setIsDraggingOverWorkspace] = useState(false);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const pannableContainerRef = useRef<HTMLDivElement>(null);

    const interactionRef = useRef<{
      type: 'pan' | 'drag' | null;
      startX: number;
      startY: number;
      initialView: { x: number; y: number };
      initialPositions: Map<string, {x: number; y: number}>;
      draggedIds?: string[];
    } | null>(null);

    // Moodboard state
    const [generatingMoodboardForId, setGeneratingMoodboardForId] = useState<string | null>(null);
    const [moodboardError, setMoodboardError] = useState<string | null>(null);
    const [isMoodboardModalOpen, setIsMoodboardModalOpen] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [regeneratingSpace, setRegeneratingSpace] = useState<string | null>(null);


    useEffect(() => {
        const objectUrls = refineReferenceFiles.map(file => URL.createObjectURL(file));
        setRefineReferencePreviewUrls(objectUrls);
        
        return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
    }, [refineReferenceFiles]);
    

    const isRectOverlapping = (rect1: {x:number, y:number, width:number, height:number}, rect2: {x:number, y:number, width:number, height:number}) => {
        return !(rect1.x >= rect2.x + rect2.width ||
                 rect1.x + rect1.width <= rect2.x ||
                 rect1.y >= rect2.y + rect2.height ||
                 rect1.y + rect1.height <= rect2.y);
    };

    const findNextAvailablePosition = (existingRects: {x:number, y:number, width:number, height:number}[], startPos?: {x: number, y: number}) => {
        const roundDown = (val: number, size: number) => Math.floor(val / size) * size;
        
        let y = startPos ? roundDown(startPos.y, CELL_HEIGHT) : 0;
        let x = startPos ? roundDown(startPos.x, CELL_WIDTH) : 0;
        
        let attempts = 0;
        const maxAttempts = 1000; // Prevent infinite loops

        while (attempts < maxAttempts) {
            let foundOverlap = false;
            // Use a rect that represents the cell for overlap check
            const newRect = { x, y, width: CELL_WIDTH, height: CELL_HEIGHT };

            for (const rect of existingRects) {
                if (isRectOverlapping(newRect, rect)) {
                    foundOverlap = true;
                    break;
                }
            }

            if (!foundOverlap) {
                return { x, y };
            }

            // Move to the next grid position
            x += CELL_WIDTH;
            if (x >= IMAGES_PER_ROW * CELL_WIDTH) {
                x = 0;
                y += CELL_HEIGHT;
            }
            attempts++;
        }
        // Fallback if no space is found
        const maxY = Math.max(0, ...existingRects.map(r => r.y));
        return { x: 0, y: roundDown(maxY, CELL_HEIGHT) + CELL_HEIGHT };
    };

    const addImageToGrid = useCallback((
        imageFile: File,
        type: 'upload' | 'paste' | 'drop',
        dropCoords?: { x: number; y: number }
    ) => {
        (async () => {
            const { src } = await fileToBase64(imageFile);

            let position: { x: number; y: number };
            if (dropCoords) {
                // Adjust position so the cursor is roughly in the center of the new card
                position = {
                    x: dropCoords.x - IMAGE_CARD_WIDTH / 2,
                    y: dropCoords.y - 30 // A bit of offset for the title bar
                };
            } else {
                const existingRects = images.map(img => ({ x: img.x, y: img.y, width: CELL_WIDTH, height: CELL_HEIGHT }));
                position = findNextAvailablePosition(existingRects);
            }

            const newImage: GeneratedImage = {
                id: `${type}-${Date.now()}`,
                src,
                prompt: imageFile.name || `${type}ed image`,
                mode: 'upload',
                isLoading: false,
                isUploaded: true,
                x: position.x,
                y: position.y,
            };

            setImages(prev => [newImage, ...prev]);
            getImageDimensions(src).then(({ width, height }) => {
                setImages(prev => prev.map(img =>
                    img.id === newImage.id ? { ...img, width, height } : img
                ));
            });
        })();
    }, [images]);

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        const items = event.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (!file) continue;
                event.preventDefault();
                addImageToGrid(file, 'paste');
                return;
            }
        }
    }, [addImageToGrid]);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);
    
    useEffect(() => {
        if (mode === 'generate') {
            setSelectedImageIds([]);
        }
    }, [mode]);

    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        if (!interactionRef.current) return;
        const { type, startX, startY, initialView, initialPositions } = interactionRef.current;

        if (type === 'pan') {
            const newX = initialView.x + (e.clientX - startX);
            const newY = initialView.y + (e.clientY - startY);
             if (pannableContainerRef.current) {
                pannableContainerRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${view.zoom})`;
            }
        } else if (type === 'drag') {
            const dx = (e.clientX - startX) / view.zoom;
            const dy = (e.clientY - startY) / view.zoom;
            
            initialPositions.forEach((startPos, id) => {
                const el = document.getElementById(`image-card-${id}`);
                if (el) {
                    el.style.transform = `translate(${startPos.x + dx}px, ${startPos.y + dy}px)`;
                }
            });
        }
    }, [view.zoom]);

    const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
        if (!interactionRef.current) return;
        const { type, startX, startY, initialView, initialPositions, draggedIds } = interactionRef.current;
        
        if (type === 'pan') {
             setView(v => ({...v, x: initialView.x + (e.clientX - startX), y: initialView.y + (e.clientY - startY)}));
        } else if (type === 'drag') {
            if (draggedIds) {
                draggedIds.forEach(id => {
                    document.getElementById(`image-card-${id}`)?.classList.remove('dragging');
                });
            }
            const dx = (e.clientX - startX) / view.zoom;
            const dy = (e.clientY - startY) / view.zoom;
            
            setImages(prev => prev.map(img => {
                if (initialPositions.has(img.id)) {
                    const startPos = initialPositions.get(img.id)!;
                    return { ...img, x: startPos.x + dx, y: startPos.y + dy };
                }
                return img;
            }));
        }
        
        interactionRef.current = null;
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        if (workspaceRef.current) workspaceRef.current.classList.remove('cursor-grabbing');

    }, [view.zoom, handleGlobalMouseMove]);
    
    const handleImageMouseDown = useCallback((id: string, e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only drag with left mouse button
        
        e.stopPropagation();

        const isCtrlPressed = e.ctrlKey || e.metaKey;
        if (!isCtrlPressed && mode === 'generate') setMode('refine');

        const newSelectedIds = isCtrlPressed
            ? selectedImageIds.includes(id) ? selectedImageIds.filter(sid => sid !== id) : [...selectedImageIds, id]
            : selectedImageIds.includes(id) ? selectedImageIds : [id];
            
        setSelectedImageIds(newSelectedIds);

        setImages(prev => {
            const selected = prev.find(img => img.id === id);
            return selected ? [selected, ...prev.filter(img => img.id !== id)] : prev;
        });

        const initialPositions = new Map<string, {x: number; y: number}>();
        newSelectedIds.forEach(imgId => {
            const img = images.find(i => i.id === imgId);
            if (img) {
                initialPositions.set(imgId, { x: img.x, y: img.y });
                document.getElementById(`image-card-${imgId}`)?.classList.add('dragging');
            }
        });

        interactionRef.current = {
            type: 'drag',
            startX: e.clientX,
            startY: e.clientY,
            initialView: { x: view.x, y: view.y },
            initialPositions,
            draggedIds: newSelectedIds,
        };
        
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

    }, [mode, selectedImageIds, images, view, handleGlobalMouseMove, handleGlobalMouseUp]);
    
    const handleWorkspaceMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Pan with middle mouse button
        if (e.button === 1) {
            e.preventDefault();
            if (workspaceRef.current) workspaceRef.current.classList.add('cursor-grabbing');
            interactionRef.current = {
                type: 'pan',
                startX: e.clientX,
                startY: e.clientY,
                initialView: { x: view.x, y: view.y },
                initialPositions: new Map(),
            };

            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return;
        }

        // Deselect with left click on background
        if (e.button === 0) {
            if ((e.target as HTMLElement).closest('[data-image-card-id]')) return;
            setSelectedImageIds([]);
        }
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const workspaceEl = workspaceRef.current;
        if (!workspaceEl || !pannableContainerRef.current) return;
        
        const rect = workspaceEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = 1.1;
        const newZoom = e.deltaY > 0 ? view.zoom / zoomFactor : view.zoom * zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 5));

        const mouseXInView = (mouseX - view.x) / view.zoom;
        const mouseYInView = (mouseY - view.y) / view.zoom;

        const newX = mouseX - mouseXInView * clampedZoom;
        const newY = mouseY - mouseYInView * clampedZoom;

        pannableContainerRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${clampedZoom})`;
        setView({ x: newX, y: newY, zoom: clampedZoom });
    };
    
    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement) === e.currentTarget) handleUploadClick();
    }, [handleUploadClick]);

    const handleFileUploaded = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) {
            addImageToGrid(event.target.files[0], 'upload');
            event.target.value = '';
        }
    };
    
    const handleGenerate = async () => {
        const imageEditingModes: GenerationMode[] = ['refine', 'camera-angle', 'floor-plan', 'floor-plan-3d'];
        const requiresReference = imageEditingModes.includes(mode);
        const activeImageId = selectedImageIds.length > 0 ? selectedImageIds[selectedImageIds.length - 1] : null;

        if (requiresReference && !activeImageId && (mode !== 'floor-plan' || refineReferenceFiles.length === 0)) {
            alert('Chế độ này yêu cầu chọn một ảnh trong không gian làm việc hoặc tải lên bản vẽ sơ bộ.');
            return;
        }
        
        const sourceImage = images.find(img => img.id === activeImageId);
        
        // Mark moodboard prompt as used
        if (sourceImage && mode === 'camera-angle') {
            const rootImageId = sourceImage.originId || sourceImage.id;
            setImages(prev => prev.map(img => {
                if (img.id === rootImageId && img.moodboardPrompts) {
                    const newPrompts = img.moodboardPrompts.map(p => 
                        p.prompt === prompt ? { ...p, isUsed: true } : p
                    );
                    return { ...img, moodboardPrompts: newPrompts };
                }
                return img;
            }));
        }

        const originId = sourceImage ? (sourceImage.originId || sourceImage.id) : undefined;

        let newRowY = GRID_GAP;
        if (images.length > 0) {
            // Calculate the position for the new row based on the actual bottom of the existing images
            const allBottoms = images.map(img => img.y + getCardHeight(img));
            newRowY = Math.max(0, ...allBottoms.filter(b => isFinite(b))) + GRID_GAP;
        }

        const numPlaceholders = numberOfImages;
        const newPlaceholders: GeneratedImage[] = [];

        for (let i = 0; i < numPlaceholders; i++) {
            const placeholderAspectRatio = sourceImage?.aspectRatio ?? aspectRatio;
            const newPlaceholder: GeneratedImage = {
                id: `${Date.now()}-${i}`,
                src: '', prompt, mode,
                isLoading: true,
                aspectRatio: placeholderAspectRatio,
                width: sourceImage?.width,
                height: sourceImage?.height,
                x: i * CELL_WIDTH,
                y: newRowY,
                originId,
            };
            newPlaceholders.push(newPlaceholder);
        }
        
        setImages(prev => [...newPlaceholders, ...prev]);
        
        try {
            const referenceImagesData: { data: string, mimeType: string }[] = [];
            
            if (requiresReference && sourceImage) {
                referenceImagesData.push(dataUrlToBlobData(sourceImage.src));
            }

            if (mode === 'refine' && refineReferenceFiles.length > 0) {
                const extraRefData = await Promise.all(refineReferenceFiles.map(file => fileToBase64(file)));
                extraRefData.forEach(fileData => referenceImagesData.push({ data: fileData.data, mimeType: fileData.mimeType }));
            }

            if (mode === 'floor-plan' && refineReferenceFiles.length > 0) {
                const extraRefData = await Promise.all(refineReferenceFiles.map(file => fileToBase64(file)));
                extraRefData.forEach(fileData => referenceImagesData.push({ data: fileData.data, mimeType: fileData.mimeType }));
            }

            let finalPrompt = prompt;
            if (mode === 'floor-plan' || mode === 'floor-plan-3d') {
                let instruction = mode === 'floor-plan' ? FLOOR_PLAN_SYSTEM_PROMPT : FLOOR_PLAN_3D_SYSTEM_PROMPT;
                if (mode === 'floor-plan') {
                    if (!showGridAndDimensions) {
                        instruction += "\n* QUAN TRỌNG: KHÔNG hiển thị lưới trục (grid lines), kích thước (dimensions), hay các ký hiệu ghi chú kỹ thuật trên bản vẽ. Chỉ tập trung vào không gian kiến trúc và nội thất.";
                    } else {
                        instruction += "\n* YÊU CẦU: Hiển thị rõ ràng lưới trục (grid lines) với các ký hiệu vòng tròn đánh số/chữ, và ghi chú kích thước (dimensions) chi tiết cho các không gian kiến trúc.";
                    }
                }
                finalPrompt = `${instruction}\n\nYêu cầu cụ thể: ${prompt}`;
            }
            
            const results = await generateImage({ prompt: finalPrompt, mode, referenceImages: referenceImagesData, numberOfImages: numPlaceholders, aspectRatio });
            const updates = await Promise.all(results.map(async (src) => ({ src, ...(await getImageDimensions(src)) })));

            const placeholderIds = newPlaceholders.map(p => p.id);

            setImages(prev => {
                const nextImages = [...prev];
                
                placeholderIds.forEach((id, index) => {
                    const imgIndex = nextImages.findIndex(img => img.id === id);
                    if (imgIndex === -1) return;

                    if (index < updates.length) {
                        // Success
                        nextImages[imgIndex] = {
                            ...nextImages[imgIndex],
                            ...updates[index],
                            isLoading: false,
                            error: undefined,
                        };
                    } else {
                        // Failure
                        nextImages[imgIndex] = {
                            ...nextImages[imgIndex],
                            isLoading: false,
                            error: "Tạo ảnh thất bại. Điều này có thể do cài đặt an toàn hoặc lỗi tạm thời.",
                        };
                    }
                });
                
                return nextImages;
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
            const placeholderIds = new Set(newPlaceholders.map(p => p.id));
             setImages(prev => prev.map(img => 
                placeholderIds.has(img.id) ? { ...img, error: errorMessage, isLoading: false } : img
            ));
        } finally {
            setRefineReferenceFiles([]);
        }
    };
    
    const handleDeleteImage = useCallback((id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
        setSelectedImageIds(prev => prev.filter(selectedId => selectedId !== id));
    }, []);
    
    const handleDescribeImage = useCallback(async (id: string) => {
        const imageToDescribe = images.find(img => img.id === id);
        if (!imageToDescribe) return;
        setDescribingImageId(id);
        try {
            const imageData = dataUrlToBlobData(imageToDescribe.src);
            const description = await describeImage(imageData);
            const formattedDescription = description.replace(/\*/g, '').trim();
            setPrompt(formattedDescription);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Không thể phân tích ảnh.";
            setPrompt(`Lỗi phân tích ảnh: ${errorMessage}`);
        } finally {
            setDescribingImageId(null);
        }
    }, [images]);
    
    const handleGenerateMoodboard = async () => {
        const activeImageId = selectedImageIds.length > 0 ? selectedImageIds[selectedImageIds.length - 1] : null;
        if (!activeImageId) return;
        const image = images.find(img => img.id === activeImageId);
        if (!image) return;

        const rootImageId = image.originId || image.id;
        setGeneratingMoodboardForId(rootImageId);
        setMoodboardError(null);

        try {
            const imageData = dataUrlToBlobData(image.src);
            const prompts = await generateMoodboardPrompts(imageData);
            setImages(prev => prev.map(img =>
                img.id === rootImageId ? { ...img, moodboardPrompts: prompts } : img
            ));
        } catch (error) {
            setMoodboardError(error instanceof Error ? error.message : "Không thể tạo moodboard.");
        } finally {
            setGeneratingMoodboardForId(null);
        }
    };
    
    const directionMap: { [key: string]: string } = {
        'top': 'phía trên', 'top-right': 'phía trên bên phải', 'right': 'bên phải',
        'bottom-right': 'phía dưới bên phải', 'bottom': 'phía dưới', 'bottom-left': 'phía dưới bên trái',
        'left': 'bên trái', 'top-left': 'phía trên bên trái',
    };

    const handleGenerateAnglePrompt = useCallback((direction: string) => {
        const directionName = directionMap[direction] || direction;
        setPrompt(`giữ nguyên chi tiết và vật liệu ảnh gốc, chuyển camera sang góc chụp ${directionName}`);
    }, []);
    
    const reorganizeImages = () => {
        const sortedImages = [...images].sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });

        const updatedImages = sortedImages.map((img, index) => {
            const row = Math.floor(index / IMAGES_PER_ROW);
            const col = index % IMAGES_PER_ROW;
            return {
                ...img,
                x: col * CELL_WIDTH,
                y: row * CELL_HEIGHT,
            };
        });
        setImages(updatedImages);
    };

    const activeImageId = selectedImageIds.length > 0 ? selectedImageIds[selectedImageIds.length - 1] : null;
    const activeImage = images.find(img => img.id === activeImageId);
    const rootImageId = activeImage ? (activeImage.originId || activeImage.id) : undefined;
    const rootImage = images.find(img => img.id === rootImageId);
    
    const sourceAspectRatio = activeImage?.width && activeImage?.height
        ? `${activeImage.width} / ${activeImage.height}`
        : undefined;
    
    const handleRegenerateMoodboardSpace = async (space: string) => {
        if (!rootImage) return;
        setRegeneratingSpace(space);
        try {
            const imageData = dataUrlToBlobData(rootImage.src);
            const newPromptsText = await regenerateSpacePrompts(imageData, space);
            setImages(prev => prev.map(img => {
                if (img.id === rootImageId && img.moodboardPrompts) {
                    const otherPrompts = img.moodboardPrompts.filter(p => p.space !== space);
                    const newSpacePrompts = newPromptsText.map(prompt => ({ space, prompt, isUsed: false }));
                    // To maintain order, we can try to insert back at a similar position
                    const allSpaces = [...new Set(img.moodboardPrompts.map(p => p.space))];
                    const insertIndex = allSpaces.indexOf(space);

                    const finalPrompts = [...otherPrompts];
                    if (insertIndex !== -1) {
                         const firstIndexOfNextSpace = finalPrompts.findIndex(p => allSpaces.indexOf(p.space) > insertIndex);
                         if (firstIndexOfNextSpace !== -1) {
                            finalPrompts.splice(firstIndexOfNextSpace, 0, ...newSpacePrompts);
                         } else {
                            finalPrompts.push(...newSpacePrompts);
                         }
                    } else {
                        finalPrompts.push(...newSpacePrompts);
                    }
                    
                    return { ...img, moodboardPrompts: finalPrompts };
                }
                return img;
            }));
        } catch (error) {
            console.error("Failed to regenerate prompts for", space, error);
            // Optionally, set an error state to show in the modal
        } finally {
            setRegeneratingSpace(null);
        }
    };
    
    const handleSelectMoodboardPrompt = (prompt: string) => {
        setPrompt(prompt);
        setIsMoodboardModalOpen(false);
    };
    
    const handleAdjustmentChange = useCallback((key: keyof NonNullable<GeneratedImage['adjustments']>, value: number) => {
        setImages(prev => prev.map(img => {
            if (selectedImageIds.includes(img.id)) {
                const currentAdjustments = img.adjustments || {
                    brightness: 100, contrast: 100, saturation: 100, temperature: 0, tint: 0
                };
                return { ...img, adjustments: { ...currentAdjustments, [key]: value } };
            }
            return img;
        }));
    }, [selectedImageIds]);

    const handleResetAdjustments = useCallback(() => {
        setImages(prev => prev.map(img => {
            if (selectedImageIds.includes(img.id)) {
                const { adjustments, ...rest } = img;
                return rest;
            }
            return img;
        }));
    }, [selectedImageIds]);
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDraggingOverWorkspace(true);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
        }
        setIsDraggingOverWorkspace(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverWorkspace(false);
    
        const files = e.dataTransfer.files;
        if (files && files.length > 0 && workspaceRef.current) {
            const rect = workspaceRef.current.getBoundingClientRect();
            
            // Fix: Explicitly type 'file' as 'File' to resolve a TypeScript error where the type was inferred as 'unknown'.
            const imageFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
    
            imageFiles.forEach((file, index) => {
                const dropX = (e.clientX - rect.left - view.x) / view.zoom;
                const dropY = (e.clientY - rect.top - view.y) / view.zoom;
                
                addImageToGrid(file, 'drop', {
                    x: dropX + index * GRID_GAP,
                    y: dropY + index * GRID_GAP
                });
            });
        }
    }, [view, addImageToGrid]);


    const CanvasControls = () => (
        <div className="absolute bottom-4 right-4 z-20 flex items-center bg-gray-800/80 backdrop-blur-sm p-1 rounded-lg shadow-lg space-x-1">
            <button onClick={reorganizeImages} className="p-2 hover:bg-gray-700 rounded-md" title="Tự động sắp xếp"><Squares2x2Icon className="w-5 h-5"/></button>
            <div className="w-px h-5 bg-gray-600 mx-1"></div>
            <button onClick={() => handleWheel({ deltaY: 1 } as React.WheelEvent<HTMLDivElement>)} className="p-2 hover:bg-gray-700 rounded-md"><MagnifyingGlassMinusIcon className="w-5 h-5"/></button>
            <span className="text-sm font-semibold w-12 text-center tabular-nums">{(view.zoom * 100).toFixed(0)}%</span>
            <button onClick={() => handleWheel({ deltaY: -1 } as React.WheelEvent<HTMLDivElement>)} className="p-2 hover:bg-gray-700 rounded-md"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
            <div className="w-px h-5 bg-gray-600 mx-1"></div>
            <button onClick={() => {
                 if (pannableContainerRef.current) {
                    pannableContainerRef.current.style.transform = `translate(0px, 0px) scale(1)`;
                }
                setView({ x: 0, y: 0, zoom: 1 });
            }} className="p-2 hover:bg-gray-700 rounded-md" title="Reset góc nhìn"><ResetViewIcon className="w-5 h-5"/></button>
        </div>
    );
    
    const promptsToShow = rootImage?.moodboardPrompts;
    const isGeneratingForSelected = rootImageId ? generatingMoodboardForId === rootImageId : false;

    return (
      <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
        <input type="file" ref={fileInputRef} onChange={handleFileUploaded} accept="image/*" className="hidden" />
        
        <div 
            ref={workspaceRef}
            className="flex-grow flex flex-col relative canvas-grid overflow-hidden cursor-grab"
            onMouseDown={handleWorkspaceMouseDown}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <TopBar mode={mode} setMode={handleModeChange} />
            <PromptChatbot 
                prompt={prompt} 
                setPrompt={setPrompt}
                onEdit={() => setIsPromptModalOpen(true)} 
            />
            {images.length > 0 ? (
                 <div 
                    ref={pannableContainerRef}
                    style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0' }}
                 >
                    <ImageDisplay 
                        images={images} 
                        onDelete={handleDeleteImage} 
                        onImageMouseDown={handleImageMouseDown}
                        selectedImageIds={selectedImageIds}
                        mode={mode}
                        onDescribe={handleDescribeImage}
                        describingImageId={describingImageId}
                        onGenerateAnglePrompt={handleGenerateAnglePrompt}
                    />
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center p-4 pointer-events-none">
                    <div
                        onClick={handleUploadClick}
                        className="group w-80 h-80 flex flex-col items-center justify-center text-center text-gray-500 border-4 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:bg-gray-800/50 hover:border-viettel-red transition-all duration-300 pointer-events-auto"
                    >
                        <ArrowUpIcon className="w-24 h-24 text-gray-600 transition-transform duration-300 group-hover:scale-110" />
                        <h2 className="text-2xl font-bold mt-4 text-gray-400">Tải ảnh lên để bắt đầu</h2>
                        <p className="mt-2 text-sm px-4">Nhấp vào đây, kéo & thả, dán, hoặc nhấp đúp vào nền.</p>
                    </div>
                </div>
            )}
            {isDraggingOverWorkspace && (
                <div className="absolute inset-0 z-50 bg-viettel-red/10 border-4 border-dashed border-viettel-red rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <UploadIcon className="w-24 h-24 text-viettel-red-light mx-auto" />
                        <p className="text-2xl font-bold text-white mt-4">Thả ảnh vào đây</p>
                    </div>
                </div>
            )}
            <CanvasControls/>
        </div>

        <div className="w-[450px] flex-shrink-0 border-l border-gray-700/50 z-10">
          <ControlPanel
              mode={mode} prompt={prompt} setPrompt={setPrompt}
              onGenerate={handleGenerate}
              refineReferenceFiles={refineReferenceFiles} setRefineReferenceFiles={setRefineReferenceFiles}
              refineReferencePreviewUrls={refineReferencePreviewUrls}
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
              numberOfImages={numberOfImages} setNumberOfImages={setNumberOfImages}
              selectedImageId={activeImageId}
              hasMoodboard={!!promptsToShow}
              isGeneratingMoodboard={isGeneratingForSelected}
              moodboardError={moodboardError}
              onGenerateMoodboard={handleGenerateMoodboard}
              onOpenMoodboard={() => setIsMoodboardModalOpen(true)}
              sourceAspectRatio={sourceAspectRatio}
              activeImageAdjustments={activeImage?.adjustments}
              onAdjustmentChange={handleAdjustmentChange}
              onResetAdjustments={handleResetAdjustments}
              showGridAndDimensions={showGridAndDimensions}
              setShowGridAndDimensions={setShowGridAndDimensions}
              isPromptModalOpen={isPromptModalOpen}
              setIsPromptModalOpen={setIsPromptModalOpen}
          />
        </div>
        
        {isMoodboardModalOpen && rootImage && (
            <MoodboardModal
                isOpen={isMoodboardModalOpen}
                onClose={() => setIsMoodboardModalOpen(false)}
                prompts={rootImage.moodboardPrompts || []}
                onSelectPrompt={handleSelectMoodboardPrompt}
                onRegenerateSpace={handleRegenerateMoodboardSpace}
                regeneratingSpace={regeneratingSpace}
            />
        )}
        <PromptModal 
            isOpen={isPromptModalOpen}
            onClose={() => setIsPromptModalOpen(false)}
            prompt={prompt}
            setPrompt={setPrompt}
        />
      </div>
    );
};

export default App;