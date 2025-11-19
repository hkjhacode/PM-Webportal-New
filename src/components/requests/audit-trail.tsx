'use client';
import { AuditLog, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { USERS } from "@/lib/data";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface AuditTrailProps {
    auditTrail: AuditLog[];
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return names[0].substring(0, 2);
};

export function AuditTrail({ auditTrail }: AuditTrailProps) {
    const findUser = (userId: string): User | undefined => USERS.find(u => u.id === userId);
    
    const getUserDisplay = (log: AuditLog) => {
        // If user info is already populated from API, use it
        if (log.userName) {
            const roleNames = Array.isArray(log.userRoles) 
                ? log.userRoles.map((r: any) => (typeof r === 'string' ? r : r.role))
                : [];
            let roleDisplay = roleNames[0] || 'User';
            if (roleNames.includes('PMO Viewer')) roleDisplay = 'PMO';
            else if (roleNames.includes('CEO NITI')) roleDisplay = 'CEO NITI';
            else if (roleNames.includes('State Advisor')) roleDisplay = 'State Advisor';
            else if (roleNames.includes('State YP')) roleDisplay = 'State YP';
            else if (roleNames.includes('Division HOD')) roleDisplay = 'Division HOD';
            else if (roleNames.includes('Division YP')) roleDisplay = 'Division YP';
            
            return {
                name: log.userName,
                role: roleDisplay,
                avatarUrl: undefined,
            };
        }
        
        // Fallback to mock users
        const user = findUser(log.userId);
        if (user) {
            return {
                name: user.name,
                role: user.roles[0]?.role || 'User',
                avatarUrl: user.avatarUrl,
            };
        }
        
        // If no user found, return default
        return {
            name: 'Unknown User',
            role: 'User',
            avatarUrl: undefined,
        };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-border -translate-x-[11px]"></div>
                    {auditTrail.slice().reverse().map((log, index) => {
                        const userDisplay = getUserDisplay(log);
                        return (
                            <div key={log.id} className="relative pb-8">
                                <div className="absolute left-0 top-1.5 w-[11px] h-[11px] bg-primary rounded-full -translate-x-1/2 border-4 border-background"></div>
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 mt-0.5">
                                        <AvatarImage src={userDisplay.avatarUrl} alt={userDisplay.name} data-ai-hint="professional portrait" />
                                        <AvatarFallback>{getInitials(userDisplay.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {userDisplay.name}
                                            <span className="text-muted-foreground font-normal"> ({userDisplay.role})</span>
                                        </p>
                                        <p className="text-sm text-primary font-semibold capitalize">{log.action}</p>
                                        {log.notes && (
                                            <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded-md border">{log.notes}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">{format(parseISO(log.timestamp), "PPP 'at' h:mm a")}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
