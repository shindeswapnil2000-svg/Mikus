# Mikus — private Android personal assistant

**Version 0.4.0 · Kotlin · Jetpack Compose · SQLCipher · Android Keystore · llama.cpp**

Mikus is a local-first Android assistant. Chat inference runs on the phone through the upstream llama.cpp Android binding and a user-supplied GGUF model. Speech input uses Android's on-device recognizer when an offline language pack is available; speech output selects only an installed voice that reports no network requirement. OCR uses bundled on-device ML Kit recognizers. The app does not include a cloud AI endpoint or the `INTERNET` permission.

## What is included in this delivery

- Native Kotlin/Jetpack Compose application.
- Encrypted Room/SQLCipher database with Android Keystore-protected database key.
- Persistent conversation history, ChatGPT JSON/text import, tasks, journal and creative drafts.
- Local GGUF inference integration using the Android library in `ggml-org/llama.cpp` (fetched by the build script; upstream source is not copied into this repository).
- User-selected model stored in app-private storage; model path remembered and loaded on next launch.
- Challenger, Strategist and Companion system prompts; Quick, Balanced and Deep generation limits.
- Offline speech input through Android's on-device `SpeechRecognizer` API when supported and provisioned.
- Offline TTS only when an installed voice reports `isNetworkConnectionRequired == false`.
- User-started “Hey Mikus” phrase monitor foreground service. It listens through the on-device recognizer and posts a notification when the phrase is recognized.
- On-device OCR for images and PDFs, including Latin and Devanagari text. PDF OCR is limited to 40 pages per import.
- Local BM25 relevance retrieval over encrypted conversation and OCR text, used to supply relevant context to the local model.
- Password-protected encrypted export/restore, biometric/device unlock gate, task reminders and reviewed phone/calendar handoffs.
- GitHub Actions workflow to fetch the native runtime, run unit tests and build a debug APK.

## Important limits — read before installing

1. **The GGUF model is not bundled.** It is several gigabytes and must be downloaded separately, then selected in Mikus Settings. GitHub is for source code, not model weights or private user data.
2. **Wake phrase monitoring is best-effort, not a system hotword provider.** It uses Android's on-device speech-recognition service in short recognition sessions, not a dedicated always-on DSP keyword detector. It can miss phrases, restart between utterances, consume battery, and be stopped by Android/Samsung. It does not start after reboot. Start it while Mikus is visible and keep its ongoing notification. Screen-locked operation is possible only while Android permits the already-started microphone foreground service to continue.
3. **Offline voice depends on the phone's installed speech services and language packs.** Mikus requests on-device recognition and refuses cloud fallback. If no on-device recognizer or offline English (India) pack is installed, voice input is unavailable. TTS is silent unless an offline voice is installed.
4. **The app is not a privileged Android assistant.** It does not replace Google Assistant/Bixby, obtain privileged hotword access, bypass microphone privacy indicators, or silently send SMS/calls.
5. **Device validation is still required.** The GitHub build must pass, then install and test the APK on a Galaxy S25 Ultra. Verify model loading, long chat sessions, microphone permission, offline recognition, TTS, notifications, reminders, backup/restore and battery behavior before relying on it.
6. **Semantic memory is not an embedding/vector database.** This delivery implements local BM25 retrieval and feeds relevant passages to the local LLM. It does not claim human-like recall or vector-semantic search.

## Build and upload to GitHub

### Easiest path

1. Create a GitHub repository, e.g. `mikus-personal-assistant`.
2. Extract this ZIP and upload the **contents** of `Mikus-GitHub-Ready` to the repository root. Include `.github` and `scripts`.
3. Push to `main` or open **Actions → Build Mikus Android APK → Run workflow**.
4. The workflow downloads the upstream llama.cpp source, installs Android SDK/NDK/CMake, builds the native binding and app, runs JVM tests, and uploads `mikus-debug-apk`. The native preparation script is `prepare-native.sh` in the repository root.
5. Download the artifact from the successful workflow run and install the APK.

The first native build can take a while. The repository itself stays compact because the native llama.cpp source is fetched during the build and `native/` is ignored by Git.

### Build locally

Requirements: Android Studio with Android SDK 36, NDK `29.0.13113456`, CMake `3.31.6`, JDK 17, Git and Gradle 8.13.

Run once from the project root:

```bash
bash scripts/prepare-native.sh
gradle --no-daemon testDebugUnitTest assembleDebug
```

On Windows, run the preparation script from Git Bash. Then open the project in Android Studio. If you delete `native/llama.cpp`, rerun the script before syncing/building.

APK: `app/build/outputs/apk/debug/app-debug.apk`.

## Set up the local model

Recommended starting point for a Galaxy S25 Ultra: **Qwen/Qwen3-4B-GGUF, Q4_K_M** (about 2.5 GB). Download the GGUF file from the official Qwen model page linked in `docs/LOCAL_AI.md`. Keep several additional GB free for runtime memory and context cache. In Mikus open **Settings → Choose / load GGUF model**, select the downloaded file, and wait for loading to finish. Once loaded, chat generation is local and does not need internet access.

Do not commit `.gguf`, `.onnx`, `.tflite`, `.db`, exported conversations, backups, signing keys or personal files to GitHub. `.gitignore` excludes common model/database/key formats.

## Voice setup

- Grant microphone permission when prompted.
- In Android Settings, install an offline speech-recognition language pack if your device's recognition service offers one (English (India) is requested).
- Install/download an offline TTS voice in the system Text-to-speech settings.
- Test the microphone button in Mikus before enabling the phrase monitor.
- To use the “Hey Mikus” monitor, open Settings and press **Start Hey Mikus listening** while the app is visible. Keep the persistent notification. For Samsung, set Mikus battery usage to **Unrestricted** if you want it to remain active longer; this still cannot guarantee continuous operation.

## Privacy and security

See `docs/SECURITY.md`. The manifest deliberately has no `INTERNET` permission. Model download is performed by you outside the app (e.g. in a browser); model selection/import uses Android's document picker. Speech recognition, TTS, OCR, BM25 retrieval and LLM inference run on-device. No analytics, ads, cloud database or automatic Android backup is configured.

## License

Original Mikus code: MIT. llama.cpp: MIT. ML Kit and AndroidX dependencies retain their respective licenses. Qwen model weights are licensed by their publisher; check the model card and terms before use. The model weights are not included in this repository.
