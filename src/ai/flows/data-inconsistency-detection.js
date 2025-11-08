// This is a server-side file.
'use server';
/**
 * @fileOverview This flow uses AI to detect missing or inconsistent data within consolidated reports.
 *
 * - detectDataInconsistencies - A function that takes a consolidated report as input and returns a report highlighting any missing or inconsistent data.
 * - DataInconsistencyDetectionInput - The input type for the detectDataInconsistencies function.
 * - DataInconsistencyDetectionOutput - The return type for the detectDataInconsistencies function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
const DataInconsistencyDetectionInputSchema = z.object({
    consolidatedReport: z
        .string()
        .describe('The consolidated report to analyze for missing or inconsistent data.'),
});
const DataInconsistencyDetectionOutputSchema = z.object({
    reportWithHighlights: z
        .string()
        .describe('The consolidated report with missing or inconsistent data highlighted.'),
    summary: z
        .string()
        .describe('A summary of the missing or inconsistent data found in the report.'),
});
export async function detectDataInconsistencies(input) {
    return detectDataInconsistenciesFlow(input);
}
const prompt = ai.definePrompt({
    name: 'dataInconsistencyDetectionPrompt',
    input: {
        schema: DataInconsistencyDetectionInputSchema,
    },
    output: {
        schema: DataInconsistencyDetectionOutputSchema,
    },
    prompt: `You are an AI expert in analyzing reports for missing or inconsistent data.

You will receive a consolidated report as input, and you must identify any missing information, conflicting data points, or other inconsistencies within the report.

Based on your analysis, you will generate a report with the identified inconsistencies highlighted, and provide a summary of the issues found.

Consolidated Report: {{{consolidatedReport}}}`,
});
const detectDataInconsistenciesFlow = ai.defineFlow({
    name: 'detectDataInconsistenciesFlow',
    inputSchema: DataInconsistencyDetectionInputSchema,
    outputSchema: DataInconsistencyDetectionOutputSchema,
}, async (input) => {
    const { output } = await prompt(input);
    return output;
});
