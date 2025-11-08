'use client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut } from 'lucide-react';
import { Badge } from '../ui/badge';
export default function Header() {
    const { user, logout } = useAuth();
    const getInitials = (name) => {
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[1][0]}`;
        }
        return names[0].substring(0, 2);
    };
    const formatRole = (role) => {
        let formatted = role.role;
        if (role.state) {
            formatted += ` (${role.state}`;
            if (role.division) {
                formatted += ` - ${role.division}`;
            }
            formatted += ')';
        }
        return formatted;
    };
    return (<header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
        <SidebarTrigger className="md:hidden"/>
      <div className="w-full flex-1">
        {/* Can add search or other header elements here */}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user === null || user === void 0 ? void 0 : user.avatarUrl} alt={user === null || user === void 0 ? void 0 : user.name} data-ai-hint="professional portrait"/>
              <AvatarFallback>{user ? getInitials(user.name) : '...'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user === null || user === void 0 ? void 0 : user.name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {user === null || user === void 0 ? void 0 : user.roles.map((role, index) => (<Badge key={index} variant="secondary" className="text-xs">
                    {formatRole(role)}
                  </Badge>))}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4"/>
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>);
}
