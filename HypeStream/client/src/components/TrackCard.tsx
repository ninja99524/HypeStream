import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Play, Heart, Plus, Share, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Track {
  id: number;
  title: string;
  artist: string;
  albumCover: string;
  uploadedBy: string;
  plays: number;
  likes: number;
  shares: number;
  duration: number;
}

interface TrackCardProps {
  track: Track;
}

export default function TrackCard({ track }: TrackCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [listenDuration, setListenDuration] = useState(0);

  const isUserTrack = track.uploadedBy === user?.id;

  // Play track mutation
  const playMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tracks/${track.id}/play`);
      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setIsPlaying(true);
      // Start tracking listen duration
      const interval = setInterval(() => {
        setListenDuration(prev => {
          const newDuration = prev + 1;
          // Award coins at 30 seconds
          if (newDuration === 30 && sessionId) {
            updateSessionMutation.mutate({ duration: newDuration });
          }
          return newDuration;
        });
      }, 1000);
      
      // Auto-stop after track duration
      setTimeout(() => {
        clearInterval(interval);
        setIsPlaying(false);
        if (sessionId) {
          updateSessionMutation.mutate({ duration: track.duration });
        }
      }, track.duration * 1000);
    },
    onError: (error) => {
      console.error("Error playing track:", error);
      toast({
        title: "Error",
        description: "Failed to play track",
        variant: "destructive",
      });
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ duration }: { duration: number }) => {
      if (!sessionId) return;
      const response = await apiRequest("PUT", `/api/listening-sessions/${sessionId}`, { duration });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.coinsEarned > 0) {
        toast({
          title: "Coins Earned!",
          description: `You earned ${data.coinsEarned} coins for listening!`,
        });
        // Invalidate user data to update coin balance
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });

  // Like track mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/interactions", {
        targetId: track.id.toString(),
        targetType: "track",
        interactionType: "like",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks/discovery"] });
    },
    onError: (error) => {
      console.error("Error liking track:", error);
      toast({
        title: "Error",
        description: "Failed to like track",
        variant: "destructive",
      });
    },
  });

  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (sessionId) {
        updateSessionMutation.mutate({ duration: listenDuration });
      }
    } else {
      playMutation.mutate();
    }
  };

  const handleLike = () => {
    likeMutation.mutate();
  };

  return (
    <div className={cn(
      "p-4 rounded-xl transition-colors",
      isUserTrack 
        ? "bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700/30"
        : "bg-gray-800 hover:bg-gray-700"
    )}>
      <div className="flex items-center space-x-4">
        <img 
          src={track.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop"} 
          alt="Album cover" 
          className="w-16 h-16 rounded-lg object-cover"
        />
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {isUserTrack && (
              <Badge className="bg-purple-600 hover:bg-purple-600">YOUR TRACK</Badge>
            )}
            <Badge className="bg-green-600 hover:bg-green-600">+5 COINS</Badge>
            {track.plays > 10000 && (
              <Badge variant="outline" className="border-orange-500 text-orange-500">TRENDING</Badge>
            )}
          </div>
          <h3 className="font-semibold text-white">{track.title}</h3>
          <p className="text-gray-400 text-sm">{track.artist}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
            <span><Play className="inline h-3 w-3 mr-1" /> {track.plays.toLocaleString()}</span>
            <span><Heart className="inline h-3 w-3 mr-1" /> {track.likes}</span>
            <span><Share className="inline h-3 w-3 mr-1" /> {track.shares}</span>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <Button
            onClick={handlePlay}
            disabled={playMutation.isPending}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              isUserTrack 
                ? "bg-purple-600 hover:bg-purple-700" 
                : "bg-white/10 hover:bg-purple-600"
            )}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white" />
            )}
          </Button>
          
          <div className="flex space-x-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className="w-8 h-8 bg-gray-700 hover:bg-red-500 transition-colors"
            >
              <Heart className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
