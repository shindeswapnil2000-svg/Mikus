package com.mikus.assistant

import org.json.JSONObject
import java.io.InputStream

/**
 * Imports the standard ChatGPT conversations.json export.
 * Only text parts are retained; imported content is stored in Mikus' encrypted Room database.
 */
object ChatGPTImporter {
    fun parse(input: InputStream): List<ChatMessage> {
        val text = input.bufferedReader(Charsets.UTF_8).use { it.readText() }
        require(text.isNotBlank()) { "The selected export file is empty." }
        val root = org.json.JSONArray(text)
        val result = ArrayList<ChatMessage>()
        for (i in 0 until root.length()) {
            val conversation = root.optJSONObject(i) ?: continue
            val conversationId = conversation.optString("id", "import-$i")
            val mapping = conversation.optJSONObject("mapping") ?: continue
            val nodes = mapping.keys().asSequence().mapNotNull { key ->
                val node = mapping.optJSONObject(key) ?: return@mapNotNull null
                val message = node.optJSONObject("message") ?: return@mapNotNull null
                val author = message.optJSONObject("author")
                val role = author?.optString("role").orEmpty()
                if (role !in setOf("user", "assistant", "system")) return@mapNotNull null
                val content = message.optJSONObject("content") ?: return@mapNotNull null
                val parts = content.optJSONArray("parts") ?: return@mapNotNull null
                val body = buildString {
                    for (partIndex in 0 until parts.length()) {
                        when (val part = parts.opt(partIndex)) {
                            is String -> append(part).append('\n')
                            is JSONObject -> {
                                val nested = part.optString("text")
                                if (nested.isNotBlank()) append(nested).append('\n')
                            }
                        }
                    }
                }.trim()
                if (body.isBlank()) return@mapNotNull null
                val timestamp = (message.optDouble("create_time", 0.0) * 1000.0).toLong()
                    .takeIf { it > 0L } ?: System.currentTimeMillis()
                Triple(timestamp, role, body)
            }.sortedBy { it.first }
            nodes.forEach { (timestamp, role, body) ->
                result += ChatMessage(
                    sessionId = conversationId,
                    role = role,
                    content = body,
                    createdAt = timestamp,
                    persona = "Imported",
                    profile = "Imported"
                )
            }
        }
        require(result.isNotEmpty()) { "No supported user or assistant text messages were found in this ChatGPT export." }
        return result
    }
}
