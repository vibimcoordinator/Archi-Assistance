import React, { useState, useEffect, useCallback, useRef } from 'react';

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move';

interface CropBoxProps {
    box: { x: number; y: number; width: number; height: number; };
    onBoxChange: (box: { x: number; y: number; width: number; height: number; }) => void;
    imageBounds: { width: number; height: number; }; // These are percentage based, e.g. 100x100
    aspectRatio?: string;
}

const MIN_SIZE_PERCENT = 5; // Minimum size as a percentage of the container

const CropBox: React.FC<CropBoxProps> = ({ box, onBoxChange, imageBounds, aspectRatio }) => {
    const [internalBox, setInternalBox] = useState(box);
    const interactionRef = useRef<{
        handle: Handle;
        startBox: typeof box;
        startMouse: { x: number; y: number; };
        containerRect: DOMRect;
    } | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync internal state with external prop changes (e.g., initial load or aspect ratio change from controls)
    useEffect(() => {
        setInternalBox(box);
    }, [box]);

    const handleMouseDown = (e: React.MouseEvent, handle: Handle) => {
        e.preventDefault();
        e.stopPropagation();
        
        const containerEl = containerRef.current;
        if (!containerEl) return;
        
        interactionRef.current = {
            handle,
            startBox: internalBox,
            startMouse: { x: e.clientX, y: e.clientY },
            containerRect: containerEl.getBoundingClientRect(),
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!interactionRef.current) return;
        
        const { handle, startBox, startMouse, containerRect } = interactionRef.current;
        if (containerRect.width === 0 || containerRect.height === 0) return;

        const dx = ((e.clientX - startMouse.x) / containerRect.width) * 100;
        const dy = ((e.clientY - startMouse.y) / containerRect.height) * 100;
        
        let { x, y, width, height } = startBox;

        const ar = aspectRatio && aspectRatio !== 'free'
            ? (() => { const [w, h] = aspectRatio.split(':').map(Number); return w / h; })()
            : null;

        if (handle === 'move') {
            x = startBox.x + dx;
            y = startBox.y + dy;
        } else { // Resize
            let newX = x;
            let newY = y;
            let newWidth = width;
            let newHeight = height;

            // Apply deltas based on handle
            if (handle.includes('e')) newWidth = startBox.width + dx;
            if (handle.includes('w')) { newWidth = startBox.width - dx; newX = startBox.x + dx; }
            if (handle.includes('s')) newHeight = startBox.height + dy;
            if (handle.includes('n')) { newHeight = startBox.height - dy; newY = startBox.y + dy; }
            
            // Enforce aspect ratio
            if (ar) {
                if (handle.includes('n') || handle.includes('s')) {
                    newWidth = newHeight * ar;
                } else {
                    newHeight = newWidth / ar;
                }

                if (handle.includes('w')) newX = startBox.x + startBox.width - newWidth;
                if (handle.includes('n')) newY = startBox.y + startBox.height - newHeight;
            }
            
            x = newX;
            y = newY;
            width = newWidth;
            height = newHeight;
        }

        // Enforce min size
        if (width < MIN_SIZE_PERCENT) {
            width = MIN_SIZE_PERCENT;
            if (handle.includes('w')) x = startBox.x + startBox.width - width;
        }
        if (height < MIN_SIZE_PERCENT) {
            height = MIN_SIZE_PERCENT;
            if (handle.includes('n')) y = startBox.y + startBox.height - height;
        }

        // Clamp to image boundaries
        if (x < 0) {
            width += x;
            x = 0;
        }
        if (y < 0) {
            height += y;
            y = 0;
        }
        if (x + width > imageBounds.width) {
            width = imageBounds.width - x;
        }
        if (y + height > imageBounds.height) {
            height = imageBounds.height - y;
        }
        
        // After clamping, re-apply aspect ratio if necessary
        if (ar) {
            if(width / height > ar) { // Too wide
                const oldWidth = width;
                width = height * ar;
                if(handle.includes('w')) x += oldWidth - width;
            } else { // Too tall
                const oldHeight = height;
                height = width / ar;
                if(handle.includes('n')) y += oldHeight - height;
            }
        }

        setInternalBox({ x, y, width, height });
    }, [aspectRatio, imageBounds]);

    const handleMouseUp = useCallback(() => {
        if (interactionRef.current) {
             onBoxChange(internalBox);
        }
        interactionRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [internalBox, onBoxChange, handleMouseMove]);

    const handles: Handle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    const handleClasses = "absolute bg-white rounded-full w-3 h-3 -m-1.5 border-2 border-gray-800";
    const getHandleCursor = (handle: Handle) => {
        if (handle === 'move') return 'cursor-move';
        if (handle === 'n' || handle === 's') return 'cursor-ns-resize';
        if (handle === 'e' || handle === 'w') return 'cursor-ew-resize';
        if (handle === 'nw' || handle === 'se') return 'cursor-nwse-resize';
        if (handle === 'ne' || handle === 'sw') return 'cursor-nesw-resize';
        return 'cursor-default';
    }


    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none">
            {/* Overlay */}
            <div className="absolute inset-0 z-20" style={{
                boxShadow: `inset 0 0 0 9999px rgba(0,0,0,0.6)`,
                clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    0% ${internalBox.y}%, 
                    ${internalBox.x}% ${internalBox.y}%,
                    ${internalBox.x}% ${internalBox.y + internalBox.height}%,
                    ${internalBox.x + internalBox.width}% ${internalBox.y + internalBox.height}%,
                    ${internalBox.x + internalBox.width}% ${internalBox.y}%,
                    0% ${internalBox.y}%
                )`,
                clipRule: 'evenodd'
            }}></div>
        
            {/* Bounding box */}
            <div
                className="absolute z-30 border-2 border-dashed border-white cursor-move pointer-events-auto"
                style={{
                    left: `${internalBox.x}%`,
                    top: `${internalBox.y}%`,
                    width: `${internalBox.width}%`,
                    height: `${internalBox.height}%`,
                    boxSizing: 'border-box'
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
                {/* Handles */}
                {handles.map(handle => (
                    <div
                        key={handle}
                        className={`${handleClasses} ${getHandleCursor(handle)}`}
                        style={{
                            top: handle.includes('s') ? '100%' : handle.includes('n') ? '0' : '50%',
                            left: handle.includes('e') ? '100%' : handle.includes('w') ? '0' : '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        onMouseDown={(e) => handleMouseDown(e, handle)}
                    />
                ))}
                 {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-around pointer-events-none">
                    <div className="w-full h-px bg-white/50"></div>
                    <div className="w-full h-px bg-white/50"></div>
                </div>
                 <div className="absolute inset-0 flex justify-around pointer-events-none">
                    <div className="h-full w-px bg-white/50"></div>
                    <div className="h-full w-px bg-white/50"></div>
                </div>
            </div>
        </div>
    );
};

export default CropBox;