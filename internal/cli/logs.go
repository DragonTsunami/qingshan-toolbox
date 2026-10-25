// Package cli 提供青衫工具箱的日志查看命令
// Package cli provides log viewer commands for qingshan-toolbox
package cli

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

// 日志级别颜色定义 / Log level color definitions
var (
	colorError = color.New(color.FgRed, color.Bold)
	colorWarn  = color.New(color.FgYellow)
	colorInfo  = color.New(color.FgGreen)
	colorDebug = color.New(color.FgHiBlack)
	colorMatch = color.New(color.FgCyan, color.Bold)
)

// newLogsCmd 创建日志管理命令组
// newLogsCmd creates the logs command group
func newLogsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "logs",
		Short: "日志查看工具 / Log viewer utilities",
		Long: `日志查看和分析工具集，支持实时追踪、关键词搜索和 Windows 事件日志查看。
Log viewing and analysis toolkit supporting real-time tailing, keyword search,
and Windows Event Log viewing.`,
	}

	cmd.AddCommand(newLogsTailCmd())
	cmd.AddCommand(newLogsSearchCmd())
	cmd.AddCommand(newLogsEventsCmd())

	return cmd
}

// === logs tail 命令 / logs tail command ===

// newLogsTailCmd 创建实时日志追踪命令（类似 tail -f）
// newLogsTailCmd creates the real-time log tailing command (like tail -f)
func newLogsTailCmd() *cobra.Command {
	var (
		lines  int
		filter string
	)

	cmd := &cobra.Command{
		Use:   "tail <filepath>",
		Short: "实时追踪日志文件 / Real-time log file tailing",
		Long: `实时追踪日志文件的新增内容，类似 Unix 的 tail -f 命令。
支持按关键词过滤和日志级别着色。
Real-time log file tailing, similar to Unix tail -f.
Supports keyword filtering and log level colorization.`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runLogsTail(args[0], lines, filter)
		},
	}

	cmd.Flags().IntVarP(&lines, "lines", "n", 20, "初始显示行数 / Number of initial lines to display")
	cmd.Flags().StringVarP(&filter, "filter", "f", "", "过滤模式（正则表达式）/ Filter pattern (regex)")

	return cmd
}

// runLogsTail 执行日志追踪逻辑
// runLogsTail implements the log tailing logic
func runLogsTail(filepath string, initialLines int, filter string) error {
	// 打开日志文件 / Open the log file
	file, err := os.Open(filepath)
	if err != nil {
		return fmt.Errorf("无法打开文件 / Cannot open file '%s': %w", filepath, err)
	}
	defer file.Close()

	// 编译过滤正则表达式 / Compile filter regex if provided
	var filterRegex *regexp.Regexp
	if filter != "" {
		filterRegex, err = regexp.Compile(filter)
		if err != nil {
			return fmt.Errorf("无效的过滤模式 / Invalid filter pattern '%s': %w", filter, err)
		}
	}

	// 读取文件末尾的初始行数 / Read initial lines from end of file
	initialContent, err := readLastNLines(file, initialLines)
	if err != nil {
		return fmt.Errorf("读取文件末尾失败 / Failed to read end of file: %w", err)
	}

	// 显示初始内容 / Display initial content
	headerColor := color.New(color.FgCyan)
	headerColor.Printf("=== 追踪日志文件 / Tailing log file: %s ===\n", filepath)
	headerColor.Printf("=== 显示最后 %d 行 / Showing last %d lines ===\n", initialLines, initialLines)
	if filter != "" {
		headerColor.Printf("=== 过滤模式 / Filter: %s ===\n", filter)
	}
	fmt.Println()

	for _, line := range initialContent {
		if filterRegex == nil || filterRegex.MatchString(line) {
			printColorizedLogLine(line, filterRegex)
		}
	}

	// 移动到文件末尾，开始轮询新内容
	// Seek to end of file and start polling for new content
	file.Seek(0, io.SeekEnd)

	fmt.Println()
	color.New(color.FgYellow).Println("--- 等待新日志 / Waiting for new log entries (Ctrl+C to stop) ---")
	fmt.Println()

	// 使用轮询方式监控文件变化（fsnotify 风格）
	// Poll for file changes (fsnotify-style polling)
	scanner := bufio.NewScanner(file)
	for {
		for scanner.Scan() {
			line := scanner.Text()
			if filterRegex == nil || filterRegex.MatchString(line) {
				printColorizedLogLine(line, filterRegex)
			}
		}

		if err := scanner.Err(); err != nil {
			return fmt.Errorf("读取日志错误 / Error reading log: %w", err)
		}

		// 轮询间隔：500毫秒检查一次文件变化
		// Polling interval: check for file changes every 500ms
		time.Sleep(500 * time.Millisecond)

		// 检查文件是否被截断或轮转
		// Check if file was truncated or rotated
		currentPos, _ := file.Seek(0, io.SeekCurrent)
		stat, err := file.Stat()
		if err != nil {
			return fmt.Errorf("获取文件状态失败 / Failed to stat file: %w", err)
		}

		if stat.Size() < currentPos {
			// 文件被截断，从头开始读取 / File was truncated, seek to beginning
			color.New(color.FgYellow).Println("--- 文件已轮转，从头开始 / File rotated, reading from start ---")
			file.Seek(0, io.SeekStart)
		}

		// 重新创建 scanner 以继续读取
		// Re-create scanner to continue reading
		scanner = bufio.NewScanner(file)
	}
}

