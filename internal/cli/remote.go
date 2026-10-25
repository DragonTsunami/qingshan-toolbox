// Package cli 提供青衫工具箱的远程执行命令
// Package cli provides remote execution commands for qingshan-toolbox
package cli

import (
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
	"golang.org/x/crypto/ssh"
)

// remoteFlags 远程命令通用标志
// remoteFlags holds common flags for remote commands
type remoteFlags struct {
	hosts    string // 逗号分隔的主机列表 / Comma-separated host list
	group    string // 配置文件中的主机分组 / Host group from config
	user     string // SSH 用户名 / SSH username
	keyFile  string // SSH 私钥文件路径 / SSH private key file path
	password string // SSH 密码 / SSH password
	port     int    // SSH 端口 / SSH port
	timeout  int    // 连接超时（秒）/ Connection timeout in seconds
}

// remoteResult 远程执行结果
// remoteResult holds the result of a remote command execution
type remoteResult struct {
	host     string
	status   string
	output   string
	err      error
	duration time.Duration
}

// newRemoteCmd 创建远程管理命令组
// newRemoteCmd creates the remote management command group
func newRemoteCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "remote",
		Short: "远程主机管理 / Remote host management",
		Long: `远程主机管理工具集，支持在多台主机上并发执行命令、复制文件和运行脚本。
通过 SSH 协议连接远程主机，支持密钥和密码认证。
Remote host management toolkit for concurrent command execution,
file copying, and script running across multiple hosts via SSH.`,
	}

	cmd.AddCommand(newRemoteExecCmd())
	cmd.AddCommand(newRemoteCopyCmd())
	cmd.AddCommand(newRemoteScriptCmd())

	return cmd
}

// addRemoteFlags 为命令添加远程连接通用标志
// addRemoteFlags adds common remote connection flags to a command
func addRemoteFlags(cmd *cobra.Command, rf *remoteFlags) {
	cmd.Flags().StringVar(&rf.hosts, "hosts", "", "目标主机列表（逗号分隔）/ Target hosts (comma-separated, e.g., 'host1:22,host2:22')")
	cmd.Flags().StringVar(&rf.group, "group", "", "主机分组名称（从配置文件读取）/ Host group name (from config)")
	cmd.Flags().StringVarP(&rf.user, "user", "u", "", "SSH 用户名 / SSH username")
	cmd.Flags().StringVarP(&rf.keyFile, "key", "k", "", "SSH 私钥文件路径 / SSH private key file path")
	cmd.Flags().StringVarP(&rf.password, "password", "p", "", "SSH 密码 / SSH password (use key auth when possible)")
	cmd.Flags().IntVar(&rf.port, "port", 22, "默认 SSH 端口 / Default SSH port")
	cmd.Flags().IntVar(&rf.timeout, "timeout", 30, "连接超时秒数 / Connection timeout in seconds")
}

// resolveHosts 解析主机列表（从标志或配置文件中获取）
// resolveHosts resolves the host list from flags or config
func resolveHosts(rf *remoteFlags) ([]string, error) {
	var hosts []string

	if rf.hosts != "" {
		// 从命令行标志解析主机列表 / Parse hosts from command line flag
		for _, h := range strings.Split(rf.hosts, ",") {
			h = strings.TrimSpace(h)
			if h == "" {
				continue
			}
			// 如果没有端口号，添加默认端口 / Add default port if not specified
			if !strings.Contains(h, ":") {
				h = fmt.Sprintf("%s:%d", h, rf.port)
			}
			hosts = append(hosts, h)
		}
	}

	if rf.group != "" {
		// TODO: 从配置文件读取主机分组 / Read host group from config file
		// 当配置模块实现后，这里将从 Viper 读取
		// When config module is implemented, this will read from Viper
		color.New(color.FgYellow).Printf("提示: 主机分组功能需要配置文件支持 / Note: Host groups require config file support\n")
	}

	if len(hosts) == 0 {
		return nil, fmt.Errorf("未指定目标主机，请使用 --hosts 或 --group / No target hosts specified, use --hosts or --group")
	}

	return hosts, nil
}

