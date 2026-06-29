import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, TrendingUp, Code, Users, Award, DollarSign, BarChart3, Building2, Lightbulb, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { getRoleById, type Tag } from '@/data/itRoles';

const tagColors: Record<Tag, string> = {
  'Coding': 'bg-blue-500/10 text-blue-500',
  'Non-Coding': 'bg-purple-500/10 text-purple-500',
  'Creative': 'bg-pink-500/10 text-pink-500',
  'Emerging': 'bg-green-500/10 text-green-500',
  'Management': 'bg-orange-500/10 text-orange-500',
  'Hybrid': 'bg-indigo-500/10 text-indigo-500'
};

export default function RolePage({ params }: { params: { slug: string } }) {
  const role = getRoleById(params.slug);

  if (!role) {
    notFound();
  }

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
            <nav className="flex items-center gap-4">
              <Link href="/compare">
                <Button variant="outline">Compare Roles</Button>
              </Link>
            </nav>
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

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-lg p-8 mb-8 border">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{role.category}</Badge>
                {role.tags.map(tag => (
                  <Badge key={tag} className={tagColors[tag]}>
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{role.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{role.shortDescription}</p>
              
              {role.alternateNames.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Also known as:</span>
                  {role.alternateNames.map((name, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {role.stats && (
              <div className="grid grid-cols-3 gap-4 min-w-[300px]">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Salary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{role.stats.averageSalary}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Job Openings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{role.stats.jobOpenings}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Growth Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">{role.stats.growthRate}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Scope */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Role Scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{role.scope}</p>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Required Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Code className="h-4 w-4 text-blue-500" />
                    Technical Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {role.technicalSkills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Soft Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {role.softSkills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-400">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Career Ladder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Career Ladder & Progression
                </CardTitle>
                <CardDescription>
                  Typical career progression with experience levels and salary ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {role.careerLadder.map((level, idx) => (
                    <div key={idx} className="relative pl-8 pb-6 border-l-2 border-primary/20 last:pb-0">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-lg">{level.title}</h4>
                            <p className="text-sm text-muted-foreground">{level.yearsOfExperience}</p>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600 whitespace-nowrap">
                            {level.salaryRange}
                          </Badge>
                        </div>
                        {idx < role.careerLadder.length - 1 && (
                          <Progress value={((idx + 1) / role.careerLadder.length) * 100} className="mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Job Market Projection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  5-Year Job Market Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{role.jobMarketProjection}</p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Industries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Key Industries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {role.industry.map((ind, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm">{ind}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hiring Companies */}
            {role.hiringCompanies && role.hiringCompanies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5" />
                    Companies Hiring
                  </CardTitle>
                  <CardDescription>
                    Major companies actively hiring for this role
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {role.hiringCompanies.map((companyGroup, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="text-sm font-semibold text-primary">{companyGroup.category}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {companyGroup.companies.map((company, companyIdx) => (
                          <Badge key={companyIdx} variant="secondary" className="text-xs">
                            {company}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="secondary">{role.category}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Career Levels</span>
                  <span className="font-semibold">{role.careerLadder.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Technical Skills</span>
                  <span className="font-semibold">{role.technicalSkills.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Soft Skills</span>
                  <span className="font-semibold">{role.softSkills.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Ready to Compare?</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Compare this role with others to find your perfect fit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/compare?roles=${role.id}`}>
                  <Button variant="secondary" className="w-full">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Compare Roles
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
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