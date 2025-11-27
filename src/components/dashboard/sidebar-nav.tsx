
'use client';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
  } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { LayoutDashboard, FileText, Settings, BarChart2, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
  
export function SidebarNav() {
    const pathname = usePathname();
    const { user, hasRole } = useAuth();

    const menuItems = [
        {
          href: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          roles: ['CEO NITI', 'State Advisor', 'State YP', 'Division HOD', 'Division YP', 'PMO Viewer'],
        },
        {
            href: '/dashboard/requests',
            label: 'All Requests',
            icon: FileText,
            roles: ['CEO NITI', 'PMO Viewer', 'State Advisor', 'State YP', 'Division HOD', 'Division YP'],
        },

        {
            href: '/dashboard/user-management',
            label: 'User Management',
            icon: Users,
            roles: ['Super Admin'],
        },
        {
          href: '/dashboard/settings',
          label: 'Settings',
          icon: Settings,
          roles: ['CEO NITI', 'State Advisor', 'State YP', 'Division HOD', 'Division YP', 'PMO Viewer', 'Super Admin'],
        },
      ];

    const isLinkActive = (href: string) => {
        return pathname === href;
    }

    if (!user) return null;

    return (
        <SidebarMenu>
            {menuItems.filter(item => item.roles.some(role => hasRole(role))).map((item) => (
            <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                asChild
                isActive={isLinkActive(item.href)}
                tooltip={item.label}
                >
                <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            ))}
        </SidebarMenu>
    )
}
