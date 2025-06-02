import { useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Heart, Volume2, Shuffle, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Track {
  id: number;
  title: string;
  artist: string;
  albumCover: string;
  duration: number;
}

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // 3:45 in seconds
  const [volume, setVolume] = useState(70);
  const [currentTrack] = useState<Track>({
    id: 1,
    title: "Midnight Echoes",
    artist: "Alex Chen",
    albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop",
    duration: 225,
  });

  // Simulate playback progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 z-50">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Current Track Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <img 
            src={currentTrack.albumCover} 
            alt="Now playing" 
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <h4 className="font-medium truncate text-white">{currentTrack.title}</h4>
            <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-red-500"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center space-y-2 flex-1">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              onClick={togglePlayPause}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-black" />
              ) : (
                <Play className="h-4 w-4 text-black ml-0.5" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 w-full max-w-md">
            <span className="text-xs text-gray-400 min-w-[2.5rem]">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-purple-500 h-1 rounded-full transition-all duration-300" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-400 min-w-[2.5rem]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-4 flex-1 justify-end">
          {/* Live Earnings */}
          <div className="hidden sm:flex items-center space-x-2 bg-green-600/20 px-3 py-1 rounded-full">
            <span className="text-sm font-medium text-green-400">+3</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-gray-400" />
            <div className="w-20">
              <Slider
                value={[volume]}
                onValueChange={(value) => setVolume(value[0])}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
