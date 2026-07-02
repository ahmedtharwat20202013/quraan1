import os
from PIL import Image, ImageDraw

def process_assets():
    logo_path = r"C:\Users\DrCreative xeon\Downloads\ChatGPT Image Jun 28, 2026, 09_50_53 PM.png"
    res_dir = r"android\app\src\main\res"

    if not os.path.exists(logo_path):
        print(f"Error: Logo file not found at {logo_path}")
        return

    # Load logo image
    logo = Image.open(logo_path).convert("RGBA")

    # Helper function to crop image to circle
    def make_round(img):
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0) + img.size, fill=255)
        
        round_img = Image.new("RGBA", img.size, (0, 0, 0, 0))
        round_img.paste(img, (0, 0), mask=mask)
        return round_img

    # 1. Update Launcher Icons
    launcher_specs = {
        "mipmap-mdpi": {
            "ic_launcher.png": (48, 48),
            "ic_launcher_round.png": (48, 48),
            "ic_launcher_foreground.png": (108, 108)
        },
        "mipmap-hdpi": {
            "ic_launcher.png": (72, 72),
            "ic_launcher_round.png": (72, 72),
            "ic_launcher_foreground.png": (162, 162)
        },
        "mipmap-xhdpi": {
            "ic_launcher.png": (96, 96),
            "ic_launcher_round.png": (96, 96),
            "ic_launcher_foreground.png": (216, 216)
        },
        "mipmap-xxhdpi": {
            "ic_launcher.png": (144, 144),
            "ic_launcher_round.png": (144, 144),
            "ic_launcher_foreground.png": (324, 324)
        },
        "mipmap-xxxhdpi": {
            "ic_launcher.png": (192, 192),
            "ic_launcher_round.png": (192, 192),
            "ic_launcher_foreground.png": (432, 432)
        }
    }

    for m_dir, files in launcher_specs.items():
        dir_path = os.path.join(res_dir, m_dir)
        os.makedirs(dir_path, exist_ok=True)
        
        for filename, (w, h) in files.items():
            out_path = os.path.join(dir_path, filename)
            try:
                print(f"Generating launcher icon: {out_path} ({w}x{h})")
                resized_logo = logo.resize((w, h), Image.Resampling.LANCZOS)
                
                if "round" in filename:
                    resized_logo = make_round(resized_logo)
                
                resized_logo.save(out_path, "PNG")
                print(f"Successfully saved launcher icon to {out_path}")
            except Exception as e:
                print(f"Error saving launcher icon {out_path}: {e}")

    # 2. Update Splash Screens with standard Android screen resolutions
    splash_specs = {
        "drawable": (512, 512),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
    }

    for d, (width, height) in splash_specs.items():
        dir_path = os.path.join(res_dir, d)
        os.makedirs(dir_path, exist_ok=True)
        
        splash_file = os.path.join(dir_path, "splash.png")
        try:
            print(f"Generating centered white splash screen: {splash_file} ({width}x{height})")
            
            # Create a pure white canvas
            canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))
            
            # Calculate logo size: 28% of the minimum dimension
            logo_size = int(min(width, height) * 0.28)
            if logo_size < 48:
                logo_size = 48
            
            # Resize logo
            resized_logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            
            # Center positions
            x = (width - logo_size) // 2
            y = (height - logo_size) // 2
            
            # Paste logo into white canvas
            canvas.paste(resized_logo, (x, y), resized_logo)
            
            # Save splash (overwrite)
            canvas.save(splash_file, "PNG")
            print(f"Successfully saved splash to {splash_file}")
        except Exception as e:
            print(f"Error processing {splash_file}: {e}")

    # 3. Generate Notification Silhouette Icon (ic_stat_icon_default.png)
    try:
        stat_size = 96
        stat_icon = logo.resize((stat_size, stat_size), Image.Resampling.LANCZOS)
        
        # Convert all non-transparent pixels to white, keeping their transparency level
        data = stat_icon.getdata()
        new_data = []
        for item in data:
            r, g, b, a = item
            if a > 30: # threshold for non-transparent pixels
                new_data.append((255, 255, 255, a))
            else:
                new_data.append((0, 0, 0, 0))
        
        stat_icon.putdata(new_data)
        
        # Save to drawable folder
        stat_icon_path = os.path.join(res_dir, "drawable", "ic_stat_icon_default.png")
        stat_icon.save(stat_icon_path, "PNG")
        print(f"Successfully generated notification icon silhouette at {stat_icon_path}")
    except Exception as e:
        print(f"Error generating notification icon: {e}")

if __name__ == "__main__":
    process_assets()
