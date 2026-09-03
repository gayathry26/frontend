"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  Briefcase,
  Code,
  Award,
  Layers,
  Globe,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EventDocument, EventCategory, EventMode } from '@/backend/types/event';

// Platform source color map
const PLATFORM_COLORS: Record<string, string> = {
  'Devfolio': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
  'Unstop': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200',
  'HackerEarth': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200',
  'Devpost': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200',
  'MLH': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200',
  'Hack2Skill': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200',
  'Brabble': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200',
  'OrganizerSubmission': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200',
  'default': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200'
};

const CATEGORIES: { label: string; value: EventCategory | 'ALL' }[] = [
  { label: 'All Opportunities', value: 'ALL' },
  { label: '🏆 Hackathons', value: 'HACKATHON' },
  { label: '💻 Coding Contests', value: 'CODING_CONTEST' },
  { label: '🛠️ Workshops', value: 'WORKSHOP' },
  { label: '🚩 CTFs', value: 'CTF' },
  { label: '🚀 Tech Fests', value: 'TECH_FEST' },
  { label: '🌐 Open-Source', value: 'OPEN_SOURCE' },
  { label: '💼 Career Fairs', value: 'CAREER_FAIR' },
  { label: '💡 Ideathons', value: 'IDEATHON' },
  { label: '🎓 Webinars', value: 'WEBINAR' },
  { label: '🎙️ Conferences', value: 'CONFERENCE' },
  { label: '📊 Project Competitions', value: 'PROJECT_COMPETITION' }
];

const INDIAN_STATES = [
  'All India',
  'Tamil Nadu',
  'Karnataka',
  'Kerala',
  'Telangana',
  'Andhra Pradesh',
  'Maharashtra',
  'Delhi',
  'Gujarat',
  'Rajasthan',
  'West Bengal',
  'Uttar Pradesh',
  'Odisha',
  'Punjab'
];

import { IndiaOpportunityMap } from '@/components/IndiaOpportunityMap';
import { OpportunityReverseRoadmapModal } from '@/components/OpportunityReverseRoadmapModal';

