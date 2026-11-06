# Security and privacy notes

- No `INTERNET` permission is declared in the Android manifest. There is no cloud AI endpoint, telemetry or analytics.
- User-supplied GGUF model files are copied to app-private storage. They are not uploaded by Mikus.
- Room is backed by SQLCipher. The random database passphrase is wrapped with AES-GCM using a key held by Android Keystore.
- Android backup is disabled. Use the app's password-protected encrypted export if you need a portable backup; protect the backup password separately.
- Biometric/device credential gating is an app-entry gate, not a guarantee against a compromised OS, rooted device, malware, screenshots or physical coercion.
- Microphone access is only used after explicit user action and Android permission. The foreground service displays an ongoing notification. Android privacy indicators remain active.
- OCR and model inference execute locally. Offline recognizer/TTS availability depends on the installed Android components; Mikus does not intentionally request network fallback.
- Do not commit model files, database files, exports, backups, personal documents, signing keys or passwords to GitHub.

No application can promise absolute security. Device compromise, OS vulnerabilities, unlocked physical access, malicious keyboards/accessibility services and lost Keystore material remain risks.
