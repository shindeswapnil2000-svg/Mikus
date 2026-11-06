# Offline voice and document intelligence

## Speech input

Mikus uses `SpeechRecognizer.createOnDeviceSpeechRecognizer` on Android 12+ and checks `isOnDeviceRecognitionAvailable` first. It sets `EXTRA_PREFER_OFFLINE=true` and requests `en-IN`. It does not fall back to the network recognizer. Recognition quality and availability depend on the speech service and downloaded language packs installed on the device.

## Speech output

Mikus uses Android TextToSpeech but chooses only a voice where `Voice.isNetworkConnectionRequired` is false. If no offline English voice is installed, Mikus does not speak rather than silently use a network voice.

## Hey Mikus phrase monitor

The service must be started by the user while the app is visible and microphone permission is granted. It is a microphone foreground service with a persistent notification and stop action. It repeatedly asks the on-device speech recognizer for short utterances and checks partial/final transcripts for “Hey Mikus”.

This is a pragmatic prototype, not a dedicated low-power keyword-spotting model or Android `VoiceInteractionService`. It is less reliable than a DSP hotword engine and can consume substantial battery. It does not auto-start after reboot. Android 14+ checks microphone foreground-service prerequisites; Android 15+ also blocks microphone foreground-service starts from `BOOT_COMPLETED`. Android/Samsung can stop the service. A service started while the app is visible may continue while the screen locks, but the OS remains in control.

Official Android background-start restrictions: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start

## OCR

Bundled ML Kit Latin and Devanagari recognizers process selected images and PDF pages locally. PDFs are rendered page-by-page and limited to 40 pages per import. Extracted text is stored as a `document` turn in the encrypted Mikus database, then included in local BM25 retrieval. OCR is not a substitute for checking important legal, medical or financial documents against the original.
