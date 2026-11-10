# Little Teacher

A cozy pretend-play classroom for a 5-year-old who loves playing teacher. You can play it on an iPad or a phone, and it doesn't need any reading.

Eight original pixel-art students come to class:

- 🐰 a **sleepy bunny** who dozes off until you tap her
- 🐶 a **wiggly puppy** who wanders away from his seat
- 🐢 a **shy turtle** who hides in her shell until you coax her out
- 🦉 an **eager owl** who keeps raising a wing
- 🐸 a **giggly frog**
- 🐱 a **curious cat** who purrs, naps and pounces
- 🐻 a **big gentle bear** who gives bear hugs and loves honey
- 🐭 a **tiny shy mouse** who ducks under his desk

The day follows a picture **Horario** down the left side, just like the schedule on her real classroom wall. A clothespin marks what's happening now; the big ▶ button goes to the next part of the day, and tapping any card jumps there.

Louise is the teacher. She stands at the front, waves, claps and points at the board. Tap her and she twirls, waves, or waves to the whole class (and they wave back). You can drag her anywhere in the room.

## Which version is on the iPad?
The version number (for example **v1.7**) is in the bottom-right corner of the start screen. See [CHANGELOG.md](CHANGELOG.md) for what's in each version. To release a new version, bump `VERSION` in `js/version.js`.

**Getting the newest version on the iPad:** just open the app while online; it loads the newest version automatically. To be sure, press and hold the ⟳ refresh button next to the version number on the start screen for a second and a half (a ring fills up). It glows when a newer version is available. It does nothing when the iPad is offline, so it can't break the game on a plane. Refreshing never erases her classroom, stickers or drawings.

**Music:** the ♪ button in the top-right corner of the start screen turns the background music on or off.

## Help for little ones
- Every button says its name out loud, in the owl's voice.
- If she pauses, a **pointing hand** shows what to try next and the owl says a short hint ("Toca a cada amigo para pasar lista", "Toca la campana para empezar", "Empieza en el punto verde"…). Now and then, instead of the hand, the nearest friend turns, raises a paw toward the spot and hops (a little twinkle marks it), so hints feel less like nagging.
- The **?** button gives a hint any time, including during recess, centros, snack and story.
- Stars, cards and snacks can be **tapped then given**: tap the star, then tap a student (or drag, as before). The shape sorter and the centros chart work the same way: tap a shape or a face, then tap where it goes. Little fingers often lift mid-drag, so dragging is never the only way.
- Each part of the day only shows its own buttons. When it's done, ▶ glows.
- The **Casa** card asks "¿Ya nos vamos a casa?" first; tap it again to end the day.

## ¡Todo en español!
The whole class is in Spanish, like her DLI classroom: greetings, "¡Presente!", cheers, colours, letters, numbers, words and shapes.

Each student has their own **ElevenLabs** voice. The clips are recorded ahead of time and saved in `audio/`, so the game still works offline:

| student | voice |
|---|---|
| 🐰 bunny | Lulu, adorable and bright |
| 🐶 puppy | Leo, curious |
| 🐢 turtle | Thorthugo, a playful turtle character |
| 🦉 owl | Kate, a playful storyteller |
| 🐸 frog | Blackie, cute and cheerful |
| 🐱 cat | Fruna, playful and mischievous (eleven_v4) |
| 🐻 bear | Charlee, playful (eleven_v4) |
| 🐭 mouse | Betty, quirky and cartoonish (eleven_v4) |
| 👵 Lector Misterioso | Grandma Aurora, warm (eleven_v4) |

The owl's narrator lines use the newer `eleven_v4` model too; the other voices use `eleven_multilingual_v2` (set per voice in `tools/voices.mjs`).

To regenerate the clips after changing any lines: `ELEVENLABS_API_KEY=... node tools/voices.mjs` (Node 22+). The script only makes clips that don't exist yet; `--dry` shows how many characters it would send, `--only=cat,bear` limits it to some voices and `--redo=owl` remakes a voice. If a clip is missing, the game falls back to the iPad's built-in Spanish voice.

