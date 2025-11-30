
import { GoogleGenAI, Type } from "@google/genai";
import { WordItem } from "../types";
import { db } from "./db";

const getAIClient = async () => {
  // 1. Try to get from DB settings
  const settings = await db.settings.toArray();
  const userSettings = settings[0];

  const apiKey = userSettings?.apiKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Missing API Key. Please configure it in Settings.");
  }
  
  return new GoogleGenAI({ 
    apiKey: apiKey,
  }); 
};

// Updated signature to just take raw data, calling function handles DB mapping logic essentially
export const generateWordData = async (wordsRaw: { word: string }[]): Promise<Omit<WordItem, 'id' | 'bookId' | 'unitId'>[]> => {
  const ai = await getAIClient();
  // Use Faster Flash Model
  const model = "gemini-2.5-flash";
  const processedWords: any[] = [];

  const BATCH_SIZE = 5;
  
  for (let i = 0; i < wordsRaw.length; i += BATCH_SIZE) {
    const batch = wordsRaw.slice(i, i + BATCH_SIZE);
    
    const prompt = `
      Task: Generate vocabulary quiz data for Chinese students.
      Target Words: ${batch.map(w => w.word).join(', ')}
      
      Return JSON List.
      Each item must have:
      - word: The original English word.
      - correct_meaning: Concise Chinese definition (max 10 chars).
      - example: Simple English sentence using the word.
      - options: Array of 4 Chinese strings. 1 correct meaning, 3 plausible distractors (not random unrelated words).
      - correct_index: 0-3 indicating the correct option.
    `;

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          // thinkingConfig removed as it is not supported on Flash models
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                correct_meaning: { type: Type.STRING },
                example: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correct_index: { type: Type.INTEGER }
              },
              required: ["word", "correct_meaning", "example", "options", "correct_index"]
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        
        data.forEach((aiItem: any) => {
          const original = batch.find(b => b.word.toLowerCase() === aiItem.word.toLowerCase());
          if (original) {
            processedWords.push({
              word: original.word,
              correct_meaning: aiItem.correct_meaning,
              example: aiItem.example,
              options: aiItem.options,
              correct_index: aiItem.correct_index
            });
          }
        });
      }
    } catch (error) {
      console.error("Error generating word data:", error);
      throw error; // Re-throw to let UI handle it
    }
  }

  return processedWords;
};
