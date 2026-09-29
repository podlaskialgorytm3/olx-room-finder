# Podsumowanie aplikacji OLX Room Finder

**Architektura:** Backend FastAPI (Python) + baza SQLite (`data.db`), frontend Next.js/React + Leaflet (mapy) + Recharts (wykresy).

## Featury
- **Wyszukiwanie ofert OLX** — automatyczna, codzienna synchronizacja ofert pokoi/mieszkań z OLX per miasto/kategoria (harmonogram + ręczne uruchomienie).
- **Przeglądanie i filtrowanie ofert** — lista ofert z filtrami (miasto, dzielnica, cena, powierzchnia), licznik wyświetleń, szczegóły oferty.
- **Analiza rynku** — statystyki cen wg dzielnic, rozkład cen, kaucje, koszty dodatkowe, negocjowalność, wykrywanie outlierów, wskaźnik "value score" (cena vs. wartość).
- **Ulubione** — zalogowani najemcy mogą polubić ofertę (favorites).
- **Konta użytkowników** — rejestracja/logowanie najemców i wynajmujących; konta wynajmujących wymagają zatwierdzenia przez admina.
- **Panel wynajmującego (landlord)** — dodawanie/edycja/usuwanie własnych ofert (osobne od ofert OLX, `source='landlord'`), moderacja (pending/approved/rejected).
- **Panel administratora** — osobny system logowania (admin), zarządzanie: miastami/konfiguracją synchronizacji, ofertami (w tym moderacja), kontami użytkowników.
- **Historia ofert** — log zdarzeń (utworzenie/usunięcie/zmiana ceny) do analiz w czasie mimo usuwania ofert.

## Endpointy API

| Prefix | Router | Przykładowe akcje |
|---|---|---|
| `/api/offers` | offers | lista ofert, szczegóły oferty |
| `/api/statistics` | statistics | overview, districts, price, price-distribution, deposits, additional-costs, negotiation |
| `/api/analysis` | analysis | price-vs-district, initial-cost, districts, outliers, cost-distribution, value |
| `/api/sync` | sync | status synchronizacji, ręczne uruchomienie (`POST /run`) |
| `/api/auth` | auth (admin) | login/logout/me |
| `/api/admin` | admin | CRUD miast (`/cities`), zarządzanie ofertami (`/offers`), akceptacja/odrzucanie, wyzwalanie synchronizacji per miasto |
| `/api/admin/users` | admin_users | CRUD kont użytkowników |
| `/api/users` | users | rejestracja, login/logout, `me` (konta najemców/wynajmujących) |
| `/api/landlord/offers` | landlord | CRUD własnych ofert wynajmującego |
| `/api/cities` | cities | publiczna lista miast |
| `/api/favorites` | favorites | lista ulubionych, dodanie/usunięcie, status per oferta |
| `/api/health` | main | health check |

## Tabele bazy danych (SQLite)
- **offers** — oferty (OLX + landlord): tytuł, miasto, kategoria (room/apartment), dzielnica, cena, m², kaucja, koszty dodatkowe, zdjęcia, status (pending/approved/rejected), source, owner_user_id.
- **offer_history** — log zdarzeń oferty (created/removed/price_changed) do analiz historycznych.
- **sync_runs** — log przebiegów synchronizacji (liczba ofert dodanych/usuniętych, strony).
- **city_configs** — konfiguracja miasta: linki OLX per kategoria, godziny synchronizacji.
- **admin_users** / **admin_sessions** — konta i tokeny administratorów panelu.
- **users** / **user_sessions** — konta (tenant/landlord) i tokeny sesji użytkowników serwisu.
- **favorites** — ulubione oferty najemców (user_id + offer_id, unikalne).

## Frontend (strony Next.js)
`/` (lista ofert), `/offers`, `/statistics`, `/analysis`, `/favorites`, `/login`, `/register`, `/landlord`, `/admin`, `/admin/login`.
