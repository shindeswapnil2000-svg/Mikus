package com.mikus.assistant

import android.Manifest
import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.app.ActivityCompat
import java.io.File
import java.io.FileOutputStream
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date
import java.util.UUID

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("mikus_settings", MODE_PRIVATE)
        if (prefs.getBoolean("biometric_lock", false)) {
            val manager = BiometricManager.from(this)
            if (manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL) == BiometricManager.BIOMETRIC_SUCCESS) {
                val prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this), object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) { showApp() }
                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) { finish() }
                })
                prompt.authenticate(BiometricPrompt.PromptInfo.Builder().setTitle("Unlock Mikus").setSubtitle("Your private data stays on this device").setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL).build())
                return
            }
        }
        showApp()
    }
    private fun showApp() {
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 304)
        }
        setContent { MikusApp((application as MikusApplication).database.dao()) }
    }
}

private enum class Page(val label: String) { Home("Home"), Chat("Mikus"), Tasks("Tasks"), Memory("Memory"), Journal("Journal"), Studio("Studio"), Actions("Actions"), Settings("Settings") }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MikusApp(dao: MikusDao) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var page by remember { mutableStateOf(Page.Home) }
    var persona by remember { mutableStateOf("Automatic") }
    var profile by remember { mutableStateOf("Balanced") }
    var backupPassword by remember { mutableStateOf("") }
    var banner by remember { mutableStateOf("") }
    var modelPath by remember { mutableStateOf(context.getSharedPreferences("mikus_settings", 0).getString("model_path", null)) }
    var modelReady by remember { mutableStateOf(LocalLlmRuntime.isReady) }
    val tasks by dao.tasks().collectAsStateWithLifecycle(emptyList())
    val messages by dao.messages().collectAsStateWithLifecycle(emptyList())
    val journal by dao.journal().collectAsStateWithLifecycle(emptyList())
    val drafts by dao.drafts().collectAsStateWithLifecycle(emptyList())

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch { runCatching { context.contentResolver.openInputStream(uri)!!.use { ChatGPTImporter.parse(it) }.also { parsed -> dao.addMessages(parsed) } }.onSuccess { banner = "Imported ${it.size} messages locally." }.onFailure { banner = "Import failed: ${it.message}" } }
    }
    val restoreLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch { runCatching { BackupManager.restore(dao,uri,context.contentResolver,backupPassword.toCharArray()) }.onSuccess { banner = "Backup restored. Existing local data was replaced." }.onFailure { banner = "Restore failed: ${it.message}" } }
    }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { uri ->
        if (uri != null) scope.launch { runCatching { BackupManager.export(dao,uri,context.contentResolver,backupPassword.toCharArray()) }.onSuccess { banner = "Encrypted backup created." }.onFailure { banner = "Backup failed: ${it.message}" } }
    }
    val modelLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            runCatching {
                val dir = File(context.filesDir, "models").apply { mkdirs() }
                val name = (uri.lastPathSegment?.substringAfterLast('/') ?: "mikus-model.gguf").substringAfterLast(':').replace(Regex("[^A-Za-z0-9._-]"), "_")
                val target = File(dir, if (name.endsWith(".gguf", true)) name else "$name.gguf")
                context.contentResolver.openInputStream(uri)?.use { input -> FileOutputStream(target).use { output -> input.copyTo(output) } } ?: error("Could not read selected model")
                LocalLlmRuntime.load(context, target)
                target.absolutePath
            }.onSuccess { path -> modelPath = path; modelReady = true; context.getSharedPreferences("mikus_settings", 0).edit().putString("model_path", path).apply(); banner = "Local Qwen/Llama model loaded. Chat now runs on this phone." }
             .onFailure { banner = "Model load failed: ${it.message}" }
        }
    }
    val ocrLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            runCatching { DocumentOcr.extract(context, uri) }.onSuccess { extracted ->
                dao.addMessage(ChatMessage(sessionId="documents", role="document", content=extracted))
                banner = "Document OCR complete. Extracted text saved in encrypted local memory."
            }.onFailure { banner = "OCR failed: ${it.message}" }
        }
    }
    LaunchedEffect(Unit) {
        val saved = modelPath?.let(::File)
        if (saved != null && saved.exists() && !LocalLlmRuntime.isReady) {
            banner = "Loading your saved local AI model…"
            runCatching { LocalLlmRuntime.load(context, saved) }
                .onSuccess { modelReady = true; banner = "Local AI model ready. No cloud inference is used." }
                .onFailure { banner = "Saved model could not be loaded: ${it.message}" }
        }
    }

    MaterialTheme(colorScheme = lightColorScheme(primary = androidx.compose.ui.graphics.Color(0xFF65558F), secondary = androidx.compose.ui.graphics.Color(0xFF625B71), background = androidx.compose.ui.graphics.Color(0xFFF8F6FB))) {
        Scaffold(
            topBar = { TopAppBar(title = { Column { Text("Mikus", fontWeight = FontWeight.Bold); Text("Private personal assistant", style = MaterialTheme.typography.labelSmall) } }, actions = { IconButton(onClick = { page = Page.Settings }) { Icon(Icons.Default.Settings, "Settings") } }) },
            bottomBar = { NavigationBar {
                listOf(Page.Home,Page.Chat,Page.Tasks,Page.Memory,Page.Journal,Page.Studio).forEach { p ->
                    val icon = when(p) { Page.Home -> Icons.Default.Home; Page.Chat -> Icons.Default.Chat; Page.Tasks -> Icons.Default.CheckCircle; Page.Memory -> Icons.Default.Psychology; Page.Journal -> Icons.Default.Book; else -> Icons.Default.Lightbulb }
                    NavigationBarItem(selected = page == p, onClick = { page = p }, icon = { Icon(icon,p.label) }, label = { Text(p.label) })
                }
            } },
            floatingActionButton = { if (page == Page.Actions) FloatingActionButton(onClick = { PhoneActions.dial(context) }) { Icon(Icons.Default.Call,"Dial") } }
        ) { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if (banner.isNotBlank()) { Surface(color = MaterialTheme.colorScheme.secondaryContainer) { Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) { Text(banner,Modifier.weight(1f)); TextButton(onClick={banner=""}) { Text("Dismiss") } } } }
                when(page) {
                    Page.Home -> HomeScreen(tasks, messages.size, onNavigate={page=it})
                    Page.Chat -> ChatScreen(dao,messages,persona,profile,{persona=it},{profile=it},modelReady)
                    Page.Tasks -> TasksScreen(tasks, onAdd={ title,notes,due -> scope.launch { dao.addTask(TaskItem(title=title,notes=notes,dueAt=due)); if (due != null && due > System.currentTimeMillis()) runCatching { ReminderScheduler.schedule(context,due,title) } } }, onToggle={ scope.launch { dao.updateTask(it.copy(done=!it.done)) } }, onDelete={ scope.launch { dao.deleteTask(it) } })
                    Page.Memory -> MemoryScreen(messages, onSearch={ term -> scope.launch { dao.searchMessages(term) } }, onImport={ importLauncher.launch(arrayOf("application/json","text/plain")) }, onOcr={ ocrLauncher.launch(arrayOf("application/pdf","image/*")) })
                    Page.Journal -> JournalScreen(journal, onAdd={ title,body -> scope.launch { dao.addJournal(JournalEntry(title=title,body=body)) } }, onDelete={ scope.launch { dao.deleteJournal(it) } })
                    Page.Studio -> StudioScreen(drafts, onAdd={ title,body -> scope.launch { dao.addDraft(DraftEntry(title=title,body=body)) } }, onDelete={ scope.launch { dao.deleteDraft(it) } })
                    Page.Actions -> ActionsScreen()
                    Page.Settings -> SettingsScreen(backupPassword,{backupPassword=it},onExport={exportLauncher.launch("mikus-backup.mikus")},onRestore={restoreLauncher.launch(arrayOf("application/octet-stream","*/*"))},onLock={ enabled -> context.getSharedPreferences("mikus_settings",0).edit().putBoolean("biometric_lock",enabled).apply(); banner=if(enabled) "Biometric lock enabled for the next launch." else "Biometric lock disabled." }, modelPath=modelPath, modelReady=modelReady, onChooseModel={modelLauncher.launch(arrayOf("application/octet-stream","*/*"))}, onUnloadModel={LocalLlmRuntime.unload();modelReady=false;banner="Local model unloaded to free memory."}, onStartWake={ if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED) ContextCompat.startForegroundService(context,Intent(context,WakeWordService::class.java)) else (context as? FragmentActivity)?.let { ActivityCompat.requestPermissions(it, arrayOf(Manifest.permission.RECORD_AUDIO), 730) } }, onStopWake={context.startService(Intent(context,WakeWordService::class.java).setAction(WakeWordService.ACTION_STOP)) })
                }
            }
        }
    }
}

