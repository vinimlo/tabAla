#!/bin/sh
# Cuts Instrument Sans (SIL OFL) into the two local files of spec 2026-09-25 §4.2.
# From the repository root:
#   docker run --rm --cpus 1 --memory 512m -v "$PWD":/work -w /work python:3.12-slim sh scripts/fonts/subset-instrument-sans.sh
set -eu
pip install --quiet --root-user-action=ignore fonttools brotli
BASE=https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans
TMP=$(mktemp -d)
mkdir -p public/fonts
python -c "import urllib.request as u; u.urlretrieve('$BASE/InstrumentSans%5Bwdth%2Cwght%5D.ttf', '$TMP/src.ttf'); u.urlretrieve('$BASE/OFL.txt', 'public/fonts/OFL.txt')"
UNICODES="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026"
fonttools varLib.instancer "$TMP/src.ttf" wdth=100 wght=400:700 -o "$TMP/body.ttf" -q
fonttools varLib.instancer "$TMP/src.ttf" wdth=80 wght=620 -o "$TMP/condensed.ttf" -q
pyftsubset "$TMP/body.ttf" --output-file=public/fonts/instrument-sans.woff2 --flavor=woff2 \
  --unicodes="$UNICODES" --layout-features=kern,liga,calt,tnum --no-hinting --desubroutinize
# The condensed face only sets short words (verbs, "Foco"): letters, space, comma, period (spec §4.2 fallback).
pyftsubset "$TMP/condensed.ttf" --output-file=public/fonts/instrument-sans-condensed.woff2 --flavor=woff2 \
  --unicodes="U+0020,U+002C,U+002E,U+0041-005A,U+0061-007A,U+00C0-00FF,U+2019" --layout-features=kern,liga --no-hinting --desubroutinize
ls -l public/fonts
