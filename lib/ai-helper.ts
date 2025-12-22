import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. Transcribe Audio (Distil-Whisper)
export async function getTranscript(audioUrl: string) {
  console.log("Starting transcription for:", audioUrl);
  try {
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    
    // Convert Blob to File-like object for Groq
    const file = new File([blob], "input.mp3", { type: "audio/mpeg" });

    const completion = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo",
      response_format: "text",
    });

    return completion; // Returns the text string
  } catch (error) {
    console.error("Transcription Error:", error);
    return null;
  }
}

// 2. Generate Social Posts (Llama 3)
export async function generateSocialInfo(transcript: string) {
  console.log("Generating social metadata...");
  
  const prompt = `
  Analyze this video transcript and generate social media assets.
  Return strictly valid JSON with no markdown. Structure:
  {
    "title": "YouTube Title (Catchy, <60 chars)",
    "description": "YouTube Description (SEO optimized, 2 sentences)",
    "twitter": ["Tweet 1", "Tweet 2 (Thread)"],
    "linkedin": "Professional post text",
    "instagram": "Casual caption with hashtags"
  }

  TRANSCRIPT:
  ${transcript.substring(0, 20000)}
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}