// createSSHClient 创建 SSH 客户端连接
// createSSHClient establishes an SSH client connection to a host
func createSSHClient(host string, rf *remoteFlags) (*ssh.Client, error) {
	// 构建 SSH 认证方法 / Build SSH authentication methods
	var authMethods []ssh.AuthMethod

	// 密钥认证 / Key-based authentication
	if rf.keyFile != "" {
		key, err := os.ReadFile(rf.keyFile)
		if err != nil {
			return nil, fmt.Errorf("读取密钥文件失败 / Failed to read key file '%s': %w", rf.keyFile, err)
		}

		signer, err := ssh.ParsePrivateKey(key)
		if err != nil {
			return nil, fmt.Errorf("解析密钥失败 / Failed to parse private key: %w", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	// 密码认证 / Password authentication
	if rf.password != "" {
		authMethods = append(authMethods, ssh.Password(rf.password))
	}

	// 如果没有指定任何认证方式，尝试默认密钥
	// If no auth method specified, try default key locations
	if len(authMethods) == 0 {
		defaultKeyPaths := []string{
			filepath.Join(os.Getenv("USERPROFILE"), ".ssh", "id_rsa"),
			filepath.Join(os.Getenv("USERPROFILE"), ".ssh", "id_ed25519"),
			filepath.Join(os.Getenv("HOME"), ".ssh", "id_rsa"),
			filepath.Join(os.Getenv("HOME"), ".ssh", "id_ed25519"),
		}

		for _, keyPath := range defaultKeyPaths {
			if key, err := os.ReadFile(keyPath); err == nil {
				if signer, err := ssh.ParsePrivateKey(key); err == nil {
					authMethods = append(authMethods, ssh.PublicKeys(signer))
					break
				}
			}
		}
	}

	if len(authMethods) == 0 {
		return nil, fmt.Errorf("未配置认证方式，请使用 --key 或 --password / No auth method configured, use --key or --password")
	}

	// 确定用户名 / Determine username
	user := rf.user
	if user == "" {
		user = os.Getenv("USERNAME")
		if user == "" {
			user = os.Getenv("USER")
		}
		if user == "" {
			return nil, fmt.Errorf("未指定用户名，请使用 --user / No username specified, use --user")
		}
	}

	// SSH 客户端配置 / SSH client configuration
	config := &ssh.ClientConfig{
		User:    user,
		Auth:    authMethods,
		Timeout: time.Duration(rf.timeout) * time.Second,
		// 注意：生产环境应验证主机密钥
		// NOTE: In production, host key should be verified
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	// 建立 SSH 连接 / Establish SSH connection
	client, err := ssh.Dial("tcp", host, config)
	if err != nil {
		return nil, fmt.Errorf("SSH 连接失败 / SSH connection failed to %s: %w", host, err)
	}

	return client, nil
}

// === remote exec 命令 / remote exec command ===

// newRemoteExecCmd 创建远程执行命令
// newRemoteExecCmd creates the remote command execution command
func newRemoteExecCmd() *cobra.Command {
	var rf remoteFlags

	cmd := &cobra.Command{
		Use:   "exec <command>",
		Short: "在远程主机上执行命令 / Execute command on remote hosts",
		Long: `在一个或多个远程主机上并发执行命令，通过 SSH 协议。
结果以表格形式显示，包含主机名、状态和输出。
Execute a command concurrently on one or more remote hosts via SSH.
Results are displayed in a table format with Host, Status, and Output.`,
		Args: cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			command := strings.Join(args, " ")
			return runRemoteExec(command, &rf)
		},
	}

	addRemoteFlags(cmd, &rf)
	return cmd
}

// runRemoteExec 执行远程命令逻辑
// runRemoteExec implements remote command execution
func runRemoteExec(command string, rf *remoteFlags) error {
	hosts, err := resolveHosts(rf)
	if err != nil {
		return err
	}

	headerColor := color.New(color.FgCyan)
	headerColor.Printf("=== 远程执行 / Remote Execution ===\n")
	headerColor.Printf("命令 / Command: %s\n", command)
	headerColor.Printf("目标主机 / Target hosts: %s\n", strings.Join(hosts, ", "))
	fmt.Println()

	// 使用 goroutine 并发执行 / Execute concurrently using goroutines
	results := executeOnHosts(hosts, rf, func(client *ssh.Client, host string) remoteResult {
		start := time.Now()

		session, err := client.NewSession()
		if err != nil {
			return remoteResult{
				host:     host,
				status:   "ERROR",
				err:      fmt.Errorf("创建会话失败 / Failed to create session: %w", err),
				duration: time.Since(start),
			}
		}
		defer session.Close()

		// 执行命令并捕获输出 / Execute command and capture output
		output, err := session.CombinedOutput(command)
		duration := time.Since(start)

		if err != nil {
			return remoteResult{
				host:     host,
				status:   "FAILED",
				output:   strings.TrimSpace(string(output)),
				err:      err,
				duration: duration,
			}
		}

		return remoteResult{
			host:     host,
			status:   "SUCCESS",
			output:   strings.TrimSpace(string(output)),
			duration: duration,
		}
	})

	// 显示结果表格 / Display results table
	printRemoteResults(results)
	return nil
}

// === remote copy 命令 / remote copy command ===

// newRemoteCopyCmd 创建远程文件复制命令
// newRemoteCopyCmd creates the remote file copy (SCP) command
func newRemoteCopyCmd() *cobra.Command {
	var rf remoteFlags

	cmd := &cobra.Command{
		Use:   "copy <src> <dest>",
		Short: "复制文件到远程主机 / Copy file to remote hosts via SCP",
		Long: `通过 SSH/SCP 将本地文件复制到一个或多个远程主机。
支持并发传输到多台主机。
Copy a local file to one or more remote hosts via SSH/SCP.
Supports concurrent transfer to multiple hosts.`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRemoteCopy(args[0], args[1], &rf)
		},
	}

	addRemoteFlags(cmd, &rf)
	return cmd
}

// runRemoteCopy 执行远程文件复制逻辑
// runRemoteCopy implements remote file copy via SCP
func runRemoteCopy(src, dest string, rf *remoteFlags) error {
	// 验证源文件存在 / Verify source file exists
	srcInfo, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("源文件不存在 / Source file not found '%s': %w", src, err)
	}
	if srcInfo.IsDir() {
		return fmt.Errorf("暂不支持目录复制，请先打包 / Directory copy not supported, please archive first")
	}

	hosts, err := resolveHosts(rf)
	if err != nil {
		return err
	}

	// 读取源文件内容 / Read source file content
	srcData, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("读取源文件失败 / Failed to read source file: %w", err)
	}

	headerColor := color.New(color.FgCyan)
	headerColor.Printf("=== 远程复制 / Remote Copy ===\n")
	headerColor.Printf("源文件 / Source: %s (%d bytes)\n", src, srcInfo.Size())
	headerColor.Printf("目标路径 / Destination: %s\n", dest)
	headerColor.Printf("目标主机 / Target hosts: %s\n", strings.Join(hosts, ", "))
	fmt.Println()

	// 使用 goroutine 并发复制 / Copy concurrently using goroutines
	results := executeOnHosts(hosts, rf, func(client *ssh.Client, host string) remoteResult {
		start := time.Now()

		session, err := client.NewSession()
		if err != nil {
			return remoteResult{
				host:     host,
				status:   "ERROR",
				err:      fmt.Errorf("创建会话失败 / Failed to create session: %w", err),
				duration: time.Since(start),
			}
		}
		defer session.Close()

		// 通过 SSH 会话使用 SCP 协议传输文件
		// Transfer file using SCP protocol over SSH session
		go func() {
			w, _ := session.StdinPipe()
			defer w.Close()

			fileName := filepath.Base(src)
			// SCP 协议：先发送文件元信息，再发送内容
			// SCP protocol: send file metadata first, then content
			fmt.Fprintf(w, "C0644 %d %s\n", len(srcData), fileName)
			w.Write(srcData)
			fmt.Fprint(w, "\x00")
		}()

		// 执行远程 scp 命令 / Execute remote scp command
		destPath := dest
		if err := session.Run("scp -t " + destPath); err != nil {
			return remoteResult{
				host:     host,
				status:   "FAILED",
				err:      fmt.Errorf("SCP 传输失败 / SCP transfer failed: %w", err),
				duration: time.Since(start),
			}
		}

		return remoteResult{
			host:     host,
			status:   "SUCCESS",
			output:   fmt.Sprintf("已复制 %d 字节 / Copied %d bytes", len(srcData), len(srcData)),
			duration: time.Since(start),
		}
	})

	printRemoteResults(results)
	return nil
}

