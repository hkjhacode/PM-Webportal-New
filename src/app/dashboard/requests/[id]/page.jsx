'use client';
import { RequestView } from "@/components/requests/request-view";
import { REQUESTS } from "@/lib/data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
export default function RequestPage({ params }) {
    const request = REQUESTS.find(r => r.id === params.id);
    if (!request) {
        return (<div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-semibold">Request Not Found</h2>
            <p className="text-muted-foreground">The request you are looking for does not exist.</p>
            <Link href="/dashboard" className="mt-4 inline-flex items-center text-primary">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back to Dashboard
            </Link>
        </div>);
    }
    return <RequestView request={request}/>;
}
