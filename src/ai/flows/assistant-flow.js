'use server';
/**
 * @fileOverview A general purpose AI assistant flow for the app.
 * This file is marked as a server-only module and exports a single async function 'askAI'.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
export async function askAI(input) {
    // Define Zod schemas inside the function scope.
    const AssistantInputSchema = z.object({
        query: z.string().describe('The user query or prompt.'),
        context: z.string().describe('The context of the current page or view.'),
    });
    const AssistantOutputSchema = z.object({
        answer: z.string().describe('The AI-generated answer.'),
    });
    // Define the Genkit prompt inside the function scope.
    const prompt = ai.definePrompt({
        name: 'assistantPrompt',
        input: { schema: AssistantInputSchema },
        output: { schema: AssistantOutputSchema },
        prompt: `You are a helpful AI assistant for the VisitWise application.
      You can help users understand the UI and analyze data.
      
      The user is currently viewing a page with the following content:
      ---
      {{context}}
      ---
  
      The user has asked the following question:
      "{{query}}"
  
      Please provide a helpful and concise answer.
      `,
    });
    // Define the Genkit flow inside the function scope.
    const assistantFlow = ai.defineFlow({
        name: 'assistantFlow',
        inputSchema: AssistantInputSchema,
        outputSchema: AssistantOutputSchema,
    }, async (flowInput) => {
        const { output } = await prompt(flowInput);
        return output;
    });
    // Execute the flow.
    return assistantFlow(input);
}