// === remote script 命令 / remote script command ===

// newRemoteScriptCmd 创建远程脚本执行命令
// newRemoteScriptCmd creates the remote script execution command
func newRemoteScriptCmd() *cobra.Command {
	var rf remoteFlags

	cmd := &cobra.Command{
		Use:   "script <scriptfile>",
		Short: "在远程主机上执行脚本 / Execute script on remote hosts",
		Long: `将本地脚本文件传输到远程主机并执行。
脚本内容通过 SSH 标准输入传递，不需要在远程创建临时文件。
Transfer and execute a local script file on remote hosts.
Script content is piped via SSH stdin, no temp file needed on remote.`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRemoteScript(args[0], &rf)
		},
	}

	addRemoteFlags(cmd, &rf)
	return cmd
}

// runRemoteScript 执行远程脚本逻辑
// runRemoteScript implements remote script execution
func runRemoteScript(scriptFile string, rf *remoteFlags) error {
	// 读取脚本文件 / Read script file
	scriptData, err := os.ReadFile(scriptFile)
	if err != nil {
		return fmt.Errorf("读取脚本文件失败 / Failed to read script file '%s': %w", scriptFile, err)
	}

	hosts, err := resolveHosts(rf)
	if err != nil {
		return err
	}

	// 检测脚本类型（根据扩展名或首行）
	// Detect script type from extension or shebang
	shell := detectShell(scriptFile, string(scriptData))

	headerColor := color.New(color.FgCyan)
	headerColor.Printf("=== 远程脚本执行 / Remote Script Execution ===\n")
	headerColor.Printf("脚本文件 / Script: %s\n", scriptFile)
	headerColor.Printf("脚本解释器 / Shell: %s\n", shell)
	headerColor.Printf("目标主机 / Target hosts: %s\n", strings.Join(hosts, ", "))
	fmt.Println()

	// 并发执行脚本 / Execute script concurrently
	results := executeOnHosts(hosts, rf, func(client *ssh.Client, host string) remoteResult {
		start := time.Now()

		session, err := client.NewSession()
		if err != nil {
			return remoteResult{
				host:     host,
				status:   "ERROR",
				err:      fmt.Errorf("创建会话失败 / Failed to create session: %w", err),
				duration: time.Since(start),
			}
		}
		defer session.Close()

		// 通过标准输入传递脚本内容 / Pipe script content via stdin
		stdinPipe, err := session.StdinPipe()
		if err != nil {
			return remoteResult{
				host:     host,
				status:   "ERROR",
				err:      fmt.Errorf("创建标准输入管道失败 / Failed to create stdin pipe: %w", err),
				duration: time.Since(start),
			}
		}

		go func() {
			defer stdinPipe.Close()
			io.WriteString(stdinPipe, string(scriptData))
		}()

		// 执行脚本 / Execute the script
		output, err := session.CombinedOutput(shell)
		duration := time.Since(start)

		if err != nil {
			return remoteResult{
				host:     host,
				status:   "FAILED",
				output:   strings.TrimSpace(string(output)),
				err:      err,
				duration: duration,
			}
		}

		return remoteResult{
			host:     host,
			status:   "SUCCESS",
			output:   strings.TrimSpace(string(output)),
			duration: duration,
		}
	})

	printRemoteResults(results)
	return nil
}

