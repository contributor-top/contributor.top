---
title: Metodologia
description: Jak contributor.top wybiera i szereguje użytkowników GitHuba.
---

# Metodologia

## Kogo uwzględniamy

1. Dla każdego kraju szukamy na GitHubie użytkowników, których **lokalizacja** w profilu pasuje do kraju lub jednego z jego miast. Lista nazw lokalizacji dla każdego kraju znajduje się w [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) i jest otwarta na pull requesty.
2. Wyszukiwarka GitHuba nie potrafi sortować według kontrybucji, więc spośród wszystkich pasujących bierzemy **{{consider}} najczęściej obserwowanych użytkowników** i szeregujemy tylko ich. Na stronie każdego kraju podana jest rzeczywista liczba obserwujących najmniej obserwowanej z uwzględnionych osób.
3. Organizacje i boty są pomijane.
4. Każda osoba należy do dokładnie **jednego** kraju: pierwszego, który wymienia lokalizacja w jej profilu. Jeśli podano kilka krajów, liczy się tylko pierwszy.

## Co liczymy

Kontrybucje z ostatnich 12 miesięcy, tak jak GitHub liczy je w profilach:

- **Publiczne kontrybucje** — commity, pull requesty, issue i review widoczne dla wszystkich.
- **Wszystkie kontrybucje** — publiczne plus prywatne. Prywatne kontrybucje liczą się tylko u osób, które same zdecydowały się pokazywać je w profilu; u pozostałych ta zakładka pokazuje tę samą liczbę co publiczna.
- **Commity** — tylko publiczne commity.

Przy remisie decyduje liczba obserwujących, a potem login.

Pod każdym imieniem: `C` publiczne commity, `PR` pull requesty, `IS` issue, `RV` review oraz kłódka dla prywatnych kontrybucji (najedź kursorem, aby zobaczyć dokładne liczby).

## Oznaczenia i wykluczenia

Kilka reguł, jednakowych dla wszystkich, sprawia, że o rankingu nie decydują liczby, których nie da się sprawdzić albo które wygenerował skrypt. Każde oznaczenie po najechaniu kursorem pokazuje regułę, która je nadała, i liczby, do których ją zastosowano.

| Reguła                   | Kiedy                                                                                                                                                                                    | Co się dzieje                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Prawie wszystko prywatne | {{private_flag}}% kontrybucji lub więcej jest prywatnych                                                                                                                                 | Kłódka obok sumy w **Wszystkie kontrybucje**                   |
| Prawie nic publicznego   | Publiczne kontrybucje to mniej niż {{min_public}}% sumy                                                                                                                                  | Poza **Wszystkie kontrybucje**, nadal w pozostałych rankingach |
| Farma commitów           | {{min_commits}} commitów lub więcej, co najmniej {{ratio}} razy więcej niż pull requestów, issues i review razem                                                                         | Poza wszystkimi rankingami                                     |
| Jedno ciche repozytorium | {{min_commits}} commitów lub więcej, z czego {{quiet_share}}% lub więcej w jednym własnym repozytorium z liczbą gwiazdek poniżej {{quiet_stars}}                                         | Tak samo jak farma commitów                                    |
| Wyjątek                  | {{popular_share}}% commitów lub więcej trafia do cudzego repozytorium z co najmniej {{popular_stars}} gwiazdkami albo do dowolnego repozytorium organizacji, która ma takie repozytorium | Nigdy nie oznaczamy jako zautomatyzowane                       |

GitHub podaje prywatną aktywność jako jedną liczbę, której nie da się rozbić ani zweryfikować, więc liczy się ona tylko tam, gdzie wspiera ją praca publiczna; sama kłódka nikogo nie wyklucza, bo wiele osób pracuje nad zamkniętym kodem. Osoby commitujące bezpośrednio do szeroko używanego projektu, jak często robią opiekunowie dużych projektów społecznościowych i dystrybucji Linuksa, nie są uznawane za automaty: tylko sam projekt może dać im prawo zapisu.

## Jak sprawdzić rankingi

Rankingi kierują się wyłącznie tymi regułami i kolejnością opisaną wyżej; nikogo nie przesuwamy ręcznie. Progi pochodzą z [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), a jedyna ręczna lista w tym pliku, `denylist_ids`, zmienia się tylko przez publiczny pull request. Liczby zebrane dla każdego kraju są w [gałęzi `data`](https://github.com/contributor-top/contributor.top/tree/data) repozytorium, więc każdy ranking można przeliczyć i sprawdzić.

## Dlaczego mnie nie ma na liście?

- Lokalizacja w twoim profilu nie pasuje do żadnej nazwy z presetu twojego kraju. Lokalizacja to dowolny tekst: dopisz swoje miasto lub kraj albo otwórz pull request do presetu.
- Nie należysz do {{consider}} najczęściej obserwowanych użytkowników w twoim kraju.
- Prawie wszystkie twoje kontrybucje są prywatne (publiczne poniżej {{min_public}}%): wtedy nie ma cię tylko w **Wszystkie kontrybucje**.
- Twoje commity wyglądają na zautomatyzowane (zob. reguły powyżej): takie konta nie trafiają do żadnego rankingu.
- Twoje kontrybucje są prywatne i nie są pokazywane w profilu.
- Na twoją prośbę usunęliśmy cię z rankingów (zobacz [Prywatność i rezygnacja](/pl/privacy/)).

## Dostęp do danych

Każdy ranking jest dostępny także w formacie JSON: [`/api/index.json`](/api/index.json) zawiera listę krajów, a `/api/<country>.json` (na przykład `/api/canada.json`) zawiera wszystkie trzy rankingi z miejscem, loginem i kontrybucjami. Ranking światowy jest w [`/api/world.json`](/api/world.json). Pliki są statyczne i można je pobierać z dowolnej strony.

Używaj ich do badań nad open source, statystyk i projektów społecznościowych. Nie używaj ich do masowego kontaktowania się z ludźmi, rekrutacji ani odsprzedaży danych. Osoby, które zrezygnowały, nigdy nie są uwzględniane.

## Aktualizacje

Kraje są aktualizowane po kolei, zaczynając od tych, które najdłużej nie były aktualizowane. Na stronie każdego kraju widać, kiedy został ostatnio zaktualizowany.

Zainspirowane przez [committers.top](https://committers.top).
