import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ------------------------------------------------------------------
// 1. ROBUST TRANSCRIPTION (Whisper)
// ------------------------------------------------------------------
export async function getTranscript(audioUrl: string) {
  console.log("🎙️ Starting transcription for:", audioUrl);
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    
    const blob = await response.blob();
    
    // Create a File object (Node 20+ supports this natively)
    const file = new File([blob], "input.mp3", { type: "audio/mpeg" });

    const completion = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo", // Fast and accurate
      response_format: "verbose_json",  // More reliable than 'text' for long files
    });

    return completion.text;
  } catch (error) {
    console.error("❌ Transcription Error:", error);
    // Return empty string so the pipeline continues (we can still generate thumbnails)
    return ""; 
  }
}

// ------------------------------------------------------------------
// 2. SOCIAL GENERATION (Llama 3 70B - Strict JSON)
// ------------------------------------------------------------------
export async function generateSocialInfo(transcript: string) {
  console.log("🧠 Generating social metadata...");

  // If transcription failed, return generic data immediately
  if (!transcript || transcript.length < 50) {
    return getFallbackData();
  }

  try {
    const completion = await groq.chat.completions.create({
      // 🟢 CHANGE 1: Use 70B Model (Much smarter at JSON structure)
      model: "llama-3.3-70b-versatile", 
      
      // 🟢 CHANGE 2: Strict JSON Mode
      response_format: { type: "json_object" },
      
      messages: [
        {
          role: "system",
          content: `You are a social media expert. 
          Your task is to analyze the provided video transcript and generate metadata.
          
          CRITICAL RULES:
          1. Output MUST be valid JSON.
          2. Do not include markdown formatting (like \`\`\`json).
          3. "twitter" must be an Array of strings.
          
          JSON Schema to follow:
          {
            "title": "YouTube Title (Catchy, under 60 chars)",
            "description": "YouTube Description (SEO optimized, 2 sentences)",
            "twitter": ["Tweet 1", "Tweet 2"],
            "linkedin": "Professional LinkedIn post text",
            "instagram": "Instagram caption with 3-5 hashtags"
          }`
        },
        {
          role: "user",
          content: `Here is the transcript:\n\n${transcript.substring(0, 15000)}` 
        }
      ],
      temperature: 0.7, // Slight creativity but still focused
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");

    return JSON.parse(content);

  } catch (error) {
    console.error("⚠️ AI Generation Error:", error);
    // 🟢 CHANGE 3: Fallback Data (Prevents Worker Crash)
    return getFallbackData();
  }
}

// Helper to provide dummy data if AI fails
function getFallbackData() {
  return {
    title: "New Video Upload",
    description: "This video has been processed successfully.",
    twitter: ["Check out my new video! #content"],
    linkedin: "I just uploaded a new video, check it out.",
    instagram: "New upload! Link in bio. #video"
  };
}