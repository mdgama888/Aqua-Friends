{
  "expo": {
    "name": "Aqua Friends",
    "slug": "aqua-offline",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mmdms.aquaoffline"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.mmdms.aquaoffline"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "1924cc9d-9731-4ddc-84d7-c8a24dbcf0e5"
      }
    },
    "plugins": [
      "expo-local-authentication",
      "expo-barcode-scanner",
      "expo-camera",
      "expo-font",
      "expo-image-picker",
      "expo-av",
      "expo-sharing",
      "expo-blur"
    ]
  }
}
