"""Integer micrometre-grid geometry: canonical mm with 0.001 mm precision.

The spacing model requires kerf separation on at least one axis for every pair.
Margins supply all edge clearance; no second kerf is added at the board edge.
Shelf first-fit decreasing area, original orientation first, deterministic ties.
This is a proposal, not a guillotine sequence or machine-feasibility guarantee.
"""
from decimal import ROUND_HALF_UP, Decimal

from rest_framework.exceptions import ValidationError


def fail(code):
    error = ValidationError("Invalid cutting geometry.")
    error.public_code = code
    raise error


def grid(value):
    return int(Decimal(value) * 1000)


def mm(value):
    return format(Decimal(value) / 1000, ".3f")


def parts(data):
    return {part["key"]: part for part in data["pieces"]}


def dimensions(part, rotated):
    w, h = grid(part["width"]), grid(part["height"])
    return (h, w) if rotated else (w, h)


def bounds(data):
    board = data["board"]
    return (grid(board["left"]), grid(board["top"]),
            grid(board["width"]) - grid(board["right"]),
            grid(board["height"]) - grid(board["bottom"]))


def validate_input(data):
    left, top, right, bottom = bounds(data)
    if left >= right or top >= bottom:
        fail("unusable_board")
    if len(parts(data)) != len(data["pieces"]):
        fail("duplicate_piece_key")
    if sum(p["quantity"] for p in data["pieces"]) > 100:
        fail("piece_limit")


def validate_layout(data, placements):
    validate_input(data)
    definitions = parts(data)
    left, top, right, bottom = bounds(data)
    kerf = grid(data["kerf"])
    occupied, seen = [], set()
    for p in placements:
        part = definitions.get(p["piece_key"])
        if part is None or p["copy"] >= part["quantity"]:
            fail("unknown_piece")
        key = (p["piece_key"], p["copy"])
        if key in seen:
            fail("duplicate_placement")
        seen.add(key)
        if p["board"] >= data["board"]["quantity"]:
            fail("unknown_board")
        if p["rotated"] and not part["rotation_allowed"]:
            fail("rotation_forbidden")
        x, y = grid(p["x"]), grid(p["y"])
        w, h = dimensions(part, p["rotated"])
        if x < left or y < top or x + w > right or y + h > bottom:
            fail("out_of_bounds")
        for other_board, ox, oy, ow, oh in occupied:
            if other_board == p["board"] and not (
                x + w + kerf <= ox or ox + ow + kerf <= x
                or y + h + kerf <= oy or oy + oh + kerf <= y
            ):
                fail("overlap_or_kerf")
        occupied.append((p["board"], x, y, w, h))


def baseline(data):
    validate_input(data)
    left, top, right, bottom = bounds(data)
    kerf = grid(data["kerf"])
    shelves = [[] for _ in range(data["board"]["quantity"])]
    ordered = sorted(data["pieces"], key=lambda p: (
        -(grid(p["width"]) * grid(p["height"])), -max(grid(p["width"]), grid(p["height"])), p["key"],
    ))
    placements = []
    for part in ordered:
        orientations = [False, True] if part["rotation_allowed"] else [False]
        for copy in range(part["quantity"]):
            position = None
            for board, rows in enumerate(shelves):
                for row in rows:
                    for rotated in orientations:
                        w, h = dimensions(part, rotated)
                        if h <= row["height"] and row["next_x"] + w <= right:
                            position = (board, row["next_x"], row["y"], rotated)
                            row["next_x"] += w + kerf
                            break
                    if position:
                        break
                if position:
                    break
                y = rows[-1]["y"] + rows[-1]["height"] + kerf if rows else top
                for rotated in orientations:
                    w, h = dimensions(part, rotated)
                    if left + w <= right and y + h <= bottom:
                        rows.append({"y": y, "height": h, "next_x": left + w + kerf})
                        position = (board, left, y, rotated)
                        break
                if position:
                    break
            if position:
                board, x, y, rotated = position
                placements.append({"piece_key": part["key"], "copy": copy, "board": board,
                                   "x": mm(x), "y": mm(y), "rotated": rotated})
    validate_layout(data, placements)
    return placements


def metrics(data, placements):
    validate_layout(data, placements)
    definitions = parts(data)
    used_boards = len({p["board"] for p in placements})
    board_area = grid(data["board"]["width"]) * grid(data["board"]["height"])
    used_area = sum(grid(definitions[p["piece_key"]]["width"]) * grid(definitions[p["piece_key"]]["height"]) for p in placements)
    required_area = sum(grid(p["width"]) * grid(p["height"]) * p["quantity"] for p in data["pieces"])
    offered_area = board_area * data["board"]["quantity"]
    selected_area = board_area * used_boards
    area = lambda value: format(Decimal(value) / 1000000, ".6f")
    counts = {}
    for p in placements:
        counts[p["piece_key"]] = counts.get(p["piece_key"], 0) + 1
    left, top, right, bottom = bounds(data)
    unplaced = []
    for p in data["pieces"]:
        count = p["quantity"] - counts.get(p["key"], 0)
        if count:
            orientations = [False, True] if p["rotation_allowed"] else [False]
            fits = any(w <= right - left and h <= bottom - top for w, h in (dimensions(p, r) for r in orientations))
            unplaced.append({"piece_key": p["key"], "quantity": count,
                             "reason": "not_placed" if fits else "cannot_fit"})
    return {
        "board_count": used_boards, "available_boards": data["board"]["quantity"],
        "placed_count": len(placements), "unplaced_count": sum(row["quantity"] for row in unplaced),
        "required_area": area(required_area), "placed_area": area(used_area),
        "board_area": area(board_area), "used_board_area": area(selected_area),
        "unused_area": area(selected_area - used_area), "available_area": area(offered_area),
        "utilization": format((Decimal(used_area) / selected_area * 100).quantize(Decimal(".001"), rounding=ROUND_HALF_UP), ".3f") if selected_area else None,
        "unplaced": unplaced, "valid": True,
    }
