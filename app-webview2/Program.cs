using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;

namespace QingShanToolbox
{
    class Program
    {
        private static HttpListener listener;
        private static string webRoot;
        private static Process edgeProcess;

        static void Main(string[] args)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (Directory.Exists(Path.Combine(baseDir, "..", "web")))
            {
                webRoot = Path.GetFullPath(Path.Combine(baseDir, "..", "web"));
            }
            else if (Directory.Exists(Path.Combine(baseDir, "web")))
            {
                webRoot = Path.GetFullPath(Path.Combine(baseDir, "web"));
            }
            else
            {
                webRoot = baseDir;
            }

            int port = 38981;
            StartHttpServer(port);

            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            if (!File.Exists(edgePath))
            {
                return;
            }

            string userDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "QingShanToolbox", "WebViewProfile");
            string appUrl = string.Format("http://127.0.0.1:{0}/index.html", port);

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = edgePath,
                Arguments = string.Format("--app=\"{0}\" --window-size=1260,860 --user-data-dir=\"{1}\" --disable-features=Translate,OptimizationHints --app-id=QingShanToolbox", appUrl, userDataDir),
                UseShellExecute = false
            };

            try
            {
                edgeProcess = Process.Start(psi);
                if (edgeProcess != null)
                {
                    edgeProcess.WaitForExit();
                }
            }
            catch
            {
            }
            finally
            {
                StopHttpServer();
            }
        }

        private static void StartHttpServer(int port)
        {
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", port));
                listener.Start();

                ThreadPool.QueueUserWorkItem(state =>
                {
                    while (listener != null && listener.IsListening)
                    {
                        try
                        {
                            var ctx = listener.GetContext();
                            ThreadPool.QueueUserWorkItem(ProcessRequest, ctx);
                        }
                        catch
                        {
                            break;
                        }
                    }
                });
            }
            catch
            {
            }
        }

        private static void ProcessRequest(object state)
        {
            HttpListenerContext ctx = (HttpListenerContext)state;
            try
            {
                string rawUrl = ctx.Request.Url.AbsolutePath;

                // Handle Exit command
                if (rawUrl == "/api/exit" && ctx.Request.HttpMethod == "POST")
                {
                    try
                    {
                        ctx.Response.StatusCode = 200;
                        ctx.Response.Close();
                    }
                    catch { }

                    ThreadPool.QueueUserWorkItem(s =>
                    {
                        Thread.Sleep(50);
                        try
                        {
                            if (edgeProcess != null && !edgeProcess.HasExited)
                            {
                                edgeProcess.Kill();
                            }
                        }
                        catch { }
                        Environment.Exit(0);
                    });
                    return;
                }

                if (rawUrl == "/api/exec" && ctx.Request.HttpMethod == "POST")
                {
                    string reqBody;
                    using (var reader = new StreamReader(ctx.Request.InputStream, ctx.Request.ContentEncoding))
                    {
                        reqBody = reader.ReadToEnd();
                    }

                    string result = ExecuteSystemOp(reqBody);
                    byte[] resBytes = Encoding.UTF8.GetBytes(result);
                    ctx.Response.ContentType = "application/json; charset=utf-8";
                    ctx.Response.ContentLength64 = resBytes.Length;
                    ctx.Response.OutputStream.Write(resBytes, 0, resBytes.Length);
                    ctx.Response.Close();
                    return;
                }

                string fileName = rawUrl.TrimStart('/');
                if (string.IsNullOrEmpty(fileName)) fileName = "index.html";

                string filePath = Path.Combine(webRoot, fileName);
                if (File.Exists(filePath))
                {
                    string ext = Path.GetExtension(filePath).ToLower();
                    string mime = "text/html; charset=utf-8";
                    if (ext == ".css") mime = "text/css; charset=utf-8";
                    else if (ext == ".js") mime = "application/javascript; charset=utf-8";
                    else if (ext == ".png") mime = "image/png";
                    else if (ext == ".svg") mime = "image/svg+xml";
                    else if (ext == ".json") mime = "application/json; charset=utf-8";

                    byte[] fileBytes = File.ReadAllBytes(filePath);
                    ctx.Response.ContentType = mime;
                    ctx.Response.ContentLength64 = fileBytes.Length;
                    ctx.Response.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                    ctx.Response.Close();
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                    ctx.Response.Close();
                }
            }
            catch
            {
                try { ctx.Response.StatusCode = 500; ctx.Response.Close(); } catch { }
            }
        }

        private static string ExecuteSystemOp(string jsonPayload)
        {
            try
            {
                string cmd = "";
                int idx = jsonPayload.IndexOf("\"cmd\":");
                if (idx != -1)
                {
                    int start = jsonPayload.IndexOf("\"", idx + 6);
                    int end = jsonPayload.IndexOf("\"", start + 1);
                    if (start != -1 && end != -1)
                    {
                        cmd = jsonPayload.Substring(start + 1, end - start - 1);
                    }
                }

                if (string.IsNullOrEmpty(cmd)) cmd = jsonPayload.Trim();

                string psCmd = cmd;
                if (cmd.StartsWith("disk clean --temp"))
                {
                    psCmd = "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force -ErrorAction SilentlyContinue; 'Temp 临时目录缓存已清理完成'";
                }
                else if (cmd.StartsWith("disk clean --recycle-bin"))
                {
                    psCmd = "Clear-RecycleBin -Force -ErrorAction SilentlyContinue; '回收站已成功清空'";
                }
                else if (cmd.StartsWith("desktop fix --dns"))
                {
                    psCmd = "Clear-DnsClientCache; 'DNS 客户端解析缓存已刷新成功'";
                }
                else if (cmd.StartsWith("desktop fix --spooler"))
                {
                    psCmd = "Restart-Service spooler -Force; '打印机假脱机 Spooler 服务已重启'";
                }
                else if (cmd.StartsWith("desktop fix --icon-cache"))
                {
                    psCmd = "ie4uinit.exe -show; 'Windows 图标缓存已重建'";
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = string.Format("-NoProfile -Command \"{0}\"", psCmd),
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using (var p = Process.Start(psi))
                {
                    string output = p.StandardOutput.ReadToEnd();
                    string err = p.StandardError.ReadToEnd();
                    p.WaitForExit(8000);
                    string ret = !string.IsNullOrEmpty(output) ? output.Trim() : (!string.IsNullOrEmpty(err) ? err.Trim() : "执行完毕");
                    ret = ret.Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");
                    return "{\"success\":true,\"output\":\"" + ret + "\"}";
                }
            }
            catch (Exception ex)
            {
                return "{\"success\":false,\"error\":\"" + ex.Message.Replace("\"", "\\\"") + "\"}";
            }
        }

        private static void StopHttpServer()
        {
            try
            {
                if (listener != null)
                {
                    listener.Stop();
                    listener.Close();
                    listener = null;
                }
            }
            catch { }
        }
    }
}
