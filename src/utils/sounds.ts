// Sound effects utility for game events using Web Audio API
let soundEnabled = true;
let audioContext: AudioContext | null = null;

// Initialize audio context lazily
const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

const playGameEndSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = now + i * 0.1;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (err) {
    console.warn("Failed to play game end sound:", err);
  }
};

// Generate a tax payment sound effect (coin/cash register sound)
const playTaxPaymentSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Create oscillator for the "cha-ching" sound
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Two-tone sound for cash register effect
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.setValueAtTime(1200, now + 0.05);

        // Envelope for volume
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

        oscillator.start(now);
        oscillator.stop(now + 0.15);
    } catch (err) {
        console.warn('Failed to play sound:', err);
    }
};

const playPurchaseSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        // 긍정적인 코인 사운드 - 상승음
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'triangle';
            const start = now + i * 0.08;
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
            osc.start(start);
            osc.stop(start + 0.15);
        });
    } catch (err) {
        console.warn('Failed to play purchase sound:', err);
    }
};

const playTakeoverSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        // 극적인 인수 사운드
        [146.83, 196.00, 246.94].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sawtooth';
            const start = now + i * 0.15;
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
            osc.start(start);
            osc.stop(start + 0.25);
        });
    } catch (err) {
        console.warn('Failed to play takeover sound:', err);
    }
};

const playWorldCupSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        // 경기장 환호성 느낌
        [440, 554.37, 659.25, 880].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'square';
            const start = now + i * 0.06;
            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
            osc.start(start);
            osc.stop(start + 0.2);
        });
    } catch (err) {
        console.warn('Failed to play worldcup sound:', err);
    }
};

const playWarSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        // 전쟁 드럼 사운드
        [110, 110, 130.81].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sawtooth';
            const start = now + i * 0.2;
            const duration = i === 2 ? 0.2 : 0.15;
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
            osc.start(start);
            osc.stop(start + duration);
        });
    } catch (err) {
        console.warn('Failed to play war sound:', err);
    }
};

const playSpaceTravelSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        // 로켓 발사 사운드 (상승음)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } catch (err) {
        console.warn('Failed to play space travel sound:', err);
    }
};

const playClickSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    } catch (err) {
        // ignore
    }
};

const playHoverSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05); // Short tick

        osc.start(now);
        osc.stop(now + 0.05);
    } catch (err) {
        // ignore
    }
};

const playStepSound = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Short, low-pitched "thud" or "bloop" for footsteps
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
    } catch (err) {
        // ignore
    }
};

const SOUNDS = {
    taxPayment: playTaxPaymentSound,
    purchase: playPurchaseSound,
    takeover: playTakeoverSound,
    worldcup: playWorldCupSound,
    war: playWarSound,
    spaceTravel: playSpaceTravelSound,
    click: playClickSound,
    hover: playHoverSound,
    step: playStepSound,
    gameEnd: playGameEndSound,
};

export const playSound = (soundName: keyof typeof SOUNDS) => {
    if (!soundEnabled) return;

    const soundFn = SOUNDS[soundName];
    if (!soundFn) return;

    try {
        soundFn();
    } catch (err) {
        console.warn('Failed to play sound:', err);
    }
};

export const toggleSound = (enabled: boolean) => {
    soundEnabled = enabled;
};

export const isSoundEnabled = () => soundEnabled;
