# Odyssey opening sound pack

Prepared 2026-11-14. Files are bundled, content-hashed MP3s; the running game never requests an external sound service. Source recordings are CC0 1.0 (public domain dedication), verified on each OpenGameArt source page. Credits are retained here even though attribution is not required.

| Recording | Author / source | Used in |
| --- | --- | --- |
| `cat_mewfood.wav`, `cat_purrsleepy_loop.wav` | [Kerzoven — Cat Purr & Meow](https://opengameart.org/content/cat-purr-meow) | `cat-call.mp3`, `cat-purr.mp3` |
| `wave_01_cc0-18363__jasinski__alkaibeach.flac` | [jasinski, excerpts by qubodup — Beach Ocean Waves](https://opengameart.org/content/beach-ocean-waves); [original recording](https://freesound.org/people/jasinski/sounds/18363/) | storm, rescue, shore |
| `Dark_Rainy_Night(ambience).ogg` | [kindland — rain and thunders](https://opengameart.org/content/rain-and-thunders) | storm, rescue |
| `short wind sound.wav` | [remaxim — Short wind sound](https://opengameart.org/content/short-wind-sound) | storm, rescue, memory, shore |

[CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/) · [Legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

`memory.mp3` adds an original synthesized D/A/C/E harmonic bed to the wind. `glyph-break.mp3` is an original short noise/tonal fissure accent. Neither is represented as an acoustic recording. The cat call and purr are actual recorded cat sounds.

Processing: high/low-pass filtering, short excerpts, crossfaded periodic 16-second ambience buffers, level matching, brief one-shot fades, 44.1 kHz stereo, 96 kb/s MP3. Original source files are not modified. The seven shipped files total approximately 828 KB. The mixer adds a master volume ramp and compressor; individual soundscapes crossfade and are stopped on pause, hidden tab, skip or departure. Sound failure does not prevent visual progression.

To reproduce, download the original files listed in `sources.json` to a local directory with the specified local names, then run `python3 scripts/build-prologue-audio.py DIRECTORY` with NumPy and FFmpeg available. Normal `npm run build` uses the committed MP3s and needs no Python audio toolchain or downloads. `sources.json` records original SHA-256 hashes and URLs.
