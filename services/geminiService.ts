import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GenerationMode } from '../types';

interface GenerateImageParams {
    prompt: string;
    mode: GenerationMode;
    numberOfImages: number;
    aspectRatio: string;
    referenceImages?: {
        data: string; // base64 string without the data:image/... prefix
        mimeType: string;
    }[];
}

// Returns an array of base64 data URLs
export const generateImage = async ({ prompt, mode, referenceImages, numberOfImages, aspectRatio }: GenerateImageParams): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Use 'gemini-2.5-flash-image' for all image generation modes as it's the recommended default
    const parts: any[] = [];

    if (referenceImages && referenceImages.length > 0) {
        referenceImages.forEach(refImg => {
             parts.push({
                inlineData: {
                    data: refImg.data,
                    mimeType: refImg.mimeType,
                },
            });
        });
    }
    parts.push({ text: prompt });

    const generatedImages: string[] = [];
    let firstError: Error | null = null;
    
    for (let i = 0; i < numberOfImages; i++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            let imageFoundInResponse = false;
            
            // Check for prompt-level blocking first
            if (response.promptFeedback?.blockReason) {
                if (!firstError) {
                    const { blockReason, blockReasonMessage } = response.promptFeedback;
                    let userMessage = `Yêu cầu bị chặn vì lý do an toàn (${blockReason}).`;
                    if (blockReasonMessage) {
                        userMessage += ` ${blockReasonMessage}`;
                    }
                    firstError = new Error(userMessage);
                }
                continue; // Skip to the next iteration
            }

            if (!response.candidates || response.candidates.length === 0) {
                continue;
            }

            for (const candidate of response.candidates) {
                // Check for candidate-level blocking
                const finishReason = candidate.finishReason as string;
                if (finishReason && finishReason !== 'STOP' && finishReason !== 'UNSPECIFIED') {
                     if (!firstError) {
                         const safetyReasons = candidate.safetyRatings?.map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ');
                         let userMessage = `Nội dung bị chặn vì lý do: ${candidate.finishReason}.`;
                         if (safetyReasons) {
                            userMessage += ` Danh mục: ${safetyReasons}.`;
                         }
                         firstError = new Error(userMessage);
                     }
                     continue; // Skip to the next candidate
                }
                
                for (const part of candidate.content?.parts ?? []) {
                    if (part.inlineData) {
                        generatedImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                        imageFoundInResponse = true;
                    }
                }
            }

        } catch(e) {
            if (!firstError) {
                firstError = e instanceof Error ? e : new Error("Đã xảy ra lỗi không xác định trong quá trình tạo ảnh.");
            }
        }
    }
    
    if (generatedImages.length === 0) {
        if (firstError) {
            throw firstError;
        }
        throw new Error("API không trả về hình ảnh. Vui lòng kiểm tra lại prompt hoặc ảnh tham chiếu.");
    }
    
    return generatedImages;
};

export const describeImage = async (imageData: { data: string, mimeType: string }): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const descriptionPrompt = `Phân tích hình ảnh kiến trúc này và mô tả nó theo cấu trúc sau. Trả lời ngắn gọn, đi thẳng vào vấn đề cho mỗi mục. Không bao gồm bất kỳ câu giới thiệu nào, bắt đầu trực tiếp với mục đầu tiên:
- Chủ thể chính, phong cách kiến trúc:
- Vật liệu:
- Màu sắc:
- Chi tiết thành phần (mái, bồn hoa, ban công,..):
- Ánh sáng:
- Bao cảnh:
- Bầu trời:
- Tinh thần:`;

    const imagePart = {
        inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
        },
    };
    const textPart = { text: descriptionPrompt };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        if (response.text) {
            return response.text;
        } else if (response.promptFeedback?.blockReason) {
             const { blockReason, blockReasonMessage } = response.promptFeedback;
             let userMessage = `Yêu cầu bị chặn vì lý do an toàn (${blockReason}).`;
             if (blockReasonMessage) {
                 userMessage += ` ${blockReasonMessage}`;
             }
             throw new Error(userMessage);
        } else {
             throw new Error("Không thể tạo mô tả. API không trả về nội dung.");
        }
    } catch (e) {
        console.error("Lỗi khi mô tả ảnh:", e);
        throw e instanceof Error ? e : new Error("Đã xảy ra lỗi không xác định trong quá trình phân tích ảnh.");
    }
};


