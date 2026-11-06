package com.mikus.assistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import android.content.pm.ServiceInfo

/** User-started, visible-notification microphone service. Android may stop/restrict it; never starts at boot. */
class WakeWordService : Service() {
    private var recognizer: SpeechRecognizer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var stopped = false
    private var wakeDetected = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopListening(); stopSelf(); return START_NOT_STICKY }
        createChannel()
        val notification = notification("Listening for ‘Hey Mikus’ · on-device speech service")
        if (Build.VERSION.SDK_INT >= 29) {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else startForeground(NOTIFICATION_ID, notification)
        if (Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
            updateNotification("Offline speech recognition is unavailable. Install an on-device language pack.")
            stopSelf()
            return START_NOT_STICKY
        }
        stopped = false
        wakeDetected = false
        beginRecognition()
        return START_NOT_STICKY
    }

    private fun beginRecognition() {
        if (stopped || wakeDetected) return
        runCatching {
            recognizer?.destroy()
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this).also { r ->
                r.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) = Unit
                    override fun onBeginningOfSpeech() = Unit
                    override fun onRmsChanged(rmsdB: Float) = Unit
                    override fun onBufferReceived(buffer: ByteArray?) = Unit
                    override fun onEndOfSpeech() = Unit
                    override fun onPartialResults(partialResults: Bundle?) { checkPhrase(partialResults) }
                    override fun onResults(results: Bundle?) { checkPhrase(results); if (!wakeDetected) handler.postDelayed({ beginRecognition() }, 350) }
                    override fun onError(error: Int) { if (!wakeDetected && !stopped) handler.postDelayed({ beginRecognition() }, 1200) }
                    override fun onEvent(eventType: Int, params: Bundle?) = Unit
                })
                val request = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN")
                    putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                }
                r.startListening(request)
            }
        }.onFailure { updateNotification("Wake listening stopped: ${it.message}"); stopSelf() }
    }

    private fun checkPhrase(bundle: Bundle?) {
        val phrases = bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
        if (phrases.any { it.lowercase().replace(Regex("[^a-z ]"), " ").contains("hey mikus") }) {
            wakeDetected = true
            recognizer?.cancel()
            recognizer?.destroy()
            recognizer = null
            updateNotification("Mikus heard you. Tap this notification to open the assistant.")
        }
    }

    private fun notification(message: String): Notification {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, WakeWordService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Mikus voice assistant").setContentText(message).setContentIntent(open)
            .setOngoing(true).addAction(0, "Stop listening", stop).build()
    }

    private fun updateNotification(message: String) {
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(message))
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) getSystemService(NotificationManager::class.java)
            .createNotificationChannel(NotificationChannel(CHANNEL, "Mikus voice assistant", NotificationManager.IMPORTANCE_LOW))
    }

    private fun stopListening() {
        stopped = true
        handler.removeCallbacksAndMessages(null)
        recognizer?.cancel(); recognizer?.destroy(); recognizer = null
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    override fun onDestroy() { stopListening(); super.onDestroy() }

    companion object {
        const val ACTION_STOP = "com.mikus.assistant.STOP_WAKE"
        private const val CHANNEL = "mikus_voice"
        private const val NOTIFICATION_ID = 7301
    }
}
