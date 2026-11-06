package com.mikus.assistant

import android.content.Context
import com.arm.aichat.AiChat
import com.arm.aichat.InferenceEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.withContext
import java.io.File

/** On-device GGUF inference through the upstream llama.cpp Android binding. No network inference. */
object LocalLlmRuntime {
    @Volatile private var engine: InferenceEngine? = null
    @Volatile var loadedModelPath: String? = null
        private set
    val isReady: Boolean get() = engine != null && loadedModelPath != null

    suspend fun load(context: Context, model: File) = withContext(Dispatchers.IO) {
        require(model.isFile && model.length() > 100L * 1024 * 1024) { "Choose a complete GGUF model file." }
        model.inputStream().use { input ->
            val magic = ByteArray(4)
            require(input.read(magic) == 4 && magic.contentEquals(byteArrayOf(0x47, 0x47, 0x55, 0x46))) {
                "This file is not a GGUF model."
            }
        }
        val runtime = engine ?: AiChat.getInferenceEngine(context.applicationContext).also { engine = it }
        runtime.loadModel(model.absolutePath)
        loadedModelPath = model.absolutePath
    }

    suspend fun reply(prompt: String, persona: String, profile: String, memories: List<ChatMessage>): String = withContext(Dispatchers.IO) {
        val runtime = engine ?: error("Load a local GGUF model in Settings first.")
        val personaText = when (persona) {
            "Challenger" -> "Be a candid, respectful challenger. Identify weak assumptions and ask incisive questions."
            "Strategist" -> "Be a rigorous strategist. Prioritize, structure decisions, identify risks and next actions."
            "Companion" -> "Be warm, attentive and supportive without being sycophantic."
            else -> "Adapt naturally to the user's needs while remaining clear, honest and action-oriented."
        }
        val depth = when (profile) {
            "Quick" -> "Be concise and direct."
            "Deep" -> "Think carefully, explore trade-offs and give a structured answer."
            else -> "Balance useful detail with clarity."
        }
        runtime.setSystemPrompt("You are Mikus, a private personal assistant running entirely on this Android device. $personaText $depth Use only the supplied context for personal memories. Never invent prior conversations or claim to have performed actions you did not perform. Ask before external actions.")
        val context = memories.takeLast(8).joinToString("\n") { "${it.role}: ${it.content.take(700)}" }
        val fullPrompt = if (context.isBlank()) prompt else "Relevant recent local conversation context:\n$context\n\nCurrent request:\n$prompt"
        val limit = when (profile) { "Quick" -> 256; "Deep" -> 1024; else -> 512 }
        val tokens = runtime.sendUserPrompt(fullPrompt, predictLength = limit).toList()
        tokens.joinToString("").trim().ifBlank { "I couldn't generate a response. Try again or reduce the context length." }
    }

    fun unload() {
        engine?.cleanUp()
        loadedModelPath = null
    }

    fun destroy() {
        engine?.destroy()
        engine = null
        loadedModelPath = null
    }
}
