package com.mikus.assistant

import android.content.Context
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStream
import java.io.OutputStream
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec

object BackupManager {
    private val magic = "MIKUSBK1".toByteArray()
    private fun derive(password: CharArray, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password, salt, 210_000, 256)
        return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    }
    suspend fun export(dao: MikusDao, uri: Uri, resolver: android.content.ContentResolver, password: CharArray) {
        require(password.size >= 10) { "Use a backup password of at least 10 characters." }
        val root = JSONObject().put("format", 1)
        root.put("messages", JSONArray().apply { dao.allMessages().forEach { put(JSONObject().put("session",it.sessionId).put("role",it.role).put("content",it.content).put("time",it.createdAt).put("persona",it.persona).put("profile",it.profile)) } })
        root.put("tasks", JSONArray().apply { dao.allTasks().forEach { put(JSONObject().put("title",it.title).put("notes",it.notes).put("due",it.dueAt ?: JSONObject.NULL).put("done",it.done).put("time",it.createdAt)) } })
        root.put("journal", JSONArray().apply { dao.allJournal().forEach { put(JSONObject().put("title",it.title).put("body",it.body).put("time",it.createdAt)) } })
        root.put("drafts", JSONArray().apply { dao.allDrafts().forEach { put(JSONObject().put("title",it.title).put("body",it.body).put("time",it.createdAt)) } })
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, javax.crypto.spec.SecretKeySpec(derive(password, salt), "AES"))
        val bytes = magic + salt + cipher.iv + cipher.doFinal(root.toString().toByteArray(Charsets.UTF_8))
        resolver.openOutputStream(uri)?.use { it.write(bytes) } ?: error("Could not write backup file")
    }
    suspend fun restore(dao: MikusDao, uri: Uri, resolver: android.content.ContentResolver, password: CharArray) {
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: error("Could not read backup file")
        require(bytes.size > 40 && bytes.copyOfRange(0,8).contentEquals(magic)) { "This is not a Mikus backup." }
        val salt = bytes.copyOfRange(8,24); val iv = bytes.copyOfRange(24,36)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, javax.crypto.spec.SecretKeySpec(derive(password,salt),"AES"), GCMParameterSpec(128,iv))
        val root = JSONObject(String(cipher.doFinal(bytes.copyOfRange(36,bytes.size)),Charsets.UTF_8))
        require(root.optInt("format") == 1) { "Unsupported backup version." }
        // Validate/decrypt completely before modifying the database. Restore replaces current data.
        val messages = root.optJSONArray("messages") ?: JSONArray()
        val tasks = root.optJSONArray("tasks") ?: JSONArray()
        val journal = root.optJSONArray("journal") ?: JSONArray()
        val drafts = root.optJSONArray("drafts") ?: JSONArray()
        dao.clearMessages(); dao.clearTasks(); dao.clearJournal(); dao.clearDrafts()
        dao.addMessages((0 until messages.length()).map { i -> messages.getJSONObject(i).let { ChatMessage(sessionId=it.optString("session"),role=it.optString("role"),content=it.optString("content"),createdAt=it.optLong("time"),persona=it.optString("persona","Automatic"),profile=it.optString("profile","Balanced")) } })
        (0 until tasks.length()).forEach { i -> tasks.getJSONObject(i).let { dao.addTask(TaskItem(title=it.optString("title"),notes=it.optString("notes"),dueAt=if(it.isNull("due")) null else it.optLong("due"),done=it.optBoolean("done"),createdAt=it.optLong("time"))) } }
        (0 until journal.length()).forEach { i -> journal.getJSONObject(i).let { dao.addJournal(JournalEntry(title=it.optString("title"),body=it.optString("body"),createdAt=it.optLong("time"))) } }
        (0 until drafts.length()).forEach { i -> drafts.getJSONObject(i).let { dao.addDraft(DraftEntry(title=it.optString("title"),body=it.optString("body"),createdAt=it.optLong("time"))) } }
    }
}

object ChatGPTImporter {
    fun parse(input: InputStream): List<ChatMessage> {
        val raw = input.bufferedReader().use { it.readText() }.trim()
        if (!raw.startsWith("[") && !raw.startsWith("{")) return parseTranscript(raw)
        val root = org.json.JSONTokener(raw).nextValue()
        val conversations = when (root) {
            is JSONArray -> root
            is JSONObject -> if (root.has("mapping")) JSONArray().put(root) else JSONArray()
            else -> JSONArray()
        }
        val result = mutableListOf<ChatMessage>()
        for (i in 0 until conversations.length()) {
            val conv = conversations.optJSONObject(i) ?: continue
            val mapping = conv.optJSONObject("mapping") ?: continue
            val session = conv.optString("id", "import-$i")
            val nodes = mutableListOf<JSONObject>()
            val keys = mapping.keys()
            while (keys.hasNext()) mapping.optJSONObject(keys.next())?.optJSONObject("message")?.let { nodes.add(it) }
            nodes.sortedBy { it.optDouble("create_time", 0.0) }.forEach { msg ->
                val author = msg.optJSONObject("author")?.optString("role") ?: return@forEach
                if (author != "user" && author != "assistant") return@forEach
                val content = msg.optJSONObject("content") ?: return@forEach
                val parts = content.optJSONArray("parts") ?: return@forEach
                val text = (0 until parts.length()).mapNotNull { index ->
                    val part = parts.opt(index)
                    when (part) { is String -> part; is JSONObject -> null; else -> null }
                }.filter { it.isNotBlank() }.joinToString("\n")
                if (text.isNotBlank()) result.add(ChatMessage(sessionId=session,role=author,content=text,createdAt=(msg.optDouble("create_time",0.0)*1000).toLong()))
            }
        }
        return result
    }

    private fun parseTranscript(raw: String): List<ChatMessage> {
        val result = mutableListOf<ChatMessage>()
        val pattern = Regex("(?im)^\\s*(you|user|chatgpt|assistant)\\s*:\\s*(.*)$")
        val matches = pattern.findAll(raw).toList()
        matches.forEachIndexed { index, match ->
            val end = matches.getOrNull(index + 1)?.range?.first ?: raw.length
            val body = (match.groupValues[2] + raw.substring(match.range.last + 1, end)).trim()
            if (body.isNotBlank()) {
                val role = if (match.groupValues[1].equals("you",true) || match.groupValues[1].equals("user",true)) "user" else "assistant"
                result.add(ChatMessage(sessionId="text-import",role=role,content=body))
            }
        }
        require(result.isNotEmpty()) { "No ChatGPT JSON conversations or speaker-labelled You:/ChatGPT: transcript lines were found." }
        return result
    }
}
