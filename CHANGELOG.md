# Changelog

## 3.2.0 – 2026-07-29

- Kompakten Zeitraumfilter im aktuellen Überblick ergänzt.
- „Letzte 30 Tage“ als Standard sowie Woche, Monat, Jahr und Gesamt zur Auswahl angeboten.
- Zeitraum gemeinsam auf Kennzahlen, Trainings-Score, Erkenntnisse und Trendvisualisierung angewendet.
- Gewählten Zeitraum dauerhaft in den lokalen Einstellungen gespeichert.
- Herzfrequenz als dritte Datenreihe in die Trendvisualisierung aufgenommen.
- Native Datum- und Uhrzeitfelder auf iPhones an die Formularbreite angepasst.
- Service-Worker-Cache auf `running-dashboard-v3.2.0` aktualisiert.

## 3.1.2 – 2026-07-29

- Trainings-Highlights auf ein ruhigeres Vollbreitenpanel umgestellt.
- Sechs zentrale Highlights standardmäßig sichtbar gemacht.
- Vier ergänzende Highlights über „Alle Highlights anzeigen“ ein- und ausklappbar gemacht.
- Highlight-Raster auf drei Spalten am großen Desktop, zwei Spalten auf Tablet und eine Spalte unter 768 Pixeln festgelegt.
- Kartenabstände verdichtet und dezente Hover-, Fokus- und Reduced-Motion-Zustände ergänzt.
- Berechnungen, Werte, Formatierungen und Datenmodell unverändert beibehalten.
- Service-Worker-Cache auf `running-dashboard-v3.1.2` aktualisiert.

## 3.1.1 – 2026-07-29

- Migrationslogik einschließlich leerer Prüfung, Wiederholungsschutz, Recovery-Erstellung und Fehler-Rollback erneut geprüft.
- Recovery-Rotation, Vorschau, Wiederherstellung, Download und Schadenschutz erneut geprüft.
- Zentrale Formatierungsfunktionen für deutsche Zahlen, Pace, Trends, Dauer, Datum, Herzfrequenz, Kadenz und Höhenmeter ergänzt.
- Dezimal-Pace aus Dashboard, Trends, Highlights, Verlauf, Rekorden, Schuhvergleich und PDF entfernt.
- CSV-Datum auf `TT.MM.JJJJ` und CSV-Dauer auf `mm:ss` beziehungsweise `hh:mm:ss` vereinheitlicht.
- Trainings-Highlights auf zehn kompakte, responsive Karten mit Icon, Wert, Titel, Datum und optionalem Schuh umgestellt.
- Highlightberechnungen vergleichen ausschließlich Rohwerte und formatieren erst nach Auswahl des Ergebnisses.
- Schnellster Lauf, schnellste Pace, niedrigste Herzfrequenz, höchste Kadenz, meiste Höhenmeter, längster Lauf und längste Laufzeit auf direkte Rohwertvergleiche vereinheitlicht.
- Beste Trainingswoche aus ungerundeten Wochensummen berechnet.
- Größte Verbesserung aus aufeinanderfolgenden ungerundeten Pace-Werten berechnet.
- Meistgenutzten Schuh nach Laufanzahl und bei Gleichstand nach Rohdistanz ergänzt.
- Diagrammdatumswerte vollständig formatiert und für schmale Container gedreht.
- Highlight-Grid auf Desktop flexibel, auf Tablet zweispaltig und mobil einspaltig gestaltet.
- Service-Worker-Cache auf `running-dashboard-v3.1.1` aktualisiert.

## 3.1.0 – 2026-07-29

- Schuhmigration idempotent gemacht und den Abschluss auch ohne gefundene Altdaten dauerhaft gespeichert.
- Migrationsstatus und Abschlusszeitpunkt im Datenbankstatus ergänzt.
- Fehlerhafte oder unbekannte Migrationsdaten blockieren die Migration und werden in Oberfläche und Konsole gemeldet.
- Recovery-System auf maximal fünf rotierende lokale Vollsicherungen erweitert.
- Recovery-Backups vor Migration, JSON-Import, Schuhzusammenführung, vollständiger Löschung und Wiederherstellung ergänzt.
- Recovery-Verwaltung mit Vorschau, Wiederherstellung, JSON-Download und manuellem Löschen ergänzt.
- Einheitliches `settings`-Objekt für Theme, Historien-Seitenlänge, Sortierung und gespeicherte Filter eingeführt.
- JSON-Format um `schemaVersion` und vollständige Einstellungen erweitert.
- Kompatiblen Import älterer Backups ohne Einstellungen beibehalten.
- Importvorschau mit Versions-, Daten-, Einstellungs- und Warnungsinformationen ergänzt.
- Formularstatus, zugängliche Dialoge und sichtbaren Migrations-/Speicherstatus ergänzt.
- Kompaktübersicht um eine datenbasierte Empfehlung für den nächsten Lauf erweitert.
- Responsive Karten, Recovery-Verwaltung, Dialoge und Touch-Ziele für kleine Displays optimiert.
- Diagramme ohne feste Mindestbreite an den Container angepasst.
- PWA-Manifest um relativen Scope und App-Icon ergänzt.
- Service Worker auf Cache-Version `running-dashboard-v3.1.0` aktualisiert und Update-/Offline-Fehlerbehandlung verbessert.

## 3.0.0 – 2026-07-29

- Grundlegende modulare Überarbeitung des Running Dashboards.
- Helles und dunkles Farbschema eingeführt.
- Responsive Dashboard-, Historien- und Schuhansichten umgesetzt.
- JSON-, CSV-, PDF-, Statistik- und Schuhfunktionen beibehalten und modernisiert.
