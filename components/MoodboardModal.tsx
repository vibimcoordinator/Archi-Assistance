import React, { useMemo } from 'react';
import { ResetViewIcon, SpinnerIcon, XMarkIcon } from './IconComponents';

interface MoodboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    prompts: { space: string; prompt: string; isUsed?: boolean }[];
    onSelectPrompt: (prompt: string) => void;
    onRegenerateSpace: (space: string) => void;
    regeneratingSpace: string | null;
}

const MoodboardModal: React.FC<MoodboardModalProps> = ({ isOpen, onClose, prompts, onSelectPrompt, onRegenerateSpace, regeneratingSpace }) => {
    
    const groupedPrompts = useMemo(() => {
        return prompts.reduce((acc, current) => {
            (acc[current.space] = acc[current.space] || []).push(current);
            return acc;
        }, {} as Record<string, { space: string; prompt: string; isUsed?: boolean }[]>);
    }, [prompts]);

    if (!isOpen) return null;

    const handlePromptClick = (prompt: string) => {
        onSelectPrompt(prompt);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Bảng Multi Prompt</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow p-6 overflow-y-auto">
                    {Object.keys(groupedPrompts).length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Không có ý tưởng nào được tạo.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* FIX: Refactor to use Object.keys().map() for better type safety and add a guard. */}
                            {Object.keys(groupedPrompts).map((space) => {
                                const spacePrompts = groupedPrompts[space];
                                if (!Array.isArray(spacePrompts)) return null;

                                return (
                                <div key={space} className="bg-gray-900/50 p-4 rounded-lg flex flex-col">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-viettel-red-light">{space}</h3>
                                        <button 
                                            onClick={() => onRegenerateSpace(space)}
                                            disabled={regeneratingSpace === space}
                                            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-wait"
                                            title={`Tạo lại ý tưởng cho ${space}`}
                                        >
                                            {regeneratingSpace === space ? <SpinnerIcon className="w-5 h-5" /> : <ResetViewIcon className="w-5 h-5"/>}
                                        </button>
                                    </div>
                                    <div className="space-y-2 flex-grow">
                                        {spacePrompts.map((p, index) => (
                                             <button
                                                key={index}
                                                onClick={() => handlePromptClick(p.prompt)}
                                                className={`w-full text-left bg-gray-700/50 p-3 rounded-md hover:bg-gray-700 transition-colors group text-sm ${p.isUsed ? 'opacity-60 ring-1 ring-viettel-red/50' : ''}`}
                                            >
                                                <p className="text-gray-300">{p.prompt}</p>
                                             </button>
                                        ))}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MoodboardModal;