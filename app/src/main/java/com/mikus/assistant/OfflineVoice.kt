package com.mikus.assistant

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import java.util.Locale

object OfflineVoice {
    fun available(context: Context): Boolean = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)

    fun listen(context: Context, onText: (String) -> Unit, onFailure: (String) -> Unit) {
        check(available(context)) { "Install an offline speech recognition service/language pack on your phone first." }
        val recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) = Unit
            override fun onBeginningOfSpeech() = Unit
            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() = Unit
            override fun onError(error: Int) { recognizer.destroy(); onFailure("Offline speech recognition error ($error). Check that the offline language pack is installed.") }
            override fun onResults(results: Bundle?) {
                val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                recognizer.destroy()
                if (text.isBlank()) onFailure("No speech was recognized.") else onText(text)
            }
            override fun onPartialResults(partialResults: Bundle?) = Unit
            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN")
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        recognizer.startListening(intent)
    }
}

/** Speaks only with a voice explicitly marked as not requiring a network connection. */
object OfflineSpeaker {
    @Volatile private var tts: TextToSpeech? = null
    @Volatile private var ready = false
    @Volatile private var pendingText: String? = null

    @Synchronized fun speak(context: Context, text: String) {
        if (tts == null) {
            tts = TextToSpeech(context.applicationContext) { status ->
                ready = status == TextToSpeech.SUCCESS
                if (ready) {
                    selectOfflineVoice(tts)
                    pendingText?.let { phrase -> if (ready) tts?.speak(phrase, TextToSpeech.QUEUE_FLUSH, null, "mikus-${System.currentTimeMillis()}") }
                    pendingText = null
                }
            }
            pendingText = text
            return
        }
        if (ready) tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mikus-${System.currentTimeMillis()}")
    }

    private fun selectOfflineVoice(engine: TextToSpeech?) {
        val voice: Voice? = engine?.voices?.filter { !it.isNetworkConnectionRequired && it.locale.language == "en" }
            ?.sortedBy { if (it.locale.country == "IN") 0 else 1 }?.firstOrNull()
        if (voice != null) engine?.voice = voice else ready = false
    }

    @Synchronized fun stop() { tts?.stop() }
}
