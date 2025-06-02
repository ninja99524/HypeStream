import { storage } from "./storage";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com";

// Your artist ID from the Spotify URL
const KONRAD_HAU_ARTIST_ID = "12IcqpWZgrkPLmUboLa1Bb";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyArtistTracks {
  tracks: SpotifyTrack[];
}

// Get Spotify access token using client credentials
async function getSpotifyAccessToken(): Promise<string> {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch artist's top tracks
async function fetchArtistTopTracks(artistId: string, accessToken: string): Promise<SpotifyTrack[]> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=US`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch artist tracks: ${response.statusText}`);
  }

  const data: SpotifyArtistTracks = await response.json();
  return data.tracks;
}

// Fetch artist's albums and tracks
async function fetchArtistAlbums(artistId: string, accessToken: string): Promise<SpotifyTrack[]> {
  const albumsResponse = await fetch(
    `${SPOTIFY_API_BASE}/artists/${artistId}/albums?include_groups=album,single&market=US&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!albumsResponse.ok) {
    throw new Error(`Failed to fetch artist albums: ${albumsResponse.statusText}`);
  }

  const albumsData = await albumsResponse.json();
  const tracks: SpotifyTrack[] = [];

  // Fetch tracks from each album
  for (const album of albumsData.items) {
    const tracksResponse = await fetch(
      `${SPOTIFY_API_BASE}/albums/${album.id}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (tracksResponse.ok) {
      const tracksData = await tracksResponse.json();
      for (const track of tracksData.items) {
        tracks.push({
          ...track,
          album: album, // Add album info to track
        });
      }
    }
  }

  return tracks;
}

// Import Konrad Hau's music into the database
export async function importKonradHauMusic(userId: string): Promise<void> {
  try {
    const accessToken = await getSpotifyAccessToken();
    
    // Fetch top tracks and album tracks
    const [topTracks, albumTracks] = await Promise.all([
      fetchArtistTopTracks(KONRAD_HAU_ARTIST_ID, accessToken),
      fetchArtistAlbums(KONRAD_HAU_ARTIST_ID, accessToken),
    ]);

    // Combine and deduplicate tracks
    const allTracks = [...topTracks, ...albumTracks];
    const uniqueTracks = allTracks.filter(
      (track, index, self) => self.findIndex(t => t.id === track.id) === index
    );

    console.log(`Importing ${uniqueTracks.length} tracks from Konrad Hau`);

    // Import tracks into database
    for (const spotifyTrack of uniqueTracks) {
      try {
        // Check if track already exists
        const existingTracks = await storage.getTracks();
        const exists = existingTracks.some(t => t.spotifyTrackId === spotifyTrack.id);
        
        if (!exists) {
          await storage.createTrack({
            title: spotifyTrack.name,
            artist: spotifyTrack.artists[0]?.name || "Konrad Hau",
            albumCover: spotifyTrack.album.images[0]?.url || null,
            spotifyTrackId: spotifyTrack.id,
            duration: Math.floor(spotifyTrack.duration_ms / 1000),
            previewUrl: spotifyTrack.preview_url,
            uploadedBy: userId, // Use the actual user ID
          });
          console.log(`Imported: ${spotifyTrack.name}`);
        }
      } catch (error) {
        console.error(`Failed to import track ${spotifyTrack.name}:`, error);
      }
    }

    console.log("Finished importing Konrad Hau's music");
  } catch (error) {
    console.error("Error importing Konrad Hau music:", error);
    throw error;
  }
}

// Get user's Spotify access token for authenticated requests
export async function getUserSpotifyAccessToken(userId: string): Promise<string | null> {
  const user = await storage.getUser(userId);
  return user?.spotifyAccessToken || null;
}

// Search Spotify for tracks
export async function searchSpotifyTracks(query: string, accessToken?: string): Promise<SpotifyTrack[]> {
  const token = accessToken || await getSpotifyAccessToken();
  
  const response = await fetch(
    `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search Spotify: ${response.statusText}`);
  }

  const data = await response.json();
  return data.tracks.items;
}

// Generate Spotify authorization URL for user login
export function getSpotifyAuthUrl(redirectUri: string): string {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-library-read",
    "user-top-read",
    "playlist-read-private",
    "streaming",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    show_dialog: "true",
  });

  return `${SPOTIFY_ACCOUNTS_BASE}/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Spotify code: ${response.statusText}`);
  }

  return response.json();
}