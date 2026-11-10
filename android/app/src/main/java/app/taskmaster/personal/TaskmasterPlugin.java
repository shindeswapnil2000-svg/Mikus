package app.taskmaster.personal;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.location.Location;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.telephony.SmsManager;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(
    name = "Taskmaster",
    permissions = {
        @Permission(alias = "call", strings = { Manifest.permission.CALL_PHONE }),
        @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS }),
        @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
        @Permission(alias = "notify", strings = { "android.permission.POST_NOTIFICATIONS" }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION }),
        @Permission(alias = "coarse", strings = { Manifest.permission.ACCESS_COARSE_LOCATION })
    }
)
public class TaskmasterPlugin extends Plugin {

    private static final String WA_VOICE = "vnd.android.cursor.item/vnd.com.whatsapp.voip.call";
    private static final String WA_VIDEO = "vnd.android.cursor.item/vnd.com.whatsapp.video.call";
    private static final String[] WA_PACKAGES = { "com.whatsapp", "com.whatsapp.w4b" };

    @Override
    public void load() {
        super.load();
        if (getActivity() != null) emitShared(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        emitShared(intent);
    }

    /** Text shared from another app (LinkedIn, Instagram, WhatsApp, a browser) through the Android share sheet. */
    private void emitShared(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null || text.trim().isEmpty()) return;
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        JSObject o = new JSObject();
        o.put("text", text);
        o.put("subject", subject == null ? "" : subject);
        intent.setAction(Intent.ACTION_MAIN); // do not re-deliver on rotation
        notifyListeners("shared", o, true);
    }

    private boolean granted(String alias) {
        return getPermissionState(alias) == PermissionState.GRANTED;
    }

    private static String digits(String s) {
        return s == null ? "" : s.replaceAll("[^0-9]", "");
    }

    // ---------------------------------------------------------------- status and permissions

    @PluginMethod
    public void status(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        r.put("call", granted("call"));
        r.put("sms", granted("sms"));
        r.put("contacts", granted("contacts"));
        r.put("notify", granted("notify"));
        r.put("location", LocationHelper.hasPermission(c));
        r.put("exact", AlarmStore.canExact(c));
        r.put("overlay", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c));
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        r.put("battery", pm != null && pm.isIgnoringBatteryOptimizations(c.getPackageName()));
        r.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    @PluginMethod
    public void requestAll(PluginCall call) {
        requestPermissionForAliases(new String[] { "call", "sms", "contacts", "notify", "location", "coarse" }, call, "allPerm");
    }

    @PermissionCallback
    private void allPerm(PluginCall call) {
        status(call);
    }

    private void settings(PluginCall call, String action, boolean withPackage) {
        try {
            Intent i = new Intent(action);
            if (withPackage) i.setData(Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                call.resolve();
            } catch (Exception e2) {
                call.reject("Could not open settings");
            }
        }
    }