// readLastNLines 读取文件最后N行
// readLastNLines reads the last N lines from a file
func readLastNLines(file *os.File, n int) ([]string, error) {
	// 先读取所有行到内存（对于大文件可优化为反向读取）
	// Read all lines into memory (could be optimized with reverse reading for large files)
	file.Seek(0, io.SeekStart)
	scanner := bufio.NewScanner(file)

	// 使用环形缓冲区只保留最后N行 / Use ring buffer to keep only last N lines
	lines := make([]string, 0, n)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
		if len(lines) > n {
			// 移除最早的一行 / Remove the oldest line
			lines = lines[1:]
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return lines, nil
}

// printColorizedLogLine 根据日志级别着色输出日志行
// printColorizedLogLine prints a log line with color based on log level
func printColorizedLogLine(line string, highlightRegex *regexp.Regexp) {
	upperLine := strings.ToUpper(line)

	// 根据日志级别选择颜色 / Select color based on log level
	var printer *color.Color
	switch {
	case strings.Contains(upperLine, "ERROR") || strings.Contains(upperLine, "FATAL") || strings.Contains(upperLine, "CRIT"):
		printer = colorError
	case strings.Contains(upperLine, "WARN"):
		printer = colorWarn
	case strings.Contains(upperLine, "INFO"):
		printer = colorInfo
	case strings.Contains(upperLine, "DEBUG") || strings.Contains(upperLine, "TRACE"):
		printer = colorDebug
	default:
		printer = color.New(color.Reset)
	}

	// 如果有高亮正则，标记匹配部分 / Highlight regex matches if provided
	if highlightRegex != nil {
		// 找到匹配位置并高亮 / Find match positions and highlight
		result := highlightRegex.ReplaceAllStringFunc(line, func(match string) string {
			return colorMatch.Sprint(match)
		})
		printer.Print(highlightRegex.ReplaceAllString(line, ""))
		// 使用带高亮的版本 / Use highlighted version
		_ = result
		fmt.Println(result)
	} else {
		printer.Println(line)
	}
}

// === logs search 命令 / logs search command ===

// newLogsSearchCmd 创建日志搜索命令
// newLogsSearchCmd creates the log search command
func newLogsSearchCmd() *cobra.Command {
	var (
		since   string
		context int
	)

	cmd := &cobra.Command{
		Use:   "search <filepath> <keyword>",
		Short: "搜索日志关键词 / Search logs for keyword",
		Long: `在日志文件中搜索包含指定关键词的行。
支持时间范围过滤和上下文行显示。
Search log files for lines containing the specified keyword.
Supports time range filtering and context line display.`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runLogsSearch(args[0], args[1], since, context)
		},
	}

	cmd.Flags().StringVar(&since, "since", "", "时间范围过滤 / Time range filter (e.g., '1h', '30m', '2024-01-01')")
	cmd.Flags().IntVarP(&context, "context", "C", 0, "匹配行上下文行数 / Lines of context around each match")

	return cmd
}

