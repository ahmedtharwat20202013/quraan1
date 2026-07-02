import { useState, useEffect } from 'react';
import { AudioPlayerService, AudioPlayerState } from '../services/audio';
import { APISurah } from '../types';

export function useAudioPlayer() {
  const [playerState, setPlayerState] = useState<AudioPlayerState>(() => AudioPlayerService.getState());

  useEffect(() => {
    const unsubscribe = AudioPlayerService.subscribe((state) => {
      setPlayerState(state);
    });
    return unsubscribe;
  }, []);

  return {
    ...playerState,
    playSurah: (surah: APISurah | number, serverUrl: string, reciterName: string, moshafName: string) => 
      AudioPlayerService.playSurah(surah, serverUrl, reciterName, moshafName),
    togglePlay: () => AudioPlayerService.togglePlay(),
    pause: () => AudioPlayerService.pause(),
    play: () => AudioPlayerService.play(),
    stop: () => AudioPlayerService.stop(),
    seek: (seconds: number) => AudioPlayerService.seek(seconds),
    setSpeed: (rate: number) => AudioPlayerService.setSpeed(rate),
    setSuwarList: (suwar: APISurah[]) => AudioPlayerService.setSuwarList(suwar),
  };
}
