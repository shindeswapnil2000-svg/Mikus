package com.mikus.assistant

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

object ReminderScheduler {
    fun schedule(context: Context, atMillis: Long, title: String, id: Int = (System.currentTimeMillis()%Int.MAX_VALUE).toInt()) {
        require(atMillis > System.currentTimeMillis()) { "Choose a future time." }
        val intent = Intent(context, ReminderReceiver::class.java).putExtra("title",title)
        val pending = PendingIntent.getBroadcast(context,id,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,atMillis,pending)
        else manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,atMillis,pending)
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel("mikus_reminders","Mikus reminders",NotificationManager.IMPORTANCE_HIGH))
        val notification = NotificationCompat.Builder(context,"mikus_reminders")
            .setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Mikus reminder")
            .setContentText(intent.getStringExtra("title") ?: "You have a reminder")
            .setAutoCancel(true).build()
        manager.notify((System.currentTimeMillis()%Int.MAX_VALUE).toInt(),notification)
    }
}
