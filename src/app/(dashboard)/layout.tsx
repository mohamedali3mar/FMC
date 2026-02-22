import { Sidebar } from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="bg-white flex w-full h-screen overflow-hidden relative">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="px-8 py-10 md:px-14 lg:px-20">
                        <AuthGuard>{children}</AuthGuard>
                    </div>
                </main>
            </div>
        </div>
    );
}
