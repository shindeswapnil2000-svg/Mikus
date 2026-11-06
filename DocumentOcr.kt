package com.mikus.assistant

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** OCR runs locally using bundled ML Kit recognizers. PDF extraction is capped at 40 pages. */
object DocumentOcr {
    suspend fun extract(context: Context, uri: Uri): String = withContext(Dispatchers.IO) {
        val latin = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        val devanagari = TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
        try {
            val type = context.contentResolver.getType(uri).orEmpty()
            val output = StringBuilder()
            if (type == "application/pdf" || uri.toString().lowercase().endsWith(".pdf")) {
                val pfd = context.contentResolver.openFileDescriptor(uri, "r") ?: error("Cannot open PDF")
                PdfRenderer(pfd).use { pdf ->
                    require(pdf.pageCount <= 40) { "This first version supports PDFs up to 40 pages." }
                    for (index in 0 until pdf.pageCount) {
                        pdf.openPage(index).use { page ->
                            val scale = (1800f / page.width).coerceAtMost(2.5f).coerceAtLeast(1f)
                            val bitmap = Bitmap.createBitmap((page.width * scale).toInt(), (page.height * scale).toInt(), Bitmap.Config.ARGB_8888)
                            bitmap.eraseColor(Color.WHITE)
                            page.render(bitmap, null, Matrix().apply { setScale(scale, scale) }, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            output.append("\n--- Page ${index + 1} ---\n").append(recognize(bitmap, latin, devanagari))
                            bitmap.recycle()
                        }
                    }
                }
            } else {
                val image = InputImage.fromFilePath(context, uri)
                output.append(Tasks.await(latin.process(image)).text)
                if (output.length < 30) output.append("\n").append(Tasks.await(devanagari.process(image)).text)
            }
            output.toString().trim().also { require(it.isNotBlank()) { "No readable text found in this document." } }
        } finally { latin.close(); devanagari.close() }
    }

    private fun recognize(bitmap: Bitmap, latin: com.google.mlkit.vision.text.TextRecognizer, devanagari: com.google.mlkit.vision.text.TextRecognizer): String {
        val image = InputImage.fromBitmap(bitmap, 0)
        val first = Tasks.await(latin.process(image)).text
        return if (first.length > 30) first else first + "\n" + Tasks.await(devanagari.process(image)).text
    }
}
