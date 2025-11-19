
'use client';
import { Request } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { format, parseISO } from "date-fns";
import { AuditTrail } from "./audit-trail";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Paperclip, Send, ThumbsDown, ThumbsUp, Lightbulb, FileWarning, Edit, Save, X, Merge } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { generateBriefingNotes } from "@/ai/flows/generate-briefing-notes";
import { detectDataInconsistencies } from "@/ai/flows/data-inconsistency-detection";
import { Skeleton } from "../ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";

interface RequestViewProps {
    request: Request;
}

export function RequestView({ request }: RequestViewProps) {
    const { user, hasRole } = useAuth();
    const { toast } = useToast();
    const [briefingNote, setBriefingNote] = useState<string | null>(null);
    const [inconsistencyReport, setInconsistencyReport] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [submissionText, setSubmissionText] = useState<string>("");

    const [isBriefingLoading, setIsBriefingLoading] = useState(false);
    const [isInconsistencyLoading, setIsInconsistencyLoading] = useState(false);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [hasDivisionSubmissions, setHasDivisionSubmissions] = useState(false);
    const [isCheckingSubmissions, setIsCheckingSubmissions] = useState(false);
    const [actionNotes, setActionNotes] = useState('');
    const [revisedDeadline, setRevisedDeadline] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(request.submittedData?.text || '');
    const [divisionForm, setDivisionForm] = useState<any>(null);
    const [isCheckingForm, setIsCheckingForm] = useState(false);
    
    // Check if user is assigned - either directly or through division assignment
    let isAssignee = user?.id === request.currentAssigneeId;
    
    // For Division HOD/YP, also check divisionAssignments
    // Each division works independently, so check if this user's division has an assignment
    if (!isAssignee && user && (hasRole('Division HOD') || hasRole('Division YP'))) {
      const userDivision = user.roles?.find((role: any) => 
        (role.role === 'Division HOD' || role.role === 'Division YP') && 
        role.state === request.state
      )?.division;
      
      if (userDivision && request.divisionAssignments) {
        const assignment = request.divisionAssignments.find((a: any) => 
          a.division === userDivision
        );
        
        if (assignment) {
          // Check if this user is the HOD or YP for this division
          const isHOD = hasRole('Division HOD') && assignment.divisionHODId === user.id;
          const isYP = hasRole('Division YP') && assignment.divisionYPId === user.id;
          
          if (isHOD) {
            // Division HOD should see it if:
            // - First pass: status is 'pending' (not yet approved/forwarded)
            // - Second pass: status is 'yp_submitted' (YP has submitted form back)
            isAssignee = assignment.status === 'pending' || assignment.status === 'yp_submitted';
          } else if (isYP) {
            // Division YP should see it if:
            // - Status is 'hod_approved' (HOD has approved and forwarded to them)
            isAssignee = assignment.status === 'hod_approved';
          }
        }
      }
    }
    
    // Check if user can modify deadline (all roles except Division YP)
    const canModifyDeadline = !hasRole('Division YP');

    useEffect(() => {
        const generateSummary = async () => {
            if (request.submittedData?.text) {
                setIsSummaryLoading(true);
                try {
                    const result = await generateBriefingNotes({ consolidatedReport: request.submittedData.text });
                    setSummary(result.briefingNote);
                } catch (error) {
                    // Fail silently
                    console.error("Failed to generate summary:", error);
                } finally {
                    setIsSummaryLoading(false);
                }
            }
        };
        generateSummary();
    }, [request.submittedData?.text]);

    // Check for form submissions to determine if we're in first pass or second pass
    useEffect(() => {
        const checkDivisionSubmissions = async () => {
            if (request.id) {
                setIsCheckingSubmissions(true);
                try {
                    const response = await fetch(`/api/forms?requestId=${request.id}`, {
                        credentials: 'include'
                    });
                    if (response.ok) {
                        const forms = await response.json();
                        // For State YP: Check if there are any approved or submitted forms from divisions
                        if (hasRole('State YP') && request.targets?.branches?.length) {
                            const divisionForms = forms.filter((f: any) => 
                                f.branch && 
                                request.targets?.branches?.includes(f.branch) &&
                                (f.status === 'approved' || f.status === 'submitted')
                            );
                            setHasDivisionSubmissions(divisionForms.length > 0);
                        } else {
                            // For other roles: Check if any forms exist (indicates second pass)
                            setHasDivisionSubmissions(forms.length > 0);
                        }
                    }
                } catch (error) {
                    console.error('Failed to check division submissions:', error);
                } finally {
                    setIsCheckingSubmissions(false);
                }
            }
        };
        checkDivisionSubmissions();
        
        // Poll for new submissions every 10 seconds if waiting for submissions (State YP only)
        let interval: NodeJS.Timeout | null = null;
        if (hasRole('State YP') && request.targets?.branches?.length && !hasDivisionSubmissions && request.id) {
            interval = setInterval(() => {
                checkDivisionSubmissions();
            }, 10000); // Check every 10 seconds
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [request.id, request.targets?.branches, user, hasDivisionSubmissions]);

    // Check for form submission when Division HOD views the request
    useEffect(() => {
        const checkFormSubmission = async () => {
            if (hasRole('Division HOD') && request.id && request.division && request.state) {
                setIsCheckingForm(true);
                try {
                    const response = await fetch(`/api/forms?requestId=${request.id}&branch=${encodeURIComponent(request.division)}&state=${encodeURIComponent(request.state)}`, {
                        credentials: 'include'
                    });
                    if (response.ok) {
                        const forms = await response.json();
                        // Find the most recent submitted form for this division
                        const submittedForm = forms.find((f: any) => 
                            f.branch === request.division && 
                            f.state === request.state &&
                            (f.status === 'submitted' || f.status === 'approved' || f.status === 'rejected')
                        );
                        setDivisionForm(submittedForm || null);
                    }
                } catch (error) {
                    console.error('Failed to check form submission:', error);
                } finally {
                    setIsCheckingForm(false);
                }
            }
        };
        checkFormSubmission();
    }, [request.id, request.division, request.state, user]);

    const handleAction = async (action: 'submit' | 'approve' | 'decline&improve') => {
        if (action === 'submit') {
            try {
                const tplRes = await fetch(`/api/templates?mode=${encodeURIComponent(request.division || 'default')}`);
                if (!tplRes.ok) { toast({ variant: 'destructive', title: 'Template Missing', description: 'No default template for division.' }); return; }
                const tpl = await tplRes.json();
                const res = await fetch('/api/forms', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    credentials: 'include',
                    body: JSON.stringify({ 
                        requestId: request.id, 
                        templateMode: request.division || 'default', 
                        templateId: tpl._id, 
                        branch: request.division, 
                        state: request.state, 
                        data: { text: submissionText } 
                    }) 
                });
                if (res.ok) {
                    toast({ title: 'Submitted', description: 'Division document submitted for approval.' });
                    setSubmissionText('');
                    window.location.reload();
                } else {
                    const data = await res.json();
                    const errorMsg = typeof data.error === 'string' ? data.error : (data.error?._errors ? data.error._errors.join(', ') : 'Could not submit.');
                    toast({ variant: 'destructive', title: 'Submit Failed', description: errorMsg });
                }
            } catch {
                toast({ variant: 'destructive', title: 'Network Error', description: 'Could not submit.' });
            }
            return;
        }
        try {
            const body: any = { id: request.id, action, notes: actionNotes };
            // Allow deadline reduction for all actions (approve or decline&improve) except for Division YP
            if (revisedDeadline && !hasRole('Division YP')) {
                body.revisedDeadline = revisedDeadline;
            }
            const res = await fetch('/api/workflows', { 
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body) 
            });
            if (res.ok) {
                toast({ title: `Action: ${action === 'approve' ? 'Approved' : 'Declined & Sent for Improvement'}`, description: 'Request updated.' });
                setActionNotes('');
                setRevisedDeadline('');
                window.location.reload();
            } else {
                const data = await res.json();
                const errorMsg = typeof data.error === 'string' ? data.error : (data.error?._errors ? data.error._errors.join(', ') : 'Could not update request.');
                toast({ variant: 'destructive', title: 'Update Failed', description: errorMsg });
            }
        } catch {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not update request.' });
        }
    };

    const handleFanout = async () => {
        if (!request.state) {
            toast({ variant: 'destructive', title: 'Error', description: 'State information missing.' });
            return;
        }
        try {
            // First, if deadline is revised, update the request deadline
            if (revisedDeadline && canModifyDeadline) {
                const deadlineRes = await fetch('/api/workflows', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        id: request.id, 
                        action: 'approve', 
                        notes: actionNotes || 'Approving and fanning out to divisions',
                        revisedDeadline: revisedDeadline
                    })
                });
                if (!deadlineRes.ok) {
                    const data = await deadlineRes.json();
                    const errorMsg = typeof data.error === 'string' ? data.error : (data.error?._errors ? data.error._errors.join(', ') : 'Could not update deadline.');
                    toast({ variant: 'destructive', title: 'Deadline Update Failed', description: errorMsg });
                    return;
                }
            }
            
            // API will automatically find all Division HODs for the state
            // Divisions parameter is optional - if not provided, API will auto-discover
            const res = await fetch('/api/workflows/fanout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ requestId: request.id, state: request.state })
            });
            if (res.ok) {
                const data = await res.json();
                const divisions = data.divisions || [];
                toast({ title: 'Fanout Complete', description: `Request fanned out to ${divisions.length} divisions: ${divisions.join(', ')}` });
                // Refresh to update the UI
                window.location.reload();
            } else {
                const data = await res.json();
                // Handle Zod validation errors or other error objects
                let errorMessage = 'Could not fanout request.';
                if (data.error) {
                    if (typeof data.error === 'string') {
                        errorMessage = data.error;
                    } else if (typeof data.error === 'object') {
                        // Handle Zod error format
                        if (data.error._errors) {
                            errorMessage = data.error._errors.join(', ');
                        } else if (data.error.divisions) {
                            errorMessage = `Validation error: ${JSON.stringify(data.error.divisions)}`;
                        } else {
                            errorMessage = JSON.stringify(data.error);
                        }
                    }
                }
                toast({ variant: 'destructive', title: 'Fanout Failed', description: errorMessage });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Network Error', description: error.message || 'Could not fanout request.' });
        }
    };

    const handleSaveEdit = async () => {
        // Find and update the form submission for this request
        try {
            // First, get all forms for this request
            const formsRes = await fetch(`/api/forms?requestId=${request.id}`, {
                credentials: 'include'
            });
            if (!formsRes.ok) {
                throw new Error('Could not fetch forms');
            }
            const forms = await formsRes.json();
            // Find the form for this division
            const form = forms.find((f: any) => f.branch === request.division && f.requestId === request.id);
            if (!form) {
                toast({ variant: 'destructive', title: 'Error', description: 'Form submission not found.' });
                return;
            }
            
            const res = await fetch(`/api/forms/${form._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ data: { text: editedText } })
            });
            if (res.ok) {
                toast({ title: 'Document Updated', description: 'Changes saved successfully.' });
                setIsEditing(false);
                window.location.reload();
            } else {
                const data = await res.json();
                const errorMsg = typeof data.error === 'string' ? data.error : (data.error?._errors ? data.error._errors.join(', ') : 'Could not update document.');
                toast({ variant: 'destructive', title: 'Update Failed', description: errorMsg });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Network Error', description: error.message || 'Could not update document.' });
        }
    };

    const handleGenerateBriefing = async () => {
        setIsBriefingLoading(true);
        setBriefingNote(null);
        try {
            const result = await generateBriefingNotes({ consolidatedReport: request.submittedData?.text || "No data submitted." });
            setBriefingNote(result.briefingNote);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate briefing notes.' });
        } finally {
            setIsBriefingLoading(false);
        }
    };
    
    const handleDetectInconsistencies = async () => {
        setIsInconsistencyLoading(true);
        setInconsistencyReport(null);
        try {
            const result = await detectDataInconsistencies({ consolidatedReport: request.submittedData?.text || "No data submitted." });
            setInconsistencyReport(result.summary);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to detect inconsistencies.' });
        } finally {
            setIsInconsistencyLoading(false);
        }
    };

    const getStatusVariant = (status: Request['status']) => {
        switch (status) {
            case 'Completed': return 'default';
            case 'Rejected': return 'destructive';
            default: return 'secondary';
        }
    };
    
    const renderActionPanel = () => {
        if (!isAssignee || request.status === 'Completed' || request.status === 'Rejected') {
            return null;
        }

        // Only Division YP can submit information, not State YP
        if (hasRole('Division YP')) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Submit Information</CardTitle>
                        <CardDescription>Please provide the requested information and attach relevant files.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Accordion type="multiple" className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>1. Health and Demographic Indicators</AccordionTrigger>
                                <AccordionContent className="grid grid-cols-2 gap-4">
                                    <Input placeholder="Total population (in million)" />
                                    <Input placeholder="Decadal Growth (%)" />
                                    <Input placeholder="Population density (per sq. km.)" />
                                    <Input placeholder="Projected Total Population '000" />
                                    <Input placeholder="Sex Ratio at Birth" />
                                    <Input placeholder="Total Fertility Rate" />
                                    <Input placeholder="Birth rate" />
                                    <Input placeholder="Death Rate" />
                                    <Input placeholder="Maternal Mortality Ratio" />
                                    <Input placeholder="Infant Mortality Rate" />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>2. Health Infrastructure (Rural)</AccordionTrigger>
                                <AccordionContent className="grid grid-cols-4 gap-2 text-sm text-center">
                                    <Label className="text-left">Particulars</Label><Label>Required</Label><Label>In position</Label><Label>Shortfall</Label>
                                    <Label className="text-left font-normal pt-2">Sub-Centre</Label><Input type="number" /><Input type="number" /><Input type="number" />
                                    <Label className="text-left font-normal pt-2">Primary Health Centre</Label><Input type="number" /><Input type="number" /><Input type="number" />
                                    <Label className="text-left font-normal pt-2">Community Health Centre</Label><Input type="number" /><Input type="number" /><Input type="number" />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>3. Health-Human Resource (Rural)</AccordionTrigger>
                                <AccordionContent className="grid grid-cols-4 gap-2 text-sm text-center">
                                    <Label className="text-left">Particulars</Label><Label>Required</Label><Label>In position</Label><Label>Shortfall</Label>
                                    <Label className="text-left font-normal pt-2">Health Worker (Female)/ANM</Label><Input type="number" /><Input type="number" /><Input type="number" />
                                    <Label className="text-left font-normal pt-2">Health Worker (Male)</Label><Input type="number" /><Input type="number" /><Input type="number" />
                                    <Label className="text-left font-normal pt-2">Doctors at PHCs</Label><Input type="number" /><Input type="number" /><Input type="number" />
                                    <Label className="text-left font-normal pt-2">Total specialists at CHCs</Label><Input type="number" /><Input type="number" /><Input type="number" />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                                <AccordionTrigger>5. Salient Features of Physical Progress under NHM</AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <Input placeholder="ASHA in position with drug kits (Rural)" />
                                    <Input placeholder="ASHA in position with drug kits (Urban)" />
                                    <Input placeholder="ASHAs in position received 6th and 7th Module training - Rural" />
                                    <Input placeholder="ASHAs in position trained in 6th & 7th Module - Urban" />
                                    <Input placeholder="Sub-Centre without ANM" />
                                    <Input placeholder="Sub Centre is functional with Second ANM" />
                                    <Input placeholder="PHCs functioning on 24x7 basis" />
                                    <Input placeholder="CHCs functioning on 24x7 basis" />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-6">
                                <AccordionTrigger>6. Financial Progress under NRHM</AccordionTrigger>
                                <AccordionContent className="grid grid-cols-4 gap-2 text-sm text-center">
                                    <Label className="text-left">Year</Label><Label>Allocation (by GOI)</Label><Label>Release (by GOI)</Label><Label>Expenditure (by State)</Label>
                                    <Input placeholder="2015-23" /><Input type="number" placeholder="Rs. In Crore" /><Input type="number" placeholder="Rs. In Crore" /><Input type="number" placeholder="Rs. In Crore" />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-7">
                                <AccordionTrigger>7. Centrally Sponsored Scheme: AB-PMJAY</AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                    <Input placeholder="Issued Ayushman Cards" />
                                    <Input placeholder="Total Empanelled Hospitals" />
                                    <Input placeholder="Total number of Authorised Hospital Admissions till date" />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <div className="pt-4 space-y-4">
                            <Textarea placeholder="Type your overall summary report here..." rows={4} value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} />
                             <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="files">Attach Files</Label>
                                <Input id="files" type="file" multiple />
                            </div>
                             <div className="flex gap-2">
                                <Button onClick={() => handleAction('submit')}>
                                    <Send className="mr-2 h-4 w-4" /> Submit for Approval
                                </Button>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        // State YP - Fanout action (before fanout OR after fanout but before submissions)
        if (hasRole('State YP') && (!request.targets?.branches?.length || !hasDivisionSubmissions)) {
            if (isCheckingSubmissions) {
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Checking Submissions</CardTitle>
                            <CardDescription>Please wait while we check for division submissions...</CardDescription>
                        </CardHeader>
                    </Card>
                );
            }
            
            if (!request.targets?.branches?.length) {
                // Before fanout
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Fanout to Divisions</CardTitle>
                            <CardDescription>
                                Approve and fanout this request to all divisions in {request.state}.
                                {request.dueDate && (
                                    <span className="block mt-2 text-sm font-semibold">
                                        Current Deadline: {format(parseISO(request.dueDate), 'PPP p')}
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(divisionDeadline || request.dueDate) && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-semibold">Current Deadline{userDivision ? ` for ${userDivision}` : ''} (set by previous user)</p>
                                    <p className="text-lg">{format(parseISO(divisionDeadline || request.dueDate), 'PPP p')}</p>
                                </div>
                            )}
                            <Textarea 
                                placeholder="Add optional notes..." 
                                rows={3} 
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                            />
                            {canModifyDeadline && (
                                <div className="space-y-2">
                                    <Label>Revised Deadline (optional, must be same or earlier than current deadline)</Label>
                                    <Input 
                                        type="datetime-local" 
                                        value={revisedDeadline}
                                        onChange={(e) => setRevisedDeadline(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        max={(divisionDeadline || request.dueDate) ? new Date(divisionDeadline || request.dueDate).toISOString().slice(0, 16) : undefined}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to keep the same deadline, or select an earlier date to reduce it.
                                        Current deadline: {request.dueDate ? format(parseISO(request.dueDate), 'PPP p') : 'Not set'}
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={handleFanout} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                    <ThumbsUp className="mr-2 h-4 w-4" /> Approve & Fanout to Divisions
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            } else {
                // After fanout but waiting for submissions
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Waiting for Division Submissions</CardTitle>
                            <CardDescription>Request has been fanned out to divisions. Waiting for Division HODs to submit their documents.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Divisions assigned: {request.targets.branches.join(', ')}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                The "Merge & Forward" option will appear once division submissions are received.
                            </p>
                        </CardContent>
                    </Card>
                );
            }
        }

        // State YP - Merge action (only when divisions have actually submitted)
        if (hasRole('State YP') && request.targets?.branches?.length && hasDivisionSubmissions) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Review & Merge</CardTitle>
                        <CardDescription>
                            Review all division submissions and merge them before forwarding to State Advisor.
                            {(divisionDeadline || request.dueDate) && (
                                <span className="block mt-2 text-sm font-semibold">
                                    Current Deadline: {format(parseISO(divisionDeadline || request.dueDate), 'PPP p')}
                                </span>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea 
                            placeholder="Add optional notes..." 
                            rows={3} 
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button onClick={() => handleAction('approve')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                <Merge className="mr-2 h-4 w-4" /> Merge & Forward to State Advisor
                            </Button>
                            <Button onClick={() => handleAction('decline&improve')} variant="destructive">
                                <ThumbsDown className="mr-2 h-4 w-4" /> Decline & Improve
                            </Button>
                        </div>
                        {canModifyDeadline && (
                            <div className="space-y-2">
                                <Label>Revised Deadline (optional, must be same or earlier than current deadline)</Label>
                                <Input 
                                    type="datetime-local" 
                                    value={revisedDeadline}
                                    onChange={(e) => setRevisedDeadline(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    max={request.dueDate ? new Date(request.dueDate).toISOString().slice(0, 16) : undefined}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Current deadline: {request.dueDate ? format(parseISO(request.dueDate), 'PPP p') : 'Not set'}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            );
        }

        // Division HOD - First pass (approve workflow) vs Second pass (approve/decline form)
        if (hasRole('Division HOD')) {
            if (isCheckingForm) {
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Checking Submissions</CardTitle>
                            <CardDescription>Please wait...</CardDescription>
                        </CardHeader>
                    </Card>
                );
            }
            
            if (divisionForm) {
                // SECOND PASS: Form has been submitted, approve/decline the form
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Form Submission</CardTitle>
                            <CardDescription>
                                Review the document submitted by Division YP and approve or decline & improve.
                                {request.dueDate && (
                                    <span className="block mt-2 text-sm font-semibold">
                                        Current Deadline: {format(parseISO(request.dueDate), 'PPP p')}
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(divisionDeadline || request.dueDate) && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-semibold">Current Deadline{userDivision ? ` for ${userDivision}` : ''} (set by previous user)</p>
                                    <p className="text-lg">{format(parseISO(divisionDeadline || request.dueDate), 'PPP p')}</p>
                                </div>
                            )}
                            <Textarea 
                                placeholder="Add optional notes..." 
                                rows={3} 
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                            />
                            {canModifyDeadline && (
                                <div className="space-y-2">
                                    <Label>Revised Deadline (optional, must be same or earlier than current deadline)</Label>
                                    <Input 
                                        type="datetime-local" 
                                        value={revisedDeadline}
                                        onChange={(e) => setRevisedDeadline(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        max={(divisionDeadline || request.dueDate) ? new Date(divisionDeadline || request.dueDate).toISOString().slice(0, 16) : undefined}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to keep the same deadline, or select an earlier date to reduce it.
                                        Current deadline: {request.dueDate ? format(parseISO(request.dueDate), 'PPP p') : 'Not set'}
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button 
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/forms/${divisionForm._id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({ action: 'approve', notes: actionNotes })
                                            });
                                            if (res.ok) {
                                                toast({ title: 'Form Approved', description: 'Form approved and forwarded to State YP.' });
                                                window.location.reload();
                                            } else {
                                                const data = await res.json();
                                                const errorMsg = typeof data.error === 'string' ? data.error : (data.error?._errors ? data.error._errors.join(', ') : 'Could not approve form.');
                                                toast({ variant: 'destructive', title: 'Approval Failed', description: errorMsg });
                                            }
                                        } catch {
                                            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not approve form.' });
                                        }
                                    }}
                                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                >
                                    <ThumbsUp className="mr-2 h-4 w-4" /> Approve Form & Forward to State YP
                                </Button>
                                <Button 
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/forms/${divisionForm._id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({ action: 'reject', notes: actionNotes || 'Needs improvement' })
                                            });
                                            if (res.ok) {
                                                toast({ title: 'Form Declined', description: 'Form declined and sent back to Division YP for improvement.' });
                                                window.location.reload();
                                            } else {
                                                const data = await res.json();
                                                const errorMsg = typeof data.error === 'string' ? data.error : (data.error?._errors ? data.error._errors.join(', ') : 'Could not decline form.');
                                                toast({ variant: 'destructive', title: 'Decline Failed', description: errorMsg });
                                            }
                                        } catch {
                                            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not decline form.' });
                                        }
                                    }}
                                    variant="destructive"
                                >
                                    <ThumbsDown className="mr-2 h-4 w-4" /> Decline & Improve
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            } else {
                // FIRST PASS: No form submission yet, just approve workflow and forward to Division YP
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Approve & Forward</CardTitle>
                            <CardDescription>
                                Approve this request and forward it to Division YP for document creation.
                                {(divisionDeadline || request.dueDate) && (
                                    <span className="block mt-2 text-sm font-semibold text-muted-foreground">
                                        Current Deadline{userDivision ? ` for ${userDivision}` : ''}: {format(parseISO(divisionDeadline || request.dueDate), 'PPP p')}
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(divisionDeadline || request.dueDate) && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-semibold">Current Deadline{userDivision ? ` for ${userDivision}` : ''} (set by previous user)</p>
                                    <p className="text-lg">{format(parseISO(divisionDeadline || request.dueDate), 'PPP p')}</p>
                                </div>
                            )}
                            <Textarea 
                                placeholder="Add optional notes..." 
                                rows={3} 
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                            />
                            {canModifyDeadline && (
                                <div className="space-y-2">
                                    <Label>Revised Deadline (optional, must be same or earlier than current deadline)</Label>
                                    <Input 
                                        type="datetime-local" 
                                        value={revisedDeadline}
                                        onChange={(e) => setRevisedDeadline(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        max={(divisionDeadline || request.dueDate) ? new Date(divisionDeadline || request.dueDate).toISOString().slice(0, 16) : undefined}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to keep the same deadline, or select an earlier date to reduce it.
                                        Current deadline: {request.dueDate ? format(parseISO(request.dueDate), 'PPP p') : 'Not set'}
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={() => handleAction('approve')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                    <ThumbsUp className="mr-2 h-4 w-4" /> Approve & Forward to Division YP
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            }
        }

        // Approval roles (CEO NITI, State Advisor)
        // Check if we're in first pass (no form submissions yet) or second pass (forms submitted)
        const isFirstPass = !request.targets?.branches?.length || !hasDivisionSubmissions;
        
        // In first pass, no decline option - only approve & forward
        // In second pass, decline is allowed (except CEO NITI for PMO requests)
        const canDecline = !isFirstPass && (!hasRole('CEO NITI') || request.createdBy === user?.id);
        const isFromAbove = hasRole('CEO NITI') && request.createdBy !== user?.id;
        
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Review & Action</CardTitle>
                    <CardDescription>
                        {isFirstPass 
                            ? 'First Pass - Approve & Forward only (can reduce deadline)' 
                            : isFromAbove 
                                ? 'Request from PMO - Approve only (can reduce deadline)' 
                                : 'Review the submitted data and approve or decline & improve.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {divisionDeadline && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-semibold">Current Deadline for {userDivision || 'this division'} (set by previous user)</p>
                            <p className="text-lg">{format(parseISO(divisionDeadline), 'PPP p')}</p>
                        </div>
                    )}
                    <Textarea 
                        placeholder="Add optional notes..." 
                        rows={3} 
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                    />
                    {canModifyDeadline && (
                        <div className="space-y-2">
                            <Label>Revised Deadline (optional, must be same or earlier than current deadline)</Label>
                            <Input 
                                type="datetime-local" 
                                value={revisedDeadline}
                                onChange={(e) => setRevisedDeadline(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                                max={divisionDeadline ? new Date(divisionDeadline).toISOString().slice(0, 16) : undefined}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave empty to keep the same deadline, or select an earlier date to reduce it.
                                Current deadline: {divisionDeadline ? format(parseISO(divisionDeadline), 'PPP p') : 'Not set'}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button onClick={() => handleAction('approve')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            <ThumbsUp className="mr-2 h-4 w-4" /> Approve & Forward
                        </Button>
                        {canDecline && (
                            <Button onClick={() => handleAction('decline&improve')} variant="destructive">
                                <ThumbsDown className="mr-2 h-4 w-4" /> Decline & Improve
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderAIPanels = () => {
        if (!request.submittedData) return null;

        return (
            <>
                <Card>
                    <CardHeader>
                        <CardTitle>AI-Powered Briefing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleGenerateBriefing} disabled={isBriefingLoading}>
                            <Lightbulb className="mr-2 h-4 w-4" /> {isBriefingLoading ? 'Generating...' : 'Generate Briefing Note'}
                        </Button>
                        {isBriefingLoading && <div className="mt-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>}
                        {briefingNote && <p className="mt-4 p-4 border rounded-md bg-muted text-sm">{briefingNote}</p>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>AI Data Inconsistency Check</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleDetectInconsistencies} disabled={isInconsistencyLoading} variant="secondary">
                            <FileWarning className="mr-2 h-4 w-4" /> {isInconsistencyLoading ? 'Analyzing...' : 'Detect Inconsistencies'}
                        </Button>
                        {isInconsistencyLoading && <div className="mt-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>}
                        {inconsistencyReport && <p className="mt-4 p-4 border rounded-md bg-muted text-sm">{inconsistencyReport}</p>}
                    </CardContent>
                </Card>
            </>
        )
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl">{request.title}</CardTitle>
                                <CardDescription>Request ID: {request.id}</CardDescription>
                            </div>
                            <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="font-semibold">State:</span> {request.state}</div>
                            <div><span className="font-semibold">Division:</span> {request.division}</div>
                            <div><span className="font-semibold">Created:</span> {format(parseISO(request.createdAt), 'PPP')}</div>
                            <div>
                                <span className="font-semibold">Due:</span> {format(parseISO(request.dueDate), 'PPP p')}
                                {request.dueDate && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        (Deadline set by previous user in workflow)
                                    </span>
                                )}
                            </div>
                        </div>
                        <Separator />
                        <p className="text-muted-foreground">{request.description}</p>
                    </CardContent>
                </Card>

                {request.submittedData && (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Submitted Information</CardTitle>
                                {hasRole('Division HOD') && !isEditing && (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit Document
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isSummaryLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            ) : (
                                summary && (
                                    <div className="mb-4 p-3 border rounded-md bg-muted/50 text-sm">
                                        <p className="font-semibold text-primary mb-2">AI Summary</p>
                                        <p className="text-muted-foreground">{summary}</p>
                                    </div>
                                )
                            )}
                            {isEditing ? (
                                <div className="space-y-4">
                                    <Textarea 
                                        value={editedText}
                                        onChange={(e) => setEditedText(e.target.value)}
                                        rows={10}
                                        className="font-mono text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <Button onClick={handleSaveEdit} size="sm">
                                            <Save className="mr-2 h-4 w-4" /> Save Changes
                                        </Button>
                                        <Button onClick={() => { setIsEditing(false); setEditedText(request.submittedData?.text || ''); }} variant="outline" size="sm">
                                            <X className="mr-2 h-4 w-4" /> Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap">{request.submittedData.text}</p>
                            )}
                            {request.submittedData.files && request.submittedData.files.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Attached Files:</h4>
                                    <ul className="space-y-2">
                                        {request.submittedData.files.map(file => (
                                            <li key={file} className="flex items-center">
                                                <Button variant="link" className="p-0 h-auto">
                                                    <Paperclip className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    {file}
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {renderActionPanel()}
                {renderAIPanels()}
            </div>
            
            <div className="lg:col-span-1">
                <AuditTrail auditTrail={request.auditTrail} />
            </div>
        </div>
    );
}
