#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="$ROOT/native/llama.cpp"
mkdir -p "$ROOT/native"
if [ ! -d "$DEST/.git" ]; then
  rm -rf "$DEST"
  git clone --depth 1 https://github.com/ggml-org/llama.cpp.git "$DEST"
else
  git -C "$DEST" fetch --depth 1 origin master
  git -C "$DEST" reset --hard FETCH_HEAD
fi
LIB="$DEST/examples/llama.android/lib"
if [ ! -f "$LIB/src/main/cpp/CMakeLists.txt" ]; then
  echo "The upstream llama.cpp Android library layout changed. Review docs/LOCAL_AI.md before continuing." >&2
  exit 2
fi
cat > "$LIB/build.gradle.kts" <<'GRADLE'
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.arm.aichat"
    compileSdk = 36
    ndkVersion = "29.0.13113456"
    defaultConfig {
        minSdk = 33
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
        externalNativeBuild {
            cmake { arguments += listOf("-DCMAKE_BUILD_TYPE=Release","-DBUILD_SHARED_LIBS=ON","-DLLAMA_BUILD_APP=OFF","-DLLAMA_BUILD_COMMON=ON","-DLLAMA_OPENSSL=OFF","-DGGML_NATIVE=OFF","-DGGML_BACKEND_DL=ON","-DGGML_CPU_ALL_VARIANTS=ON","-DGGML_LLAMAFILE=OFF") }
        }
    }
    externalNativeBuild { cmake { path = file("src/main/cpp/CMakeLists.txt"); version = "3.31.6" } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    packaging { jniLibs { useLegacyPackaging = false }; resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}
dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.datastore:datastore-preferences:1.2.0")
}
GRADLE
printf 'Prepared llama.cpp source at %s\n' "$DEST"
