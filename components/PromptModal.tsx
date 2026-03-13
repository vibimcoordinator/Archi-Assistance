import React, { useState, useEffect } from 'react';
import { XMarkIcon } from './IconComponents';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    prompt: string;
    setPrompt: (prompt: string) => void;
}

const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, prompt, setPrompt }) => {
    const [localPrompt, setLocalPrompt] = useState(prompt);

    useEffect(() => {
        setLocalPrompt(prompt);
    }, [prompt, isOpen]);

    const handleSaveAndClose = () => {
        setPrompt(localPrompt);
        onClose();
    };
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleSaveAndClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleSaveAndClose]);


    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={handleSaveAndClose}
        >
            <div 
                className="bg-gray-800 w-full max-w-2xl h-full max-h-[70vh] rounded-2xl shadow-2xl flex flex-col border border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Chỉnh sửa Prompt</h2>
                    <button onClick={handleSaveAndClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow p-4">
                    <textarea
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        placeholder="VD: Một biệt thự hiện đại bên bờ biển lúc hoàng hôn, phong cách tối giản..."
                        className="w-full h-full bg-gray-900 border border-gray-600 rounded-md p-3 text-base text-gray-200 focus:ring-2 focus:ring-viettel-red focus:border-viettel-red transition resize-none"
                        autoFocus
                    />
                </div>
                
                 <div className="flex-shrink-0 p-4 border-t border-gray-700">
                    <button 
                        onClick={handleSaveAndClose}
                        className="w-full px-4 py-3 bg-viettel-red text-white font-semibold rounded-lg hover:bg-viettel-red-dark transition-colors duration-200"
                    >
                        Lưu và Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptModal;