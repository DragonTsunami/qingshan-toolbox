package cli

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"github.com/fatih/color"
	"github.com/qingshan/toolbox/internal/config"
	"github.com/qingshan/toolbox/pkg/utils"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"
	"github.com/spf13/cobra"
)

// checkCmd 是系统健康检查的父命令。
// checkCmd is the parent command for system health checks.
var checkCmd = &cobra.Command{
	Use:   "check",
	Short: "系统健康检查 / System health checks",
	Long:  "执行系统健康检查，包括 CPU、内存、磁盘、网络和运行时间。\nRun system health checks including CPU, memory, disk, network, and uptime.",
	Run: func(cmd *cobra.Command, args []string) {
		_ = cmd.Help()
	},
}

// checkAllCmd 执行所有健康检查。
// checkAllCmd runs all health checks.
var checkAllCmd = &cobra.Command{
	Use:   "all",
	Short: "执行所有健康检查 / Run all health checks",
	RunE: func(cmd *cobra.Command, args []string) error {
		utils.Bold("══════════════════════════════════════════")
		utils.Bold("  青衫工具箱 - 系统健康检查报告")
		utils.Bold("  QingShan Toolbox - System Health Report")
		utils.Bold("══════════════════════════════════════════")
		fmt.Println()

		runCheckUptime()
		fmt.Println()
		runCheckCPU()
		fmt.Println()
		runCheckMemory()
		fmt.Println()
		runCheckDisk()
		fmt.Println()
		runCheckNetwork()

		fmt.Println()
		utils.Bold("══════════════════════════════════════════")
		utils.Info("检查完成 / Check complete")
		return nil
	},
}

// checkCPUCmd 检查 CPU 信息和使用率。
// checkCPUCmd checks CPU info and usage.
var checkCPUCmd = &cobra.Command{
	Use:   "cpu",
	Short: "CPU 使用率和信息 / CPU usage and info",
	RunE: func(cmd *cobra.Command, args []string) error {
		runCheckCPU()
		return nil
	},
}

// checkMemCmd 检查内存使用率。
// checkMemCmd checks memory usage.
var checkMemCmd = &cobra.Command{
	Use:   "memory",
	Short: "内存使用率 / Memory usage",
	Aliases: []string{"mem"},
	RunE: func(cmd *cobra.Command, args []string) error {
		runCheckMemory()
		return nil
	},
}

// checkDiskCmd 检查磁盘使用率。
// checkDiskCmd checks disk usage per partition.
var checkDiskCmd = &cobra.Command{
	Use:   "disk",
	Short: "磁盘使用率 / Disk usage per partition",
	RunE: func(cmd *cobra.Command, args []string) error {
		runCheckDisk()
		return nil
	},
}

// checkNetworkCmd 检查网络接口信息。
// checkNetworkCmd checks network interface info.
var checkNetworkCmd = &cobra.Command{
	Use:   "network",
	Short: "网络接口信息 / Network interface info",
	Aliases: []string{"net"},
	RunE: func(cmd *cobra.Command, args []string) error {
		runCheckNetwork()
		return nil
	},
}

// checkUptimeCmd 检查系统运行时间。
// checkUptimeCmd checks system uptime.
var checkUptimeCmd = &cobra.Command{
	Use:   "uptime",
	Short: "系统运行时间 / System uptime",
	RunE: func(cmd *cobra.Command, args []string) error {
		runCheckUptime()
		return nil
	},
}

func init() {
	checkCmd.AddCommand(checkAllCmd)
	checkCmd.AddCommand(checkCPUCmd)
	checkCmd.AddCommand(checkMemCmd)
	checkCmd.AddCommand(checkDiskCmd)
	checkCmd.AddCommand(checkNetworkCmd)
	checkCmd.AddCommand(checkUptimeCmd)
}

// ============================================================
// 检查实现 / Check implementations
// ============================================================

