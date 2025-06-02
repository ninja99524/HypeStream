import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  coinBalance: integer("coin_balance").default(0).notNull(),
  spotifyAccessToken: text("spotify_access_token"),
  spotifyRefreshToken: text("spotify_refresh_token"),
  spotifyUserId: varchar("spotify_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tracks table
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  artist: varchar("artist").notNull(),
  albumCover: text("album_cover"),
  spotifyTrackId: varchar("spotify_track_id").unique(),
  duration: integer("duration"), // in seconds
  previewUrl: text("preview_url"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  plays: integer("plays").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Listening sessions table
export const listeningSessions = pgTable("listening_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  duration: integer("duration").notNull(), // seconds listened
  coinsEarned: integer("coins_earned").default(0).notNull(),
  completed: boolean("completed").default(false), // listened for 30+ seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// User interactions table (likes, follows, etc.)
export const userInteractions = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  targetId: varchar("target_id").notNull(), // can be user_id or track_id
  targetType: varchar("target_type").notNull(), // 'user' or 'track'
  interactionType: varchar("interaction_type").notNull(), // 'like', 'follow', 'playlist_add'
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tracks: many(tracks),
  listeningSessions: many(listeningSessions),
  interactions: many(userInteractions),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [tracks.uploadedBy],
    references: [users.id],
  }),
  listeningSessions: many(listeningSessions),
}));

export const listeningSessionsRelations = relations(listeningSessions, ({ one }) => ({
  user: one(users, {
    fields: [listeningSessions.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [listeningSessions.trackId],
    references: [tracks.id],
  }),
}));

export const userInteractionsRelations = relations(userInteractions, ({ one }) => ({
  user: one(users, {
    fields: [userInteractions.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  plays: true,
  likes: true,
  shares: true,
  createdAt: true,
});

export const insertListeningSessionSchema = createInsertSchema(listeningSessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserInteractionSchema = createInsertSchema(userInteractions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;
export type InsertListeningSession = z.infer<typeof insertListeningSessionSchema>;
export type ListeningSession = typeof listeningSessions.$inferSelect;
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type UserInteraction = typeof userInteractions.$inferSelect;
