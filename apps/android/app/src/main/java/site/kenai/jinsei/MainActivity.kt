package site.kenai.jinsei

import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {
    private var pendingFiles: ValueCallback<Array<Uri>>? = null

    private val chooseFiles =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            pendingFiles?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data),
            )
            pendingFiles = null
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = ServerStore(this)
        setContent {
            JinseiTheme {
                JinseiApp(
                    store = store,
                    onChooseFiles = { callback, params ->
                        // Avatar, banner and cover uploads use the system file picker.
                        pendingFiles?.onReceiveValue(null)
                        pendingFiles = callback
                        runCatching { chooseFiles.launch(params.createIntent()) }
                            .onFailure {
                                pendingFiles = null
                                callback.onReceiveValue(null)
                            }
                            .isSuccess
                    },
                    onExit = { finish() },
                )
            }
        }
    }

    override fun onPause() {
        super.onPause()
        // Keeps the session cookie when the system closes the app in the background.
        CookieManager.getInstance().flush()
    }
}