// runCheckCPU 获取并显示 CPU 信息与使用率。
// runCheckCPU gathers and displays CPU info and usage.
func runCheckCPU() {
	utils.Bold("📊 CPU 检查 / CPU Check")

	thresholds := config.GetThresholds()
	ctx := context.Background()

	// 获取 CPU 信息 / Get CPU info
	cpuInfo, err := cpu.InfoWithContext(ctx)
	if err != nil {
		utils.Error("获取 CPU 信息失败 / Failed to get CPU info: %v", err)
		return
	}

	if len(cpuInfo) > 0 {
		fmt.Printf("  型号 / Model:    %s\n", cpuInfo[0].ModelName)
		fmt.Printf("  核心数 / Cores:  %d 物理 / physical, %d 逻辑 / logical\n",
			cpuInfo[0].Cores, runtime.NumCPU())
		fmt.Printf("  频率 / Freq:     %.0f MHz\n", cpuInfo[0].Mhz)
	}

	// 获取 CPU 使用率（1秒采样）/ Get CPU usage (1s sample)
	percentages, err := cpu.PercentWithContext(ctx, time.Second, false)
	if err != nil {
		utils.Error("获取 CPU 使用率失败 / Failed to get CPU usage: %v", err)
		return
	}

	if len(percentages) > 0 {
		cpuPercent := percentages[0]
		status := utils.StatusColor(cpuPercent, thresholds.CPU.Warning, thresholds.CPU.Critical)
		fmt.Printf("  使用率 / Usage:  %s\n", status)
	}

	// 每核心使用率 / Per-core usage
	perCore, err := cpu.PercentWithContext(ctx, time.Second, true)
	if err == nil && len(perCore) > 0 && verbose {
		fmt.Println("  各核心使用率 / Per-core usage:")
		for i, p := range perCore {
			fmt.Printf("    Core %d: %s\n", i, utils.StatusColor(p, thresholds.CPU.Warning, thresholds.CPU.Critical))
		}
	}
}

// runCheckMemory 获取并显示内存使用信息。
// runCheckMemory gathers and displays memory usage.
func runCheckMemory() {
	utils.Bold("🧠 内存检查 / Memory Check")

	thresholds := config.GetThresholds()

	vmStat, err := mem.VirtualMemory()
	if err != nil {
		utils.Error("获取内存信息失败 / Failed to get memory info: %v", err)
		return
	}

	fmt.Printf("  总计 / Total:    %s\n", utils.FormatBytes(vmStat.Total))
	fmt.Printf("  已用 / Used:     %s\n", utils.FormatBytes(vmStat.Used))
	fmt.Printf("  可用 / Avail:    %s\n", utils.FormatBytes(vmStat.Available))
	status := utils.StatusColor(vmStat.UsedPercent, thresholds.Memory.Warning, thresholds.Memory.Critical)
	fmt.Printf("  使用率 / Usage:  %s\n", status)

	// 交换分区 / Swap
	swapStat, err := mem.SwapMemory()
	if err == nil && swapStat.Total > 0 {
		fmt.Printf("  交换总计 / Swap Total: %s\n", utils.FormatBytes(swapStat.Total))
		fmt.Printf("  交换已用 / Swap Used:  %s (%.1f%%)\n",
			utils.FormatBytes(swapStat.Used), swapStat.UsedPercent)
	}
}

// runCheckDisk 获取并显示各分区磁盘使用率。
// runCheckDisk gathers and displays disk usage per partition.
func runCheckDisk() {
	utils.Bold("💾 磁盘检查 / Disk Check")

	thresholds := config.GetThresholds()

	partitions, err := disk.Partitions(false)
	if err != nil {
		utils.Error("获取分区信息失败 / Failed to get partition info: %v", err)
		return
	}

	headers := []string{"挂载点/Mount", "文件系统/FS", "总计/Total", "已用/Used", "可用/Avail", "使用率/Usage", "状态/Status"}
	var rows [][]string

	for _, p := range partitions {
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}
		// 跳过大小为0的分区 / Skip zero-size partitions
		if usage.Total == 0 {
			continue
		}

		statusLabel := utils.StatusLabel(usage.UsedPercent, thresholds.Disk.Warning, thresholds.Disk.Critical)
		rows = append(rows, []string{
			p.Mountpoint,
			p.Fstype,
			utils.FormatBytes(usage.Total),
			utils.FormatBytes(usage.Used),
			utils.FormatBytes(usage.Free),
			fmt.Sprintf("%.1f%%", usage.UsedPercent),
			statusLabel,
		})
	}

	if len(rows) > 0 {
		utils.PrintTable(headers, rows)
	} else {
		utils.Warning("未找到磁盘分区 / No disk partitions found")
	}
}

