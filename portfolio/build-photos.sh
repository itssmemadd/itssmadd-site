#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  build-photos.sh — génère tout le nécessaire pour le site photo (3 galeries)
#
#  Bibliothèque publiée :  images/web/<galerie>/  (+ thumbs/)
#  Galeries : portraits, editorials, events
#
#  POUR AJOUTER des photos :
#   1. dépose tes images dans images/originals/portraits/ (ou editorials/ events/)
#   2. lance  ./build-photos.sh
#   3. tu peux ensuite vider images/originals/
#
#  Tri = ordre des noms de fichiers (décroissant). Renomme dans web/ pour réordonner,
#  puis relance le build (il resynchronise les miniatures automatiquement).
#  Le build N'EFFACE JAMAIS web/ : il ajoute seulement.
# ════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/images"

GALLERIES="portraits editorials events"

echo "→ Optimisation des photos déposées dans originals/ (s'il y en a)…"
for g in $GALLERIES; do
  mkdir -p "web/$g" "thumbs/$g"
  [ -d "originals/$g" ] || continue
  for f in "originals/$g"/*; do
    [ -e "$f" ] || continue
    case "$(basename "$f")" in .DS_Store) continue;; esac
    out="$(basename "$f")"; out="${out%.*}.jpg"   # garde le nom, sortie .jpg
    [ -e "web/$g/$out" ] && continue              # déjà traité
    sips -Z 2000 -s format jpeg -s formatOptions 82 "$f" --out "web/$g/$out"    >/dev/null
    sips -Z 600  -s format jpeg -s formatOptions 75 "$f" --out "thumbs/$g/$out" >/dev/null
  done
done

# Photo de profil (seulement si un nouvel original est déposé)
if [ -f "originals/profile.jpg" ]; then
  sips -Z 2000 -s format jpeg -s formatOptions 88 "originals/profile.jpg" --out "profile.jpg" >/dev/null
  echo "→ Photo de profil régénérée."
fi

# Synchronise les miniatures avec web/
echo "→ Synchronisation des miniatures…"
for g in $GALLERIES; do
  mkdir -p "thumbs/$g"
  for f in "web/$g"/*; do
    [ -e "$f" ] || continue
    out="$(basename "$f")"
    [ -e "thumbs/$g/$out" ] || sips -Z 600 -s format jpeg -s formatOptions 75 "$f" --out "thumbs/$g/$out" >/dev/null
  done
  for t in "thumbs/$g"/*; do
    [ -e "$t" ] || continue
    [ -e "web/$g/$(basename "$t")" ] || rm -f "$t"
  done
done

echo "→ Écriture de photos.js (tri par nom, décroissant)…"
{
  echo "// ⚠️  Généré automatiquement par build-photos.sh — ne pas éditer à la main."
  echo "const PHOTOS = ["
  for g in $GALLERIES; do
    for f in "web/$g"/*; do
      [ -e "$f" ] || continue
      printf '%s\t%s\n' "$(basename "$f")" "$g"
    done
  done | sort -rf | while IFS=$'\t' read -r file g; do
    esc=$(printf '%s' "$file" | sed "s/'/\\\\'/g")
    dim=$(sips -g pixelWidth -g pixelHeight "web/$g/$file" 2>/dev/null)
    w=$(printf '%s' "$dim" | awk '/pixelWidth/{print $2}')
    h=$(printf '%s' "$dim" | awk '/pixelHeight/{print $2}')
    printf "  { g:'%s', file:'%s', w:%s, h:%s },\n" "$g" "$esc" "${w:-0}" "${h:-0}"
  done
  echo "];"
} > ../photos.js

n=$(grep -c "{ g:" ../photos.js || true)
echo "✓ Terminé — $n photos publiées."