export default function OpportunitiesPage() {
  const [events, setEvents] = useState<EventDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModalEvent, setSelectedModalEvent] = useState<EventDocument | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'ALL'>('ALL');
  const [selectedState, setSelectedState] = useState<string>('All India');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (e) {
      console.error('Failed to fetch opportunities:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Category Filter
      const matchesCategory = selectedCategory === 'ALL' || evt.type === selectedCategory;

      // State Filter
      const matchesState =
        selectedState === 'All India' ||
        evt.location.mode === 'ONLINE' ||
        (evt.location.state && evt.location.state.toLowerCase() === selectedState.toLowerCase());

      // Mode Filter
      const matchesMode = selectedMode === 'ALL' || evt.location.mode === selectedMode;

      // Search Query Filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        evt.organizer.name.toLowerCase().includes(q) ||
        evt.skills.some(s => s.toLowerCase().includes(q)) ||
        evt.careerRoles.some(r => r.toLowerCase().includes(q)) ||
        (evt.location.city && evt.location.city.toLowerCase().includes(q));

      // Skill Filter
      const matchesSkill = !selectedSkill || evt.skills.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase()));

      return matchesCategory && matchesState && matchesMode && matchesSearch && matchesSkill;
    });
  }, [events, selectedCategory, selectedState, selectedMode, searchQuery, selectedSkill]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">IT Career Hub</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/opportunities/submit">
                <Button variant="outline" className="flex items-center gap-1.5 border-dashed">
                  <PlusCircle className="h-4 w-4 text-blue-600" />
                  Submit Opportunity
                </Button>
              </Link>
              <Link href="/compare">
                <Button variant="outline">Compare Roles</Button>
              </Link>
              <Link href="/companies">
                <Button variant="outline">Companies</Button>
              </Link>
              <Link href="/admin/data-management">
                <Button variant="outline">Admin</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-600/10 via-background to-background py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge variant="secondary" className="px-3 py-1 bg-blue-500/10 text-blue-600 font-semibold border-blue-200">
              🇮🇳 India Student Opportunities Hub
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Live Career-Linked <span className="text-blue-600">Opportunities</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Discover Hackathons, Coding Contests, Workshops, CTFs, and Tech Fests across India matched directly to your IT career path.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by event, skill (e.g. Python, React), city, or career role..."
                className="pl-12 h-13 text-base shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Navigation Pills */}
      <section className="border-y bg-card/30 py-4 overflow-x-auto">
        <div className="container mx-auto px-4 flex gap-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* India Opportunity Map Component */}
        <IndiaOpportunityMap selectedCity={selectedCity} onSelectCity={setSelectedCity} />

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar Filters */}
          <aside className="w-full md:w-64 space-y-6 shrink-0">
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                <Filter className="h-4 w-4 text-primary" />
                India Location & Mode
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Event Mode</label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {['ALL', 'ONLINE', 'OFFLINE', 'HYBRID'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`p-2 rounded font-medium border text-center ${
                        selectedMode === mode
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-accent'
                      }`}
                    >
                      {mode === 'ALL' ? 'All Modes' : mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* State Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">State / Region</label>
                <select
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border bg-background"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Popular Skills Quick Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Filter by Skill</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Python', 'React', 'AI', 'Cybersecurity', 'Docker', 'Machine Learning'].map(sk => (
                    <Badge
                      key={sk}
                      variant={selectedSkill === sk ? 'default' : 'outline'}
                      className="cursor-pointer text-[11px]"
                      onClick={() => setSelectedSkill(selectedSkill === sk ? '' : sk)}
                    >
                      {sk}
                    </Badge>
                  ))}
                </div>
              </div>

              {(selectedCategory !== 'ALL' || selectedState !== 'All India' || selectedMode !== 'ALL' || searchQuery || selectedSkill) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSelectedState('All India');
                    setSelectedMode('ALL');
                    setSearchQuery('');
                    setSelectedSkill('');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </Card>
          </aside>

          {/* Right Opportunity Grid */}
          <main className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <strong className="text-foreground">{filteredEvents.length}</strong> live opportunities in India
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                Multi-source live feed
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center border rounded-xl bg-card">
                <Sparkles className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Loading live opportunities across India...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center border rounded-xl bg-card space-y-3">
                <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No Matching Opportunities Found</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Try adjusting your state, category, or search filters to explore more student hackathons and contests.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredEvents.map(evt => {
                  const topMatch = evt.careerRoleMatches?.[0];
                  return (
                    <Card key={evt.slug} className="hover:shadow-md transition-all border">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            {/* Top Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-blue-600 text-white font-semibold">
                                {evt.type.replace('_', ' ')}
                              </Badge>

                              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                <Globe className="h-3 w-3" />
                                {evt.location.mode}
                                {evt.location.state && ` • ${evt.location.state}`}
                              </Badge>

                              {/* Platform Source Badge */}
                              {(() => {
                                const platform = evt.source?.platform || 'Unknown';
                                const colorClass = PLATFORM_COLORS[platform] || PLATFORM_COLORS['default'];
                                const extraSources = (evt as any).sources?.length > 1 ? (evt as any).sources.length - 1 : 0;
                                return (
                                  <>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
                                      📡 {platform}
                                    </span>
                                    {extraSources > 0 && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground border">
                                        +{extraSources} more source{extraSources > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}

                              {evt.status === 'CLOSING_SOON' && (
                                <Badge variant="destructive" className="animate-pulse text-xs">
                                  ⏳ Closing Soon
                                </Badge>
                              )}

                              {topMatch && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 font-semibold border-green-200 text-xs">
                                  🎯 {Math.round(topMatch.score * 100)}% Match for {topMatch.roleTitle}
                                </Badge>
                              )}
                            </div>

                            {/* Title & Description */}
                            <div>
                              <Link href={`/opportunities/${evt.slug}`} className="hover:underline">
                                <h3 className="text-xl font-bold text-foreground">{evt.title}</h3>
                              </Link>
                              <p className="text-xs text-muted-foreground mt-1">
                                Organized by <strong className="text-foreground">{evt.organizer.name}</strong>
                              </p>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {evt.description}
                            </p>

                            {/* Skills Required */}
                            <div className="flex flex-wrap gap-1.5 items-center pt-1">
                              <span className="text-xs text-muted-foreground mr-1">Skills:</span>
                              {evt.skills.map(sk => (
                                <Badge key={sk} variant="outline" className="text-[11px] bg-muted/30">
                                  {sk}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Right Card Actions & Dates */}
                          <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-4 shrink-0 min-w-[200px]">
                            {evt.prize?.description && (
                              <div className="text-right">
                                <span className="text-[11px] text-muted-foreground block">Prize Pool</span>
                                <span className="text-base font-bold text-green-600 dark:text-green-400">
                                  🏆 {evt.prize.description}
                                </span>
                              </div>
                            )}

                            <div className="text-right text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-1 justify-end">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Deadline: {new Date(evt.dates.registrationDeadline).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedModalEvent(evt)}
                                className="w-full sm:w-auto text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-1 font-semibold"
                              >
                                Can I Apply? <Sparkles className="h-3 w-3" />
                              </Button>
                              <Link href={`/opportunities/${evt.slug}`} className="w-full sm:w-auto">
                                <Button variant="outline" size="sm" className="w-full text-xs">
                                  Details
                                </Button>
                              </Link>
                              {evt.registrationAvailable && evt.registrationUrl ? (
                                <a
                                  href={evt.registrationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full sm:w-auto"
                                >
                                  <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                                    Register <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </a>
                              ) : (
                                <Button size="sm" variant="outline" disabled className="w-full text-xs opacity-70 cursor-not-allowed">
                                  Registration Link Unavailable
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Opportunity Reverse Roadmap & Can I Apply Modal */}
      {selectedModalEvent && (
        <OpportunityReverseRoadmapModal
          event={selectedModalEvent}
          onClose={() => setSelectedModalEvent(null)}
        />
      )}
    </div>
  );
}
