"use client";
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Home, FileText, Calendar, Settings, PanelLeftClose, Menu, PenTool } from 'lucide-react';
import '@/app/globals.css';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { href: '/admin', label: 'Inicio', icon: Home },
  { href: '/admin/evaluations', label: 'Evaluaciones', icon: FileText },
  { href: '/admin/schedules', label: 'Horarios', icon: Calendar },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const NavLink = ({ href, label, icon: Icon, isCollapsed }: { href: string; label: string; icon: React.ElementType; isCollapsed: boolean }) => {
    const isActive = (href === '/admin' && pathname === href) || (href !== '/admin' && pathname.startsWith(href));
    
    const linkClasses = `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isActive ? 'bg-muted text-primary' : 'text-muted-foreground'}`;
    const collapsedLinkClasses = `flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-foreground md:h-8 md:w-8 ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`;

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href} className={collapsedLinkClasses}>
              <Icon className="h-5 w-5" />
              <span className="sr-only">{label}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Link href={href} className={linkClasses}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <aside className={`fixed inset-y-0 left-0 z-10 flex-col border-r bg-background transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-14' : 'w-64'}`}>
          <div className="flex h-full max-h-screen flex-col">
            <div className={`flex h-14 items-center border-b lg:h-[60px] ${isSidebarCollapsed ? 'justify-center' : 'px-4'}`}>
              <Link href="/admin" className="flex items-center gap-2 font-semibold">
                <PenTool className="h-6 w-6 text-primary" />
                {!isSidebarCollapsed && <span className="">SEIA</span>}
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              <nav className={`grid items-start p-2 text-sm font-medium ${isSidebarCollapsed ? 'justify-items-center' : ''}`}>
                {navItems.map(item => (
                  <NavLink key={item.href} {...item} isCollapsed={isSidebarCollapsed} />
                ))}
              </nav>
            </div>
            <div className="mt-auto border-t p-2">
              <nav className={`grid items-start text-sm font-medium ${isSidebarCollapsed ? 'justify-items-center' : ''}`}>
                <NavLink href="/admin/settings" label="Configuración" icon={Settings} isCollapsed={isSidebarCollapsed} />
              </nav>
            </div>
          </div>
        </aside>
        <div className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-14' : 'ml-64'}`}>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
              {isSidebarCollapsed ? <Menu className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
            <div className="ml-auto flex items-center gap-4">
              <ThemeToggle />
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
} 