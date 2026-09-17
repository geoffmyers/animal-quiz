#!/usr/bin/env python3
"""Write CREDITS.md and credits.html from data/image-credits.json.

Every image in this quiz comes from Wikimedia, under its own licence, and most
of those licences require naming the author and the licence. This turns the
credits file into the page the site links to and the Markdown the repository
shows, so the two can never disagree.

    python3 tools/render-credits.py          # from the repository root
    python3 tools/render-credits.py --check  # exit 1 if either file is out of date

CREDITS.md keeps a YAML front-matter block only if it already has one: the
development copy carries one for its tooling, and the published copy has it
stripped, so rendering either one leaves nothing to commit.
"""
from __future__ import annotations
import html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = json.loads((ROOT / "tools" / "credits-page.json").read_text())
FRONT_MATTER = re.compile(r"\A---\r?\n.*?\r?\n---\r?\n+", re.S)


def md(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ").strip()


def licence_md(i: dict) -> str:
    return f"[{i['license']}]({i['license_url']})" if i.get("license_url") else i["license"]


def licence_html(i: dict) -> str:
    name = html.escape(i["license"])
    return f'<a href="{html.escape(i["license_url"])}">{name}</a>' if i.get("license_url") else name


def main() -> int:
    images = json.loads((ROOT / "data" / "image-credits.json").read_text())["images"]
    missing = [p.relative_to(ROOT / "images").as_posix() for p in sorted((ROOT / "images").rglob("*"))
               if p.is_file() and p.relative_to(ROOT / "images").as_posix() not in {i["file"] for i in images}]
    if missing:
        print("no credit for: " + ", ".join(missing), file=sys.stderr)
        return 1

    rows_md = "\n".join(
        f"| [`{i['file']}`](images/{i['file']}) | [{md(i['source'].removeprefix('File:'))}]({i['source_url']}) "
        f"| {md(i['author']) or '—'} | {licence_md(i)} |"
        for i in images)
    front_matter = f"""---
title: Image credits
description: {SITE['description']}
---

"""
    credits_md = f"""# Image credits

{SITE['intro']}

This file is generated from `data/image-credits.json` by
`tools/render-credits.py`; the site shows the same list at `credits.html`.

| Image | Source file | Author | Licence |
|---|---|---|---|
{rows_md}
"""

    rows_html = "\n".join(
        f"<tr><td>{html.escape(i['file'])}</td>"
        f"<td><a href=\"{html.escape(i['source_url'])}\">{html.escape(i['source'].removeprefix('File:'))}</a></td>"
        f"<td>{html.escape(i['author']) or '—'}</td><td>{licence_html(i)}</td></tr>"
        for i in images)
    credits_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Image credits · {html.escape(SITE['title'])}</title>
<style>
  body {{ margin: 0; padding: 32px 16px; background: {SITE['background']}; color: #d8d8e0;
         font: 15px/1.5 system-ui, -apple-system, sans-serif; }}
  main {{ max-width: 1000px; margin: 0 auto; }}
  h1 {{ font-size: 28px; margin: 0 0 12px; color: #fff; }}
  a {{ color: {SITE['accent']}; }}
  .table {{ overflow-x: auto; }}
  table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
  th, td {{ text-align: left; padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.1);
           vertical-align: top; overflow-wrap: anywhere; }}
  th {{ color: #fff; }}
  .gh-link {{ display: inline-flex; align-items: center; gap: 6px; color: rgba(216,216,224,0.85); text-decoration: none; }}
  .gh-link:hover {{ color: #fff; }}
  .gh-link svg {{ flex-shrink: 0; }}
</style>
</head>
<body>
<main>
<h1>Image credits</h1>
<p>{html.escape(SITE['intro'])}</p>
<p><a href="./">Back to the {html.escape(SITE['title'])}</a></p>
<div class="table"><table>
<thead><tr><th>Image</th><th>Source file</th><th>Author</th><th>Licence</th></tr></thead>
<tbody>
{rows_html}
</tbody>
</table></div>
<p style="margin-top: 24px;"><a class="gh-link" href="https://github.com/geoffmyers/{SITE['repo']}" target="_blank" rel="noopener noreferrer">
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>
<span>View source on GitHub</span>
</a></p>
</main>
</body>
</html>
"""

    md_path, html_path = ROOT / "CREDITS.md", ROOT / "credits.html"
    md_now = md_path.read_text() if md_path.exists() else None
    html_now = html_path.read_text() if html_path.exists() else None
    if "--check" in sys.argv[1:]:
        stale = []
        if md_now is None or FRONT_MATTER.sub("", md_now, count=1) != credits_md:
            stale.append("CREDITS.md")
        if html_now != credits_html:
            stale.append("credits.html")
        if stale:
            print(f"out of date: {', '.join(stale)} (run tools/render-credits.py)", file=sys.stderr)
            return 1
        print(f"{len(images)} credits, CREDITS.md and credits.html are current")
        return 0

    keep_front_matter = md_now is None or bool(FRONT_MATTER.match(md_now))
    md_path.write_text((front_matter if keep_front_matter else "") + credits_md)
    html_path.write_text(credits_html)
    print(f"{len(images)} credits -> CREDITS.md, credits.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
