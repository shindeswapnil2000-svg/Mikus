package com.mikus.assistant

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.AlarmClock
import android.provider.CalendarContract
import android.provider.ContactsContract
import android.telephony.PhoneNumberUtils

object PhoneActions {
    fun dial(context: Context, number: String = "") = context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(number)}")))
    fun contacts(context: Context) = context.startActivity(Intent(Intent.ACTION_VIEW, ContactsContract.Contacts.CONTENT_URI))
    fun sms(context: Context, number: String = "", body: String = "") = context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${Uri.encode(number)}")).putExtra("sms_body",body))
    fun whatsapp(context: Context, number: String, body: String) {
        val digits = number.filter { it.isDigit() }
        require(digits.length >= 8) { "Enter the full phone number with country code." }
        val uri = Uri.parse("https://wa.me/$digits?text=${Uri.encode(body)}")
        context.startActivity(Intent(Intent.ACTION_VIEW,uri).setPackage("com.whatsapp"))
    }
    fun calendar(context: Context, title: String, begin: Long, end: Long) = context.startActivity(Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI).putExtra(CalendarContract.Events.TITLE,title).putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME,begin).putExtra(CalendarContract.EXTRA_EVENT_END_TIME,end))
    fun alarm(context: Context, hour: Int, minute: Int, message: String) = context.startActivity(Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR,hour).putExtra(AlarmClock.EXTRA_MINUTES,minute).putExtra(AlarmClock.EXTRA_MESSAGE,message).putExtra(AlarmClock.EXTRA_SKIP_UI,false))
}
