# Odyssey sound pack

Prepared 2026-11-14. Files are bundled, content-hashed MP3s; the running game never requests an external sound service. Source recordings are CC0 1.0 (public domain dedication), verified on each OpenGameArt source page. Credits are retained here even though attribution is not required.

| Recording | Author / source | Used in |
| --- | --- | --- |
| `cat_mewfood.wav`, `cat_purrsleepy_loop.wav` | [Kerzoven — Cat Purr & Meow](https://opengameart.org/content/cat-purr-meow) | `cat-call.mp3`, `cat-purr.mp3` |
| `wave_01_cc0-18363__jasinski__alkaibeach.flac` | [jasinski, excerpts by qubodup — Beach Ocean Waves](https://opengameart.org/content/beach-ocean-waves); [original recording](https://freesound.org/people/jasinski/sounds/18363/) | storm, rescue, shore |
| `Dark_Rainy_Night(ambience).ogg` | [kindland — rain and thunders](https://opengameart.org/content/rain-and-thunders) | storm, rescue |
| `short wind sound.wav` | [remaxim — Short wind sound](https://opengameart.org/content/short-wind-sound) | storm, rescue, memory, shore |

[CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/) · [Legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

`memory.mp3` adds an original synthesized D/A/C/E harmonic bed to the wind. `glyph-break.mp3` is an original short noise/tonal fissure accent. Neither is represented as an acoustic recording. The cat call and purr are actual recorded cat sounds.

Original opening-pack processing: high/low-pass filtering, short excerpts, crossfaded periodic 16-second ambience buffers, level matching, brief one-shot fades, 44.1 kHz stereo, 96 kb/s MP3. Original source files are not modified. That seven-file pack totaled approximately 828 KB; the expanded v0.1.2 pack is described below. The mixer adds a master volume ramp and compressor; individual soundscapes crossfade and are stopped on pause, hidden tab, skip or departure. Sound failure does not prevent visual progression.

To reproduce, download the original files listed in `sources.json` to a local directory with the specified local names, then run `python3 scripts/build-prologue-audio.py DIRECTORY` with NumPy and FFmpeg available. Normal `npm run build` uses the committed MP3s and needs no Python audio toolchain or downloads. `sources.json` records original SHA-256 hashes and URLs.

For v0.1, `camp`, `forest`, `hall` and `night` add quiet scene-specific 16-second beds. Forest reuses the credited CC0 wind; camp combines it with an original synthesized crackle, and hall/night add the original harmonic texture. All eleven files total approximately 1.60 MB. No external audio requests are made during play.


## v0.1.2 — embodied actions and musical cues

52 bundled MP3 files (about 4.8 MB). New sources are **CC0**, verified on the linked individual asset pages on 2026-11-14. `gameplay-sources.json` contains exact download URLs and original archive/recording hashes. Only processed game-sized excerpts are committed; no runtime network dependency.

| Source | Author | Use |
| --- | --- | --- |
| [Sand & stone footsteps](https://opengameart.org/content/fantozzis-footsteps-grasssand-stone) | Fantozzi / qubodup | Six sand and six stone variations, genuine left/right footfalls |
| [Wood floor steps](https://opengameart.org/content/steps-in-wood-floor) | mikeask | Four isolated footfalls; short wood texture |
| [202 More Sound Effects](https://opengameart.org/content/202-more-sound-effects) | OwlishMedia | Cloth, drinking, sitting, picking up, placing and paper handling |
| [Liquid Bottle Drink Set](https://opengameart.org/content/liquid-bottle-drink-set) | qubodup | Liquid movement while lifting the vessel |
| [Forest bird sounds](https://opengameart.org/content/forest-bird-sounds) | pauliuw | Three filtered/denoised intermittent bird calls |
| [Crickets Ambient Noise](https://opengameart.org/content/crickets-ambient-noise-loopable) | Wolfgang_ / Ted Kerr | Night camp insects |
| [Fireplace Sound Loop](https://opengameart.org/content/fireplace-sound-loop) | PagDev | Recorded hearth fire, replacing the synthesized fire bed |

`theme-title`, `theme-memory`, `theme-resolve` share an original four-note motif in three arrangements, generated from sine harmonics, envelopes and stereo echoes. These are original synthesized compositions, not recordings of traditional instruments. Selection/answer/learning/milestone cues use the same musical vocabulary. There is no character speech or synthetic imitation of a real person's voice.

`camp`, `forest`, `night`, `shore`, `yard` are now 48-second beds. Wind, wave, fire and insect recordings use different loop periods and slowly changing gain. Yard has its own distant surf; path/yard birds and camp/hall wood sounds occur at nonuniform intervals with restrained stereo placement. Music plays on the title after audio activation, during memories, and once at chapter completion; ordinary exploration leaves room for ambience and foley.

Footsteps follow the displayed walk contact frames 0/2 and use the painted ground (sand on shore, stone in yard/night, wood on porch/hall/bridge), with nonrepeating variations and small pitch changes. Drinking sounds follow the vessel lift, mouth contact and lowering frames. Stop, menus, scene departure, mute and hidden pages cancel pending sounds; late footstep decoding is discarded instead of played in a burst. Feedback is based on actual new game-state events, never a saved reward replayed on load/import. Cat purr is reserved for the driftwood encounter; requests for help can prompt a cat call.

Rebuild: download `gameplay-sources.json` files; extract archives as described in `scripts/build-gameplay-audio.py`; copy the original credited `wind.wav` and `waves.flac` from the opening pack into the same source directory; run `python3 scripts/build-gameplay-audio.py SOURCE_DIR` (NumPy and FFmpeg). The script verifies source archive hashes and writes processed MP3s plus signal measurements. Settings expose master, action/feedback, environment and music levels independently. `AUDIO-CREDITS.md` is shipped with release archives; brief attribution is also available in audio settings.
