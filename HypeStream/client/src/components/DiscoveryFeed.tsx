import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import TrackCard from "./TrackCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoveryFeed() {
  const { data: tracks, isLoading, error } = useQuery({
    queryKey: ["/api/tracks/discovery"],
    retry: false,
  });

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Failed to load discovery feed</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Discover Music</h2>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700"
          >
            All
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-gray-600 hover:bg-gray-700"
          >
            Friends
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-gray-600 hover:bg-gray-700"
          >
            Trending
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded-xl">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-lg bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 bg-gray-700" />
                  <Skeleton className="h-5 w-48 bg-gray-700" />
                  <Skeleton className="h-3 w-32 bg-gray-700" />
                </div>
                <Skeleton className="w-12 h-12 rounded-full bg-gray-700" />
              </div>
            </div>
          ))
        ) : tracks && tracks.length > 0 ? (
          tracks.map((track: any) => (
            <TrackCard key={track.id} track={track} />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">No music found</h3>
              <p>Be the first to upload and share music!</p>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Upload Your First Track
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
