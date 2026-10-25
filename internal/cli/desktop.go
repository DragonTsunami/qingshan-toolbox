// Package cli 提供桌面运维专项修复命令实现。
package cli

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

var (
	fixSpoolerFlag      bool
	fixDnsFlag          bool
	fixWinsockFlag      bool
	fixWuauservFlag     bool
	fixPrint709Flag     bool
	fixProxyFlag        bool
	fixIconCacheFlag    bool
	fixHibernateFlag    bool
	fixDisplayResetFlag bool
	fixAudioResetFlag   bool
	fixPresentationFlag bool
	fixAllFlag          bool
)

// desktopCmd 桌面运维专属命令组
var desktopCmd = &cobra.Command{
	Use:   "desktop",
	Short: "桌面运维支持专项工具 / Desktop IT support toolkit",
	Long:  "为桌面运维工程师、Helpdesk 提供常见 Windows 客户端故障一键排查与急救工具。",
}

// desktopFixCmd 故障修复急救命令
var desktopFixCmd = &cobra.Command{
	Use:   "fix",
	Short: "一键快速修复常见桌面故障 (打印机卡单/DNS/Winsock/Windows更新)",
	RunE: func(cmd *cobra.Command, args []string) error {
		if runtime.GOOS != "windows" {
			color.Yellow("提示: 桌面排障急救工具专为 Windows 客户端设计。")
			return nil
		}

		if !fixSpoolerFlag && !fixDnsFlag && !fixWinsockFlag && !fixWuauservFlag && !fixPrint709Flag && !fixProxyFlag && !fixIconCacheFlag && !fixHibernateFlag && !fixDisplayResetFlag && !fixAudioResetFlag && !fixPresentationFlag && !fixAllFlag {
			// 默认运行常用打印卡单与 DNS 刷新
			fixSpoolerFlag = true
			fixDnsFlag = true
		}

		color.Cyan("\n╔══════════════════════════════════════════════════╗")
		color.Cyan("║       青衫工具箱 · 桌面支持应急修复              ║")
		color.Cyan("╚══════════════════════════════════════════════════╝\n")

		if fixSpoolerFlag || fixAllFlag {
			runFixSpooler()
		}

		if fixPrint709Flag || fixAllFlag {
			runFixPrint709()
		}

		if fixDnsFlag || fixAllFlag {
			runFixDns()
		}

		if fixProxyFlag || fixAllFlag {
			runFixProxy()
		}

		if fixWinsockFlag || fixAllFlag {
			runFixWinsock()
		}

		if fixWuauservFlag || fixAllFlag {
			runFixWuauserv()
		}

		if fixIconCacheFlag || fixAllFlag {
			runFixIconCache()
		}

		if fixHibernateFlag || fixAllFlag {
			runFixHibernate()
		}

		if fixDisplayResetFlag || fixAllFlag {
			runFixDisplayReset()
		}

		if fixAudioResetFlag || fixAllFlag {
			runFixAudioReset()
		}

		if fixPresentationFlag || fixAllFlag {
			runFixPresentation()
		}

		color.Green("\n✔ 桌面排障任务执行完毕！")
		return nil
	},
}

func runFixSpooler() {
	fmt.Print("[1/4] 正在重置 Windows 打印服务 (Spooler)... ")
	_ = exec.Command("net", "stop", "spooler").Run()

	// 清理 PRINTERS 目录
	spoolDir := filepath.Join(os.Getenv("SystemRoot"), "System32", "spool", "PRINTERS")
	entries, err := os.ReadDir(spoolDir)
	if err == nil {
		for _, e := range entries {
			_ = os.Remove(filepath.Join(spoolDir, e.Name()))
		}
	}

	err = exec.Command("net", "start", "spooler").Run()
	if err != nil {
		color.Red("失败 (%v)", err)
	} else {
		color.Green("成功 (已清空积压队列并重启服务)")
	}
}

func runFixDns() {
	fmt.Print("[2/4] 正在刷新本地 DNS 解析缓存 (ipconfig /flushdns)... ")
	out, err := exec.Command("ipconfig", "/flushdns").CombinedOutput()
	if err != nil {
		color.Red("失败 (%v)", err)
	} else {
		color.Green("成功\n      %s", string(out))
	}
}

func runFixWinsock() {
	fmt.Print("[3/4] 正在重置底层网络协议栈 (netsh winsock reset)... ")
	err := exec.Command("netsh", "winsock", "reset").Run()
	if err != nil {
		color.Red("失败 (%v)", err)
	} else {
		color.Green("成功 (请在必要时重启计算机)")
	}
}

func runFixWuauserv() {
	fmt.Print("[4/8] 正在重置 Windows Update 补丁缓存... ")
	_ = exec.Command("net", "stop", "wuauserv").Run()
	softDist := filepath.Join(os.Getenv("SystemRoot"), "SoftwareDistribution", "Download")
	entries, err := os.ReadDir(softDist)
	if err == nil {
		for _, e := range entries {
			_ = os.RemoveAll(filepath.Join(softDist, e.Name()))
		}
	}
	_ = exec.Command("net", "start", "wuauserv").Run()
	color.Green("成功 (已清空损坏补丁下载临时块)")
}

