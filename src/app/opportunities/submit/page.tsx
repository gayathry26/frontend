"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SubmitOpportunityPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'HACKATHON',
    organizerName: '',
    organizerWebsite: '',
    mode: 'OFFLINE',
    state: 'Tamil Nadu',
    city: 'Coimbatore',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    skills: 'Python, React, AI',
    eligibility: 'College Students',
    prizeAmount: '',
    prizeDescription: '',
    registrationUrl: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (formData.registrationUrl.toLowerCase().includes('example.com') || formData.registrationUrl.toLowerCase().includes('example.org')) {
        throw new Error('Please provide an actual official registration URL. Placeholder domains like example.com are not allowed.');
      }

      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      const eligibilityArray = formData.eligibility.split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        organizer: {
          name: formData.organizerName,
          website: formData.organizerWebsite || undefined
        },
        location: {
          country: 'India',
          state: formData.mode === 'ONLINE' ? null : formData.state,
          city: formData.mode === 'ONLINE' ? null : formData.city,
          mode: formData.mode
        },
        dates: {
          registrationDeadline: new Date(formData.registrationDeadline || Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          startDate: new Date(formData.startDate || Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(formData.endDate || Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()
        },
        eligibility: eligibilityArray,
        skills: skillsArray,
        prize: formData.prizeDescription ? {
          amount: formData.prizeAmount ? Number(formData.prizeAmount) : undefined,
          currency: 'INR',
          description: formData.prizeDescription
        } : undefined,
        registrationUrl: formData.registrationUrl
      };

      const res = await fetch('/api/events/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmittedSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting opportunity');
    } finally {
      setSubmitting(false);
    }
  }

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
              <Link href="/opportunities">
                <Button variant="outline">All Opportunities</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/opportunities">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunities
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <PlusCircle className="h-6 w-6 text-blue-600" />
              Submit Student Opportunity
            </CardTitle>
            <CardDescription>
              Submit your college hackathon, coding contest, workshop, tech fest, or CTF to reach thousands of IT students across India.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submittedSuccess ? (
              <div className="p-6 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-xl text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
                <h3 className="text-xl font-bold">Submission Received!</h3>
                <p className="text-sm">
                  Your opportunity has been submitted for admin verification. Once verified, it will be published live to students across India.
                </p>
                <Button onClick={() => setSubmittedSuccess(false)} variant="outline" className="mt-4">
                  Submit Another Opportunity
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded flex items-center gap-2 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="font-semibold block mb-1">Opportunity Title *</label>
                  <Input
                    required
                    placeholder="e.g. Smart India AI Innovation Hackathon 2026"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Category *</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-2.5 rounded border bg-background text-sm"
                    >
                      <option value="HACKATHON">Hackathon</option>
                      <option value="CODING_CONTEST">Coding Contest</option>
                      <option value="WORKSHOP">Workshop</option>
                      <option value="CTF">CTF (Capture The Flag)</option>
                      <option value="TECH_FEST">Tech Fest</option>
                      <option value="OPEN_SOURCE">Open Source Event</option>
                      <option value="CAREER_FAIR">Career Fair</option>
                      <option value="IDEATHON">Ideathon</option>
                      <option value="WEBINAR">Webinar</option>
                      <option value="CONFERENCE">Conference</option>
                      <option value="PROJECT_COMPETITION">Project Competition</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Mode *</label>
                    <select
                      value={formData.mode}
                      onChange={e => setFormData({ ...formData, mode: e.target.value })}
                      className="w-full p-2.5 rounded border bg-background text-sm"
                    >
                      <option value="OFFLINE">Offline</option>
                      <option value="ONLINE">Online</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Organizer Name *</label>
                    <Input
                      required
                      placeholder="e.g. CIT AI Club & Tech Community"
                      value={formData.organizerName}
                      onChange={e => setFormData({ ...formData, organizerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Organizer Website</label>
                    <Input
                      placeholder="https://example.edu.in"
                      value={formData.organizerWebsite}
                      onChange={e => setFormData({ ...formData, organizerWebsite: e.target.value })}
                    />
                  </div>
                </div>

                {formData.mode !== 'ONLINE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold block mb-1">Indian State</label>
                      <Input
                        placeholder="e.g. Tamil Nadu"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">City</label>
                      <Input
                        placeholder="e.g. Coimbatore"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-semibold block mb-1">Registration Deadline Date *</label>
                  <Input
                    type="date"
                    required
                    value={formData.registrationDeadline}
                    onChange={e => setFormData({ ...formData, registrationDeadline: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Required Skills (Comma-separated) *</label>
                  <Input
                    required
                    placeholder="e.g. Python, React, AI, Cybersecurity"
                    value={formData.skills}
                    onChange={e => setFormData({ ...formData, skills: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Prize Details (Optional)</label>
                  <Input
                    placeholder="e.g. ₹1.5 Lakh Cash Prizes + Internship Offers"
                    value={formData.prizeDescription}
                    onChange={e => setFormData({ ...formData, prizeDescription: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Official Registration Link (URL) *</label>
                  <Input
                    type="url"
                    required
                    placeholder="https://official-event-registration-link.com"
                    value={formData.registrationUrl}
                    onChange={e => setFormData({ ...formData, registrationUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Description *</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full p-3 rounded border bg-background text-sm"
                    placeholder="Provide details about the hackathon/contest challenges, eligibility, and rules..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
                >
                  {submitting ? 'Submitting Opportunity...' : 'Submit Opportunity for Review'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
