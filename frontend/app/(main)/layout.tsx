"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background min-h-svh">
        <header
          data-testid="mobile-header"
          className="lg:hidden sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur"
        >
          <SidebarTrigger className="lg:hidden" aria-label="メニューを開く" />
          <span className="text-sm font-medium text-muted-foreground">AI司書</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