@Composable private fun ScreenColumn(content: @Composable ColumnScope.() -> Unit) { Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement=Arrangement.spacedBy(12.dp), content=content) }
@Composable private fun HomeScreen(tasks: List<TaskItem>, messageCount: Int, onNavigate:(Page)->Unit) {
    ScreenColumn {
        Text("Your command centre",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold)
        Text("Execution over excuses.",style=MaterialTheme.typography.bodyLarge)
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) { MetricCard("Open tasks",tasks.count{!it.done}.toString(),Modifier.weight(1f)); MetricCard("Saved messages",messageCount.toString(),Modifier.weight(1f)) }
        Card { Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) { Text("Mikus Radar",style=MaterialTheme.typography.titleLarge); Text(if(tasks.any{!it.done}) "You have ${tasks.count{!it.done}} open commitments." else "A clear runway. Choose one meaningful outcome for today."); Button(onClick={onNavigate(Page.Tasks)}) { Text("Review tasks") } } }
        listOf(Page.Chat,Page.Memory,Page.Journal,Page.Studio,Page.Actions).forEach { p -> OutlinedButton(onClick={onNavigate(p)},modifier=Modifier.fillMaxWidth()) { Text("Open ${p.label}") } }
    }
}
@Composable private fun MetricCard(label:String,value:String,modifier:Modifier=Modifier) { Card(modifier) { Column(Modifier.padding(14.dp)) { Text(value,style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold); Text(label,style=MaterialTheme.typography.labelMedium) } } }

