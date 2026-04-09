$ErrorActionPreference = "Stop"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Commande introuvable: $name. Installe ffmpeg puis relance."
  }
}

Assert-Command "ffmpeg"

$root = Split-Path -Parent $PSScriptRoot
$photos = Join-Path $root "assets\\photos"

Write-Host "Dossier vidéos: $photos"

# Convertit .MOV -> .mp4 (H.264) avec un poids raisonnable pour mobile.
# - 720p max, CRF 28 (qualité/poids), preset veryfast (conversion rapide)
# - audio retiré (la musique du site joue déjà)
$pairs = @(
  @{ In = "03.MOV"; Out = "03.mp4" },
  @{ In = "06.MOV"; Out = "06.mp4" }
)

foreach ($p in $pairs) {
  $inPath = Join-Path $photos $p.In
  $outPath = Join-Path $photos $p.Out

  if (-not (Test-Path -LiteralPath $inPath)) {
    Write-Host "Introuvable, skip: $($p.In)"
    continue
  }

  Write-Host "Convertit $($p.In) -> $($p.Out)"

  ffmpeg -y `
    -i $inPath `
    -an `
    -vf "scale='min(1280,iw)':-2" `
    -c:v libx264 -profile:v high -pix_fmt yuv420p `
    -preset veryfast -crf 28 `
    -movflags +faststart `
    $outPath
}

Write-Host "OK. Les fichiers .mp4 sont prêts. Fais ensuite: git add .; git commit; git push"

