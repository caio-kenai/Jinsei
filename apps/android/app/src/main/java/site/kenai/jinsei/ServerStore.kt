package site.kenai.jinsei

import android.content.Context
import android.net.Uri
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

const val OFFICIAL_SERVER = "https://jinsei.kenai.site"

/** Remembers the Jinsei instance chosen on this device. */
class ServerStore(context: Context) {
    private val preferences = context.getSharedPreferences("jinsei", Context.MODE_PRIVATE)

    var server: String?
        get() = preferences.getString("server", null)
        set(value) = preferences.edit().putString("server", value).apply()
}

/** Keeps only the origin of an address, adding https:// when the scheme is missing. */
fun normalizeServer(value: String): String? {
    val trimmed = value.trim().trimEnd('/')
    if (trimmed.isEmpty()) return null
    val withScheme =
        if (trimmed.startsWith("http://", true) || trimmed.startsWith("https://", true)) trimmed
        else "https://$trimmed"
    val uri = Uri.parse(withScheme)
    val host = uri.host ?: return null
    if (!host.contains('.') && host != "localhost") return null
    val port = if (uri.port > 0) ":${uri.port}" else ""
    return "${uri.scheme!!.lowercase()}://${host.lowercase()}$port"
}

/** True when the address answers the Jinsei API health check. */
suspend fun isJinseiServer(origin: String): Boolean =
    withContext(Dispatchers.IO) {
        runCatching {
            val connection = URL("$origin/api/health").openConnection() as HttpURLConnection
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            try {
                connection.responseCode == 200 &&
                    connection.inputStream.bufferedReader().use { it.readText() }.contains("jinsei-api")
            } finally {
                connection.disconnect()
            }
        }.getOrDefault(false)
    }

/** Same scheme, host and port. */
fun sameOrigin(origin: String, url: Uri): Boolean {
    val server = Uri.parse(origin)
    val port = { uri: Uri ->
        if (uri.port > 0) uri.port else if (uri.scheme == "http") 80 else 443
    }
    return server.scheme == url.scheme && server.host == url.host && port(server) == port(url)
}