@Composable private fun ChatScreen(dao:MikusDao,messages:List<ChatMessage>,persona:String,profile:String,onPersona:(String)->Unit,onProfile:(String)->Unit,modelReady:Boolean) {
    val scope= rememberCoroutineScope(); val context=LocalContext.current; var input by remember { mutableStateOf("") }; var voiceStatus by remember { mutableStateOf("") }; val session= remember { UUID.randomUUID().toString() }
    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) runCatching { OfflineVoice.listen(context,{ input=it; voiceStatus="Offline transcription complete." },{ voiceStatus=it }) }.onFailure { voiceStatus=it.message ?: "Voice unavailable" } else voiceStatus="Microphone permission denied." }
    Column(Modifier.fillMaxSize().padding(horizontal=12.dp)) {
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp),verticalAlignment=Alignment.CenterVertically) {
            var personaMenu by remember { mutableStateOf(false) }; var profileMenu by remember { mutableStateOf(false) }
            Box { OutlinedButton(onClick={personaMenu=true}) { Text(persona) }; DropdownMenu(expanded=personaMenu,onDismissRequest={personaMenu=false}) { listOf("Automatic","Challenger","Strategist","Companion").forEach { DropdownMenuItem(text={Text(it)},onClick={onPersona(it);personaMenu=false}) } } }
            Box { OutlinedButton(onClick={profileMenu=true}) { Text(profile) }; DropdownMenu(expanded=profileMenu,onDismissRequest={profileMenu=false}) { listOf("Quick","Balanced","Deep").forEach { DropdownMenuItem(text={Text(it)},onClick={onProfile(it);profileMenu=false}) } } }
        }
        LazyColumn(Modifier.weight(1f).fillMaxWidth(),reverseLayout=true,contentPadding=PaddingValues(vertical=8.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            items(messages,key={it.id}) { msg -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text(when(msg.role){"user"->"You";"assistant"->"Mikus";"document"->"Imported document";else->msg.role},style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary); Text(msg.content) } } }
        }
        Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(value=input,onValueChange={input=it},modifier=Modifier.weight(1f),placeholder={Text("Message Mikus…")},maxLines=4)
            IconButton(onClick={ if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED) runCatching { OfflineVoice.listen(context,{ input=it; voiceStatus="Offline transcription complete." },{ voiceStatus=it }) }.onFailure { voiceStatus=it.message ?: "Voice unavailable" } else micPermission.launch(Manifest.permission.RECORD_AUDIO) }) { Icon(Icons.Default.Mic,"Speak offline") }
            IconButton(onClick={
                val text=input.trim(); if(text.isNotEmpty()) { input=""; scope.launch { dao.addMessage(ChatMessage(sessionId=session,role="user",content=text,persona=persona,profile=profile)); val all=dao.allMessages(); val relevant=LocalMemorySearch.search(text,all,8); val answer=if(modelReady) runCatching { LocalLlmRuntime.reply(text,persona,profile,relevant) }.getOrElse { "Local model error: ${it.message}. Check the model in Settings." } else AssistantEngine.reply(text,persona,profile,all); dao.addMessage(ChatMessage(sessionId=session,role="assistant",content=answer,persona=persona,profile=profile)); OfflineSpeaker.speak(context,answer) } }
            }) { Icon(Icons.Default.Send,"Send") }
        }
        if(voiceStatus.isNotBlank()) Text(voiceStatus,style=MaterialTheme.typography.labelSmall)
        Text(if(modelReady) "On-device generative AI · offline voice input/output when device packs are installed" else "Local rules active · load a GGUF model in Settings for generative AI",style=MaterialTheme.typography.labelSmall,modifier=Modifier.padding(6.dp))
    }
}

