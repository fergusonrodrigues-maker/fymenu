# /public/sounds

Audio assets used by the waiter portal Realtime listener.

## bell.mp3 — TODO

Drop a short (1–2 s) bell/alert MP3 here as `bell.mp3`. It is played by
`app/colaborador-app/[slug]/_components/alertSound.ts` whenever a new
table call arrives.

Free options:

- https://mixkit.co/free-sound-effects/bell/
- https://pixabay.com/sound-effects/search/bell/

If `bell.mp3` is missing, the alert helper falls back to a Web Audio
synthesized two-tone chime (no asset required), so the feature still
works — it just sounds more discreet.
