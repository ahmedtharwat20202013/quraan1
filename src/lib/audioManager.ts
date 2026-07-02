import { Howl, Howler } from 'howler';

class AudioManager {
  private static instance: AudioManager;
  private currentHowl: Howl | null = null;
  private sounds: Record<string, Howl> = {};

  private soundConfigs = {
    whoosh: '/sound/dragon-studio-simple-whoosh-382724.mp3',
    ding: '/sound/freesound_community-ding-101492.mp3',
    beep: '/sound/u_edtmwfwu7c-beep-329314.mp3',
    pop: '/sound/dragon-studio-pop-402324.mp3',
    win: '/sound/game-win.wav',
    lose: '/sound/game-lose.wav',
  };

  private constructor() {
    this.preload();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private preload() {
    Object.entries(this.soundConfigs).forEach(([key, url]) => {
      this.sounds[key] = new Howl({
        src: [url],
        preload: true,
      });
    });
  }

  public play(soundName: keyof typeof this.soundConfigs): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      const sound = this.sounds[soundName];
      if (sound) {
        this.currentHowl = sound;
        sound.once('end', () => resolve());
        sound.play();
      } else {
        resolve();
      }
    });
  }

  public stop() {
    if (this.currentHowl) {
      this.currentHowl.stop();
      this.currentHowl = null;
    }
  }

  // Helper method to explicitly unlock audio context on first interaction if needed
  public unlock() {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
  }
}

export const audioManager = AudioManager.getInstance();
