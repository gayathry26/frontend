import { getDb, isMongoConfigured } from '../config/mongodb';
import { EventDocument, EventCategory, EventMode, EventStatus } from '../types/event';
import { processAndNormalizeEvent, resolveEventStatus } from './eventIngestionService';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'events';

export interface EventFilterQuery {
  category?: EventCategory;
  state?: string;
  city?: string;
  mode?: EventMode;
  skill?: string;
  role?: string;
  status?: EventStatus;
  search?: string;
  limit?: number;
}

export async function getEvents(filters: EventFilterQuery = {}): Promise<EventDocument[]> {
  if (!isMongoConfigured()) return [];

  try {
    const db = await getDb();
    const query: any = { status: { $ne: 'CANCELLED' } };

    if (filters.category) {
      query.type = filters.category;
    }

    if (filters.mode) {
      query['location.mode'] = filters.mode;
    }

    if (filters.state) {
      query['location.state'] = new RegExp(`^${filters.state}$`, 'i');
    }

    if (filters.city) {
      query['location.city'] = new RegExp(`^${filters.city}$`, 'i');
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.role) {
      query.careerRoles = { $in: [new RegExp(filters.role, 'i')] };
    }

    if (filters.skill) {
      query.skills = { $in: [new RegExp(filters.skill, 'i')] };
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { 'organizer.name': searchRegex },
        { skills: { $in: [searchRegex] } },
        { careerRoles: { $in: [searchRegex] } }
      ];
    }

    const limit = filters.limit || 100;
    const docs = await db.collection<EventDocument>(COLLECTION_NAME)
      .find(query)
      .sort({ 'dates.registrationDeadline': 1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map(doc => {
      const updatedStatus = resolveEventStatus(doc.dates.registrationDeadline, doc.status);
      return {
        ...doc,
        _id: doc._id?.toString(),
        status: updatedStatus
      };
    });
  } catch (error) {
    console.error('Error fetching events from MongoDB Atlas:', error);
    return [];
  }
}

export async function getEventBySlug(slug: string): Promise<EventDocument | null> {
  if (!isMongoConfigured()) return null;

  try {
    const db = await getDb();
    const doc = await db.collection<EventDocument>(COLLECTION_NAME).findOne({ slug });
    if (!doc) return null;

    const updatedStatus = resolveEventStatus(doc.dates.registrationDeadline, doc.status);
    return {
      ...doc,
      _id: doc._id?.toString(),
      status: updatedStatus
    };
  } catch (error) {
    console.error(`Error fetching event ${slug}:`, error);
    return null;
  }
}

export async function getEventsForCareerRole(roleTitle: string, roleCategory?: string): Promise<EventDocument[]> {
  if (!isMongoConfigured()) return [];

  try {
    const db = await getDb();
    const roleRegex = new RegExp(roleTitle.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');

    const docs = await db.collection<EventDocument>(COLLECTION_NAME)
      .find({
        status: { $in: ['OPEN', 'CLOSING_SOON', 'UPCOMING', 'ONGOING'] },
        $or: [
          { careerRoles: { $in: [roleRegex] } },
          { 'careerRoleMatches.roleTitle': roleRegex }
        ]
      })
      .sort({ 'dates.registrationDeadline': 1 })
      .limit(10)
      .toArray();

    return docs.map(doc => ({
      ...doc,
      _id: doc._id?.toString(),
      status: resolveEventStatus(doc.dates.registrationDeadline, doc.status)
    }));
  } catch (error) {
    console.error(`Error fetching events for role ${roleTitle}:`, error);
    return [];
  }
}

export async function upsertEvent(eventData: Partial<EventDocument>): Promise<EventDocument> {
  const normalized = await processAndNormalizeEvent(eventData);
  const db = await getDb();
  const collection = db.collection<EventDocument>(COLLECTION_NAME);

  await collection.updateOne(
    { slug: normalized.slug },
    { $set: normalized },
    { upsert: true }
  );

  return normalized;
}

export async function submitOrganizerEvent(rawEvent: Partial<EventDocument>): Promise<EventDocument> {
  const normalized = await processAndNormalizeEvent({
    ...rawEvent,
    status: 'PENDING_REVIEW'
  });

  const db = await getDb();
  const res = await db.collection<EventDocument>(COLLECTION_NAME).insertOne(normalized);
  return { ...normalized, _id: res.insertedId.toString() };
}

export async function approveEvent(eventId: string): Promise<boolean> {
  if (!isMongoConfigured()) return false;
  const db = await getDb();
  let objId: ObjectId;
  try {
    objId = new ObjectId(eventId);
  } catch (e) {
    return false;
  }

  const res = await db.collection<EventDocument>(COLLECTION_NAME).updateOne(
    { _id: objId },
    { $set: { status: 'OPEN', updatedAt: new Date().toISOString() } }
  );

  return res.modifiedCount > 0;
}