@Composable private fun TasksScreen(tasks:List<TaskItem>,onAdd:(String,String,Long?)->Unit,onToggle:(TaskItem)->Unit,onDelete:(TaskItem)->Unit) {
    var title by remember { mutableStateOf("") }; var notes by remember { mutableStateOf("") }; var due by remember { mutableStateOf("") }
    ScreenColumn {
        Text("Tasks & commitments",style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
        OutlinedTextField(title,{title=it},label={Text("What needs doing?")},modifier=Modifier.fillMaxWidth())
        OutlinedTextField(notes,{notes=it},label={Text("Notes (optional)")},modifier=Modifier.fillMaxWidth())
        OutlinedTextField(due,{due=it},label={Text("Due date/time as epoch milliseconds (optional)")},modifier=Modifier.fillMaxWidth())
        Button(onClick={ if(title.isNotBlank()) { val timestamp=due.toLongOrNull(); onAdd(title.trim(),notes.trim(),timestamp); title="";notes="";due="" } },enabled=title.isNotBlank()) { Text("Add task") }
        tasks.forEach { task -> Card { Row(Modifier.fillMaxWidth().padding(12.dp),verticalAlignment=Alignment.CenterVertically) { Checkbox(task.done,{onToggle(task)}); Column(Modifier.weight(1f)) { Text(task.title,fontWeight=FontWeight.SemiBold); if(task.notes.isNotBlank()) Text(task.notes); task.dueAt?.let { Text(DateFormat.getDateTimeInstance().format(Date(it)),style=MaterialTheme.typography.labelSmall) } }; IconButton(onClick={onDelete(task)}) { Icon(Icons.Default.Delete,"Delete") } } } }
    }
}

@Composable private fun MemoryScreen(messages:List<ChatMessage>,onSearch:(String)->Unit,onImport:()->Unit,onOcr:()->Unit) {
    var query by remember { mutableStateOf("") }; var results by remember { mutableStateOf<List<ChatMessage>?>(null) }
    ScreenColumn {
        Text("Memory",style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
        Text("Conversation history is stored on this device in an encrypted database.")
        OutlinedTextField(query,{query=it},label={Text("Search saved conversations")},modifier=Modifier.fillMaxWidth())
        Button(onClick={ onSearch(query); results=LocalMemorySearch.search(query,messages,30) },enabled=query.isNotBlank()) { Text("Search saved memory") }
        Text("Search uses on-device relevance ranking over saved conversations and OCR documents. It does not upload your data.",style=MaterialTheme.typography.bodySmall)
        OutlinedButton(onClick=onImport,modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.FileOpen,null); Spacer(Modifier.width(8.dp)); Text("Import ChatGPT conversations.json") }
        OutlinedButton(onClick=onOcr,modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.DocumentScanner,null); Spacer(Modifier.width(8.dp)); Text("Scan PDF or image with offline OCR") }
        Text("${messages.size} recent messages available",style=MaterialTheme.typography.labelMedium)
        (results ?: messages.take(20)).forEach { Card { Column(Modifier.padding(12.dp)) { Text(it.role.uppercase(),style=MaterialTheme.typography.labelSmall); Text(it.content.take(1200)); Text(DateFormat.getDateTimeInstance().format(Date(it.createdAt)),style=MaterialTheme.typography.labelSmall) } } }
    }
}

