---
title: Metodoloji
description: contributor.top'un GitHub kullanıcılarını nasıl seçtiği ve sıraladığı.
---

# Metodoloji

## Kimler değerlendiriliyor

1. Her ülke için GitHub'da profil **konumu** o ülkeyle ya da şehirlerinden biriyle eşleşen kullanıcıları ararız. Her ülkenin konum ifadeleri listesi [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) içindedir ve pull request'lere açıktır.
2. GitHub araması katkılara göre sıralama yapamaz; bu yüzden eşleşen herkes arasından **en çok takipçisi olan 1000 kullanıcıyı** alır ve yalnızca onları sıralarız. Her ülke sayfası, değerlendirilenler arasında en az takipçisi olan kişinin gerçek takipçi sayısını gösterir.
3. Kuruluşlar ve botlar hariç tutulur.
4. Herkes tam olarak **bir** ülkeye aittir: profil konumunda adı geçen ilk ülkeye. Birden fazla ülke yazılıysa yalnızca ilki sayılır.

## Neler sayılıyor

Son 12 aydaki katkılar, GitHub'ın profillerde saydığı şekliyle:

- **Herkese açık katkılar** — herkesin görebildiği commit'ler, pull request'ler, issue'lar ve incelemeler.
- **Tüm katkılar** — herkese açık ve özel katkılar. Özel katkılar yalnızca bunları profilinde göstermeyi seçen kişiler için sayılır; diğer herkes için bu sekme herkese açık sekmeyle aynı sayıyı gösterir.
- **Commit'ler** — yalnızca herkese açık commit'ler.

Eşitlik durumunda önce takipçi sayısına, sonra kullanıcı adına bakılır.

Her ismin altında: `C` herkese açık commit'ler, `PR` pull request'ler, `IS` issue'lar, `RV` incelemeler ve özel katkılar için bir kilit (tam sayıları görmek için imleci üzerine getirin). GitHub özel etkinliği bölünemeyen ve doğrulanamayan tek bir sayı olarak bildirir; bu yüzden **Tüm katkılar** sıralamasında toplamın yanındaki küçük kilit, katkılarının neredeyse tamamı (%90 veya daha fazlası) özel olan kişileri işaretler. Bu kişiler çıkarılmaz: birçok kişi kapalı kaynak kod üzerinde çalışır. Ana sıralama yalnızca herkese açık katkıları kullanır.

Bazı hesaplar çok büyük sayıda commit bildirir ama neredeyse başka hiçbir etkinlik göstermez: ne pull request, ne issue, ne de inceleme. Bütün gün aynı repoya commit atan bir betik böyle görünür; commit'lerinin neredeyse tamamı başka kimsenin kullanmadığı kendi reposuna giden bir hesap da öyle. Büyük topluluk projelerinin bakımcılarının sık yaptığı gibi, başkasına ait ve yaygın kullanılan bir projeye doğrudan commit atan kişiler otomatik sayılmaz. Bu tür hesaplar ülke sıralamalarında küçük bir robotla işaretlenir; dünya sıralamasına ve dünya rozetlerine dahil edilmez.

## Neden listede değilim?

- Profil konumunuz ülkenizin preset'indeki hiçbir ifadeyle eşleşmiyor. Konum serbest metindir: şehrinizi veya ülkenizi ekleyin ya da preset'e bir pull request açın.
- Ülkenizde en çok takipçisi olan 1000 kullanıcı arasında değilsiniz.
- Katkılarınız özel ve profilinizde gösterilmiyor.
- Listeden çıkarılmayı istediniz (bkz. [Gizlilik ve listeden çıkma](/tr/privacy/)).

## Veri erişimi

Her sıralama JSON olarak da sunulur: [`/api/index.json`](/api/index.json) ülkeleri listeler, `/api/<country>.json` (örneğin `/api/canada.json`) ise üç sıralamanın tamamını sıra, kullanıcı adı ve katkılarla birlikte içerir. Dünya sıralaması [`/api/world.json`](/api/world.json) dosyasındadır. Dosyalar statiktir ve herhangi bir siteden alınabilir.

Bunları açık kaynak araştırmaları, istatistikler ve topluluk projeleri için kullanın. İnsanlara toplu mesaj göndermek, işe alım amacıyla ulaşmak veya verileri yeniden satmak için kullanmayın. Listeden çıkan kişiler hiçbir zaman dahil edilmez.

## Güncellemeler

Ülkeler sırayla güncellenir; en uzun süredir güncellenmemiş olan önce gelir. Her ülke sayfası en son ne zaman güncellendiğini gösterir.

[committers.top](https://committers.top) projesinden esinlenilmiştir.
