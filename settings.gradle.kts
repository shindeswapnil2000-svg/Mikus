pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "Mikus"
include(":app")
val llamaLibrary = file("native/llama.cpp/examples/llama.android/lib")
if (llamaLibrary.exists()) {
    include(":llama-lib")
    project(":llama-lib").projectDir = llamaLibrary
}
