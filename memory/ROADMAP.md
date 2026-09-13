# GoalHoodz – Roadmap (Taslak v1, Haziran 2026)

Zincir: Robinhood Chain (id 4663) · Stack: React + Wagmi/RainbowKit · FastAPI · MongoDB

## Mevcut Durum (Faz 0 – Early Access) ✅
- Early List: X görevleri (follow / RT / quote), bilet numarası, referral puanı
- VIP bilet: Etherscan ile 8 zincirde hacim kontrolü → Bronze/Silver/Gold/Platinum
- Oyun motoru hazır (60 sn head soccer, 8 karakter, 2 arena, lig fikstürü) ama `GAME_LOCKED = true`
- Wallet sign-in (SIWE), leaderboard, admin paneli
- Askıya alınan: bot önlemi (imza ile kayıt / IP limiti / tx şartı / Turnstile)

---

## Faz 1 – NFT Koleksiyonu & Erişim Kapısı (Access Pass)
Hedef: OpenSea'de koleksiyon yayınla; NFT sahibi olan oyuna girebilsin.

1. **Akıllı kontrat (ERC-721)** – Robinhood Chain'e deploy
   - Sabit arz (ör. 3.333), mint fiyatı ETH, max/cüzdan
   - Early List katılımcıları için allowlist/whitelist mint (bilet no + VIP tier'a göre indirim/öncelik)
   - 8 piksel karakter = 8 trait ailesi; metadata + görseller IPFS'e
2. **Mint sayfası** (`/mint`) – RainbowKit ile bağlan, allowlist kontrolü, mint butonu, kalan arz sayacı
3. **OpenSea listelenmesi** – koleksiyon sayfası, royalty, contract metadata
4. **Token-gate** – `/api/auth/verify` sonrası backend `balanceOf(wallet) > 0` kontrolü (viem/web3.py RPC); NFT yoksa "Mint your pass" ekranı
5. **NFT → Karakter** – sahip olunan NFT'nin trait'i oyunda karakter olarak açılır (sadece sahip olunan karakterler seçilebilir)

Çıktı: `GAME_LOCKED = false`, oyun sadece NFT sahiplerine açık.

## Faz 2 – $GOALZ Token & Play-to-Earn
Hedef: Her maç ödül, lig şampiyonuna 10x, claim ile cüzdana.

1. **$GOALZ (ERC-20)** – Robinhood Chain'e deploy; arz/dağılım planı (oyun ödül havuzu %, takım/hazine %, likidite %)
2. **Ödül muhasebesi (off-chain)** – Her maç sonunda backend `pending_rewards` yazar
   - Maç oynama: X GOALZ (kazanan > berabere > kaybeden)
   - Lig şampiyonu: sezon boyunca kazandığının **10x**'i bonus
   - Anti-abuse: maç sonucu backend'de doğrulanır (süre, skor sınırı, günlük maç limiti)
3. **Claim kontratı (Merkle / imzalı claim)** – Backend, cüzdanın hak ettiği miktar için imza üretir; kullanıcı `claim()` çağırır, token cüzdana gelir
4. **Claim UI** – `/rewards` sayfası: bekleyen bakiye, claim geçmişi, tx linki (Blockscout)
5. **Sezon yapısı** – Sezon başlat/bitir (admin), sezon sonu şampiyon tespiti ve 10x dağıtımı

## Faz 3 – Takımlar (Clubs)
Hedef: Belirli $GOALZ eşiğine ulaşan oyuncu kendi takımını kurabilsin.

1. **Takım kurma** – Eşik: ör. 10.000 GOALZ (cüzdanda tutulmalı veya stake edilmeli); takım adı, piksel logo, renk
2. **Üyelik** – Davet / açık başvuru, kadro limiti (ör. 11), kaptan yetkileri
3. **Takım ligi** – Takım puanı = üyelerin maç puanlarının toplamı; haftalık takım sıralaması
4. **Takım ödül havuzu** – Sezon sonu en iyi takımlara GOALZ dağıtımı, kaptan payı
5. **Takım sayfaları** – `/clubs`, `/clubs/:id`, üyeler, form grafiği

## Faz 4 – Büyüme & Sürdürülebilirlik (sonraki)
- Bot önlemleri (askıdaki iş): imza ile kayıt, tx şartı, Turnstile
- PvP gerçek zamanlı maç (WebSocket) / turnuva modu
- NFT karakter yükseltmeleri (GOALZ yakarak stat / kozmetik)
- Mobil PWA, ses/ müzik, marketplace entegrasyonu (OpenSea listing widget)
- Governance: takım kaptanları için oylama

---

## Önerilen Sıra ve Bağımlılıklar
Faz 1 (NFT + gate) → Faz 2 (token + claim) → Faz 3 (takımlar). Faz 3, Faz 2'deki bakiye kontrolüne bağlıdır.

## Karar Gerektiren Noktalar
- NFT arzı, mint fiyatı, allowlist kuralı (Early List / VIP ayrıcalığı?)
- $GOALZ toplam arz, maç başı ödül miktarı, günlük maç limiti
- Takım kurma eşiği (tutma mı stake mi?), kadro büyüklüğü
- Kontratları kim deploy edecek / audit ihtiyacı