// detectShell 根据脚本文件名和内容检测解释器
// detectShell detects the shell interpreter from filename and content
func detectShell(filename, content string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".sh":
		return "/bin/bash"
	case ".py":
		return "python3"
	case ".ps1":
		return "powershell -File -"
	case ".pl":
		return "perl"
	case ".rb":
		return "ruby"
	}

	// 检查 shebang 行 / Check shebang line
	if strings.HasPrefix(content, "#!") {
		firstLine := strings.SplitN(content, "\n", 2)[0]
		return strings.TrimPrefix(firstLine, "#!")
	}

	// 默认使用 bash / Default to bash
	return "/bin/bash"
}

// executeOnHosts 在多个主机上并发执行操作
// executeOnHosts executes an operation concurrently on multiple hosts
func executeOnHosts(hosts []string, rf *remoteFlags, operation func(*ssh.Client, string) remoteResult) []remoteResult {
	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		results []remoteResult
	)

	for _, host := range hosts {
		wg.Add(1)
		go func(h string) {
			defer wg.Done()

			// 显示连接进度 / Show connection progress
			color.New(color.FgHiBlack).Printf("  连接 / Connecting to %s...\n", h)

			// 创建 SSH 连接 / Create SSH connection
			client, err := createSSHClient(h, rf)
			if err != nil {
				result := remoteResult{
					host:   h,
					status: "CONN_ERROR",
					err:    err,
				}
				mu.Lock()
				results = append(results, result)
				mu.Unlock()
				return
			}
			defer client.Close()

			// 执行操作 / Execute the operation
			result := operation(client, h)

			mu.Lock()
			results = append(results, result)
			mu.Unlock()
		}(host)
	}

	// 等待所有 goroutine 完成 / Wait for all goroutines to complete
	wg.Wait()

	return results
}

