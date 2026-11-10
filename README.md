# Taskmaster v3 (Android app)

A Jarvis-style personal assistant: accountability, safety, research, career planning, opportunities, body, mind and money. `www/` is the web app (still works as a PWA), `android/` wraps it in a real Android app with a small native plugin, and GitHub Actions builds the APK for you.

## Get the APK (about 5 minutes, no coding)
1. Create a new GitHub repo and upload everything in this folder, keeping the folders (`www`, `android`, `.github`). If your browser will not upload `.github`, use Add file, Create new file, type `.github/workflows/build-apk.yml` as the name, and paste the contents of that file.
2. Open the **Actions** tab, pick **Build Android APK**, and run it (it also runs on every push to `main`). The first build takes roughly 6 to 10 minutes.
3. On your phone, open the repo's **Releases** page, download `Taskmaster.apk` from the **latest** release and install it (allow "install unknown apps" for your browser when asked).
4. Updates install over the old app and keep your data, because every build is signed with the same key (`taskmaster.keystore`).

## First launch
Finish onboarding and accept the permission prompts, then open **Me, Phone control** and check that everything shows "on". For the full hands-free experience also tap:
- **Exact alarms** so deadlines fire on the minute.
- **Auto-call** (display over other apps) so a scheduled call can start itself while the app is closed. Without it you get a notification with a Call now button.
- **Battery** so Android does not put the app to sleep.

## What it does natively
- **Calls:** "call Mom" dials directly after a 3 second countdown (Cancel stops it).
- **WhatsApp calls:** "video call Raj" / "WhatsApp call Raj" starts the WhatsApp call itself using the contact's WhatsApp entry on your phone. If the contact has no WhatsApp entry, the chat opens instead and you tap the call icon.
- **Texts:** "text Raj saying I will be late" sends the SMS itself.
- **Contacts:** names are looked up in your phone contacts on the spot, no import needed. People you add in Me take priority.
- **Voice:** the Mic button uses Android speech recognition.
- **Alerts:** deadlines, escalating overdue nags and the 9am, 1pm, 5pm and 8pm check-ins are exact alarms stored on the phone. They survive restarts and need no ntfy.
- **Scheduled messages:** in Compose, a scheduled text sends itself and a scheduled call tries to dial itself (with Hands-free on in Me).

## What is new in v3
- **Today:** a "do this now" card, a smarter command parser (Hinglish, fuzzy names), and an action log.
- **SOS:** a floating button. Countdown, then SMS with your live location to your emergency contacts and any local authority numbers you add, then the 112 dialer (Android does not let apps auto-dial emergency numbers, so you tap call). Fake incoming call and check-in timer included. Set contacts in Me, Safety first.
- **Radar:** paste a link or post text, or share it from LinkedIn, Instagram, Facebook, WhatsApp or a browser through the Android share sheet. It finds the deadline, builds the steps, sets reminders and ranks priority. Also a publishing pipeline and a calendar.
- **Scholar:** feeds, papers, a reading canon of classic and current theory.
- **Path:** a 20-question interview, then a versioned plan from PhD to postdoc to professor that advances when a stage is done. Funding, programmes, supervisors, visas and citizenship per stage.
- **Life:** water, food, movement, sleep, mood journal, and Money (spending, savings goals, application costs, funding gap).
- **Jarvis:** remembers links and articles you teach it, uses your whole context, and reviews your week.

## Honest notes
- Social sites often hide posts behind a login. When a link cannot be read, paste the post text.
- Deadlines, visas, fees and affiliations change. Everything volatile is labelled "verify" and links to the official page. Add an Anthropic key in Me to get live web lookups with sources.
- The web layer was tested in a headless browser. The Android Java and the Gradle build could not be compiled where this was written, so the first Actions run may fail. If it does, paste the log and it can be fixed quickly.
- No app can listen for a wake word in the background or alert police on its own. SOS texts people you choose and opens the dialer.
- Health features are general wellbeing support, not medical advice.

## Limits
- Android may refuse to open the dialer from the background unless Auto-call is allowed; the notification fallback always works.
- WhatsApp calling relies on how WhatsApp stores contacts on Android. If WhatsApp changes that, it falls back to the chat.
- Sideloaded SMS permission is fine for personal use but the app cannot go on the Play Store as is.
- Reading your email inbox is not built (it needs a Google sign-in setup).
- Number format: numbers saved without a country code get the code set in Me (default 91).

## Signing key
`taskmaster.keystore` (password `taskmaster`) is committed so builds are repeatable. That is fine for a personal app, but anyone with the file could sign an APK that installs over yours. For a stricter setup, make your own keystore, replace the file and change the passwords in `android/app/build.gradle`.

## Privacy
Tasks, history and keys stay on the phone. Network calls go only to the AI engine you use (message text) and EmailJS (email contents, if you set it up).
