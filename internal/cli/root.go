// Package cli 提供命令行界面的实现。
// Package cli provides the command-line interface implementation.
package cli

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/qingshan/toolbox/internal/config"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// Version 版本号，由编译时 ldflags 注入。
// Version is injected by ldflags at build time.
var Version = "v0.1.0"

// 全局标志变量 / Global flag variables
var (
	cfgFile      string // 配置文件路径 / Config file path
	verbose      bool   // 详细输出 / Verbose output
	outputFormat string // 输出格式 / Output format
)

// rootCmd 是根命令 / rootCmd is the root command.
var rootCmd = &cobra.Command{
	Use:   "qstoolbox",
	Short: "青衫工具箱 - 一站式 IT 运维工具箱",
	Long: color.CyanString(`
  ╔══════════════════════════════════════════════════╗
  ║       青衫工具箱 / QingShan Toolbox              ║
  ║       一站式 IT 运维工具箱                        ║
  ║       让日常运维更简单                            ║
  ╚══════════════════════════════════════════════════╝
`) + `
  一站式 IT 运维工具箱，让日常运维更简单。
  An all-in-one IT operations toolkit that simplifies daily ops.

  功能 / Features:
    • 系统健康检查 / System health checks
    • Windows 服务管理 / Windows service management  
    • 网络诊断 / Network diagnostics
    • 磁盘管理 / Disk management
    • 远程管理 / Remote management
    • 资产管理 / Asset management
    • 日志分析 / Log analysis
    • 备份管理 / Backup management`,
	Version: Version,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// 初始化配置 / Initialize configuration
		return config.Init(cfgFile)
	},
}

// Execute 执行根命令 / Execute executes the root command.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// 持久标志（全局可用）/ Persistent flags (available globally)
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "",
		"配置文件路径 / config file path (default: ~/.qstoolbox/config.yaml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false,
		"详细输出 / enable verbose output")
	rootCmd.PersistentFlags().StringVarP(&outputFormat, "output", "o", "text",
		"输出格式 / output format (text/json/table)")

	// 绑定标志到 Viper / Bind flags to Viper
	_ = viper.BindPFlag("general.verbose", rootCmd.PersistentFlags().Lookup("verbose"))
	_ = viper.BindPFlag("general.output_format", rootCmd.PersistentFlags().Lookup("output"))

	// 注册子命令 / Register sub-commands
	rootCmd.AddCommand(checkCmd)
	rootCmd.AddCommand(serviceCmd)
	rootCmd.AddCommand(netCmd)
	rootCmd.AddCommand(diskCmd)
	rootCmd.AddCommand(desktopCmd)
	rootCmd.AddCommand(pluginCmd)
	rootCmd.AddCommand(newAssetCmd())

	// 占位子命令（未来实现）/ Placeholder sub-commands (to be implemented)
	rootCmd.AddCommand(newPlaceholderCmd("logs", "日志分析 / Log analysis"))
	rootCmd.AddCommand(newPlaceholderCmd("remote", "远程管理 / Remote management"))
	rootCmd.AddCommand(newPlaceholderCmd("backup", "备份管理 / Backup management"))
}

// newPlaceholderCmd 创建一个占位命令，提示功能尚未实现。
// newPlaceholderCmd creates a placeholder command indicating the feature is not yet implemented.
func newPlaceholderCmd(name, description string) *cobra.Command {
	return &cobra.Command{
		Use:   name,
		Short: description,
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Fprintf(os.Stderr, "⏳ %s 功能正在开发中... / %s feature is under development...\n", name, name)
		},
	}
}
