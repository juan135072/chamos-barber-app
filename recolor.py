from PIL import Image
import numpy as np
import matplotlib.colors as mcolors

def recolor():
    print("Loading image...")
    img = Image.open('public/chamos-logo.png').convert('RGBA')
    arr = np.array(img)

    r = arr[:,:,0] / 255.0
    g = arr[:,:,1] / 255.0
    b = arr[:,:,2] / 255.0
    a = arr[:,:,3]

    rgb_arr = np.dstack((r, g, b))
    
    print("Converting to HSV...")
    hsv_arr = mcolors.rgb_to_hsv(rgb_arr)

    # #D4AF37 (Yellow) to #C5A059 (Muted Gold)
    # Hue shift: 46 -> 40 degrees
    # Saturation scale: ~0.743
    # Value scale: ~0.927
    
    print("Applying color transformation...")
    # Shift hue
    hsv_arr[:,:,0] = (hsv_arr[:,:,0] - (6.0/360.0)) % 1.0
    
    # Scale saturation and value
    hsv_arr[:,:,1] = np.clip(hsv_arr[:,:,1] * 0.743, 0, 1)
    hsv_arr[:,:,2] = np.clip(hsv_arr[:,:,2] * 0.927, 0, 1)

    print("Converting back to RGB...")
    new_rgb_arr = mcolors.hsv_to_rgb(hsv_arr)

    new_r = (new_rgb_arr[:,:,0] * 255).astype(np.uint8)
    new_g = (new_rgb_arr[:,:,1] * 255).astype(np.uint8)
    new_b = (new_rgb_arr[:,:,2] * 255).astype(np.uint8)

    new_arr = np.dstack((new_r, new_g, new_b, a))

    print("Saving image...")
    new_img = Image.fromarray(new_arr, 'RGBA')
    new_img.save('public/chamos-logo.png')
    print("Done! Image updated.")

if __name__ == '__main__':
    recolor()
