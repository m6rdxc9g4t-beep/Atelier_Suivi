// Atelier Suivi — fenêtre d'app native (WebKit) pour https://atelier-suivi-bay.vercel.app
// Construite par « Installer Atelier Suivi.command » (à côté de ce fichier, dossier mac/ du dépôt).
// L'adresse est lue dans Resources/adresse.txt ; la session (cookies) est gardée par l'app, à part de Safari.

import Cocoa
import WebKit

@main
enum AtelierSuiviMain {
    @MainActor static var delegate: AppDelegate?
    @MainActor static func main() {
        let app = NSApplication.shared
        let d = AppDelegate()
        delegate = d // référence forte : NSApplication ne garde qu'une référence faible
        app.delegate = d
        app.setActivationPolicy(.regular)
        app.run()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate,
    WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {

    static let fallbackURL = "https://atelier-suivi-bay.vercel.app"

    var window: NSWindow!
    var webView: WKWebView!
    var home: URL!
    var lastDownload: URL?

    // MARK: - Démarrage

    func applicationDidFinishLaunching(_ notification: Notification) {
        home = Self.readHomeURL()
        buildMenu()
        buildWindow()
        webView.load(URLRequest(url: home))
        NSApp.activate(ignoringOtherApps: true)
    }

    static func readHomeURL() -> URL {
        if let path = Bundle.main.path(forResource: "adresse", ofType: "txt"),
           let text = try? String(contentsOfFile: path, encoding: .utf8),
           let line = text.split(whereSeparator: \.isNewline).first,
           let url = URL(string: line.trimmingCharacters(in: .whitespaces)),
           url.scheme == "https" || url.scheme == "http" {
            return url
        }
        return URL(string: fallbackURL)!
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window?.makeKeyAndOrderFront(nil)
        return true
    }

    func buildWindow() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.applicationNameForUserAgent = "Version/17.0 Safari/605.1.15 AtelierSuivi"

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsMagnification = true
        webView.setValue(false, forKey: "drawsBackground") // pas de flash blanc au chargement

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1100, height: 780),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Atelier Suivi"
        window.backgroundColor = NSColor(calibratedRed: 0.035, green: 0.047, blue: 0.067, alpha: 1)
        window.minSize = NSSize(width: 380, height: 520)
        window.contentView = webView
        window.delegate = self
        window.isReleasedWhenClosed = false
        window.center()
        window.setFrameAutosaveName("AtelierSuiviFenetre")
        window.makeKeyAndOrderFront(nil)
    }

    // MARK: - Menus

