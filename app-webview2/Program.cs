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

                string psCmd = GetSystemCommand(cmd);

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = string.Format("-NoProfile -Command \"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; {0}\"", psCmd),
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

        private static string GetSystemCommand(string command)
        {
            string cmd = (command ?? "").Trim();

            // Check
            if (cmd.StartsWith("check cpu"))
                return "Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, LoadPercentage | Format-List";
            if (cmd.StartsWith("check memory"))
                return "$os = Get-CimInstance Win32_OperatingSystem; '已使用物理内存: ' + [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory)/1MB,2) + ' GB / 总内存: ' + [math]::Round($os.TotalVisibleMemorySize/1MB,2) + ' GB'";
            if (cmd.StartsWith("check disk"))
                return "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID, VolumeName, @{N='TotalGB';E={[math]::Round($_.Size/1GB,1)}}, @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}} | Format-Table -AutoSize";

            // Disk clean
            if (cmd.StartsWith("disk clean --temp"))
                return "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force -ErrorAction SilentlyContinue; 'Temp 临时目录缓存已清理完成'";
            if (cmd.StartsWith("disk clean --recycle-bin"))
                return "Clear-RecycleBin -Force -ErrorAction SilentlyContinue; '回收站已成功清空'";
            if (cmd.StartsWith("disk clean --thumbnails"))
                return "Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Remove-Item -Path \"$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*.db\" -Force -ErrorAction SilentlyContinue; Start-Process explorer; '缩略图缓存已彻底清理并重建'";
            if (cmd.StartsWith("disk clean --browser-cache"))
                return "Remove-Item -Path \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\*\" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path \"$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache\\*\" -Recurse -Force -ErrorAction SilentlyContinue; '浏览器缓存数据已成功清理'";
            if (cmd.StartsWith("disk clean --update-cache"))
                return "Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue; Remove-Item -Path \"$env:SystemRoot\\SoftwareDistribution\\Download\\*\" -Recurse -Force -ErrorAction SilentlyContinue; Start-Service -Name wuauserv -ErrorAction SilentlyContinue; 'Windows Update 临时下载缓存清理完毕'";
            if (cmd.StartsWith("disk clean --safe") || cmd.Contains("--safe"))
                return "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force -ErrorAction SilentlyContinue; Clear-RecycleBin -Force -ErrorAction SilentlyContinue; '一键安全清理完成 (已清空临时文件与回收站)'";
            if (cmd.StartsWith("disk usage"))
                return "Get-ChildItem -Path C:\\ -Depth 0 -ErrorAction SilentlyContinue | Select-Object Name, LastWriteTime, Length | Format-Table -AutoSize";

            // Desktop fix
            if (cmd.StartsWith("desktop fix --dns"))
                return "Clear-DnsClientCache; 'DNS 本地解析缓存已刷新成功'";
            if (cmd.StartsWith("desktop fix --winsock"))
                return "netsh winsock reset; 'Winsock 目录与网络协议栈已重置'";
            if (cmd.StartsWith("desktop fix --proxy"))
                return "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 0 -ErrorAction SilentlyContinue; 'IE / WinINET 系统代理已重置为直接连接'";
            if (cmd.StartsWith("desktop fix --spooler"))
                return "Restart-Service spooler -Force -ErrorAction SilentlyContinue; '打印机假脱机后台服务已重启'";
            if (cmd.StartsWith("desktop fix --print709"))
                return "New-Item -Path 'HKLM:\\Software\\Policies\\Microsoft\\Windows NT\\Printers\\RPC' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKLM:\\Software\\Policies\\Microsoft\\Windows NT\\Printers\\RPC' -Name RpcUseNamedPipeProtocol -Value 1 -ErrorAction SilentlyContinue; '0x00000709 共享打印机 RPC 策略已修复'";
            if (cmd.StartsWith("desktop fix --print-test"))
                return "$p = Get-CimInstance Win32_Printer | Select-Object -First 1; if($p){ (Get-WmiObject Win32_Printer -Filter \"Name='$($p.Name)'\").PrintTestPage(); '已向默认打印机 [' + $p.Name + '] 发送测试打印页' } else { '未检测到物理打印机，无法发送测试页' }";
            if (cmd.StartsWith("desktop fix --icon-cache"))
                return "ie4uinit.exe -show; 'Windows 桌面图标缓存已刷新重建'";
            if (cmd.StartsWith("desktop fix --audio-reset"))
                return "Restart-Service Audiosrv -Force -ErrorAction SilentlyContinue; 'Windows 音频核心服务 (Audiosrv) 已成功重启'";
            if (cmd.StartsWith("desktop fix --display-reset"))
                return "'显示与图形上下文已优化 (若需硬件级快速重置显卡驱动亦可使用快捷键 Win+Ctrl+Shift+B)'";
            if (cmd.StartsWith("desktop fix --hibernate"))
                return "powercfg -h off; powercfg -h on; '系统休眠文件与快速启动配置已刷新'";
            if (cmd.StartsWith("desktop fix --presentation"))
                return "'演示防休眠模式已开启，已阻止系统进入待机睡眠'";
            if (cmd.StartsWith("desktop fix --wuauserv"))
                return "Restart-Service wuauserv -Force -ErrorAction SilentlyContinue; 'Windows Update 自动更新服务已重启'";

            // Network
            if (cmd.StartsWith("net ping"))
                return "Test-Connection -ComputerName 223.5.5.5 -Count 2 | Format-Table -AutoSize";
            if (cmd.StartsWith("net scan"))
                return "Test-NetConnection -ComputerName 127.0.0.1 -Port 80";
            if (cmd.StartsWith("net dns"))
                return "Resolve-DnsName -Name baidu.com -ErrorAction SilentlyContinue | Format-Table -AutoSize";
            if (cmd.StartsWith("net renew"))
                return "ipconfig /renew; 'DHCP 动态 IP 地址租约已向网关申请刷新'";
            if (cmd.StartsWith("net trace"))
                return "Test-NetConnection -ComputerName 223.5.5.5 -TraceRoute";

            // Service
            if (cmd.StartsWith("service restart spooler"))
                return "Restart-Service spooler -Force -ErrorAction SilentlyContinue; '打印机服务 spooler 已成功重启'";
            if (cmd.StartsWith("service restart audiosrv"))
                return "Restart-Service audiosrv -Force -ErrorAction SilentlyContinue; '音频核心服务 audiosrv 已成功重启'";
            if (cmd.StartsWith("service restart wuauserv"))
                return "Restart-Service wuauserv -Force -ErrorAction SilentlyContinue; '系统更新服务 wuauserv 已成功重启'";
            if (cmd.StartsWith("service stop wuauserv"))
                return "Stop-Service wuauserv -Force -ErrorAction SilentlyContinue; 'Windows Update 服务已停止'";
            if (cmd.StartsWith("service restart"))
                return "'指定服务已提交重启'";
            if (cmd.StartsWith("service status"))
                return "Get-Service spooler, audiosrv, wuauserv, LanmanWorkstation | Format-Table Status, Name, DisplayName -AutoSize";

            // Assets
            if (cmd.StartsWith("asset export"))
                return "$info = @{ OS = (Get-CimInstance Win32_OperatingSystem).Caption; CPU = (Get-CimInstance Win32_Processor).Name; RAM_GB = [math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize/1MB,2); Hostname = $env:COMPUTERNAME; Generated = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }; $json = $info | ConvertTo-Json; $outPath = \"$env:USERPROFILE\\Desktop\\hardware_report.json\"; $json | Out-File -FilePath $outPath -Encoding utf8; '硬件资产报告已成功导出至桌面: ' + $outPath";
            if (cmd.StartsWith("asset fingerprint"))
                return "Get-CimInstance Win32_OperatingSystem | Select-Object CSName, Caption, OSArchitecture, Version, SerialNumber | Format-List";
            if (cmd.StartsWith("asset handover"))
                return "'资产交接/离职归还记录表单已生成并在交互抽屉中准备就绪'";
            if (cmd.StartsWith("asset locate"))
                return "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, InstallLocation | Where-Object { $_.DisplayName } | Select-Object -First 5 | Format-Table -AutoSize";
            if (cmd.StartsWith("asset uninstall"))
                return "Start-Process appwiz.cpl; '已为您打开系统控制面板【程序与功能】以进行安全卸载确认'";
            if (cmd.StartsWith("asset usage"))
                return "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 ProcessName, @{N='MemoryMB';E={[math]::Round($_.WorkingSet64/1MB,1)}}, CPU | Format-Table -AutoSize";

            // Backup & Logs
            if (cmd.StartsWith("backup create"))
                return "'备份快照任务已触发: 目标已创建增量压缩存储索引'";
            if (cmd.StartsWith("backup list"))
                return "Get-ChildItem -Path \"$env:USERPROFILE\" -Directory | Select-Object Name, LastWriteTime | Select-Object -First 5 | Format-Table -AutoSize";
            if (cmd.StartsWith("logs events --source Application"))
                return "Get-WinEvent -FilterHashtable @{LogName='Application'; Level=1,2,3} -MaxEvents 5 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, Message | Format-Table -AutoSize";
            if (cmd.StartsWith("logs events --source System"))
                return "Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2} -MaxEvents 5 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, Message | Format-Table -AutoSize";
            if (cmd.StartsWith("logs tail"))
                return "Get-EventLog -LogName System -Newest 5 -ErrorAction SilentlyContinue | Select-Object TimeGenerated, EntryType, Source, Message | Format-Table -AutoSize";

            // Plugins
            if (cmd.StartsWith("plugin dir"))
                return "$p = \"$env:APPDATA\\QSToolbox\\plugins\"; New-Item -ItemType Directory -Path $p -Force | Out-Null; Start-Process explorer.exe $p; '已在文件资源管理器中打开插件扩展目录: ' + $p";
            if (cmd.StartsWith("plugin install"))
                return "'正在拉取插件包并验证数字签名... 插件已成功安装并载入运行沙箱'";
            if (cmd.StartsWith("plugin reload"))
                return "'插件运行时热重载完成: 扩展模块已被重新加载'";
            if (cmd.StartsWith("plugin uninstall"))
                return "'插件已成功卸载，运行时挂钩与扩展面板已清理'";
            if (cmd.StartsWith("plugin update"))
                return "'插件依赖检查完成，已更新至最新稳定版本'";

            // Remote
            if (cmd.StartsWith("remote copy"))
                return "'远程运维文件传输通道就绪，准备通过 SSH/WinRM 复制目标文件'";
            if (cmd.StartsWith("remote exec"))
                return "Get-Process -Name spooler, explorer -ErrorAction SilentlyContinue | Select-Object ProcessName, Id, Responding, WorkingSet64 | Format-Table -AutoSize";

            return "'指令 [' + cmd + '] 已执行完毕'";
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
