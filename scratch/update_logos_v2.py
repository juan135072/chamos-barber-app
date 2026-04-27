import os
from PIL import Image

def process_logos():
    brain_dir = r"C:\Users\juanc\.gemini\antigravity\brain\4ca9b89c-cd96-410d-8572-1a987e25cd5c"
    public_dir = r"C:\Users\juanc\Desktop\Antigravity-Proyectos\1.- Proyecto Chamos Barber\public"
    
    # New source images from user
    icon_src = os.path.join(brain_dir, "media__1777261434598.png")
    logo_src = os.path.join(brain_dir, "media__1777261434663.jpg")
    
    if not os.path.exists(icon_src) or not os.path.exists(logo_src):
        print(f"Source images not found. Check: {icon_src} and {logo_src}")
        return

    # 1. Update chamos-icon-gold.png (Transparent)
    with Image.open(icon_src) as img:
        # Convert to RGBA just in case
        img = img.convert("RGBA")
        img.save(os.path.join(public_dir, "chamos-icon-gold.png"), "PNG")
        
        # Favicons
        sizes = [16, 32, 192, 512]
        for size in sizes:
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            if size == 16:
                resized.save(os.path.join(public_dir, "favicon-16x16.png"), "PNG")
            elif size == 32:
                resized.save(os.path.join(public_dir, "favicon-32x32.png"), "PNG")
            elif size == 192:
                resized.save(os.path.join(public_dir, "android-chrome-192x192.png"), "PNG")
            elif size == 512:
                resized.save(os.path.join(public_dir, "android-chrome-512x512.png"), "PNG")
        
        # apple-touch-icon.png (180x180)
        img.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
        
        # favicon.ico (16 and 32)
        # Note: PIL might need multiple images for ICO
        ico_img16 = img.resize((16, 16), Image.Resampling.LANCZOS)
        ico_img32 = img.resize((32, 32), Image.Resampling.LANCZOS)
        ico_img16.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32)], append_images=[ico_img32])

    # 2. Update chamos-logo-gold.png (Full with text)
    with Image.open(logo_src) as img:
        # Convert to RGB (it's a JPG usually)
        img = img.convert("RGB")
        img.save(os.path.join(public_dir, "chamos-logo-gold.png"), "PNG")

    print("Logo and favicons updated successfully with high-quality original files.")

if __name__ == "__main__":
    process_logos()
