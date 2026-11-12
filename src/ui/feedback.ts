import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { getSetting } from '../data/db';
import { isNative } from '../native';

let soundOn = true;
void getSetting('sound', true).then((v) => (soundOn = v));
export const setSoundPref = (v: boolean) => (soundOn = v);

let ctx: AudioContext | undefined;
function tone(freqs: number[], dur = 0.09, gap = 0.07, vol = 0.06) {
  if (!soundOn) return;
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const s = t0 + i * gap;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(vol, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(s);
      o.stop(s + dur + 0.02);
    });
  } catch {
    /* audio is optional */
  }
}

async function haptic(kind: 'ok' | 'bad' | 'tap' | 'win') {
  try {
    if (!isNative) return;
    if (kind === 'ok') await Haptics.impact({ style: ImpactStyle.Light });
    else if (kind === 'bad') await Haptics.notification({ type: NotificationType.Error });
    else if (kind === 'win') await Haptics.notification({ type: NotificationType.Success });
    else await Haptics.selectionChanged();
  } catch {
    /* optional */
  }
}

export const fx = {
  correct: () => {
    tone([660, 880]);
    void haptic('ok');
  },
  wrong: () => {
    tone([220, 180], 0.14, 0.1, 0.05);
    void haptic('bad');
  },
  combo: () => tone([660, 880, 1100], 0.08, 0.06),
  win: () => {
    tone([523, 659, 784, 1047], 0.14, 0.11, 0.07);
    void haptic('win');
  },
  tap: () => void haptic('tap'),
};