export const generateMoodboardPrompts = async (imageData: { data: string, mimeType: string }): Promise<{ space: string, prompt: string }[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const moodboardPrompt = `Dựa trên phong cách của hình ảnh kiến trúc được cung cấp, hãy tạo ra 30 prompt ngắn gọn, sáng tạo bằng tiếng Việt để tạo hình ảnh cho công trình này. Các prompt phải kết hợp ngẫu nhiên các yếu tố sau:
1.  **Góc chụp đa dạng:** cận cảnh, góc rộng, từ trên xuống, từ dưới lên, ngang tầm mắt, góc nhìn của chim, góc nhìn của côn trùng, v.v.
2.  **Không gian khác nhau:** tập trung vào các chi tiết kiến trúc, không gian nội thất (nếu có thể suy đoán), hoặc các khu vực ngoại thất khác nhau của công trình.
3.  **Yếu tố bổ sung:** thêm các yếu tố phù hợp vào tiền cảnh, trung cảnh và hậu cảnh để làm cho hình ảnh sống động hơn (ví dụ: cây cối, hoa lá, một chiếc xe đạp cũ, một con mèo đang sưởi nắng, người qua lại, chim bay trên trời, v.v.).
Đối với mỗi prompt, hãy đề xuất một "space" (không gian/góc chụp chính) và một "prompt" (mô tả chi tiết).
Chỉ trả về một mảng JSON hợp lệ gồm 30 đối tượng, trong đó mỗi đối tượng có key "space" (string) and "prompt" (string). Không thêm bất kỳ văn bản giải thích nào khác.`;

    const imagePart = {
        inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
        },
    };
    const textPart = { text: moodboardPrompt };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            space: { type: Type.STRING },
                            prompt: { type: Type.STRING },
                        },
                        required: ["space", "prompt"],
                    },
                },
            },
        });

        if (response.text) {
            const parsed = JSON.parse(response.text);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        throw new Error("API không trả về dữ liệu moodboard hợp lệ.");

    } catch (e) {
        console.error("Lỗi khi tạo moodboard:", e);
        throw e instanceof Error ? e : new Error("Đã xảy ra lỗi không xác định trong quá trình tạo moodboard.");
    }
};

export const regenerateSpacePrompts = async (imageData: { data: string, mimeType: string }, space: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const regenPrompt = `Dựa trên phong cách của hình ảnh kiến trúc được cung cấp, hãy tạo ra 5 prompt mới mẻ, sáng tạo bằng tiếng Việt cho chủ đề "${space}". Các prompt này nên khám phá các góc máy và yếu tố bổ sung (tiền cảnh, hậu cảnh, thời tiết, ánh sáng) khác nhau liên quan đến chủ đề đó.
Chỉ trả về một mảng JSON hợp lệ chứa 5 chuỗi prompt. Không thêm bất kỳ văn bản giải thích nào khác.`;

    const imagePart = {
        inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
        },
    };
    const textPart = { text: regenPrompt };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
            },
        });

        if (response.text) {
            const parsed = JSON.parse(response.text);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                return parsed;
            }
        }
        throw new Error("API không trả về dữ liệu prompt hợp lệ.");
    } catch (e) {
        console.error(`Lỗi khi tạo lại prompt cho không gian "${space}":`, e);
        throw e instanceof Error ? e : new Error(`Đã xảy ra lỗi không xác định trong quá trình tạo lại prompt cho không gian "${space}".`);
    }
};

export const optimizePrompt = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = "Bạn là một chuyên gia viết prompt cho AI tạo hình ảnh kiến trúc. Hãy tối ưu hóa prompt sau đây để tạo ra hình ảnh chất lượng cao, chi tiết và chuyên nghiệp hơn. Giữ nguyên ý tưởng gốc nhưng thêm các từ khóa về ánh sáng, vật liệu, chất lượng hình ảnh và phong cách kiến trúc phù hợp. Trả về prompt đã tối ưu hóa bằng tiếng Việt hoặc tiếng Anh tùy theo ngôn ngữ gốc, nhưng ưu tiên sự rõ ràng và hiệu quả cho AI tạo ảnh. KHÔNG giải thích, chỉ trả về prompt đã tối ưu.";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: `Tối ưu hóa prompt này: ${prompt}` }] },
            config: {
                systemInstruction: systemInstruction,
            }
        });

        if (response.text) {
            return response.text.trim();
        }
        throw new Error("Không thể tối ưu hóa prompt.");
    } catch (e) {
        console.error("Lỗi khi tối ưu hóa prompt:", e);
        throw e instanceof Error ? e : new Error("Đã xảy ra lỗi khi tối ưu hóa prompt.");
    }
};
