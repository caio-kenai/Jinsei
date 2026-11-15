package site.kenai.jinsei

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Light =
    lightColorScheme(
        primary = Color(0xFF202020),
        onPrimary = Color.White,
        secondary = Color(0xFFE5306F),
        background = Color(0xFFF6F6F8),
        surface = Color.White,
        onBackground = Color(0xFF202027),
        onSurface = Color(0xFF202027),
        onSurfaceVariant = Color(0xFF6B6B76),
        error = Color(0xFFC91E47),
    )

private val Dark =
    darkColorScheme(
        primary = Color(0xFFF2F2F5),
        onPrimary = Color(0xFF141418),
        secondary = Color(0xFFFF6B9A),
        background = Color(0xFF141418),
        surface = Color(0xFF1D1D22),
        onBackground = Color(0xFFECECF1),
        onSurface = Color(0xFFECECF1),
        onSurfaceVariant = Color(0xFFA0A0AB),
        error = Color(0xFFFF6B8A),
    )

@Composable
fun JinseiTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) Dark else Light, content = content)
}
