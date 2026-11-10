package app.taskmaster.personal;

import android.Manifest;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.telephony.SmsManager;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;
import java.util.ArrayList;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        String id = intent.getStringExtra("id");
        if (id == null) return;
        JSONObject o = AlarmStore.take(c, id);
        if (o == null) return;
        String kind = o.optString("kind", "notify");
        String title = o.optString("title", "Taskmaster");
        String body = o.optString("body", "");
        String tel = o.optString("tel", "");
        int prio = o.optInt("prio", 4);

        if ("sos".equals(kind)) {
            handleSos(c, id, o);
            return;
        }

        if ("sms".equals(kind) && !tel.isEmpty()) {
            if (c.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
                try {
                    SmsManager sm = Build.VERSION.SDK_INT >= 31 ? c.getSystemService(SmsManager.class) : SmsManager.getDefault();
                    ArrayList<String> parts = sm.divideMessage(body);
                    sm.sendMultipartTextMessage(tel, null, parts, null, null);
                    AlarmStore.log(c, "sms", "Sent a scheduled text to " + tel + ": " + body);
                    AlarmStore.notify(c, id, "Text sent", "Sent to " + tel + ": " + body, 4, null);
                    return;
                } catch (Exception e) {
                    // fall through to the notification below
                }
            }
            Intent sms = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + Uri.encode(tel)));
            sms.putExtra("sms_body", body).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent pi = PendingIntent.getActivity(c, id.hashCode(), sms, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmStore.notify(c, id, "Could not send automatically", "Tap Send text to send: " + body, 5,
                    new NotificationCompat.Action(0, "Send text", pi));
            return;
        }

        if ("call".equals(kind) && !tel.isEmpty()) {
            boolean can = c.checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
            Intent call = new Intent(can ? Intent.ACTION_CALL : Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(tel)));
            call.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            // Android only lets a background app open the dialer if it may draw over other apps.
            boolean bg = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c);
            if (can && bg) {
                try {
                    c.startActivity(call);
                    AlarmStore.log(c, "call", "Dialled " + tel + " from a scheduled call");
                } catch (Exception ignored) {}
            }
            PendingIntent pi = PendingIntent.getActivity(c, id.hashCode(), call, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmStore.notify(c, id, title, body.isEmpty() ? "Time to call " + tel : body, 5,
                    new NotificationCompat.Action(0, "Call now", pi));
            return;
        }

        AlarmStore.notify(c, id, title, body, prio, null);
    }

    /** Safety check-in ran out: text everyone with the last known location and offer the emergency dialler. */
    private void handleSos(Context c, String id, JSONObject o) {
        String body = o.optString("body", "EMERGENCY: I may need help.");
        String tels = o.optString("tels", "");
        String callTel = o.optString("callTel", "");
        int sent = 0;
        if (c.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
            for (String raw : tels.split(",")) {
                String t = raw.replaceAll("[^0-9+]", "");
                if (t.isEmpty()) continue;
                try {
                    SmsManager sm = Build.VERSION.SDK_INT >= 31 ? c.getSystemService(SmsManager.class) : SmsManager.getDefault();
                    ArrayList<String> parts = sm.divideMessage(body);
                    sm.sendMultipartTextMessage(t, null, parts, null, null);
                    sent++;
                } catch (Exception ignored) {
                    // try the next contact
                }
            }
        }
        NotificationCompat.Action act = null;
        if (!callTel.isEmpty()) {
            Intent dial = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(callTel)));
            dial.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            boolean bg = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c);
            if (bg) {
                try { c.startActivity(dial); } catch (Exception ignored) {}
            }
            PendingIntent pi = PendingIntent.getActivity(c, id.hashCode(), dial, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            act = new NotificationCompat.Action(0, "Call " + callTel, pi);
        }
        String msg = sent > 0 ? "Safety check-in missed. Alert texted to " + sent + (sent == 1 ? " person." : " people.") : "Safety check-in missed. Could not text anyone automatically. Open the app now.";
        AlarmStore.log(c, "sos", msg);
        AlarmStore.notify(c, id, "SOS sent", msg, 5, act);
    }
}
