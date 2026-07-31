'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, Bell, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { initials } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, profile, tenant } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
  }

  const displayName = profile?.full_name || user?.email || 'User';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <h1 className="text-base font-semibold text-foreground md:text-lg">{title}</h1>
        {subtitle && (
          <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
        )}
      </div>

      <div className="hidden items-center md:flex">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="w-56 pl-9" />
        </div>
      </div>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-xs font-medium text-foreground">
                {profile?.full_name ?? 'User'}
              </span>
              <span className="text-[10px] text-muted-foreground">{tenant?.company_name}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-sm font-medium">{profile?.full_name ?? 'User'}</span>
            <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
            <User className="mr-2 h-3.5 w-3.5" /> Account Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
