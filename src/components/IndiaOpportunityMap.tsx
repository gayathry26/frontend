import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Trophy, Sparkles } from 'lucide-react';

interface CityStat {
  city: string;
  state: string;
  count: number;
  topCategory: string;
}

export function IndiaOpportunityMap({
  selectedCity,
  onSelectCity
}: {
  selectedCity?: string;
  onSelectCity: (city: string) => void;
}) {
  const cityStats: CityStat[] = [
    { city: 'Bangalore', state: 'Karnataka', count: 86, topCategory: 'Hackathons & AI Contests' },
    { city: 'Delhi NCR', state: 'Delhi / UP', count: 42, topCategory: 'CTFs & Ideathons' },
    { city: 'Hyderabad', state: 'Telangana', count: 31, topCategory: 'Open Source & Dev Fest' },
    { city: 'Chennai', state: 'Tamil Nadu', count: 27, topCategory: 'Workshops & Hackathons' },
    { city: 'Mumbai', state: 'Maharashtra', count: 39, topCategory: 'Fintech & Coding' },
    { city: 'Pune', state: 'Maharashtra', count: 24, topCategory: 'Webinars & Career Fairs' }
  ];

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-background to-background">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-lg">
            <MapPin className="h-5 w-5" />
            India Opportunity Hub Map
          </CardTitle>
          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 font-bold">
            Live City Hubs
          </Badge>
        </div>
        <CardDescription>
          Explore active student hackathons, CTFs, workshops, and career opportunities across major Indian tech hubs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cityStats.map(stat => {
            const isSelected = selectedCity === stat.city;
            return (
              <button
                key={stat.city}
                onClick={() => onSelectCity(isSelected ? '' : stat.city)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-card hover:bg-muted/60 border-border text-foreground'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-sm">{stat.city}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-blue-700 text-white' : 'bg-blue-500/10 text-blue-600'}`}>
                    {stat.count}
                  </span>
                </div>
                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-muted-foreground'}`}>
                  {stat.state}
                </span>
                <span className={`text-[9px] font-medium line-clamp-1 ${isSelected ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
                  ⚡ {stat.topCategory}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
