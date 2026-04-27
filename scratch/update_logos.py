import os
from PIL import Image

def process_logos():
    brain_dir = r"C:\Users\juanc\.gemini\antigravity\brain\4ca9b89c-cd96-410d-8572-1a987e25cd5c"
    public_dir = r"C:\Users\juanc\Desktop\Antigravity-Proyectos\1.- Proyecto Chamos Barber\public"
    
    icon_src = os.path.join(brain_dir, "chamos_logo_v2_transparent_1777260183221.png")
    logo_src = os.path.join(brain_dir, "chamos_full_logo_v2_dark_1777260207325.png")
    
    if not os.path.exists(icon_src) or not os.path.exists(logo_src):
        print("Source images not found.")
        return

    # 1. Update chamos-icon-gold.png (Transparent)
    with Image.open(icon_src) as img:
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
        img.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32)])

    # 2. Update chamos-logo-gold.png (Full with text)
    with Image.open(logo_src) as img:
        img.save(os.path.join(public_dir, "chamos-logo-gold.png"), "PNG")

    print("Logo and favicons updated successfully.")

if __name__ == "__main__":
    process_logos()
