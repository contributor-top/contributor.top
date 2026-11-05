---
title: Metodologia
description: Jak contributor.top wybiera i szereguje użytkowników GitHuba.
---

# Metodologia

## Kogo uwzględniamy

1. Dla każdego kraju szukamy na GitHubie użytkowników, których **lokalizacja** w profilu pasuje do kraju lub jednego z jego miast. Lista nazw lokalizacji dla każdego kraju znajduje się w [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) i jest otwarta na pull requesty.
2. Wyszukiwarka GitHuba nie potrafi sortować według kontrybucji, więc spośród wszystkich pasujących bierzemy **1000 najczęściej obserwowanych użytkowników** i szeregujemy tylko ich. Na stronie każdego kraju podana jest rzeczywista liczba obserwujących najmniej obserwowanej z uwzględnionych osób.
3. Organizacje i boty są pomijane.
4. Każda osoba należy do dokładnie **jednego** kraju: pierwszego, który wymienia lokalizacja w jej profilu. Jeśli podano kilka krajów, liczy się tylko pierwszy.

## Co liczymy

Kontrybucje z ostatnich 12 miesięcy, tak jak GitHub liczy je w profilach:

- **Publiczne kontrybucje** — commity, pull requesty, issue i review widoczne dla wszystkich.
- **Wszystkie kontrybucje** — publiczne plus prywatne. Prywatne kontrybucje liczą się tylko u osób, które same zdecydowały się pokazywać je w profilu; u pozostałych ta zakładka pokazuje tę samą liczbę co publiczna.
- **Commity** — tylko publiczne commity.

Przy remisie decyduje liczba obserwujących, a potem login.

Pod każdym imieniem: `C` publiczne commity, `PR` pull requesty, `IS` issue, `RV` review oraz kłódka dla prywatnych kontrybucji (najedź kursorem, aby zobaczyć dokładne liczby). GitHub podaje prywatną aktywność jako jedną liczbę, której nie da się rozbić ani zweryfikować, dlatego w rankingu **Wszystkie kontrybucje** mała kłódka obok sumy oznacza osoby, których kontrybucje są prawie w całości (w 90% lub więcej) prywatne. Nie są one usuwane: wiele osób pracuje nad zamkniętym kodem. Główny ranking uwzględnia tylko publiczne kontrybucje.

Niektóre konta mają ogromną liczbę commitów i prawie żadnej innej aktywności: żadnych pull requestów, issue ani review. Tak wygląda skrypt, który przez cały dzień commituje do tego samego repozytorium, a także konto, którego commity prawie w całości trafiają do jego własnego repozytorium, z którego nikt inny nie korzysta. Osoby, które commitują bezpośrednio do szeroko używanego cudzego projektu, jak często robią maintainerzy dużych projektów społecznościowych, nie są uznawane za zautomatyzowane. Takie konta są oznaczone małym robotem w rankingach krajów i pomijane w rankingu światowym oraz w światowych odznakach.

## Dlaczego mnie nie ma na liście?

- Lokalizacja w twoim profilu nie pasuje do żadnej nazwy z presetu twojego kraju. Lokalizacja to dowolny tekst: dopisz swoje miasto lub kraj albo otwórz pull request do presetu.
- Nie należysz do 1000 najczęściej obserwowanych użytkowników w twoim kraju.
- Twoje kontrybucje są prywatne i nie są pokazywane w profilu.
- Na twoją prośbę usunęliśmy cię z rankingów (zobacz [Prywatność i rezygnacja](/pl/privacy/)).

## Dostęp do danych

Każdy ranking jest dostępny także w formacie JSON: [`/api/index.json`](/api/index.json) zawiera listę krajów, a `/api/<country>.json` (na przykład `/api/canada.json`) zawiera wszystkie trzy rankingi z miejscem, loginem i kontrybucjami. Ranking światowy jest w [`/api/world.json`](/api/world.json). Pliki są statyczne i można je pobierać z dowolnej strony.

Używaj ich do badań nad open source, statystyk i projektów społecznościowych. Nie używaj ich do masowego kontaktowania się z ludźmi, rekrutacji ani odsprzedaży danych. Osoby, które zrezygnowały, nigdy nie są uwzględniane.

## Aktualizacje

Kraje są aktualizowane po kolei, zaczynając od tych, które najdłużej nie były aktualizowane. Na stronie każdego kraju widać, kiedy został ostatnio zaktualizowany.

Zainspirowane przez [committers.top](https://committers.top).
