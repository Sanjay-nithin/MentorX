"""
Simple script to create a MentorX logo.
Run this once to generate the logo image for PDFs.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_mentorx_logo():
    """Create a simple MentorX logo as PNG."""
    # Create image
    width = 600
    height = 180
    img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background (simplified as rectangle)
    draw.rectangle([0, 0, width, height], fill=(30, 64, 175, 255))  # Blue background
    
    # Try to use a nice font, fallback to default
    try:
        # Try to use Arial Bold
        font_large = ImageFont.truetype("arialbd.ttf", 70)
        font_small = ImageFont.truetype("arial.ttf", 30)
    except:
        # Fallback to default font
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Draw MentorX text
    text = "MentorX"
    tagline = "AI Learning Platform"
    
    # Calculate text position (centered)
    text_bbox = draw.textbbox((0, 0), text, font=font_large)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    text_x = (width - text_width) // 2
    text_y = 30
    
    # Draw main text with shadow
    draw.text((text_x + 2, text_y + 2), text, fill=(0, 0, 0, 100), font=font_large)  # Shadow
    draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font_large)  # Main text
    
    # Draw tagline
    tagline_bbox = draw.textbbox((0, 0), tagline, font=font_small)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (width - tagline_width) // 2
    tagline_y = text_y + text_height + 20
    
    draw.text((tagline_x, tagline_y), tagline, fill=(200, 200, 255, 255), font=font_small)
    
    # Save as PNG
    logo_path = os.path.join(os.path.dirname(__file__), 'mentorx_logo.png')
    img.save(logo_path, 'PNG')
    print(f"✓ Logo created: {logo_path}")
    return logo_path

if __name__ == '__main__':
    create_mentorx_logo()
