import React, { useState } from 'react';
import { PencilIcon } from './IconComponents';
import { optimizePrompt } from '../services/geminiService';

interface PromptChatbotProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    onEdit: () => void;
}

const PromptChatbot: React.FC<PromptChatbotProps> = ({ prompt, setPrompt, onEdit }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    if (!prompt) return null;

    const handleOptimize = async () => {
        if (isOptimizing) return;
        setIsOptimizing(true);
        try {
            const optimized = await optimizePrompt(prompt);
            setPrompt(optimized);
        } catch (error) {
            console.error("Failed to optimize prompt:", error);
        } finally {
            setIsOptimizing(false);
        }
    };

    if (isCollapsed) {
        return (
            <button 
                onClick={() => setIsCollapsed(false)}
                className="p-3 bg-viettel-red rounded-full shadow-lg hover:bg-viettel-red-dark transition-all duration-300 animate-bounce group"
                title="Mở AI Prompt"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Mở AI Prompt
                </span>
            </button>
        );
    }

    return (
        <div className="w-[calc(100vw-3rem)] sm:w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-4 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-viettel-red/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-viettel-red-light">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                        </svg>
                    </div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Prompt</h3>
                </div>
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={handleOptimize}
                        disabled={isOptimizing}
                        className={`p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-viettel-red-light transition-colors ${isOptimizing ? 'animate-spin' : ''}`}
                        title="Tối ưu hóa prompt bằng AI"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                    <button 
                        onClick={onEdit}
                        className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Chỉnh sửa prompt"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsCollapsed(true)}
                        className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Thu gọn"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            
            <div className="relative group">
                <div className="text-sm text-gray-200 leading-relaxed max-h-48 overflow-y-auto pr-1 custom-scrollbar scrollbar-thin scrollbar-thumb-gray-600">
                    {isOptimizing ? (
                        <div className="flex flex-col items-center py-4 space-y-2">
                            <div className="w-8 h-8 border-2 border-viettel-red border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-gray-400">Đang tối ưu hóa...</span>
                        </div>
                    ) : prompt}
                </div>
                {!isOptimizing && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-viettel-red rounded-full animate-pulse shadow-[0_0_8px_rgba(238,0,51,0.6)]"></div>}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-medium italic">
                    {isOptimizing ? 'AI đang làm việc...' : 'Sẵn sàng tạo ảnh...'}
                </span>
                <div className="flex space-x-1">
                    <span className={`w-1 h-1 rounded-full ${isOptimizing ? 'bg-viettel-red animate-bounce' : 'bg-gray-600'}`}></span>
                    <span className={`w-1 h-1 rounded-full ${isOptimizing ? 'bg-viettel-red animate-bounce [animation-delay:0.2s]' : 'bg-gray-600'}`}></span>
                    <span className={`w-1 h-1 rounded-full ${isOptimizing ? 'bg-viettel-red animate-bounce [animation-delay:0.4s]' : 'bg-gray-600'}`}></span>
                </div>
            </div>
        </div>
    );
};

export default PromptChatbot;
