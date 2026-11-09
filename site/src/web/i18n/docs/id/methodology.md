---
title: Metodologi
description: Cara contributor.top memilih dan memeringkat pengguna GitHub.
---

# Metodologi

## Siapa yang dipertimbangkan

1. Untuk setiap negara, kami mencari pengguna GitHub yang **lokasi** profilnya cocok dengan negara tersebut atau salah satu kotanya. Daftar string lokasi untuk setiap negara ada di [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) dan terbuka untuk pull request.
2. Pencarian GitHub tidak bisa mengurutkan berdasarkan kontribusi, jadi dari semua yang cocok kami mengambil **{{consider}} pengguna dengan pengikut terbanyak** dan hanya memeringkat mereka. Setiap halaman negara menampilkan jumlah pengikut sebenarnya dari orang dengan pengikut paling sedikit yang dipertimbangkan.
3. Organisasi dan bot dikecualikan.
4. Setiap orang masuk ke tepat **satu** negara: negara pertama yang disebut di lokasi profilnya. Jika beberapa negara dicantumkan, hanya yang pertama yang dihitung.

## Apa yang dihitung

Kontribusi dalam 12 bulan terakhir, sebagaimana GitHub menghitungnya di profil:

- **Kontribusi publik** — commit, pull request, issue, dan review yang terlihat oleh semua orang.
- **Semua kontribusi** — publik ditambah privat. Kontribusi privat hanya dihitung bagi orang yang memilih untuk menampilkannya di profil; bagi yang lain, tab ini menunjukkan angka yang sama dengan tab publik.
- **Commit** — hanya commit publik.

Jika nilainya sama, urutan ditentukan oleh jumlah pengikut, lalu oleh nama pengguna.

Di bawah setiap nama: `C` commit publik, `PR` pull request, `IS` issue, `RV` review, dan gembok untuk kontribusi privat (arahkan kursor untuk melihat angka pastinya).

## Tanda dan pengecualian

Beberapa aturan, sama untuk semua orang, mencegah angka yang tidak bisa diperiksa atau yang dihasilkan skrip menentukan peringkat. Setiap tanda di peringkat menampilkan aturan di baliknya dan angka yang dipakai saat kursor diarahkan ke tanda itu.

| Aturan                       | Kapan                                                                                                                                                                                           | Akibatnya                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Hampir semuanya privat       | {{private_flag}}% kontribusi atau lebih bersifat privat                                                                                                                                         | Gembok di samping total di **Semua kontribusi**               |
| Hampir tidak ada yang publik | Kontribusi publik kurang dari {{min_public}}% dari total                                                                                                                                        | Tidak masuk **Semua kontribusi**, tetap ada di peringkat lain |
| Ladang commit                | {{min_commits}} commit atau lebih, setidaknya {{ratio}} kali jumlah pull request, issue, dan review sekaligus                                                                                   | Tidak masuk peringkat mana pun                                |
| Satu repositori sepi         | {{min_commits}} commit atau lebih, {{quiet_share}}% atau lebih di satu repositori milik sendiri dengan kurang dari {{quiet_stars}} bintang                                                      | Sama seperti ladang commit                                    |
| Pengecualian                 | {{popular_share}}% commit atau lebih masuk ke repositori orang lain dengan {{popular_stars}} bintang atau lebih, atau ke repositori mana pun milik organisasi yang punya repositori seperti itu | Tidak pernah ditandai otomatis                                |

GitHub melaporkan aktivitas privat sebagai satu angka yang tidak bisa dipecah atau diverifikasi, jadi angka itu hanya dihitung jika didukung kerja publik; gembok saja tidak mengeluarkan siapa pun, karena banyak orang bekerja di kode tertutup. Orang yang melakukan commit langsung ke proyek yang banyak dipakai, seperti yang sering dilakukan pengelola proyek komunitas besar dan distribusi Linux, tidak dianggap otomatis: hanya proyek itu sendiri yang bisa memberi mereka akses tulis.

## Memeriksa peringkat

Peringkat hanya mengikuti aturan ini dan urutan di atas; tidak ada yang dipindahkan secara manual. Ambang batasnya ada di [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), dan satu-satunya daftar manualnya, `denylist_ids`, hanya berubah lewat pull request publik. Angka yang dikumpulkan untuk setiap negara ada di [cabang `data`](https://github.com/contributor-top/contributor.top/tree/data) repositori, sehingga setiap peringkat bisa dihitung ulang dan diperiksa.

## Mengapa saya tidak ada di daftar?

- Lokasi profil Anda tidak cocok dengan string mana pun di preset negara Anda. Lokasi adalah teks bebas: tambahkan kota atau negara Anda, atau buka pull request ke preset tersebut.
- Anda tidak termasuk {{consider}} pengguna dengan pengikut terbanyak di negara Anda.
- Hampir semua kontribusi Anda privat (kurang dari {{min_public}}% publik): Anda hanya tidak masuk **Semua kontribusi**.
- Commit Anda tampak otomatis (lihat aturan di atas): akun seperti itu tidak masuk peringkat mana pun.
- Kontribusi Anda privat dan tidak ditampilkan di profil.
- Anda meminta untuk dihapus (lihat [Privasi dan keluar dari peringkat](/id/privacy/)).

## Akses data

Setiap peringkat juga tersedia dalam format JSON: [`/api/index.json`](/api/index.json) berisi daftar negara, dan `/api/<country>.json` (misalnya `/api/canada.json`) memuat ketiga peringkat beserta posisi, nama pengguna, dan kontribusi. Peringkat dunia ada di [`/api/world.json`](/api/world.json). File-file ini statis dan bisa diambil dari situs mana pun.

Gunakan data ini untuk riset open source, statistik, dan proyek komunitas. Jangan gunakan untuk menghubungi orang secara massal, untuk perekrutan, atau untuk menjual kembali data. Orang yang memilih keluar tidak pernah disertakan.

## Pembaruan

Negara diperbarui satu per satu, dimulai dari yang paling lama tidak diperbarui. Setiap halaman negara menampilkan kapan terakhir kali diperbarui.

Terinspirasi oleh [committers.top](https://committers.top).