// printRemoteResults 以表格形式打印远程执行结果
// printRemoteResults prints remote execution results in a table format
func printRemoteResults(results []remoteResult) {
	fmt.Println()
	fmt.Println(strings.Repeat("=", 80))

	// 表头 / Table header
	headerColor := color.New(color.FgWhite, color.Bold)
	headerColor.Printf("%-25s %-12s %-10s %s\n", "HOST", "STATUS", "DURATION", "OUTPUT")
	fmt.Println(strings.Repeat("-", 80))

	successCount := 0
	failCount := 0

	for _, r := range results {
		// 根据状态选择颜色 / Select color based on status
		var statusColor *color.Color
		switch r.status {
		case "SUCCESS":
			statusColor = color.New(color.FgGreen)
			successCount++
		case "FAILED":
			statusColor = color.New(color.FgRed)
			failCount++
		case "CONN_ERROR":
			statusColor = color.New(color.FgRed, color.Bold)
			failCount++
		default:
			statusColor = color.New(color.FgYellow)
			failCount++
		}

		// 格式化耗时 / Format duration
		durationStr := "-"
		if r.duration > 0 {
			durationStr = r.duration.Round(time.Millisecond).String()
		}

		// 截断过长的主机名 / Truncate long hostnames
		host := r.host
		if len(host) > 24 {
			host = host[:21] + "..."
		}

		// 输出内容（错误优先）/ Output content (errors first)
		output := r.output
		if r.err != nil {
			output = r.err.Error()
		}

		// 截取输出第一行用于表格显示 / Take first line for table display
		firstLine := output
		if idx := strings.Index(output, "\n"); idx > 0 {
			firstLine = output[:idx] + "..."
		}
		if len(firstLine) > 40 {
			firstLine = firstLine[:37] + "..."
		}

		fmt.Printf("%-25s ", host)
		statusColor.Printf("%-12s", r.status)
		fmt.Printf(" %-10s %s\n", durationStr, firstLine)

		// 如果输出有多行，以缩进显示完整内容
		// If output has multiple lines, show full content indented
		if strings.Contains(output, "\n") {
			lines := strings.Split(output, "\n")
			for _, line := range lines {
				fmt.Printf("%-25s %-12s %-10s   %s\n", "", "", "", line)
			}
		}
	}

	// 打印汇总 / Print summary
	fmt.Println(strings.Repeat("=", 80))
	summaryColor := color.New(color.FgCyan)
	summaryColor.Printf("总计 / Total: %d 台主机 / hosts | ", len(results))
	color.New(color.FgGreen).Printf("成功 / Success: %d", successCount)
	summaryColor.Print(" | ")
	if failCount > 0 {
		color.New(color.FgRed).Printf("失败 / Failed: %d", failCount)
	} else {
		fmt.Printf("失败 / Failed: 0")
	}
	fmt.Println()
}

// parseHostPort 解析主机地址和端口
// parseHostPort parses host address and port
func parseHostPort(hostStr string, defaultPort int) (string, string) {
	host, port, err := net.SplitHostPort(hostStr)
	if err != nil {
		// 没有端口号，使用默认端口 / No port, use default
		return hostStr, fmt.Sprintf("%d", defaultPort)
	}
	return host, port
}
