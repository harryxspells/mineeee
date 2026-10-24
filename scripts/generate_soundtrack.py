"""Generate the original, royalty-free birthday music-box loop used by the site."""
import math
import wave

import lameenc
import numpy as np

SR = 44100
BPM = 72
BEAT = 60.0 / BPM
BAR = BEAT * 4
BARS = 16
PRE_ROLL = 0.15
TAIL = 7.0
DURATION = PRE_ROLL + BARS * BAR + TAIL
N = int(DURATION * SR)
L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)


def midi_hz(note: float) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def pan_gains(pan: float) -> tuple[float, float]:
    angle = (pan + 1) * math.pi / 4
    return math.cos(angle), math.sin(angle)


def add_note(
    start: float,
    midi: float,
    duration: float,
    velocity: float,
    pan: float = 0.0,
    timbre: str = "bell",
) -> None:
    i0 = int(start * SR)
    i1 = min(N, int((start + duration) * SR))
    if i1 <= i0:
        return
    t = np.arange(i1 - i0) / SR
    freq = midi_hz(midi)
    if timbre == "bell":
        partials = [(1, 1.0, 1.0), (2.004, 0.22, 0.55), (3.01, 0.08, 0.32), (4.98, 0.025, 0.2)]
        attack, decay, release = 0.004, 1.45, 1.2
    elif timbre == "soft":
        partials = [(1, 0.8, 1.0), (2.001, 0.18, 0.7), (3.003, 0.05, 0.45), (4.01, 0.018, 0.3)]
        attack, decay, release = 0.012, 2.4, 2.2
    else:  # warm pad
        partials = [(1, 0.7, 1.0), (2.006, 0.12, 0.5), (3.002, 0.03, 0.25)]
        attack, decay, release = 0.75, 3.4, 2.4

    env = np.ones_like(t)
    attack_n = max(1, int(attack * SR))
    env[:attack_n] = np.linspace(0, 1, attack_n) ** 0.65
    release_n = max(1, min(int(release * SR), int(len(t) * 0.8)))
    env[-release_n:] *= np.linspace(1, 0, release_n) ** 1.5
    body = np.minimum(t / decay, 1)
    decay_env = np.exp(-3.0 * body)

    wave_data = np.zeros_like(t)
    for ratio, amp, tau_ratio in partials:
        wobble = 1 + 0.0015 * np.sin(2 * math.pi * (0.3 + ratio * 0.07) * t)
        wave_data += amp * np.sin(2 * math.pi * freq * ratio * t * wobble) * np.exp(
            -2.2 * body * tau_ratio
        )
    # A tiny amount of tape-style hiss gives the music box some air.
    wave_data += 0.0015 * np.random.default_rng(int(midi * 131 + start * 1000)).standard_normal(len(t)) * decay_env
    signal = wave_data * env * decay_env * velocity
    gl, gr = pan_gains(pan)
    L[i0:i1] += signal * gl
    R[i0:i1] += signal * gr


# chord midi notes, 2 bars each
chords = [
    [50, 57, 61, 64, 66],   # Dmaj9
    [47, 54, 57, 61, 62],   # Bm7 / C#
    [43, 50, 54, 57, 59],   # Gmaj9
    [45, 50, 52, 55, 59],   # A7sus4
    [42, 50, 54, 57, 61],   # F#m7(add b13 color)
    [47, 54, 57, 61],       # Bm7
    [40, 50, 52, 55, 57],   # Em9
    [45, 50, 52, 55, 59],   # A7sus4
]

# A sparse melody: (midi, beat inside bar, velocity)
melody = [
    [(78, 0, 0.34), (81, 1.5, 0.25), (76, 2.5, 0.27)],
    [(74, 0, 0.30), (76, 1.2, 0.22), (78, 2.2, 0.27), (81, 3.2, 0.18)],
    [(74, 0, 0.27), (78, 1.5, 0.26), (83, 2.5, 0.22), (81, 3.4, 0.16)],
    [(78, 0, 0.25), (76, 1.3, 0.20), (74, 2.3, 0.24), (71, 3.3, 0.18)],
    [(79, 0, 0.28), (78, 1.6, 0.22), (76, 2.5, 0.20), (74, 3.2, 0.16)],
    [(72, 0, 0.27), (76, 1.2, 0.24), (79, 2.2, 0.25), (78, 3.3, 0.17)],
    [(76, 0, 0.27), (74, 1.4, 0.20), (71, 2.4, 0.24), (69, 3.2, 0.17)],
    [(73, 0, 0.24), (76, 1.5, 0.24), (81, 2.7, 0.20)],
    [(78, 0, 0.27), (81, 1.4, 0.23), (80, 2.5, 0.22), (78, 3.4, 0.16)],
    [(76, 0, 0.24), (73, 1.2, 0.19), (68, 2.2, 0.22), (71, 3.2, 0.15)],
    [(74, 0, 0.26), (78, 1.5, 0.24), (83, 2.7, 0.22)],
    [(78, 0, 0.25), (76, 1.2, 0.19), (74, 2.2, 0.22), (71, 3.2, 0.16)],
    [(79, 0, 0.25), (83, 1.3, 0.23), (86, 2.4, 0.20)],
    [(81, 0, 0.23), (79, 1.4, 0.19), (76, 2.4, 0.22), (74, 3.3, 0.15)],
    [(76, 0, 0.24), (79, 1.5, 0.22), (81, 2.5, 0.20)],
    [(81, 0, 0.20), (79, 1.2, 0.16), (76, 2.2, 0.18), (74, 3.2, 0.12)],
]

