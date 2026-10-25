package cli

import (
	"context"
	"fmt"
	"net"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/fatih/color"
	"github.com/qingshan/toolbox/pkg/utils"
	"github.com/spf13/cobra"
)

// netCmd 是网络诊断的父命令。
// netCmd is the parent command for network diagnostics.
var netCmd = &cobra.Command{
	Use:   "net",
	Short: "网络诊断 / Network diagnostics",
	Long:  "网络诊断工具：ping、端口检查、DNS 查询、端口扫描、路由追踪。\nNetwork diagnostic tools: ping, port check, DNS lookup, port scan, traceroute.",
	Aliases: []string{"network"},
	Run: func(cmd *cobra.Command, args []string) {
		_ = cmd.Help()
	},
}

// 端口扫描并发数 / Port scan concurrency
var scanConcurrency int

// ping 次数 / Ping count
var pingCount int

// 端口连接超时(秒) / Port connection timeout (seconds)
var portTimeout int

// netPingCmd ping 主机。
// netPingCmd pings a host.
var netPingCmd = &cobra.Command{
	Use:   "ping <主机/host>",
	Short: "Ping 主机 / Ping a host with stats",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runPing(args[0])
	},
}

// netPortCmd 检查端口。
// netPortCmd checks a TCP port.
var netPortCmd = &cobra.Command{
	Use:   "port <主机/host> <端口/port>",
	Short: "TCP 端口检查 / TCP port check",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		port, err := strconv.Atoi(args[1])
		if err != nil || port < 1 || port > 65535 {
			return fmt.Errorf("无效的端口号 / invalid port number: %s", args[1])
		}
		return runPortCheck(args[0], port)
	},
}

// netDNSCmd DNS 查询。
// netDNSCmd performs DNS lookup.
var netDNSCmd = &cobra.Command{
	Use:   "dns <域名/domain>",
	Short: "DNS 查询 / DNS lookup",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runDNSLookup(args[0])
	},
}

// netScanCmd 端口扫描。
// netScanCmd scans a port range.
var netScanCmd = &cobra.Command{
	Use:   "scan <主机/host> <起始端口-结束端口/startPort-endPort>",
	Short: "端口范围扫描 / Port range scan",
	Long: `扫描目标主机的端口范围，查找开放端口。
Scan a port range on target host to find open ports.

示例 / Examples:
  qstoolbox net scan 192.168.1.1 80-443
  qstoolbox net scan example.com 1-1024`,
	Args: cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runPortScan(args[0], args[1])
	},
}

// netTraceCmd 路由追踪。
// netTraceCmd performs traceroute.
var netTraceCmd = &cobra.Command{
	Use:   "trace <主机/host>",
	Short: "路由追踪 / Traceroute",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runTraceroute(args[0])
	},
}

func init() {
	netCmd.AddCommand(netPingCmd)
	netCmd.AddCommand(netPortCmd)
	netCmd.AddCommand(netDNSCmd)
	netCmd.AddCommand(netScanCmd)
	netCmd.AddCommand(netTraceCmd)

	// 标志 / Flags
	netPingCmd.Flags().IntVarP(&pingCount, "count", "c", 4,
		"Ping 次数 / number of pings")
	netScanCmd.Flags().IntVar(&scanConcurrency, "concurrency", 100,
		"并发数 / number of concurrent connections")
	netPortCmd.Flags().IntVarP(&portTimeout, "timeout", "t", 5,
		"超时时间(秒) / timeout in seconds")
}

// ============================================================
// 网络诊断实现 / Network diagnostic implementations
// ============================================================

// runPing 执行 ping 操作。
// runPing executes ping.
func runPing(host string) error {
	utils.Bold("🏓 Ping %s", host)
	fmt.Println()

	// 先做 DNS 解析 / Resolve DNS first
	addrs, err := net.LookupHost(host)
	if err != nil {
		utils.Error("DNS 解析失败 / DNS resolution failed: %v", err)
		return err
	}
	fmt.Printf("  解析地址 / Resolved: %s\n\n", strings.Join(addrs, ", "))

	// 使用系统 ping 命令 / Use system ping command
	cmd := exec.Command("ping", "-n", strconv.Itoa(pingCount), host)
	output, err := cmd.CombinedOutput()
	if err != nil {
		outStr := strings.TrimSpace(string(output))
		if outStr != "" {
			fmt.Println(outStr)
		}
		utils.Error("Ping 失败 / Ping failed: %v", err)
		return nil // 不返回错误，因为输出已经显示了 / Don't return error, output is displayed
	}

	fmt.Println(strings.TrimSpace(string(output)))
	return nil
}