    func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem(); main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "À propos d'Atelier Suivi",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Masquer Atelier Suivi", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let others = appMenu.addItem(withTitle: "Masquer les autres",
                                     action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        others.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quitter Atelier Suivi", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Édition")
        edit.addItem(withTitle: "Annuler", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = edit.addItem(withTitle: "Rétablir", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        edit.addItem(.separator())
        edit.addItem(withTitle: "Couper", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copier", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Coller", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Tout sélectionner", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit

        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let view = NSMenu(title: "Présentation")
        view.addItem(withTitle: "Recharger", action: #selector(reloadPage), keyEquivalent: "r").target = self
        let homeItem = view.addItem(withTitle: "Accueil", action: #selector(goHome), keyEquivalent: "h")
        homeItem.keyEquivalentModifierMask = [.command, .shift]; homeItem.target = self
        view.addItem(withTitle: "Précédent", action: #selector(goBack), keyEquivalent: "[").target = self
        view.addItem(withTitle: "Suivant", action: #selector(goForward), keyEquivalent: "]").target = self
        view.addItem(.separator())
        view.addItem(withTitle: "Agrandir le texte", action: #selector(zoomIn), keyEquivalent: "+").target = self
        view.addItem(withTitle: "Réduire le texte", action: #selector(zoomOut), keyEquivalent: "-").target = self
        view.addItem(withTitle: "Taille réelle", action: #selector(zoomReset), keyEquivalent: "0").target = self
        view.addItem(.separator())
        view.addItem(withTitle: "Ouvrir dans Safari", action: #selector(openInBrowser), keyEquivalent: "").target = self
        viewItem.submenu = view

        let winItem = NSMenuItem(); main.addItem(winItem)
        let win = NSMenu(title: "Fenêtre")
        win.addItem(withTitle: "Réduire", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Fermer", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winItem.submenu = win
        NSApp.windowsMenu = win

        NSApp.mainMenu = main
    }

    @objc func reloadPage() {
        if webView.url == nil || webView.url?.scheme == "about" { webView.load(URLRequest(url: home)) }
        else { webView.reload() }
    }
    @objc func goHome() { webView.load(URLRequest(url: home)) }
    @objc func goBack() { if webView.canGoBack { webView.goBack() } }
    @objc func goForward() { if webView.canGoForward { webView.goForward() } }
    @objc func zoomIn() { webView.pageZoom = min(webView.pageZoom + 0.1, 3) }
    @objc func zoomOut() { webView.pageZoom = max(webView.pageZoom - 0.1, 0.5) }
    @objc func zoomReset() { webView.pageZoom = 1 }
    @objc func openInBrowser() {
        let url = (webView.url?.scheme?.hasPrefix("http") == true) ? webView.url! : home!
        NSWorkspace.shared.open(url)
    }

    // MARK: - Navigation : Suivi dans la fenêtre, le reste dans le navigateur

    func isInternal(_ url: URL) -> Bool {
        guard let scheme = url.scheme else { return false }
        if scheme == "about" || scheme == "blob" || scheme == "data" { return true }
        return (scheme == "https" || scheme == "http") && url.host == home.host
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.shouldPerformDownload { decisionHandler(.download); return }
        guard let url = action.request.url else { decisionHandler(.allow); return }
        // Ressources de sous-cadres : on laisse faire.
        if let frame = action.targetFrame, !frame.isMainFrame { decisionHandler(.allow); return }
        if isInternal(url) { decisionHandler(.allow); return }
        NSWorkspace.shared.open(url)
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        var attachment = false
        if let http = response.response as? HTTPURLResponse,
           let disposition = http.value(forHTTPHeaderField: "Content-Disposition")?.lowercased() {
            attachment = disposition.hasPrefix("attachment")
        }
        decisionHandler(attachment || !response.canShowMIMEType ? .download : .allow)
    }

    // Liens target=_blank / window.open
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if isInternal(url) { webView.load(action.request) } else { NSWorkspace.shared.open(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let ns = error as NSError
        if ns.code == NSURLErrorCancelled || (ns.domain == "WebKitErrorDomain" && ns.code == 102) { return }
        showOffline(ns.localizedDescription)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if let title = webView.title, !title.isEmpty { window.title = title }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    func showOffline(_ detail: String) {
        let safe = detail.replacingOccurrences(of: "<", with: "&lt;")
        let html = """
        <!doctype html><html lang="fr"><meta charset="utf-8">
        <style>
          html,body{height:100%;margin:0;background:#090c11;color:#d8f6fb;font:16px -apple-system,system-ui,sans-serif}
          body{display:grid;place-items:center;text-align:center}
          h1{color:#15aabf;font-size:22px;margin:0 0 8px} p{opacity:.75;max-width:420px;margin:0 auto 22px}
          button{background:#15aabf;color:#04252b;border:0;border-radius:10px;padding:12px 22px;font-size:15px;font-weight:700;cursor:pointer}
        </style>
        <div><h1>Atelier Suivi est injoignable</h1>
        <p>Vérifie ta connexion internet, puis réessaie.<br><small>\(safe)</small></p>
        <button onclick="location.href='\(home.absoluteString)'">Réessayer</button></div></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    // MARK: - Boîtes de dialogue JavaScript

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert(); alert.messageText = message; alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert(); alert.messageText = message
        alert.addButton(withTitle: "OK"); alert.addButton(withTitle: "Annuler")
        alert.beginSheetModal(for: window) { completionHandler($0 == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert(); alert.messageText = prompt
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.stringValue = defaultText ?? ""
        alert.accessoryView = field
        alert.addButton(withTitle: "OK"); alert.addButton(withTitle: "Annuler")
        alert.beginSheetModal(for: window) { completionHandler($0 == .alertFirstButtonReturn ? field.stringValue : nil) }
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = parameters.allowsDirectories
        panel.beginSheetModal(for: window) { completionHandler($0 == .OK ? panel.urls : nil) }
    }

    // MARK: - Téléchargements (export CSV…) → dossier Téléchargements

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let folder = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
            ?? FileManager.default.homeDirectoryForCurrentUser
        let name = suggestedFilename.isEmpty ? "atelier-suivi" : suggestedFilename
        let base = (name as NSString).deletingPathExtension
        let ext = (name as NSString).pathExtension
        var target = folder.appendingPathComponent(name)
        var n = 2
        while FileManager.default.fileExists(atPath: target.path) {
            target = folder.appendingPathComponent(ext.isEmpty ? "\(base) \(n)" : "\(base) \(n).\(ext)")
            n += 1
        }
        lastDownload = target
        completionHandler(target)
    }

    func downloadDidFinish(_ download: WKDownload) {
        if let url = lastDownload { NSWorkspace.shared.activateFileViewerSelecting([url]) }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        let alert = NSAlert()
        alert.messageText = "Le téléchargement a échoué"
        alert.informativeText = error.localizedDescription
        alert.beginSheetModal(for: window) { _ in }
    }
}
