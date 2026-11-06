package com.mikus.assistant

import java.util.Locale

/** Deterministic private fallback. This is deliberately not represented as a generative LLM. */
object AssistantEngine {
    fun reply(input: String, persona: String, profile: String, memories: List<ChatMessage>): String {
        val q = input.trim()
        val lower = q.lowercase(Locale.ROOT)
        val prefix = when (persona) {
            "Challenger" -> "Let's be honest: "
            "Strategist" -> "Strategically, "
            "Companion" -> "I'm with you. "
            else -> ""
        }
        if (q.isBlank()) return "Tell me what you want to work on."
        if (listOf("remember", "what did i", "what was", "last time", "we discussed", "i told you").any { lower.contains(it) }) {
            val terms = lower.split(Regex("[^\\p{L}\\p{N}]+")).filter { it.length > 3 }.take(8)
            val matches = memories.filter { m -> terms.any { m.content.lowercase(Locale.ROOT).contains(it) } }.take(4)
            return if (matches.isEmpty()) "I searched the conversation history currently stored on this device and couldn't find a reliable match. I won't invent a memory. Try a distinctive phrase or import your ChatGPT export in Memory."
            else "I found these saved passages:\n\n" + matches.joinToString("\n\n") { "• ${it.role}: ${it.content.take(500)}" }
        }
        if (listOf("hello", "hi", "hey mikus").any { lower == it || lower.startsWith("$it ") })
            return prefix + "Hello. What deserves your attention today? I can help plan, capture tasks, search saved conversations, or draft something."
        if (lower.contains("task") || lower.contains("todo") || lower.contains("to-do"))
            return prefix + "Let's turn that into an action. Open Tasks to save a commitment, give it a due date, and mark it complete when done. What is the next concrete step?"
        if (lower.contains("plan") || lower.contains("priorit"))
            return prefix + "Start with the outcome, identify the one constraint most likely to block it, then choose a 20-minute next action. Tell me the goal and deadline and I'll help structure it."
        if (lower.contains("write") || lower.contains("draft") || lower.contains("email"))
            return prefix + "I can help shape the draft. Tell me the audience, the outcome you want, and any points that must be included. You can save the result in Studio."
        val depth = when (profile) { "Quick" -> "I'll keep it concise."; "Deep" -> "I'll break it down carefully, but I need the specific context to avoid guessing."; else -> "Let's work through it clearly." }
        return prefix + "$depth I can reason from the information you give me, manage local tasks and notes, and retrieve saved history. This build does not yet contain a generative language model, so I won't pretend to have open-ended LLM capabilities. What outcome are you aiming for?"
    }
}
