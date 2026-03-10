{
  "expo": {
    "name": "Aqua Friends",
    "slug": "aqua-offline",
    "owner": "mmdms",
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
      "bundleIdentifier": "com.mmdms.aquaoffline",
      "infoPlist": {
        "NSCameraUsageDescription": "Доступ к камере для QR и видео.",
        "NSMicrophoneUsageDescription": "Доступ к микрофону для аудио.",
        "NSFaceIDUsageDescription": "Защита чатов FaceID."
      }
    },
    "android": {
      "package": "com.mmdms.aquaoffline",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": ["CAMERA", "RECORD_AUDIO", "USE_BIOMETRIC"]
    },
    "extra": {
      "eas": {
        "projectId": "1924cc9d-9731-4ddc-84d7-c8a24dbcf0e5"
      }
    },
    "plugins": [
      "expo-camera",
      "expo-font",
      "expo-image-picker",
      "expo-local-authentication"
    ]
  }
}