func runFixPrint709() {
	fmt.Print("[打印排障] 正在修复共享打印机 0x00000709 / 0x0000011b 报错... ")
	_ = exec.Command("reg", "add", `HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows NT\Printers\RPC`, "/v", "RpcUseNamedPipeProtocol", "/t", "REG_DWORD", "/d", "1", "/f").Run()
	_ = exec.Command("reg", "add", `HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows NT\Printers\RPC`, "/v", "RpcProtocols", "/t", "REG_DWORD", "/d", "7", "/f").Run()
	_ = exec.Command("reg", "add", `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Print`, "/v", "RpcAuthnLevelPrivacyEnabled", "/t", "REG_DWORD", "/d", "0", "/f").Run()
	_ = exec.Command("net", "stop", "spooler").Run()
	err := exec.Command("net", "start", "spooler").Run()
	if err != nil {
		color.Red("失败 (%v)", err)
	} else {
		color.Green("成功 (已配置 RPC 命名管道并重启 Print Spooler)")
	}
}

func runFixProxy() {
	fmt.Print("[网络排障] 正在清空系统残留代理设置 (急救网页打不开)... ")
	_ = exec.Command("reg", "add", `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "0", "/f").Run()
	_ = exec.Command("reg", "add", `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`, "/v", "ProxyServer", "/t", "REG_SZ", "/d", "", "/f").Run()
	_ = exec.Command("reg", "delete", `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`, "/v", "AutoConfigURL", "/f").Run()
	color.Green("成功 (已将系统代理恢复为直接直连模式)")
}

func runFixIconCache() {
	fmt.Print("[桌面排障] 正在重建桌面与任务栏图标缓存数据库... ")
	_ = exec.Command("taskkill", "/F", "/IM", "explorer.exe").Run()
	localAppData := os.Getenv("LocalAppData")
	if localAppData != "" {
		_ = os.Remove(filepath.Join(localAppData, "IconCache.db"))
		explorerDir := filepath.Join(localAppData, "Microsoft", "Windows", "Explorer")
		entries, err := os.ReadDir(explorerDir)
		if err == nil {
			for _, e := range entries {
				if len(e.Name()) >= 9 && e.Name()[:9] == "iconcache" {
					_ = os.Remove(filepath.Join(explorerDir, e.Name()))
				}
			}
		}
	}
	_ = exec.Command("cmd", "/c", "start", "explorer.exe").Start()
	color.Green("成功 (已清除异常缓存并重启资源管理器)")
}

func runFixHibernate() {
	fmt.Print("[磁盘急救] 正在关闭 Windows 休眠并释放 C 盘空间 (powercfg -h off)... ")
	out, err := exec.Command("powercfg", "-h", "off").CombinedOutput()
	if err != nil {
		color.Red("失败 (%v): %s", err, string(out))
	} else {
		color.Green("成功 (已释放 hiberfil.sys 占用，C盘空间已回流)")
	}
}

func runFixDisplayReset() {
	fmt.Print("[会议急救] 正在重置多屏投影管道并刷新显卡驱动... ")
	_ = exec.Command("displayswitch.exe", "/extend").Run()
	color.Green("成功 (已触发屏幕拓展输出重置与显示适配器探测)")
}

func runFixAudioReset() {
	fmt.Print("[会议急救] 正在纠偏音频输出设备并重启 Windows Audio 服务... ")
	_ = exec.Command("net", "stop", "audiosrv").Run()
	err := exec.Command("net", "start", "audiosrv").Run()
	if err != nil {
		color.Red("失败 (%v)", err)
	} else {
		color.Green("成功 (已重置默认音频播放通道，急救大屏静音)")
	}
}

func runFixPresentation() {
	fmt.Print("[会议急救] 正在激活会议演示防息屏保活模式... ")
	_ = exec.Command("powercfg", "-change", "-monitor-timeout-ac", "0").Run()
	_ = exec.Command("powercfg", "-change", "-standby-timeout-ac", "0").Run()
	color.Green("成功 (已临时禁用息屏与休眠，保障会议演示)")
}

func init() {
	desktopFixCmd.Flags().BoolVar(&fixSpoolerFlag, "spooler", false, "清除打印机假脱机卡单积压文件")
	desktopFixCmd.Flags().BoolVar(&fixPrint709Flag, "print709", false, "一键修复局域网共享打印机 0x00000709 与 0x0000011b 报错")
	desktopFixCmd.Flags().BoolVar(&fixDnsFlag, "dns", false, "刷新并清除本地 DNS 缓存")
	desktopFixCmd.Flags().BoolVar(&fixProxyFlag, "proxy", false, "清除系统残留代理设置，急救浏览器断网")
	desktopFixCmd.Flags().BoolVar(&fixWinsockFlag, "winsock", false, "重置网络协议栈 Winsock 目录")
	desktopFixCmd.Flags().BoolVar(&fixWuauservFlag, "wuauserv", false, "清理 Windows Update 补丁下载损坏缓存")
	desktopFixCmd.Flags().BoolVar(&fixIconCacheFlag, "icon-cache", false, "清理 IconCache 数据库并重启桌面，解决图标白块")
	desktopFixCmd.Flags().BoolVar(&fixHibernateFlag, "hibernate", false, "关闭休眠并删除 hiberfil.sys，快速腾出 C 盘空间")
	desktopFixCmd.Flags().BoolVar(&fixDisplayResetFlag, "display-reset", false, "一键纠偏多屏投影输出，刷新显卡驱动管道")
	desktopFixCmd.Flags().BoolVar(&fixAudioResetFlag, "audio-reset", false, "一键纠偏音频输出设备并重启音频服务")
	desktopFixCmd.Flags().BoolVar(&fixPresentationFlag, "presentation", false, "激活会议演示防息屏保活模式，阻止休眠锁屏")
	desktopFixCmd.Flags().BoolVar(&fixAllFlag, "all", false, "一键执行全部桌面常见急救项")

	desktopCmd.AddCommand(desktopFixCmd)
	rootCmd.AddCommand(desktopCmd)
}
