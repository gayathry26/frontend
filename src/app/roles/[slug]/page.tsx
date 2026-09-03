import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Code, Users, Award, Building2, Lightbulb, Wrench, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type Tag } from '@/data/itRoles';
import { getRoleBySlugFromDb } from '@/services/roleService';
import { getAllCompaniesFromDb } from '@/backend/services/companyService';
import { RoleCareerRoadmap } from '@/components/RoleCareerRoadmap';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const tagColors: Record<Tag, string> = {
  'Coding': 'bg-blue-500/10 text-blue-500',
  'Non-Coding': 'bg-purple-500/10 text-purple-500',
  'Creative': 'bg-pink-500/10 text-pink-500',
  'Emerging': 'bg-green-500/10 text-green-500',
  'Management': 'bg-orange-500/10 text-orange-500',
  'Hybrid': 'bg-indigo-500/10 text-indigo-500'
};

export default async function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const role = await getRoleBySlugFromDb(resolvedParams.slug);

  if (!role) {
    notFound();
  }

  const allCompanies = await getAllCompaniesFromDb();
  let relevantCompanies = allCompanies.filter(c => 
    c.relatedRoles.includes(role.id) ||
    c.domains.some(d => d.toLowerCase() === role.category.toLowerCase()) ||
    c.technologies.some(t => role.technicalSkills.some(s => s.toLowerCase().includes(t.toLowerCase())))
  );

  if (relevantCompanies.length === 0) {
    relevantCompanies = allCompanies.slice(0, 6);
  } else {
    relevantCompanies = relevantCompanies.slice(0, 8);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Navigation */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">IT Career Hub</span>
            </Link>
            <nav className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">My Dashboard</Button>
              </Link>
              <Link href="/opportunities">
                <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Opportunities</Button>
              </Link>
              <Link href="/compare">
                <Button variant="outline" size="sm">Compare Roles</Button>
              </Link>
              <Link href="/companies">
                <Button variant="outline" size="sm">Companies</Button>
              </Link>
              <Link href="/admin/data-management">
                <Button variant="outline" size="sm">Admin</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Roles
            </Button>
          </Link>
        </div>

        {/* Hero Section: Compact Role Header containing Category, Title, Short Description, and Scope */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-xl p-6 border shadow-2xs space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="font-semibold">{role.category}</Badge>
            {role.tags && role.tags.map(tag => (
              <Badge key={tag} className={tagColors[tag] || 'bg-primary/10 text-primary'}>
                {tag}
              </Badge>
            ))}
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{role.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">{role.shortDescription}</p>
          </div>

          {role.scope && (
            <div className="pt-3 border-t border-primary/15 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> ROLE SCOPE
              </h2>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{role.scope}</p>
            </div>
          )}
        </div>

        {/* Main Content Grid: Balanced Two-Column Desktop Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (Main Detailed Info) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Combined Required Skills Card */}
            <Card className="h-auto border shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Required Skills & Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                {/* Technical Skills */}
                {role.technicalSkills && role.technicalSkills.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Code className="h-3.5 w-3.5 text-blue-500" />
                      Technical Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {role.technicalSkills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soft Skills */}
                {role.softSkills && role.softSkills.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <Users className="h-3.5 w-3.5 text-purple-500" />
                        Soft Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {role.softSkills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Tools & Technologies (Only rendered if tools exist) */}
                {role.tools && role.tools.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5 text-indigo-500" />
                        Tools & Technologies
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {role.tools.map((tool, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium">
                            ⚡ {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Combined Career Roadmap & Projects Component */}
            <RoleCareerRoadmap
              roleTitle={role.title}
              technicalSkills={role.technicalSkills}
              tools={role.tools || []}
              projects={role.projects}
              roadmap={role.roadmap}
            />

            {/* Recommended Certifications (Rendered only if certifications exist) */}
            {role.certifications && role.certifications.length > 0 && (
              <Card className="h-auto border shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Recommended Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {role.certifications.map((cert, idx) => {
                    const certName = typeof cert === 'string' ? cert : cert.name;
                    const certType = typeof cert === 'string' ? 'PAID' : (cert.type || 'PAID');
                    return (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60 text-xs">
                        <span className="font-medium text-foreground">{certName}</span>
                        <Badge 
                          variant={certType === 'FREE' ? 'secondary' : 'outline'}
                          className={certType === 'FREE' 
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 font-bold text-[10px]' 
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold text-[10px]'}
                        >
                          {certType}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (Sidebar Summary Cards) */}
          <div className="space-y-6">
            {/* Key Industries */}
            {role.industry && role.industry.length > 0 && (
              <Card className="h-auto border shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Building2 className="h-4 w-4 text-primary" />
                    Key Industries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {role.industry.map((ind, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-muted/60 font-medium">
                        {ind}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Relevant Tech Companies */}
            <Card className="h-auto border shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Building className="h-4 w-4 text-indigo-600" />
                    Hiring Companies
                  </CardTitle>
                  <Link href="/companies">
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700 h-7 px-2">
                      View All →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {relevantCompanies.map(comp => (
                    <Badge key={comp.id} variant="outline" className="text-xs bg-indigo-50/50 text-indigo-900 border-indigo-200/80 font-medium">
                      {comp.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-xs">
          <p className="mb-1">© 2024 IT Career Hub. Helping the next generation find their tech career.</p>
          <p>Data updated regularly to reflect current job market trends.</p>
        </div>
      </footer>
    </div>
  );
}