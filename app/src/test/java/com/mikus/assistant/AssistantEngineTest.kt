package com.mikus.assistant

import org.junit.Assert.assertTrue
import org.junit.Test

class AssistantEngineTest {
    @Test fun unknownMemoryIsNotInvented() {
        val response = AssistantEngine.reply("What did I tell you about my blue bicycle last year?", "Automatic", "Balanced", emptyList())
        assertTrue(response.contains("won't invent", ignoreCase = true))
    }
    @Test fun greetingReturnsUsefulPrompt() {
        val response = AssistantEngine.reply("Hello", "Companion", "Quick", emptyList())
        assertTrue(response.contains("Hello", ignoreCase = true))
    }
}
