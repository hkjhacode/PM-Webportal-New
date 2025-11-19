
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { REQUESTS, USERS } from '@/lib/data';
import { Request, User, UserRoleAssignment } from '@/types';
import { format, parseISO, formatISO } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NewRequestDialog from '../requests/new-request-dialog';
import { Skeleton } from '@/components/ui/skeleton';

type FilterType = 'all' | 'approvals' | 'allocations';

// Transform API response to Request type
function transformApiRequest(apiReq: any): Request {
  // Extract creator info
  const creator = apiReq.createdBy;
  const creatorId = creator?._id ? String(creator._id) : String(apiReq.createdBy || '');
  const creatorRoles = creator?.roles || [];
  const creatorRoleNames = Array.isArray(creatorRoles) 
    ? creatorRoles.map((r: any) => (typeof r === 'string' ? r : r.role))
    : [];
  
  // Determine assignedBy display name
  let assignedByName = creator?.name || 'N/A';
  if (creatorRoleNames.includes('PMO Viewer')) {
    assignedByName = 'PMO';
  } else if (creatorRoleNames.includes('CEO NITI')) {
    assignedByName = 'CEO NITI';
  } else if (creatorRoleNames.includes('State Advisor')) {
    assignedByName = creator?.name || 'State Advisor';
  } else if (creatorRoleNames.includes('State YP')) {
    assignedByName = creator?.name || 'State YP';
  } else if (creatorRoleNames.includes('Division HOD')) {
    assignedByName = creator?.name || 'Division HOD';
  } else if (creatorRoleNames.includes('Division YP')) {
    assignedByName = creator?.name || 'Division YP';
  }
  
  return {
    id: String(apiReq._id || apiReq.id),
    title: apiReq.title || '',
    description: apiReq.infoNeed || '',
    createdBy: creatorId,
    assignedBy: assignedByName, // Store the display name instead of ID
    createdAt: apiReq.createdAt ? formatISO(new Date(apiReq.createdAt)) : formatISO(new Date()),
    dueDate: apiReq.deadline ? formatISO(new Date(apiReq.deadline)) : apiReq.timeline ? formatISO(new Date(apiReq.timeline)) : formatISO(new Date()),
    status: mapApiStatus(apiReq),
    currentAssigneeId: String(apiReq.currentAssigneeId?._id || apiReq.currentAssigneeId || ''),
    state: apiReq.targets?.states?.[0] || '',
    division: apiReq.targets?.branches?.[0] || '',
    flowDirection: 'down', // Default, can be determined from status/history
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

export default function UnifiedDashboard() {
  const { user, hasRole } = useAuth();
  const [taskFilter, setTaskFilter] = useState<FilterType>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [apiRequests, setApiRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        const transformed = Array.isArray(data) ? data.map(transformApiRequest) : [];
        setApiRequests(transformed);
      } else {
        // Fallback to mock data on error
        setApiRequests([]);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setApiRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, refreshKey]);

  const handleRequestCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const userAssignments = useMemo(() => {
    if (!user) return { states: [], roles: [], divisions: [] };
    const states = new Set<string>();
    const roles = new Set<string>();
    const divisions = new Set<string>();
    user.roles.forEach(r => {
        roles.add(r.role);
        if (r.state) states.add(r.state);
        if (r.division) divisions.add(r.division);
    });
    return {
        states: ['all', ...Array.from(states)],
        roles: ['all', ...Array.from(roles)],
        divisions: ['all', ...Array.from(divisions)],
    }
  }, [user]);

  const findUserName = (userIdOrName: string) => {
    // If it's already a name (from transformApiRequest), return it
    if (userIdOrName && !userIdOrName.match(/^[0-9a-f]{24}$/i)) {
      return userIdOrName;
    }
    // Try to find in mock users first
    const mockUser = USERS.find(u => u.id === userIdOrName);
    if (mockUser) return mockUser.name;
    // For API users, return the ID or 'N/A'
    return userIdOrName || 'N/A';
  };

  // Combine API requests with mock requests (for demo/fallback)
  const allRequests = useMemo(() => {
    const combined = [...apiRequests];
    // Add mock requests that aren't already in API requests
    REQUESTS.forEach(mockReq => {
      if (!combined.find(r => r.id === mockReq.id)) {
        combined.push(mockReq);
      }
    });
    return combined;
  }, [apiRequests]);

  const myTasks = useMemo(() => {
    if (!user) return [];
    
    return allRequests.filter(r => {
        // Super Admin and CEO NITI can see everything if no filter is applied
        if ((hasRole('Super Admin') || hasRole('CEO NITI')) && stateFilter === 'all' && divisionFilter === 'all') {
             return true;
        }
        
        // Check if the request state matches the state filter
        if (stateFilter !== 'all' && r.state !== stateFilter) {
            return false;
        }

        // Check if the request division matches the division filter
        if (divisionFilter !== 'all' && r.division !== divisionFilter) {
            return false;
        }

        // Check if the current user is assigned this task based on their roles
        // For Division HOD/YP, also check divisionAssignments
        let isAssignee = r.currentAssigneeId === user.id;
        
        // If user is Division HOD or Division YP, check if their division is in assignments
        // Each division works independently, so check if this user's division has an assignment
        if (!isAssignee && (hasRole('Division HOD') || hasRole('Division YP'))) {
          const userDivision = user.roles.find((role: any) => 
            (role.role === 'Division HOD' || role.role === 'Division YP') && 
            role.state === r.state
          )?.division;
          
          if (userDivision && r.divisionAssignments) {
            const assignment = r.divisionAssignments.find((a: any) => 
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

        // If a role filter is applied, check if the user has that role for the request's context
        if (roleFilter !== 'all') {
            const hasMatchingRole = user.roles.some(assignment => 
                assignment.role === roleFilter &&
                (!assignment.state || assignment.state === r.state) &&
                (!assignment.division || assignment.division === r.division)
            );
            return isAssignee && hasMatchingRole;
        }
        
        return isAssignee;
    });

  }, [user, stateFilter, roleFilter, divisionFilter, hasRole, allRequests]);

  const filteredTasks = useMemo(() => {
    return myTasks.filter(task => {
        if (taskFilter === 'all') return true;
        if (taskFilter === 'approvals') return task.flowDirection === 'up';
        if (taskFilter === 'allocations') return task.flowDirection === 'down';
        return true;
    });
  }, [myTasks, taskFilter]);

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

  const getFlowVariant = (flow: Request['flowDirection']) => {
    return flow === 'up' ? 'default' : 'secondary';
  };

  const renderTaskList = (tasks: Request[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="hidden sm:table-cell">Assigned By</TableHead>
          <TableHead className="hidden sm:table-cell">Status</TableHead>
          <TableHead className="hidden md:table-cell">Due Date</TableHead>
          <TableHead className="text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length > 0 ? (
          tasks.map(request => (
            <TableRow key={request.id}>
              <TableCell>
                <div className="font-medium">{request.title}</div>
                <div className="hidden text-sm text-muted-foreground md:inline">
                  {request.state} - {request.division}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getFlowVariant(request.flowDirection)}>
                  {request.flowDirection === 'up'
                    ? 'Approval Required'
                    : 'Allocated Task'}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {findUserName(request.assignedBy)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge className="text-xs" variant={getStatusVariant(request.status)}>
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {format(parseISO(request.dueDate), 'PPP')}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/requests/${request.id}`}>
                    View Details
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No tasks found for the selected filters.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>
              A unified view of all your pending approvals and allocated tasks.
            </CardDescription>
          </div>
          {hasRole('PMO Viewer') && <NewRequestDialog onRequestCreated={handleRequestCreated} />}
        </div>
        <div className="flex flex-col md:flex-row gap-4 pt-4">
          <div className="flex-1">
            <Select value={taskFilter} onValueChange={value => setTaskFilter(value as FilterType)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Task Types</SelectItem>
                <SelectItem value="approvals">Approval Requests</SelectItem>
                <SelectItem value="allocations">Allocated Tasks</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={stateFilter} onValueChange={setStateFilter} disabled={userAssignments.states.length <= 1}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by State/UT" />
              </SelectTrigger>
              <SelectContent>
                {userAssignments.states.map(state => (
                  <SelectItem key={state} value={state}>
                    {state === 'all' ? 'All States/UTs' : state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="flex-1">
            <Select value={divisionFilter} onValueChange={setDivisionFilter} disabled={userAssignments.divisions.length <= 1}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Division" />
              </SelectTrigger>
              <SelectContent>
                {userAssignments.divisions.map(div => (
                  <SelectItem key={div} value={div}>
                    {div === 'all' ? 'All Divisions' : div}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={roleFilter} onValueChange={setRoleFilter} disabled={userAssignments.roles.length <= 1}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                {userAssignments.roles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role === 'all' ? 'All Roles' : role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          renderTaskList(filteredTasks)
        )}
      </CardContent>
    </Card>
  );
}