// runPortCheck 检查单个 TCP 端口是否开放。
// runPortCheck checks if a single TCP port is open.
func runPortCheck(host string, port int) error {
	utils.Bold("🔌 端口检查 / Port Check: %s:%d", host, port)
	fmt.Println()

	timeout := time.Duration(portTimeout) * time.Second
	address := fmt.Sprintf("%s:%d", host, port)

	start := time.Now()
	conn, err := net.DialTimeout("tcp", address, timeout)
	elapsed := time.Since(start)

	if err != nil {
		utils.Error("端口 %d 未开放 / Port %d is CLOSED", port, port)
		fmt.Printf("  地址 / Address:  %s\n", address)
		fmt.Printf("  耗时 / Elapsed:  %v\n", elapsed.Round(time.Millisecond))
		fmt.Printf("  错误 / Error:    %v\n", err)
		return nil
	}
	defer conn.Close()

	utils.Success("端口 %d 已开放 / Port %d is OPEN", port, port)
	fmt.Printf("  地址 / Address:    %s\n", address)
	fmt.Printf("  耗时 / Elapsed:    %v\n", elapsed.Round(time.Millisecond))
	fmt.Printf("  远端地址 / Remote: %s\n", conn.RemoteAddr().String())

	// 尝试识别常见服务 / Try to identify common service
	if svcName := wellKnownPort(port); svcName != "" {
		fmt.Printf("  常见服务 / Service: %s\n", svcName)
	}

	return nil
}

// runDNSLookup 执行 DNS 查询。
// runDNSLookup performs DNS lookup.
func runDNSLookup(domain string) error {
	utils.Bold("🔍 DNS 查询 / DNS Lookup: %s", domain)
	fmt.Println()

	// A 记录 / A records
	ips, err := net.LookupHost(domain)
	if err != nil {
		utils.Error("DNS 查询失败 / DNS lookup failed: %v", err)
		return nil
	}

	if len(ips) > 0 {
		utils.Info("IP 地址 / IP Addresses (A/AAAA records):")
		for _, ip := range ips {
			parsedIP := net.ParseIP(ip)
			if parsedIP != nil {
				if parsedIP.To4() != nil {
					fmt.Printf("    A     : %s\n", ip)
				} else {
					fmt.Printf("    AAAA  : %s\n", ip)
				}
			}
		}
	}

	// CNAME 记录 / CNAME record
	cname, err := net.LookupCNAME(domain)
	if err == nil && cname != domain+"." {
		fmt.Printf("\n  CNAME   : %s\n", cname)
	}

	// MX 记录 / MX records
	mxRecords, err := net.LookupMX(domain)
	if err == nil && len(mxRecords) > 0 {
		fmt.Println()
		utils.Info("MX 记录 / MX Records:")
		for _, mx := range mxRecords {
			fmt.Printf("    MX    : %s (优先级/priority: %d)\n", mx.Host, mx.Pref)
		}
	}

	// NS 记录 / NS records
	nsRecords, err := net.LookupNS(domain)
	if err == nil && len(nsRecords) > 0 {
		fmt.Println()
		utils.Info("NS 记录 / NS Records:")
		for _, ns := range nsRecords {
			fmt.Printf("    NS    : %s\n", ns.Host)
		}
	}

	// TXT 记录 / TXT records
	txtRecords, err := net.LookupTXT(domain)
	if err == nil && len(txtRecords) > 0 {
		fmt.Println()
		utils.Info("TXT 记录 / TXT Records:")
		for _, txt := range txtRecords {
			// 截断过长的 TXT 记录 / Truncate long TXT records
			if len(txt) > 80 {
				txt = txt[:77] + "..."
			}
			fmt.Printf("    TXT   : %s\n", txt)
		}
	}

	// 反向查询 / Reverse lookup
	if len(ips) > 0 {
		names, err := net.LookupAddr(ips[0])
		if err == nil && len(names) > 0 {
			fmt.Println()
			utils.Info("反向解析 / Reverse DNS (PTR):")
			for _, name := range names {
				fmt.Printf("    PTR   : %s\n", name)
			}
		}
	}

	return nil
}