// runCheckNetwork 获取并显示网络接口信息。
// runCheckNetwork gathers and displays network interface info.
func runCheckNetwork() {
	utils.Bold("🌐 网络接口检查 / Network Interface Check")

	interfaces, err := net.Interfaces()
	if err != nil {
		utils.Error("获取网络接口失败 / Failed to get network interfaces: %v", err)
		return
	}

	headers := []string{"名称/Name", "MAC 地址/MAC", "IP 地址/Addresses", "状态/Status"}
	var rows [][]string

	for _, iface := range interfaces {
		// 跳过没有地址的接口 / Skip interfaces without addresses
		if len(iface.Addrs) == 0 {
			continue
		}

		// 收集地址 / Collect addresses
		addrs := ""
		for i, addr := range iface.Addrs {
			if i > 0 {
				addrs += ", "
			}
			addrs += addr.Addr
		}

		// 判断状态 / Determine status
		status := color.RedString("DOWN")
		for _, flag := range iface.Flags {
			if flag == "up" {
				status = color.GreenString("UP")
				break
			}
		}

		rows = append(rows, []string{
			iface.Name,
			iface.HardwareAddr,
			addrs,
			status,
		})
	}

	if len(rows) > 0 {
		utils.PrintTable(headers, rows)
	} else {
		utils.Warning("未找到网络接口 / No network interfaces found")
	}

	// 网络 IO 统计 / Network IO statistics
	if verbose {
		ioCounters, err := net.IOCounters(false)
		if err == nil && len(ioCounters) > 0 {
			fmt.Println()
			utils.Bold("  网络 IO 统计 / Network IO Statistics:")
			fmt.Printf("    发送 / Sent:     %s\n", utils.FormatBytes(ioCounters[0].BytesSent))
			fmt.Printf("    接收 / Recv:     %s\n", utils.FormatBytes(ioCounters[0].BytesRecv))
			fmt.Printf("    发送包 / PktSent: %d\n", ioCounters[0].PacketsSent)
			fmt.Printf("    接收包 / PktRecv: %d\n", ioCounters[0].PacketsRecv)
		}
	}
}

// runCheckUptime 获取并显示系统运行时间。
// runCheckUptime gathers and displays system uptime.
func runCheckUptime() {
	utils.Bold("⏱️  系统运行时间 / System Uptime")

	hostInfo, err := host.Info()
	if err != nil {
		utils.Error("获取主机信息失败 / Failed to get host info: %v", err)
		return
	}

	uptime := time.Duration(hostInfo.Uptime) * time.Second
	days := int(uptime.Hours()) / 24
	hours := int(uptime.Hours()) % 24
	minutes := int(uptime.Minutes()) % 60

	fmt.Printf("  主机名 / Hostname:  %s\n", hostInfo.Hostname)
	fmt.Printf("  操作系统 / OS:      %s %s\n", hostInfo.Platform, hostInfo.PlatformVersion)
	fmt.Printf("  内核版本 / Kernel:  %s\n", hostInfo.KernelVersion)
	fmt.Printf("  架构 / Arch:        %s\n", hostInfo.KernelArch)
	fmt.Printf("  运行时间 / Uptime:  %d 天 / days, %d 小时 / hours, %d 分钟 / minutes\n",
		days, hours, minutes)

	// 启动时间 / Boot time
	bootTime := time.Unix(int64(hostInfo.BootTime), 0)
	fmt.Printf("  启动时间 / Boot:    %s\n", bootTime.Format("2006-01-02 15:04:05"))
}
