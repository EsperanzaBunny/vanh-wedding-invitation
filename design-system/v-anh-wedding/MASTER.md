# Wedding invitation design system

The UI/UX search returned relevant romantic serif/script typography and rose color guidance. Its marketing/testimonial layout recommendation did not fit an invitation and was rejected. This document records the verified, adapted design direction.

- Shared sequence: personal invitation → interactive envelope → welcome → story → venue and schedule → photo gallery → RSVP → closing.
- Three independent material treatments: forest glass (translucent surfaces, light borders, backdrop blur); rose clay (rounded forms, inset highlights, warm shadows); pearl neumorphism (matching background/surfaces, paired inset and raised shadows).
- Playfair Display for headings, couple names, personal greetings, decorative signatures and opening dates. Load normal 400/500/600 and italic 400/500 through the official Google Fonts stylesheet; the family supports Vietnamese. Keep self-hosted Be Vietnam Pro for forms, navigation, labels and fallback, with Vietnamese, extended Latin and Latin subsets. Titles use generous line height and restrained tracking; name groups wrap as complete names.
- Semantic CSS variables in src/styles.css own background, text, muted text, accent, surfaces, borders, shadows and radii.
- Photos are supplied original assets, exported as responsive WebP. Fullscreen hero is prioritized; subsequent photos load lazily.
- The opening follows the uploaded video: a full-screen floral envelope with four independent 3D folds, gold seal attached to the left flap, then paper greeting, names and portrait. Click, keyboard button and vertical scroll can advance it; skip is always available. IntersectionObserver animates later sections without hiding them by default; unsupported or delayed observers cannot leave blank content. Reduced motion removes transitions.
- Native labeled form controls, visible focus, keyboard-trapped dismissible dialogs, 44px actions, responsive layouts down to 320px.
- Wedding details in src/config.js are transcribed from supplied print invitation images; the RSVP deadline remains unset. Do not present invented biographies or testimonials as fact.
- Demo persistence is explicitly browser-local. Live RSVP uses unique private tokens and server-side validation; host operations require a server-side password. No public guest roster.
