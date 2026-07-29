# Veröffentlichung über GitHub Pages

Das Running Dashboard ist für GitHub Pages vorbereitet. Die Anwendung verwendet
relative Pfade und funktioniert dadurch sowohl unter einer Projektadresse wie
`https://BENUTZERNAME.github.io/REPOSITORY/` als auch später auf einer eigenen
Subdomain.

## Einmalige Einrichtung

1. Auf GitHub ein neues Repository anlegen. Keine Beispieldateien hinzufügen.
2. Diesen Projektordner lokal mit dem Repository verbinden:

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "Running Dashboard für GitHub Pages vorbereiten"
   git remote add origin https://github.com/BENUTZERNAME/REPOSITORY.git
   git push -u origin main
   ```

3. Im GitHub-Repository `Settings` → `Pages` öffnen.
4. Unter `Build and deployment` als Quelle `GitHub Actions` auswählen.
5. Falls der erste Push noch vor der Auswahl erfolgt ist, den Workflow
   `Running Dashboard auf GitHub Pages veröffentlichen` unter `Actions`
   manuell starten.

Danach veröffentlicht jeder Push auf den Branch `main` automatisch die aktuelle
Anwendung.

## Datenschutz

Der Workflow kopiert nur die für die Anwendung erforderlichen Dateien in das
Pages-Artefakt. Lokale JSON-Backups und CSV-Exporte werden nicht veröffentlicht.
Die passenden Dateimuster stehen zusätzlich in `.gitignore`.

## Vorhandene Browserdaten

`localStorage` ist an die jeweilige Herkunft gebunden. Daten von `localhost`
erscheinen deshalb nicht automatisch auf der GitHub-Pages-Adresse. Vorhandene
Daten zuerst lokal als JSON exportieren und anschließend auf der neuen Adresse
über die Importfunktion wiederherstellen.

## Eigene Subdomain

Für eine spätere Adresse wie `running.apuntar.de` müssen in GitHub Pages die
Custom Domain eingetragen und beim DNS-Anbieter die von GitHub verlangten
Einträge gesetzt werden. Eine `CNAME`-Datei sollte erst ergänzt werden, wenn die
endgültige Domain feststeht und die DNS-Konfiguration vorbereitet ist.
