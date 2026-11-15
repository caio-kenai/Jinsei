package site.kenai.jinsei

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.launch

typealias FileChooser = (ValueCallback<Array<Uri>>, WebChromeClient.FileChooserParams) -> Boolean

/** Asks for the instance once, then shows it full screen. */
@Composable
fun JinseiApp(store: ServerStore, onChooseFiles: FileChooser, onExit: () -> Unit) {
    var server by rememberSaveable { mutableStateOf(store.server) }
    var editing by rememberSaveable { mutableStateOf(store.server == null) }
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        val current = server
        if (editing || current == null) {
            ServerSetup(
                initial = current ?: OFFICIAL_SERVER,
                onConnected = { origin ->
                    store.server = origin
                    server = origin
                    editing = false
                },
            )
        } else {
            WebScreen(
                server = current,
                onChooseFiles = onChooseFiles,
                onChangeServer = { editing = true },
                onExit = onExit,
            )
        }
    }
}

@Composable
private fun Brand() {
    Image(
        painter = painterResource(R.drawable.jinsei_symbol),
        contentDescription = null,
        modifier = Modifier.size(84.dp),
    )
    Text(
        text = stringResource(R.string.app_name),
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
    )
}

@Composable
private fun ServerSetup(initial: String, onConnected: (String) -> Unit) {
    var address by rememberSaveable { mutableStateOf(initial) }
    var error by rememberSaveable { mutableStateOf<Int?>(null) }
    var checking by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val submit: () -> Unit = {
        val origin = normalizeServer(address)
        if (origin == null) {
            error = R.string.invalid_address
        } else if (!checking) {
            error = null
            checking = true
            scope.launch {
                val ok = isJinseiServer(origin)
                checking = false
                if (ok) {
                    onConnected(origin)
                } else {
                    error = R.string.unreachable
                }
            }
        }
    }
    Column(
        modifier =
            Modifier.fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Brand()
        Text(
            text = stringResource(R.string.setup_intro),
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.widthIn(max = 420.dp),
        )
        OutlinedTextField(
            value = address,
            onValueChange = {
                address = it
                error = null
            },
            label = { Text(stringResource(R.string.server_label)) },
            singleLine = true,
            isError = error != null,
            supportingText = {
                val message = error
                Text(
                    if (message != null) stringResource(message)
                    else if (address.trim().startsWith("http://", true))
                        stringResource(R.string.insecure_address)
                    else stringResource(R.string.server_hint),
                )
            },
            keyboardOptions =
                KeyboardOptions(
                    keyboardType = KeyboardType.Uri,
                    imeAction = ImeAction.Go,
                    autoCorrectEnabled = false,
                ),
            keyboardActions = KeyboardActions(onGo = { submit() }),
            modifier = Modifier.fillMaxWidth().widthIn(max = 420.dp),
        )
        Button(
            onClick = { submit() },
            enabled = !checking,
            modifier = Modifier.fillMaxWidth().widthIn(max = 420.dp).height(48.dp),
        ) {
            Text(stringResource(if (checking) R.string.connecting else R.string.connect))
        }
        TextButton(
            onClick = {
                address = OFFICIAL_SERVER
                error = null
            },
        ) {
            Text(stringResource(R.string.use_official))
        }
    }
}

private fun openExternal(context: Context, url: Uri) {
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: ActivityNotFoundException) {
        // No app can open this link; the instance stays on screen.
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun WebScreen(
    server: String,
    onChooseFiles: FileChooser,
    onChangeServer: () -> Unit,
    onExit: () -> Unit,
) {
    var webView by remember { mutableStateOf<WebView?>(null) }
    var failed by rememberSaveable(server) { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    var askExit by remember { mutableStateOf(false) }

    BackHandler {
        val view = webView
        if (view != null && !failed && view.canGoBack()) {
            view.goBack()
        } else {
            askExit = true
        }
    }
    DisposableEffect(server) { onDispose { webView?.destroy() } }

    Box(modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing)) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.userAgentString =
                        "${settings.userAgentString} JinseiAndroid/${BuildConfig.VERSION_NAME}"
                    CookieManager.getInstance().setAcceptCookie(true)
                    webViewClient =
                        object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView,
                                request: WebResourceRequest,
                            ): Boolean {
                                // The instance opens here; any other site opens in the browser.
                                if (sameOrigin(server, request.url)) return false
                                openExternal(context, request.url)
                                return true
                            }

                            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                                loading = true
                            }

                            override fun onPageFinished(view: WebView, url: String?) {
                                loading = false
                            }

                            override fun onReceivedError(
                                view: WebView,
                                request: WebResourceRequest,
                                error: WebResourceError,
                            ) {
                                if (request.isForMainFrame) failed = true
                            }
                        }
                    webChromeClient =
                        object : WebChromeClient() {
                            override fun onShowFileChooser(
                                view: WebView,
                                callback: ValueCallback<Array<Uri>>,
                                params: FileChooserParams,
                            ): Boolean = onChooseFiles(callback, params)
                        }
                    loadUrl("$server/home?client=android")
                    webView = this
                }
            },
        )
        if (loading && !failed) {
            LinearProgressIndicator(modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter))
        }
        if (failed) {
            Offline(
                server = server,
                onRetry = {
                    failed = false
                    webView?.reload()
                },
                onChangeServer = onChangeServer,
            )
        }
    }

    if (askExit) {
        AlertDialog(
            onDismissRequest = { askExit = false },
            title = { Text(stringResource(R.string.exit_title)) },
            text = { Text(stringResource(R.string.exit_text, server)) },
            confirmButton = {
                Row {
                    TextButton(
                        onClick = {
                            askExit = false
                            onChangeServer()
                        },
                    ) {
                        Text(stringResource(R.string.change_server))
                    }
                    TextButton(onClick = onExit) { Text(stringResource(R.string.exit)) }
                }
            },
            dismissButton = {
                TextButton(onClick = { askExit = false }) { Text(stringResource(R.string.cancel)) }
            },
        )
    }
}

@Composable
private fun Offline(server: String, onRetry: () -> Unit, onChangeServer: () -> Unit) {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Brand()
            Text(
                text = stringResource(R.string.offline_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = stringResource(R.string.offline_text),
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.widthIn(max = 420.dp),
            )
            Text(text = server, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(4.dp))
            Button(onClick = onRetry, modifier = Modifier.widthIn(min = 200.dp)) {
                Text(stringResource(R.string.retry))
            }
            OutlinedButton(onClick = onChangeServer, modifier = Modifier.widthIn(min = 200.dp)) {
                Text(stringResource(R.string.change_server))
            }
        }
    }
}
