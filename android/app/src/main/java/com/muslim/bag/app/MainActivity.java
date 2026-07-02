package com.muslim.bag.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;
    private GeolocationPermissions.Callback pendingGeolocationCallback = null;
    private String pendingGeolocationOrigin = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Ensure Geolocation permissions are requested on app startup
        requestLocationPermissionsIfNeeded();

        // Configure WebView
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setGeolocationEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setDomStorageEnabled(true);
            
            // Use our custom BridgeWebChromeClient to guarantee that Geolocation is handled properly
            webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onGeolocationPermissionsShowPrompt(final String origin, final GeolocationPermissions.Callback callback) {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                        callback.invoke(origin, true, false);
                    } else {
                        pendingGeolocationOrigin = origin;
                        pendingGeolocationCallback = callback;
                        ActivityCompat.requestPermissions(MainActivity.this,
                                new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                                LOCATION_PERMISSION_REQUEST_CODE);
                    }
                }
            });
        }
    }

    private void requestLocationPermissionsIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                    LOCATION_PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingGeolocationCallback != null) {
                pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
                pendingGeolocationCallback = null;
                pendingGeolocationOrigin = null;
            }
        }
    }
}
