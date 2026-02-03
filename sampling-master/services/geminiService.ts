
import { GoogleGenAI } from "@google/genai";
import { SamplingMethod } from "../types";

export const getSamplingInsights = async (method: SamplingMethod, sampleSize: number, populationSize: number): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Explain the ${method} sampling method for a population of ${populationSize} where we are picking ${sampleSize} units. 
  Include:
  1. A simple one-sentence definition.
  2. One major advantage of this method.
  3. One common bias or limitation.
  4. Use professional yet accessible language. Format the response in Markdown with clear headings.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights available at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to load educational insights. Please try again later.";
  }
};
