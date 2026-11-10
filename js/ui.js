// v2.3 chunky, obviously pressable buttons, shared by every scene.
// A button has a 1 px dark outline, a light top row, and a 3 px darker lip along the bottom; while it's
// pressed the face drops 2 px onto the lip. Saturated faces mean "you can tap this": yellow for an
// activity choice, green for go / next / done, blue for tools (help, back, star, cards…), red for the
// red card. Passive panels stay cream (panel()).
import { Pix, cached, darken, lighten, mix } from './raster.js';

export const FACE = {
  yellow: '#ffd54a', // activity choices
  green: '#86d86e', // go / next / done
  blue: '#9cd0f6', // tools: help, back, star, cards, bell
  red: '#f4a39a', // the red card (quieter than the card itself)
  pink: '#ffa9cb',
  cream: '#fff3dc', // tappable but neutral (the board's tools, decorate tiles)
};
export const LIP = 3, DROP = 2;

/** the button sprite; the footprint is the same pressed or not (the face moves down inside it) */
export function button(w, h, face = FACE.blue, pressed = false, rim = null) {
  return cached('ubtn' + w + 'x' + h + face + (pressed ? 'd' : '') + (rim || ''), () => {
    const p = new Pix(w, h);
    const y0 = pressed ? DROP : 0, hh = h - y0, lip = pressed ? LIP - DROP : LIP;
    const O = rim || mix(face, '#2a1630', 0.68), L1 = darken(face, 0.3), L2 = darken(face, 0.42), HI = lighten(face, 0.6);
    p.hline(2, w - 3, y0, O); p.hline(2, w - 3, y0 + hh - 1, O);
    p.vline(0, y0 + 2, y0 + hh - 3, O); p.vline(w - 1, y0 + 2, y0 + hh - 3, O);
    const fb = y0 + hh - 2 - lip; // last row of the face
    p.rect(2, y0 + 1, w - 4, fb - y0, face); p.rect(1, y0 + 2, w - 2, fb - y0 - 1, face);
    p.hline(2, w - 3, y0 + 1, HI); p.px(1, y0 + 2, HI);
    p.rect(1, fb + 1, w - 2, lip, L1); p.hline(2, w - 3, y0 + hh - 2, L2);
    p.px(1, y0 + 1, O); p.px(w - 2, y0 + 1, O); p.px(1, y0 + hh - 2, O); p.px(w - 2, y0 + hh - 2, O);
    return p.canvas();
  });
}
/** where content goes on a button: the y offset of the face's middle, given an item of height ih */
export const faceY = (h, ih, pressed) => Math.round((h - LIP - 1 - ih) / 2) + (pressed ? DROP : 0) + 1;

/** draw a button and an optional centred icon; returns the y shift (0 or DROP) for anything else drawn on it */
export function drawBtn(c, x, y, w, h, face, pressed, icon, rim) {
  c.drawImage(button(w, h, face, pressed, rim), Math.round(x), Math.round(y));
  if (icon) c.drawImage(icon, Math.round(x + (w - icon.width) / 2), Math.round(y) + faceY(h, icon.height, pressed));
  return pressed ? DROP : 0;
}

/** a passive panel: soft rim, flat cream, no lip (things to look at, not to press) */
export function panel(w, h, col = '#fffaf0', rim = '#c9a77a') {
  return cached('upanel' + w + 'x' + h + col + rim, () => {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h, rim); p.rect(0, 1, w, h - 2, rim);
    p.rect(1, 1, w - 2, h - 2, col); p.hline(2, w - 3, 1, lighten(col, 0.6));
    return p.canvas();
  });
}
