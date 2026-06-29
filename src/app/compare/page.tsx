"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Plus, X, TrendingUp, Award, DollarSign, Users, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { itRoles, getRoleById, type ITRole, type Tag } from '@/data/itRoles';

const tagColors: Record<Tag, string> = {
  'Coding': 'bg-blue-500/10 text-blue-500',
  'Non-Coding': 'bg-purple-500/10 text-purple-500',
  'Creative': 'bg-pink-500/10 text-pink-500',
  'Emerging': 'bg-green-500/10 text-green-500',
  'Management': 'bg-orange-500/10 text-orange-500',
  'Hybrid': 'bg-indigo-500/10 text-indigo-500'
};

function CompareView() {
  const searchParams = useSearchParams();
  const [selectedRoles, setSelectedRoles] = useState<ITRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<ITRole[]>(itRoles);

  useEffect(() => {
    const rolesParam = searchParams.get('roles');
    if (rolesParam) {
      const roleIds = rolesParam.split(',');
      const roles = roleIds
        .map(id => getRoleById(id))
        .filter((role): role is ITRole => role !== undefined);
      setSelectedRoles(roles);
    }
  }, [searchParams]);

  const addRole = (roleId: string) => {
    if (selectedRoles.length >= 4) return; // Max 4 roles for comparison
    const role = getRoleById(roleId);
    if (role && !selectedRoles.find(r => r.id === roleId)) {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const removeRole = (roleId: string) => {
    setSelectedRoles(selectedRoles.filter(r => r.id !== roleId));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">IT Career Hub</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Roles
          </Button>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Compare IT Roles</h1>
          <p className="text-muted-foreground">
            Select up to 4 roles to compare side-by-side and find the best fit for your career goals
          </p>
        </div>

        {/* Role Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Roles to Compare ({selectedRoles.length}/4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={addRole} disabled={selectedRoles.length >= 4}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select a role to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableRoles
                  .filter(role => !selectedRoles.find(r => r.id === role.id))
                  .map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.title} - {role.category}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedRoles.length >= 4 && (
              <p className="text-sm text-muted-foreground mt-2">
                Maximum of 4 roles reached. Remove a role to add another.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Comparison Table */}
        {selectedRoles.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Roles Selected</h3>
              <p>Add roles from the dropdown above to start comparing</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className={`grid grid-cols-1 ${selectedRoles.length === 1 ? 'md:grid-cols-1' : selectedRoles.length === 2 ? 'md:grid-cols-2' : selectedRoles.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
              {selectedRoles.map(role => (
                <Card key={role.id} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeRole(role.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader>
                    <CardTitle className="text-lg pr-8">{role.title}</CardTitle>
                    <Badge variant="secondary" className="w-fit">{role.category}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {role.tags.map(tag => (
                        <Badge key={tag} className={`text-xs ${tagColors[tag]}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {role.stats && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Salary</span>
                          <span className="font-semibold">{role.stats.averageSalary}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Growth</span>
                          <span className="font-semibold text-green-600">{role.stats.growthRate}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Detailed Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Role Description
                  </h3>
                  <div className={`grid grid-cols-1 ${selectedRoles.length === 1 ? 'md:grid-cols-1' : selectedRoles.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-' + selectedRoles.length} gap-4`}>
                    {selectedRoles.map(role => (
                      <div key={role.id} className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm leading-relaxed">{role.shortDescription}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Technical Skills */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Technical Skills Required
                  </h3>
                  <div className={`grid grid-cols-1 ${selectedRoles.length === 1 ? 'md:grid-cols-1' : selectedRoles.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-' + selectedRoles.length} gap-4`}>
                    {selectedRoles.map(role => (
                      <div key={role.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <p className="font-medium text-sm mb-2">{role.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {role.technicalSkills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Soft Skills */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Soft Skills Required
                  </h3>
                  <div className={`grid grid-cols-1 ${selectedRoles.length === 1 ? 'md:grid-cols-1' : selectedRoles.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-' + selectedRoles.length} gap-4`}>
                    {selectedRoles.map(role => (
                      <div key={role.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <p className="font-medium text-sm mb-2">{role.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {role.softSkills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Career Progression */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Career Progression
                  </h3>
                  <div className={`grid grid-cols-1 ${selectedRoles.length === 1 ? 'md:grid-cols-1' : selectedRoles.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-' + selectedRoles.length} gap-4`}>
                    {selectedRoles.map(role => (
                      <div key={role.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <p className="font-medium text-sm mb-2">{role.title}</p>
                        {role.careerLadder.map((level, idx) => (
                          <div key={idx} className="text-xs space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="font-medium">{level.title}</span>
                              <Badge variant="outline" className="text-xs text-green-600">
                                {level.salaryRange}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{level.yearsOfExperience}</p>
                            {idx < role.careerLadder.length - 1 && <Separator className="mt-2" />}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Job Market */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Job Market Outlook (5 Years)
                  </h3>
                  <div className={`grid grid-cols-1 ${selectedRoles.length === 1 ? 'md:grid-cols-1' : selectedRoles.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-' + selectedRoles.length} gap-4`}>
                    {selectedRoles.map(role => (
                      <div key={role.id} className="p-4 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm mb-2">{role.title}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{role.jobMarketProjection}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Industries */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Key Industries
                  </h3>
                  <div className={`grid grid-cols-1 ${selectedRoles.length === 1 ? 'md:grid-cols-1' : selectedRoles.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-' + selectedRoles.length} gap-4`}>
                    {selectedRoles.map(role => (
                      <div key={role.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <p className="font-medium text-sm mb-2">{role.title}</p>
                        <div className="space-y-1">
                          {role.industry.map((ind, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <span>{ind}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Individual Roles */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Want to learn more?</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.map(role => (
                    <Link key={role.id} href={`/roles/${role.id}`}>
                      <Button variant="outline" size="sm">
                        View {role.title} Details
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-16 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">© 2024 IT Career Hub. Helping the next generation find their tech career.</p>
            <p className="text-sm">Data updated regularly to reflect current job market trends.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompareView />
    </Suspense>
  );
}