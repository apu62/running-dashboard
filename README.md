# Running Dashboard

Persönliches, lokal gespeichertes Dashboard für Läufe, Statistiken und Laufschuhe.

## Trainingsart

Jeder Lauf kann optional einer Trainingsart zugeordnet werden. Die Anwendung speichert stabile interne Werte und zeigt deutsche Bezeichnungen:

| Interner Wert | Anzeige |
| --- | --- |
| `recovery` | Regenerationslauf |
| `easy` | Lockerer Lauf |
| `tempo` | Tempolauf |
| `interval` | Intervalltraining |
| `long_run` | Langer Lauf |
| `race` | Wettkampf |
| `unknown` | Nicht zugeordnet |

Alte Läufe ohne dieses Feld werden als „Nicht zugeordnet“ behandelt. JSON-Sicherungen verwenden den internen Wert; CSV- und PDF-Exporte verwenden die deutsche Bezeichnung. Ein CSV-Import ist nicht Bestandteil der Anwendung.
