# Bellacopia Maleficia Proof of Concept

## TODO

- [x] Outer app and launch commands. Load JS, CSS, etc.
- [x] Isolate browser facilities.
- - [x] Video
- - [x] Input
- - [x] No need for audio
- - [x] Data loader
- [x] Outer world play
- xxx Maps from data file - doesn't matter
- [x] Stats: hp, maxhp, gold
- [x] Trigger encounters
- [x] Encounter start splash
- [x] Encounter end splash
- [x] Joystick input. It's really just not the same on a keyboard.
- [ ] Minigames
- - [x] Flapping
- - [x] Stirring
- - [x] Jumprope
- - [x] Parachute
- - [x] Umbrella
- - [ ] Swearing
- - [ ] Dodging
- - [ ] Balancing
- - [ ] Rollerskates
- - [ ] Traffic
- - [ ] Levitation
- [x] Pick game+difficulty manually

## Observations

- Don't use millisecond update times.
- - If we want continuous timing, use floats. I'm diving by 1000 all over the place.
- - More likely: If we want a fully deterministic game, use discrete time. (ie "update" with no elapsed time).
- 512x288 graphics are laborious to draw, even the scratch graphics that I'm making. Can we cut the resolution in half?
- Don't use full-screen Overture and Denouement; overlay them on the last frame of world or minigame.
- - Because it's jarring to have the minigame disappear completely when it ends.
- I hadn't thought much about the outer world. Now that I see it: We definitely need lots of interaction here.
- - NPCs with dialogue.
- - Use item on environment.
- - Buttons to push, etc.
- - We might still get away with no moving elements in the outer world but I'm not sure.
