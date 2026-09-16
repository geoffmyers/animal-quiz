# Contributing to Animal Identification Quiz

Thanks for taking an interest. This project is developed inside a private
mono repo and published here, which shapes a couple of the rules below —
please read the last section before opening a PR.

## Getting set up

**Stack:** static HTML, CSS and JavaScript, with no build step.

```bash
git clone https://github.com/geoffmyers/animal-quiz.git
cd animal-quiz
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static file server works.

## Checks

There is no automated test suite. Before pushing, serve the site and play
one round in each category (foxes, cats, dogs), checking that every image
loads and the results screen appears.

## Before you open a pull request

- Keep the change focused. One concern per PR is much easier to review.
- Match the surrounding style rather than introducing a new one. There is no
  separate style guide; the existing code is the guide.
- Keep the site dependency-free unless there is a strong reason. No build step
  is part of the design.
- A new or replaced image needs its source file, author and licence added to
  `data/image-credits.json`, then `CREDITS.md` and `credits.html` regenerated
  (see the README). An image whose licence cannot be established cannot be
  accepted.
- Update the README if you change behaviour a user can see.
- Explain **why** in the commit message, not just what. The diff already says
  what changed.

## Reporting a bug

Open an issue with what you did, what you expected, and what happened instead.
The browser, its version and the device help more than anything else.

## Security

Please do **not** open a public issue for a security problem. Report it
privately through GitHub's *Report a vulnerability* button on the Security tab.

## How this repo is published

This project lives in a private mono repo. Each publish adds **one commit** on
top of the history here, so the history grows with every release, but one
commit here can stand for many upstream changes. As a result, pull requests
are reviewed here and applied upstream, then arrive back in the next published
commit, which credits your authorship in its message. The pull request is
closed with a link to that commit rather than merged, because the next publish
is built from the upstream tree and would undo a change made only here.

## Licence

By contributing you agree that your contribution is licensed under the same
terms as this project — see [LICENSE.md](LICENSE.md).
