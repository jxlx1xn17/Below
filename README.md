# MagicGlass V3 — Kartenzauber mit iPhone-Kamera-Design

Unabhängige, kostenlose Web-App. Kein Bestandteil der Apple-Kamera und nicht mit BELOW oder Les French Twins verbunden.

## Ziel des Tricks

**Physisch:** Du hältst beispielsweise die Herz-Dame in die Selfie-Kamera. **Digital:** Die Kamera zeigt zunächst Kreuz-4. **Reveal:** Bei verstecktem Tippen oder über den weißen Auslöser wird die Karte in etwa 0,3 Sekunden ausgeblendet und die echte Herz-Dame im laufenden Bild sichtbar.

## Neu in V3

- Standalone-Kameraoberfläche, gestalterisch an iOS 26 angelehnt (u. a. weißer Auslöser, FOTO/VIDEO, Kamerasymbole und Zoomanzeige; rein optische Bedienelemente). Kein identischer oder funktional vollständiger Nachbau von Apple-Kamera.
- Selfie-Kamera standardmäßig mit gespiegelt angezeigter Livevorschau; Rückkamera optional.
- Tracker standardmäßig eingeschaltet: anhand von **Bildmerkmalen innerhalb der echten Spielkarte**, die über mehrere Frames verfolgt werden. Ausreißer werden durch RANSAC verworfen; daraus wird eine Projektivtransformation für die virtuelle Karte berechnet.
- Vier-Ecken-Kalibrierung einmal vor der Vorführung erforderlich. **Keine automatische Kartenerkennung.**
- Unauffälliges Reveal durch Bildtippen, Zwei-Finger-Tipp oder weißen Auslöser. Geheimes Zurückkehren zu den Einstellungen: oben links ca. 1 Sekunde halten.
- 52 virtuelle Karten oder eigenes Motivfoto.
- Alle Video-Bilddaten bleiben lokal im Browser; keine Cloud, kein Konto, keine API-Gebühren.

## iPhone-Installation (ohne zusätzlichen Bezahldienst)

1. ZIP entpacken; Dateien des Ordners gemeinsam (nicht ZIP) in ein neues GitHub-Repository hochladen.
2. Unter **Settings → Pages → Build and deployment** Quelle **Deploy from a branch**, Branch **main**, Root **/(root)** wählen.
3. In Safari `https://BENUTZERNAME.github.io/REPOSITORYNAME/` öffnen und **Selfie-Kamera starten**, Kameraberechtigung zulassen.
4. Über **Teilen → Zum Home-Bildschirm** installieren. So öffnet die Seite im appähnlichen Standalone-Modus. Manche iOS-Versionen erfordern erneute Kamera-Freigaben.
5. **Zur Einrichtung:** echte Karte vor die Selfie-Kamera halten. **Vier Ecken markieren** → *oben links, oben rechts, unten rechts, unten links*. Bei gespiegelter Frontkamera die Ecken so antippen, wie sie im Display zu sehen sind.
6. Tracker eingeschaltet lassen → **Vorführung starten**. Jetzt zeigt die Vorschau die falsche Karte. Karte langsam bewegen/neigen; für den Reveal unauffällig aufs Bild oder den weißen Kreis tippen.

## Ohne HTTPS testen

Im Ordner `python -m http.server 8000`, dann im Browser `http://localhost:8000` öffnen. Mit **Demo** lassen sich Kartenüberlagerung und Reveal auch ohne echte Kamera testen; die Bewegung der realen Karte ist dann nicht testbar.

## Grenzen / nächste Entwicklungsstufe

Diese Version besitzt einen selbst implementierten leichten, CPU-basierten Feature-Tracker. Es gibt **noch keine automatische Kartenklassifikation oder freie Kartenerkennung, keine Fingermaske/Hand-Okklusion und keine garantierte Nachverfolgung** bei schnellen Bewegungen, starker perspektivischer Verkürzung, rotierenden Karten, gleichförmiger Kartenrückseite, geringer Beleuchtung oder Verdeckung. Bei Trackingverlust kann das Overlay stehen bleiben; die Position muss dann neu kalibriert werden.

Für einen professionellen iPhone-Effekt empfehlenswert: native Swift-iOS-App mit AVFoundation + Vision Rectangle Detection und Rectangle Tracking (ggf. ARKit oder Core ML), perspektivischer GPU-Textur-Projektion sowie Handsegmentierung. Dafür wäre ein Xcode-Build auf einem Mac erforderlich. Ein App-Store-Release ist nicht zum Testen per Browser nötig, aber für nativ iOS separate Apple-Signierung/Installationsschritte.

## Technik

Vanilla JS, getUserMedia, Canvas2D, Featuresampling im Video, robustes RANSAC-Homography-Tracking, PWA Service Worker. Keine externen JS-Abhängigkeiten. MIT-Lizenz.
