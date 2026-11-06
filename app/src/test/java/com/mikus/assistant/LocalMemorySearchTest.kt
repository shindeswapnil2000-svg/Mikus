package com.mikus.assistant

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalMemorySearchTest {
    private fun message(text: String, id: Long) = ChatMessage(id=id, sessionId="test", role="user", content=text)

    @Test fun ranksRelevantLocalPassageFirst() {
        val unrelated = message("Remember to buy apples and milk", 1)
        val relevant = message("The Galaxy S25 Ultra uses an Android foreground microphone service for voice features", 2)
        val results = LocalMemorySearch.search("Android microphone service on Galaxy", listOf(unrelated, relevant))
        assertEquals(2L, results.first().id)
    }

    @Test fun returnsNoResultsForEmptyOrUnmatchedQuery() {
        val docs = listOf(message("A note about a garden", 1))
        assertTrue(LocalMemorySearch.search("", docs).isEmpty())
        assertTrue(LocalMemorySearch.search("quasar spacecraft", docs).isEmpty())
    }
}