@Composable private fun JournalScreen(entries:List<JournalEntry>,onAdd:(String,String)->Unit,onDelete:(JournalEntry)->Unit) {
    var title by remember { mutableStateOf("") }; var body by remember { mutableStateOf("") }
    ScreenColumn {
        Text("Journal",style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
        OutlinedTextField(title,{title=it},label={Text("Entry title")},modifier=Modifier.fillMaxWidth())
        OutlinedTextField(body,{body=it},label={Text("Write freely…")},modifier=Modifier.fillMaxWidth(),minLines=4)
        Button(onClick={if(title.isNotBlank()||body.isNotBlank()){onAdd(title.ifBlank{"Untitled entry"},body);title="";body=""}}) { Text("Save entry") }
        entries.forEach { Card { Column(Modifier.padding(12.dp)) { Row(verticalAlignment=Alignment.CenterVertically) { Text(it.title,fontWeight=FontWeight.Bold,modifier=Modifier.weight(1f)); IconButton(onClick={onDelete(it)}) { Icon(Icons.Default.Delete,"Delete") } }; Text(it.body); Text(DateFormat.getDateTimeInstance().format(Date(it.createdAt)),style=MaterialTheme.typography.labelSmall) } } }
    }
}

@Composable private fun StudioScreen(entries:List<DraftEntry>,onAdd:(String,String)->Unit,onDelete:(DraftEntry)->Unit) {
    var title by remember { mutableStateOf("") }; var body by remember { mutableStateOf("") }
    ScreenColumn {
        Text("Creative Studio",style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
        OutlinedTextField(title,{title=it},label={Text("Draft title")},modifier=Modifier.fillMaxWidth())
        OutlinedTextField(body,{body=it},label={Text("Your ideas, outlines and drafts")},modifier=Modifier.fillMaxWidth(),minLines=5)
        Button(onClick={if(body.isNotBlank()){onAdd(title.ifBlank{"Untitled draft"},body);title="";body=""}}) { Text("Save draft") }
        entries.forEach { Card { Column(Modifier.padding(12.dp)) { Row(verticalAlignment=Alignment.CenterVertically) { Text(it.title,fontWeight=FontWeight.Bold,modifier=Modifier.weight(1f)); IconButton(onClick={onDelete(it)}) { Icon(Icons.Default.Delete,"Delete") } }; Text(it.body) } } }
    }
}

@Composable private fun ActionsScreen() {
    val context=LocalContext.current; var number by remember { mutableStateOf("") }; var message by remember { mutableStateOf("") }; var title by remember { mutableStateOf("Reminder") }; var hour by remember { mutableStateOf("9") }; var minute by remember { mutableStateOf("00") }
    ScreenColumn {
        Text("Phone & daily actions",style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
        Text("Every action opens the relevant Android app for your review. Mikus does not place calls or send messages silently.")
        OutlinedTextField(number,{number=it},label={Text("Phone number, include country code for WhatsApp")},modifier=Modifier.fillMaxWidth())
        OutlinedTextField(message,{message=it},label={Text("Message")},modifier=Modifier.fillMaxWidth())
        Button(onClick={runCatching{PhoneActions.dial(context,number)}.onFailure{}} ,modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.Call,null); Text("Open phone dialler") }
        OutlinedButton(onClick={PhoneActions.contacts(context)},modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.Contacts,null); Text("Open contacts") }
        OutlinedButton(onClick={runCatching{PhoneActions.sms(context,number,message)}.getOrNull()?.let{}},modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.Sms,null); Text("Prepare SMS") }
        OutlinedButton(onClick={runCatching{PhoneActions.whatsapp(context,number,message)}.onFailure{}},modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.Chat,null); Text("Open WhatsApp message") }
        Divider()
        OutlinedTextField(title,{title=it},label={Text("Alarm label")},modifier=Modifier.fillMaxWidth())
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) { OutlinedTextField(hour,{hour=it},label={Text("Hour 0–23")},modifier=Modifier.weight(1f)); OutlinedTextField(minute,{minute=it},label={Text("Minute")},modifier=Modifier.weight(1f)) }
        Button(onClick={runCatching{PhoneActions.alarm(context,hour.toInt(),minute.toInt(),title)}},modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.Alarm,null); Text("Create alarm in Clock") }
        OutlinedButton(onClick={val now=System.currentTimeMillis()+60*60*1000;PhoneActions.calendar(context,title,now,now+60*60*1000)},modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.CalendarMonth,null); Text("Create calendar event (starts in 1 hour)") }
    }
}

