import { GoogleGenAI } from '@google/genai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '../store/courseStore';

// Tried in order; a model that is overloaded, rate-limited or retired falls
// through to the next one.
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
] as const;

const INSIGHTS_CACHE_PREFIX = 'ai_insights:';

export interface CourseInsights {
  whatYouWillLearn: string[];
  bestFor: string;
  aiSummary: string;
}

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function buildPrompt(course: Course): string {
  return `
You are an AI learning assistant.

Analyze this course and generate student friendly insights.

Course Title:
${course.title}

Description:
${course.description}

Category:
${course.category}

Price:
${course.price}

Rating:
${course.rating}

Return ONLY valid JSON:

{
  "whatYouWillLearn": [
    "point 1",
    "point 2",
    "point 3"
  ],
  "bestFor": "Suggest which type of student should learn this course, relevant to the course content",
  "aiSummary": "2 line course summary"
}
`.trim();
}

function isCourseInsights(value: unknown): value is CourseInsights {
  const v = value as CourseInsights | null;
  return (
    !!v &&
    Array.isArray(v.whatYouWillLearn) &&
    v.whatYouWillLearn.length > 0 &&
    v.whatYouWillLearn.every((item) => typeof item === 'string') &&
    typeof v.bestFor === 'string' &&
    typeof v.aiSummary === 'string'
  );
}

function parseInsightsResponse(text: string | undefined): CourseInsights {
  const cleaned = text
    ?.replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  if (!cleaned) {
    throw new Error('Empty AI response');
  }

  const parsed: unknown = JSON.parse(cleaned);
  if (!isCourseInsights(parsed)) {
    throw new Error('AI response did not match the expected shape');
  }
  return parsed;
}

function shouldTryNextModel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('503') ||
    lower.includes('429') ||
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit')
  ) {
    return true;
  }

  const jsonMatch = message.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return false;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      error?: { code?: number; status?: string };
    };
    const code = parsed.error?.code;
    const status = parsed.error?.status?.toUpperCase();

    return (
      code === 503 ||
      code === 429 ||
      code === 404 ||
      status === 'UNAVAILABLE' ||
      status === 'RESOURCE_EXHAUSTED' ||
      status === 'NOT_FOUND'
    );
  } catch {
    return false;
  }
}

async function generateWithModel(
  client: GoogleGenAI,
  model: string,
  prompt: string
): Promise<CourseInsights> {
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return parseInsightsResponse(response.text);
}

export async function getCachedInsights(courseId: string): Promise<CourseInsights | null> {
  try {
    const raw = await AsyncStorage.getItem(INSIGHTS_CACHE_PREFIX + courseId);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isCourseInsights(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Returns cached insights when available, otherwise asks Gemini and caches the
 * result. Returns null (never placeholder text) when AI is unavailable, so the
 * UI can say so honestly and offer a retry.
 */
export async function generateCourseInsights(course: Course): Promise<CourseInsights | null> {
  const courseId = String(course.id);
  const cached = await getCachedInsights(courseId);
  if (cached) return cached;
  if (!ai) return null;

  const prompt = buildPrompt(course);

  for (const model of GEMINI_MODELS) {
    try {
      const insights = await generateWithModel(ai, model, prompt);
      await AsyncStorage.setItem(INSIGHTS_CACHE_PREFIX + courseId, JSON.stringify(insights)).catch(
        () => {}
      );
      return insights;
    } catch (error) {
      if (!shouldTryNextModel(error)) break;
    }
  }

  return null;
}