for bar in range(BARS):
    bar_start = PRE_ROLL + bar * BAR
    chord = chords[(bar // 2) % len(chords)]
    next_chord = chords[((bar + 2) // 2) % len(chords)]
    # slow, breathing pad
    for j, note in enumerate(chord):
        add_note(bar_start, note + (12 if j > 2 else 0), BAR + 1.4, 0.05, pan=(-0.35 if j % 2 else 0.3), timbre="pad")
    # low soft root for warmth
    add_note(bar_start, chord[0] - 12, BAR * 1.25, 0.042, pan=0.0, timbre="pad")

    # unfold arpeggios quietly beneath the melody
    arp = [chord[0] + 12, chord[min(2, len(chord)-1)] + 12, chord[min(3, len(chord)-1)] + 12, chord[-1] + 12]
    for step in range(8):
        note = arp[step % len(arp)]
        add_note(
            bar_start + step * BEAT / 2,
            note,
            BEAT * 1.8,
            0.055 if step % 2 == 0 else 0.032,
            pan=0.55 if step % 2 else -0.55,
            timbre="soft",
        )

    for note, offset, vel in melody[bar]:
        add_note(
            bar_start + offset * BEAT,
            note,
            min(2.8, BAR * 0.9),
            vel,
            pan=0.08,
            timbre="bell",
        )

# A few high, delicate twinkles in the second half.
for bar in [4, 6, 10, 12, 14]:
    bar_start = PRE_ROLL + bar * BAR
    for offset, note, vel in [(0.4, 90, 0.07), (2.9, 93, 0.055)]:
        add_note(bar_start + offset * BEAT, note, 2.4, vel, pan=-0.25, timbre="bell")

# Simple lush echo/reverb from multiple tape-like taps.
def bloom(signal: np.ndarray, pan: float) -> tuple[np.ndarray, np.ndarray]:
    wet_l = np.zeros_like(signal)
    wet_r = np.zeros_like(signal)
    taps = [(0.093, 0.20, 9), (0.157, 0.16, 7), (0.241, 0.12, 6), (0.349, 0.08, 5)]
    for delay, gain, repeats in taps:
        d = int(delay * SR)
        for i in range(1, repeats + 1):
            offset = d * i
            if offset >= len(signal):
                break
            g = gain * (0.66 ** i)
            wet_l[offset:] += signal[:-offset] * g * (1 - 0.25 * (i / repeats))
            wet_r[offset:] += signal[:-offset] * g * (0.65 + 0.35 * (i / repeats))
    # spread wet signal a little
    return wet_l * (0.6 if pan < 0 else 0.8), wet_r * (0.8 if pan < 0 else 0.6)


rl, rr = bloom(L, 0.0)
L = L * 0.72 + rl * 0.55
R = R * 0.72 + rr * 0.55

# Subtle analog drift + fade-in/out to hide the loop seam.
t = np.arange(N) / SR
L *= 1 + 0.002 * np.sin(2 * math.pi * 0.12 * t)
R *= 1 + 0.002 * np.sin(2 * math.pi * 0.11 * t + 1.1)
fade_in = int(2.4 * SR)
fade_out = int(5.0 * SR)
L[:fade_in] *= np.linspace(0, 1, fade_in) ** 1.2
R[:fade_in] *= np.linspace(0, 1, fade_in) ** 1.2
L[-fade_out:] *= np.linspace(1, 0, fade_out) ** 1.5
R[-fade_out:] *= np.linspace(1, 0, fade_out) ** 1.5

# gentle limiting and normalise to a comfortable level
peak = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-9)
L = np.tanh((L / peak) * 1.2) * 0.82
R = np.tanh((R / peak) * 1.2) * 0.82

# release the room after the last bar by extending the rendered buffer
stereo = np.empty(N * 2, dtype=np.int16)
stereo[0::2] = np.clip(L * 32767, -32768, 32767).astype(np.int16)
stereo[1::2] = np.clip(R * 32767, -32768, 32767).astype(np.int16)
pcm = stereo.tobytes()
encoder = lameenc.Encoder()
encoder.set_bit_rate(112)
encoder.set_in_sample_rate(SR)
encoder.set_channels(2)
encoder.set_quality(2)
mp3 = encoder.encode(pcm)
mp3 += encoder.flush()
with open("public/audio/a-little-birthday-melody.mp3", "wb") as f:
    f.write(mp3)
print(
    f"Wrote public/audio/a-little-birthday-melody.mp3 "
    f"({len(mp3)/1024:.0f} KB, {DURATION:.1f}s)"
)
