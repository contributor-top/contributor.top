---
title: Metodoloji
description: contributor.top'un GitHub kullanıcılarını nasıl seçtiği ve sıraladığı.
---

# Metodoloji

## Kimler değerlendiriliyor

1. Her ülke için GitHub'da profil **konumu** o ülkeyle ya da şehirlerinden biriyle eşleşen kullanıcıları ararız. Her ülkenin konum ifadeleri listesi [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) içindedir ve pull request'lere açıktır.
2. GitHub araması katkılara göre sıralama yapamaz; bu yüzden eşleşen herkes arasından **en çok takipçisi olan {{consider}} kullanıcıyı** alır ve yalnızca onları sıralarız. Her ülke sayfası, değerlendirilenler arasında en az takipçisi olan kişinin gerçek takipçi sayısını gösterir.
3. Kuruluşlar ve botlar hariç tutulur.
4. Herkes tam olarak **bir** ülkeye aittir: profil konumunda adı geçen ilk ülkeye. Birden fazla ülke yazılıysa yalnızca ilki sayılır.

## Neler sayılıyor

Son 12 aydaki katkılar, GitHub'ın profillerde saydığı şekliyle:

- **Herkese açık katkılar** — herkesin görebildiği commit'ler, pull request'ler, issue'lar ve incelemeler.
- **Tüm katkılar** — herkese açık ve özel katkılar. Özel katkılar yalnızca bunları profilinde göstermeyi seçen kişiler için sayılır; diğer herkes için bu sekme herkese açık sekmeyle aynı sayıyı gösterir.
- **Commit'ler** — yalnızca herkese açık commit'ler.

Eşitlik durumunda önce takipçi sayısına, sonra kullanıcı adına bakılır.

Her ismin altında: `C` herkese açık commit'ler, `PR` pull request'ler, `IS` issue'lar, `RV` incelemeler ve özel katkılar için bir kilit (tam sayıları görmek için imleci üzerine getirin).

## İşaretler ve hariç tutmalar

Herkes için aynı olan birkaç kural, doğrulanamayan ya da bir betiğin ürettiği sayıların sıralamayı belirlemesini engeller. Sıralamadaki her işaret, üzerine gelindiğinde arkasındaki kuralı ve uygulandığı sayıları gösterir.

| Kural                                | Ne zaman                                                                                                                                                                   | Sonuç                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Neredeyse tamamı özel                | Katkıların %{{private_flag}} veya fazlası özel                                                                                                                             | **Tüm katkılar** sıralamasında toplamın yanında kilit                   |
| Neredeyse hiç herkese açık katkı yok | Herkese açık katkılar toplamın %{{min_public}} altında                                                                                                                     | **Tüm katkılar** dışında kalır; diğer sıralamalarda yer alır            |
| Commit çiftliği                      | En az {{min_commits}} commit ve pull request, issue ile incelemelerin toplamının en az {{ratio}} katı                                                                      | Ülke sıralamalarında robot; dünya sıralaması ve dünya rozetleri dışında |
| Tek sessiz depo                      | En az {{min_commits}} commit ve bunların %{{quiet_share}} veya fazlası yıldızı {{quiet_stars}} altında olan tek bir kendi deposunda                                        | Commit çiftliğiyle aynı                                                 |
| İstisna                              | Commit'lerin %{{popular_share}} veya fazlası en az {{popular_stars}} yıldızlı başka birinin deposuna ya da böyle bir deposu olan bir kuruluşun herhangi bir deposuna gider | Asla otomatik olarak işaretlenmez                                       |

GitHub özel etkinliği bölünemeyen ve doğrulanamayan tek bir sayı olarak bildirir; bu yüzden yalnızca herkese açık çalışma onu desteklediğinde sayılır. Pek çok kişi kapalı kaynak kod üzerinde çalıştığından tek başına kilit kimseyi çıkarmaz. Büyük topluluk projelerinin ve Linux dağıtımlarının bakımcılarının sık yaptığı gibi yaygın kullanılan bir projeye doğrudan commit yapanlar otomatik sayılmaz: oraya commit yetkisini yalnızca projenin kendisi verebilir.

## Sıralamaları doğrulamak

Sıralamalar yalnızca bu kurallara ve yukarıdaki sıralama düzenine uyar; kimse elle yer değiştirmez. Eşikler [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml) dosyasından gelir ve içindeki tek elle tutulan liste olan `denylist_ids` yalnızca herkese açık bir pull request ile değişir. Her ülke için toplanan sayılar deponun [`data` dalında](https://github.com/contributor-top/contributor.top/tree/data) bulunur; böylece her sıralama yeniden hesaplanıp doğrulanabilir.

## Neden listede değilim?

- Profil konumunuz ülkenizin preset'indeki hiçbir ifadeyle eşleşmiyor. Konum serbest metindir: şehrinizi veya ülkenizi ekleyin ya da preset'e bir pull request açın.
- Ülkenizde en çok takipçisi olan {{consider}} kullanıcı arasında değilsiniz.
- Katkılarınızın neredeyse tamamı özel (herkese açık olanlar %{{min_public}} altında): bu durumda yalnızca **Tüm katkılar** sıralamasında yer almazsınız.
- Katkılarınız özel ve profilinizde gösterilmiyor.
- Listeden çıkarılmayı istediniz (bkz. [Gizlilik ve listeden çıkma](/tr/privacy/)).

## Veri erişimi

Her sıralama JSON olarak da sunulur: [`/api/index.json`](/api/index.json) ülkeleri listeler, `/api/<country>.json` (örneğin `/api/canada.json`) ise üç sıralamanın tamamını sıra, kullanıcı adı ve katkılarla birlikte içerir. Dünya sıralaması [`/api/world.json`](/api/world.json) dosyasındadır. Dosyalar statiktir ve herhangi bir siteden alınabilir.

Bunları açık kaynak araştırmaları, istatistikler ve topluluk projeleri için kullanın. İnsanlara toplu mesaj göndermek, işe alım amacıyla ulaşmak veya verileri yeniden satmak için kullanmayın. Listeden çıkan kişiler hiçbir zaman dahil edilmez.

## Güncellemeler

Ülkeler sırayla güncellenir; en uzun süredir güncellenmemiş olan önce gelir. Her ülke sayfası en son ne zaman güncellendiğini gösterir.

[committers.top](https://committers.top) projesinden esinlenilmiştir.
