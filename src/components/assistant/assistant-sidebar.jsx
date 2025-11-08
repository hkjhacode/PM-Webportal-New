'use client';
import { useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { askAI } from '@/ai/flows/assistant-flow';
import { Skeleton } from '../ui/skeleton';
export function AssistantSidebar({ isOpen, onOpenChange }) {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleAskAI = async () => {
        if (!prompt)
            return;
        setIsLoading(true);
        setResponse('');
        try {
            // In a real app, you might pass more context, like the current page content or user role.
            const result = await askAI({ query: prompt, context: document.body.innerText });
            setResponse(result.answer);
        }
        catch (error) {
            console.error('AI Assistant Error:', error);
            setResponse('Sorry, something went wrong while trying to get an answer.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-background p-0" side="left">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Bot />
            AI Assistant 🤖
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100vh-4.5rem)]">
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
                {isLoading && (<div className="p-4 border rounded-md bg-muted">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4"/>
                            <Skeleton className="h-4 w-1/2"/>
                        </div>
                    </div>)}
                {response && !isLoading && (<div className="p-4 border rounded-md bg-muted text-sm whitespace-pre-wrap">
                        {response}
                    </div>)}
            </div>
            <div className="p-4 border-t bg-background space-y-4">
                <Textarea placeholder="Ask the AI to analyze or modify the UI..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}/>
                <Button onClick={handleAskAI} disabled={isLoading} className="w-full">
                    <Send className="mr-2 h-4 w-4"/>
                    {isLoading ? 'Thinking...' : 'Ask AI'}
                </Button>
            </div>
        </div>
      </SheetContent>
    </Sheet>);
}
