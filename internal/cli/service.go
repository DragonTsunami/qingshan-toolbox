package cli

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/fatih/color"
	"github.com/qingshan/toolbox/pkg/utils"
	"github.com/spf13/cobra"
)

// serviceCmd 是 Windows 服务管理的父命令。
// serviceCmd is the parent command for Windows service management.
var serviceCmd = &cobra.Command{
	Use:   "service",
	Short: "Windows 服务管理 / Windows service management",
	Long:  "管理 Windows 服务：查看、启动、停止、重启。\nManage Windows services: list, start, stop, restart.",
	Aliases: []string{"svc"},
	Run: func(cmd *cobra.Command, args []string) {
		_ = cmd.Help()
	},
}

// svcListCmd 列出所有服务。
// svcListCmd lists all services.
var svcListCmd = &cobra.Command{
	Use:   "list",
	Short: "列出所有服务 / List all services",
	Long:  "列出系统中所有已注册的 Windows 服务及其运行状态。\nList all registered Windows services and their status.",
	Aliases: []string{"ls"},
	RunE: func(cmd *cobra.Command, args []string) error {
		return runServiceList()
	},
}

// svcStatusCmd 查看服务状态。
// svcStatusCmd checks a specific service status.
var svcStatusCmd = &cobra.Command{
	Use:   "status <服务名/service-name>",
	Short: "查看服务状态 / Check service status",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runServiceStatus(args[0])
	},
}

// svcStartCmd 启动服务。
// svcStartCmd starts a service.
var svcStartCmd = &cobra.Command{
	Use:   "start <服务名/service-name>",
	Short: "启动服务 / Start a service",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runServiceAction(args[0], "start")
	},
}

// svcStopCmd 停止服务。
// svcStopCmd stops a service.
var svcStopCmd = &cobra.Command{
	Use:   "stop <服务名/service-name>",
	Short: "停止服务 / Stop a service",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runServiceAction(args[0], "stop")
	},
}

// svcRestartCmd 重启服务。
// svcRestartCmd restarts a service.
var svcRestartCmd = &cobra.Command{
	Use:   "restart <服务名/service-name>",
	Short: "重启服务 / Restart a service",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runServiceRestart(args[0])
	},
}

func init() {
	serviceCmd.AddCommand(svcListCmd)
	serviceCmd.AddCommand(svcStatusCmd)
	serviceCmd.AddCommand(svcStartCmd)
	serviceCmd.AddCommand(svcStopCmd)
	serviceCmd.AddCommand(svcRestartCmd)
}

// ============================================================
// 服务管理实现 / Service management implementations
// ============================================================

// serviceInfo 存储解析后的服务信息。
// serviceInfo stores parsed service information.
type serviceInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	State       string `json:"state"`
	StartType   string `json:"start_type"`
}

// runServiceList 列出所有 Windows 服务。
// runServiceList lists all Windows services.
func runServiceList() error {
	utils.Bold("📋 Windows 服务列表 / Windows Service List")
	fmt.Println()

	// 使用 PowerShell 获取服务列表（比 sc 命令更容易解析）
	// Use PowerShell to get service list (easier to parse than sc)
	out, err := exec.Command("powershell", "-NoProfile", "-Command",
		`Get-Service | Select-Object Name, DisplayName, Status, StartType | `+
			`ForEach-Object { "$($_.Name)|$($_.DisplayName)|$($_.Status)|$($_.StartType)" }`).Output()
	if err != nil {
		return fmt.Errorf("获取服务列表失败 / failed to list services: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) == 0 {
		utils.Warning("未找到服务 / No services found")
		return nil
	}

	headers := []string{"名称/Name", "显示名称/Display Name", "状态/Status", "启动类型/Start Type"}
	var rows [][]string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 4)
		if len(parts) < 4 {
			continue
		}

		name := strings.TrimSpace(parts[0])
		displayName := strings.TrimSpace(parts[1])
		status := strings.TrimSpace(parts[2])
		startType := strings.TrimSpace(parts[3])

		// 截断长显示名称 / Truncate long display names
		if len(displayName) > 45 {
			displayName = displayName[:42] + "..."
		}

		// 颜色化状态 / Colorize status
		coloredStatus := colorizeServiceStatus(status)

		rows = append(rows, []string{name, displayName, coloredStatus, startType})
	}

	utils.PrintTable(headers, rows)
	fmt.Printf("\n  共 %d 个服务 / Total %d services\n", len(rows), len(rows))
	return nil
}

