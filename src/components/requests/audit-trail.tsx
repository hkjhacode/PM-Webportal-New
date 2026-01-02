'use client';
import { AuditLog, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { USERS } from "@/lib/data";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { 
    CheckCircle2, 
    FilePlus2, 
    ArrowRightCircle, 
    GitMerge, 
    Send, 
    FileText, 
    AlertCircle,
    Clock,
    UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const getActionConfig = (action: string) => {
    const normalizedAction = action.toLowerCase();
    
    switch (normalizedAction) {
        case 'created':
            return {
                label: 'Request Initiated',
                icon: FilePlus2,
                color: 'text-blue-500',
                bgColor: 'bg-blue-500',
                borderColor: 'border-blue-200'
            };
        case 'approved':
            return {
                label: 'Approved',
                icon: CheckCircle2,
                color: 'text-green-600',
                bgColor: 'bg-green-600',
                borderColor: 'border-green-200'
            };
        case 'rejected':
            return {
                label: 'Rejected',
                icon: AlertCircle,
                color: 'text-red-500',
                bgColor: 'bg-red-500',
                borderColor: 'border-red-200'
            };
        case 'forwarded':
            return {
                label: 'Forwarded',
                icon: ArrowRightCircle,
                color: 'text-indigo-500',
                bgColor: 'bg-indigo-500',
                borderColor: 'border-indigo-200'
            };
        case 'fanout':
            return {
                label: 'Distributed to Divisions',
                icon: GitMerge,
                color: 'text-purple-500',
                bgColor: 'bg-purple-500',
                borderColor: 'border-purple-200'
            };
        case 'submitted':
            return {
                label: 'Information Submitted',
                icon: Send,
                color: 'text-orange-500',
                bgColor: 'bg-orange-500',
                borderColor: 'border-orange-200'
            };
        case 'merged':
            return {
                label: 'Responses Merged',
                icon: FileText,
                color: 'text-teal-500',
                bgColor: 'bg-teal-500',
                borderColor: 'border-teal-200'
            };
        default:
            return {
                label: action.charAt(0).toUpperCase() + action.slice(1),
                icon: Clock,
                color: 'text-gray-500',
                bgColor: 'bg-gray-500',
                borderColor: 'border-gray-200'
            };
    }
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

    const formatTextWithDates = (text: string) => {
        // Regex to match ISO 8601 dates (e.g., 2026-01-09T18:30:00.000Z)
        const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/g;
        
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = isoDateRegex.exec(text)) !== null) {
            // Add text before the date
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }
            
            // Format and add the date
            try {
                const date = parseISO(match[0]);
                parts.push(format(date, "MMM do, yyyy 'at' h:mm a"));
            } catch {
                parts.push(match[0]); // Fallback if parsing fails
            }
            
            lastIndex = isoDateRegex.lastIndex;
        }
        
        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }
        
        return parts.length > 0 ? parts.join('') : text;
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Request Timeline
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative pl-12 pt-2">
                    {/* Continuous vertical line */}
                    <div className="absolute left-[23px] top-2 bottom-6 w-0.5 bg-border"></div>
                    
                    {auditTrail.slice().reverse().map((log, index) => {
                        const userDisplay = getUserDisplay(log);
                        const config = getActionConfig(log.action);
                        const ActionIcon = config.icon;
                        
                        return (
                            <div key={log.id} className="relative pb-8 last:pb-0 group">
                                {/* Timeline Dot/Icon */}
                                <div className={cn(
                                    "absolute left-[-40px] top-1 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center z-10 transition-colors duration-200",
                                    config.bgColor,
                                    "text-white"
                                )}>
                                    <ActionIcon className="h-3.5 w-3.5" />
                                </div>

                                <div className="flex flex-col gap-1.5 -mt-1">
                                    {/* Header: Action & Time */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <h4 className={cn("font-semibold text-base", config.color)}>
                                            {config.label}
                                        </h4>
                                        <span className="text-xs text-muted-foreground font-medium bg-secondary/50 px-2 py-0.5 rounded-full w-fit">
                                            {format(parseISO(log.timestamp), "MMM do, yyyy 'at' h:mm a")}
                                        </span>
                                    </div>

                                    {/* User Info */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={userDisplay.avatarUrl} alt={userDisplay.name} />
                                            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                                                {getInitials(userDisplay.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm">
                                            <span className="font-medium text-foreground">{userDisplay.name}</span>
                                            <span className="text-muted-foreground"> • {userDisplay.role}</span>
                                        </div>
                                    </div>

                                    {/* Notes / Context */}
                                    {log.notes && (
                                        <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-border/50 italic">
                                            "{formatTextWithDates(log.notes)}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
