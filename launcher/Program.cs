using System;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Komsu;

internal static class Program
{
    private static readonly (string Resource, string RelativePath)[] WebFiles =
    {
        ("web.index", "index.html"),
        ("web.css.style", "css/style.css"),
        ("web.js.utils", "js/utils.js"),
        ("web.js.audio", "js/audio.js"),
        ("web.js.voice", "js/voice.js"),
        ("web.js.world", "js/world.js"),
        ("web.js.player", "js/player.js"),
        ("web.js.ai", "js/ai.js"),
        ("web.js.ui", "js/ui.js"),
        ("web.js.story", "js/story.js"),
        ("web.js.settings", "js/settings.js"),
        ("web.js.main", "js/main.js"),
        ("web.vendor.three", "vendor/three.min.js")
    };

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
        Application.Run(new GameForm());
    }

    internal static string ExtractWeb()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "KOMSU", "web");
        var asm = Assembly.GetExecutingAssembly();
        foreach (var (resource, relative) in WebFiles)
        {
            var target = Path.Combine(dir, relative.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            using var source = asm.GetManifestResourceStream(resource)
                ?? throw new InvalidOperationException("Gömülü kaynak bulunamadı: " + resource);
            using var file = File.Create(target);
            source.CopyTo(file);
        }
        return dir;
    }
}

internal sealed class GameForm : Form
{
    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };

    public GameForm()
    {
        Text = "KOMŞU — Bir Mahalle Sırrı";
        BackColor = Color.Black;
        MinimumSize = new Size(960, 600);
        ClientSize = new Size(1280, 800);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        KeyPreview = true;
        Controls.Add(_web);

        Load += async (_, _) =>
        {
            try
            {
                var userData = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "KOMSU", "WebView2");
                var environment = await CoreWebView2Environment.CreateAsync(null, userData);
                await _web.EnsureCoreWebView2Async(environment);

                var settings = _web.CoreWebView2.Settings;
                settings.AreDefaultContextMenusEnabled = false;
                settings.AreDevToolsEnabled = false;
                settings.IsStatusBarEnabled = false;
                settings.IsZoomControlEnabled = false;
                settings.AreBrowserAcceleratorKeysEnabled = false;
                settings.IsGeneralAutofillEnabled = false;
                settings.IsPasswordAutosaveEnabled = false;

                var webRoot = Program.ExtractWeb();
                _web.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "komsu.app", webRoot, CoreWebView2HostResourceAccessKind.Allow);
                _web.CoreWebView2.NavigationCompleted += async (_, e) =>
                {
                    try
                    {
                        await System.Threading.Tasks.Task.Delay(1800);
                        var probe = await _web.CoreWebView2.ExecuteScriptAsync(
                            "JSON.stringify({title:document.title,game:!!window.GAME,ready:!!(window.GAME&&window.GAME.renderer),voice:!!window.VOICE,speech:!!(window.VOICE&&window.VOICE.supported),settings:!!window.SETTINGS,quality:window.SETTINGS?SETTINGS.quality:'-',shadow:!!(window.GAME&&GAME.renderer&&GAME.renderer.shadowMap.enabled)})");
                        File.WriteAllText(
                            Path.Combine(Path.GetDirectoryName(webRoot)!, "launcher.log"),
                            DateTime.Now.ToString("s") + " nav success=" + e.IsSuccess + " status=" + e.WebErrorStatus + " probe=" + probe);
                    }
                    catch (Exception ex)
                    {
                        try
                        {
                            File.WriteAllText(
                                Path.Combine(Path.GetDirectoryName(webRoot)!, "launcher.log"),
                                DateTime.Now.ToString("s") + " nav success=" + e.IsSuccess + " probe error=" + ex.Message);
                        }
                        catch (Exception) { /* yoksay */ }
                    }
                };
                _web.CoreWebView2.Navigate("https://komsu.app/index.html");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Oyun başlatılamadı. Microsoft Edge WebView2 Runtime gerekli olabilir.\n\n" + ex.Message,
                    "KOMŞU", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
            }
        };

        KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.F11)
            {
                WindowState = WindowState == FormWindowState.Maximized
                    ? FormWindowState.Normal
                    : FormWindowState.Maximized;
                e.Handled = true;
            }
        };
    }
}
