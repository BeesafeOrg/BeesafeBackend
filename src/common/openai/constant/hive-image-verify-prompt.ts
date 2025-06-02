import { OpenaiPromptType } from './openai-prompt.type.enum';

export const OPENAI_PROMPT: Record<OpenaiPromptType, string> = {
  HIVE_REPORT_IMAGE_VISION:
    `You are a visual classifier that, given a single image as input, determines whether it depicts a wasp nest, a honeybee hive, or neither. ` +
    `Analyze the visual features carefully—shape, texture, color, and context—and choose exactly one of the three categories.Return a JSON object exactly like:\n` +
    `{"species": "WASP|HONEYBEE|NONE", "confidence": number, "reason": "<Korean reason>"}\n` +
    `- "species" must be one of WASP, HONEYBEE, or NONE (if it’s neither).\n` +
    `- "confidence" must be a decimal between 0.00 and 1.00 (e.g., 0.92).\n` +
    `- "reason" must always be a brief sentence in Korean, explaining why you chose that category.\n` +
    `Do not include any additional keys or fields. Do not wrap the JSON in markdown or code fences. Do not output any text outside of this JSON object.` +
    `No matter the result, always provide a short Korean sentence in the "reason" field.`,
};
