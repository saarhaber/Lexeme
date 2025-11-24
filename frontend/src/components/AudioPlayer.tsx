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
          className="text-white hover:opacity-80 transition-opacity"
          title="Play pronunciation"
          aria-label="Play pronunciation"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="text-white hover:opacity-80 transition-opacity"
          title="Stop"
          aria-label="Stop"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default AudioPlayer;

