#!/usr/bin/env python3
"""Build the offline review gallery, contact sheets, and artifact bundle.

Reads committed shots and this folder's captured/ stills. Does not edit scene directories.
"""
from __future__ import annotations

import json
import os
import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[3]
REVIEW = Path(__file__).resolve().parents[1]
ART = Path("/opt/cursor/artifacts/indoor-review-20261113")
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_B = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")

VIEWS = ("default", "corner", "close", "unlit")
CANON = {
    "default": "toon_default.png",
    "corner": "toon_corner.png",
    "close": "toon_close.png",
    "unlit": "unlit_default.png",
}
ALIASES = {
    "default": ["toon_default.png", "train_default.png", "chocolatier_default.png", "station-lounge_toon_default.png"],
    "corner": ["toon_corner.png", "train_corner.png", "chocolatier_corner.png", "station-lounge_toon_corner.png"],
    "close": ["toon_close.png", "toon_bar_close.png", "train_close.png", "chocolatier_close.png", "station-lounge_toon_close.png"],
    "unlit": ["unlit_default.png", "train_unlit.png", "chocolatier_unlit.png", "station-lounge_unlit_default.png"],
}

# Scenes whose stills were actually opened while writing PRIOR_INDOOR_FEEDBACK.md.
OPENED = {
    "cafe": ["default", "close"],
    "boardgame": ["default"],
    "train": ["default", "unlit"],
    "restaurant": ["default", "unlit"],
    "museum": ["default", "unlit"],
    "ktv": ["default", "unlit"],
    "cinema": ["default", "unlit"],
    "library": ["default", "unlit"],
    "cowork": ["default"],
    "lounge": ["default", "unlit"],
    "gym": ["unlit"],
    "workshop": ["default"],
    "greenhouse": ["default"],
    "prior-cafe": ["default", "unlit"],
    "prior-train": ["default", "unlit"],
    "prior-museum": ["default"],
    "prior-ktv": ["default", "unlit"],
    "prior-cinema": ["default"],
    "prior-library": ["default"],
    "prior-greenhouse": ["default", "unlit"],
    "prior-restaurant": ["default", "unlit"],
    "sprint-bakery": ["default"],
    "sprint-textile-studio": ["default"],
    "sprint-jewelry-workshop": ["default"],
    "sprint-dining-car": ["default"],
    "sprint-squash-court": ["default"],
    "sprint-screening-room": ["unlit"],
    "sprint-arcade": ["default", "unlit"],
    "sprint-architecture-office": ["default"],
    "sprint-blackbox-theatre": ["unlit"],
}


def font(size, bold=False):
    path = FONT_B if bold and FONT_B.exists() else FONT
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def title_of(scene_dir: Path) -> str:
    readme = scene_dir / "README.md"
    if not readme.exists():
        return scene_dir.name
    for line in readme.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line.startswith("#"):
            return line.lstrip("#").strip()
    return scene_dir.name


def classify(rel: str):
    if rel.startswith("experiments/prior-upgrade-20261110/"):
        slug = rel.split("/")[-1]
        return "prior-upgrade", "Prior upgrade", f"prior-{slug}", f"../prior-upgrade-20261110/{slug}"
    if rel.startswith("experiments/sprint-20261110/"):
        slug = rel.split("/")[-1]
        return "sprint", "Sprint", f"sprint-{slug}", f"../sprint-20261110/{slug}"
    return "original", "Root v1", rel, f"../../{rel}"


def find_scenes():
    rows = []
    for dirpath, dirs, files in os.walk(REPO):
        if ".git" in Path(dirpath).parts:
            continue
        if "index.html" not in files:
            continue
        scene = Path(dirpath)
        rel = scene.relative_to(REPO).as_posix()
        if rel.startswith("experiments/indoor-review-20261113"):
            continue
        js = [f for f in files if f.endswith(".js")]
        if not js:
            continue
        rows.append(scene)
    return sorted(rows, key=lambda p: p.relative_to(REPO).as_posix())


def resolve_shot(scene: Path, view: str, cap_slug: str):
    shots = scene / "shots"
    canon = CANON[view]
    if (shots / canon).is_file():
        return shots / canon, "committed", canon
    for name in ALIASES[view]:
        if (shots / name).is_file():
            return shots / name, "alias", name
    cap = REVIEW / "captured" / cap_slug / canon
    if cap.is_file():
        return cap, "captured", canon
    return None, "missing", canon


