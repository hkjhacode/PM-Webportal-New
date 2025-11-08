'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REQUESTS } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
export default function AllRequestsPage() {
    const getStatusVariant = (status) => {
        switch (status) {
            case 'Completed':
                return 'default';
            case 'Rejected':
                return 'destructive';
            default:
                return 'secondary';
        }
    };
    return (<Card>
      <CardHeader>
        <CardTitle>All Requests</CardTitle>
        <CardDescription>
          A log of all information requests, past and present.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            {REQUESTS.length > 0 ? (REQUESTS.map((request) => (<TableRow key={request.id}>
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
                </TableRow>))) : (<TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No requests found.
                </TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>);
}
