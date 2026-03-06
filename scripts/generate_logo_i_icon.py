from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "assets" / "branding"
PNG_PATH = OUTPUT_DIR / "unique_record_logo_i_1024.png"
ICO_PATH = OUTPUT_DIR / "unique_record_logo_i.ico"


def _s(v: float, scale: int) -> float:
    return v * scale


def draw_logo_i(size: int = 1024) -> Image.Image:
    scale = max(1, size // 120)
    canvas_size = 120 * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")

    primary = (0, 120, 212, 255)
    secondary = (15, 108, 189, 255)
    accent = (231, 72, 86, 255)
    box = (15, 108, 189, 20)

    draw.rounded_rectangle(
        [_s(20, scale), _s(20, scale), _s(100, scale), _s(100, scale)],
        radius=int(_s(12, scale)),
        fill=box,
    )

    u_points = [
        (_s(35, scale), _s(35, scale)),
        (_s(35, scale), _s(58, scale)),
        (_s(36, scale), _s(64, scale)),
        (_s(40, scale), _s(69, scale)),
        (_s(47, scale), _s(72, scale)),
        (_s(53, scale), _s(72, scale)),
        (_s(60, scale), _s(69, scale)),
        (_s(64, scale), _s(64, scale)),
        (_s(65, scale), _s(58, scale)),
    ]
    draw.line(
        u_points,
        fill=primary,
        width=int(_s(8, scale)),
        joint="curve",
    )

    draw.line(
        [(_s(70, scale), _s(45, scale)), (_s(70, scale), _s(85, scale))],
        fill=secondary,
        width=int(_s(8, scale)),
    )
    r_bowl_points = [
        (_s(70, scale), _s(45, scale)),
        (_s(77, scale), _s(45, scale)),
        (_s(82, scale), _s(49, scale)),
        (_s(82, scale), _s(55, scale)),
        (_s(82, scale), _s(61, scale)),
        (_s(77, scale), _s(65, scale)),
        (_s(70, scale), _s(65, scale)),
    ]
    draw.line(
        r_bowl_points,
        fill=secondary,
        width=int(_s(8, scale)),
        joint="curve",
    )
    draw.line(
        [(_s(70, scale), _s(65, scale)), (_s(82, scale), _s(85, scale))],
        fill=secondary,
        width=int(_s(8, scale)),
    )

    draw.ellipse(
        [_s(44, scale), _s(54, scale), _s(56, scale), _s(66, scale)],
        fill=accent,
    )

    if canvas_size != size:
        img = img.resize((size, size), Image.Resampling.LANCZOS)
    return img


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    icon_image = draw_logo_i(1024)
    icon_image.save(PNG_PATH, format="PNG")
    icon_image.save(
        ICO_PATH,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print(f"Generated: {PNG_PATH}")
    print(f"Generated: {ICO_PATH}")


if __name__ == "__main__":
    main()

