import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import MusicPlayer from "@/components/MusicPlayer";
import DiscoveryFeed from "@/components/DiscoveryFeed";
import { Button } from "@/components/ui/button";
import { Search, Coins, Menu, Music } from "lucide-react";
import { SiSpotify } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["/api/users/" + user?.id + "/stats"],
    enabled: !!user?.id,
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search music, artists..." 
                  className="bg-gray-700 rounded-full px-4 py-2 pl-10 w-80 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Coin Balance */}
            <div className="bg-gradient-to-r from-orange-500 to-green-500 p-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Coins className="h-4 w-4 text-white" />
                <span className="font-semibold text-white">
                  {user?.coinBalance?.toLocaleString() || 0}
                </span>
              </div>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-2">
              <img 
                src={user?.profileImageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"} 
                alt="User profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="hidden sm:block font-medium">
                {user?.firstName || user?.email?.split('@')[0] || 'User'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="ml-2"
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Good evening, {user?.firstName || 'Music Lover'}!
            </h1>
            <p className="text-gray-400">Discover new music and earn coins while you listen</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Today's Streams</p>
                  <p className="text-2xl font-bold text-green-400">
                    {userStats?.todayStreams || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-400/20 rounded-lg flex items-center justify-center">
                  <Coins className="h-5 w-5 text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Coins Earned</p>
                  <p className="text-2xl font-bold text-orange-400">
                    +{userStats?.todayCoins || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-400/20 rounded-lg flex items-center justify-center">
                  <Coins className="h-5 w-5 text-orange-400" />
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Your Rank</p>
                  <p className="text-2xl font-bold text-purple-400">#142</p>
                </div>
                <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center">
                  <Coins className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Discovery Feed */}
          <DiscoveryFeed />

          {/* Spotify Integration Section */}
          <div className="mt-12 bg-gradient-to-r from-green-800/20 to-purple-800/20 p-6 rounded-xl border border-green-700/30">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Connect Your Music</h3>
              <p className="text-gray-400 mb-4">Import your Spotify tracks and get priority placement</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => window.location.href = '/api/spotify/auth'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <SiSpotify className="h-4 w-4 mr-2" />
                  Connect Spotify
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/spotify/import-konrad-music', { method: 'POST' });
                      if (response.ok) {
                        toast({
                          title: "Success!",
                          description: "Your music has been imported and prioritized",
                        });
                        window.location.reload();
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to import music",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline" 
                  className="border-purple-600 hover:bg-purple-600/20"
                >
                  <Music className="h-4 w-4 mr-2" />
                  Import Konrad's Music
                </Button>
              </div>
            </div>
          </div>

          {/* Earn More Section */}
          <div className="mt-8 bg-gradient-to-r from-purple-800/20 to-blue-800/20 p-6 rounded-xl border border-purple-700/30">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Want More Coins?</h3>
              <p className="text-gray-400 mb-4">Boost your earnings and promote your music</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Coins className="h-4 w-4 mr-2" />
                  Buy Coins
                </Button>
                <Button variant="outline" className="border-purple-600 hover:bg-purple-600/20">
                  <Music className="h-4 w-4 mr-2" />
                  Upload Music
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Music Player */}
      <MusicPlayer />
    </div>
  );
}
