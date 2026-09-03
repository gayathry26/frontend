import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink, Code2, Globe } from 'lucide-react';

interface LearningResource {
  title: string;
  type: string;
  url: string;
  freeOrPaid: 'FREE' | 'PAID';
}

interface RoleLearningResourcesProps {
  roleTitle: string;
  category: string;
  learningResources?: LearningResource[];
  practicePlatforms?: { name: string; url: string; description: string }[];
}

export function RoleLearningResources({
  roleTitle,
  category,
  learningResources = [],
  practicePlatforms = []
}: RoleLearningResourcesProps) {
  // Default fallback curated practice platforms based on role category
  const defaultPlatforms = category.toLowerCase().includes('cyber') ? [
    { name: 'TryHackMe', url: 'https://tryhackme.com', description: 'Hands-on cybersecurity labs & CTF challenges' },
    { name: 'Hack The Box', url: 'https://www.hackthebox.com', description: 'Advanced penetration testing & vulnerability labs' }
  ] : category.toLowerCase().includes('design') ? [
    { name: 'Figma Community', url: 'https://www.figma.com/community', description: 'UI/UX design systems & interactive prototypes' },
    { name: 'Dribbble', url: 'https://dribbble.com', description: 'Design inspiration & visual feedback' }
  ] : [
    { name: 'LeetCode', url: 'https://leetcode.com', description: 'Algorithms & technical interview problem sets' },
    { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org', description: 'Free full-stack interactive coding certifications' },
    { name: 'Frontend Mentor', url: 'https://www.frontendmentor.io', description: 'Real-world frontend design challenge specs' }
  ];

  const displayPlatforms = practicePlatforms.length > 0 ? practicePlatforms : defaultPlatforms;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Learning Resources & Practice Platforms
        </CardTitle>
        <CardDescription>
          Curated documentation, free/paid courses, and interactive practice platforms for {roleTitle}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Practice Platforms */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
            <Code2 className="h-4 w-4 text-blue-500" />
            Recommended Practice Platforms
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {displayPlatforms.map(p => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg border bg-card/60 hover:bg-card hover:border-primary/40 transition flex flex-col justify-between gap-2 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition">{p.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Learning Resources List */}
        {learningResources.length > 0 && (
          <div className="pt-3 border-t">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
              <Globe className="h-4 w-4 text-emerald-500" />
              Curated Courses & Documentation
            </h4>
            <div className="space-y-2.5">
              {learningResources.map((res, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div className="space-y-0.5">
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-sm hover:underline text-foreground flex items-center gap-1.5"
                    >
                      {res.title} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                    <span className="text-xs text-muted-foreground">{res.type}</span>
                  </div>
                  <Badge
                    variant={res.freeOrPaid === 'FREE' ? 'secondary' : 'outline'}
                    className={res.freeOrPaid === 'FREE' ? 'bg-green-500/10 text-green-700 text-xs' : 'bg-amber-500/10 text-amber-700 text-xs'}
                  >
                    {res.freeOrPaid}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