// runServiceStatus 查看单个服务的详细状态。
// runServiceStatus checks the detailed status of a single service.
func runServiceStatus(name string) error {
	utils.Bold("🔍 服务状态 / Service Status: %s", name)
	fmt.Println()

	// 使用 sc qc 和 sc query 获取详细信息
	// Use sc qc and sc query for detailed info
	queryOut, err := exec.Command("sc", "query", name).Output()
	if err != nil {
		return fmt.Errorf("查询服务失败 / failed to query service '%s': %w\n请检查服务名称是否正确 / Please check the service name", name, err)
	}

	// 解析 sc query 输出 / Parse sc query output
	queryStr := string(queryOut)
	fmt.Println(formatSCOutput(queryStr))

	// 获取更多配置信息 / Get additional config info
	qcOut, err := exec.Command("sc", "qc", name).Output()
	if err == nil {
		qcStr := string(qcOut)
		if verbose {
			fmt.Println()
			utils.Bold("  服务配置 / Service Configuration:")
			fmt.Println(formatSCOutput(qcStr))
		}
	}

	return nil
}

// runServiceAction 执行服务操作（启动/停止）。
// runServiceAction performs a service action (start/stop).
func runServiceAction(name, action string) error {
	actionCN := map[string]string{
		"start": "启动",
		"stop":  "停止",
	}

	// 首字母大写 / Capitalize first letter
	actionTitle := strings.ToUpper(action[:1]) + action[1:]
	utils.Info("%s 服务 / %s service: %s ...", actionCN[action], actionTitle, name)

	// 使用 net 命令（比 sc 更可靠）/ Use net command (more reliable than sc)
	cmd := exec.Command("net", action, name)
	output, err := cmd.CombinedOutput()
	if err != nil {
		outStr := strings.TrimSpace(string(output))
		if outStr != "" {
			utils.Error("%s", outStr)
		}
		return fmt.Errorf("服务%s失败 / service %s failed: %w", actionCN[action], action, err)
	}

	utils.Success("服务 '%s' 已%s / Service '%s' %sed successfully",
		name, actionCN[action], name, action)

	// 显示当前状态 / Show current status
	fmt.Println()
	return runServiceStatus(name)
}

// runServiceRestart 重启服务（先停止再启动）。
// runServiceRestart restarts a service (stop then start).
func runServiceRestart(name string) error {
	utils.Info("重启服务 / Restarting service: %s ...", name)

	// 先停止 / Stop first
	stopCmd := exec.Command("net", "stop", name)
	stopOut, err := stopCmd.CombinedOutput()
	if err != nil {
		// 如果服务已经停止，忽略错误 / Ignore error if service is already stopped
		outStr := strings.TrimSpace(string(stopOut))
		if !strings.Contains(strings.ToLower(outStr), "not started") &&
			!strings.Contains(outStr, "没有启动") {
			utils.Warning("停止服务时出错 / Error stopping service: %s", outStr)
		}
	} else {
		utils.Success("服务已停止 / Service stopped")
	}

	// 再启动 / Then start
	startCmd := exec.Command("net", "start", name)
	startOut, err := startCmd.CombinedOutput()
	if err != nil {
		outStr := strings.TrimSpace(string(startOut))
		if outStr != "" {
			utils.Error("%s", outStr)
		}
		return fmt.Errorf("启动服务失败 / failed to start service: %w", err)
	}

	utils.Success("服务 '%s' 已重启 / Service '%s' restarted successfully", name, name)

	// 显示当前状态 / Show current status
	fmt.Println()
	return runServiceStatus(name)
}

// colorizeServiceStatus 为服务状态添加颜色。
// colorizeServiceStatus adds color to service status.
func colorizeServiceStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "running":
		return color.GreenString("● Running")
	case "stopped":
		return color.RedString("○ Stopped")
	case "paused":
		return color.YellowString("◐ Paused")
	case "startpending", "start_pending":
		return color.YellowString("◑ Starting...")
	case "stoppending", "stop_pending":
		return color.YellowString("◑ Stopping...")
	default:
		return status
	}
}

// formatSCOutput 格式化 sc 命令的输出，添加缩进。
// formatSCOutput formats sc command output with indentation.
func formatSCOutput(output string) string {
	lines := strings.Split(output, "\n")
	var result []string
	for _, line := range lines {
		line = strings.TrimRight(line, "\r\n")
		if strings.TrimSpace(line) != "" {
			result = append(result, "  "+line)
		}
	}
	return strings.Join(result, "\n")
}
