#!/usr/bin/env python3
"""Régénère docs/Documentation-ClickAndCollect.pdf à partir de docs/DOCUMENTATION.md
et de template.html (même dossier).

Usage : python3 docs/report-build/build.py
Prérequis : npx (accès réseau pour `marked`), et Playwright installé quelque part dans
le dépôt (ex. admin-web/node_modules/playwright — déjà présent pour les tests E2E).
"""
import datetime
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
BUILD_DIR = Path(__file__).resolve().parent

# 9 sections numérotées de DOCUMENTATION.md, dans l'ordre — doit rester synchronisé avec
# la table des matières écrite en dur dans template.html.
SLUGS = [
    "1-présentation-du-projet",
    "2-architecture-générale",
    "3-installation-et-démarrage",
    "4-backend--api",
    "5-application-mobile",
    "6-back-office-admin-web",
    "7-tests",
    "8-limitations-connues-et-points-de-vigilance",
    "9-annexe--variables-denvironnement",
]


def find_playwright_dir() -> Path:
    for candidate in (ROOT / "admin-web" / "node_modules" / "playwright",):
        if candidate.exists():
            return candidate.parent
    raise SystemExit("Playwright introuvable — `npm install` dans admin-web/ au moins une fois.")


def main() -> None:
    md_path = DOCS / "DOCUMENTATION.md"
    raw_html = subprocess.run(
        ["npx", "--yes", "marked", str(md_path)],
        check=True, capture_output=True, text=True,
    ).stdout

    marker = "<h2>1. Présentation du projet</h2>"
    if marker not in raw_html:
        raise SystemExit(f"Marqueur de section 1 introuvable — DOCUMENTATION.md a-t-il changé de titre ? ({marker!r})")
    body = raw_html[raw_html.index(marker):]

    # Injecte les ids sur les 9 <h2> numérotés, dans l'ordre, pour que les liens du
    # sommaire (écrits en dur dans template.html) pointent au bon endroit.
    parts = re.split(r"(<h2>)", body)
    out, slug_i = [], 0
    for part in parts:
        if part == "<h2>" and slug_i < len(SLUGS):
            out.append(f'<h2 id="{SLUGS[slug_i]}">')
            slug_i += 1
        else:
            out.append(part)
    if slug_i != len(SLUGS):
        raise SystemExit(f"Attendu {len(SLUGS)} sections <h2> numérotées, trouvé {slug_i} — DOCUMENTATION.md a changé de structure ?")
    body = "".join(out)

    template = (BUILD_DIR / "template.html").read_text(encoding="utf-8")
    date_str = datetime.date.today().strftime("%-d %B %Y")
    # mois en français plutôt qu'anglais (strftime dépend de la locale système, peu fiable)
    mois_fr = {
        "January": "janvier", "February": "février", "March": "mars", "April": "avril",
        "May": "mai", "June": "juin", "July": "juillet", "August": "août",
        "September": "septembre", "October": "octobre", "November": "novembre", "December": "décembre",
    }
    for en, fr in mois_fr.items():
        date_str = date_str.replace(en, fr)
    full_html = template.replace("__DATE__", date_str).replace("__BODY__", body)

    tmp_html = BUILD_DIR / "_build.html"
    tmp_html.write_text(full_html, encoding="utf-8")

    playwright_cwd = find_playwright_dir()
    out_pdf = DOCS / "Documentation-ClickAndCollect.pdf"
    script = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://{tmp_html}');
  await page.pdf({{
    path: '{out_pdf}', format: 'A4', printBackground: true,
    margin: {{ top: '0', bottom: '0', left: '0', right: '0' }},
  }});
  await browser.close();
}})().catch((e) => {{ console.error(e); process.exit(1); }});
"""
    subprocess.run(["node", "-e", script], cwd=playwright_cwd, check=True)
    tmp_html.unlink(missing_ok=True)
    print(f"PDF régénéré : {out_pdf}")


if __name__ == "__main__":
    sys.exit(main())