// runLogsSearch 执行日志搜索逻辑
// runLogsSearch implements the log search logic
func runLogsSearch(filepath, keyword, since string, contextLines int) error {
	file, err := os.Open(filepath)
	if err != nil {
		return fmt.Errorf("无法打开文件 / Cannot open file '%s': %w", filepath, err)
	}
	defer file.Close()

	// 解析时间范围（如果指定）/ Parse time range if specified
	var sinceTime time.Time
	if since != "" {
		sinceTime, err = parseSinceTime(since)
		if err != nil {
			return fmt.Errorf("无效的时间范围 / Invalid time range '%s': %w", since, err)
		}
		color.New(color.FgCyan).Printf("时间过滤 / Time filter: since %s\n", sinceTime.Format(time.RFC3339))
	}

	// 编译搜索关键词为正则表达式（不区分大小写）
	// Compile search keyword as case-insensitive regex
	searchRegex, err := regexp.Compile("(?i)" + regexp.QuoteMeta(keyword))
	if err != nil {
		return fmt.Errorf("无效的搜索关键词 / Invalid search keyword: %w", err)
	}

	scanner := bufio.NewScanner(file)
	// 增大缓冲区以处理超长行 / Increase buffer for very long lines
	scanner.Buffer(make([]byte, 0, 1024*1024), 1024*1024)

	// 读取所有行用于上下文显示 / Read all lines for context display
	var allLines []string
	for scanner.Scan() {
		allLines = append(allLines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("读取文件错误 / Error reading file: %w", err)
	}

	// 搜索匹配行 / Search for matching lines
	matchCount := 0
	printedLines := make(map[int]bool) // 避免重复打印上下文行 / Avoid printing context lines twice

	headerColor := color.New(color.FgCyan)
	headerColor.Printf("=== 搜索 / Searching: '%s' in %s ===\n\n", keyword, filepath)

	for i, line := range allLines {
		if !searchRegex.MatchString(line) {
			continue
		}

		// 如果设置了时间过滤，尝试从行中解析时间
		// If time filter is set, try to parse time from the line
		if !sinceTime.IsZero() {
			lineTime := extractTimeFromLine(line)
			if !lineTime.IsZero() && lineTime.Before(sinceTime) {
				continue
			}
		}

		matchCount++

		// 打印上下文分隔符 / Print context separator
		if matchCount > 1 && contextLines > 0 {
			color.New(color.FgHiBlack).Println("---")
		}

		// 打印前置上下文行 / Print before-context lines
		if contextLines > 0 {
			start := i - contextLines
			if start < 0 {
				start = 0
			}
			for j := start; j < i; j++ {
				if !printedLines[j] {
					color.New(color.FgHiBlack).Printf("%6d- %s\n", j+1, allLines[j])
					printedLines[j] = true
				}
			}
		}

		// 打印匹配行（高亮关键词）/ Print matching line with highlighted keyword
		if !printedLines[i] {
			lineNum := color.New(color.FgYellow).Sprintf("%6d:", i+1)
			highlighted := searchRegex.ReplaceAllStringFunc(line, func(match string) string {
				return colorMatch.Sprint(match)
			})
			fmt.Printf("%s %s\n", lineNum, highlighted)
			printedLines[i] = true
		}

		// 打印后置上下文行 / Print after-context lines
		if contextLines > 0 {
			end := i + contextLines
			if end >= len(allLines) {
				end = len(allLines) - 1
			}
			for j := i + 1; j <= end; j++ {
				if !printedLines[j] {
					color.New(color.FgHiBlack).Printf("%6d- %s\n", j+1, allLines[j])
					printedLines[j] = true
				}
			}
		}
	}

	// 打印搜索结果统计 / Print search result summary
	fmt.Println()
	if matchCount == 0 {
		color.New(color.FgYellow).Printf("未找到匹配 / No matches found for '%s'\n", keyword)
	} else {
		color.New(color.FgGreen).Printf("共找到 %d 个匹配 / Found %d matches\n", matchCount, matchCount)
	}

	return nil
}

// parseSinceTime 解析时间范围字符串
// parseSinceTime parses a time range string into a time.Time
func parseSinceTime(since string) (time.Time, error) {
	// 尝试解析相对时间（如 "1h", "30m", "2d"）
	// Try parsing relative time (e.g., "1h", "30m", "2d")
	if len(since) > 1 {
		unit := since[len(since)-1]
		valueStr := since[:len(since)-1]
		var duration time.Duration

		switch unit {
		case 'm':
			var minutes int
			if _, err := fmt.Sscanf(valueStr, "%d", &minutes); err == nil {
				duration = time.Duration(minutes) * time.Minute
				return time.Now().Add(-duration), nil
			}
		case 'h':
			var hours int
			if _, err := fmt.Sscanf(valueStr, "%d", &hours); err == nil {
				duration = time.Duration(hours) * time.Hour
				return time.Now().Add(-duration), nil
			}
		case 'd':
			var days int
			if _, err := fmt.Sscanf(valueStr, "%d", &days); err == nil {
				duration = time.Duration(days) * 24 * time.Hour
				return time.Now().Add(-duration), nil
			}
		}
	}

	// 尝试解析绝对时间格式 / Try parsing absolute time formats
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02",
		"2006/01/02",
		"01/02/2006",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, since); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("无法识别的时间格式 / Unrecognized time format: %s", since)
}