def repo_src(path: Path | None, scene: Path, cap_slug: str):
    if path is None:
        return None
    if "captured" in path.parts and REVIEW in path.parents:
        return f"captured/{cap_slug}/{path.name}"
    rel = path.relative_to(REPO).as_posix()
    # gallery.html lives in REVIEW, so prefix ../ or ../../
    return os.path.relpath(path, REVIEW).replace(os.sep, "/")


def build_records():
    records = []
    for scene in find_scenes():
        rel = scene.relative_to(REPO).as_posix()
        version, version_label, sid, _ = classify(rel)
        shots = {}
        for view in VIEWS:
            path, origin, filename = resolve_shot(scene, view, sid)
            shots[view] = {
                "src": repo_src(path, scene, sid),
                "abs": str(path) if path else None,
                "origin": origin,
                "filename": filename,
            }
        records.append({
            "id": sid,
            "version": version,
            "versionLabel": version_label,
            "title": title_of(scene),
            "path": rel + ("/" if not rel.endswith("/") else ""),
            "opened": OPENED.get(sid, []),
            "shots": shots,
        })
    return records


def gallery_html(records, image_mode: str):
    """image_mode: 'repo' uses record src; 'bundle' uses shots/<id>/<view>.png"""
    payload = []
    for rec in records:
        shots = {}
        for view, shot in rec["shots"].items():
            if image_mode == "bundle":
                src = f"shots/{rec['id']}/{view}.png" if shot["abs"] else None
            else:
                src = shot["src"]
            shots[view] = {
                "src": src,
                "origin": shot["origin"],
                "filename": shot["filename"],
            }
        payload.append({
            "id": rec["id"],
            "version": rec["version"],
            "versionLabel": rec["versionLabel"],
            "title": rec["title"],
            "path": rec["path"],
            "opened": rec["opened"],
            "shots": shots,
        })
    n = len(payload)
    canonical = sum(1 for r in payload if all(r["shots"][v]["origin"] == "committed" for v in VIEWS))
    any_missing = sum(1 for r in payload if any(r["shots"][v]["origin"] == "missing" for v in VIEWS))
    data = json.dumps(payload, ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Indoor review · {n} merged scenes</title>
  <style>
    :root {{
      --bg: #f4f0e8; --ink: #1c1915; --muted: #5e564c; --card: #fffdf8;
      --line: #e2d9cc; --accent: #8a3d2f;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 "Liberation Sans", "DejaVu Sans", sans-serif; }}
    header {{ padding: 22px 22px 8px; max-width: 1280px; }}
    h1 {{ margin: 0 0 6px; font-size: 26px; letter-spacing: -0.02em; }}
    header p {{ margin: 0 0 8px; color: var(--muted); max-width: 78ch; }}
    .counts {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }}
    .counts span {{ background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; font-size: 13px; }}
    .bar {{ display: flex; flex-wrap: wrap; gap: 8px; padding: 0 22px 14px; align-items: center; position: sticky; top: 0; background: rgba(244,240,232,0.94); z-index: 2; }}
    input[type="search"] {{ flex: 1; min-width: 200px; border: 1px solid var(--line); background: white; border-radius: 8px; padding: 8px 10px; font: inherit; }}
    button.chip, .viewbtn {{ border: 1px solid var(--line); background: white; border-radius: 999px; padding: 6px 10px; cursor: pointer; font: inherit; }}
    button.chip[aria-pressed="true"], .viewbtn[aria-pressed="true"] {{ background: var(--ink); color: white; border-color: var(--ink); }}
    #grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; padding: 0 22px 40px; }}
    article {{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; cursor: pointer; }}
    article img, .ph {{ width: 100%; aspect-ratio: 16/10; object-fit: cover; background: #ddd6cc; display: block; }}
    .ph {{ display: grid; place-items: center; color: var(--muted); font-size: 13px; }}
    .meta {{ padding: 8px 10px 10px; }}
    .meta strong {{ display: block; font-size: 14px; }}
    .meta small {{ color: var(--muted); }}
    .badge {{ display: inline-block; margin-top: 4px; margin-right: 4px; font-size: 11px; border-radius: 999px; padding: 2px 6px; background: #efe7db; }}
    .badge.warn {{ background: #f3d6cf; }}
    .badge.ok {{ background: #dcead8; }}
    #light {{ position: fixed; inset: 0; background: rgba(20,16,12,0.86); display: none; z-index: 5; }}
    #light.open {{ display: grid; grid-template-rows: auto 1fr auto; }}
    #light header {{ color: white; max-width: none; display: flex; justify-content: space-between; gap: 12px; align-items: end; }}
    #light h2 {{ margin: 0; font-size: 20px; }}
    #light p {{ color: #ddd4c6; }}
    #stage {{ display: grid; place-items: center; padding: 8px 18px; }}
    #stage img {{ max-width: min(1200px, 92vw); max-height: 72vh; background: #111; }}
    #light footer {{ display: flex; gap: 8px; justify-content: center; padding: 10px 12px 18px; flex-wrap: wrap; }}
    kbd {{ border: 1px solid #ccc; border-bottom-width: 2px; border-radius: 4px; padding: 0 4px; font-size: 12px; }}
  </style>
</head>
<body>
  <header>
    <h1>Merged indoor scenes</h1>
    <p>Image-first review of the indoor scenes on <code>main</code>. This is not a 59-shot gallery and it does not cover a supposed set of 80 graded versions from an older review. There is no score. Metadata is embedded in this file, so opening it with <code>file://</code> does not need <code>fetch</code>.</p>
    <div class="counts">
      <span>{n} scene directories</span>
      <span>{canonical} with all four canonical filenames committed</span>
      <span>{any_missing} still missing at least one view after alias and capture</span>
    </div>
    <p>Keys: <kbd>←</kbd> <kbd>→</kbd> scene, <kbd>1</kbd> default, <kbd>2</kbd> corner, <kbd>3</kbd> close, <kbd>4</kbd> unlit, <kbd>Esc</kbd> close. Root v1, prior-upgrade, and sprint scenes are different versions. A sprint room is not an upgrade of a root room unless the path says prior-upgrade.</p>
  </header>
  <div class="bar">
    <input id="q" type="search" placeholder="Search title or path" />
    <button class="chip" data-filter="all" aria-pressed="true">All</button>
    <button class="chip" data-filter="original">Root v1</button>
    <button class="chip" data-filter="prior-upgrade">Prior upgrade</button>
    <button class="chip" data-filter="sprint">Sprint</button>
    <button class="chip" data-filter="gap">Missing a view</button>
    <button class="chip" data-filter="opened">Opened in the write-up</button>
  </div>
  <div id="grid"></div>
  <div id="light" role="dialog" aria-modal="true">
    <header>
      <div>
        <h2 id="ltitle"></h2>
        <p id="lpath"></p>
      </div>
      <button id="lclose" class="chip" type="button">Close</button>
    </header>
    <div id="stage"></div>
    <footer>
      <button class="viewbtn" data-view="default" type="button">Default</button>
      <button class="viewbtn" data-view="corner" type="button">Corner</button>
      <button class="viewbtn" data-view="close" type="button">Close-up</button>
      <button class="viewbtn" data-view="unlit" type="button">Unlit</button>
      <button id="prev" class="chip" type="button">Previous</button>
      <button id="next" class="chip" type="button">Next</button>
    </footer>
  </div>
  <script>
const SCENES = {data};
const VIEWS = ["default", "corner", "close", "unlit"];
let filter = "all";
let query = "";
let index = 0;
let view = "default";
const grid = document.getElementById("grid");
const light = document.getElementById("light");

function visible() {{
  const q = query.trim().toLowerCase();
  return SCENES.filter((s) => {{
    if (filter === "gap" && VIEWS.every((v) => s.shots[v].origin !== "missing")) return false;
    if (filter === "opened" && !s.opened.length) return false;
    if (filter !== "all" && filter !== "gap" && filter !== "opened" && s.version !== filter) return false;
    if (!q) return true;
    return (s.title + " " + s.path + " " + s.id + " " + s.versionLabel).toLowerCase().includes(q);
  }});
}}

function esc(s) {{
  return String(s).replace(/[&<>"]/g, (c) => ({{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}}[c]));
}}

function badge(origin) {{
  if (origin === "committed") return "";
  if (origin === "missing") return '<span class="badge warn">missing</span>';
  if (origin === "alias") return '<span class="badge warn">renamed file</span>';
  if (origin === "captured") return '<span class="badge ok">captured here</span>';
  return "";
}}

function render() {{
  const rows = visible();
  grid.innerHTML = rows.map((s, i) => {{
    const shot = s.shots.default.src ? s.shots.default : (s.shots.unlit.src ? s.shots.unlit : null);
    const img = shot && shot.src
      ? `<img alt="" src="${{shot.src}}" />`
      : `<div class="ph">No default still</div>`;
    const missing = VIEWS.filter((v) => s.shots[v].origin === "missing").length;
    return `<article data-id="${{esc(s.id)}}">
      ${{img}}
      <div class="meta">
        <strong>${{esc(s.title)}}</strong>
        <small>${{esc(s.path)}}</small><br>
        <span class="badge">${{s.versionLabel}}</span>
        ${{missing ? `<span class="badge warn">${{missing}} view${{missing>1?"s":""}} missing</span>` : ""}}
        ${{s.opened.length ? `<span class="badge ok">opened</span>` : ""}}
      </div>
    </article>`;
  }}).join("");
  grid.querySelectorAll("article").forEach((el) => {{
    el.addEventListener("click", () => openId(el.dataset.id));
  }});
}}

function listIndex(id) {{
  const rows = visible();
  return Math.max(0, rows.findIndex((s) => s.id === id));
}}

function openId(id) {{
  index = listIndex(id);
  view = "default";
  light.classList.add("open");
  show();
}}

function current() {{
  const rows = visible();
  if (!rows.length) return null;
  index = (index + rows.length) % rows.length;
  return rows[index];
}}

function show() {{
  const s = current();
  if (!s) return;
  document.getElementById("ltitle").textContent = s.title;
  const shot = s.shots[view];
  const note = shot.origin === "missing"
    ? "No image for this view."
    : `${{s.versionLabel}} · ${{view}} · ${{shot.origin}} · ${{shot.filename}}`;
  document.getElementById("lpath").textContent = s.path + " — " + note;
  const stage = document.getElementById("stage");
  stage.innerHTML = shot.src
    ? `<img alt="${{s.title}} ${{view}}" src="${{shot.src}}" />`
    : `<div class="ph" style="width:60vw;height:40vh">No ${{view}} still</div>`;
  document.querySelectorAll(".viewbtn").forEach((b) => {{
    b.setAttribute("aria-pressed", b.dataset.view === view ? "true" : "false");
  }});
}}

document.getElementById("q").addEventListener("input", (e) => {{ query = e.target.value; render(); }});
document.querySelectorAll(".bar .chip").forEach((b) => {{
  b.addEventListener("click", () => {{
    filter = b.dataset.filter;
    document.querySelectorAll(".bar .chip").forEach((c) => c.setAttribute("aria-pressed", c === b ? "true" : "false"));
    render();
  }});
}});
document.querySelectorAll(".viewbtn").forEach((b) => b.addEventListener("click", () => {{ view = b.dataset.view; show(); }}));
document.getElementById("prev").addEventListener("click", () => {{ index -= 1; show(); }});
document.getElementById("next").addEventListener("click", () => {{ index += 1; show(); }});
document.getElementById("lclose").addEventListener("click", () => light.classList.remove("open"));
window.addEventListener("keydown", (e) => {{
  if (e.key === "/" && document.activeElement.id !== "q") {{ e.preventDefault(); document.getElementById("q").focus(); return; }}
  if (!light.classList.contains("open")) return;
  if (e.key === "Escape") light.classList.remove("open");
  if (e.key === "ArrowRight") {{ index += 1; show(); }}
  if (e.key === "ArrowLeft") {{ index -= 1; show(); }}
  if (e.key === "1") {{ view = "default"; show(); }}
  if (e.key === "2") {{ view = "corner"; show(); }}
  if (e.key === "3") {{ view = "close"; show(); }}
  if (e.key === "4") {{ view = "unlit"; show(); }}
}});
render();
  </script>
</body>
</html>
"""


def thumb(path, size):
    im = Image.open(path).convert("RGB")
    im.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, (232, 226, 216))
    x = (size[0] - im.width) // 2
    y = (size[1] - im.height) // 2
    canvas.paste(im, (x, y))
    return canvas


def blank(size, label):
    im = Image.new("RGB", size, (214, 206, 196))
    d = ImageDraw.Draw(im)
    d.multiline_text((12, size[1] // 2 - 16), label, fill=(90, 80, 70), font=font(16))
    return im


def contact_grid(cells, cols, thumb_size, out, title):
    label_h = 44
    pad = 10
    tw, th = thumb_size
    rows = (len(cells) + cols - 1) // cols
    width = pad + cols * (tw + pad)
    height = 56 + pad + rows * (th + label_h + pad)
    sheet = Image.new("RGB", (width, height), (244, 240, 232))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 14), title, fill=(28, 25, 21), font=font(22, bold=True))
    for i, cell in enumerate(cells):
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = 56 + r * (th + label_h + pad)
        if cell.get("abs"):
            sheet.paste(thumb(cell["abs"], thumb_size), (x, y))
        else:
            sheet.paste(blank(thumb_size, "no still"), (x, y))
        d.text((x, y + th + 4), cell["label"][:42], fill=(28, 25, 21), font=font(13, bold=True))
        d.text((x, y + th + 22), cell.get("sub", "")[:42], fill=(90, 80, 70), font=font(12))
    sheet.save(out, optimize=True)
    print("sheet", out, sheet.size)


def main():
    records = build_records()
    (REVIEW / "gallery.html").write_text(gallery_html(records, "repo"), encoding="utf-8")
    summary = {
        "scenes": len(records),
        "canonicalFourCommitted": sum(1 for r in records if all(r["shots"][v]["origin"] == "committed" for v in VIEWS)),
        "missingAny": sum(1 for r in records if any(r["shots"][v]["origin"] == "missing" for v in VIEWS)),
        "byOrigin": {},
    }
    for r in records:
        for v in VIEWS:
            o = r["shots"][v]["origin"]
            summary["byOrigin"][o] = summary["byOrigin"].get(o, 0) + 1
    (REVIEW / "coverage.json").write_text(json.dumps({"summary": summary, "scenes": [
        {"id": r["id"], "path": r["path"], "version": r["version"], "title": r["title"],
         "shots": {v: {"origin": r["shots"][v]["origin"], "filename": r["shots"][v]["filename"]} for v in VIEWS}}
        for r in records
    ]}, indent=2), encoding="utf-8")

    # Historical comparison sheet
    hist_ids = ["cafe", "train", "restaurant", "museum", "ktv", "cinema"]
    by_id = {r["id"]: r for r in records}
    hist_cells = []
    for name in hist_ids:
        for prefix, tag in (("", "root"), ("prior-", "prior")):
            rec = by_id[prefix + name]
            for view, short in (("default", "toon"), ("unlit", "unlit")):
                shot = rec["shots"][view]
                hist_cells.append({
                    "abs": shot["abs"],
                    "label": f"{name} · {tag}",
                    "sub": f"{short} · {shot['origin']}",
                })
    contact_grid(hist_cells, 4, (360, 225), REVIEW / "contact-historical.png",
                 "Historical set — root v1 and prior upgrade, toon then unlit")

    default_cells = []
    for rec in records:
        shot = rec["shots"]["default"]
        default_cells.append({
            "abs": shot["abs"],
            "label": rec["title"][:40],
            "sub": f"{rec['versionLabel']} · {shot['origin']}",
        })
    contact_grid(default_cells, 8, (240, 150), REVIEW / "contact-defaults.png",
                 "All merged indoor scenes — default still (or none)")

    captured_cells = []
    for rec in records:
        shot = rec["shots"]["default"]
        if shot["origin"] != "captured":
            continue
        captured_cells.append({
            "abs": shot["abs"],
            "label": rec["title"][:40],
            "sub": rec["versionLabel"],
        })
    if captured_cells:
        contact_grid(captured_cells, 5, (360, 225), REVIEW / "contact-captured.png",
                     "Defaults captured for this review — scenes that had no committed still")

    # Artifact bundle with copied images so it opens away from the repo.
    if ART.exists():
        shutil.rmtree(ART)
    ART.mkdir(parents=True)
    for rec in records:
        dest_dir = ART / "shots" / rec["id"]
        dest_dir.mkdir(parents=True)
        for view, shot in rec["shots"].items():
            if shot["abs"]:
                shutil.copy2(shot["abs"], dest_dir / f"{view}.png")
    (ART / "gallery.html").write_text(gallery_html(records, "bundle"), encoding="utf-8")
    for name in ("contact-historical.png", "contact-defaults.png", "contact-captured.png", "PRIOR_INDOOR_FEEDBACK.md", "QA.md", "README.md"):
        src = REVIEW / name
        if src.exists():
            shutil.copy2(src, ART / name)
    # stable names for the two sheets and the gallery link
    shutil.copy2(REVIEW / "contact-historical.png", Path("/opt/cursor/artifacts") / "indoor-review-contact-historical.png")
    shutil.copy2(REVIEW / "contact-defaults.png", Path("/opt/cursor/artifacts") / "indoor-review-contact-defaults.png")
    cap_sheet = REVIEW / "contact-captured.png"
    if cap_sheet.exists():
        shutil.copy2(cap_sheet, Path("/opt/cursor/artifacts") / "indoor-review-contact-captured.png")
    zip_path = Path("/opt/cursor/artifacts") / "indoor-review-20261113.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in ART.rglob("*"):
            if p.is_file():
                zf.write(p, p.relative_to(ART.parent).as_posix())
    print(json.dumps(summary, indent=2))
    print("gallery", REVIEW / "gallery.html")
    print("zip", zip_path, zip_path.stat().st_size)


if __name__ == "__main__":
    main()
