# Architecture

A static page with three screens (start, quiz, results) that `quiz.js` shows
and hides. There is no framework and no build step: `quiz.js` is one IIFE.

## Data

`CATEGORIES` in `quiz.js` holds each category's settings: the question text,
the image folder, the data file, the word for its groups (genus for foxes,
group for breeds), the phrases for a right answer, and the result wording.

Each `data/<category>.json` is a list of animals:

```json
{ "name": "Abyssinian", "scientific": "Felis catus", "file": "abyssinian.jpg", "group": "Shorthair" }
```

`loadJSON()` reads a data file with `XMLHttpRequest` and accepts status 0, which
is what browsers report for a `file://` request, so the quiz can run without a
server where the browser allows it. Choosing a category reloads its data and
updates the counts on the start screen.

## Questions

`startQuiz()` shuffles the category, takes the first 8 or 16 (or all of them),
and for each animal builds four choices:

- `pickDistractors()` takes three other animals from the same `group` at
  random.
- If the group has fewer than three others, the rest are the animals whose
  names are closest by Levenshtein distance.

The four are shuffled and the right answer's index is kept.

## Answering

- `loadQuestion()` sets the image, hides it behind a placeholder until it loads,
  builds the buttons, and starts the timer.
- The timer counts down 15 s in 100 ms steps and drives the bar at the top. At
  zero the question counts as wrong.
- `answer()` marks the right choice green and a wrong pick red, updates the
  score and streak, shows the scientific name and genus (foxes) or the breed
  group, and schedules the next question after one second. <kbd>Enter</kbd>,
  <kbd>Space</kbd> or the Next button moves on sooner.
- `showResults()` shows the accuracy and a title in five bands: 100 %, 80 %,
  60 %, 40 % and below.

## Images and credits

`images/<category>/` holds one image per animal, named by `slugify(name)`.
`generate-data.js` (Node.js) can download a category's images from the
Wikipedia API and rewrite its data file; it skips images that already exist.

`data/image-credits.json` lists every image's source file on Wikimedia, author,
licence and licence URL, and how its source was established.
`tools/render-credits.py` turns it into `CREDITS.md` for the repository and
`credits.html` for the site, using the title, colours and introduction in
`tools/credits-page.json`, and stops if an image has no credit.

## Deployment files

| File | Purpose |
|---|---|
| `_headers` | `Content-Security-Policy` allowing only same-origin scripts, same-origin and inline styles, Google Fonts, and same-origin or `data:` images; plus `nosniff`, `DENY` framing and a referrer policy |
| `wrangler.toml` | Worker `animal-quiz`, custom domain, `assets.directory = "./"` |
| `.assetsignore` | Keeps `generate-data.js`, `tools/`, `wrangler.toml` and the repository docs off the site |
