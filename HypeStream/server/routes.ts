import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTrackSchema, insertListeningSessionSchema, insertUserInteractionSchema } from "@shared/schema";
import { importKonradHauMusic, getSpotifyAuthUrl, exchangeSpotifyCode, searchSpotifyTracks } from "./spotify";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Spotify integration routes
  app.post('/api/spotify/connect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accessToken, refreshToken } = req.body;
      
      await storage.updateSpotifyTokens(userId, accessToken, refreshToken);
      res.json({ success: true });
    } catch (error) {
      console.error("Error connecting Spotify:", error);
      res.status(500).json({ message: "Failed to connect Spotify" });
    }
  });

  // Track routes
  app.get('/api/tracks', isAuthenticated, async (req: any, res) => {
    try {
      const tracks = await storage.getTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get('/api/tracks/discovery', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tracks = await storage.getDiscoveryFeed(userId);
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching discovery feed:", error);
      res.status(500).json({ message: "Failed to fetch discovery feed" });
    }
  });

  app.post('/api/tracks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trackData = insertTrackSchema.parse({
        ...req.body,
        uploadedBy: userId,
      });
      
      const track = await storage.createTrack(trackData);
      res.json(track);
    } catch (error) {
      console.error("Error creating track:", error);
      res.status(500).json({ message: "Failed to create track" });
    }
  });

  app.post('/api/tracks/:id/play', isAuthenticated, async (req: any, res) => {
    try {
      const trackId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Create listening session
      const session = await storage.createListeningSession({
        userId,
        trackId,
        duration: 0,
        coinsEarned: 0,
        completed: false,
      });
      
      // Update play count
      await storage.updateTrackStats(trackId, 'plays');
      
      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Error starting playback:", error);
      res.status(500).json({ message: "Failed to start playback" });
    }
  });

  app.put('/api/listening-sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { duration } = req.body;
      const userId = req.user.claims.sub;
      
      // Calculate coins earned (5 coins for 30+ seconds)
      const coinsEarned = duration >= 30 ? 5 : 0;
      const completed = duration >= 30;
      
      await storage.updateListeningSession(sessionId, duration, coinsEarned, completed);
      
      // Update user coin balance if coins earned
      if (coinsEarned > 0) {
        await storage.updateUserCoins(userId, coinsEarned);
      }
      
      res.json({ coinsEarned, completed });
    } catch (error) {
      console.error("Error updating listening session:", error);
      res.status(500).json({ message: "Failed to update listening session" });
    }
  });

  // User interaction routes
  app.post('/api/interactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const interactionData = insertUserInteractionSchema.parse({
        ...req.body,
        userId,
      });
      
      // Check if interaction already exists
      const existing = await storage.getUserInteraction(
        userId,
        interactionData.targetId,
        interactionData.targetType,
        interactionData.interactionType
      );
      
      if (existing) {
        // Remove interaction (unlike/unfollow)
        await storage.deleteUserInteraction(
          userId,
          interactionData.targetId,
          interactionData.targetType,
          interactionData.interactionType
        );
        
        // Update stats if it's a track like
        if (interactionData.targetType === 'track' && interactionData.interactionType === 'like') {
          // Note: This would decrease likes, but for simplicity we're just tracking the interaction
        }
        
        res.json({ action: 'removed' });
      } else {
        // Create new interaction
        await storage.createUserInteraction(interactionData);
        
        // Update track stats if it's a track interaction
        if (interactionData.targetType === 'track') {
          const trackId = parseInt(interactionData.targetId);
          if (interactionData.interactionType === 'like') {
            await storage.updateTrackStats(trackId, 'likes');
          } else if (interactionData.interactionType === 'share') {
            await storage.updateTrackStats(trackId, 'shares');
          }
        }
        
        res.json({ action: 'created' });
      }
    } catch (error) {
      console.error("Error handling interaction:", error);
      res.status(500).json({ message: "Failed to handle interaction" });
    }
  });

  // User stats route
  app.get('/api/users/:id/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const stats = await storage.getUserListeningStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Spotify integration routes
  app.get('/api/spotify/auth', isAuthenticated, (req: any, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/spotify/callback`;
    const authUrl = getSpotifyAuthUrl(redirectUri);
    res.redirect(authUrl);
  });

  app.get('/api/spotify/callback', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.query;
      const userId = req.user.claims.sub;
      const redirectUri = `${req.protocol}://${req.get('host')}/api/spotify/callback`;
      
      const tokenData = await exchangeSpotifyCode(code as string, redirectUri);
      
      // Store tokens in user profile
      await storage.updateSpotifyTokens(
        userId,
        tokenData.access_token,
        tokenData.refresh_token
      );
      
      res.redirect('/?spotify=connected');
    } catch (error) {
      console.error("Error connecting Spotify:", error);
      res.redirect('/?spotify=error');
    }
  });

  app.post('/api/spotify/import-konrad-music', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await importKonradHauMusic(userId);
      res.json({ success: true, message: "Konrad Hau's music imported successfully" });
    } catch (error) {
      console.error("Error importing Konrad's music:", error);
      res.status(500).json({ message: "Failed to import music" });
    }
  });

  app.get('/api/spotify/search', isAuthenticated, async (req: any, res) => {
    try {
      const { q } = req.query;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const tracks = await searchSpotifyTracks(q as string, user?.spotifyAccessToken || undefined);
      res.json(tracks);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      res.status(500).json({ message: "Failed to search Spotify" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
