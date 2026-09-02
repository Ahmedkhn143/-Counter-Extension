import os
from PIL import Image, ImageDraw, ImageFont

store_dir = os.path.join(os.getcwd(), "store_assets")
os.makedirs(store_dir, exist_ok=True)

# Helper function to get default fonts
def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except IOError:
        try:
            return ImageFont.truetype("DejaVuSans.ttf", size)
        except IOError:
            return ImageFont.load_default()

font_title_lg = get_font(36)
font_title = get_font(24)
font_body = get_font(18)
font_sm = get_font(14)

# ==============================================================================
# 1. SCREENSHOT (1280 x 800) - RGB 24-bit PNG (no alpha)
# ==============================================================================
scr_w, scr_h = 1280, 800
screenshot = Image.new("RGB", (scr_w, scr_h), (243, 242, 238)) # LinkedIn light gray bg
draw_scr = ImageDraw.Draw(screenshot)

# Top Nav Bar
draw_scr.rectangle([0, 0, scr_w, 52], fill=(255, 255, 255))
draw_scr.line([0, 52, scr_w, 52], fill=(220, 220, 220), width=1)
# LinkedIn Logo box
draw_scr.rounded_rectangle([40, 10, 72, 42], radius=4, fill=(10, 102, 194))
draw_scr.text((47, 12), "in", fill=(255, 255, 255), font=get_font(22))
# Search Bar
draw_scr.rounded_rectangle([85, 10, 360, 42], radius=4, fill=(238, 243, 248))
draw_scr.text((100, 17), "Search posts, people...", fill=(100, 100, 100), font=font_sm)

# Left Sidebar Mockup
draw_scr.rounded_rectangle([40, 70, 260, 350], radius=8, fill=(255, 255, 255))
draw_scr.rectangle([40, 70, 260, 130], fill=(160, 180, 200))
draw_scr.ellipse([125, 105, 175, 155], fill=(10, 102, 194))
draw_scr.text((75, 170), "John Doe", fill=(0, 0, 0), font=get_font(20))
draw_scr.text((65, 195), "LinkedIn Content Creator", fill=(120, 120, 120), font=font_sm)
draw_scr.line([40, 230, 260, 230], fill=(230, 230, 230))
draw_scr.text((55, 250), "Profile views: 1,240", fill=(80, 80, 80), font=font_sm)
draw_scr.text((55, 280), "Post impressions: 14.5k", fill=(80, 80, 80), font=font_sm)

# Main Feed Post Card Mockup
draw_scr.rounded_rectangle([290, 70, 920, 750], radius=8, fill=(255, 255, 255))
# Author header
draw_scr.ellipse([310, 90, 350, 130], fill=(0, 120, 212))
draw_scr.text((365, 92), "Sarah Jenkins • 1st", fill=(0, 0, 0), font=font_body)
draw_scr.text((365, 114), "Product Manager at TechCorp • 2h", fill=(120, 120, 120), font=font_sm)
# Post text
draw_scr.text((310, 150), "Here are 5 key strategies for growing your personal brand on LinkedIn in 2026:", fill=(30, 30, 30), font=font_body)
draw_scr.text((310, 180), "1. Consistency over intensity\n2. Engaging with target creators in comments\n3. Sharing real actionable insights\n4. Supporting others in your niche\n5. Analytics & daily tracking!", fill=(50, 50, 50), font=font_body)

# Post image mockup box
draw_scr.rounded_rectangle([310, 300, 900, 550], radius=6, fill=(230, 240, 250))
draw_scr.text((520, 410), "[ Image Content ]", fill=(10, 102, 194), font=get_font(22))

# Post Actions Bar (Like, Comment, Repost, Send)
draw_scr.line([290, 570, 920, 570], fill=(230, 230, 230))
draw_scr.text((340, 585), "👍 Like", fill=(100, 100, 100), font=font_body)
draw_scr.text((470, 585), "💬 Comment", fill=(10, 102, 194), font=font_body)
draw_scr.text((620, 585), "🔁 Repost", fill=(100, 100, 100), font=font_body)
draw_scr.text((750, 585), "↗️ Send", fill=(100, 100, 100), font=font_body)

# Active Comment Box
draw_scr.line([290, 615, 920, 615], fill=(230, 230, 230))
draw_scr.rounded_rectangle([310, 630, 900, 680], radius=20, fill=(245, 245, 245), outline=(200, 200, 200))
draw_scr.text((330, 645), "Great insights Sarah! Point #2 is super important for organic reach.", fill=(40, 40, 40), font=font_sm)
draw_scr.rounded_rectangle([820, 690, 900, 725], radius=16, fill=(10, 102, 194))
draw_scr.text((840, 700), "Comment", fill=(255, 255, 255), font=font_sm)

# RIGHT FLOATING WIDGET (The LinkedIn Comment Counter Extension Card)
widget_left, widget_top = 950, 70
widget_w, widget_h = 280, 175
# Draw shadow
draw_scr.rounded_rectangle([widget_left+4, widget_top+4, widget_left+widget_w+4, widget_top+widget_h+4], radius=12, fill=(200, 200, 200))
# Draw main card
draw_scr.rounded_rectangle([widget_left, widget_top, widget_left+widget_w, widget_top+widget_h], radius=12, fill=(10, 102, 194))

