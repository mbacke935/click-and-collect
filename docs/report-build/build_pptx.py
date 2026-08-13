#!/usr/bin/env python3
"""Génère la présentation de soutenance Click & Collect (.pptx)."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn

# ---------- Palette (cohérente avec docs/report-build/template.html) ----------
CREAM = RGBColor(0xFA, 0xF9, 0xF5)
INK = RGBColor(0x1A, 0x1A, 0x18)
MUTED = RGBColor(0x6B, 0x6A, 0x60)
LINE = RGBColor(0xE3, 0xE1, 0xD8)
BLUE = RGBColor(0x2F, 0x6F, 0xED)
BLUE_LIGHT = RGBColor(0xEE, 0xF4, 0xFF)
ORANGE = RGBColor(0xE0, 0x74, 0x2F)
GREEN = RGBColor(0x2F, 0xA0, 0x6A)
RED = RGBColor(0xC0, 0x3A, 0x3A)
DARK_BOX = RGBColor(0x1F, 0x1E, 0x1A)
DARK_BOX_TXT = RGBColor(0xF2, 0xF1, 0xE8)
ROW_ALT = RGBColor(0xF3, 0xF1, 0xE8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

FONT = "Arial"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]

SLIDE_W = prs.slide_width
SLIDE_H = prs.slide_height


def add_slide():
    slide = prs.slides.add_slide(BLANK)
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = CREAM
    bg.line.fill.background()
    bg.shadow.inherit = False
    slide.shapes._spTree.remove(bg._element)
    slide.shapes._spTree.insert(2, bg._element)
    return slide


def add_text(slide, x, y, w, h, text, size=14, color=INK, bold=False, align=PP_ALIGN.LEFT,
             font=FONT, italic=False, line_spacing=1.15, anchor=MSO_ANCHOR.TOP, wrap=True):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    lines = text.split("\n")
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        run = p.add_run()
        run.text = line
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.name = font
        run.font.color.rgb = color
    return box


def add_rect(slide, x, y, w, h, fill=None, line_color=None, line_w=1.0, radius=None):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    shp = slide.shapes.add_shape(shape_type, x, y, w, h)
    if radius:
        try:
            shp.adjustments[0] = radius
        except Exception:
            pass
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid()
        shp.fill.fore_color.rgb = fill
    if line_color is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line_color
        shp.line.width = Pt(line_w)
    shp.shadow.inherit = False
    return shp


def add_line(slide, x1, y1, x2, y2, color=LINE, w=1.0):
    ln = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    ln.line.color.rgb = color
    ln.line.width = Pt(w)
    return ln


MARGIN = Inches(0.55)
CONTENT_W = SLIDE_W - MARGIN * 2


def footer(slide, page_no, total=12):
    add_line(slide, MARGIN, Inches(7.05), SLIDE_W - MARGIN, Inches(7.05), color=LINE, w=0.75)
    add_text(slide, MARGIN, Inches(7.12), Inches(6), Inches(0.3),
              "CLICK & COLLECT LOCAL — SUJET 4", size=8, color=MUTED, bold=True)
    add_text(slide, SLIDE_W - MARGIN - Inches(2), Inches(7.12), Inches(2), Inches(0.3),
              f"{page_no:02d} / {total}", size=8, color=MUTED, bold=True, align=PP_ALIGN.RIGHT)


def kicker(slide, text):
    add_text(slide, MARGIN, Inches(0.45), Inches(10), Inches(0.35),
              text, size=12, color=BLUE, bold=True)
    add_line(slide, MARGIN, Inches(0.85), SLIDE_W - MARGIN, Inches(0.85), color=INK, w=1.5)


def section_title(slide, title, y=Inches(0.95), size=26):
    add_text(slide, MARGIN, y, CONTENT_W, Inches(0.6), title, size=size, color=INK, bold=True)


def chip(slide, x, y, w, h, text, size=9):
    add_rect(slide, x, y, w, h, fill=None, line_color=LINE, line_w=1, radius=0.5)
    add_text(slide, x, y, w, h, text, size=size, color=MUTED, bold=True,
              align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def make_table(slide, x, y, w, rows, col_widths, header=True, row_h=Inches(0.42), font_size=11):
    n_rows = len(rows)
    n_cols = len(rows[0])
    gtable = slide.shapes.add_table(n_rows, n_cols, x, y, w, row_h * n_rows).table
    for i, cw in enumerate(col_widths):
        gtable.columns[i].width = cw
    for r, row in enumerate(rows):
        gtable.rows[r].height = row_h
        for c, val in enumerate(row):
            cell = gtable.cell(r, c)
            cell.text = str(val)
            cell.margin_left = Inches(0.1)
            cell.margin_right = Inches(0.1)
            cell.margin_top = Inches(0.04)
            cell.margin_bottom = Inches(0.04)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            para = cell.text_frame.paragraphs[0]
            para.font.size = Pt(font_size)
            para.font.name = FONT
            if header and r == 0:
                cell.fill.solid()
                cell.fill.fore_color.rgb = INK
                para.font.color.rgb = WHITE
                para.font.bold = True
            else:
                cell.fill.solid()
                cell.fill.fore_color.rgb = ROW_ALT if r % 2 == 0 else CREAM
                para.font.color.rgb = INK
    # supprime le style de tableau par défaut (bandes bleues) pour garder nos couleurs
    tbl_el = gtable._tbl
    tbl_pr = tbl_el.find(qn('a:tblPr'))
    if tbl_pr is not None:
        tbl_pr.set('firstRow', '0')
        tbl_pr.set('bandRow', '0')
    return gtable


def flow_box(slide, x, y, w, h, lines, fill=DARK_BOX, txt_color=DARK_BOX_TXT, size=11, mono=True):
    add_rect(slide, x, y, w, h, fill=fill, radius=0.08)
    add_text(slide, x + Inches(0.12), y, w - Inches(0.24), h, "\n".join(lines),
              size=size, color=txt_color, bold=False, align=PP_ALIGN.CENTER,
              anchor=MSO_ANCHOR.MIDDLE, font="Consolas" if mono else FONT, line_spacing=1.2)


def arrow_down(slide, x_center, y, length=Inches(0.22), color=MUTED):
    add_line(slide, x_center, y, x_center, y + length, color=color, w=1.5)


def arrow_right(slide, x, y_center, length=Inches(0.25), color=MUTED):
    add_line(slide, x, y_center, x + length, y_center, color=color, w=1.5)


# =====================================================================
# SLIDE 1 — Couverture
# =====================================================================
s = add_slide()
add_text(s, MARGIN, Inches(0.6), Inches(6), Inches(0.35), "SOUTENANCE — SUJET 4",
          size=12, color=BLUE, bold=True)
add_rect(s, MARGIN, Inches(2.05), Inches(0.55), Inches(0.55), fill=BLUE, radius=0.3)
add_text(s, MARGIN + Inches(0.7), Inches(2.05), Inches(4), Inches(0.55), "CLICK & COLLECT",
          size=13, color=MUTED, bold=True, anchor=MSO_ANCHOR.MIDDLE)
add_text(s, MARGIN, Inches(2.85), Inches(11), Inches(1.3), "Click & Collect Local",
          size=44, color=INK, bold=True)
add_text(s, MARGIN, Inches(3.85), Inches(10.5), Inches(1.1),
          "Une solution digitale de retrait pour les commerces de proximité — vitrine, commande, "
          "créneau planifié et billet chiffré consultable et validable même sans réseau, sous "
          "surveillance d'un système d'observabilité.",
          size=14, color=MUTED, line_spacing=1.3)
add_line(s, MARGIN, Inches(5.15), SLIDE_W - MARGIN, Inches(5.15), color=LINE, w=1)
add_text(s, MARGIN, Inches(5.35), Inches(4), Inches(0.3), "Mohamed Mbacke", size=12, color=INK, bold=True)
add_text(s, MARGIN, Inches(5.65), Inches(4), Inches(0.3), "Développeur", size=10, color=MUTED)
add_text(s, Inches(9.2), Inches(5.35), Inches(3.5), Inches(0.3), "Présentation orale",
          size=10, color=MUTED, align=PP_ALIGN.RIGHT)
add_text(s, Inches(9.2), Inches(5.65), Inches(3.5), Inches(0.3), "Backend · Mobile · Admin-web",
          size=10, color=MUTED, align=PP_ALIGN.RIGHT)
add_text(s, Inches(9.2), Inches(5.9), Inches(3.5), Inches(0.3), "NestJS · Expo · Next.js",
          size=10, color=MUTED, align=PP_ALIGN.RIGHT)

# =====================================================================
# SLIDE 2 — Contexte & objectif
# =====================================================================
s = add_slide()
kicker(s, "01 — CONTEXTE & OBJECTIF")
section_title(s, "Digitaliser le commerce de quartier")
add_rect(s, MARGIN, Inches(1.75), Inches(6.1), Inches(1.5), fill=BLUE_LIGHT, radius=0.06)
add_text(s, MARGIN + Inches(0.25), Inches(1.95), Inches(5.6), Inches(1.15),
          "« Pour rivaliser avec les géants du e-commerce, les commerces de proximité "
          "doivent digitaliser leur offre. »",
          size=13, color=INK, italic=True, line_spacing=1.3)
add_text(s, MARGIN, Inches(3.55), Inches(6.1), Inches(0.3), "CAHIER DES CHARGES — SUJET 4",
          size=9, color=BLUE, bold=True)
add_text(s, MARGIN, Inches(3.9), Inches(6.1), Inches(2.2),
          "Objectif : permettre à un client de commander chez un commerçant local, planifier "
          "un créneau de retrait, et suivre sa commande en temps réel — le tout supervisé par "
          "un système d'observabilité garantissant la disponibilité du service.",
          size=13, color=INK, line_spacing=1.35)

items = [
    ("Éviter les files d'attente", GREEN),
    ("Soutenir l'économie locale", ORANGE),
    ("Suivi temps réel supervisé", BLUE),
]
y0 = Inches(1.75)
for i, (label, color) in enumerate(items):
    yy = y0 + Inches(1.35) * i
    add_rect(s, Inches(7.1), yy, Inches(0.08), Inches(1.1), fill=color)
    add_text(s, Inches(7.35), yy + Inches(0.3), Inches(4.8), Inches(0.6), label,
              size=15, color=INK, bold=True, anchor=MSO_ANCHOR.MIDDLE)
footer(s, 2)

# =====================================================================
# SLIDE 3 — Vue d'ensemble
# =====================================================================
s = add_slide()
kicker(s, "VUE D'ENSEMBLE")
section_title(s, "Trois applications, une seule API")

cx = Inches(5.15)
flow_box(s, cx, Inches(1.75), Inches(3.0), Inches(0.55), ["PostgreSQL (port 5432)"], mono=False, size=11)
arrow_down(s, cx + Inches(1.5), Inches(2.30), Inches(0.28))
flow_box(s, cx, Inches(2.58), Inches(3.0), Inches(0.7), ["Backend NestJS", "API REST + WS · port 3001 (dev)"], mono=False, size=10.5)
arrow_down(s, cx + Inches(0.75), Inches(3.28), Inches(0.28))
arrow_down(s, cx + Inches(2.25), Inches(3.28), Inches(0.28))
add_text(s, cx - Inches(0.35), Inches(3.56), Inches(1.9), Inches(0.25), "HTTP + WebSocket", size=8.5, color=MUTED, align=PP_ALIGN.CENTER)
add_text(s, cx + Inches(1.7), Inches(3.56), Inches(1.6), Inches(0.25), "HTTP", size=8.5, color=MUTED, align=PP_ALIGN.CENTER)
arrow_down(s, cx + Inches(0.75), Inches(3.81), Inches(0.2))
arrow_down(s, cx + Inches(2.25), Inches(3.81), Inches(0.2))
flow_box(s, cx - Inches(0.35), Inches(4.02), Inches(2.15), Inches(0.75), ["Mobile (Expo)", "Client / Commerçant"], mono=False, size=10)
flow_box(s, cx + Inches(1.85), Inches(4.02), Inches(2.15), Inches(0.75), ["Admin-web (Next)", "Administrateur · port 3000"], mono=False, size=10)

add_text(s, MARGIN, Inches(1.75), Inches(4.3), Inches(2.6),
          "React Native · SQLite · expo-secure-store\n\nTypeORM · JWT · Socket.IO · bcrypt\n\nApp Router · React 19",
          size=11, color=MUTED, line_spacing=1.6)
add_rect(s, MARGIN, Inches(5.15), Inches(8.3), Inches(0.9), fill=BLUE_LIGHT, radius=0.08)
add_text(s, MARGIN + Inches(0.2), Inches(5.28), Inches(7.9), Inches(0.65),
          "Le backend est la seule source de vérité (rôles vérifiés à chaque requête) ; "
          "mobile et admin-web ne sont que des vues sur son API.",
          size=11, color=INK, line_spacing=1.3)
footer(s, 3)

# =====================================================================
# SLIDE 4 — Module 01
# =====================================================================
s = add_slide()
kicker(s, "MODULE 01")
section_title(s, "Authentification & catalogues commerçants")

roles = ["● Client", "● Commerçant", "○ Administrateur — bonus"]
add_text(s, MARGIN, Inches(1.7), Inches(3.3), Inches(1.2), "\n".join(roles),
          size=13, color=INK, line_spacing=1.5)
mod1 = [
    ("Vitrine digitale", "Horaires, adresse, catalogue de produits catégorisé, tri par proximité géographique."),
    ("JWT avec rafraîchissement", "Access token court + refresh token longue durée, secrets distincts. Le rôle et le statut « actif » sont relus en base à chaque rafraîchissement : une suspension prend effet immédiatement."),
    ("Rôles vérifiés côté serveur", "Jamais déduits du payload envoyé par le client, sur chaque route protégée."),
]
yy = Inches(1.7)
for title, desc in mod1:
    add_rect(s, Inches(3.9), yy + Inches(0.05), Inches(0.28), Inches(0.28), fill=GREEN, radius=0.5)
    add_text(s, Inches(3.9), yy + Inches(0.03), Inches(0.28), Inches(0.28), "✓", size=12, color=WHITE,
              bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, Inches(4.35), yy, Inches(8.4), Inches(0.35), title, size=14, color=INK, bold=True)
    add_text(s, Inches(4.35), yy + Inches(0.38), Inches(8.4), Inches(0.75), desc, size=11, color=MUTED, line_spacing=1.3)
    yy += Inches(1.25)
footer(s, 4)

# =====================================================================
# SLIDE 5 — Module 02
# =====================================================================
s = add_slide()
kicker(s, "MODULE 02")
section_title(s, "Tunnel de commande & créneaux")

add_text(s, MARGIN, Inches(1.65), Inches(5.6), Inches(0.3), "PARCOURS CLIENT", size=9, color=BLUE, bold=True)
steps = ["Vitrine", "Catalogue", "Panier", "Créneau", "Statut"]
bw = Inches(1.05)
gap = Inches(0.12)
x0 = MARGIN
for i, st in enumerate(steps):
    xx = x0 + (bw + gap) * i
    add_rect(s, xx, Inches(2.0), bw, Inches(0.5), fill=None, line_color=BLUE, line_w=1.25, radius=0.3)
    add_text(s, xx, Inches(2.0), bw, Inches(0.5), st, size=9.5, color=BLUE, bold=True,
              align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    if i < len(steps) - 1:
        arrow_right(s, xx + bw, Inches(2.25), gap)

add_text(s, MARGIN, Inches(2.85), Inches(5.6), Inches(0.3), "ÉVOLUTION DU STATUT — TEMPS RÉEL",
          size=9, color=BLUE, bold=True)
statuts = ["Reçue", "En préparation", "Prête pour retrait", "Récupérée"]
bw2 = Inches(1.35)
for i, st in enumerate(statuts):
    xx = x0 + (bw2 + gap) * i
    add_rect(s, xx, Inches(3.2), bw2, Inches(0.5), fill=GREEN if i < 3 else BLUE, radius=0.3)
    add_text(s, xx, Inches(3.2), bw2, Inches(0.5), st, size=9, color=WHITE, bold=True,
              align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    if i < len(statuts) - 1:
        arrow_right(s, xx + bw2, Inches(3.45), gap)

add_rect(s, MARGIN, Inches(4.15), Inches(6.15), Inches(1.05), fill=BLUE_LIGHT, radius=0.06)
add_text(s, MARGIN + Inches(0.2), Inches(4.28), Inches(5.75), Inches(0.85),
          "Le parcours client aboutit à l'écran « Statut », qui reçoit en direct les transitions "
          "d'état via WebSocket — sans rafraîchir la page. La capacité d'un créneau est protégée "
          "par un verrou pessimiste en base.",
          size=10.5, color=INK, line_spacing=1.3)

add_text(s, Inches(6.65), Inches(1.65), Inches(6.2), Inches(0.3), "ANNULATION AVANT PRÉPARATION",
          size=9, color=BLUE, bold=True)
add_rect(s, Inches(6.65), Inches(2.0), Inches(6.2), Inches(1.95), fill=None, line_color=LINE, line_w=1, radius=0.04)
add_text(s, Inches(6.9), Inches(2.2), Inches(5.7), Inches(1.6),
          "Le client (sur sa propre commande) ou le commerçant peuvent annuler tant que le "
          "statut est encore « Reçue » — stock et créneau sont alors libérés automatiquement. "
          "Autorisation vérifiée côté serveur : le client ne peut annuler que sa propre commande, "
          "et seulement avant que la préparation ne commence.",
          size=11, color=INK, line_spacing=1.35)
footer(s, 5)

# =====================================================================
# SLIDE 6 — Module 03 (cœur du projet)
# =====================================================================
s = add_slide()
kicker(s, "MODULE 03 — CŒUR DU PROJET")
section_title(s, "Hors-ligne & sécurité du retrait")

add_text(s, MARGIN, Inches(1.65), Inches(11.5), Inches(0.3), "MODE HORS-LIGNE — AUCUN APPEL RÉSEAU",
          size=9, color=BLUE, bold=True)

flow_steps = [
    ["Commande", "validée (en ligne)"],
    ["Billet chiffré", "stocké (SQLite)"],
    ["Scan QR", "caméra / manuel"],
    ["Déchiffrement", "local"],
    ["File d'attente", "sync_queue"],
    ["POST /sync", "synced / échec"],
]
n = len(flow_steps)
box_w = Inches(1.72)
total_gap = CONTENT_W - box_w * n
gap2 = total_gap / (n - 1)
for i, lines in enumerate(flow_steps):
    xx = MARGIN + (box_w + gap2) * i
    flow_box(s, xx, Inches(2.05), box_w, Inches(0.85), lines, size=10.5)
    if i < n - 1:
        arrow_right(s, xx + box_w, Inches(2.47), gap2 - Inches(0.02))
add_text(s, MARGIN, Inches(2.98), Inches(11.5), Inches(0.3),
          "chiffre (AES-256)" + " " * 30 + "reconnexion", size=8.5, color=MUTED)

add_rect(s, MARGIN, Inches(3.6), CONTENT_W, Inches(1.4), fill=BLUE_LIGHT, radius=0.05)
add_text(s, MARGIN + Inches(0.25), Inches(3.78), CONTENT_W - Inches(0.5), Inches(1.1),
          "AES-256-CBC, clé dérivée de QR_TICKET_SECRET — identique côté serveur et embarquée "
          "côté mobile pour un déchiffrement 100% local. Un identifiant unique généré sur "
          "l'appareil garantit l'anti-rejeu ; le succès/échec est tranché par le serveur au "
          "rejeu de l'événement, jamais au déchiffrement local.",
          size=12, color=INK, line_spacing=1.35)

add_text(s, MARGIN, Inches(5.2), CONTENT_W, Inches(0.3), "DEUX POINTS D'ENTRÉE POUR LE SCAN",
          size=9, color=BLUE, bold=True)
add_text(s, MARGIN, Inches(5.55), CONTENT_W, Inches(1.2),
          "Depuis une commande précise (statut « Prête »), ou directement depuis le tableau de "
          "bord commerçant : dans ce second cas, c'est le billet déchiffré lui-même qui détermine "
          "la commande ciblée, recoupée avec le cache local de la boutique pour rester utilisable "
          "hors-ligne — le rejeu anti-fraude restant de toute façon tranché côté serveur.",
          size=11, color=MUTED, line_spacing=1.3)
footer(s, 6)

# =====================================================================
# SLIDE 7 — Module 04 — Observabilité
# =====================================================================
s = add_slide()
kicker(s, "MODULE 04")
section_title(s, "Observabilité & monitoring")

rows = [
    ["Métrique", "Type", "Ce qu'elle mesure"],
    ["orders_total", "Counter", "Débit de commandes enregistrées"],
    ["creneau_reservation_duration_seconds", "Histogram", "Latence de réservation d'un créneau"],
    ["qr_validations_total{resultat}", "Counter", "Validations QR au retrait — succès vs échec"],
    ["http_requests_total", "Counter", "Taux d'erreur — mise à jour des inventaires"],
]
make_table(s, MARGIN, Inches(1.7), Inches(11.5), rows,
           [Inches(4.6), Inches(2.0), Inches(4.9)], row_h=Inches(0.5), font_size=11)

add_rect(s, MARGIN, Inches(4.35), CONTENT_W, Inches(1.9), fill=DARK_BOX, radius=0.04)
add_text(s, MARGIN + Inches(0.3), Inches(4.5), CONTENT_W - Inches(0.6), Inches(0.3),
          "ALERTE PROMETHEUS — QrValidationFailureRateHigh", size=10, color=RGBColor(0xFF, 0x8A, 0x65), bold=True)
add_text(s, MARGIN + Inches(0.3), Inches(4.9), CONTENT_W - Inches(0.6), Inches(0.7),
          'sum(rate(qr_validations_total{resultat="echec"}[5m]))\n/ sum(rate(qr_validations_total[5m])) > 0.03',
          size=11, color=DARK_BOX_TXT, font="Consolas", line_spacing=1.3)
add_text(s, MARGIN + Inches(0.3), Inches(5.65), CONTENT_W - Inches(0.6), Inches(0.5),
          "Soutenue 5 minutes, sévérité critical — notifie Slack & e-mail via Alertmanager.",
          size=11, color=RGBColor(0xC9, 0xC7, 0xBC))
footer(s, 7)

# =====================================================================
# SLIDE 8 — Qualité
# =====================================================================
s = add_slide()
kicker(s, "QUALITÉ")
section_title(s, "178 tests, zéro donnée de démo abîmée")

rows = [
    ["Sous-projet", "Unitaire", "E2E", "Total"],
    ["Backend", "77", "46", "123"],
    ["Application mobile", "30", "—", "30"],
    ["Admin-web", "15", "10", "25"],
    ["Total", "122", "56", "178"],
]
make_table(s, MARGIN, Inches(1.75), Inches(8.4), rows,
           [Inches(3.2), Inches(1.7), Inches(1.7), Inches(1.8)], row_h=Inches(0.55), font_size=13)

add_rect(s, MARGIN, Inches(4.65), Inches(8.4), Inches(1.35), fill=BLUE_LIGHT, radius=0.06)
add_text(s, MARGIN + Inches(0.25), Inches(4.82), Inches(7.9), Inches(1.05),
          "Les suites E2E (Supertest côté backend, Playwright — navigateur réel — côté "
          "admin-web) sont non destructives : chaque exécution crée ses propres comptes avec "
          "un suffixe horodaté, sans jamais toucher aux données de démonstration.",
          size=11.5, color=INK, line_spacing=1.35)

add_text(s, Inches(9.15), Inches(1.75), Inches(3.7), Inches(0.3), "AJOUTS RÉCENTS NON ENCORE TESTÉS",
          size=9, color=ORANGE, bold=True)
add_text(s, Inches(9.15), Inches(2.1), Inches(3.7), Inches(2.2),
          "Annulation de commande, scan direct depuis le tableau de bord, détail des articles "
          "à préparer : fonctionnels et vérifiés manuellement, mais sans suite de tests dédiée "
          "pour l'instant.",
          size=10.5, color=MUTED, line_spacing=1.3)
footer(s, 8)

# =====================================================================
# SLIDE 9 — Passage à la démo
# =====================================================================
s = add_slide()
kicker(s, "PASSAGE À LA DÉMO")
section_title(s, "Ce qui sera montré, et comment")

cols = [
    ("EN DIRECT", "Mode hors-ligne (Module 3)",
     "Mode avion → scan du billet → validation → retour du réseau → synchronisation. "
     "C'est le point à voir fonctionner en vrai.", BLUE),
    ("VIDÉO ENREGISTRÉE", "demo-click-and-collect.mp4 (12 min)",
     "Cycle complet client → commerçant, passage hors-ligne, et impact en direct sur le "
     "dashboard Grafana — prête à être lancée en un clic en cas de souci réseau en salle.", GREEN),
    ("RAPPORT & DASHBOARD", "Documentation-ClickAndCollect.pdf",
     "Architecture, modèle de données, endpoints, et dashboard Grafana consultable en "
     "direct (localhost:3002) pendant la soutenance.", ORANGE),
]
cw = Inches(3.85)
gap3 = Inches(0.3)
for i, (kick, title, desc, color) in enumerate(cols):
    xx = MARGIN + (cw + gap3) * i
    add_rect(s, xx, Inches(1.85), Inches(0.06), Inches(3.2), fill=color)
    add_text(s, xx + Inches(0.25), Inches(1.85), cw - Inches(0.25), Inches(0.3), kick,
              size=9, color=color, bold=True)
    add_text(s, xx + Inches(0.25), Inches(2.2), cw - Inches(0.25), Inches(0.6), title,
              size=13.5, color=INK, bold=True, line_spacing=1.2)
    add_text(s, xx + Inches(0.25), Inches(2.95), cw - Inches(0.4), Inches(2), desc,
              size=10.5, color=MUTED, line_spacing=1.35)
footer(s, 9)

# =====================================================================
# SLIDE 10 — Regard critique
# =====================================================================
s = add_slide()
kicker(s, "REGARD CRITIQUE")
section_title(s, "Limites assumées")

limits = [
    ("MODÈLE DE DONNÉES", "Commande.client_id / boutique_id",
     "Simples colonnes (varchar), pas des relations TypeORM — résolues par requêtes séparées plutôt qu'une jointure directe."),
    ("MODÉRATION", "Circuit descendant",
     "La modération est faite par l'administrateur uniquement : aucun circuit de signalement initié par un client n'existe côté mobile."),
    ("MULTI-BOUTIQUE", "boutiques[0]",
     "Le modèle de données autorise plusieurs boutiques par commerçant, mais l'interface mobile actuelle n'en gère qu'une seule."),
    ("ENVIRONNEMENT", "Configuration codée en dur",
     "API_URL à adapter par réseau ; bug connu Expo Go / iOS 26 (Hermes/PAC ARM64) — démo privilégiée sur Android."),
    ("CACHE LOCAL", "Rotation de clé non gérée",
     "Si la clé de chiffrement du cache disparaît (Keychain réinitialisé), les entrées existantes deviennent illisibles — ignorées silencieusement plutôt que de faire planter la lecture."),
]
col_w = Inches(3.75)
row_positions = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2)]
for idx, (kick, title, desc) in enumerate(limits):
    col, row = idx % 2, idx // 2
    xx = MARGIN + col * (col_w + Inches(0.4))
    yy = Inches(1.75) + row * Inches(1.7)
    add_text(s, xx, yy, col_w, Inches(0.25), kick, size=8.5, color=BLUE, bold=True)
    add_text(s, xx, yy + Inches(0.28), col_w, Inches(0.3), title, size=12.5, color=INK, bold=True)
    add_text(s, xx, yy + Inches(0.62), col_w, Inches(0.95), desc, size=9.5, color=MUTED, line_spacing=1.25)
footer(s, 10)

# =====================================================================
# SLIDE 11 — Conclusion
# =====================================================================
s = add_slide()
kicker(s, "CONCLUSION")
section_title(s, "Ce qui a été livré, ce qui suivrait")

add_text(s, MARGIN, Inches(1.75), Inches(11.5), Inches(1.1),
          "Les quatre modules du cahier des charges sont implémentés et testés, avec un mode "
          "hors-ligne robuste au cœur du produit et une chaîne d'observabilité qui va jusqu'à "
          "l'alerte Slack/e-mail.",
          size=15, color=INK, line_spacing=1.4)

roadmap = [
    "Variables d'env. pour API_URL",
    "Multi-boutique par commerçant",
    "Signalement client → modération",
    "Tests dédiés (annulation, scan direct)",
]
add_text(s, MARGIN, Inches(3.15), Inches(6), Inches(0.3), "PROCHAINES ÉTAPES", size=9, color=BLUE, bold=True)
yy = Inches(3.55)
for item in roadmap:
    add_rect(s, MARGIN, yy + Inches(0.08), Inches(0.09), Inches(0.09), fill=BLUE, radius=0.5)
    add_text(s, MARGIN + Inches(0.3), yy, Inches(6.5), Inches(0.35), item, size=12, color=INK)
    yy += Inches(0.5)
footer(s, 11)

# =====================================================================
# SLIDE 12 — Merci
# =====================================================================
s = add_slide()
add_text(s, MARGIN, Inches(3.0), Inches(11), Inches(1.2), "Merci.", size=48, color=INK, bold=True)
add_text(s, MARGIN, Inches(4.0), Inches(11), Inches(0.6), "Questions & démonstration.",
          size=18, color=MUTED)
add_line(s, MARGIN, Inches(7.05), SLIDE_W - MARGIN, Inches(7.05), color=LINE, w=0.75)
add_text(s, MARGIN, Inches(7.12), Inches(8), Inches(0.3),
          "CLICK & COLLECT LOCAL — SUJET 4 — 12/12", size=8, color=MUTED, bold=True)

prs.save("/tmp/report_build/Presentation-ClickAndCollect.pptx")
print("PPTX généré :", "/tmp/report_build/Presentation-ClickAndCollect.pptx")
