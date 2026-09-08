'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">IT Career Hub</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline">My Dashboard</Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                Opportunities
              </Button>
            </Link>
            <Link href="/project-interview">
              <Button variant="outline">Project Interview</Button>
            </Link>
            <Link href="/role-analyzer">
              <Button variant="default" className="bg-purple-600 hover:bg-purple-700 text-white font-medium">
                Role Analyzer
              </Button>
            </Link>
            <Link href="/compare">
              <Button variant="outline">Compare Roles</Button>
            </Link>
            <Link href="/companies">
              <Button variant="outline">Companies</Button>
            </Link>
            <Link href="/admin/data-management">
              <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                Admin
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
