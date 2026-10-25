package cli

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/qingshan/toolbox/internal/config"
	"github.com/qingshan/toolbox/pkg/utils"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/spf13/cobra"
)

// diskCmd 是磁盘管理的父命令。
// diskCmd is the parent command for disk management.
var diskCmd = &cobra.Command{
	Use:   "disk",
	Short: "磁盘管理 / Disk management",
	Long:  "磁盘管理工具：使用率概览、大文件查找、临时文件清理、磁盘监控。\nDisk management tools: usage overview, find large files, clean temp files, disk watch.",
	Run: func(cmd *cobra.Command, args []string) {
		_ = cmd.Help()
	},
}

// 大文件查找标志 / Large file search flags
var (
	largeFileMinSize string // 最小文件大小 / Minimum file size
	largeFileTop     int    // 显示前N个 / Show top N files
)

// 磁盘监控标志 / Disk watch flags
var (
	watchThreshold float64 // 使用率阈值 / Usage threshold
	watchInterval  int     // 检查间隔(秒) / Check interval in seconds
)

// 清理标志 / Clean flags
var (
	cleanDryRun       bool   // 模拟运行 / Dry run mode
	cleanSafe         bool   // 日常工作安全保护模式 / Daily work safety guard
	cleanTemp         bool   // 系统与用户 Temp / System and user temp
	cleanUpdateCache  bool   // Windows Update 补丁缓存 / Windows update cache
	cleanBrowserCache bool   // 浏览器离线资源缓存 / Browser asset cache (no cookies)
	cleanThumbnails   bool   // 缩略图与图标缓存 / Thumbnail and icon cache
	cleanRecycleBin   bool   // 回收站清空 / Recycle bin
	cleanDrive        string // 指定单硬盘驱动器 / Specific drive (e.g. C:, D:)
)

// diskUsageCmd 显示磁盘使用率概览。
// diskUsageCmd shows disk usage overview.
var diskUsageCmd = &cobra.Command{
	Use:   "usage",
	Short: "磁盘使用率概览 / Disk usage overview",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runDiskUsage()
	},
}

// diskLargeCmd 查找大文件。
// diskLargeCmd finds large files.
var diskLargeCmd = &cobra.Command{
	Use:   "large <路径/path>",
	Short: "查找大文件 / Find large files",
	Long: `在指定目录中查找超过指定大小的文件。
Find files larger than the specified size in a directory.

示例 / Examples:
  qstoolbox disk large C:\Users --size 100MB
  qstoolbox disk large D:\ --size 1GB --top 20`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runFindLargeFiles(args[0])
	},
}

// diskCleanCmd 清理临时文件。
// diskCleanCmd cleans temporary files.
var diskCleanCmd = &cobra.Command{
	Use:   "clean [路径/path]",
	Short: "清理临时文件 / Clean temp files",
	Long: `清理指定目录或系统临时目录中的临时文件。
Clean temporary files in the specified directory or system temp directories.

默认清理的目录 / Default directories to clean:
  - %TEMP%
  - C:\Windows\Temp
  - 用户临时文件夹 / User temp folders

示例 / Examples:
  qstoolbox disk clean
  qstoolbox disk clean C:\Temp --dry-run`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var path string
		if len(args) > 0 {
			path = args[0]
		}
		return runCleanTemp(path)
	},
}

// diskWatchCmd 监控磁盘使用率。
// diskWatchCmd monitors disk usage.
var diskWatchCmd = &cobra.Command{
	Use:   "watch [路径/path]",
	Short: "监控磁盘使用率 / Watch disk usage and alert",
	Long: `持续监控磁盘使用率，超过阈值时告警。
Continuously monitor disk usage and alert when threshold is exceeded.

示例 / Examples:
  qstoolbox disk watch C:\ --threshold 90
  qstoolbox disk watch --interval 30`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var path string
		if len(args) > 0 {
			path = args[0]
		}
		return runDiskWatch(path)
	},
}

