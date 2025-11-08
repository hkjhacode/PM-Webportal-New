import { config } from 'dotenv';
config();
import '@/ai/flows/generate-briefing-notes.ts';
import '@/ai/flows/data-inconsistency-detection.ts';
import '@/ai/flows/assistant-flow.ts';
