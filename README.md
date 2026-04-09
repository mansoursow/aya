## Site “Joyeux anniversaire AYA”

Ce dossier contient un site vitrine **statique** (HTML/CSS/JS) : feux d’artifice au chargement, puis “Happy Birthday AYA”, puis un diaporama de photos avec musique.

### 1) Ajouter tes photos

- Mets tes photos dans `assets/photos/`
- Médias actuels (modifiable dans `script.js`) :
  - `01.jpeg`
  - `02.jpeg`
  - `03.MOV` (optionnellement converti en `03.mp4` pour iPhone/réseau lent)
  - `04.jpeg`
  - `05.jpeg`
  - `06.MOV` (optionnellement converti en `06.mp4` pour iPhone/réseau lent)
  - `07.mp4`

### 2) Ajouter la musique

- Mets ton fichier musique dans `assets/audio/`
- Nom actuel : `Aya Candlewax.mp3`

> Note : sur iPhone, l’audio/vidéo peut nécessiter un toucher si Safari bloque l’autoplay.

### 2bis) (Recommandé) Convertir les vidéos iPhone pour réduire la latence

Les `.MOV` iPhone sont souvent lourds et parfois en codec peu compatible. Pour une lecture plus rapide (surtout sur 4G/connexion faible), convertis en MP4 H.264 :

- Installe `ffmpeg` (ex: via winget ou site officiel)
- Lance :
  - `powershell -ExecutionPolicy Bypass -File tools/convert-videos.ps1`

### 3) Lancer le site

- Double-clique sur `index.html`

Si tu veux l’héberger (gratuit) : GitHub Pages / Netlify / Vercel.

