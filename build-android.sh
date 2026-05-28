#!/bin/bash

# Detener el script inmediatamente si ocurre un error
set -e

# Colores para logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   🚀 AQUA+ PRO - MASTER BUILDER ANDROID v2.1   ${NC}"
echo -e "${BLUE}====================================================${NC}"

# --- PASO 0: DIAGNÓSTICO DE ENTORNO ---
echo -e "\n${YELLOW}[0/6] 🔍 Verificando entorno...${NC}"

# Verificar Java
if [ -z "$JAVA_HOME" ]; then
    echo -e "${YELLOW}⚠️  ADVERTENCIA: La variable JAVA_HOME no está definida.${NC}"
    echo "Gradle intentará detectar Java automáticamente."
else
    echo "✅ JAVA_HOME detectado: $JAVA_HOME"
fi
java -version 2>&1 | head -n 1

# --- PASO 1: DEPENDENCIAS NODE ---
echo -e "\n${YELLOW}[1/6] 📦 Instalando dependencias de Node.js...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Módulos node_modules presentes."
fi

# --- PASO 2: BUILD WEB ---
echo -e "\n${YELLOW}[2/6] 🏗️  Compilando aplicación web (Vite)...${NC}"
# Forzar modo producción para optimización
NODE_ENV=production npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ ERROR CRÍTICO: No se generó la carpeta 'dist'.${NC}"
    exit 1
fi

# --- PASO 3: INICIALIZACIÓN ANDROID ---
echo -e "\n${YELLOW}[3/6] 📱 Preparando plataforma Android...${NC}"
if [ ! -d "android" ]; then
    echo "Plataforma no encontrada. Creando nueva..."
    npx cap add android
else
    echo "✅ Plataforma Android detectada."
fi

# --- PASO 4: SINCRONIZACIÓN ---
echo -e "\n${YELLOW}[4/6] 🔄 Sincronizando Assets y Plugins...${NC}"
# Sincronizamos ANTES de los parches para que Capacitor baje los plugins base
npx cap sync android

# --- PASO 5: PARCHES Y CONFIGURACIÓN (CRÍTICO) ---
echo -e "\n${YELLOW}[5/6] 🔧 Aplicando parches de configuración y permisos...${NC}"

# 5.1 Ejecutar setup-firebase.js (ESTE PASO INYECTA LOS PERMISOS EN EL MANIFEST)
if [ -f "setup-firebase.js" ]; then
    echo "Ejecutando setup-firebase.js..."
    node setup-firebase.js
else
    echo -e "${RED}❌ ERROR: Falta setup-firebase.js${NC}"
    exit 1
fi

# 5.2 Generar local.properties si no existe (Vital para CLI)
if [ ! -f "android/local.properties" ]; then
    echo "⚠️ local.properties no encontrado. Intentando generar..."
    
    SDK_DIR=""
    if [ -n "$ANDROID_HOME" ]; then
        SDK_DIR="$ANDROID_HOME"
    elif [ -n "$ANDROID_SDK_ROOT" ]; then
        SDK_DIR="$ANDROID_SDK_ROOT"
    elif [ -d "$HOME/Library/Android/sdk" ]; then # Mac default
        SDK_DIR="$HOME/Library/Android/sdk"
    elif [ -d "$HOME/Android/Sdk" ]; then # Linux default
        SDK_DIR="$HOME/Android/Sdk"
    fi

    if [ -n "$SDK_DIR" ]; then
        echo "sdk.dir=$SDK_DIR" > android/local.properties
        echo "✅ local.properties creado apuntando a: $SDK_DIR"
    else
        echo -e "${RED}❌ No se pudo encontrar el Android SDK automáticamente.${NC}"
        echo "Por favor crea 'android/local.properties' manualmente con: sdk.dir=/ruta/a/tu/sdk"
    fi
else
    echo "✅ local.properties ya existe."
fi

# --- PASO 6: COMPILACIÓN GRADLE ---
echo -e "\n${YELLOW}[6/6] ☕ Compilando APK final...${NC}"
cd android

# Asegurar permisos del wrapper
chmod +x gradlew

# Limpiar para evitar caché corrupto
echo "Limpiando proyecto..."
./gradlew clean

echo "Construyendo APK (Debug)..."
# Usamos --stacktrace para ver detalles si falla
if ./gradlew assembleDebug --stacktrace; then
    echo -e "\n${GREEN}=========================================${NC}"
    echo -e "${GREEN}   ✅ ¡COMPILACIÓN EXITOSA!   ${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # Intentar mover el APK a la raíz para fácil acceso
    cd ..
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    TARGET_APK="./AquaPro-Debug.apk"
    
    if [ -f "$APK_PATH" ]; then
        cp "$APK_PATH" "$TARGET_APK"
        echo -e "📦 APK copiado a la raíz del proyecto: ${BLUE}$TARGET_APK${NC}"
    else
        echo -e "El APK está en: $APK_PATH"
    fi
    
    echo -e "\nPara instalar en dispositivo conectado:"
    echo -e "${YELLOW}npx cap run android${NC}"
else
    echo -e "\n${RED}=========================================${NC}"
    echo -e "${RED}   ❌ FALLÓ LA COMPILACIÓN GRADLE   ${NC}"
    echo -e "${RED}=========================================${NC}"
    echo "Revisa el log de error arriba (stacktrace)."
    exit 1
fi
