package com.mikus.assistant

import java.util.Locale
import kotlin.math.ln

/** Small, deterministic BM25 retrieval over the encrypted local conversation/document corpus. */
object LocalMemorySearch {
    private val stopWords = setOf("the", "and", "for", "that", "this", "with", "from", "you", "your", "are", "was", "were", "have", "has", "had", "what", "when", "where", "who", "how", "why", "about", "into", "then", "than", "them", "they", "their", "our", "out", "not", "but", "can", "could", "would", "should")
    private fun terms(text: String) = Regex("[\\p{L}\\p{N}]{2,}").findAll(text.lowercase(Locale.ROOT)).map { it.value }.filterNot { it in stopWords }.toList()

    fun search(query: String, corpus: List<ChatMessage>, limit: Int = 8): List<ChatMessage> {
        val q = terms(query).distinct()
        if (q.isEmpty() || corpus.isEmpty()) return emptyList()
        val docs = corpus.map { terms(it.content) }
        val avgLength = docs.sumOf { it.size }.toDouble().div(docs.size).coerceAtLeast(1.0)
        val documentFrequency = q.associateWith { term -> docs.count { term in it } }
        val k1 = 1.5
        val b = 0.75
        return corpus.mapIndexedNotNull { index, message ->
            val tokens = docs[index]
            if (tokens.isEmpty()) return@mapIndexedNotNull null
            val frequencies = tokens.groupingBy { it }.eachCount()
            val score = q.sumOf { term ->
                val tf = frequencies[term] ?: 0
                if (tf == 0) 0.0 else {
                    val df = documentFrequency[term] ?: 0
                    val idf = ln(1.0 + (corpus.size - df + 0.5) / (df + 0.5))
                    idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * tokens.size / avgLength))
                }
            }
            if (score > 0.0) message to score else null
        }.sortedByDescending { it.second }.take(limit).map { it.first }
    }
}
