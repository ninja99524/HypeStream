import { Music, Home, Heart, List, Coins, Plus, Settings, Download } from "lucide-react";
import { SiSpotify } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  { icon: Home, label: "Discover", href: "/", active: true },
  { icon: Music, label: "My Music", href: "/my-music" },
  { icon: Heart, label: "Liked", href: "/liked" },
  { icon: List, label: "Playlists", href: "/playlists" },
  { icon: Coins, label: "Earn Coins", href: "/earn" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectSpotifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/spotify/auth");
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      console.error("Error connecting Spotify:", error);
      toast({
        title: "Error",
        description: "Failed to connect Spotify",
        variant: "destructive",
      });
    },
  });

  const importKonradMusicMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/spotify/import-konrad-music");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Konrad Hau's music has been imported and prioritized in the feed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks/discovery"] });
    },
    onError: (error) => {
      console.error("Error importing music:", error);
      toast({
        title: "Error",
        description: "Failed to import music",
        variant: "destructive",
      });
    },
  });

  const handleConnectSpotify = () => {
    connectSpotifyMutation.mutate();
  };

  const handleImportKonradMusic = () => {
    importKonradMusicMutation.mutate();
  };

  const isSpotifyConnected = !!user?.spotifyAccessToken;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gray-800 border-r border-gray-700">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Music className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">HypeStream</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
              item.active
                ? "bg-purple-600/20 text-purple-400"
                : "hover:bg-gray-700 text-gray-300"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Connected Services */}
      <div className="p-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Connected Services</h3>
        <div className="space-y-2">
          <div className={cn(
            "flex items-center space-x-2 p-2 rounded-lg",
            isSpotifyConnected 
              ? "bg-green-900/30" 
              : "bg-gray-700/50"
          )}>
            <SiSpotify className={cn(
              "h-4 w-4",
              isSpotifyConnected ? "text-green-400" : "text-gray-400"
            )} />
            <span className="text-sm text-white">Spotify</span>
            <div className={cn(
              "ml-auto w-2 h-2 rounded-full",
              isSpotifyConnected ? "bg-green-400" : "bg-gray-400"
            )}></div>
          </div>
          
          {!isSpotifyConnected ? (
            <Button
              onClick={handleConnectSpotify}
              disabled={connectSpotifyMutation.isPending}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2 w-full border-gray-600 hover:bg-gray-700"
            >
              <SiSpotify className="h-4 w-4" />
              <span className="text-sm">Connect Spotify</span>
            </Button>
          ) : (
            <Button
              onClick={handleImportKonradMusic}
              disabled={importKonradMusicMutation.isPending}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2 w-full border-purple-600 hover:bg-purple-600/20"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">
                {importKonradMusicMutation.isPending ? "Importing..." : "Import Konrad's Music"}
              </span>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 w-full border-gray-600 hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add Service</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
