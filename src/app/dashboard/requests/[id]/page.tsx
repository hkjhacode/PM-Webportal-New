'use client';
import { RequestView } from "@/components/requests/request-view";
import { REQUESTS } from "@/lib/data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useState, useEffect } from "react";
import { Request } from "@/types";
import { formatISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// Transform API response to Request type
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

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      setIsLoading(true);
      try {
        // Try to fetch from API first
        const response = await fetch('/api/workflows');
        if (response.ok) {
          const data = await response.json();
          const apiRequest = Array.isArray(data) ? data.find((r: any) => String(r._id) === id || String(r.id) === id) : null;
          if (apiRequest) {
            setRequest(transformApiRequest(apiRequest));
            setIsLoading(false);
            return;
          }
        }
        // Fallback to mock data
        const mockRequest = REQUESTS.find(r => r.id === id);
        if (mockRequest) {
          setRequest(mockRequest);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        // Fallback to mock data on error
        const mockRequest = REQUESTS.find(r => r.id === id);
        if (mockRequest) {
          setRequest(mockRequest);
        } else {
          setNotFound(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !request) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-semibold">Request Not Found</h2>
            <p className="text-muted-foreground">The request you are looking for does not exist.</p>
            <Link href="/dashboard" className="mt-4 inline-flex items-center text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </div>
    )
  }
  
  return <RequestView request={request} />;
}