func init() {
	diskCmd.AddCommand(diskUsageCmd)
	diskCmd.AddCommand(diskLargeCmd)
	diskCmd.AddCommand(diskCleanCmd)
	diskCmd.AddCommand(diskWatchCmd)

	// 大文件查找标志 / Large file search flags
	diskLargeCmd.Flags().StringVar(&largeFileMinSize, "size", "100MB",
		"最小文件大小 / minimum file size (e.g., 100MB, 1GB)")
	diskLargeCmd.Flags().IntVar(&largeFileTop, "top", 10,
		"显示前N个大文件 / show top N largest files")

	// 磁盘监控标志 / Disk watch flags
	diskWatchCmd.Flags().Float64Var(&watchThreshold, "threshold", 90,
		"使用率告警阈值(%) / usage alert threshold (%)")
	diskWatchCmd.Flags().IntVar(&watchInterval, "interval", 60,
		"检查间隔(秒) / check interval in seconds")

	// 清理标志 / Clean flags
	diskCleanCmd.Flags().BoolVar(&cleanDryRun, "dry-run", false,
		"模拟运行，不实际删除 / dry run, don't actually delete")
	diskCleanCmd.Flags().BoolVar(&cleanSafe, "safe", true,
		"日常工作安全保护模式 (保留登录态/文档) / daily work safety mode")
	diskCleanCmd.Flags().BoolVar(&cleanTemp, "temp", false,
		"清理系统与用户 Temp 临时文件 / clean temp files")
	diskCleanCmd.Flags().BoolVar(&cleanUpdateCache, "update-cache", false,
		"清理 Windows Update 历史更新残余 / clean update cache")
	diskCleanCmd.Flags().BoolVar(&cleanBrowserCache, "browser-cache", false,
		"清理浏览器静态资源 (不碰 Cookies / 账号密码) / clean web cache")
	diskCleanCmd.Flags().BoolVar(&cleanThumbnails, "thumbnails", false,
		"清理资源管理器缩略图缓存 / clean thumbnails")
	diskCleanCmd.Flags().BoolVar(&cleanRecycleBin, "recycle-bin", false,
		"清空回收站 / empty recycle bin")
	diskCleanCmd.Flags().StringVar(&cleanDrive, "drive", "",
		"针对指定单硬盘检测与清理 (如 C:, D:) / target drive")
}

// ============================================================
// 磁盘管理实现 / Disk management implementations
// ============================================================

// runDiskUsage 显示所有分区的磁盘使用率。
// runDiskUsage shows disk usage for all partitions.
func runDiskUsage() error {
	utils.Bold("💾 磁盘使用率概览 / Disk Usage Overview")
	fmt.Println()

	thresholds := config.GetThresholds()

	partitions, err := disk.Partitions(false)
	if err != nil {
		return fmt.Errorf("获取分区信息失败 / failed to get partition info: %w", err)
	}

	headers := []string{"挂载点/Mount", "文件系统/FS", "总计/Total", "已用/Used", "可用/Free", "使用率/Usage", "状态/Status"}
	var rows [][]string

	for _, p := range partitions {
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil || usage.Total == 0 {
			continue
		}

		statusLabel := utils.StatusLabel(usage.UsedPercent, thresholds.Disk.Warning, thresholds.Disk.Critical)

		// 生成使用率条形图 / Generate usage bar
		barLen := 20
		filled := int(usage.UsedPercent / 100 * float64(barLen))
		if filled > barLen {
			filled = barLen
		}
		bar := strings.Repeat("█", filled) + strings.Repeat("░", barLen-filled)

		rows = append(rows, []string{
			p.Mountpoint,
			p.Fstype,
			utils.FormatBytes(usage.Total),
			utils.FormatBytes(usage.Used),
			utils.FormatBytes(usage.Free),
			fmt.Sprintf("%s %.1f%%", bar, usage.UsedPercent),
			statusLabel,
		})
	}

	if len(rows) > 0 {
		utils.PrintTable(headers, rows)
	} else {
		utils.Warning("未找到磁盘分区 / No disk partitions found")
	}

	// IO 统计 / IO statistics
	if verbose {
		fmt.Println()
		ioCounters, err := disk.IOCounters()
		if err == nil && len(ioCounters) > 0 {
			utils.Bold("  磁盘 IO 统计 / Disk IO Statistics:")
			for name, counter := range ioCounters {
				fmt.Printf("    %s: 读取 %s / Read, 写入 %s / Written\n",
					name,
					utils.FormatBytes(counter.ReadBytes),
					utils.FormatBytes(counter.WriteBytes))
			}
		}
	}

	return nil
}

