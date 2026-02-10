# Oblivion/2 Web BBS (90s-inspired)

A browser-based retro BBS prototype with ANSI-inspired UI and classic flows:

- Splash screen + keyboard navigation
- Login and new user application questionnaire
- Sysop approval workflow
- Message board
- BBS directory
- File board upload/download (browser localStorage demo)

## Run

Because this is a static app, you can run it with any local web server.

PowerShell quick start:

```powershell
cd C:\Users\micha\Documents\Projects\BBS_90s
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Default sysop login

- Handle: `SYSOP`
- Password: `oblivion2`

## Notes

- This is an MVP without a server database; data is stored in browser localStorage.
- File uploads are stored as Data URLs in localStorage for demo purposes, so files must be small.
- The app includes legacy-style questionnaire prompts:
  - "What is a blue box used for?"
  - "What does PBX stand for?"

## Next step suggestions

- Move storage/auth to a backend (Node + PostgreSQL)
- Add ANSI rendering library for richer color control
- Add real resumable file transfer and checksums
- Add door-game style modules
