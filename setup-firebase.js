
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const appDir = path.join(androidDir, 'app');
const distDir = path.join(rootDir, 'dist');

function log(msg) { console.log(`\x1b[36m[Android Setup]\x1b[0m ${msg}`); }
function error(msg) { console.error(`\x1b[31m[Error]\x1b[0m ${msg}`); }
function success(msg) { console.log(`\x1b[32m[Success]\x1b[0m ${msg}`); }

log("Diagnosticar y reparar entorno Android...");

// --- PASO 0: VERIFICACIÓN DE INTEGRIDAD Y REGENERACIÓN ---

// 1. Asegurar que existe el build web
if (!fs.existsSync(distDir)) {
    log("Carpeta 'dist' no encontrada. Compilando aplicación web...");
    try {
        execSync('npm run build', { stdio: 'inherit' });
    } catch (e) {
        error("Falló la compilación web. Verifica errores en tu código React.");
        process.exit(1);
    }
}

// 2. Verificar estado de la carpeta Android
const buildGradleMain = path.join(androidDir, 'build.gradle');
const settingsGradleMain = path.join(androidDir, 'settings.gradle');
let shouldRegenerate = false;

if (fs.existsSync(androidDir)) {
    if (!fs.existsSync(buildGradleMain) || !fs.existsSync(settingsGradleMain)) {
        log("⚠️  La carpeta 'android' está corrupta (faltan archivos de Gradle).");
        shouldRegenerate = true;
    }
} else {
    log("La carpeta 'android' no existe.");
    shouldRegenerate = true;
}

if (shouldRegenerate) {
    if (fs.existsSync(androidDir)) {
        log("Eliminando carpeta 'android' corrupta...");
        try {
            fs.rmSync(androidDir, { recursive: true, force: true });
        } catch (e) {
            error(`No se pudo eliminar la carpeta android: ${e.message}. Intenta borrarla manualmente.`);
            process.exit(1);
        }
    }
    
    log("Generando plataforma Android nativa (npx cap add android)...");
    try {
        execSync('npx cap add android', { stdio: 'inherit' });
        success("Plataforma Android generada correctamente.");
    } catch (e) {
        error("Falló 'npx cap add android'.");
        console.log("Posible solución: Ejecuta 'npm install' y luego intenta de nuevo.");
        process.exit(1);
    }
}

// --- PASO 1: REPARAR variables.gradle ---
const variablesPath = path.join(androidDir, 'variables.gradle');
const correctVariablesContent = `ext {
    minSdkVersion = 22
    compileSdkVersion = 34
    targetSdkVersion = 34
    androidxActivityVersion = '1.8.0'
    androidxAppCompatVersion = '1.6.1'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.12.0'
    androidxFragmentVersion = '1.6.2'
    androidxMaterialVersion = '1.10.0'
    androidxWebkitVersion = '1.9.0'
    coreSplashScreenVersion = '1.0.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.1.5'
    androidxEspressoCoreVersion = '3.5.1'
    cordovaAndroidVersion = '10.1.1'
    capacitorVersion = '6.0.0'
}`;

try {
  let needsRewrite = false;
  if (!fs.existsSync(variablesPath)) {
    needsRewrite = true;
  } else {
    const currentContent = fs.readFileSync(variablesPath, 'utf8');
    if (!currentContent.includes('coreSplashScreenVersion') || 
        !currentContent.includes('androidxCoordinatorLayoutVersion') || 
        !currentContent.includes('capacitorVersion')) {
      log("variables.gradle incompleto. Actualizando definiciones de versiones...");
      needsRewrite = true;
    }
  }

  if (needsRewrite) {
    fs.writeFileSync(variablesPath, correctVariablesContent);
    success("variables.gradle corregido (Versiones completas añadidas).");
  }
} catch (e) {
  error("Error en variables.gradle: " + e.message);
}

