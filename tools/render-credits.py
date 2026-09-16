#!/usr/bin/env python3
"""Write CREDITS.md and credits.html from data/image-credits.json.

Every image in this quiz comes from Wikimedia, under its own licence, and most
of those licences require naming the author and the licence. This turns the
credits file into the page the site links to and the Markdown the repository
shows, so the two can never disagree.

    python3 tools/render-credits.py          # from the repository root
"""
from __future__ import annotations
import html, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = json.loads((ROOT / "tools" / "credits-page.json").read_text())


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
    (ROOT / "CREDITS.md").write_text(f"""---
title: Image credits
description: {SITE['description']}
---

# Image credits

{SITE['intro']}

This file is generated from `data/image-credits.json` by
`tools/render-credits.py`; the site shows the same list at `credits.html`.

| Image | Source file | Author | Licence |
|---|---|---|---|
{rows_md}
""")

    rows_html = "\n".join(
        f"<tr><td>{html.escape(i['file'])}</td>"
        f"<td><a href=\"{html.escape(i['source_url'])}\">{html.escape(i['source'].removeprefix('File:'))}</a></td>"
        f"<td>{html.escape(i['author']) or '—'}</td><td>{licence_html(i)}</td></tr>"
        for i in images)
    (ROOT / "credits.html").write_text(f"""<!DOCTYPE html>
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
</main>
</body>
</html>
""")
    print(f"{len(images)} credits -> CREDITS.md, credits.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
