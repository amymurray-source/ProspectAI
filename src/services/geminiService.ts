import { GoogleGenAI, Type } from "@google/genai";
import { IntentParsingResult, Prospect } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseIntent(prompt: string): Promise<IntentParsingResult> {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse the following prospecting request into structured filters for a lead database.
    Focus on extracting the desired programmatic channels from the request.
    AI Digital Capabilities include: CTV/OTT, Online Video, YouTube, Programmatic Display, Native, Rich Media, Digital Audio, DOOH, Social (Meta, TikTok, LinkedIn, Pinterest, Snapchat, Reddit), Retail Media (Walmart Connect), Apple News/Search.
    
    Request: "${prompt}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          filters: {
            type: Type.OBJECT,
            properties: {
              region: { type: Type.STRING, description: "Geographic focus" },
              companyType: { type: Type.STRING, description: "Type of business" },
              opportunity: { type: Type.STRING, description: "Key pain point or opportunity signal" },
              seniority: { type: Type.STRING, description: "Target seniority level" },
              role: { type: Type.STRING, description: "Target role or function" },
              channels: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Specific programmatic channels mentioned or implied"
              },
            }
          },
          summary: { type: Type.STRING, description: "A brief 1-sentence summary of the search intent." }
        },
        required: ["filters", "summary"]
      }
    }
  });

  try {
    return JSON.parse(result.text || "{}");
  } catch (e) {
    console.error("Failed to parse intent JSON", e);
    return {
      filters: {},
      summary: "Could not parse intent."
    };
  }
}

export async function enrichProspects(prospects: Prospect[], goal: string): Promise<Prospect[]> {
  const enriched = await Promise.all(prospects.map(async (p) => {
    const enrichment = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the sales goal: "${goal}", enrich this prospect for outreach.
      
      AI Digital's multi-channel capabilities include: 
      - CTV/OTT (Paramount, Hulu/Disney, Amazon Prime)
      - Digital Audio (Spotify, Pandora, iHeart)
      - DOOH (Vistar Media)
      - Social (LinkedIn for B2B, Meta/TikTok for Consumer)
      - Native, Display, YouTube, & Programmatic Video (High impact and rich media formats)
      - Retail Media (Walmart Connect)

      Prospect Info:
      Company: ${p.companyName}
      Contact: ${p.contactName} (${p.title})
      Signal: ${p.opportunitySignal}
      Trigger: ${p.recentTriggerEvent}
      
      Provide a personalized outreach strategy including recommended programmatic channels.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedChannels: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Top 2-3 programmatic channels suitable for this prospect"
            },
            outreachAngle: { type: Type.STRING, description: "The specific value proposition for this prospect" },
            firstLine: { type: Type.STRING, description: "A high-impact, personalized first-line opener" },
            nextStep: { type: Type.STRING, description: "Recommended next action for the seller" }
          },
          required: ["recommendedChannels", "outreachAngle", "firstLine", "nextStep"]
        }
      }
    });

    try {
      const data = JSON.parse(enrichment.text || "{}");
      return { ...p, ...data };
    } catch (e) {
      console.error("Failed to parse enrichment JSON", e);
      return p;
    }
  }));

  return enriched;
}

export async function performLiveResearch(companyName: string, contactName: string): Promise<any> {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Conduct a live research deep-dive for ${companyName} and their decision maker ${contactName}.
    Find recent news, financial updates, LinkedIn activity cues, and current strategic priorities.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Executive summary of live search findings" },
          recentHeadlines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                date: { type: Type.STRING }
              }
            }
          },
          keyIntelligence: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Bullet points of key findings"
          },
          sentiment: { type: Type.STRING, enum: ["positive", "neutral", "negative"] }
        },
        required: ["summary", "recentHeadlines", "keyIntelligence", "sentiment"]
      }
    }
  });

  try {
    return JSON.parse(result.text || "{}");
  } catch (e) {
    console.error("Failed to parse research JSON", e);
    return null;
  }
}
