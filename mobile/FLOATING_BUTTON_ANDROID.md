# Bouton Flottant Android (type Shazam)

Ce guide te permet d'ajouter un bouton flottant qui reste au-dessus de toutes les apps Android, comme le bouton Shazam.

## Étape 1 : Permissions

Dans `android/app/src/main/AndroidManifest.xml`, ajoute :

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## Étape 2 : Créer le service de bouton flottant

Crée le fichier :
`android/app/src/main/java/com/hounmetinjeremy/lyricsfinder/FloatingButtonService.java`

```java
package com.hounmetinjeremy.lyricsfinder;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionListener;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;

public class FloatingButtonService extends Service {
    private WindowManager windowManager;
    private View floatingView;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        floatingView = LayoutInflater.from(this).inflate(R.layout.floating_button_layout, null);

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.END;
        params.x = 20;
        params.y = 100;

        ImageButton btn = floatingView.findViewById(R.id.floatingBtn);
        btn.setOnClickListener(v -> {
            Intent intent = new Intent(FloatingButtonService.this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("action", "listen");
            startActivity(intent);
        });

        windowManager.addView(floatingView, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingView != null) windowManager.removeView(floatingView);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
```

## Étape 3 : Layout du bouton

Crée le fichier :
`android/app/src/main/res/layout/floating_button_layout.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content">

    <ImageButton
        android:id="@+id/floatingBtn"
        android:layout_width="56dp"
        android:layout_height="56dp"
        android:background="@drawable/circle_button"
        android:src="@android:drawable/ic_btn_speak_now"
        android:tint="#FFFFFF"
        android:contentDescription="Écouter" />
</FrameLayout>
```

## Étape 4 : Forme circulaire du bouton

Crée le fichier :
`android/app/src/main/res/drawable/circle_button.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#EF4444" />
    <size android:width="56dp" android:height="56dp" />
</shape>
```

## Étape 5 : Démarrer le service

Dans `MainActivity.java` (Capacitor), ajoute au `onCreate()` après `super.onCreate()` :

```java
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

// ...

if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
    if (!Settings.canDrawOverlays(this)) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + getPackageName()));
        startActivityForResult(intent, 1001);
    } else {
        startService(new Intent(this, FloatingButtonService.class));
    }
} else {
    startService(new Intent(this, FloatingButtonService.class));
}
```

## Étape 6 : Initialiser "listen" au démarrage

Toujours dans `MainActivity.java`, ajoute :

```java
@Override
public void onStart() {
    super.onStart();
    String action = getIntent().getStringExtra("action");
    if ("listen".equals(action)) {
        bridge.evalJs("if(window.startListenFromFloating) window.startListenFromFloating()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {}
        });
    }
}
```

Et dans `www/js/app.js`, expose la fonction :

```js
window.startListenFromFloating = () => {
  document.querySelector('[data-tab="listen"]').click()
  document.getElementById('btnListen').click()
}
```

## Étape 7 : Redémarrer

```bash
npx cap sync
npx cap open android
```

Puis Build > Rebuild Project et Build APK.

---

💡 **Astuce** : Sur Android 12+, il faut aussi demander la permission `android.permission.POST_NOTIFICATIONS` au runtime pour le service foreground si tu veux que le bouton persiste quand l'app est fermée.
