#!/usr/bin/env bash
set -euo pipefail

force=false
if [[ "${1:-}" == "--force" ]]; then
	force=true
fi

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="${root_dir}/static/textures"
mkdir -p "$out_dir"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

download() {
	local url="$1"
	local dest="$2"

	if [[ "$force" == "false" && -f "$dest" ]]; then
		echo "Skipping existing file: $dest"
		return
	fi

	echo "Downloading $url"
	curl -L --fail --retry 3 --output "$dest" "$url"
}

convert_to_jpg() {
	local src="$1"
	local dest="$2"

	if [[ "$force" == "false" && -f "$dest" ]]; then
		echo "Skipping existing file: $dest"
		return
	fi

	if command -v sips >/dev/null 2>&1; then
		sips -s format jpeg "$src" --out "$dest" >/dev/null
	elif command -v magick >/dev/null 2>&1; then
		magick "$src" "$dest"
	elif command -v convert >/dev/null 2>&1; then
		convert "$src" "$dest"
	else
		echo "Missing image converter. Install ImageMagick or use macOS sips."
		exit 1
	fi
}

download \
	"https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg" \
	"${out_dir}/earth_albedo.jpg"

download \
	"https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg" \
	"${out_dir}/earth_lights.jpg"

download \
	"https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg" \
	"${out_dir}/earth_clouds.jpg"

download \
	"https://www.solarsystemscope.com/textures/download/8k_stars.jpg" \
	"${out_dir}/stars.jpg"

normal_tif="${tmp_dir}/earth_normal_map.tif"
specular_tif="${tmp_dir}/earth_specular_map.tif"

download \
	"https://www.solarsystemscope.com/textures/download/8k_earth_normal_map.tif" \
	"$normal_tif"

download \
	"https://www.solarsystemscope.com/textures/download/8k_earth_specular_map.tif" \
	"$specular_tif"

convert_to_jpg "$normal_tif" "${out_dir}/earth_normal.jpg"
convert_to_jpg "$specular_tif" "${out_dir}/earth_specular.jpg"

echo "Done. Textures are in ${out_dir}"
