# Little Teacher

A cozy pretend-play classroom for a 5-year-old who loves playing teacher. You can play it on an iPad or a phone, and it doesn't need any reading.

Five original pixel-art students come to class:

- 🐰 a **sleepy bunny** who dozes off until you tap her
- 🐶 a **wiggly puppy** who wanders away from his seat
- 🐢 a **shy turtle** who hides in her shell until you coax her out
- 🦉 an **eager owl** who keeps raising a wing
- 🐸 a **giggly frog**

## A day in class
1. **Morning bell:** the students walk in one by one and say good morning.
2. **Attendance:** tap each student and they say "Here!". Their face lights up on the chart at the top.
3. **Set up the room:** drag desks, the rug, the plant and the bookshelf. Drag a student onto another desk to swap seats. Everything is saved.
4. **Lesson:** tap the whiteboard to zoom in. It has 6 fat markers, stamps (star, heart, apple, sun, 1–5, A B C), an eraser and a squeegee that wipes the board clean. The students watch, raise their paws, clap, and say the stamp names and colours out loud. Tap a raised paw to make that student cheer.
5. **Gold stars:** drag a star from the jar onto a student and they glow and wiggle.
6. **Free time** (toy-box button): recess with a ball, snack time, or a picture-book story on the rug.
7. **Goodbye** (house button): the students wave and leave, the sun sets, and you earn a sticker for the sticker book.

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
| `js/sprites.js` | all pixel art (students, furniture, icons, stamps, stickers) |
| `js/raster.js` | tiny no-anti-aliasing pixel rasterizer |
| `js/audio.js` | synthesized sound effects and speech |
| `tools/` | Playwright screenshot walkthrough and icon generator |
