export type GenerationMode = 'generate' | 'refine' | 'camera-angle' | 'adjust' | 'floor-plan' | 'floor-plan-3d';

export interface GeneratedImage {
    id: string;
    src: string;
    prompt: string;
    mode: GenerationMode | 'upload';
    isLoading: boolean;
    error?: string;
    width?: number;
    height?: number;
    aspectRatio?: string; // e.g., '1:1', '16:9'
    isUploaded?: boolean;
    x: number;
    y: number;
    originId?: string;
    moodboardPrompts?: { space: string; prompt: string; isUsed?: boolean }[];
    styleReference?: { src: string }[];
    adjustments?: {
        brightness: number; // default 100
        contrast: number;   // default 100
        saturation: number; // default 100
        temperature: number;// default 0, range -100 to 100
        tint: number;       // default 0, range -100 to 100
    };
}