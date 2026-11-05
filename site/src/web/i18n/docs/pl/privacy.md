---
title: Prywatność i rezygnacja
description: Jakich danych używa contributor.top i jak z niego zniknąć.
---

# Prywatność i rezygnacja

## Czego używamy

Tylko publicznych danych z profili GitHub: numerycznego ID konta, loginu, wyświetlanej nazwy, liczby obserwujących i liczby kontrybucji z ostatnich 12 miesięcy. Wyświetlana nazwa jest pokazywana na stronie obok loginu, tak jak na GitHubie, ale nie trafia do plików JSON; zmienia się, gdy zmienisz ją na GitHubie, przy następnej aktualizacji twojego kraju. Nie przechowujemy twojego adresu e-mail, opisu (bio), firmy, statusu ani dokładnego tekstu lokalizacji. Dane nie są sprzedawane ani przekazywane rekruterom czy portalom z ofertami pracy.

## Jak się usunąć

Ustaw na GitHubie status z wiadomością zawierającą `contributor.top opt-out`, widoczny dla wszystkich, z opcją „Clear after: Don't clear”. Znikniesz ze wszystkich rankingów i odznak przy następnej aktualizacji twojego kraju (w ciągu około dwóch dni); jeśli aktualizacja twojego kraju wciąż się nie udaje, status i tak jest sprawdzany na początku każdego uruchomienia kolektora. Potem możesz usunąć status; rezygnacja pozostaje w mocy.

Celowo nie ma formularza ani issue do wypełnienia: publiczna prośba na zawsze powiązałaby twój login z usunięciem. Status nie wymaga kontaktu z nami i jest odczytywany tylko z twojego własnego profilu, więc nikt nie może usunąć ani dodać nikogo innego.

Przechowujemy tylko hash z kluczem twojego ID konta, aby nie dodać cię z powrotem, w zaszyfrowanej liście, która przy każdym uruchomieniu jest szyfrowana na nowo: nie da się z niej odczytać ani kto, ani ile osób zrezygnowało, ani kiedy. Aby wrócić, ustaw status zawierający `contributor.top opt-in`.

## Czego nie możemy kontrolować

Kopii zrobionych przed usunięciem: starych commitów publicznego repozytorium, archiwów internetowych, forków i pamięci podręcznej wyszukiwarek. Każdy, kto porównuje rankingi w czasie, może zauważyć, że nie ma cię już na liście, tak jak w przypadku każdego, kto się przeprowadził lub wypadł z czołówki. Awatary są ładowane z serwerów GitHuba, a każda strona pyta API GitHuba o liczbę gwiazdek repozytorium, więc GitHub widzi adres IP odwiedzającego. Strona nie używa analityki ani plików cookie.

## Kontakt

Pytania dotyczące tej strony: [otwórz issue](https://github.com/contributor-top/contributor.top/issues).
