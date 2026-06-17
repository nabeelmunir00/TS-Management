import DesktopSidebar from "@/components/DesktopSidebar";
import MobileNavbar from "@/components/MobileNavbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Navbar - visible only on mobile */}
        <MobileNavbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
