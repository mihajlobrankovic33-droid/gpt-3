# StudyBuddy - Vaš AI asistent za učenje

StudyBuddy je moderna Web aplikacija dizajnirana da pomogne studentima i đacima u učenju koristeći veštačku inteligenciju.

## Glavne funkcionalnosti

- **Potpuno besplatno**: Sve funkcije su besplatne - nema Pro pretplate, kodova ni limita.
- **Multi-jezička podrška**: Aplikacija podržava više jezika (Srpski, Engleski, itd.).
- **Pametne puškice**: Brzo izvucite ključne informacije iz slika beleški - bez dnevnih limita.
- **AI Chat**: Razgovarajte sa AI asistentom koji je obučen da bude strpljiv mentor.
- **Poruke (ćaskanje)**: Pošaljite poruke, beleške i puškice prijateljima i drugim korisnicima - tekstualno ćaskanje kao Viber, bez video poziva.
- **Istorija sesija**: Sačuvajte svoje razgovore i vratite im se kasnije.

## Tehnologije

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **AI**: Google Gemini 1.5 Flash

## Lokalno pokretanje

Za pokretanje projekta lokalno potrebni su Node.js i npm.

1. Klonirajte repozitorijum.
2. Instalirajte zavisnosti: `npm install`
3. Podesite `.env` datoteku (pogledajte `.env.example`).
4. Pokrenite razvojni server: `npm run dev`

## Supabase podešavanja

Aplikacija zahteva Supabase projekat sa sledećim Edge funkcijama:
- `study-chat`: Za razgovor sa AI asistentom.
- `extract-puskica`: Za analizu slika beleški.
- Ostale administrativne funkcije.

U Supabase postavkama (Secrets) potrebno je postaviti `GEMINI_API_KEY`.
