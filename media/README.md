# Roomora media kit

All names, groups, and amounts in `store/` are fictional. The captures are rendered from the Roomora web UI against locally intercepted API responses. They do not access the production database or include the developer's profile photo.

## Store image order

For Turkish listing: `home-tr-01-home.png`, `home-tr-07-selected-split.png`, `home-tr-02-expenses.png`, `home-tr-05-bills.png`, `home-tr-04-balance.png`, `trip-tr-02-expenses.png`, `home-tr-06-payment.png`.

For English listing: use the equivalent `home-en-*` and `trip-en-*` files in the same order. The source set contains 26 captures at 1080 x 1920 px. These are web-rendered design previews, not actual iOS or Android screenshots. Capture the final screens from the respective release apps before uploading: native navigation and layout can differ, and Apple requires its own supported iPhone screenshot sizes.

The `native/` captures used in the walkthrough were taken from an Android development build and include development controls. They are also not store-ready. The Play and App Store listings have **not** been updated with these assets.

## Walkthroughs

- `video/roomora-native-guide-tr.mp4`: revised Turkish portrait walkthrough (1080 x 1920, 86 seconds).
- `video/roomora-native-guide-en.mp4`: revised English portrait walkthrough (1080 x 1920, 101 seconds).

The revised guides use native Android app captures with fictional people and amounts. Both narrations follow the same screen flow: add an expense, choose its payer and participants, review the split, inspect balances, report a payment, and approve receipt. The highlighted controls and captions match each language. The capture-only demo data was removed from application source after recording. These are usage guides for review, not App Store preview uploads or iOS captures.

The earlier web-rendered guides remain below for comparison, but should not be used as the revised deliverables:

- `video/roomora-guide-tr.mp4`: narrated Turkish guide, about 106 seconds.
- `video/roomora-guide-en.mp4`: narrated English guide, about 96 seconds.

The earlier guides are 1920 x 1080 H.264/AAC. All four are detailed usage guides, **not** Apple App Store preview videos. Apple previews require short, app-only device capture and separate review. Do not submit these long guides as previews.

## Campus handout

`brochure/roomora-a5-tr.pdf` is a single-page A5 print layout. The two QR codes point separately to the public App Store and Google Play listings. Print at 100% scale without cropping; test both codes on a paper proof before bulk printing.

The revised handout includes the Roomora logo, home and trip examples, and two larger QR codes. `brochure/roomora-a5-tr-preview.png` is its rendered proof.

## Rebuild

1. Run `npm run web:build`, then serve `dist` on localhost port 8092.
2. Run `node scripts/capture-demo-store.mjs`.
3. Run `python scripts/make-guides.py` and `python scripts/make-brochure.py`.

For the revised portrait guides, run `python scripts/make-native-guides.py tr` and `python scripts/make-native-guides.py en`. The script uses the checked-in `native/` Android captures and localized scene scripts, Pillow, and FFmpeg. The Turkish narration uses the local, Apache-2.0-licensed [EMA Lightning](https://github.com/canberk7/ema-lightning) model; the English narration uses Edge TTS. It does not connect to a user account or production data.

The store image and video generators depend on Playwright/Chromium, Pillow, FFmpeg and Windows SAPI voices. The brochure uses ReportLab and qrcode. `media/video/tr-*` and `media/video/en-*` are ignored intermediate render files.
