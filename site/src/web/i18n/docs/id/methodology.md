---
title: Metodologi
description: Cara contributor.top memilih dan memeringkat pengguna GitHub.
---

# Metodologi

## Siapa yang dipertimbangkan

1. Untuk setiap negara, kami mencari pengguna GitHub yang **lokasi** profilnya cocok dengan negara tersebut atau salah satu kotanya. Daftar string lokasi untuk setiap negara ada di [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) dan terbuka untuk pull request.
2. Pencarian GitHub tidak bisa mengurutkan berdasarkan kontribusi, jadi dari semua yang cocok kami mengambil **1000 pengguna dengan pengikut terbanyak** dan hanya memeringkat mereka. Setiap halaman negara menampilkan jumlah pengikut sebenarnya dari orang dengan pengikut paling sedikit yang dipertimbangkan.
3. Organisasi dan bot dikecualikan.
4. Setiap orang masuk ke tepat **satu** negara: negara pertama yang disebut di lokasi profilnya. Jika beberapa negara dicantumkan, hanya yang pertama yang dihitung.

## Apa yang dihitung

Kontribusi dalam 12 bulan terakhir, sebagaimana GitHub menghitungnya di profil:

- **Kontribusi publik** — commit, pull request, issue, dan review yang terlihat oleh semua orang.
- **Semua kontribusi** — publik ditambah privat. Kontribusi privat hanya dihitung bagi orang yang memilih untuk menampilkannya di profil; bagi yang lain, tab ini menunjukkan angka yang sama dengan tab publik.
- **Commit** — hanya commit publik.

Jika nilainya sama, urutan ditentukan oleh jumlah pengikut, lalu oleh nama pengguna.

Di bawah setiap nama: `C` commit publik, `PR` pull request, `IS` issue, `RV` review, dan gembok untuk kontribusi privat (arahkan kursor untuk melihat angka pastinya). GitHub melaporkan aktivitas privat sebagai satu angka yang tidak bisa dipecah atau diverifikasi, jadi di peringkat **Semua kontribusi** gembok kecil di samping total menandai orang yang kontribusinya hampir seluruhnya (90% atau lebih) privat. Mereka tidak dihapus: banyak orang bekerja dengan kode sumber tertutup. Peringkat utama hanya memakai kontribusi publik.

Beberapa akun melaporkan jumlah commit yang sangat besar dan hampir tidak ada aktivitas lain: tidak ada pull request, issue, maupun review. Seperti itulah tampilan skrip yang melakukan commit ke repositori yang sama sepanjang hari, begitu pula akun yang hampir semua commit-nya masuk ke satu repositori miliknya sendiri yang tidak dipakai orang lain. Orang yang melakukan commit langsung ke proyek milik orang lain yang banyak digunakan, seperti yang sering dilakukan maintainer proyek komunitas besar, tidak dianggap otomatis. Akun seperti itu ditandai dengan robot kecil di peringkat negara dan tidak dimasukkan ke peringkat dunia maupun badge dunia.

## Mengapa saya tidak ada di daftar?

- Lokasi profil Anda tidak cocok dengan string mana pun di preset negara Anda. Lokasi adalah teks bebas: tambahkan kota atau negara Anda, atau buka pull request ke preset tersebut.
- Anda tidak termasuk 1000 pengguna dengan pengikut terbanyak di negara Anda.
- Kontribusi Anda privat dan tidak ditampilkan di profil.
- Anda meminta untuk dihapus (lihat [Privasi dan keluar dari peringkat](/id/privacy/)).

## Akses data

Setiap peringkat juga tersedia dalam format JSON: [`/api/index.json`](/api/index.json) berisi daftar negara, dan `/api/<country>.json` (misalnya `/api/canada.json`) memuat ketiga peringkat beserta posisi, nama pengguna, dan kontribusi. Peringkat dunia ada di [`/api/world.json`](/api/world.json). File-file ini statis dan bisa diambil dari situs mana pun.

Gunakan data ini untuk riset open source, statistik, dan proyek komunitas. Jangan gunakan untuk menghubungi orang secara massal, untuk perekrutan, atau untuk menjual kembali data. Orang yang memilih keluar tidak pernah disertakan.

## Pembaruan

Negara diperbarui satu per satu, dimulai dari yang paling lama tidak diperbarui. Setiap halaman negara menampilkan kapan terakhir kali diperbarui.

Terinspirasi oleh [committers.top](https://committers.top).
