"use client";

import { useState, useMemo } from 'react';
import { Search, Filter, Briefcase, TrendingUp, Code, Palette, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { itRoles, categories, type Tag } from '@/data/itRoles';

const tagIcons: Record<Tag, any> = {
  'Coding': Code,
  'Non-Coding': Briefcase,
  'Creative': Palette,
  'Emerging': Sparkles,
  'Management': Users,
  'Hybrid': TrendingUp
};

const tagColors: Record<Tag, string> = {
  'Coding': 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  'Non-Coding': 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
  'Creative': 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20',
  'Emerging': 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  'Management': 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
  'Hybrid': 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20'
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allTags: Tag[] = ['Coding', 'Non-Coding', 'Creative', 'Emerging', 'Management', 'Hybrid'];

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredRoles = useMemo(() => {
    return itRoles.filter(role => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.alternateNames.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()));

      // Tag filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => role.tags.includes(tag));

      // Category filter
      const matchesCategory = !selectedCategory || role.category === selectedCategory;

      return matchesSearch && matchesTags && matchesCategory;
    });
  }, [searchQuery, selectedTags, selectedCategory]);

  const rolesByCategory = useMemo(() => {
    const grouped: Record<string, typeof itRoles> = {};
    filteredRoles.forEach(role => {
      if (!grouped[role.category]) {
        grouped[role.category] = [];
      }
      grouped[role.category].push(role);
    });
    return grouped;
  }, [filteredRoles]);

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

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Explore Your Future in <span className="text-primary">IT</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Discover tech careers, compare roles, and find your perfect path in the ever-evolving IT industry
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search roles, categories, or skills..."
                className="pl-12 h-14 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-centergap-8 w-full gap-8">
        {/* Filters Section */}
        <section className="border-b bg-card/30 w-full md:w-[20%]">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">Filter by Tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => {
                const Icon = tagIcons[tag];
                const isSelected = selectedTags.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer px-4 py-2 text-sm font-medium transition-all ${
                      isSelected ? tagColors[tag] : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {tag}
                  </Badge>
                );
              })}
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags([])}
                  className="ml-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="">
          {/* Categories Quick Nav */}
          <section className="border-b bg-muted/30 w-full md:w-[80%]">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-2 flex-wrap pb-2">
                <Button
                  variant={selectedCategory === null ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="whitespace-nowrap"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Roles Grid */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {filteredRoles.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    No roles found matching your criteria. Try adjusting your filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {Object.entries(rolesByCategory).map(([category, roles]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold">{category}</h2>
                        <Badge variant="secondary" className="text-sm">
                          {roles.length} {roles.length === 1 ? 'Role' : 'Roles'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roles.map(role => (
                          <Link key={role.id} href={`/roles/${role.id}`}>
                            <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer">
                              <CardHeader>
                                <CardTitle className="flex items-start justify-between">
                                  <span className="flex-1">{role.title}</span>
                                  <TrendingUp className="h-5 w-5 text-green-500 ml-2" />
                                </CardTitle>
                                <CardDescription>{role.shortDescription}</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {role.tags.map(tag => {
                                    const Icon = tagIcons[tag];
                                    return (
                                      <Badge
                                        key={tag}
                                        variant="secondary"
                                        className={`text-xs ${tagColors[tag]}`}
                                      >
                                        <Icon className="h-3 w-3 mr-1" />
                                        {tag}
                                      </Badge>
                                    );
                                  })}
                                </div>
                                {role.stats && (
                                  <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
                                    <div>
                                      <p className="text-muted-foreground text-xs">Avg Salary</p>
                                      <p className="font-semibold">{role.stats.averageSalary}</p>
                                    </div>
                                    <div className='text-right'>
                                      <p className="text-muted-foreground text-xs">Growth</p>
                                      <p className="font-semibold text-green-600">{role.stats.growthRate}</p>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>

      </section>


      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
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