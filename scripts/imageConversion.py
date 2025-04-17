import os
from PIL import Image
import pillow_avif

def create_lower_res(img, base_path, ext):
    """Create a lower resolution version of the image for mobile"""
    # Calculate new dimensions (50% of original size)
    width, height = img.size
    new_width = width // 2
    new_height = height // 2
    
    # Resize image
    img_lowres = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    lowres_path = f"{base_path}_l{ext}"
    
    # Save with appropriate format
    if ext == '.avif':
        if not os.path.exists(lowres_path + ".avif"):
            img_lowres.save(lowres_path, "AVIF")
    elif ext == '.webp':
        if not os.path.exists(lowres_path + ".webp"):
            img_lowres.save(lowres_path, "WEBP")
    else:
        if not os.path.exists(lowres_path + ".png"):
            img_lowres.save(lowres_path, "PNG")

def convert_images(root_dir):
    for root, dirs, files in os.walk(os.path.dirname(root_dir)):
        for file in files:
            if file.startswith("."):
                continue
            file_path = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()
            
            # Convert non-PNG images to PNG and remove the original
            if ext == '.gif':
                continue
            elif ext not in [".png", ".webp", ".avif", ".ico"]:
                try:
                    with Image.open(file_path) as img:
                        new_path = os.path.splitext(file_path)[0] + ".png"
                        img.save(new_path, "PNG")
                        create_lower_res(img, os.path.splitext(file_path)[0], ".png")
                    os.remove(file_path)
                    file_path = new_path
                    ext = ".png"
                except:
                    continue

            # If it's PNG, convert to WEBP and AVIF
            if ext == ".png":
                base_path = os.path.splitext(file_path)[0]
                print(base_path)
                try:
                    with Image.open(file_path) as img:
                        # Create lower res PNG
                        if not os.path.exists(f"{base_path}_l.png"):
                            create_lower_res(img, base_path, ".png")
                        
                        # Convert to WEBP
                        webp_path = base_path + ".webp"
                        if not os.path.exists(webp_path):
                            img.save(webp_path, "WEBP")
                        create_lower_res(img, base_path, ".webp")
                            
                        # Convert to AVIF
                        avif_path = base_path + ".avif"
                        if not os.path.exists(avif_path):
                            img.save(avif_path, "AVIF")
                        create_lower_res(img, base_path, ".avif")
                            
                except Exception as e:
                    print(f"Error converting {file_path}")
                    print(e)
                    break

if __name__ == "__main__":
    parent_folder = os.path.dirname(os.path.abspath(__file__))
    convert_images(parent_folder)