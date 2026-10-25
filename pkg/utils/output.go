// Package utils 提供通用输出格式化和辅助工具。
// Package utils provides common output formatting and helper utilities.
package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/fatih/color"
	"github.com/olekukonenko/tablewriter"
	"github.com/schollz/progressbar/v3"
)

// ============================================================
// 颜色输出辅助函数 / Color output helpers
// ============================================================

// Success 输出成功信息（绿色）/ Print success message (green).
func Success(format string, a ...interface{}) {
	color.Green("✓ "+format, a...)
}

// Warning 输出警告信息（黄色）/ Print warning message (yellow).
func Warning(format string, a ...interface{}) {
	color.Yellow("⚠ "+format, a...)
}

// Error 输出错误信息（红色）/ Print error message (red).
func Error(format string, a ...interface{}) {
	color.Red("✗ "+format, a...)
}

// Info 输出普通信息（青色）/ Print info message (cyan).
func Info(format string, a ...interface{}) {
	color.Cyan("ℹ "+format, a...)
}

// Bold 输出加粗信息 / Print bold message.
func Bold(format string, a ...interface{}) {
	bold := color.New(color.Bold)
	bold.Printf(format+"\n", a...)
}

// StatusColor 根据使用率百分比返回带颜色的状态文本。
// StatusColor returns color-coded status text based on usage percentage.
//
//	使用率 > critical → 红色(严重) / Red (critical)
//	使用率 > warning  → 黄色(警告) / Yellow (warning)
//	其他              → 绿色(正常) / Green (healthy)
func StatusColor(percent float64, warning, critical float64) string {
	switch {
	case percent >= critical:
		return color.RedString("%.1f%% [严重/CRITICAL]", percent)
	case percent >= warning:
		return color.YellowString("%.1f%% [警告/WARNING]", percent)
	default:
		return color.GreenString("%.1f%% [正常/OK]", percent)
	}
}

// StatusLabel 返回不带百分比的颜色状态标签。
// StatusLabel returns a color-coded status label without percentage.
func StatusLabel(percent float64, warning, critical float64) string {
	switch {
	case percent >= critical:
		return color.RedString("[严重/CRITICAL]")
	case percent >= warning:
		return color.YellowString("[警告/WARNING]")
	default:
		return color.GreenString("[正常/OK]")
	}
}

// ============================================================
// 表格输出 / Table output
// ============================================================

// PrintTable 以表格形式输出数据。
// PrintTable prints data in table format.
func PrintTable(headers []string, rows [][]string) {
	PrintTableTo(os.Stdout, headers, rows)
}

// PrintTableTo 将表格写入指定 Writer。
// PrintTableTo writes table to the specified Writer.
func PrintTableTo(w io.Writer, headers []string, rows [][]string) {
	table := tablewriter.NewWriter(w)
	table.SetHeader(headers)
	table.SetAutoWrapText(false)
	table.SetAutoFormatHeaders(true)
	table.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	table.SetAlignment(tablewriter.ALIGN_LEFT)
	table.SetCenterSeparator("")
	table.SetColumnSeparator("│")
	table.SetRowSeparator("─")
	table.SetHeaderLine(true)
	table.SetBorder(true)
	table.SetTablePadding("  ")
	table.SetNoWhiteSpace(false)
	table.AppendBulk(rows)
	table.Render()
}

// ============================================================
// JSON 输出 / JSON output
// ============================================================

// PrintJSON 将数据以格式化的 JSON 输出到标准输出。
// PrintJSON prints data as formatted JSON to stdout.
func PrintJSON(v interface{}) error {
	return PrintJSONTo(os.Stdout, v)
}

// PrintJSONTo 将数据以格式化的 JSON 写入指定 Writer。
// PrintJSONTo writes formatted JSON to the specified Writer.
func PrintJSONTo(w io.Writer, v interface{}) error {
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(v); err != nil {
		return fmt.Errorf("JSON 编码失败 / JSON encoding failed: %w", err)
	}
	return nil
}

// ============================================================
// 进度条 / Progress bar
// ============================================================

// NewProgressBar 创建一个新的进度条。
// NewProgressBar creates a new progress bar.
func NewProgressBar(total int64, description string) *progressbar.ProgressBar {
	return progressbar.NewOptions64(
		total,
		progressbar.OptionSetDescription(description),
		progressbar.OptionSetWriter(os.Stderr),
		progressbar.OptionShowBytes(true),
		progressbar.OptionSetWidth(40),
		progressbar.OptionThrottle(100),
		progressbar.OptionShowCount(),
		progressbar.OptionClearOnFinish(),
		progressbar.OptionSetPredictTime(true),
		progressbar.OptionSetTheme(progressbar.Theme{
			Saucer:        "█",
			SaucerHead:    "█",
			SaucerPadding: "░",
			BarStart:      "│",
			BarEnd:        "│",
		}),
	)
}

// NewSpinner 创建一个旋转动画进度条（用于未知总量的任务）。
// NewSpinner creates a spinner for tasks with unknown total.
func NewSpinner(description string) *progressbar.ProgressBar {
	return progressbar.NewOptions(-1,
		progressbar.OptionSetDescription(description),
		progressbar.OptionSetWriter(os.Stderr),
		progressbar.OptionSpinnerType(14),
		progressbar.OptionClearOnFinish(),
	)
}

// ============================================================
// 文件大小格式化 / File size formatting
// ============================================================

// FormatBytes 将字节数转换为人类可读的格式。
// FormatBytes converts bytes to human-readable format.
func FormatBytes(bytes uint64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
		TB = GB * 1024
	)

	switch {
	case bytes >= TB:
		return fmt.Sprintf("%.2f TB", float64(bytes)/float64(TB))
	case bytes >= GB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/float64(GB))
	case bytes >= MB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/float64(MB))
	case bytes >= KB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/float64(KB))
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}

// ParseSizeString 解析大小字符串（如 "100MB"）为字节数。
// ParseSizeString parses size string (e.g., "100MB") to bytes.
func ParseSizeString(s string) (uint64, error) {
	var value float64
	var unit string

	_, err := fmt.Sscanf(s, "%f%s", &value, &unit)
	if err != nil {
		// 尝试只解析数字（默认单位为字节）
		// Try to parse number only (default unit: bytes)
		_, err = fmt.Sscanf(s, "%f", &value)
		if err != nil {
			return 0, fmt.Errorf("无效的大小格式 / invalid size format: %s", s)
		}
		return uint64(value), nil
	}

	switch unit {
	case "B", "b":
		return uint64(value), nil
	case "KB", "kb", "K", "k":
		return uint64(value * 1024), nil
	case "MB", "mb", "M", "m":
		return uint64(value * 1024 * 1024), nil
	case "GB", "gb", "G", "g":
		return uint64(value * 1024 * 1024 * 1024), nil
	case "TB", "tb", "T", "t":
		return uint64(value * 1024 * 1024 * 1024 * 1024), nil
	default:
		return 0, fmt.Errorf("未知的大小单位 / unknown size unit: %s", unit)
	}
}
