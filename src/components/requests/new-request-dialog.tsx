'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "../ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { STATES } from "@/lib/data"

interface NewRequestDialogProps {
  onRequestCreated?: () => void;
}

export default function NewRequestDialog({ onRequestCreated }: NewRequestDialogProps) {
    const [date, setDate] = React.useState<Date>()
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const { toast } = useToast()

    const handleCreateRequest = async () => {
        const titleInput = document.getElementById('title') as HTMLInputElement | null
        const descriptionInput = document.getElementById('description') as HTMLTextAreaElement | null
        const stateInput = document.getElementById('state') as HTMLInputElement | null

        const title = titleInput?.value?.trim() || ''
        const infoNeed = descriptionInput?.value?.trim() || ''
        const state = stateInput?.value?.trim() || ''

        if (!title || !infoNeed || !date || !state) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Please fill in all required fields (Title, Description, State/UT, Due Date).',
            })
            return
        }

        // Timeline must be at least 3 days in the future
        const minDate = new Date()
        minDate.setDate(minDate.getDate() + 3)
        if (date < minDate) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date',
                description: 'Due date must be at least 3 days in the future.',
            })
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Ensure cookies are sent
                body: JSON.stringify({
                    title,
                    infoNeed,
                    timeline: date.toISOString(),
                    targets: {
                        states: [state],
                        branches: [], // Divisions will be added at State YP level via fanout
                        domains: [],
                    },
                }),
            })

            const data = await response.json()

            if (response.ok) {
                toast({
                    title: "Request Created",
                    description: "The new information request has been initiated and assigned.",
                })
                setOpen(false)
                // Reset form
                if (titleInput) titleInput.value = ''
                if (descriptionInput) descriptionInput.value = ''
                if (stateInput) stateInput.value = ''
                setDate(undefined)
                // Trigger refresh
                if (onRequestCreated) {
                    onRequestCreated()
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Creation Failed',
                    description: data.error || 'Could not create request. Please try again.',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Network Error',
                description: 'Could not create request. Please check your connection.',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
            <DialogDescription>
              Fill in the details below to initiate a new information request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title *
              </Label>
              <Input id="title" placeholder="Quarterly Report Analysis" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description *
              </Label>
              <Textarea id="description" placeholder="Details about the request..." className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="state" className="text-right">
                State/UT *
              </Label>
              <Input id="state" placeholder="Select or type State/UT" list="states-list" className="col-span-3" required />
              <datalist id="states-list">
                {STATES.map(state => <option key={state} value={state} />)}
              </datalist>
              <div className="col-span-4 text-xs text-muted-foreground ml-20">
                Note: Divisions will be assigned at State YP level via fanout
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="due-date" className="text-right">
                Due Date *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal col-span-3",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date (min 3 days ahead)</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => {
                      const minDate = new Date()
                      minDate.setDate(minDate.getDate() + 3)
                      return date < minDate
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleCreateRequest} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
}
