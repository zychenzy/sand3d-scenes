#!/usr/bin/env python3
"""Lane plan for the bowling alley. Writes layout.json. The checker recomputes from PLAN."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PLAN = {
    "room": {"width": 14.4, "depth": 22.4, "height": 4.15},
    "x0": -2.55,
    "laneW": 1.08,
    "gutterW": 0.23,
    "returnW": 0.42,
    "pairGap": 0.36,
    "endCap": 0.16,
    "foulZ": 2.35,
    "approachEndZ": 5.78,
    "pitZ": -9.85,
    "headZ": -8.88,
    "pinSpacing": 0.3048,
    "seatZ": 6.98,
    "seatOffset": 0.64,
    "laneNumbers": [7, 8, 9, 10],
}

COUNTER_W = 0.74
COUNTER_H = 1.05
COUNTER_X = -6.27
SHOE_Z = 9.08
SHOE_D = 2.42
SNACK_Z = 5.02
SNACK_D = 2.50
RACK_W = 0.80
RACK_D = 1.08
RACK_X = -6.32
RACK_Z = 2.78
CUBBY_W = 0.34
CUBBY_X = -6.94
STOOL_X = -5.38
STOOL_ZS = (4.20, 5.02, 5.84)


def walk_lanes(plan):
    x = plan["x0"]
    order = []

    def take(kind, w, **extra):
        nonlocal x
        item = {"kind": kind, "x": round(x + w / 2, 4), "w": w, **extra}
        x += w
        order.append(item)
        return item

    take("cap", plan["endCap"])
    pair = 0
    lane_i = 0
    numbers = plan["laneNumbers"]
    while lane_i < len(numbers):
        take("lane", plan["laneW"], number=numbers[lane_i], pair=pair, side="left")
        take("gutter", plan["gutterW"], pair=pair)
        take("return", plan["returnW"], pair=pair)
        take("gutter", plan["gutterW"], pair=pair)
        take("lane", plan["laneW"], number=numbers[lane_i + 1], pair=pair, side="right")
        lane_i += 2
        pair += 1
        if lane_i < len(numbers):
            take("gap", plan["pairGap"])
    take("cap", plan["endCap"])
    return order


def build(plan=PLAN):
    room = plan["room"]
    half_w = room["width"] / 2
    half_d = room["depth"] / 2
    order = walk_lanes(plan)
    lanes = [it for it in order if it["kind"] == "lane"]
    gutters = [it for it in order if it["kind"] == "gutter"]
    returns = [it for it in order if it["kind"] == "return"]
    caps = [it for it in order if it["kind"] == "cap"]
    gaps = [it for it in order if it["kind"] == "gap"]
    foul = plan["foulZ"]
    pit = plan["pitZ"]
    approach = plan["approachEndZ"]
    for it in lanes:
        it.update({"foulZ": foul, "pitZ": pit, "headZ": plan["headZ"], "id": f"lane{it['number']}"})
    for index, it in enumerate(gutters):
        it.update({"foulZ": foul, "pitZ": pit, "id": f"gutter{index}"})
    for it in returns:
        it.update({"foulZ": foul, "pitZ": pit, "id": f"return{it['pair']}"})
    for index, it in enumerate(caps):
        it.update({"foulZ": foul, "pitZ": pit, "id": f"cap{index}"})
    for index, it in enumerate(gaps):
        it.update({"foulZ": foul, "pitZ": pit, "id": f"gap{index}"})

    approaches = []
    pairs = []
    for pair in range(2):
        group = [it for it in lanes if it["pair"] == pair]
        left = min(it["x"] - it["w"] / 2 for it in group)
        right = max(it["x"] + it["w"] / 2 for it in group)
        # include the gutters and the return between the two lanes
        ret = next(it for it in returns if it["pair"] == pair)
        span_l = min(left, ret["x"] - ret["w"] / 2 - plan["gutterW"])
        span_r = max(right, ret["x"] + ret["w"] / 2 + plan["gutterW"])
        center = (span_l + span_r) / 2
        width = span_r - span_l
        approaches.append({
            "id": f"approach{pair}",
            "pair": pair,
            "x": round(center, 4),
            "w": round(width, 4),
            "z0": foul,
            "z1": approach,
        })
        pairs.append({"pair": pair, "x": round(center, 4), "returnX": ret["x"], "lanes": [it["number"] for it in group]})

    blocks = []
    blocks.append({
        "id": "shoe_counter", "kind": "counter", "label": "SHOES",
        "x": COUNTER_X, "z": SHOE_Z, "w": COUNTER_W, "h": COUNTER_H, "d": SHOE_D,
        "yaw": 0, "facing": "+x", "color": "#2c3338", "top": "#1a1e22", "accent": "#c2a06a",
    })
    blocks.append({
        "id": "snack_counter", "kind": "counter", "label": "SNACKS",
        "x": COUNTER_X, "z": SNACK_Z, "w": COUNTER_W, "h": COUNTER_H, "d": SNACK_D,
        "yaw": 0, "facing": "+x", "color": "#3a2a24", "top": "#6a4328", "accent": "#e6d2a2",
    })
    blocks.append({
        "id": "shoe_cubbies", "kind": "cubby",
        "x": CUBBY_X, "z": SHOE_Z, "w": CUBBY_W, "h": 1.92, "d": SHOE_D - 0.12,
        "yaw": 0, "facing": "+x", "cols": 4, "rows": 3,
    })
    blocks.append({
        "id": "ball_rack", "kind": "rack",
        "x": RACK_X, "z": RACK_Z, "w": RACK_W, "h": 1.28, "d": RACK_D,
        "yaw": 0, "facing": "+x",
    })
    for pair, meta in enumerate(pairs):
        blocks.append({
            "id": f"tray_{pair}", "kind": "tray", "pair": pair,
            "x": meta["returnX"], "z": round(foul + 0.62, 4), "w": plan["returnW"], "h": 0.56, "d": 1.18,
            "yaw": 0, "facing": "+z",
        })
        blocks.append({
            "id": f"console_{pair}", "kind": "console", "pair": pair,
            "lanes": meta["lanes"], "elevated": True,
            "x": meta["returnX"], "z": round(foul + 0.78, 4), "w": 0.72, "h": 0.46, "d": 0.10,
            "y": 1.02, "yaw": 0, "facing": "+z",
        })
        blocks.append({
            "id": f"masking_{pair}", "kind": "masking", "pair": pair,
            "lanes": meta["lanes"], "elevated": True,
            "x": meta["x"], "z": -10.28, "w": round(approaches[pair]["w"], 4), "h": 1.85, "d": 0.08,
            "y": 0.72, "yaw": 0, "facing": "+z",
        })
        blocks.append({
            "id": f"hood_{pair}", "kind": "hood", "pair": pair, "elevated": True,
            "x": meta["x"], "z": -10.68, "w": round(approaches[pair]["w"] - 0.08, 4), "h": 2.15, "d": 0.48,
            "y": 0.0, "yaw": 0, "facing": "+z",
        })
    blocks.append({
        "id": "menu_board", "kind": "sign", "elevated": True, "text": "menu", "face": "+z",
        "x": COUNTER_X + 0.02, "z": round(SNACK_Z + SNACK_D / 2 - 0.06, 4),
        "w": 0.96, "h": 0.74, "d": 0.05,
        "y": 1.12, "yaw": 0, "facing": "+z",
    })
    blocks.append({
        "id": "shoe_sign", "kind": "sign", "elevated": True, "text": "shoes",
        "x": COUNTER_X - 0.08, "z": SHOE_Z + 0.15, "w": 0.06, "h": 0.42, "d": 1.35,
        "y": 2.15, "yaw": 0, "facing": "+x",
    })

    clear = [
        {"id": "concourse", "min": [-4.35, 7.58], "max": [6.15, 10.85]},
        {"id": "left_aisle", "min": [-4.48, 2.10], "max": [-2.88, 7.58]},
    ]
    for lane in lanes:
        clear.append({
            "id": f"approach_{lane['number']}",
            "min": [round(lane["x"] - lane["w"] / 2 + 0.04, 4), foul],
            "max": [round(lane["x"] + lane["w"] / 2 - 0.04, 4), approach],
        })

    floors = [
        {"id": "service_tile", "x": -5.95, "z": 6.55, "w": 2.45, "d": 9.1, "color": "#cfc6b8"},
        {"id": "concourse_carpet", "x": 0.9, "z": 9.15, "w": 10.3, "d": 3.55, "color": "#6e2438"},
        {"id": "carpet_border", "x": 0.9, "z": 7.55, "w": 10.3, "d": 0.16, "color": "#4a1828"},
    ]

    instances = []
    colors = ["#c4232a", "#1d4e89", "#5c2d82", "#1a1a1a", "#e07a1f", "#1f7a4d", "#b01e6a", "#d4a017", "#0e6b6b"]
    color_i = 0

    def paint():
        nonlocal color_i
        c = colors[color_i % len(colors)]
        color_i += 1
        return c

    for pair, meta in enumerate(pairs):
        tray = next(b for b in blocks if b["id"] == f"tray_{pair}")
        for slot, dz in enumerate((-0.32, 0.0, 0.32)):
            instances.append({
                "id": f"ball_t{pair}_{slot}",
                "kind": "house_ball",
                "position": [round(meta["returnX"], 4), 0.38, round(tray["z"] + dz, 4)],
                "rotationY": round(0.4 + slot * 0.7 + pair, 4),
                "color": paint(),
                "rest": tray["id"],
            })
        for side, sign in (("l", -1), ("r", 1)):
            instances.append({
                "id": f"seat_{pair}{side}",
                "kind": "lane_seat",
                "position": [round(meta["x"] + sign * plan["seatOffset"], 4), 0, plan["seatZ"]],
                "rotationY": 0,
                "faces": "pins",
            })
        instances.append({
            "id": f"table_{pair}",
            "kind": "drink_table",
            "position": [meta["x"], 0, plan["seatZ"]],
            "rotationY": 0,
        })
        instances.append({
            "id": f"mug_{pair}",
            "kind": "cup_mug",
            "position": [meta["x"], 0.52, plan["seatZ"] + 0.02],
            "rotationY": 0.6,
            "rest": f"table_{pair}",
        })

    row_step = plan["pinSpacing"] * math.sin(math.radians(60))
    for lane in lanes:
        for row in range(4):
            count = row + 1
            z = plan["headZ"] - row * row_step
            for i in range(count):
                x = lane["x"] + (i - (count - 1) / 2) * plan["pinSpacing"]
                instances.append({
                    "id": f"pin_{lane['number']}_{row}_{i}",
                    "kind": "bowling_pin",
                    "position": [round(x, 4), 0, round(z, 4)],
                    "rotationY": round(((row + i) % 5) * 0.15, 4),
                    "lane": lane["number"],
                })

    rack_colors_done = 0
    shelf_y = (0.215, 0.575, 0.935)
    for s, y in enumerate(shelf_y):
        cols = 2 if s == 2 else 3
        xs = (-0.22, 0.22) if cols == 2 else (-0.26, 0.0, 0.26)
        for c, dx in enumerate(xs):
            instances.append({
                "id": f"ball_r{rack_colors_done}",
                "kind": "house_ball",
                "position": [round(RACK_X + dx, 4), y, round(RACK_Z + (0.22 if s == 1 else -0.08), 4)],
                "rotationY": round(0.5 * rack_colors_done, 4),
                "color": paint(),
                "rest": "ball_rack",
            })
            rack_colors_done += 1

    for index, z in enumerate(STOOL_ZS):
        instances.append({
            "id": f"stool_{index}",
            "kind": "bar_stool",
            "position": [STOOL_X, 0, z],
            "rotationY": -math.pi / 2,
            "faces": "snack_counter",
        })

    instances.append({
        "id": "register",
        "kind": "cash_register",
        "position": [COUNTER_X + 0.02, COUNTER_H, SHOE_Z - 0.35],
        "rotationY": math.pi / 2,
        "faces": "+x",
        "rest": "shoe_counter",
    })
    instances.append({
        "id": "pos",
        "kind": "pos_terminal",
        "position": [COUNTER_X + 0.06, COUNTER_H, SNACK_Z + 0.55],
        "rotationY": math.pi / 2,
        "faces": "+x",
        "rest": "snack_counter",
    })
    instances.append({
        "id": "snack_mug",
        "kind": "cup_mug",
        "position": [COUNTER_X + 0.08, COUNTER_H, SNACK_Z - 0.55],
        "rotationY": 0.2,
        "rest": "snack_counter",
    })
    instances.append({
        "id": "counter_plant",
        "kind": "flowerpot",
        "position": [COUNTER_X - 0.02, COUNTER_H, SNACK_Z + 0.95],
        "rotationY": 0.3,
        "rest": "snack_counter",
    })
    for index, (x, z) in enumerate(((-5.05, 4.05), (-4.85, 9.55))):
        instances.append({
            "id": f"pendant_{index}",
            "kind": "pendant_lamp",
            "position": [x, 3.42, z],
            "rotationY": 0,
            "elevated": True,
        })

    # round floats that math.pi introduced
    for inst in instances:
        inst["position"] = [round(v, 4) for v in inst["position"]]
        if "rotationY" in inst:
            inst["rotationY"] = round(inst["rotationY"], 6)

    pair0 = pairs[0]
    layout = {
        "meta": {
            "title": "North Pins bowling alley",
            "units": "metres",
            "style": "Toon hard",
            "room": room,
            "notes": [
                "Four-lane house alley. Lane width is a real 1.08 m bed; length is shortened so the approach and the pin deck share one cutaway.",
                "Pins at -Z. Seats face the pins. Shoe and snack counters face +X onto the concourse. Ball returns and scoring screens face the bowler (+Z).",
            ],
        },
        "plan": plan,
        "pairs": pairs,
        "lanes": lanes,
        "gutters": gutters,
        "returns": returns,
        "caps": caps,
        "gaps": gaps,
        "approaches": approaches,
        "floors": floors,
        "blocks": blocks,
        "clear": clear,
        "assets": {
            "bowling_pin": {"glb": "assets/bowling_pin__40a52bb7b68b.glb", "targetHeight": 0.381},
            "house_ball": {"glb": "assets/house_ball.glb", "targetHeight": 0.216},
            "lane_seat": {"glb": "assets/lane_seat.glb", "targetHeight": 0.842},
            "drink_table": {"glb": "assets/drink_table.glb", "targetHeight": 0.52},
            "bar_stool": {"glb": "assets/bar_stool__319fcb56afe8.glb", "targetHeight": 0.74},
            "cash_register": {"glb": "assets/cash_register__870f6ebb115a.glb", "targetHeight": 0.24},
            "pos_terminal": {"glb": "assets/pos_terminal__91c277a25bc3.glb", "targetHeight": 0.16},
            "cup_mug": {"glb": "assets/cup_mug__6da6f7f87b8d.glb", "targetHeight": 0.09},
            "pendant_lamp": {"glb": "assets/pendant_lamp__1b528c6ab04e.glb", "targetHeight": 0.62},
            "flowerpot": {"glb": "assets/flowerpot__4a270f247734.glb", "targetHeight": 0.26},
        },
        "instances": instances,
        "shell": {
            "floorColor": "#3a3532",
            "wallColor": "#1e3330",
            "wainscot": "#6a3b2c",
            "woodColor": "#5a3a28",
            "ceilingColor": "#2a2422",
            "clearColor": "#d5dde2",
            "fogColor": "#d5dde2",
            "fogNear": 22,
            "fogFar": 46,
        },
        "camera": {
            "fov": 50,
            "position": [4.15, 4.85, 12.15],
            "target": [-1.05, 0.62, 1.05],
        },
        "cameraPresets": {
            "corner": {
                "position": [6.55, 2.15, -6.35],
                "target": [-0.9, 0.55, -8.55],
            },
            "close": {
                "position": [pair0["returnX"] + 1.15, 1.78, foul + 1.55],
                "target": [pair0["returnX"], 0.48, foul + 0.45],
            },
        },
        "lights": {
            "hemi": {"sky": 15921908, "ground": 3810082, "intensity": 0.48},
            "key": {
                "color": 16774630,
                "intensity": 1.72,
                "position": [8.5, 14.5, 10.5],
                "shadow": {"left": -14, "right": 14, "top": 14, "bottom": -14, "near": 1, "far": 42, "map": 4096, "bias": -0.0003, "normalBias": 0.04},
            },
            "fill": {"color": 9085108, "intensity": 0.32, "position": [-9, 7, 3]},
        },
        "dimensions": {
            "counterH": COUNTER_H,
            "stoolH": 0.74,
            "pinH": 0.381,
            "ballD": 0.216,
        },
    }
    # cameras got raw floats
    layout["cameraPresets"]["close"]["position"] = [round(v, 4) for v in layout["cameraPresets"]["close"]["position"]]
    layout["cameraPresets"]["close"]["target"] = [round(v, 4) for v in layout["cameraPresets"]["close"]["target"]]
    return layout


def main():
    layout = build()
    path = ROOT / "layout.json"
    path.write_text(json.dumps(layout, indent=2) + "\n")
    print(f"wrote {path}")
    print("lanes", [(l["number"], l["x"]) for l in layout["lanes"]])
    print("returns", [(r["pair"], r["x"]) for r in layout["returns"]])
    print("pairs", layout["pairs"])
    print("instances", len(layout["instances"]), "blocks", len(layout["blocks"]))
    print("room", layout["meta"]["room"], "x extent", layout["plan"]["x0"], "to", round(layout["plan"]["x0"] + 2 * layout["plan"]["endCap"] + 2 * (2 * layout["plan"]["laneW"] + 2 * layout["plan"]["gutterW"] + layout["plan"]["returnW"]) + layout["plan"]["pairGap"], 3))


if __name__ == "__main__":
    main()
