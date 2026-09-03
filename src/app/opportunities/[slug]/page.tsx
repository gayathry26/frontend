import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  Award,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEventBySlug } from '@/backend/services/eventService';

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const event = await getEventBySlug(resolvedParams.slug);

  if (!event) {
    notFound();
  }

  const isExpired = event.status === 'EXPIRED';

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">IT Career Hub</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/opportunities">
                <Button variant="outline">All Opportunities</Button>
              </Link>
              <Link href="/compare">
                <Button variant="outline">Compare Roles</Button>
              </Link>
              <Link href="/admin/skill-converter">
                <Button variant="outline">Admin</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Link */}
        <Link href="/opportunities">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Opportunities
          </Button>
        </Link>

        {/* Event Header Banner */}
        <div className="bg-gradient-to-br from-blue-600/10 via-background to-background border rounded-xl p-8 mb-8 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-600 text-white font-bold text-sm px-3 py-1">
              {event.type.replace('_', ' ')}
            </Badge>

            <Badge variant="outline" className="flex items-center gap-1 text-sm bg-background">
              <Globe className="h-4 w-4" />
              {event.location.mode} {event.location.state && ` • ${event.location.state}`} {event.location.city && `(${event.location.city})`}
            </Badge>

            {event.status === 'CLOSING_SOON' && (
              <Badge variant="destructive" className="animate-pulse text-sm">
                ⏳ Deadline Closing Soon
              </Badge>
            )}

            {isExpired && (
              <Badge variant="secondary" className="bg-gray-500/10 text-gray-500 text-sm">
                Expired
              </Badge>
            )}
          </div>

          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">{event.title}</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Organized by <strong className="text-foreground">{event.organizer.name}</strong>
              {event.organizer.website && (
                <a href={event.organizer.website} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline">
                  Official Website
                </a>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">Registration Deadline</span>
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                {new Date(event.dates.registrationDeadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            {event.prize?.description && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Prize Pool</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  🏆 {event.prize.description}
                </span>
              </div>
            )}

            {event.registrationAvailable && event.registrationUrl ? (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2">
                  Register on Official Platform <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            ) : (
              <Button size="lg" variant="outline" disabled className="w-full sm:w-auto opacity-70 cursor-not-allowed border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                Registration Link Unavailable
              </Button>
            )}
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About this Opportunity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p className="whitespace-pre-wrap">{event.description}</p>
              </CardContent>
            </Card>

            {/* Matched IT Career Roles */}
            {event.careerRoleMatches && event.careerRoleMatches.length > 0 && (
              <Card className="border-blue-200 dark:border-blue-900 bg-blue-500/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Briefcase className="h-5 w-5" />
                    Matched IT Career Roles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Participating in this opportunity develops skills directly linked to these IT careers:
                  </p>
                  <div className="space-y-2">
                    {event.careerRoleMatches.map(match => (
                      <div key={match.roleId} className="flex items-center justify-between p-3 bg-background border rounded-lg">
                        <Link href={`/roles/${match.roleId}`} className="font-semibold text-sm hover:underline hover:text-blue-600">
                          {match.roleTitle}
                        </Link>
                        <Badge className="bg-green-600 text-white font-semibold">
                          {Math.round(match.score * 100)}% Match
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Eligibility */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Eligibility Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {event.eligibility.map((el, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      {el}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Required Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Technical Skills Required</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {event.skills.map(sk => (
                  <Badge key={sk} variant="secondary" className="px-3 py-1 text-xs">
                    {sk}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Location & Venue
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <p><strong>Mode:</strong> {event.location.mode}</p>
                {event.location.state && <p><strong>State:</strong> {event.location.state}</p>}
                {event.location.city && <p><strong>City:</strong> {event.location.city}</p>}
                <p><strong>Country:</strong> {event.location.country}</p>
              </CardContent>
            </Card>

            {/* Source Attribution */}
            <Card className="bg-muted/40">
              <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Official Source Attribution
                </div>
                <p>
                  Sourced from <strong className="text-foreground">{event.source.platform}</strong>.
                </p>
                <a
                  href={event.source.sourceUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline block"
                >
                  View Original Announcement
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