    @PluginMethod
    public void openExactSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) settings(call, Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, true);
        else call.resolve();
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        settings(call, Settings.ACTION_MANAGE_OVERLAY_PERMISSION, true);
    }

    @PluginMethod
    public void requestBattery(PluginCall call) {
        settings(call, Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, true);
    }

    // ---------------------------------------------------------------- location and SOS

    private boolean has(String permission) {
        return getContext().checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    /** One location fix: { lat, lng, acc, time }. Asks for permission first if needed. */
    @PluginMethod
    public void getLocation(PluginCall call) {
        if (!LocationHelper.hasPermission(getContext())) {
            requestPermissionForAliases(new String[] { "location", "coarse" }, call, "locPerm");
            return;
        }
        doLocation(call);
    }

    @PermissionCallback
    private void locPerm(PluginCall call) {
        if (LocationHelper.hasPermission(getContext())) doLocation(call);
        else call.reject("Location permission was denied", "NO_PERMISSION");
    }

    private void doLocation(final PluginCall call) {
        LocationHelper.fetch(getContext(), 6000, new LocationHelper.Callback() {
            @Override
            public void done(Location l) {
                if (l == null) {
                    call.reject("No location fix yet. Is location switched on?", "NO_FIX");
                    return;
                }
                JSObject r = new JSObject();
                r.put("lat", l.getLatitude());
                r.put("lng", l.getLongitude());
                r.put("acc", l.hasAccuracy() ? (double) l.getAccuracy() : -1d);
                r.put("time", l.getTime());
                call.resolve(r);
            }
        });
    }

    /**
     * The whole SOS in one go, with no permission prompts (there is no time for them):
     * location, then a text with a map link to every number in "tels", then the dialler for "callTel".
     * callMode: "dial" opens the dialler with the number ready, "call" dials straight away, "none" skips it.
     */
    @PluginMethod
    public void sosDispatch(final PluginCall call) {
        final Context c = getContext();
        final String tels = call.getString("tels", "");
        final String intro = call.getString("intro", "EMERGENCY: I need help.");
        final String extra = call.getString("extra", "");
        final String callTel = call.getString("callTel", "");
        final String callMode = call.getString("callMode", "dial");
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final Location[] box = new Location[1];
                    final CountDownLatch latch = new CountDownLatch(1);
                    if (LocationHelper.hasPermission(c)) {
                        LocationHelper.fetch(c, 5000, new LocationHelper.Callback() {
                            @Override
                            public void done(Location l) {
                                box[0] = l;
                                latch.countDown();
                            }
                        });
                        try { latch.await(7, TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
                    }
                    Location loc = box[0];

                    StringBuilder sb = new StringBuilder(intro);
                    if (loc != null) {
                        long ageMin = Math.max(0L, (System.currentTimeMillis() - loc.getTime()) / 60000L);
                        sb.append(" My location: ").append(LocationHelper.link(loc));
                        if (loc.hasAccuracy()) sb.append(" (within ").append(Math.round(loc.getAccuracy())).append(" m");
                        else sb.append(" (");
                        sb.append(ageMin > 2 ? ", " + ageMin + " min old)" : ")");
                    } else {
                        sb.append(" My location is not available.");
                    }
                    if (!extra.isEmpty()) sb.append(' ').append(extra);
                    sb.append(" Sent by Taskmaster SOS.");
                    String msg = sb.toString();

                    int sent = 0, failed = 0;
                    boolean canSms = has(Manifest.permission.SEND_SMS);
                    if (canSms) {
                        ArrayList<String> seen = new ArrayList<String>();
                        for (String raw : tels.split(",")) {
                            String t = raw.replaceAll("[^0-9+]", "");
                            if (t.isEmpty() || seen.contains(t)) continue;
                            seen.add(t);
                            try {
                                SmsManager sm = Build.VERSION.SDK_INT >= 31 ? c.getSystemService(SmsManager.class) : SmsManager.getDefault();
                                ArrayList<String> parts = sm.divideMessage(msg);
                                sm.sendMultipartTextMessage(t, null, parts, null, null);
                                sent++;
                            } catch (Exception e) {
                                failed++;
                            }
                        }
                    }

                    boolean called = false;
                    if (!callTel.isEmpty() && !"none".equals(callMode)) {
                        try {
                            boolean direct = "call".equals(callMode) && has(Manifest.permission.CALL_PHONE);
                            Intent i = new Intent(direct ? Intent.ACTION_CALL : Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(callTel)));
                            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            c.startActivity(i);
                            called = true;
                        } catch (Exception ignored) {
                            // the web layer shows a tap-to-call button instead
                        }
                    }

                    AlarmStore.log(c, "sos", "SOS: texted " + sent + (failed > 0 ? " (" + failed + " failed)" : "")
                            + (loc != null ? " with location" : " without location") + (called ? ", opened the dialler for " + callTel : ""));

                    JSObject r = new JSObject();
                    r.put("sent", sent);
                    r.put("failed", failed);
                    r.put("canSms", canSms);
                    r.put("called", called);
                    r.put("hasLoc", loc != null);
                    if (loc != null) {
                        r.put("lat", loc.getLatitude());
                        r.put("lng", loc.getLongitude());
                        r.put("acc", loc.hasAccuracy() ? (double) loc.getAccuracy() : -1d);
                    }
                    r.put("msg", msg);
                    call.resolve(r);
                } catch (Exception e) {
                    call.reject("SOS could not finish: " + e.getMessage());
                }
            }
        }).start();
    }

    // ---------------------------------------------------------------- web fetch (RSS and APIs, no CORS limits)

    /** GET an https URL from the phone itself. Resolves { status, body, url } for any HTTP status. */
    @PluginMethod
    public void httpGet(final PluginCall call) {
        final String first = call.getString("url", "");
        if (!first.startsWith("https://")) {
            call.reject("Only https links are allowed");
            return;
        }
        final Integer t = call.getInt("timeout", 15000);
        final int timeout = t == null ? 15000 : t;
        final String accept = call.getString("accept", "application/rss+xml, application/atom+xml, application/xml, application/json, text/xml, */*");
        new Thread(new Runnable() {
            @Override
            public void run() {
                String url = first;
                HttpURLConnection conn = null;
                try {
                    for (int hop = 0; hop < 5; hop++) {
                        conn = (HttpURLConnection) new URL(url).openConnection();
                        conn.setInstanceFollowRedirects(false);
                        conn.setConnectTimeout(timeout);
                        conn.setReadTimeout(timeout);
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) Taskmaster/3 research-reader");
                        conn.setRequestProperty("Accept", accept);
                        int code = conn.getResponseCode();
                        if (code >= 300 && code < 400 && conn.getHeaderField("Location") != null) {
                            String next = new URL(new URL(url), conn.getHeaderField("Location")).toString();
                            conn.disconnect();
                            if (!next.startsWith("https://")) {
                                call.reject("Redirected to a non-https address");
                                return;
                            }
                            url = next;
                            continue;
                        }
                        InputStream in = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        if (in != null) {
                            byte[] buf = new byte[8192];
                            int n;
                            int total = 0;
                            while ((n = in.read(buf)) > 0 && total < 2500000) {
                                out.write(buf, 0, n);
                                total += n;
                            }
                            in.close();
                        }
                        String ct = conn.getContentType();
                        Charset cs = Charset.forName("UTF-8");
                        if (ct != null && ct.toLowerCase(Locale.ROOT).contains("charset=")) {
                            try {
                                cs = Charset.forName(ct.substring(ct.toLowerCase(Locale.ROOT).indexOf("charset=") + 8).replace("\"", "").trim());
                            } catch (Exception ignored) {
                                // keep UTF-8
                            }
                        }
                        JSObject r = new JSObject();
                        r.put("status", code);
                        r.put("body", new String(out.toByteArray(), cs));
                        r.put("url", url);
                        call.resolve(r);
                        return;
                    }
                    call.reject("Too many redirects");
                } catch (Exception e) {
                    call.reject("Could not reach the server: " + e.getMessage());
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        }).start();
    }

    // ---------------------------------------------------------------- action log

    /** What the phone did while the app was closed. Returns { items: [{t, ty, tx}] } and clears it. */
    @PluginMethod
    public void drainLog(PluginCall call) {
        JSObject r = new JSObject();
        try {
            r.put("items", new JSArray(AlarmStore.drainLog(getContext())));
        } catch (Exception e) {
            r.put("items", new JSArray());
        }
        call.resolve(r);
    }

    // ---------------------------------------------------------------- calls

    @PluginMethod
    public void callNow(PluginCall call) {
        if (!granted("call")) {
            requestPermissionForAlias("call", call, "callPerm");
            return;
        }
        doCall(call);
    }

    @PermissionCallback
    private void callPerm(PluginCall call) {
        if (granted("call")) doCall(call);
        else call.reject("Phone permission was denied");
    }

    private void doCall(PluginCall call) {
        String tel = call.getString("tel", "");
        if (tel.isEmpty()) { call.reject("No number"); return; }
        try {
            Intent i = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(tel)));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            AlarmStore.log(getContext(), "call", "Dialled " + tel);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not place the call: " + e.getMessage());
        }
    }

    /** Starts a WhatsApp voice or video call straight from the contact's WhatsApp entry. */
    @PluginMethod
    public void whatsappCall(PluginCall call) {
        if (!granted("contacts")) {
            requestPermissionForAlias("contacts", call, "waPerm");
            return;
        }
        doWhatsapp(call);
    }

    @PermissionCallback
    private void waPerm(PluginCall call) {
        if (granted("contacts")) doWhatsapp(call);
        else call.reject("Contacts permission was denied", "NO_PERMISSION");
    }

    private void doWhatsapp(PluginCall call) {
        String d = digits(call.getString("tel", ""));
        boolean video = Boolean.TRUE.equals(call.getBoolean("video", false));
        if (d.length() < 7) { call.reject("No number", "NO_NUMBER"); return; }
        String tail = d.length() > 10 ? d.substring(d.length() - 10) : d;
        String mime = video ? WA_VIDEO : WA_VOICE;
        long rowId = -1;
        try (Cursor cur = getContext().getContentResolver().query(
                ContactsContract.Data.CONTENT_URI,
                new String[] { ContactsContract.Data._ID },
                ContactsContract.Data.MIMETYPE + "=? AND " + ContactsContract.Data.DATA1 + " LIKE ?",
                new String[] { mime, "%" + tail + "@%" }, null)) {
            if (cur != null && cur.moveToFirst()) rowId = cur.getLong(0);
        } catch (Exception e) {
            call.reject("Could not read contacts: " + e.getMessage(), "NO_PERMISSION");
            return;
        }
        if (rowId < 0) { call.reject("No WhatsApp entry for this number", "NO_WA_ROW"); return; }
        Uri data = Uri.withAppendedPath(ContactsContract.Data.CONTENT_URI, String.valueOf(rowId));
        for (String pkg : WA_PACKAGES) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(data, mime);
                i.setPackage(pkg);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                call.resolve();
                return;
            } catch (ActivityNotFoundException ignored) {
            } catch (Exception e) {
                call.reject("WhatsApp refused: " + e.getMessage(), "WA_FAILED");
                return;
            }
        }
        call.reject("WhatsApp is not installed", "NO_WA");
    }

    // ---------------------------------------------------------------- sms

    @PluginMethod
    public void sendSms(PluginCall call) {
        if (!granted("sms")) {
            requestPermissionForAlias("sms", call, "smsPerm");
            return;
        }
        doSms(call);
    }

    @PermissionCallback
    private void smsPerm(PluginCall call) {
        if (granted("sms")) doSms(call);
        else call.reject("SMS permission was denied");
    }

    private void doSms(PluginCall call) {
        String tel = call.getString("tel", "");
        String body = call.getString("body", "");
        if (tel.isEmpty() || body.isEmpty()) { call.reject("Number and text are required"); return; }
        try {
            Context c = getContext();
            SmsManager sm = Build.VERSION.SDK_INT >= 31 ? c.getSystemService(SmsManager.class) : SmsManager.getDefault();
            ArrayList<String> parts = sm.divideMessage(body);
            sm.sendMultipartTextMessage(tel, null, parts, null, null);
            AlarmStore.log(getContext(), "sms", "Texted " + tel + ": " + body);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not send: " + e.getMessage());
        }
    }

    // ---------------------------------------------------------------- alarms

    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id");
        Long at = call.getLong("at");
        if (id == null || at == null) { call.reject("id and at are required"); return; }
        try {
            JSONObject o = new JSONObject();
            o.put("id", id);
            o.put("at", at);
            o.put("title", call.getString("title", "Taskmaster"));
            o.put("body", call.getString("body", ""));
            o.put("kind", call.getString("kind", "notify"));
            o.put("tel", call.getString("tel", ""));
            o.put("tels", call.getString("tels", ""));
            o.put("callTel", call.getString("callTel", ""));
            o.put("prio", call.getInt("prio", 4));
            boolean exact = AlarmStore.put(getContext(), o);
            JSObject r = new JSObject();
            r.put("exact", exact);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not schedule: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (id != null) AlarmStore.cancel(getContext(), id);
        call.resolve();
    }

    // ---------------------------------------------------------------- voice and contacts

    @PluginMethod
    public void listen(PluginCall call) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", Locale.getDefault().toLanguageTag()));
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Say a command, e.g. call Mom");
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        try {
            startActivityForResult(call, i, "listenResult");
        } catch (Exception e) {
            call.reject("Voice input is not available on this phone");
        }
    }

    @ActivityCallback
    private void listenResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        String text = "";
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> list = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (list != null && !list.isEmpty()) text = list.get(0);
        }
        r.put("text", text);
        call.resolve(r);
    }

    @PluginMethod
    public void pickContact(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
        try {
            startActivityForResult(call, i, "pickResult");
        } catch (Exception e) {
            call.reject("No contacts app found");
        }
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null && result.getData().getData() != null) {
            try (Cursor cur = getContext().getContentResolver().query(
                    result.getData().getData(),
                    new String[] { ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER },
                    null, null, null)) {
                if (cur != null && cur.moveToFirst()) {
                    r.put("name", cur.getString(0));
                    r.put("tel", cur.getString(1));
                }
            } catch (Exception ignored) {}
        }
        call.resolve(r);
    }

    /** Finds a phone contact by spoken name, e.g. "mom". Needs the contacts permission. */
    @PluginMethod
    public void findContact(PluginCall call) {
        if (!granted("contacts")) {
            requestPermissionForAlias("contacts", call, "findPerm");
            return;
        }
        doFind(call);
    }

    @PermissionCallback
    private void findPerm(PluginCall call) {
        if (granted("contacts")) doFind(call);
        else call.reject("Contacts permission was denied", "NO_PERMISSION");
    }

    private void doFind(PluginCall call) {
        String name = call.getString("name", "").trim().toLowerCase(Locale.ROOT);
        JSObject r = new JSObject();
        r.put("found", false);
        if (name.isEmpty()) { call.resolve(r); return; }
        String bestName = null, bestTel = null;
        int bestScore = Integer.MAX_VALUE;
        try (Cursor cur = getContext().getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[] { ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER, ContactsContract.CommonDataKinds.Phone.IS_PRIMARY },
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?",
                new String[] { "%" + name + "%" }, null)) {
            while (cur != null && cur.moveToNext()) {
                String dn = cur.getString(0);
                if (dn == null) continue;
                String low = dn.toLowerCase(Locale.ROOT);
                int score = low.equals(name) ? 0 : (low.startsWith(name) ? 100 : 1000) + low.length();
                if (cur.getInt(2) > 0) score -= 1;
                if (score < bestScore) { bestScore = score; bestName = dn; bestTel = cur.getString(1); }
            }
        } catch (Exception e) {
            call.reject("Could not read contacts: " + e.getMessage());
            return;
        }
        if (bestName != null) {
            r.put("found", true);
            r.put("name", bestName);
            r.put("tel", bestTel);
        }
        call.resolve(r);
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(call.getString("url", "")));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the link");
        }
    }
}
