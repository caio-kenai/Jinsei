# Apps para computador e Android

O Jinsei tem apps para **Windows, macOS, Linux** ([Tauri 2](https://tauri.app)) e **Android** (Kotlin + Jetpack Compose). Os dois funcionam só online: abrem a mesma interface da web de uma instância Jinsei, com a conta e os dados no servidor. Nada fica guardado no aparelho além do endereço do servidor e da sessão.

## Baixar

Os instaladores ficam anexados a cada [release](https://github.com/caio-kenai/Jinsei/releases/latest). A página `/download` de qualquer instância aponta para os arquivos da versão mais recente:

| Plataforma                        | Arquivo                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| Windows 10+ (64 bits)             | `Jinsei-windows-x64-setup.exe`                             |
| macOS 11+ (Intel e Apple Silicon) | `Jinsei-macos-universal.dmg`                               |
| Linux (64 bits)                   | `Jinsei-linux-x86_64.AppImage` ou `Jinsei-linux-amd64.deb` |
| Android 8+                        | `Jinsei-android.apk`                                       |

As somas SHA-256 estão em `SHA256SUMS-apps`. Os instaladores de computador ainda não têm assinatura digital paga: na primeira abertura, o Windows (SmartScreen) e o macOS (Gatekeeper) pedem confirmação. O APK é assinado sempre com a mesma chave, então versões novas instalam por cima da anterior. O app não é publicado na Play Store.

## Como os apps funcionam

- Na primeira abertura, o app pede o endereço do servidor (o oficial é `https://jinsei.kenai.site`). Instâncias próprias funcionam do mesmo jeito.
- A janela só navega dentro do servidor escolhido. Links para outros sites abrem no navegador do sistema.
- Para trocar de servidor: no computador, menu **Servidor → Trocar servidor** (Ctrl/Cmd + Shift + S); no Android, use o botão voltar na tela inicial do app.
- Os apps abrem `/home?client=desktop` ou `?client=android`. A interface guarda essa informação para esconder o convite de download dentro dos apps. O app Android também acrescenta `JinseiAndroid/<versão>` ao user agent.
- O texto dos apps acompanha o idioma do sistema (português, inglês ou espanhol). A interface do Jinsei segue o idioma da conta.

## Compilar o app de computador

Requisitos: Node.js 24, pnpm, [Rust estável](https://rustup.rs) e as dependências do Tauri para o seu sistema ([lista oficial](https://tauri.app/start/prerequisites/)). No Linux: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev` e `patchelf`.

```bash
pnpm install
pnpm --filter @jinsei/desktop start    # abre o app em modo de desenvolvimento
pnpm --filter @jinsei/desktop bundle   # gera os instaladores em apps/desktop/src-tauri/target/release/bundle
```

A página inicial do app fica em `apps/desktop/ui` (HTML, CSS e JavaScript sem build). O código nativo fica em `apps/desktop/src-tauri/src/lib.rs`. Os ícones são gerados com `pnpm --filter @jinsei/desktop icons` a partir de `assets/branding/jinsei-favicon.png`.

## Compilar o app Android

Requisitos: JDK 17 e Android SDK (API 36), por exemplo pelo Android Studio. Abra `apps/android` no Android Studio ou use o Gradle Wrapper:

```bash
cd apps/android
./gradlew assembleDebug      # APK de teste em app/build/outputs/apk/debug
./gradlew assembleRelease    # APK de release (assinado se as variáveis abaixo existirem)
```

A versão do APK acompanha o `package.json` da raiz (`versionCode = major × 10000 + minor × 100 + patch`).

Para assinar, defina `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`. Forks devem usar uma chave própria; nunca versione arquivos `.jks` ou `.keystore`.

## Releases

O workflow [`apps.yml`](../.github/workflows/apps.yml) compila os apps em pull requests que alteram `apps/desktop` ou `apps/android` e, quando uma release é publicada, anexa os instaladores e o `SHA256SUMS-apps`. A assinatura do APK usa os segredos `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD` do repositório.
