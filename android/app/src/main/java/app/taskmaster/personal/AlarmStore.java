package app.taskmaster.personal;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Map;

/** Persists scheduled alarms (so they survive reboot) and talks to AlarmManager. */
final class AlarmStore {
    static final String PREFS = "tm_alarms";
    static final String CHANNEL = "tm_nag";
    static final String ACTION = "app.taskmaster.personal.ALARM";

    private AlarmStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static PendingIntent pending(Context c, String id) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.setAction(ACTION);
        i.setData(Uri.parse("tm://alarm/" + Uri.encode(id)));
        i.putExtra("id", id);
        return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean canExact(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    /** Saves the payload and arms the alarm. Returns true if the alarm is exact. */
    static boolean put(Context c, JSONObject o) {
        String id = o.optString("id");
        prefs(c).edit().putString(id, o.toString()).apply();
        return arm(c, o);
    }

    @SuppressLint("ScheduleExactAlarm")
    static boolean arm(Context c, JSONObject o) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return false;
        String id = o.optString("id");
        long at = o.optLong("at");
        PendingIntent pi = pending(c, id);
        boolean exact = canExact(c);
        try {
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            exact = false;
        }
        return exact;
    }

    static void cancel(Context c, String id) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pending(c, id);
        if (am != null) am.cancel(pi);
        pi.cancel();
        prefs(c).edit().remove(id).apply();
    }

    /** Returns and removes the stored payload for a fired alarm. */
    static JSONObject take(Context c, String id) {
        String s = prefs(c).getString(id, null);
        if (s == null) return null;
        prefs(c).edit().remove(id).apply();
        try { return new JSONObject(s); } catch (Exception e) { return null; }
    }

    /** Re-arms every future alarm after a reboot or app update. */
    static void rearmAll(Context c) {
        long now = System.currentTimeMillis();
        for (Map.Entry<String, ?> e : prefs(c).getAll().entrySet()) {
            try {
                JSONObject o = new JSONObject(String.valueOf(e.getValue()));
                if (o.optLong("at") > now) arm(c, o);
                else prefs(c).edit().remove(e.getKey()).apply();
            } catch (Exception ignored) {}
        }
    }

    // ---- action log: what the phone did while the app was closed. The web layer drains it on resume.
    private static final String LOG_PREFS = "tm_log";
    private static final String LOG_KEY = "items";

    static synchronized void log(Context c, String type, String text) {
        try {
            SharedPreferences sp = c.getSharedPreferences(LOG_PREFS, Context.MODE_PRIVATE);
            JSONArray a = new JSONArray(sp.getString(LOG_KEY, "[]"));
            JSONObject o = new JSONObject();
            o.put("t", System.currentTimeMillis());
            o.put("ty", type);
            o.put("tx", text);
            a.put(o);
            // keep the newest 100
            JSONArray out = new JSONArray();
            for (int i = Math.max(0, a.length() - 100); i < a.length(); i++) out.put(a.get(i));
            sp.edit().putString(LOG_KEY, out.toString()).apply();
        } catch (Exception ignored) {
            // logging must never break an alarm
        }
    }

    /** Returns the log as a JSON array string and clears it. */
    static synchronized String drainLog(Context c) {
        SharedPreferences sp = c.getSharedPreferences(LOG_PREFS, Context.MODE_PRIVATE);
        String s = sp.getString(LOG_KEY, "[]");
        sp.edit().remove(LOG_KEY).apply();
        return s;
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Taskmaster nags", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Deadlines, check-ins and scheduled messages");
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    @SuppressLint("MissingPermission")
    static void notify(Context c, String id, String title, String text, int prio, NotificationCompat.Action action) {
        ensureChannel(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(c, id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(prio >= 5 ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(content);
        if (action != null) b.addAction(action);
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(id.hashCode(), b.build());
        } catch (SecurityException ignored) {}
    }
}
