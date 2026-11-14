# Relay walkthrough (OpenFilm)

A silent 20-second, 1280×720 film at 24 fps using synthetic calendar screenshots. Four editable HTML shots share style.css; frame(t) sets each shot deterministically. The closing scene labels time tracking as planned.

With OpenFilm installed, run from this folder:

```sh
openfilm look --count 8
openfilm render --fps 24 --workers 2 --out relay-intro.mp4
openfilm look relay-intro.mp4 --full
```

No generated media services, keys, music, or voice are used. The screenshot images are from the Relay prototype. Intermediate caches and MP4 exports stay untracked. The published video is on the personal blog's Relay article.

Validated on Windows with OpenFilm source e07ae4c plus the independent resume-file-map patch: eight sampled frames drawn twice in shuffled orders matched; full-frame scan found no flashes, jumps, black frames or still-picture warnings. Export verified as H.264, 1280×720, 24 fps, exactly 20 seconds. This is a product walkthrough, not evidence that planned time-tracking features exist.
