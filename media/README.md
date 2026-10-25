# Roomora media kit

All names, groups, and amounts in `store/` are fictional. The captures are rendered from the Roomora web UI against locally intercepted API responses. They do not access the production database or include the developer's profile photo.

## Store image order

For Turkish listing: `home-tr-01-home.png`, `home-tr-07-selected-split.png`, `home-tr-02-expenses.png`, `home-tr-05-bills.png`, `home-tr-04-balance.png`, `trip-tr-02-expenses.png`, `home-tr-06-payment.png`.

For English listing: use the equivalent `home-en-*` and `trip-en-*` files in the same order. The source set contains 26 captures at 1170 x 2532 px. Confirm each store's current device-size slots before upload. These web-rendered captures should be replaced with native-device screenshots if the store requires them or if native layout differs.

## Walkthroughs

- `video/roomora-guide-tr.mp4`: narrated Turkish guide, about 106 seconds.
- `video/roomora-guide-en.mp4`: narrated English guide, about 96 seconds.

Both are 1920 x 1080 H.264/AAC. They are detailed usage guides, **not** Apple App Store preview videos. Apple previews require short, app-only device capture and separate review. Do not submit the long guides as previews.

## Campus handout

`brochure/roomora-a5-tr.pdf` is a single-page A5 print layout. The two QR codes point separately to the public App Store and Google Play listings. Print at 100% scale without cropping; test both codes on a paper proof before bulk printing.

## Rebuild

1. Run `npm run web:build`, then serve `dist` on localhost port 8092.
2. Run `node scripts/capture-demo-store.mjs`.
3. Run `python scripts/make-guides.py` and `python scripts/make-brochure.py`.

The store image and video generators depend on Playwright/Chromium, Pillow, FFmpeg and Windows SAPI voices. The brochure uses ReportLab and qrcode. `media/video/tr-*` and `media/video/en-*` are ignored intermediate render files.
