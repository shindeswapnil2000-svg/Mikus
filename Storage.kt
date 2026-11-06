package com.mikus.assistant

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.room.*
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SupportFactory
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "messages", indices = [Index("createdAt"), Index("sessionId")])
data class ChatMessage(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val role: String,
    val content: String,
    val createdAt: Long = System.currentTimeMillis(),
    val persona: String = "Automatic",
    val profile: String = "Balanced"
)

@Entity(tableName = "tasks", indices = [Index("dueAt"), Index("done")])
data class TaskItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val notes: String = "",
    val dueAt: Long? = null,
    val done: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "journal")
data class JournalEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val body: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "drafts")
data class DraftEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val body: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface MikusDao {
    @Query("SELECT * FROM messages ORDER BY createdAt DESC LIMIT 500") fun messages(): Flow<List<ChatMessage>>
    @Query("SELECT * FROM messages WHERE content LIKE '%' || :term || '%' ORDER BY createdAt DESC LIMIT 100") suspend fun searchMessages(term: String): List<ChatMessage>
    @Insert suspend fun addMessage(item: ChatMessage)
    @Insert suspend fun addMessages(items: List<ChatMessage>)
    @Query("DELETE FROM messages") suspend fun clearMessages()
    @Query("SELECT * FROM tasks ORDER BY done ASC, COALESCE(dueAt, 9223372036854775807) ASC, createdAt DESC") fun tasks(): Flow<List<TaskItem>>
    @Insert suspend fun addTask(item: TaskItem)
    @Update suspend fun updateTask(item: TaskItem)
    @Delete suspend fun deleteTask(item: TaskItem)
    @Query("SELECT * FROM journal ORDER BY createdAt DESC") fun journal(): Flow<List<JournalEntry>>
    @Insert suspend fun addJournal(item: JournalEntry)
    @Delete suspend fun deleteJournal(item: JournalEntry)
    @Query("SELECT * FROM drafts ORDER BY createdAt DESC") fun drafts(): Flow<List<DraftEntry>>
    @Insert suspend fun addDraft(item: DraftEntry)
    @Delete suspend fun deleteDraft(item: DraftEntry)
    @Query("SELECT * FROM messages ORDER BY createdAt ASC") suspend fun allMessages(): List<ChatMessage>
    @Query("SELECT * FROM tasks ORDER BY createdAt ASC") suspend fun allTasks(): List<TaskItem>
    @Query("SELECT * FROM journal ORDER BY createdAt ASC") suspend fun allJournal(): List<JournalEntry>
    @Query("SELECT * FROM drafts ORDER BY createdAt ASC") suspend fun allDrafts(): List<DraftEntry>
    @Query("DELETE FROM tasks") suspend fun clearTasks()
    @Query("DELETE FROM journal") suspend fun clearJournal()
    @Query("DELETE FROM drafts") suspend fun clearDrafts()
}

@Database(entities = [ChatMessage::class, TaskItem::class, JournalEntry::class, DraftEntry::class], version = 1, exportSchema = false)
abstract class MikusDatabase : RoomDatabase() { abstract fun dao(): MikusDao }

object DbKeyManager {
    private const val ALIAS = "mikus.database.key.v1"
    private const val PREFS = "mikus_secure_key"
    private const val VALUE = "wrapped_key"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true).build())
        return generator.generateKey()
    }

    fun passphrase(context: Context): ByteArray {
        SQLiteDatabase.loadLibs(context)
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val stored = prefs.getString(VALUE, null)
        if (stored != null) {
            val packed = android.util.Base64.decode(stored, android.util.Base64.NO_WRAP)
            val iv = packed.copyOfRange(0, 12)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
            return cipher.doFinal(packed.copyOfRange(12, packed.size))
        }
        val raw = ByteArray(32).also { java.security.SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val packed = cipher.iv + cipher.doFinal(raw)
        prefs.edit().putString(VALUE, android.util.Base64.encodeToString(packed, android.util.Base64.NO_WRAP)).apply()
        return raw
    }
}

class MikusApplication : android.app.Application() {
    val database: MikusDatabase by lazy {
        val factory = SupportFactory(DbKeyManager.passphrase(this))
        Room.databaseBuilder(this, MikusDatabase::class.java, "mikus-v1.db")
            .openHelperFactory(factory).build()
    }
}
