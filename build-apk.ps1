# build-apk.ps1 - Полный скрипт сборки APK

Write-Host "🚀 Начинаем сборку APK для Aqua-Offline" -ForegroundColor Green

# Шаг 1: Исправляем app.json
Write-Host "`n📝 Шаг 1: Исправляем app.json..." -ForegroundColor Yellow

$appJsonPath = "app.json"
$appJson = Get-Content $appJsonPath -Raw | ConvertFrom-Json

# Обновляем plugins - убираем expo-sharing
$appJson.expo.plugins = @(
    "expo-barcode-scanner",
    "expo-font"
)

# Сохраняем исправленный app.json
$appJson | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath
Write-Host "✅ app.json исправлен! Плагины: expo-barcode-scanner, expo-font" -ForegroundColor Green

# Шаг 2: Удаляем проблемный пакет
Write-Host "`n🗑️ Шаг 2: Удаляем expo-sharing..." -ForegroundColor Yellow
npm uninstall expo-sharing
Write-Host "✅ expo-sharing удален" -ForegroundColor Green

# Шаг 3: Полная очистка
Write-Host "`n🧹 Шаг 3: Очищаем проект..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ios -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
Write-Host "✅ Проект очищен" -ForegroundColor Green

# Шаг 4: Установка зависимостей
Write-Host "`n📦 Шаг 4: Устанавливаем зависимости..." -ForegroundColor Yellow
npm install --legacy-peer-deps
Write-Host "✅ Зависимости установлены" -ForegroundColor Green

# Шаг 5: Создание нативных проектов
Write-Host "`n🏗️ Шаг 5: Создаем нативные проекты..." -ForegroundColor Yellow
npx expo prebuild --clean
Write-Host "✅ Нативные проекты созданы" -ForegroundColor Green

# Шаг 6: Сборка APK
Write-Host "`n📱 Шаг 6: Собираем APK..." -ForegroundColor Yellow
Set-Location android
./gradlew assembleRelease
Set-Location ..

# Шаг 7: Копирование APK
Write-Host "`n📦 Шаг 7: Копируем APK..." -ForegroundColor Yellow
$apkSource = "android\app\build\outputs\apk\release\app-release.apk"
$apkDest = "AquaFriend.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest -Force
    Write-Host "✅ APK создан и скопирован: $apkDest" -ForegroundColor Green
    Write-Host "📲 Размер файла: $((Get-Item $apkDest).Length / 1MB) MB" -ForegroundColor Cyan
} else {
    Write-Host "❌ Ошибка: APK не найден!" -ForegroundColor Red
}

Write-Host "`n🎉 Готово! APK находится в папке проекта" -ForegroundColor Green