## Hidden learning in class
- **💬 Students ask questions:** tap a student with a raised paw and they might say "Maestra, tengo una pregunta…". She answers by tapping one of three pictures. Questions cover colours ("¿De qué color es el sol?"), shapes, counting stars, animals, letters, and big/small. A wrong answer just gets "Mmm… creo que no." and the right one glows. A right answer echoes the content: the friend says the word, then "¡Eso es!", then the word once more as the card bounces again (about 3 s in all).
- **💛 Feelings (emociones):** now and then a student feels triste, enojado/a, asustado/a or cansado/a. Their face shows it, with a little bubble. Tap them to help in two steps: "¿Cómo me siento?" (pick the matching face), then "¿Qué me ayuda?" (un abrazo, un juguete, agua, descansar, respirar profundo). The student says "¡Gracias, maestra! Ya me siento mejor."

## Tarjetas verdes y rojas (behavior cards)
Everyone starts the day on green ("¡Todos empiezan en verde!"). Now and then a student acts up:
- the frog has a giggle fit ("¡Jajaja!")
- the owl shouts out "¡Yo sé! ¡Yo sé!"
- the bunny chats ("¡Oye, oye!")
- the puppy wanders off

The **star** and the **green card** sit together in the bottom-right corner. The **red card** sits apart, a gap to their left, a bit smaller and on a quieter frame, so it isn't hit by accident. It needs a short, deliberate press: hold it for about half a second (a red ring fills up) and it comes off its button. Then drag it onto a student, or let go and tap the student. A quick tap only says its name. The student stops, looks sorry and says "Lo siento, maestra.". When a friend acts up, the hint hand shows the hold too: it presses the red card until the ring fills, then carries it over. The **green card** makes a student proud: "¡Gracias, maestra!". Each student's card shows on their desk and on the attendance chart. At goodbye: "¡Mañana es un nuevo día!", and everyone goes back to green.

## Centros
The **Centros de Aprendizaje** card opens the **centros chart**. Move the students' faces between **arte** 🎨, **biblioteca** 📚, **letras** 🔤 and **bloques** 🧱: tap a face (it glows and bobs, and the friend says hi or their centro), then tap a column; or drag the face across. Then ring the 🔔. The students walk to their stations and paint at the easel, read on the rug, write at the ABC board, or build at the shape table. The bell rotates everyone to the next centro ("¡Cambio de centro!"), and ✔ ends centros. While they work, each centro waits for the teacher: a friend raises a paw with a **?** and the sign glows. Tap a centro and the teacher walks over and gets a question (colours at arte, animals or big/small at biblioteca, letters at letras, shapes or counting at bloques). Each answer leaves something behind (a painting, an open book, letters, a taller tower) and a gold star. When all four are done the class cheers and the bell glows for the next round.

## Learning corners
- **Alphabet board** (chalkboard on the wall): pick A–Z (including Ñ) or 0–10 and trace it the way it's taught in school, stroke by stroke (if she lifts her finger halfway and waits, the spot to carry on pulses and a friend says "¡Muy bien!"; tap a number's stars and a friend counts them):
  - a green **start dot** shows the stroke number, and arrows show which way to go
  - a little ⭐ **demonstrates** each stroke when she pauses
  - her finger lays down a **rainbow crayon** that follows the letter's path, with crayon sounds and rising notes
  - if she lifts her finger, she can carry on where she stopped
  - when she's done, there's confetti and cheering, and a student says the word with its picture ("¡A de arcoíris!")
  - numbers get counted out loud with stars ("uno, dos, tres")
  - traced letters get a green dot, and ↻ lets her trace the same letter again
