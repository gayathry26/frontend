"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, Search, MapPin, ExternalLink, Building2, CheckCircle2, Compass, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CompanyDetailsModal } from '@/components/CompanyDetailsModal';
import { DiscoveredCompany } from '../../../backend/services/companyDiscoveryService';

const LOCATIONS = [
  { value: 'all', label: 'All Cities (India)' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Bangalore', label: 'Bangalore' },
  { value: 'Coimbatore', label: 'Coimbatore' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Gurgaon', label: 'Gurgaon / NCR' },
  { value: 'Noida', label: 'Noida' },
];

const TYPES = [
  { value: 'all', label: 'All Company Types' },
  { value: 'Product', label: 'Product Companies' },
  { value: 'Service', label: 'Service-Based' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'FinTech', label: 'FinTech' },
  { value: 'Startup', label: 'Startups' },
  { value: 'Enterprise', label: 'Enterprise' },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<DiscoveredCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [hiringOnly, setHiringOnly] = useState(false);

  // Selected company modal state
  const [selectedCompanyModal, setSelectedCompanyModal] = useState<DiscoveredCompany | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    totalCompanies: 0,
    hiringCount: 0,
    startupsCount: 0,
    productCount: 0,
    serviceCount: 0,
  });

  useEffect(() => {
    fetchCompanies();
    fetchStats(selectedLocation);
  }, [selectedLocation, selectedType, hiringOnly]);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        city: selectedLocation === 'all' ? '' : selectedLocation,
        type: selectedType === 'all' ? '' : selectedType,
        hiring: hiringOnly ? 'true' : '',
        search: searchQuery,
        limit: '100'
      });

      const res = await fetch(`/api/companies?${params.toString()}`);
      const data = await res.json();
      if (data.companies) {
        setCompanies(data.companies);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats(city: string) {
    try {
      const res = await fetch(`/api/companies?action=stats&city=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (data.success) {
        setStats({
          totalCompanies: data.totalCompanies || 0,
          hiringCount: data.hiringCount || 0,
          startupsCount: data.startupsCount || 0,
          productCount: data.productCount || 0,
          serviceCount: data.serviceCount || 0,
        });
      }
    } catch {}
  }

  const handleLocationSelect = (cityVal: string) => {
    setSelectedLocation(cityVal);
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const s = searchQuery.toLowerCase();
      if (!s) return true;
      return (
        c.name.toLowerCase().includes(s) ||
        c.address.full.toLowerCase().includes(s) ||
        c.address.area?.toLowerCase().includes(s) ||
        c.description?.toLowerCase().includes(s) ||
        c.technologies.some(t => t.toLowerCase().includes(s)) ||
        c.categories.some(cat => cat.toLowerCase().includes(s))
      );
    });
  }, [companies, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Navigation */}
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
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Opportunities</Button>
              </Link>
              <Link href="/compare">
                <Button variant="outline">Compare Roles</Button>
              </Link>
              <Link href="/companies">
                <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">Companies</Button>
              </Link>
              <Link href="/admin/data-management">
                <Button variant="outline">Admin</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Hero Banner & Stats Grid */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-background to-blue-500/10 rounded-xl p-6 md:p-8 mb-8 border border-border/80 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="gap-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  <Compass className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  India Tech Discovery Engine v0.1
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">IT & Software Companies</h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Discover verified IT enterprises, SaaS innovators, tech startups, and development hubs across Indian cities.
              </p>
            </div>

            {/* Hub Stats Grid */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-card border border-border/80 rounded-lg p-3 text-center shadow-xs">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block">{stats.totalCompanies}</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Companies</span>
              </div>
              <div className="bg-card border border-border/80 rounded-lg p-3 text-center shadow-xs">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{stats.hiringCount}</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Actively Hiring</span>
              </div>
              <div className="bg-card border border-border/80 rounded-lg p-3 text-center shadow-xs">
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400 block">{stats.startupsCount}</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Startups</span>
              </div>
              <div className="bg-card border border-border/80 rounded-lg p-3 text-center shadow-xs">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">{stats.productCount}</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Product & SaaS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Search Controls */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Search Company / Technology
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. Zoho, Infosys, Python, React, SaaS..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 text-sm font-medium"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Location Hub
              </label>
              <select
                value={selectedLocation}
                onChange={e => handleLocationSelect(e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Company Category
              </label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Hub Chips */}
          <div className="pt-3 border-t border-border flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-indigo-500" />
              Quick Hubs:
            </span>
            {LOCATIONS.map(city => (
              <Button
                key={city.value}
                type="button"
                variant={selectedLocation.toLowerCase() === city.value.toLowerCase() ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLocationSelect(city.value)}
                className={`whitespace-nowrap text-xs h-7 px-3 rounded-full ${
                  selectedLocation.toLowerCase() === city.value.toLowerCase()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold'
                    : 'hover:border-indigo-300'
                }`}
              >
                {city.label}
              </Button>
            ))}

            <Button
              type="button"
              variant={hiringOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHiringOnly(!hiringOnly)}
              className={`whitespace-nowrap text-xs h-7 px-3 rounded-full gap-1 ${
                hiringOnly ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold' : 'border-emerald-300 text-emerald-700'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Hiring Only</span>
            </Button>
          </div>
        </div>

        {/* Company Grid View */}
        {loading ? (
          <div className="py-24 text-center space-y-4 bg-card border border-border rounded-xl shadow-sm">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-foreground font-bold text-base">Loading IT Companies Catalog...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-16 text-center border rounded-xl bg-card text-muted-foreground p-8 space-y-3 shadow-sm">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground">No Companies Found</h3>
            <p className="text-sm max-w-md mx-auto">Try resetting search filters.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedLocation('all');
                setSelectedType('all');
                setSearchQuery('');
                setHiringOnly(false);
              }}
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Showing {filteredCompanies.length} Verified IT Companies {selectedLocation !== 'all' && `in ${selectedLocation}`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map(company => (
                <div
                  key={company.id}
                  className="border border-border rounded-xl p-6 transition-all duration-200 hover:shadow-lg bg-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-foreground leading-snug">
                        {company.name}
                      </h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                        {company.type}
                      </Badge>
                    </div>

                    {company.cin && (
                      <p className="text-[10px] font-mono text-muted-foreground mb-2">
                        CIN: {company.cin}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground flex items-start gap-1.5 mb-3 leading-relaxed">
                      <MapPin className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
                      <span>{company.address.full}</span>
                    </p>

                    {company.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                        {company.description}
                      </p>
                    )}

                    {company.technologies && company.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {company.technologies.slice(0, 5).map(tech => (
                          <Badge key={tech} variant="secondary" className="text-[10px] py-0 px-1.5">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border mt-4 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCompanyModal(company)}
                      className="h-8 px-2.5 text-xs gap-1 font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Details</span>
                    </Button>

                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Visit Official Website"
                      >
                        <Button variant="default" size="sm" className="h-8 px-3 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                          <span>Visit Website</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Details Slide-Over Modal */}
      <CompanyDetailsModal
        company={selectedCompanyModal}
        isOpen={Boolean(selectedCompanyModal)}
        onClose={() => setSelectedCompanyModal(null)}
      />

      <footer className="border-t mt-16 py-10 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-xs space-y-1">
          <p>© 2026 IT Career Hub. v0.1 Company Discovery Pipeline Engine.</p>
        </div>
      </footer>
    </div>
  );
}
