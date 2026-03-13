import React from 'react';
import { GenerationMode } from '../types';
import {
    GenerateIcon, PencilIcon, RotateCameraIcon, SlidersIcon, FloorPlanIcon, FloorPlan3DIcon
} from './IconComponents';

export const modes: { id: GenerationMode; name: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'generate', name: 'Tạo mới', icon: GenerateIcon },
    { id: 'refine', name: 'Tinh chỉnh', icon: PencilIcon },
    { id: 'camera-angle', name: 'Góc nhìn', icon: RotateCameraIcon },
    { id: 'adjust', name: 'Hiệu chỉnh', icon: SlidersIcon },
    { id: 'floor-plan', name: 'Mặt bằng', icon: FloorPlanIcon },
    { id: 'floor-plan-3d', name: '3D\nMặt bằng', icon: FloorPlan3DIcon },
];

interface TopBarProps {
    mode: GenerationMode;
    setMode: (mode: GenerationMode) => void;
}

const TopBar: React.FC<TopBarProps> = ({ mode, setMode }) => {
    return (
        <div className="absolute top-0 left-0 z-20 p-2">
            <div className="flex items-center space-x-1 bg-gray-800/80 backdrop-blur-sm p-1 rounded-xl shadow-lg">
                {modes.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`flex flex-col items-center justify-center p-1 border border-black transition-colors duration-200 aspect-square w-16 cursor-pointer ${mode === m.id ? 'bg-viettel-red text-white' : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'}`}
                        title={m.name}
                    >
                        <m.icon className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-medium text-center leading-tight whitespace-pre-line">{m.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TopBar;