# Daria & Norbert

Un site romantic interactiv, optimizat pentru mobil și afișat pe tot ecranul. Este construit exclusiv cu HTML, CSS și JavaScript simplu, așadar funcționează direct pe GitHub Pages, fără server sau bază de date.

## Previzualizare rapidă

Deschide fișierul `index.html` într-un browser modern. Dacă unele imagini sau fișiere audio lipsesc, site-ul va afișa automat elemente vizuale elegante, fără să se blocheze.

## Personalizarea conținutului

Toate textele și căile fișierelor se află în obiectul `CONFIG` de la începutul fișierului `js/app.js`. Acolo poți modifica ușor:

- numele cuplului și subtitlul introducerii;
- mesajul complet de pe pergament și semnătura;
- mesajele finale;
- căile și descrierile celor cinci fotografii;
- căile tuturor fișierelor audio;
- durata introducerii.

În prezent, melodia `assets/audio/rares - O viata intreaga cu tine  Lyric Video.mp3` pornește la prima atingere, continuă fără întrerupere după introducere și apoi se repetă. Această funcție este controlată de setarea `playBackgroundFromStart`.

Copiază fișierele tale în următoarele locații:

```text
assets/photos/photo1.jpg ... photo5.jpg
assets/troll/troll.jpg
assets/audio/intro.mp3
assets/audio/background.mp3
assets/audio/chest-open.mp3
assets/audio/magic.mp3
assets/audio/glitch.mp3
```

Dimensiunea recomandată este de cel puțin 1200 × 1500 px pentru fotografii și 1200 × 900 px pentru imaginea amuzantă. Fișierele audio ar trebui comprimate pentru web. Încarcă numai muzică și imagini pentru care ai drept de utilizare.

## Publicare pe GitHub Pages

1. Încarcă întregul proiect pe ramura `main` a unui repository GitHub.
2. Deschide **Settings → Pages** în pagina repository-ului.
3. La Source selectează **Deploy from a branch**.
4. Alege ramura **main** și folderul **/ (root)**.
5. Apasă **Save**.

După câteva minute, site-ul va fi disponibil la adresa oferită de GitHub, de exemplu `https://username.github.io/norbi-dasa/`. Toate căile sunt relative, astfel încât site-ul funcționează corect și dintr-un subdirector GitHub Pages.

## Salvarea progresului

Cuferele deja deschise sunt salvate în `localStorage`. Pentru a șterge progresul în timpul testării, rulează în consola browserului:

```js
localStorage.removeItem("norbi-dasa-opened-chests");
location.reload();
```

## Structura fișierelor

```text
index.html
README.md
css/style.css
js/app.js
assets/photos/
assets/audio/
assets/intro/castle-background.png
assets/troll/
assets/ui/
```
