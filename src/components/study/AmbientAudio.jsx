import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, FastForward } from 'lucide-react';

const TRACKS = [
  { id: 1, name: "Rain & Thunder", src: "https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg" },
  { id: 2, name: "Cafe Ambience", src: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" },
  { id: 3, name: "Deep Focus (White Noise)", src: "https://actions.google.com/sounds/v1/weather/ocean_waves.ogg" }
];

export default function AmbientAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % TRACKS.length;
    setCurrentTrackIndex(nextIndex);
    if (isPlaying) {
      // Need a slight delay to allow the src to update before playing
      setTimeout(() => {
        if (audioRef.current) audioRef.current.play();
      }, 50);
    }
  };

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl backdrop-blur-md shadow-lg w-full max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-indigo-400">
          <Music className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Ambient Audio</span>
        </div>
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-3">
            <span className="w-1 bg-indigo-500 rounded-t-sm animate-[bounce_1s_infinite_0ms]"></span>
            <span className="w-1 bg-indigo-400 rounded-t-sm animate-[bounce_1s_infinite_200ms]"></span>
            <span className="w-1 bg-indigo-500 rounded-t-sm animate-[bounce_1s_infinite_400ms]"></span>
          </div>
        )}
      </div>

      <div className="text-slate-200 font-medium text-sm truncate mb-4">
        {currentTrack.name}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        
        <button 
          onClick={nextTrack}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <FastForward className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        src={currentTrack.src}
        loop
        onEnded={nextTrack}
      />
    </div>
  );
}