- **Sílabas** (the "ma" tab on the alphabet board):
  - **families:** pick m, p, s, l, t, n or d to see **ma me mi mo mu** as blocks. Tap one to hear it, or press ▶ to sing the whole family.
  - **word builder:** see a picture (pato, gato, rana, luna, casa, oso, nube, pelota, tomate, mariposa…) and tap the syllables in order to build the word. The owl then reads it: "pa… to… ¡pato!"
- **Shape corner** (the little table): tap a shape (it glows, bobs and says its name), then tap its hole in the wooden sorter: circle, square, triangle, rectangle, star, heart, oval and diamond. A wrong hole gives a gentle wiggle and the shape stays picked, so she can try another; there's no failing. Tapping anywhere else puts it back. Dragging works too, and is forgiving: a shape dropped anywhere near its own hole drops in, even if another hole is closer. After 8 s a hand shows the way. Every round you finish brings new shapes.

## A day in class
▶ Play starts the day at **Trabajo de la mañana**: the bell rings and the class walks in.

1. **Decorar (optional, any time):** the pink card above the Horario opens the decorate tray while the class watches; ▶ then goes back to the part of the day she was in. It has five picture tabs (the owl says each name):
   - 🪄 **Temas:** one tap decorates the whole room: walls, floor, rug and a matching set of things that pop in one by one. Océano, Espacio, Jardín, Arcoíris, Otoño, Fiesta, Invierno and Cuentos. Everything stays editable afterwards.
   - 🖼 **Pared (wall things):** an art wall with her whiteboard drawings, string lights that glow, paper lanterns, rainbow, garlands, butterflies, poster, frame, word wall, cork board, sun, moon, planet, paper fish, window plants, snowflakes, autumn leaves, clock
   - 🛋 **Piso (floor things):** reading tent, class hamster (it runs on its wheel), beanbag, teddy, toy box, easel, fish tank, cubbies, globe, flowers, balloons, lamp, pumpkin, snowman, plus any surprise that arrived in a parcel
   - 🍎 **Escritorios:** desk supplies; the empty desks twinkle (apple, pencils, books, crayons, cactus, snow globe)
   - 🎨 **Colores:** wall colours, floor colours and rugs

   Drag things into the room, or tap one and it finds a nice free spot. While she drags a thing in, and right after she places something (or picks a theme), the tray **tucks down** to a slim strip with just its tabs, so the class and her decorations stay in view. Tap the yellow **▲** handle, the strip or any tab to bring it back up. Wall things snap to the wall and floor things to the floor, with a puff and their name. Swipe the tray sideways (or tap the yellow arrows) to see more. **Tap anything you've placed** to select it: three big bubbles appear: 🎨 another colour, ↔ size (small, medium, big, then it turns around) and 🗑 throw it away. Tap somewhere else to let go. Dragging something to the 🗑️ trash can still works, and desk supplies can be moved to another desk. The blue **↶** button undoes, step by step. Press ▶ when the room is ready.
2. **Trabajo de la mañana:** the bell rings and the friends walk in one by one and say good morning (tap anywhere to hurry them). If you changed the room, they gasp and clap. Letters she traced yesterday pop onto the alphabet line under the whiteboard. Choice cards: **Pizarra** (whiteboard: 6 markers, stamps, eraser; number stamps make the class count together) and **Números**.
3. **Calendario:** the big day card ("¡Hoy es lunes!"), **¿Qué tiempo hace hoy?** (sun, clouds, rain or snow; the window, the calendar and recess follow it all day), then attendance: tap each friend's big face. Choice cards: **Ayudantes** (jobs: líder de la fila, luces, calendario, plantas; they rotate daily) and **Emociones** (a friend shares a feeling).
4. **Alfabeto:** letter tracing.
5. **Recreo (el patio):** the class lines up and walks out of the door. Outside there's a slide, two swings, a sandbox, a seesaw, an apple tree, a ball and a chalk hopscotch with the numbers 1–8. The friends play on their own; tap equipment and a friend runs over, tap a friend on the swing to push them higher, drag a friend onto anything, flick the ball, shake the tree for apples. Rainy days have puddles and umbrellas, snowy days a snowman to build. The big whistle calls everyone back in.
6. **Lectura con Maestra:** pick one of three picture books; the owl reads each page and a friend repeats the key word.
7. **Heggerty:** sílabas (families and the word builder).
8. **S.L.A:** the shape sorter and the whiteboard.
9. **Centros de Aprendizaje:** the centros chart (above).
10. **Almuerzo:** hand out the food (drag, or tap then tap a friend); the owl counts how many have eaten.
11. **Lector Misterioso:** knock knock! A friend's grandma comes in and reads a story in her own voice.
12. **Casa:** the line leader goes first, an all-green day ends with a dance (a bigger one on viernes), the sun sets, and you earn a sticker for the sticker book (on the start and night screens).

