'use client';
import { useAuth } from "@/hooks/use-auth";
import UnifiedDashboard from "@/components/dashboard/unified-dashboard";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import UserManagementPage from "./user-management/page";
export default function Dashboard() {
    const { user, hasRole } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (!user) {
            router.push('/');
        }
    }, [user, router]);
    if (!user) {
        return <div>Loading...</div>;
    }
    // Redirect Super Admin to user management if they land on the main dashboard
    if (hasRole('Super Admin') && user.roles.length === 1) {
        return <UserManagementPage />;
    }
    return (<div className="flex flex-col gap-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <UnifiedDashboard />
    </div>);
}
