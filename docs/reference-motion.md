# Opening reference and implementation

Source: `assets/7a9f6f3f5a0b24a7db138fc138eb79d4_720w.mp4`, supplied by the user. 720 × 1280, 30 fps, 66.39 seconds.

## Observed sequence

- 0.0–2.2 s: burgundy floral envelope, scalloped side flaps, central gold floral seal.
- 2.2–3.1 s: both side flaps hinge outward around their outer vertical edges. The seal stays attached to the left flap and turns away with it.
- 2.8–4.2 s: top and bottom triangular folds hinge away, revealing a warm, textured paper card. The invitation stays in place; no small card rises from an envelope.
- 4.2–7.0 s: invitation greeting appears.
- 8.0–16.0 s: couple names fade in and hold.
- 17.0–26.0 s: arched photo and wedding date appear.
- Later shots show timeline, details, RSVP and closing monogram.

## Interactive adaptation

The page now opens with a dedicated full-screen entrance. Desktop keeps a portrait stage; mobile fills the viewport, including a landscape layout. The guest controls when opening starts.

`EnvelopeOpening.jsx` layers four SVG surfaces using shared image coordinates from the first video frame. CSS applies perspective and independently hinges the two side folds and the top/bottom folds. Scalloped side outlines preserve the paper character. A separate gold seal image moves inside the left fold's transform. The floral cover is `public/opening/envelope-reference.webp`, extracted from the uploaded video; the original video remains outside public build assets.

The reference's initial wait is replaced with a tap/scroll prompt. Opening takes about 1.9 seconds from interaction. The personalized greeting holds for 2 seconds and the couple names for 2.1 seconds. The portrait waits for the guest to continue to the complete invitation, which contains schedule, gallery and RSVP.

Continue/scroll advances the cards. A cooldown avoids a single trackpad gesture skipping the whole sequence. Skip and Escape work throughout the opening. Pending phase timers are canceled when phase changes, the opening is dismissed, or the component unmounts. Reduced motion opens directly to the portrait without rotations or automatic slides. Keyboard focus stays in the entrance until it closes, then moves to main content. The host route bypasses the entrance.

The default cover preserves the reference's burgundy floral artwork. Clay uses rose material with soft highlights; neumorphism uses pearl tones and paired shadows. Each continues into its existing invitation theme. All guest names, couple names, photos and dates remain DOM content and use the bundled Vietnamese fonts.

## Verification limit

The source video's frames were visually inspected. Real browser rendering of the new CSS 3D sequence remains unverified because the workspace blocks local listeners and browser launch. The production build and simulated-DOM checks cover sequencing, input, theme changes, skip, reduced motion, focus handoff and guest personalization.
