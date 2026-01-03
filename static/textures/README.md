# Texture Drop Zone

Place NASA Visible Earth textures in this folder using these filenames:

- `earth_albedo.jpg` (day color)
- `earth_specular.jpg` (water mask, white = ocean)
- `earth_normal.jpg` (normal or converted bump)
- `earth_height.jpg` (height/bump map, mid-gray = neutral)
- `earth_lights.jpg` (night lights)
- `earth_clouds.jpg` (clouds mask)
- `stars.jpg` (starfield background)

The app will fall back to inline placeholder textures when these files are missing.

For Solar System Scope assets, run `scripts/fetch-textures.sh` and review their license terms.