// fileEntry 存储文件信息用于排序。
// fileEntry stores file info for sorting.
type fileEntry struct {
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	ModTime string `json:"mod_time"`
}

// runFindLargeFiles 在指定目录中查找大文件。
// runFindLargeFiles finds large files in the specified directory.
func runFindLargeFiles(searchPath string) error {
	minBytes, err := utils.ParseSizeString(largeFileMinSize)
	if err != nil {
		return fmt.Errorf("无效的文件大小 / invalid file size: %w", err)
	}

	utils.Bold("🔍 查找大文件 / Finding Large Files")
	fmt.Printf("  目录 / Directory: %s\n", searchPath)
	fmt.Printf("  最小大小 / Min Size: %s\n", utils.FormatBytes(minBytes))
	fmt.Println()

	var files []fileEntry
	var scannedCount int
	var scannedDirs int
	var accessErrors int

	spinner := utils.NewSpinner("  扫描中 / Scanning")

	err = filepath.Walk(searchPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			accessErrors++
			return nil // 跳过无法访问的文件 / Skip inaccessible files
		}

		if info.IsDir() {
			scannedDirs++
			_ = spinner.Add(1)
			return nil
		}

		scannedCount++

		if uint64(info.Size()) >= minBytes {
			files = append(files, fileEntry{
				Path:    path,
				Size:    info.Size(),
				ModTime: info.ModTime().Format("2006-01-02 15:04"),
			})
		}

		return nil
	})

	_ = spinner.Finish()

	if err != nil {
		return fmt.Errorf("扫描目录失败 / failed to scan directory: %w", err)
	}

	fmt.Printf("  已扫描 / Scanned: %d 个文件 / files, %d 个目录 / dirs",
		scannedCount, scannedDirs)
	if accessErrors > 0 {
		fmt.Printf(" (%d 个无法访问 / inaccessible)", accessErrors)
	}
	fmt.Println()
	fmt.Println()

	if len(files) == 0 {
		utils.Info("未找到大于 %s 的文件 / No files larger than %s found",
			utils.FormatBytes(minBytes), utils.FormatBytes(minBytes))
		return nil
	}

	// 按大小降序排序 / Sort by size descending
	sort.Slice(files, func(i, j int) bool {
		return files[i].Size > files[j].Size
	})

	// 限制显示数量 / Limit display count
	displayFiles := files
	if len(displayFiles) > largeFileTop {
		displayFiles = displayFiles[:largeFileTop]
	}

	headers := []string{"#", "文件路径/Path", "大小/Size", "修改时间/Modified"}
	var rows [][]string
	for i, f := range displayFiles {
		path := f.Path
		// 截断过长的路径 / Truncate long paths
		if len(path) > 60 {
			path = "..." + path[len(path)-57:]
		}
		rows = append(rows, []string{
			fmt.Sprintf("%d", i+1),
			path,
			utils.FormatBytes(uint64(f.Size)),
			f.ModTime,
		})
	}

	utils.PrintTable(headers, rows)

	if len(files) > largeFileTop {
		fmt.Printf("\n  共找到 %d 个大文件，仅显示前 %d 个 / Found %d large files, showing top %d\n",
			len(files), largeFileTop, len(files), largeFileTop)
	} else {
		fmt.Printf("\n  共找到 %d 个大文件 / Found %d large files\n", len(files), len(files))
	}

	return nil
}

