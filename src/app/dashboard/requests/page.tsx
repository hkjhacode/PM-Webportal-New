'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REQUESTS } from '@/lib/data';
import { Request } from '@/types';
import { format, parseISO, formatISO } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

// Transform API response to Request type (same as unified-dashboard)
function transformApiRequest(apiReq: any): Request {
  // Extract creator info for assignedBy
  const creator = apiReq.createdBy;
  const creatorRoles = creator?.roles || [];
  const creatorRoleNames = Array.isArray(creatorRoles) 
    ? creatorRoles.map((r: any) => (typeof r === 'string' ? r : r.role))
    : [];
  let assignedByName = creator?.name || 'N/A';
  if (creatorRoleNames.includes('PMO Viewer')) {
    assignedByName = 'PMO';
  } else if (creatorRoleNames.includes('CEO NITI')) {
    assignedByName = 'CEO NITI';
  }
  
  return {
    id: String(apiReq._id || apiReq.id),
    title: apiReq.title || '',
    description: apiReq.infoNeed || '',
    createdBy: String(apiReq.createdBy?._id || apiReq.createdBy || ''),
    assignedBy: assignedByName,
    createdAt: apiReq.createdAt ? formatISO(new Date(apiReq.createdAt)) : formatISO(new Date()),
    dueDate: apiReq.deadline ? formatISO(new Date(apiReq.deadline)) : apiReq.timeline ? formatISO(new Date(apiReq.timeline)) : formatISO(new Date()),
    status: mapApiStatus(apiReq),
    currentAssigneeId: String(apiReq.currentAssigneeId?._id || apiReq.currentAssigneeId || ''),
    state: apiReq.targets?.states?.[0] || '',
    division: apiReq.targets?.branches?.[0] || '',
    flowDirection: 'down',
    targets: apiReq.targets || { states: [], branches: [], domains: [] }, // Include full targets object
    divisionAssignments: (apiReq.divisionAssignments || []).map((a: any) => ({
      division: a.division || '',
      divisionHODId: String(a.divisionHODId?._id || a.divisionHODId || ''),
      divisionYPId: a.divisionYPId ? String(a.divisionYPId._id || a.divisionYPId) : undefined,
      status: a.status || 'pending',
      approvedAt: a.approvedAt ? formatISO(new Date(a.approvedAt)) : undefined,
      deadline: a.deadline ? formatISO(new Date(a.deadline)) : undefined,
    })),
    auditTrail: (apiReq.history || []).map((h: any, idx: number) => ({
      id: `aud-${apiReq._id}-${idx}`,
      timestamp: h.timestamp ? formatISO(new Date(h.timestamp)) : formatISO(new Date()),
      userId: String(h.userId?._id || h.userId || ''),
      userName: h.userId?.name || h.userId?.email || undefined, // Include user name if populated
      userRoles: h.userId?.roles || undefined, // Include user roles if populated
      action: h.action || '',
      notes: h.notes || '',
    })),
  };
}

// Determine status based on current assignee role and workflow state
function mapApiStatus(apiReq: any): Request['status'] {
  const status = apiReq.status || 'open';
  
  // If completed or rejected, return those
  if (status === 'approved' || status === 'closed') return 'Completed';
  if (status === 'rejected') return 'Rejected';
  
  // Get assignee role if available
  const assignee = apiReq.currentAssigneeId;
  const assigneeRoles = assignee?.roles || [];
  const assigneeRoleNames = Array.isArray(assigneeRoles) 
    ? assigneeRoles.map((r: any) => (typeof r === 'string' ? r : r.role))
    : [];
  
  // Determine status based on current assignee role
  if (assigneeRoleNames.includes('CEO NITI')) {
    return 'Pending CEO Review';
  } else if (assigneeRoleNames.includes('State Advisor')) {
    return 'Pending State Advisor';
  } else if (assigneeRoleNames.includes('State YP')) {
    return 'Pending State YP';
  } else if (assigneeRoleNames.includes('Division HOD')) {
    return 'Pending Division HOD';
  } else if (assigneeRoleNames.includes('Division YP')) {
    return 'Pending Division YP';
  }
  
  // If no assignee yet, check history to determine next level
  const history = apiReq.history || [];
  const lastAction = history[history.length - 1];
  
  // If just created by PMO, it should go to CEO
  if (history.length === 1 && lastAction?.action === 'created') {
    return 'Pending CEO Review';
  }
  
  // Check history for workflow progression
  if (status === 'in-progress') {
    const hasFanout = history.some((h: any) => h.action === 'fanout');
    if (hasFanout) {
      return 'Pending Division HOD';
    }
  }
  
  // Default: if open and no assignee, it's waiting for CEO
  if (!assignee || assigneeRoleNames.length === 0) {
    return 'Pending CEO Review';
  }
  
  return 'Pending Division YP'; // Fallback
}

export default function AllRequestsPage() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/workflows');
        if (response.ok) {
          const data = await response.json();
          const transformed = Array.isArray(data) ? data.map(transformApiRequest) : [];
          // Combine with mock data
          const combined = [...transformed];
          REQUESTS.forEach(mockReq => {
            if (!combined.find(r => r.id === mockReq.id)) {
              combined.push(mockReq);
            }
          });
          setRequests(combined);
        } else {
          // Fallback to mock data
          setRequests(REQUESTS);
        }
      } catch (error) {
        console.error('Failed to fetch requests:', error);
        setRequests(REQUESTS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusVariant = (status: Request['status']) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'Rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const canDelete = hasRole('PMO Viewer') || hasRole('CEO NITI');

  const handleDeleteClick = (requestId: string) => {
    setRequestToDelete(requestId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workflows/${requestToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        toast({
          title: 'Request Deleted',
          description: 'The request has been successfully deleted.',
        });
        setRequests(prev => prev.filter(r => r.id !== requestToDelete));
      } else {
        const data = await response.json();
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: data.error || 'Could not delete request.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: 'Could not delete request.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Requests</CardTitle>
        <CardDescription>
          A log of all information requests, past and present.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead className="hidden sm:table-cell">State</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Due Date</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium">{request.title}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {request.division}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {request.state}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      className="text-xs"
                      variant={getStatusVariant(request.status)}
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(parseISO(request.dueDate), 'PPP')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/requests/${request.id}`}>
                          View Details
                        </Link>
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(request.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request? This action cannot be undone and will also delete all associated form submissions and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
