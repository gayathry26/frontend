"use client";

import { X, Building2, MapPin, Globe, CheckCircle2, Calendar, Users, Briefcase, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DiscoveredCompany } from '../../backend/services/companyDiscoveryService';

interface CompanyDetailsModalProps {
  company: DiscoveredCompany | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyDetailsModal({ company, isOpen, onClose }: CompanyDetailsModalProps) {
  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col justify-between">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between gap-4 sticky top-0 bg-card z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300">
                {company.type}
              </Badge>
              {company.hiring && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                  ⚡ Hiring Active
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground leading-tight">{company.name}</h2>
            {company.cin && (
              <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span>CIN: {company.cin}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Location & Meta Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Location</span>
                <span className="text-xs font-medium text-foreground">{company.address.full}</span>
              </div>
            </div>

            {company.employeeCount && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Company Size</span>
                  <span className="text-xs font-medium text-foreground">{company.employeeCount} Employees</span>
                </div>
              </div>
            )}

            {company.foundedYear && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Founded</span>
                  <span className="text-xs font-medium text-foreground">{company.foundedYear}</span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {company.description && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">About Company</h3>
              <p className="text-sm text-foreground leading-relaxed">{company.description}</p>
            </div>
          )}

          {/* Technologies Stack */}
          {company.technologies && company.technologies.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Technologies & Stack</h3>
              <div className="flex flex-wrap gap-1.5">
                {company.technologies.map(tech => (
                  <Badge key={tech} variant="secondary" className="text-xs py-1 px-2.5">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {company.categories && company.categories.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Domain Focus</h3>
              <div className="flex flex-wrap gap-1.5">
                {company.categories.map(cat => (
                  <Badge key={cat} variant="outline" className="text-xs py-1 px-2.5">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-1.5">
                <span>Visit Official Website</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
