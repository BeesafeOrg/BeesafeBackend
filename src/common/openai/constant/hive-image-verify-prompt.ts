import { OpenaiPromptType } from './openai-prompt.type.enum';

export const OPENAI_PROMPT: Record<OpenaiPromptType, string> = {
  HIVE_REPORT_IMAGE_VISION:
    `Return a JSON object exactly like {"isValid": true|false, "reason": "<Korean reason>"}. ` +
    `"isValid" must be true only when the main subject of the photo is a reusable beverage cup, ` +
    `including reusable plastic tumblers, stainless-steel, glass, or ceramic cups. ` +
    `Disposable single-use plastic or paper take-out cups must be marked false. ` +
    `No matter the result, always provide a short Korean sentence in the "reason" field.`,
};
