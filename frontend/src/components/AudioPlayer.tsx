import React, { useState } from 'react';

interface AudioPlayerProps {
  text: string;
  language: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ text, language }) => {
  const [playing, setPlaying] = useState<boolean>(false);

  const handlePlay = () => {
    // Use browser's Web Speech API for TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.onstart = () => setPlaying(true);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech not supported in this browser');
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  return (
    <div className="flex items-center gap-2">
      {!playing ? (
        <button
          onClick={handlePlay}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          title="Play pronunciation"
        >
          🔊
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          title="Stop"
        >
          ⏹️
        </button>
      )}
    </div>
  );
};

export default AudioPlayer;

