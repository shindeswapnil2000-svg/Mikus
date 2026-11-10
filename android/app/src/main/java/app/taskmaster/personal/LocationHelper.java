package app.taskmaster.personal;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/** Gets one location fix without Google Play services. Network and GPS race, first answer wins. */
final class LocationHelper {

    interface Callback {
        void done(Location location);
    }

    private LocationHelper() {}

    static boolean hasPermission(Context c) {
        return c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    static String link(Location l) {
        return "https://maps.google.com/?q=" + String.format(Locale.US, "%.6f,%.6f", l.getLatitude(), l.getLongitude());
    }

    /** Newest location any provider remembers, or null. */
    @SuppressLint("MissingPermission")
    static Location lastKnown(Context c) {
        if (!hasPermission(c)) return null;
        LocationManager lm = (LocationManager) c.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return null;
        Location best = null;
        try {
            for (String p : lm.getProviders(true)) {
                Location l = lm.getLastKnownLocation(p);
                if (l == null) continue;
                if (best == null || l.getTime() > best.getTime()) best = l;
            }
        } catch (SecurityException ignored) {
            // permission revoked while running
        }
        return best;
    }

    /**
     * Asks for a fresh fix and calls back once, on the main thread, with the fix or, after
     * timeoutMs, with the last known location (which may be null).
     */
    @SuppressLint("MissingPermission")
    static void fetch(final Context c, final long timeoutMs, final Callback cb) {
        final Handler main = new Handler(Looper.getMainLooper());
        final AtomicBoolean fired = new AtomicBoolean(false);
        final Location[] got = new Location[1];
        final List<CancellationSignal> signals = new ArrayList<CancellationSignal>();
        final List<LocationListener> listeners = new ArrayList<LocationListener>();
        final LocationManager lm = hasPermission(c) ? (LocationManager) c.getSystemService(Context.LOCATION_SERVICE) : null;

        final Runnable finish = new Runnable() {
            @Override
            public void run() {
                if (!fired.compareAndSet(false, true)) return;
                main.removeCallbacksAndMessages(null);
                for (CancellationSignal s : signals) {
                    try { s.cancel(); } catch (Exception ignored) { }
                }
                if (lm != null) {
                    for (LocationListener l : listeners) {
                        try { lm.removeUpdates(l); } catch (Exception ignored) { }
                    }
                }
                cb.done(got[0] != null ? got[0] : lastKnown(c));
            }
        };

        if (lm == null) {
            main.post(finish);
            return;
        }
        main.postDelayed(finish, timeoutMs);

        boolean any = false;
        String[] providers = { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER };
        for (String p : providers) {
            try {
                if (!lm.isProviderEnabled(p)) continue;
                any = true;
                if (Build.VERSION.SDK_INT >= 30) {
                    CancellationSignal cs = new CancellationSignal();
                    signals.add(cs);
                    lm.getCurrentLocation(p, cs, c.getMainExecutor(), new Consumer<Location>() {
                        @Override
                        public void accept(Location l) {
                            if (l != null && got[0] == null) {
                                got[0] = l;
                                main.post(finish);
                            }
                        }
                    });
                } else {
                    LocationListener ll = new LocationListener() {
                        @Override
                        public void onLocationChanged(Location l) {
                            if (l != null && got[0] == null) {
                                got[0] = l;
                                main.post(finish);
                            }
                        }

                        @Override
                        public void onStatusChanged(String provider, int status, Bundle extras) { }

                        @Override
                        public void onProviderEnabled(String provider) { }

                        @Override
                        public void onProviderDisabled(String provider) { }
                    };
                    listeners.add(ll);
                    lm.requestSingleUpdate(p, ll, Looper.getMainLooper());
                }
            } catch (Exception ignored) {
                // provider missing or permission revoked: the others and the timeout still run
            }
        }
        if (!any) main.post(finish);
    }
}