All day: tap friends (keep tapping for their own trick), give gold stars (every 5th earns a crown) and green/red cards, answer raised paws, drag desks and friends around, and answer the door when someone knocks (a late friend, a parcel with a new decoration, or a ball for the puppy).

There are no fail states, timers, scores, ads, accounts or network features. Progress is saved in `localStorage`. All art is drawn in code and all sounds are made with WebAudio. The voices are pre-recorded ElevenLabs clips (see above).

## Running it
It's a static site with no build step:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Add `?fast` to the URL to run the game at 4× speed while testing.

**GitHub Pages:** go to Settings → Pages → *Deploy from a branch*, then pick the branch and `/ (root)`.

## Put it on an iPad home screen
1. Open the GitHub Pages URL in **Safari** on the iPad.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open it once from the home-screen icon while you're online. After that it works offline, full screen, with no browser bars.

Tip: turn on **Guided Access** (Settings → Accessibility → Guided Access) and triple-click to lock the iPad to the app.

## Code map
| file | what |
|---|---|
| `js/main.js` | canvas, integer pixel scaling, input, scene transitions |
| `js/classroom.js` | the room, furniture, daily loop, free time, HUD, sticker book |
| `js/board.js` | full-screen whiteboard |
| `js/rituals.js` | weather at circle time and the Ayudantes jobs chart |
| `js/schedule.js` | the day as a picture schedule ("Horario"): cards, clothespin, ▶ siguiente, block flow |
| `js/pages.js` | story books |
| `js/quiz.js` | students' questions and feelings check-ins |
| `js/students.js` | student poses, actions, personality traits |
| `js/decor.js` | decorations, desk supplies, paint colours, and the teacher (Louise) |
| `js/decorate.js` | the Decorar tray: picture tabs, room themes, select-to-edit bubbles, undo, placement |
| `js/i18n.js` | Spanish phrases, letter names, words, shape names, `wordSprite` (school font) |
| `js/schoolfont.js` | the round ball-and-stick "school" letters: stroke glyphs (a-z, ñ, accents, A-Z, 0-9, ¡¿!?), spacing, round-pen rendering |
| `js/hires.js` | paints smooth letters at full device resolution on top of the pixel views (keeps draw order) |
| `js/strokes.js` | tracing strokes for every letter and number, taken from the school font |
| `audio/` | ElevenLabs voice clips (one folder per student) + `clips.json` |
| `js/letters.js` | alphabet & numbers tracing board |
| `js/shapes.js` | shape sorter |
| `js/playground.js` | the outdoor playground for recess (weather-aware) |
| `js/pictures.js` | word pictures for the alphabet |
| `js/row.js` | the row of watching students used by the learning corners |
| `js/sprites.js` | all pixel art (students, furniture, icons, stamps, stickers) |
| `js/raster.js` | tiny no-anti-aliasing pixel rasterizer |
| `js/ui.js` | chunky pressable buttons (outline, lip, press-down) and passive panels, shared by every scene |
| `js/audio.js` | synthesized sound effects and speech |
| `tools/` | Playwright screenshot walkthrough and icon generator |
