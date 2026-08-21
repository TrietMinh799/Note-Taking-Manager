"""
Icon generation script for Academic Notes & Snippet Saver extension.
Generates crisp, scholarly icons at 16x16, 48x48, and 128x128 sizes.
"""

import os
from PIL import Image, ImageDraw, ImageFont


def create_gradient_rounded_rect(width, height, radius, start_color, end_color):
    """Creates a smooth linear vertical/diagonal gradient on a rounded rectangle."""
    # Create high-res base image
    base = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    # Generate vertical gradient
    gradient = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for y in range(height):
        ratio = y / float(height - 1)
        r = int(start_color[0] * (1 - ratio) + end_color[0] * ratio)
        g = int(start_color[1] * (1 - ratio) + end_color[1] * ratio)
        b = int(start_color[2] * (1 - ratio) + end_color[2] * ratio)
        for x in range(width):
            gradient.putpixel((x, y), (r, g, b, 255))
            
    # Create rounded mask
    mask = Image.new("L", (width, height), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.rounded_rectangle(
        [(0, 0), (width - 1, height - 1)],
        radius=radius,
        fill=255
    )
    
    # Composite gradient with rounded mask
    base.paste(gradient, (0, 0), mask)
    return base


def draw_academic_emblem(img, size=512):
    """Draws a crisp academic bookmark and 'A' monogram onto the canvas."""
    draw = ImageDraw.Draw(img)
    
    # Coordinates tailored for 512x512
    scale = size / 512.0
    
    # Bookmark ribbon body:
    # A bookmark hanging from top, with a ribbon notch at bottom
    bm_left = int(140 * scale)
    bm_right = int(372 * scale)
    bm_top = int(80 * scale)
    bm_bottom = int(430 * scale)
    bm_notch_y = int(360 * scale)
    bm_mid_x = int(256 * scale)
    
    # Subtle drop shadow for bookmark
    shadow_offset = int(6 * scale)
    shadow_polygon = [
        (bm_left + shadow_offset, bm_top + shadow_offset),
        (bm_right + shadow_offset, bm_top + shadow_offset),
        (bm_right + shadow_offset, bm_bottom + shadow_offset),
        (bm_mid_x + shadow_offset, bm_notch_y + shadow_offset),
        (bm_left + shadow_offset, bm_bottom + shadow_offset),
    ]
    draw.polygon(shadow_polygon, fill=(15, 23, 42, 60))
    
    # Main Bookmark ribbon (pure white)
    bookmark_polygon = [
        (bm_left, bm_top),
        (bm_right, bm_top),
        (bm_right, bm_bottom),
        (bm_mid_x, bm_notch_y),
        (bm_left, bm_bottom),
    ]
    draw.polygon(bookmark_polygon, fill=(255, 255, 255, 255))
    
    # Inner academic "A" glyph / cutout in academic blue
    # Draw a stylized 'A'
    a_color = (37, 99, 235, 255) # #2563EB
    
    # Main outer triangle of 'A'
    a_top = (int(256 * scale), int(135 * scale))
    a_left = (int(175 * scale), int(310 * scale))
    a_right = (int(337 * scale), int(310 * scale))
    
    # Draw bold strokes for 'A'
    stroke_width = int(24 * scale)
    draw.line([a_left, a_top], fill=a_color, width=stroke_width, joint="curve")
    draw.line([a_top, a_right], fill=a_color, width=stroke_width, joint="curve")
    
    # Crossbar of 'A'
    bar_y = int(248 * scale)
    bar_left = int(200 * scale)
    bar_right = int(312 * scale)
    draw.line([(bar_left, bar_y), (bar_right, bar_y)], fill=a_color, width=int(20 * scale))
    
    # Scholarly top notch / star / book accent at the top bar
    bar_top_y = int(80 * scale)
    draw.rectangle([bm_left, bar_top_y, bm_right, bar_top_y + int(14 * scale)], fill=(219, 234, 254, 255))


def generate_icons():
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
    os.makedirs(output_dir, exist_ok=True)
    
    # High-resolution master canvas (512x512)
    master_size = 512
    # Start: Academic Blue #3B82F6 (59, 130, 246), End: Deep Navy Blue #1D4ED8 (29, 78, 216)
    bg = create_gradient_rounded_rect(
        master_size,
        master_size,
        radius=int(105),
        start_color=(59, 130, 246),
        end_color=(29, 78, 216)
    )
    
    # Draw academic emblem
    draw_academic_emblem(bg, size=master_size)
    
    # Target icon sizes
    sizes = [16, 48, 128]
    for sz in sizes:
        # Resize using high-quality Lanczos resampling
        resized = bg.resize((sz, sz), Image.Resampling.LANCZOS)
        out_path = os.path.join(output_dir, f"icon-{sz}.png")
        resized.save(out_path, "PNG", optimize=True)
        print(f"Generated: {out_path} ({sz}x{sz})")

    print("All icons successfully generated!")


if __name__ == "__main__":
    generate_icons()
