export interface HackathonEvent {
    id: string;

    title: string;

    eventType: string;

    startDate?: string;
    endDate?: string;

    organizer?: string;
    college?: string;

    city?: string;
    state?: string;
    country: string;

    venue?: string;

    description?: string;

    eligibility?: string;

    prize?: string;

    registrationFee?: string;

    registrationDeadline?: string;

    registrationUrl?: string;

    eventUrl: string;

    sourceUrl?: string;

    posterImage?: string;

    source: string;

    sourceId?: string;

    mode?: "Online" | "Offline" | "Hybrid" | "Unknown";

    technologies?: string[];

    themes?: string[];

    scrapedAt: string;
}