// extractTimeFromLine 尝试从日志行中提取时间戳
// extractTimeFromLine attempts to extract a timestamp from a log line
func extractTimeFromLine(line string) time.Time {
	// 常见日志时间戳格式 / Common log timestamp patterns
	patterns := []struct {
		regex  string
		layout string
	}{
		{`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, "2006-01-02T15:04:05"},
		{`\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}`, "2006-01-02 15:04:05"},
		{`\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}`, "02/Jan/2006:15:04:05"},
		{`\w{3} \d{2} \d{2}:\d{2}:\d{2}`, "Jan 02 15:04:05"},
	}

	for _, p := range patterns {
		re := regexp.MustCompile(p.regex)
		match := re.FindString(line)
		if match != "" {
			if t, err := time.Parse(p.layout, match); err == nil {
				// 对于没有年份的格式，使用当前年份
				// For formats without year, use current year
				if t.Year() == 0 {
					t = t.AddDate(time.Now().Year(), 0, 0)
				}
				return t
			}
		}
	}

	return time.Time{}
}

// === logs events 命令 / logs events command ===

// newLogsEventsCmd 创建 Windows 事件日志查看命令
// newLogsEventsCmd creates the Windows Event Log viewer command
func newLogsEventsCmd() *cobra.Command {
	var (
		source   string
		level    string
		count    int
		logName  string
	)

	cmd := &cobra.Command{
		Use:   "events",
		Short: "查看 Windows 事件日志 / View Windows Event Logs",
		Long: `查看 Windows 事件日志（应用程序/系统/安全）。
使用 wevtutil 命令读取事件日志，支持按来源和级别过滤。
View Windows Event Logs (Application/System/Security).
Uses wevtutil to read event logs with source and level filtering.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runLogsEvents(logName, source, level, count)
		},
	}

	cmd.Flags().StringVar(&logName, "log", "Application", "日志名称 / Log name (Application, System, Security)")
	cmd.Flags().StringVar(&source, "source", "", "事件来源过滤 / Event source filter")
	cmd.Flags().StringVarP(&level, "level", "l", "", "事件级别 / Event level (Error, Warning, Info)")
	cmd.Flags().IntVar(&count, "count", 50, "显示条目数 / Number of entries to display")

	return cmd
}

