# Little Teacher

A cozy pretend-play classroom for a 5-year-old who loves playing teacher. You can play it on an iPad or a phone, and it doesn't need any reading.

Five original pixel-art students come to class:

- 🐰 a **sleepy bunny** who dozes off until you tap her
- 🐶 a **wiggly puppy** who wanders away from his seat
- 🐢 a **shy turtle** who hides in her shell until you coax her out
- 🦉 an **eager owl** who keeps raising a wing
- 🐸 a **giggly frog**

Louise is the teacher. She stands at the front, waves, claps and points at the board, and she twirls when you tap her. You can drag her anywhere in the room.

## English / Spanish (DLI)
The 🇺🇸/🇲🇽 flag button switches between **English time** and **Spanish time**. Every student line changes language: greetings, "Here!"/"¡Presente!", cheers, colours, stamp names, letters, numbers, words and shapes. The students use the iPad's built-in Spanish voice when it's Spanish time.

## Learning corners
- **Alphabet board** (chalkboard on the wall): pick A–Z (including Ñ) or 0–10. Trace the big letter and each block lights up in rainbow colours. When it's done, everyone cheers and a student says the word ("A is for apple!" / "¡A de arcoíris!") with a picture. Numbers get counted out loud with stars. Letters she has traced get a green dot.
- **Shape corner** (the little table): drag shapes into the matching holes of the wooden sorter: circle, square, triangle, rectangle, star, heart, oval and diamond. Each shape's name is said in the current language. A wrong hole just wiggles back; there's no failing. Every round you finish brings new shapes.

## A day in class
1. **Get the room ready:** before class the room is empty and the decorate tray is open:
   - 🛋 **floor things:** beanbag, teddy, toy box, easel, fish tank, globe, flowers, balloons, lamp
   - 🖼 **wall things:** rainbow, poster, picture frame, butterflies, star garland, sun, moon
   - 🍎 **desk supplies:** drop one on each desk (apple, pencils, books, crayons, cactus, snow globe)
   - 🎨 **paint:** wall colours, floor colours, and a new rug pattern

   Drag things from the tray, or tap one to drop it in. Tap anything you've placed to change its colour, and drag it back into the tray to put it away. Ring the 🔔 when the room is ready. The decorate tray (paint roller button) is also open during class.
2. **Morning bell:** the students walk in one by one and say good morning. If you changed the room, they gasp "Ooh, so pretty!" and clap.
3. **Attendance:** tap each student and they say "Here!". Their face lights up on the chart at the top.
4. **Move things around:** drag desks, the rug, the plant and the bookshelf. Drag a student onto another desk to swap seats. Everything is saved.
5. **Lesson:** tap the whiteboard to zoom in. It has 6 fat markers, stamps (star, heart, apple, sun, 1–5, A B C), an eraser and a squeegee that wipes the board clean. The students watch, raise their paws, clap, and say the stamp names and colours out loud. Tap a raised paw to make that student cheer.
6. **Gold stars:** drag a star from the jar onto a student and they glow and wiggle.
7. **Free time** (toy-box button): recess with a ball, snack time, or a picture-book story on the rug.
8. **Goodbye** (house button): the students wave and leave, the sun sets, and you earn a sticker for the sticker book.

There are no fail states, timers, scores, ads, accounts or network features. Progress is saved in `localStorage`. All art is drawn in code and all sounds are made with WebAudio. The students' words use the device's built-in speech voice.

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
| `js/students.js` | student poses, actions, personality traits |
| `js/decor.js` | decorations, desk supplies, paint colours, and the teacher (Louise) |
| `js/i18n.js` | English/Spanish phrases, letter names, words, shape names, font |
| `js/letters.js` | alphabet & numbers tracing board |
| `js/shapes.js` | shape sorter |
| `js/pictures.js` | word pictures for the alphabet |
| `js/row.js` | the row of watching students used by the learning corners |
| `js/sprites.js` | all pixel art (students, furniture, icons, stamps, stickers) |
| `js/raster.js` | tiny no-anti-aliasing pixel rasterizer |
| `js/audio.js` | synthesized sound effects and speech |
| `tools/` | Playwright screenshot walkthrough and icon generator |