// runPortScan 扫描端口范围。
// runPortScan scans a port range.
func runPortScan(host, portRange string) error {
	// 解析端口范围 / Parse port range
	parts := strings.SplitN(portRange, "-", 2)
	if len(parts) != 2 {
		return fmt.Errorf("端口范围格式错误，应为 起始-结束 / invalid port range format, use start-end")
	}

	startPort, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil || startPort < 1 || startPort > 65535 {
		return fmt.Errorf("无效的起始端口 / invalid start port: %s", parts[0])
	}

	endPort, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil || endPort < 1 || endPort > 65535 {
		return fmt.Errorf("无效的结束端口 / invalid end port: %s", parts[1])
	}

	if startPort > endPort {
		return fmt.Errorf("起始端口不能大于结束端口 / start port cannot be greater than end port")
	}

	totalPorts := endPort - startPort + 1
	utils.Bold("🔎 端口扫描 / Port Scan: %s [%d-%d] (%d 个端口 / ports)", host, startPort, endPort, totalPorts)
	fmt.Println()

	// 并发扫描 / Concurrent scan
	type scanResult struct {
		Port    int
		Open    bool
		Service string
	}

	results := make([]scanResult, 0)
	resultCh := make(chan scanResult, totalPorts)
	sem := make(chan struct{}, scanConcurrency)
	var wg sync.WaitGroup

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// 创建进度条 / Create progress bar
	bar := utils.NewProgressBar(int64(totalPorts), "  扫描中 / Scanning")

	for port := startPort; port <= endPort; port++ {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()

			select {
			case <-ctx.Done():
				return
			case sem <- struct{}{}:
				defer func() { <-sem }()
			}

			address := fmt.Sprintf("%s:%d", host, p)
			conn, err := net.DialTimeout("tcp", address, 2*time.Second)
			if err == nil {
				conn.Close()
				resultCh <- scanResult{Port: p, Open: true, Service: wellKnownPort(p)}
			}
			_ = bar.Add(1)
		}(port)
	}

	// 等待所有 goroutine 完成 / Wait for all goroutines
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	for r := range resultCh {
		results = append(results, r)
	}

	fmt.Println()

	if len(results) == 0 {
		utils.Warning("未找到开放端口 / No open ports found")
		return nil
	}

	// 按端口号排序 / Sort by port number
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Port < results[i].Port {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	// 显示结果 / Display results
	headers := []string{"端口/Port", "状态/Status", "服务/Service"}
	var rows [][]string
	for _, r := range results {
		rows = append(rows, []string{
			strconv.Itoa(r.Port),
			color.GreenString("OPEN"),
			r.Service,
		})
	}
	utils.PrintTable(headers, rows)

	fmt.Printf("\n  共扫描 %d 个端口，发现 %d 个开放端口 / Scanned %d ports, found %d open\n",
		totalPorts, len(results), totalPorts, len(results))

	return nil
}

// runTraceroute 执行路由追踪。
// runTraceroute performs traceroute.
func runTraceroute(host string) error {
	utils.Bold("🛤️  路由追踪 / Traceroute: %s", host)
	fmt.Println()

	// Windows 使用 tracert / Windows uses tracert
	cmd := exec.Command("tracert", "-d", "-w", "3000", host)
	output, err := cmd.CombinedOutput()
	if err != nil {
		outStr := strings.TrimSpace(string(output))
		if outStr != "" {
			fmt.Println(outStr)
		}
		return fmt.Errorf("路由追踪失败 / traceroute failed: %w", err)
	}

	fmt.Println(strings.TrimSpace(string(output)))
	return nil
}

// wellKnownPort 返回端口对应的常见服务名称。
// wellKnownPort returns the common service name for a port.
func wellKnownPort(port int) string {
	services := map[int]string{
		20:    "FTP-Data",
		21:    "FTP",
		22:    "SSH",
		23:    "Telnet",
		25:    "SMTP",
		53:    "DNS",
		80:    "HTTP",
		110:   "POP3",
		135:   "RPC",
		139:   "NetBIOS",
		143:   "IMAP",
		443:   "HTTPS",
		445:   "SMB",
		993:   "IMAPS",
		995:   "POP3S",
		1433:  "MSSQL",
		1521:  "Oracle",
		3306:  "MySQL",
		3389:  "RDP",
		5432:  "PostgreSQL",
		5900:  "VNC",
		6379:  "Redis",
		8080:  "HTTP-Alt",
		8443:  "HTTPS-Alt",
		9090:  "WebUI",
		27017: "MongoDB",
	}

	if name, ok := services[port]; ok {
		return name
	}
	return ""
}
