
'use client';
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import UserManagementPage from "./user-management/page";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const UnifiedDashboard = dynamic(() => import("@/components/dashboard/unified-dashboard"), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  ),
  ssr: false // Disable SSR for dashboard as it relies heavily on client-side auth
});

export default function Dashboard() {
  const { user, hasRole, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user) {
      router.push('/');
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return <div>Loading...</div>;
  }
  if (!user) {
    return <div>Loading...</div>;
  }

  // Redirect Super Admin to user management if they land on the main dashboard
  if (hasRole('Super Admin') && user.roles.length === 1) {
    return <UserManagementPage />;
  }

  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <UnifiedDashboard />
    </div>
  )
}