// --- PASO 2: VINCULAR variables.gradle ---
const projectGradlePath = path.join(androidDir, 'build.gradle');
if (fs.existsSync(projectGradlePath)) {
  let content = fs.readFileSync(projectGradlePath, 'utf8');
  let modified = false;

  if (!content.includes("apply from: 'variables.gradle'") && !content.includes('apply from: "variables.gradle"')) {
      content = "apply from: 'variables.gradle'\n" + content;
      modified = true;
  }
  // Asegurar classpath de Google Services
  if (!content.includes('com.google.gms:google-services')) {
    const regex = /(dependencies\s*\{)/;
    if (regex.test(content)) {
      content = content.replace(regex, '$1\n        classpath "com.google.gms:google-services:4.4.1"');
      modified = true;
    }
  }
  if (modified) fs.writeFileSync(projectGradlePath, content);
}

// --- PASO 3: CONFIGURAR NIVEL DE APP ---
const appGradlePath = path.join(appDir, 'build.gradle');
if (fs.existsSync(appGradlePath)) {
  let content = fs.readFileSync(appGradlePath, 'utf8');
  let modified = false;

  // Plugin de Google Services
  if (!content.includes('com.google.gms.google-services') && content.includes("apply plugin: 'com.android.application'")) {
    content = content.replace(
      "apply plugin: 'com.android.application'", 
      "apply plugin: 'com.android.application'\napply plugin: 'com.google.gms.google-services'"
    );
    modified = true;
  }

  // Dependencias de Firebase BOM
  if (!content.includes('firebase-bom')) {
    const depRegex = /(dependencies\s*\{)/;
    if (depRegex.test(content)) {
      content = content.replace(depRegex, '$1\n    implementation platform("com.google.firebase:firebase-bom:32.8.0")\n    implementation "com.google.firebase:firebase-analytics"');
      modified = true;
    }
  }
  if (modified) fs.writeFileSync(appGradlePath, content);
}

// --- PASO 4: REPARAR google-services.json (SOLUCIÓN PACKAGE NAME) ---
const googleServicesPath = path.join(appDir, 'google-services.json');
const targetPackageName = 'com.aquamas.pro'; // Debe coincidir con capacitor.config.ts

try {
    // Contenido proporcionado por el usuario, corregido para usar com.aquamas.pro
    const jsonContent = {
      "project_info": {
        "project_number": "374512888570",
        "firebase_url": "https://aquamasfundadores-default-rtdb.firebaseio.com",
        "project_id": "aquamasfundadores",
        "storage_bucket": "aquamasfundadores.firebasestorage.app"
      },
      "client": [
        {
          "client_info": {
            "mobilesdk_app_id": "1:374512888570:android:86cbd24a4599c2b01ff743",
            "android_client_info": {
              "package_name": targetPackageName // CORREGIDO AQUÍ
            }
          },
          "oauth_client": [],
          "api_key": [
            {
              "current_key": "AIzaSyDUKevh8y_LfBsJgtHqaOdgHd73yfgg7a0"
            }
          ],
          "services": {
            "appinvite_service": {
              "other_platform_oauth_client": []
            }
          }
        }
      ],
      "configuration_version": "1"
    };

    // Sobrescribir siempre para garantizar que coincida el package_name
    log(`Escribiendo google-services.json correcto para '${targetPackageName}'...`);
    fs.writeFileSync(googleServicesPath, JSON.stringify(jsonContent, null, 2));
    success("google-services.json actualizado correctamente.");

} catch (e) {
    error("Error procesando google-services.json: " + e.message);
}

// --- PASO 5: SINCRONIZAR JDK ---
log("Optimizando configuración de JDK...");
const gradlePropertiesPath = path.join(androidDir, 'gradle.properties');
const javaHome = process.env.JAVA_HOME;
const baseJvmArgs = "-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8";

try {
  let propContent = "";
  if (fs.existsSync(gradlePropertiesPath)) {
    propContent = fs.readFileSync(gradlePropertiesPath, 'utf8');
  }

  let updated = false;

  if (!propContent.includes("org.gradle.jvmargs")) {
    propContent += `\norg.gradle.jvmargs=${baseJvmArgs}\n`;
    updated = true;
  }

  if (javaHome) {
    const normalizedJavaHome = javaHome.replace(/\\/g, '/');
    if (propContent.includes("org.gradle.java.home")) {
      const currentVal = propContent.match(/org\.gradle\.java\.home=(.*)/)?.[1];
      if (currentVal !== normalizedJavaHome) {
        propContent = propContent.replace(/org\.gradle\.java\.home=.*/g, `org.gradle.java.home=${normalizedJavaHome}`);
        updated = true;
      }
    } else {
      propContent += `\norg.gradle.java.home=${normalizedJavaHome}\n`;
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(gradlePropertiesPath, propContent);
    success("gradle.properties sincronizado correctamente.");
  }

} catch (e) {
  error("Error en gradle.properties: " + e.message);
}

// --- PASO 6: ACTUALIZAR GRADLE WRAPPER (Soporte Java 21) ---
const wrapperPropertiesPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
if (fs.existsSync(wrapperPropertiesPath)) {
    try {
        let wrapperContent = fs.readFileSync(wrapperPropertiesPath, 'utf8');
        const newDistributionUrl = 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip';
        
        if (wrapperContent.includes('distributionUrl=')) {
            const currentUrlMatch = wrapperContent.match(/distributionUrl=(.*)/);
            const currentUrl = currentUrlMatch ? currentUrlMatch[1] : "";
            
            if (!currentUrl.includes('gradle-8.7') && !currentUrl.includes('gradle-8.8') && !currentUrl.includes('gradle-8.9') && !currentUrl.includes('gradle-9')) {
                log("Actualizando Gradle Wrapper a 8.7 para compatibilidad Java 21...");
                wrapperContent = wrapperContent.replace(/distributionUrl=.*/g, newDistributionUrl);
                fs.writeFileSync(wrapperPropertiesPath, wrapperContent);
                success("Gradle Wrapper actualizado a 8.7.");
            }
        }
    } catch (e) {
        error("No se pudo actualizar gradle-wrapper.properties: " + e.message);
    }
}

// --- PASO 7: INYECTAR PERMISOS DE MANIFEST (AUTORECUPERACIÓN) ---
log("Asegurando permisos críticos en AndroidManifest.xml...");
const manifestPath = path.join(appDir, 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
    try {
        let manifestContent = fs.readFileSync(manifestPath, 'utf8');
        let permissionsAdded = 0;

        // Lista de permisos a garantizar
        const criticalPermissions = [
            'android.permission.READ_CONTACTS',
            'android.permission.WRITE_CONTACTS',
            'android.permission.READ_PHONE_STATE',
            'android.permission.READ_CALL_LOG'
        ];

        criticalPermissions.forEach(perm => {
            if (!manifestContent.includes(perm)) {
                const permTag = `<uses-permission android:name="${perm}" />`;
                // Insertar antes de la etiqueta <application
                if (manifestContent.includes('<application')) {
                    manifestContent = manifestContent.replace('<application', `${permTag}\n    <application`);
                    permissionsAdded++;
                }
            }
        });

        if (permissionsAdded > 0) {
            fs.writeFileSync(manifestPath, manifestContent);
            success(`Se restauraron ${permissionsAdded} permisos de contactos/teléfono en el Manifest.`);
        } else {
            log("Permisos de contactos verificados correctamente.");
        }
    } catch (e) {
        error("Error al parchear AndroidManifest.xml: " + e.message);
    }
} else {
    error("No se encontró AndroidManifest.xml para parchear.");
}

console.log("\n\x1b[32m✅ REPARACIÓN COMPLETADA.\x1b[0m");
console.log("👉 Ejecuta de nuevo la compilación en Android Studio o terminal.");
