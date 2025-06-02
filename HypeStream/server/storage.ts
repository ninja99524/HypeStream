import {
  users,
  tracks,
  listeningSessions,
  userInteractions,
  type User,
  type UpsertUser,
  type Track,
  type InsertTrack,
  type ListeningSession,
  type InsertListeningSession,
  type UserInteraction,
  type InsertUserInteraction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCoins(userId: string, amount: number): Promise<void>;
  updateSpotifyTokens(userId: string, accessToken: string, refreshToken?: string): Promise<void>;
  
  // Track operations
  createTrack(track: InsertTrack): Promise<Track>;
  getTrack(id: number): Promise<Track | undefined>;
  getTracks(limit?: number): Promise<Track[]>;
  getDiscoveryFeed(userId: string, limit?: number): Promise<Track[]>;
  updateTrackStats(trackId: number, field: 'plays' | 'likes' | 'shares'): Promise<void>;
  
  // Listening session operations
  createListeningSession(session: InsertListeningSession): Promise<ListeningSession>;
  updateListeningSession(id: number, duration: number, coinsEarned: number, completed: boolean): Promise<void>;
  getUserListeningStats(userId: string): Promise<{ todayStreams: number; todayCoins: number }>;
  
  // User interaction operations
  createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteraction(userId: string, targetId: string, targetType: string, interactionType: string): Promise<UserInteraction | undefined>;
  deleteUserInteraction(userId: string, targetId: string, targetType: string, interactionType: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserCoins(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        coinBalance: sql`${users.coinBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateSpotifyTokens(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    const updateData: any = {
      spotifyAccessToken: accessToken,
      updatedAt: new Date(),
    };
    
    if (refreshToken) {
      updateData.spotifyRefreshToken = refreshToken;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  // Track operations
  async createTrack(track: InsertTrack): Promise<Track> {
    const [newTrack] = await db.insert(tracks).values(track).returning();
    return newTrack;
  }

  async getTrack(id: number): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  async getTracks(limit = 20): Promise<Track[]> {
    return db.select().from(tracks).orderBy(desc(tracks.createdAt)).limit(limit);
  }

  async getDiscoveryFeed(userId: string, limit = 20): Promise<Track[]> {
    // Prioritize Konrad Hau's tracks first (user ID: 43385992), then user's own tracks, then others by creation date
    return db
      .select()
      .from(tracks)
      .orderBy(
        sql`CASE 
          WHEN ${tracks.uploadedBy} = '43385992' THEN 0 
          WHEN ${tracks.uploadedBy} = ${userId} THEN 1 
          ELSE 2 
        END`,
        desc(tracks.createdAt)
      )
      .limit(limit);
  }

  async updateTrackStats(trackId: number, field: 'plays' | 'likes' | 'shares'): Promise<void> {
    await db
      .update(tracks)
      .set({
        [field]: sql`${tracks[field]} + 1`,
      })
      .where(eq(tracks.id, trackId));
  }

  // Listening session operations
  async createListeningSession(session: InsertListeningSession): Promise<ListeningSession> {
    const [newSession] = await db.insert(listeningSessions).values(session).returning();
    return newSession;
  }

  async updateListeningSession(id: number, duration: number, coinsEarned: number, completed: boolean): Promise<void> {
    await db
      .update(listeningSessions)
      .set({ duration, coinsEarned, completed })
      .where(eq(listeningSessions.id, id));
  }

  async getUserListeningStats(userId: string): Promise<{ todayStreams: number; todayCoins: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [stats] = await db
      .select({
        todayStreams: sql<number>`COUNT(*)`,
        todayCoins: sql<number>`COALESCE(SUM(${listeningSessions.coinsEarned}), 0)`,
      })
      .from(listeningSessions)
      .where(
        and(
          eq(listeningSessions.userId, userId),
          sql`${listeningSessions.createdAt} >= ${today}`
        )
      );
    
    return {
      todayStreams: Number(stats?.todayStreams || 0),
      todayCoins: Number(stats?.todayCoins || 0),
    };
  }

  // User interaction operations
  async createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction> {
    const [newInteraction] = await db.insert(userInteractions).values(interaction).returning();
    return newInteraction;
  }

  async getUserInteraction(
    userId: string,
    targetId: string,
    targetType: string,
    interactionType: string
  ): Promise<UserInteraction | undefined> {
    const [interaction] = await db
      .select()
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.targetId, targetId),
          eq(userInteractions.targetType, targetType),
          eq(userInteractions.interactionType, interactionType)
        )
      );
    return interaction;
  }

  async deleteUserInteraction(
    userId: string,
    targetId: string,
    targetType: string,
    interactionType: string
  ): Promise<void> {
    await db
      .delete(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.targetId, targetId),
          eq(userInteractions.targetType, targetType),
          eq(userInteractions.interactionType, interactionType)
        )
      );
  }
}

export const storage = new DatabaseStorage();
