import os
from PIL import Image, ImageDraw, ImageFont

icons_dir = os.path.join(os.getcwd(), "icons")
os.makedirs(icons_dir, exist_ok=True)

sizes = [16, 48, 128]

for size in sizes:
    # Create RGBA image with transparent background
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded rectangle in LinkedIn Blue (#0A66C2)
    bg_color = (10, 102, 194, 255)
    radius = int(size * 0.2)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg_color)
    
    # Draw a speech bubble icon in White
    # Speech bubble rectangle + tail
    padding = size * 0.22
    b_left = padding
    b_top = padding
    b_right = size - padding
    b_bottom = size - padding * 1.3
    
    bubble_radius = int(size * 0.1)
    draw.rounded_rectangle([b_left, b_top, b_right, b_bottom], radius=bubble_radius, fill=(255, 255, 255, 255))
    
    # Small tail for speech bubble
    tail_p1 = (b_left + size * 0.15, b_bottom - 1)
    tail_p2 = (b_left + size * 0.05, size - padding * 0.8)
    tail_p3 = (b_left + size * 0.35, b_bottom - 1)
    draw.polygon([tail_p1, tail_p2, tail_p3], fill=(255, 255, 255, 255))
    
    # Draw horizontal comment lines or small dot badge in LinkedIn blue inside the white bubble
    if size >= 48:
        line_color = (10, 102, 194, 255)
        l_x1 = b_left + (b_right - b_left) * 0.2
        l_x2 = b_left + (b_right - b_left) * 0.8
        l_y1 = b_top + (b_bottom - b_top) * 0.35
        l_y2 = b_top + (b_bottom - b_top) * 0.65
        line_w = max(1, int(size * 0.05))
        draw.line([l_x1, l_y1, l_x2, l_y1], fill=line_color, width=line_w)
        draw.line([l_x1, l_y2, l_x1 + (l_x2 - l_x1) * 0.6, l_y2], fill=line_color, width=line_w)

    img.save(os.path.join(icons_dir, f"icon{size}.png"), "PNG")
    print(f"Generated icon{size}.png")

print("All icons created successfully!")