// runLogsEvents 执行 Windows 事件日志查看逻辑
// runLogsEvents implements Windows Event Log viewing via wevtutil
func runLogsEvents(logName, source, level string, count int) error {
	// 构建 wevtutil 查询 / Build wevtutil query
	// wevtutil qe <LogName> /c:<count> /rd:true /f:text
	query := buildEventQuery(logName, source, level)

	headerColor := color.New(color.FgCyan)
	headerColor.Printf("=== Windows 事件日志 / Windows Event Log: %s ===\n", logName)
	if source != "" {
		headerColor.Printf("来源过滤 / Source filter: %s\n", source)
	}
	if level != "" {
		headerColor.Printf("级别过滤 / Level filter: %s\n", level)
	}
	headerColor.Printf("显示条目 / Entries: %d\n\n", count)

	// 使用 wevtutil 查询事件日志
	// Query event logs using wevtutil
	args := []string{"qe", logName, fmt.Sprintf("/c:%d", count), "/rd:true", "/f:text"}
	if query != "" {
		args = append(args, fmt.Sprintf("/q:%s", query))
	}

	cmd := exec.Command("wevtutil", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// 尝试用 PowerShell 作为备用方案
		// Fallback to PowerShell if wevtutil fails
		return runLogsEventsPowerShell(logName, source, level, count)
	}

	// 解析并着色输出 / Parse and colorize output
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		printColorizedEventLine(line)
	}

	return nil
}

// runLogsEventsPowerShell 使用 PowerShell 查看事件日志（备用方案）
// runLogsEventsPowerShell uses PowerShell as fallback for viewing event logs
func runLogsEventsPowerShell(logName, source, level string, count int) error {
	// 构建 PowerShell 命令 / Build PowerShell command
	psCmd := fmt.Sprintf("Get-EventLog -LogName %s -Newest %d", logName, count)

	if source != "" {
		psCmd += fmt.Sprintf(" -Source '%s'", source)
	}

	// 映射级别参数到 PowerShell 的 EntryType
	// Map level parameter to PowerShell EntryType
	if level != "" {
		entryType := mapLevelToEntryType(level)
		if entryType != "" {
			psCmd += fmt.Sprintf(" -EntryType %s", entryType)
		}
	}

	psCmd += " | Format-Table -AutoSize -Wrap TimeGenerated, EntryType, Source, Message"

	cmd := exec.Command("powershell", "-NoProfile", "-Command", psCmd)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("查询事件日志失败 / Failed to query event logs: %w\n输出 / Output: %s", err, string(output))
	}

	// 着色输出 / Colorize output
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimRight(line, "\r\n ")
		if line == "" {
			continue
		}
		printColorizedEventLine(line)
	}

	return nil
}

// buildEventQuery 构建 wevtutil XPath 查询表达式
// buildEventQuery builds a wevtutil XPath query expression
func buildEventQuery(logName, source, level string) string {
	var conditions []string

	// 映射事件级别到数字 / Map event level to number
	if level != "" {
		levelNum := mapLevelToNumber(level)
		if levelNum > 0 {
			conditions = append(conditions, fmt.Sprintf("System[Level=%d]", levelNum))
		}
	}

	// 按来源过滤 / Filter by source
	if source != "" {
		conditions = append(conditions, fmt.Sprintf("System[Provider[@Name='%s']]", source))
	}

	if len(conditions) == 0 {
		return ""
	}

	return "*[" + strings.Join(conditions, " and ") + "]"
}

// mapLevelToNumber 将事件级别名称映射为数字
// mapLevelToNumber maps event level name to its numeric value
func mapLevelToNumber(level string) int {
	switch strings.ToLower(level) {
	case "critical":
		return 1
	case "error":
		return 2
	case "warning", "warn":
		return 3
	case "info", "information":
		return 4
	default:
		return 0
	}
}

// mapLevelToEntryType 映射级别到 PowerShell EntryType
// mapLevelToEntryType maps level to PowerShell EntryType
func mapLevelToEntryType(level string) string {
	switch strings.ToLower(level) {
	case "error":
		return "Error"
	case "warning", "warn":
		return "Warning"
	case "info", "information":
		return "Information"
	default:
		return ""
	}
}

// printColorizedEventLine 着色输出事件日志行
// printColorizedEventLine prints an event log line with color coding
func printColorizedEventLine(line string) {
	upperLine := strings.ToUpper(line)

	switch {
	case strings.Contains(upperLine, "ERROR") || strings.Contains(upperLine, "CRITICAL"):
		colorError.Println(line)
	case strings.Contains(upperLine, "WARNING"):
		colorWarn.Println(line)
	case strings.Contains(upperLine, "INFORMATION") || strings.Contains(upperLine, "INFO"):
		colorInfo.Println(line)
	default:
		fmt.Println(line)
	}
}