draw_scr.text((widget_left + 22, widget_top + 16), "Comments", fill=(255, 255, 255), font=get_font(26))
draw_scr.text((widget_left + 22, widget_top + 60), "Today: 15", fill=(255, 255, 255), font=font_title)
draw_scr.text((widget_left + 22, widget_top + 95), "This Week: 68", fill=(255, 255, 255), font=font_title)
draw_scr.text((widget_left + 22, widget_top + 130), "This Month: 245", fill=(255, 255, 255), font=font_title)

screenshot.save(os.path.join(store_dir, "screenshot1.png"), "PNG")
print("Saved screenshot1.png (1280x800, 24-bit PNG)")

# ==============================================================================
# 2. SMALL PROMO TILE (440 x 280) - RGB 24-bit PNG (no alpha)
# ==============================================================================
sp_w, sp_h = 440, 280
small_promo = Image.new("RGB", (sp_w, sp_h), (10, 102, 194)) # Deep LinkedIn Blue
draw_sp = ImageDraw.Draw(small_promo)

# Background subtle graphic
draw_sp.ellipse([260, -40, 520, 220], fill=(15, 120, 220))

# Title & Subtitle
draw_sp.text((30, 35), "LinkedIn Comment Counter", fill=(255, 255, 255), font=get_font(24))
draw_sp.text((30, 70), "Track Daily, Weekly & Monthly Comments Live", fill=(200, 230, 255), font=font_sm)

# Preview Card inside Small Promo Tile
p_left, p_top = 30, 110
p_w, p_h = 380, 140
draw_sp.rounded_rectangle([p_left, p_top, p_left+p_w, p_top+p_h], radius=10, fill=(255, 255, 255))

draw_sp.text((p_left+20, p_top+15), "Comments Activity", fill=(10, 102, 194), font=get_font(18))
draw_sp.text((p_left+20, p_top+45), "• Today: 12", fill=(40, 40, 40), font=get_font(16))
draw_sp.text((p_left+150, p_top+45), "• This Week: 47", fill=(40, 40, 40), font=get_font(16))
draw_sp.text((p_left+20, p_top+80), "• This Month: 184", fill=(40, 40, 40), font=get_font(16))

# Live badge
draw_sp.rounded_rectangle([p_left+270, p_top+80, p_left+350, p_top+110], radius=12, fill=(16, 185, 129))
draw_sp.text((p_left+285, p_top+87), "LIVE", fill=(255, 255, 255), font=font_sm)

small_promo.save(os.path.join(store_dir, "small_promo.png"), "PNG")
print("Saved small_promo.png (440x280, 24-bit PNG)")

# ==============================================================================
# 3. MARQUEE PROMO TILE (1400 x 560) - RGB 24-bit PNG (no alpha)
# ==============================================================================
mq_w, mq_h = 1400, 560
marquee_promo = Image.new("RGB", (mq_w, mq_h), (8, 75, 145))
draw_mq = ImageDraw.Draw(marquee_promo)

# Right background decorative circle
draw_mq.ellipse([800, -100, 1600, 700], fill=(10, 102, 194))

# Text Column
draw_mq.text((100, 120), "LinkedIn Comment Counter", fill=(255, 255, 255), font=get_font(48))
draw_mq.text((100, 190), "Automatically track how many comments you post on LinkedIn", fill=(200, 230, 255), font=get_font(26))
draw_mq.text((100, 230), "Daily • Weekly • Monthly Real-time Analytics", fill=(150, 210, 255), font=get_font(22))

# Feature bullets
draw_mq.text((100, 310), "✓ Real-Time Smart Detection (Zero false triggers)", fill=(255, 255, 255), font=get_font(20))
draw_mq.text((100, 350), "✓ Auto-Resets at Midnight & Cycle Ends", fill=(255, 255, 255), font=get_font(20))
draw_mq.text((100, 390), "✓ 100% Private - Stores data locally on your browser", fill=(255, 255, 255), font=get_font(20))

# Mockup Card on the right
mq_card_l, mq_card_t = 880, 140
mq_card_w, mq_card_h = 420, 280
draw_mq.rounded_rectangle([mq_card_l+8, mq_card_t+8, mq_card_l+mq_card_w+8, mq_card_t+mq_card_h+8], radius=16, fill=(5, 45, 90))
draw_mq.rounded_rectangle([mq_card_l, mq_card_t, mq_card_l+mq_card_w, mq_card_t+mq_card_h], radius=16, fill=(10, 102, 194))

draw_mq.text((mq_card_l+40, mq_card_t+30), "Comments Counter", fill=(255, 255, 255), font=get_font(32))
draw_mq.text((mq_card_l+40, mq_card_t+90), "Today: 18", fill=(255, 255, 255), font=get_font(26))
draw_mq.text((mq_card_l+40, mq_card_t+140), "This Week: 94", fill=(255, 255, 255), font=get_font(26))
draw_mq.text((mq_card_l+40, mq_card_t+190), "This Month: 320", fill=(255, 255, 255), font=get_font(26))

marquee_promo.save(os.path.join(store_dir, "marquee_promo.png"), "PNG")
print("Saved marquee_promo.png (1400x560, 24-bit PNG)")

print("All Store Assets Generated Successfully!")
