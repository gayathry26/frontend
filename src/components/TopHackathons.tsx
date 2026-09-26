"use client";

import { Button } from "@/components/ui/button";
import {
  Calendar,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  ExternalLink,
  Flame,
  Globe,
  MapPin,
  Trophy,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface HackathonEvent {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  organizer?: string;
  college?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  prize?: string;
  registrationUrl?: string;
  sourceUrl?: string;
  eventUrl?: string;
  imageUrl?: string;
  source: string;
  mode?: "Online" | "Offline" | "Hybrid" | "Unknown";
  technologies?: string[];
}

const modeColors: Record<string, string> = {
  Online: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Offline: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Hybrid: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Unknown: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const techColors = [
  "bg-blue-500/15 text-blue-400",
  "bg-purple-500/15 text-purple-400",
  "bg-cyan-500/15 text-cyan-400",
  "bg-pink-500/15 text-pink-400",
  "bg-orange-500/15 text-orange-400",
];

function HackathonCard({ hackathon, index }: { hackathon: HackathonEvent; index: number }) {
  const accentColors = [
    "from-blue-600 to-cyan-500",
    "from-violet-600 to-purple-500",
    "from-rose-600 to-pink-500",
    "from-amber-600 to-orange-500",
    "from-emerald-600 to-teal-500",
    "from-indigo-600 to-blue-500",
  ];
  const accent = accentColors[index % accentColors.length];

  const cleanTitle = (() => {
    const t = hackathon.title.trim();
    const org = hackathon.college || hackathon.organizer || "";
    if (org && t.endsWith(org) && t.length > org.length + 5) {
      return t.slice(0, t.length - org.length).trim().replace(/[-–—,]+$/, "").trim();
    }
    return t;
  })();

  const techs = (hackathon.technologies || []).slice(0, 3);
  const location = [hackathon.city, hackathon.state].filter(Boolean).join(", ") || hackathon.location;

  return (
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col">
      <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />

      <div className="absolute top-4 right-4 z-10">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
          #{index + 1}
        </div>
      </div>

      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${accent} rounded-2xl blur-xl -z-10 scale-110`} />

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          <div className="flex items-start gap-2 mb-2 pr-8">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${accent} opacity-90 shrink-0 mt-0.5`}>
              <Trophy className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {cleanTitle}
            </h3>
          </div>

          {(hackathon.college || hackathon.organizer) && (
            <p className="text-xs text-muted-foreground line-clamp-1 pl-7">
              {hackathon.college || hackathon.organizer}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mb-3">
          {hackathon.startDate ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>Starts: {hackathon.startDate}</span>
            </div>
          ) : hackathon.registrationDeadline ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0 text-amber-500/80" />
              <span>Deadline: {hackathon.registrationDeadline}</span>
            </div>
          ) : null}

          {location && hackathon.mode !== "Online" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {hackathon.mode && hackathon.mode !== "Unknown" && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${modeColors[hackathon.mode]}`}>
              {hackathon.mode}
            </span>
          )}
          {techs.map((tech, i) => (
            <span key={tech} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${techColors[i % techColors.length]}`}>
              {tech}
            </span>
          ))}
        </div>

        {hackathon.prize && (
          <div className="flex items-center gap-1.5 mb-3 bg-amber-500/10 rounded-lg px-3 py-1.5">
            <Zap className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-400 font-medium line-clamp-1">{hackathon.prize}</span>
          </div>
        )}

        <div className="flex-1" />

        {(() => {
          const targetUrl = hackathon.registrationUrl || hackathon.sourceUrl || hackathon.eventUrl || "#";
          return (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r ${accent} text-white text-xs font-semibold transition-all hover:opacity-90 hover:shadow-lg active:scale-95`}
            >
              Register Now
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        })()}
      </div>
    </div>
  );
}

export function TopHackathons() {
  const [hackathons, setHackathons] = useState<HackathonEvent[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    import("@/data/hackathons.json").then((mod) => {
      const data: HackathonEvent[] = mod.default as HackathonEvent[];
      setHackathons(data || []);
    });
  }, []);

  const filters = ["All", "Online", "Offline", "Hybrid"];

  // Extract unique cities/locations sorted alphabetically
  const uniqueLocations = useMemo(() => {
    const cities = hackathons
      .map((h) => h.city?.trim())
      .filter((city): city is string => Boolean(city && city.toLowerCase() !== "online"));
    return Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b));
  }, [hackathons]);

  // Filter by both mode and location
  const filtered = useMemo(() => {
    return hackathons.filter((h) => {
      const matchesMode = filter === "All" || h.mode === filter;
      const matchesLocation =
        selectedLocation === "All" ||
        h.city?.toLowerCase() === selectedLocation.toLowerCase() ||
        h.location?.toLowerCase().includes(selectedLocation.toLowerCase());

      return matchesMode && matchesLocation;
    });
  }, [hackathons, filter, selectedLocation]);

  const displayed = showAll ? filtered : filtered.slice(0, 9);

  const stats = {
    total: hackathons.length,
    online: hackathons.filter((h) => h.mode === "Online").length,
    cities: uniqueLocations.length,
    recent2026: hackathons.filter(
      (h) =>
        h.startDate?.includes("2026") ||
        h.endDate?.includes("2026") ||
        h.registrationDeadline?.includes("2026") ||
        h.title?.includes("2026") ||
        h.title?.includes("'26")
    ).length,
  };

  return (
    <section className="py-16 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4">

        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-4">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-500">Live Scraped from Unstop</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            Top{" "}
            <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Hackathons
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Discover active coding challenges and national tech buildathons — compete, innovate, and level up.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-3xl mx-auto">
          {[
            { icon: Trophy, label: "Total Events", value: stats.total, color: "text-violet-500" },
            { icon: Cpu, label: "2026 Events", value: stats.recent2026, color: "text-blue-500" },
            { icon: Globe, label: "Online", value: stats.online, color: "text-emerald-500" },
            { icon: MapPin, label: "Cities", value: stats.cities, color: "text-orange-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
              <Icon className={`h-5 w-5 ${color} mx-auto mb-1`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter Toolbar: Mode Buttons + Location Dropdown */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          {/* Mode Pills */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Location Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="appearance-none bg-card border border-border text-foreground text-sm rounded-full pl-9 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
              >
                <option value="All">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground rotate-90 pointer-events-none" />
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} events
            </span>
          </div>
        </div>

        {/* Hackathon Cards Grid */}
        {hackathons.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Code2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Loading hackathons...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl max-w-md mx-auto">
            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-foreground">No hackathons found</p>
            <p className="text-xs mt-1">Try switching to &quot;All Locations&quot; or another mode filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayed.map((hackathon, i) => (
                <HackathonCard key={hackathon.id} hackathon={hackathon} index={i} />
              ))}
            </div>

            {/* Show More / Less */}
            {filtered.length > 9 && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show Less" : `View All ${filtered.length} Hackathons`}
                  <ChevronRight className={`h-4 w-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Footer source note */}
        <div className="text-center mt-10 text-xs text-muted-foreground">
          Data sourced from{" "}
          <a
            href="https://unstop.com/hackathons"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Unstop.com
          </a>
        </div>
      </div>
    </section>
  );
}