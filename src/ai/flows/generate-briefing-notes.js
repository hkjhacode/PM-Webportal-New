// src/ai/flows/generate-briefing-notes.ts
'use server';
/**
 * @fileOverview Generates a briefing note summarizing key insights from consolidated visit reports.
 *
 * - generateBriefingNotes - A function that generates the briefing note.
 * - GenerateBriefingNotesInput - The input type for the generateBriefingNotes function.
 * - GenerateBriefingNotesOutput - The return type for the generateBriefingNotes function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
const GenerateBriefingNotesInputSchema = z.object({
    consolidatedReport: z
        .string()
        .describe('The consolidated visit report from multiple levels.'),
});
const GenerateBriefingNotesOutputSchema = z.object({
    briefingNote: z
        .string()
        .describe('A concise briefing note summarizing the key insights.'),
    progress: z.string().describe('Progress summary of the flow.'),
});
export async function generateBriefingNotes(input) {
    return generateBriefingNotesFlow(input);
}
const prompt = ai.definePrompt({
    name: 'generateBriefingNotesPrompt',
    input: { schema: GenerateBriefingNotesInputSchema },
    output: { schema: GenerateBriefingNotesOutputSchema },
    prompt: `You are CEO NITI and need a briefing note summarizing key insights from the consolidated visit report. Please provide a concise briefing note highlighting the essential information for decision-making.\n\nConsolidated Report: {{{consolidatedReport}}}`,
});
const generateBriefingNotesFlow = ai.defineFlow({
    name: 'generateBriefingNotesFlow',
    inputSchema: GenerateBriefingNotesInputSchema,
    outputSchema: GenerateBriefingNotesOutputSchema,
}, async (input) => {
    const { output } = await prompt(input);
    return Object.assign(Object.assign({}, output), { progress: 'Generated a briefing note summarizing key insights from the consolidated report.' });
});