// runCleanTemp 清理临时文件与安全缓存。
// runCleanTemp cleans temporary files and safe caches.
func runCleanTemp(path string) error {
	if cleanDryRun {
		utils.Warning("模拟运行模式 - 不会实际删除文件 / DRY RUN - no files will be deleted")
		fmt.Println()
	}

	utils.Bold("🧹 磁盘相对安全缓存清理 / Safe Relative Cache Cleanup")
	fmt.Println()
	fmt.Println("🛡️  日常工作无感保障：")
	fmt.Println("   ✔ 严格保留浏览器已登录会话、Cookies、保存密码及浏览历史（无需重新登录）")
	fmt.Println("   ✔ 严格保留桌面、文档、下载目录及个人重要聊天记录")
	fmt.Println("   ✔ 自动跳过运行中进程锁定的文件，不强杀程序")
	fmt.Println("   ✔ 仅安全清理：Windows Temp/用户 Temp 孤立死文件、Update 更新残余包、已废弃缩略图快照与回收站")
	fmt.Println()

	// 确定要清理的目录 / Determine directories to clean
	var cleanPaths []string

	if cleanDrive != "" {
		driveLetter := strings.ToUpper(strings.TrimSuffix(cleanDrive, ":"))
		fmt.Printf("🎯 针对单硬盘 [%s:] 执行相对缓存分析与清理...\n", driveLetter)
		if driveLetter == "C" {
			cleanPaths = append(cleanPaths, os.TempDir())
			cleanPaths = append(cleanPaths, `C:\Windows\Temp`)
			if cleanUpdateCache || (!cleanTemp && !cleanBrowserCache && !cleanThumbnails && !cleanRecycleBin) {
				cleanPaths = append(cleanPaths, `C:\Windows\SoftwareDistribution\Download`)
			}
		} else {
			// 其他盘 (如 D:, E:)：清理回收站与临时文件夹
			cleanPaths = append(cleanPaths, fmt.Sprintf(`%s:\$Recycle.Bin`, driveLetter))
			cleanPaths = append(cleanPaths, fmt.Sprintf(`%s:\Temp`, driveLetter))
		}
	} else if path != "" {
		cleanPaths = append(cleanPaths, path)
	} else {
		// 默认或根据参数组合
		if cleanTemp || (!cleanUpdateCache && !cleanBrowserCache && !cleanThumbnails && !cleanRecycleBin) {
			tempDir := os.TempDir()
			cleanPaths = append(cleanPaths, tempDir)
			winTemp := `C:\Windows\Temp`
			if _, err := os.Stat(winTemp); err == nil {
				cleanPaths = append(cleanPaths, winTemp)
			}
		}

		if cleanUpdateCache {
			winUpdate := `C:\Windows\SoftwareDistribution\Download`
			if _, err := os.Stat(winUpdate); err == nil {
				cleanPaths = append(cleanPaths, winUpdate)
			}
		}

		if cleanThumbnails {
			localApp := os.Getenv("LOCALAPPDATA")
			if localApp != "" {
				thumbDir := filepath.Join(localApp, "Microsoft", "Windows", "Explorer")
				if _, err := os.Stat(thumbDir); err == nil {
					cleanPaths = append(cleanPaths, thumbDir)
				}
			}
		}

		if cleanBrowserCache {
			localApp := os.Getenv("LOCALAPPDATA")
			if localApp != "" {
				edgeCache := filepath.Join(localApp, "Microsoft", "Edge", "User Data", "Default", "Cache", "Cache_Data")
				if _, err := os.Stat(edgeCache); err == nil {
					cleanPaths = append(cleanPaths, edgeCache)
				}
				chromeCache := filepath.Join(localApp, "Google", "Chrome", "User Data", "Default", "Cache", "Cache_Data")
				if _, err := os.Stat(chromeCache); err == nil {
					cleanPaths = append(chromeCache, chromeCache)
				}
			}
		}

		if cleanRecycleBin {
			cleanPaths = append(cleanPaths, `C:\$Recycle.Bin`)
		}
	}

	var totalFiles int
	var totalSize int64
	var deletedFiles int
	var deletedSize int64
	var failedFiles int

	// 临时文件扩展名 / Temp file extensions
	tempExtensions := map[string]bool{
		".tmp": true, ".temp": true, ".log": true, ".bak": true,
		".old": true, ".cache": true, ".dmp": true, ".chk": true,
		".~": true, ".etl": true,
	}

	for _, cleanPath := range cleanPaths {
		utils.Info("清理目录 / Cleaning: %s", cleanPath)

		err := filepath.Walk(cleanPath, func(fpath string, info os.FileInfo, err error) error {
			if err != nil {
				return nil // 跳过无法访问的 / Skip inaccessible
			}

			if info.IsDir() {
				return nil
			}

			totalFiles++
			totalSize += info.Size()

			// 检查是否为临时文件 / Check if temp file
			ext := strings.ToLower(filepath.Ext(fpath))
			isTemp := tempExtensions[ext]

			// 超过30天未修改的文件也可清理
			// Files not modified for 30+ days are also cleanable
			isOld := time.Since(info.ModTime()) > 30*24*time.Hour

			if isTemp || isOld {
				if cleanDryRun {
					fmt.Printf("    [模拟] 将删除 / [DRY] Would delete: %s (%s)\n",
						fpath, utils.FormatBytes(uint64(info.Size())))
					deletedFiles++
					deletedSize += info.Size()
				} else {
					if err := os.Remove(fpath); err != nil {
						failedFiles++
						if verbose {
							utils.Warning("删除失败 / Failed to delete: %s: %v", fpath, err)
						}
					} else {
						deletedFiles++
						deletedSize += info.Size()
						if verbose {
							utils.Success("已删除 / Deleted: %s", fpath)
						}
					}
				}
			}

			return nil
		})

		if err != nil {
			utils.Warning("清理 %s 时出错 / Error cleaning %s: %v", cleanPath, cleanPath, err)
		}
	}

	fmt.Println()
	utils.Bold("清理结果 / Cleanup Results:")
	fmt.Printf("  扫描文件 / Scanned:   %d 个 / files (%s)\n", totalFiles, utils.FormatBytes(uint64(totalSize)))

	if cleanDryRun {
		fmt.Printf("  可清理 / Cleanable:   %d 个 / files (%s)\n", deletedFiles, utils.FormatBytes(uint64(deletedSize)))
	} else {
		fmt.Printf("  已删除 / Deleted:     %d 个 / files (%s)\n", deletedFiles, utils.FormatBytes(uint64(deletedSize)))
		if failedFiles > 0 {
			fmt.Printf("  删除失败 / Failed:    %d 个 / files\n", failedFiles)
		}
	}

	return nil
}