@Composable private fun SettingsScreen(password:String,onPassword:(String)->Unit,onExport:()->Unit,onRestore:()->Unit,onLock:(Boolean)->Unit,modelPath:String?,modelReady:Boolean,onChooseModel:()->Unit,onUnloadModel:()->Unit,onStartWake:()->Unit,onStopWake:()->Unit) {
    val context=LocalContext.current; var lock by remember { mutableStateOf(context.getSharedPreferences("mikus_settings",0).getBoolean("biometric_lock",false)) }
    ScreenColumn {
        Text("Privacy & settings",style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
        Text("Mikus keeps inference and stored data on this phone. No cloud AI endpoint is configured.")
        Card { Column(Modifier.padding(14.dp), verticalArrangement=Arrangement.spacedBy(8.dp)) {
            Text("Local generative AI",style=MaterialTheme.typography.titleLarge)
            Text(if(modelReady) "Model loaded: ${File(modelPath ?: LocalLlmRuntime.loadedModelPath.orEmpty()).name}" else "No generative model loaded. Download a compatible GGUF model and select it below.")
            Button(onClick=onChooseModel,modifier=Modifier.fillMaxWidth()) { Text("Choose / load GGUF model") }
            if(modelReady) OutlinedButton(onClick=onUnloadModel,modifier=Modifier.fillMaxWidth()) { Text("Unload model (free memory)") }
            Text("Recommended for Galaxy S25 Ultra: Qwen3-4B GGUF Q4_K_M (~2.5 GB). First download the model in your browser, then select the .gguf file here. Keep several GB free for model and runtime memory.",style=MaterialTheme.typography.bodySmall)
        } }
        Card { Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            Text("Offline voice",style=MaterialTheme.typography.titleLarge)
            Text("Voice input uses Android's on-device recognition service. Offline voice output uses an installed local TTS voice. Download an English (India) offline speech pack in Android settings if available.")
            Button(onClick=onStartWake,modifier=Modifier.fillMaxWidth()) { Text("Start Hey Mikus listening") }
            OutlinedButton(onClick=onStopWake,modifier=Modifier.fillMaxWidth()) { Text("Stop wake listening") }
            Text("Wake listening runs only after you start it while Mikus is visible and shows an ongoing microphone notification. Android may stop it; it cannot auto-start after reboot or bypass system microphone indicators.",style=MaterialTheme.typography.bodySmall)
        } }
        OutlinedTextField(password,{onPassword(it)},label={Text("Backup password (10+ characters)")},modifier=Modifier.fillMaxWidth())
        Button(onClick=onExport,enabled=password.length>=10,modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.Lock,null); Text("Create encrypted backup") }
        OutlinedButton(onClick=onRestore,enabled=password.length>=10,modifier=Modifier.fillMaxWidth()) { Icon(Icons.Default.Restore,null); Text("Restore backup (replaces current data)") }
        Divider()
        Row(verticalAlignment=Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text("Biometric / device unlock",fontWeight=FontWeight.SemiBold); Text("Ask for authentication when opening Mikus",style=MaterialTheme.typography.bodySmall) }; Switch(checked=lock,onCheckedChange={lock=it;onLock(it)}) }
        Text("Mikus 0.4.0 · local-first Android assistant",style=MaterialTheme.typography.labelSmall)
    }
}