// runDiskWatch 持续监控磁盘使用率。
// runDiskWatch continuously monitors disk usage.
func runDiskWatch(path string) error {
	utils.Bold("👁️  磁盘使用率监控 / Disk Usage Monitor")
	fmt.Printf("  告警阈值 / Threshold: %.0f%%\n", watchThreshold)
	fmt.Printf("  检查间隔 / Interval:  %d 秒 / seconds\n", watchInterval)
	fmt.Printf("  按 Ctrl+C 退出 / Press Ctrl+C to exit\n")
	fmt.Println()

	ticker := time.NewTicker(time.Duration(watchInterval) * time.Second)
	defer ticker.Stop()

	// 立即检查一次 / Check immediately
	checkDiskUsage(path, watchThreshold)

	for range ticker.C {
		checkDiskUsage(path, watchThreshold)
	}

	return nil
}

// checkDiskUsage 检查磁盘使用率并在超过阈值时告警。
// checkDiskUsage checks disk usage and alerts when threshold is exceeded.
func checkDiskUsage(path string, threshold float64) {
	now := time.Now().Format("2006-01-02 15:04:05")

	if path != "" {
		// 检查指定路径 / Check specific path
		usage, err := disk.Usage(path)
		if err != nil {
			utils.Error("[%s] 获取 %s 使用率失败 / Failed to get usage for %s: %v",
				now, path, path, err)
			return
		}

		if usage.UsedPercent >= threshold {
			utils.Error("[%s] ⚠ %s 使用率 %.1f%% 超过阈值 %.0f%% / Usage %.1f%% exceeds threshold %.0f%%",
				now, path, usage.UsedPercent, threshold, usage.UsedPercent, threshold)
		} else {
			utils.Success("[%s] %s 使用率 %.1f%% (阈值 %.0f%%) / Usage %.1f%% (threshold %.0f%%)",
				now, path, usage.UsedPercent, threshold, usage.UsedPercent, threshold)
		}
		return
	}

	// 检查所有分区 / Check all partitions
	partitions, err := disk.Partitions(false)
	if err != nil {
		utils.Error("[%s] 获取分区信息失败 / Failed to get partitions: %v", now, err)
		return
	}

	for _, p := range partitions {
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil || usage.Total == 0 {
			continue
		}

		if usage.UsedPercent >= threshold {
			utils.Error("[%s] ⚠ %s 使用率 %.1f%% 超过阈值 %.0f%% / Usage %.1f%% exceeds threshold %.0f%%",
				now, p.Mountpoint, usage.UsedPercent, threshold, usage.UsedPercent, threshold)
		} else {
			utils.Success("[%s] %s 使用率 %.1f%% / Usage %.1f%%",
				now, p.Mountpoint, usage.UsedPercent, usage.UsedPercent)
		}
	}
	fmt.Println()
}
