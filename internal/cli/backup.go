// Package cli 提供青衫工具箱的备份管理命令
// Package cli provides backup management commands for qingshan-toolbox
package cli

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fatih/color"
	"github.com/qingshan/toolbox/pkg/models"
	"github.com/spf13/cobra"
)

// newBackupCmd 创建备份管理命令组
// newBackupCmd creates the backup management command group
func newBackupCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "backup",
		Short: "备份管理工具 / Backup management",
		Long: `备份管理工具集，支持创建备份（复制/压缩）、恢复备份、
列出可用备份和设置 Windows 计划任务自动备份。
Backup management toolkit supporting backup creation (copy/zip),
restore, listing available backups, and Windows Task Scheduler setup.`,
	}

	cmd.AddCommand(newBackupCreateCmd())
	cmd.AddCommand(newBackupRestoreCmd())
	cmd.AddCommand(newBackupListCmd())
	cmd.AddCommand(newBackupScheduleCmd())

	return cmd
}

// === backup create 命令 / backup create command ===

// newBackupCreateCmd 创建备份创建命令
// newBackupCreateCmd creates the backup creation command
func newBackupCreateCmd() *cobra.Command {
	var (
		compress bool
		excludes []string
		name     string
	)

	cmd := &cobra.Command{
		Use:   "create <source> <dest>",
		Short: "创建备份 / Create a backup",
		Long: `创建指定目录或文件的备份。支持直接复制或 ZIP 压缩模式。
会自动生成备份清单文件（manifest.json），记录备份元数据。
Create a backup of the specified directory or file.
Supports direct copy or ZIP compression mode.
Automatically generates a backup manifest (manifest.json).`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runBackupCreate(args[0], args[1], compress, excludes, name)
		},
	}

	cmd.Flags().BoolVarP(&compress, "compress", "z", false, "使用 ZIP 压缩 / Compress backup with ZIP")
	cmd.Flags().StringSliceVarP(&excludes, "exclude", "e", nil, "排除模式 / Exclude patterns (e.g., '*.log,*.tmp')")
	cmd.Flags().StringVarP(&name, "name", "n", "", "备份名称 / Backup name (default: timestamp-based)")

	return cmd
}

// runBackupCreate 执行备份创建
// runBackupCreate implements backup creation
func runBackupCreate(source, dest string, compress bool, excludes []string, name string) error {
	// 验证源路径 / Verify source path exists
	sourceInfo, err := os.Stat(source)
	if err != nil {
		return fmt.Errorf("源路径不存在 / Source path not found '%s': %w", source, err)
	}

	// 生成备份名称 / Generate backup name
	if name == "" {
		timestamp := time.Now().Format("20060102-150405")
		baseName := filepath.Base(source)
		name = fmt.Sprintf("%s-%s", baseName, timestamp)
	}

	// 确定备份目标路径 / Determine backup destination path
	backupPath := filepath.Join(dest, name)
	if compress {
		backupPath += ".zip"
	}

	headerColor := color.New(color.FgCyan)
	headerColor.Println("=== 创建备份 / Creating Backup ===")
	headerColor.Printf("源路径 / Source:      %s\n", source)
	headerColor.Printf("目标路径 / Dest:      %s\n", backupPath)
	headerColor.Printf("压缩模式 / Compress:  %v\n", compress)
	if len(excludes) > 0 {
		headerColor.Printf("排除模式 / Excludes:  %s\n", strings.Join(excludes, ", "))
	}
	fmt.Println()

	// 创建目标目录 / Create destination directory
	if err := os.MkdirAll(dest, 0755); err != nil {
		return fmt.Errorf("创建目标目录失败 / Failed to create destination directory: %w", err)
	}

	// 统计文件信息 / Collect file stats
	var fileCount int
	var totalSize int64
	startTime := time.Now()

	if compress {
		// ZIP 压缩备份 / ZIP compressed backup
		fileCount, totalSize, err = createZipBackup(source, backupPath, excludes, sourceInfo.IsDir())
	} else {
		// 直接复制备份 / Direct copy backup
		fileCount, totalSize, err = createCopyBackup(source, backupPath, excludes, sourceInfo.IsDir())
	}

	if err != nil {
		return fmt.Errorf("备份失败 / Backup failed: %w", err)
	}

	duration := time.Since(startTime)

	// 获取主机名 / Get hostname
	hostname, _ := os.Hostname()

	// 生成备份清单 / Generate backup manifest
	manifest := models.BackupManifest{
		ID:          fmt.Sprintf("backup-%s", time.Now().Format("20060102150405")),
		Name:        name,
		Source:      source,
		Destination: backupPath,
		CreatedAt:   time.Now(),
		FileCount:   fileCount,
		TotalSize:   totalSize,
		Compressed:  compress,
		Excludes:    excludes,
		Hostname:    hostname,
		Version:     "0.1.0",
	}

	// 保存清单文件 / Save manifest file
	manifestPath := backupPath
	if compress {
		// ZIP 文件的清单保存在同目录 / Manifest for ZIP saved alongside
		manifestPath = strings.TrimSuffix(backupPath, ".zip")
	}
	manifestFile := manifestPath + ".manifest.json"

	if err := saveManifest(manifestFile, manifest); err != nil {
		color.New(color.FgYellow).Printf("⚠ 保存清单失败 / Failed to save manifest: %v\n", err)
	}

	// 打印备份结果 / Print backup results
	fmt.Println()
	color.New(color.FgGreen, color.Bold).Println("✓ 备份完成 / Backup completed!")
	fmt.Printf("  文件数 / Files:    %d\n", fileCount)
	fmt.Printf("  总大小 / Size:     %s\n", formatBytes(totalSize))
	fmt.Printf("  耗时 / Duration:   %s\n", duration.Round(time.Millisecond))
	fmt.Printf("  清单 / Manifest:   %s\n", manifestFile)

	return nil
}

// createZipBackup 创建 ZIP 压缩备份
// createZipBackup creates a ZIP compressed backup
func createZipBackup(source, destZip string, excludes []string, isDir bool) (int, int64, error) {
	zipFile, err := os.Create(destZip)
	if err != nil {
		return 0, 0, fmt.Errorf("创建 ZIP 文件失败 / Failed to create ZIP file: %w", err)
	}
	defer zipFile.Close()

	writer := zip.NewWriter(zipFile)
	defer writer.Close()

	var fileCount int
	var totalSize int64

	if isDir {
		// 遍历目录添加所有文件 / Walk directory and add all files
		err = filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			// 检查排除模式 / Check exclude patterns
			if shouldExclude(path, info.Name(), excludes) {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}

			if info.IsDir() {
				return nil
			}

			// 计算相对路径 / Calculate relative path
			relPath, err := filepath.Rel(source, path)
			if err != nil {
				return err
			}

			// 显示进度 / Show progress
			fmt.Printf("\r  正在压缩 / Compressing: %s", truncatePath(relPath, 60))

			// 添加文件到 ZIP / Add file to ZIP
			header, err := zip.FileInfoHeader(info)
			if err != nil {
				return err
			}
			header.Name = filepath.ToSlash(relPath)
			header.Method = zip.Deflate

			w, err := writer.CreateHeader(header)
			if err != nil {
				return err
			}

			file, err := os.Open(path)
			if err != nil {
				return err
			}
			defer file.Close()

			written, err := io.Copy(w, file)
			if err != nil {
				return err
			}

			fileCount++
			totalSize += written
			return nil
		})
	} else {
		// 单文件压缩 / Single file compression
		info, _ := os.Stat(source)
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return 0, 0, err
		}
		header.Method = zip.Deflate

		w, err := writer.CreateHeader(header)
		if err != nil {
			return 0, 0, err
		}

		file, err := os.Open(source)
		if err != nil {
			return 0, 0, err
		}
		defer file.Close()

		written, err := io.Copy(w, file)
		if err != nil {
			return 0, 0, err
		}

		fileCount = 1
		totalSize = written
	}

	// 清除进度行 / Clear progress line
	fmt.Print("\r" + strings.Repeat(" ", 80) + "\r")

	return fileCount, totalSize, err
}

// createCopyBackup 创建直接复制备份
// createCopyBackup creates a direct copy backup
func createCopyBackup(source, dest string, excludes []string, isDir bool) (int, int64, error) {
	var fileCount int
	var totalSize int64

	if isDir {
		// 创建目标目录 / Create destination directory
		if err := os.MkdirAll(dest, 0755); err != nil {
			return 0, 0, err
		}

		// 遍历源目录 / Walk source directory
		err := filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			// 检查排除模式 / Check exclude patterns
			if shouldExclude(path, info.Name(), excludes) {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}

			relPath, err := filepath.Rel(source, path)
			if err != nil {
				return err
			}
			destPath := filepath.Join(dest, relPath)

			if info.IsDir() {
				return os.MkdirAll(destPath, info.Mode())
			}

			// 显示进度 / Show progress
			fmt.Printf("\r  正在复制 / Copying: %s", truncatePath(relPath, 60))

			// 复制文件 / Copy file
			written, err := copyFile(path, destPath)
			if err != nil {
				return err
			}

			fileCount++
			totalSize += written
			return nil
		})

		// 清除进度行 / Clear progress line
		fmt.Print("\r" + strings.Repeat(" ", 80) + "\r")
		return fileCount, totalSize, err
	}

	// 单文件复制 / Single file copy
	written, err := copyFile(source, dest)
	if err != nil {
		return 0, 0, err
	}
	return 1, written, nil
}

// copyFile 复制单个文件，返回写入字节数
// copyFile copies a single file and returns bytes written
func copyFile(src, dst string) (int64, error) {
	// 确保目标目录存在 / Ensure destination directory exists
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return 0, err
	}

	srcFile, err := os.Open(src)
	if err != nil {
		return 0, fmt.Errorf("打开源文件失败 / Failed to open source: %w", err)
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		return 0, fmt.Errorf("创建目标文件失败 / Failed to create destination: %w", err)
	}
	defer dstFile.Close()

	written, err := io.Copy(dstFile, srcFile)
	if err != nil {
		return 0, fmt.Errorf("复制数据失败 / Failed to copy data: %w", err)
	}

	// 保留文件权限 / Preserve file permissions
	srcInfo, err := os.Stat(src)
	if err == nil {
		os.Chmod(dst, srcInfo.Mode())
	}

	return written, nil
}

// shouldExclude 检查路径是否匹配排除模式
// shouldExclude checks if a path matches any exclude pattern
func shouldExclude(path, name string, excludes []string) bool {
	for _, pattern := range excludes {
		pattern = strings.TrimSpace(pattern)
		if pattern == "" {
			continue
		}

		// 匹配文件名 / Match against filename
		if matched, _ := filepath.Match(pattern, name); matched {
			return true
		}

		// 匹配完整路径 / Match against full path
		if matched, _ := filepath.Match(pattern, filepath.Base(path)); matched {
			return true
		}
	}
	return false
}

// === backup restore 命令 / backup restore command ===

// newBackupRestoreCmd 创建备份恢复命令
// newBackupRestoreCmd creates the backup restore command
func newBackupRestoreCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "restore <backup> <dest>",
		Short: "恢复备份 / Restore from backup",
		Long: `从备份恢复文件。支持 ZIP 压缩备份和目录备份。
ZIP 文件会自动解压到目标路径。
Restore files from a backup. Supports ZIP and directory backups.
ZIP files are automatically extracted to the destination path.`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runBackupRestore(args[0], args[1])
		},
	}

	return cmd
}

// runBackupRestore 执行备份恢复
// runBackupRestore implements backup restoration
func runBackupRestore(backup, dest string) error {
	backupInfo, err := os.Stat(backup)
	if err != nil {
		return fmt.Errorf("备份路径不存在 / Backup path not found '%s': %w", backup, err)
	}

	headerColor := color.New(color.FgCyan)
	headerColor.Println("=== 恢复备份 / Restoring Backup ===")
	headerColor.Printf("备份源 / Backup:  %s\n", backup)
	headerColor.Printf("目标路径 / Dest:  %s\n", dest)
	fmt.Println()

	startTime := time.Now()
	var fileCount int
	var totalSize int64

	if strings.HasSuffix(strings.ToLower(backup), ".zip") {
		// 从 ZIP 恢复 / Restore from ZIP
		fileCount, totalSize, err = restoreFromZip(backup, dest)
	} else if backupInfo.IsDir() {
		// 从目录恢复 / Restore from directory
		fileCount, totalSize, err = createCopyBackup(backup, dest, nil, true)
	} else {
		// 单文件恢复 / Single file restore
		written, copyErr := copyFile(backup, filepath.Join(dest, filepath.Base(backup)))
		fileCount = 1
		totalSize = written
		err = copyErr
	}

	if err != nil {
		return fmt.Errorf("恢复失败 / Restore failed: %w", err)
	}

	duration := time.Since(startTime)

	fmt.Println()
	color.New(color.FgGreen, color.Bold).Println("✓ 恢复完成 / Restore completed!")
	fmt.Printf("  文件数 / Files:    %d\n", fileCount)
	fmt.Printf("  总大小 / Size:     %s\n", formatBytes(totalSize))
	fmt.Printf("  耗时 / Duration:   %s\n", duration.Round(time.Millisecond))

	return nil
}

// restoreFromZip 从 ZIP 文件恢复
// restoreFromZip restores files from a ZIP archive
func restoreFromZip(zipPath, dest string) (int, int64, error) {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return 0, 0, fmt.Errorf("打开 ZIP 文件失败 / Failed to open ZIP file: %w", err)
	}
	defer reader.Close()

	var fileCount int
	var totalSize int64

	for _, file := range reader.File {
		destPath := filepath.Join(dest, file.Name)

		// 安全检查：防止 ZIP slip 攻击（路径穿越）
		// Security check: prevent ZIP slip attack (path traversal)
		if !strings.HasPrefix(filepath.Clean(destPath), filepath.Clean(dest)+string(os.PathSeparator)) {
			return fileCount, totalSize, fmt.Errorf("非法文件路径 / Illegal file path in ZIP: %s", file.Name)
		}

		// 显示进度 / Show progress
		fmt.Printf("\r  正在解压 / Extracting: %s", truncatePath(file.Name, 60))

		if file.FileInfo().IsDir() {
			os.MkdirAll(destPath, file.Mode())
			continue
		}

		// 确保父目录存在 / Ensure parent directory exists
		os.MkdirAll(filepath.Dir(destPath), 0755)

		// 解压文件 / Extract file
		srcFile, err := file.Open()
		if err != nil {
			return fileCount, totalSize, err
		}

		dstFile, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, file.Mode())
		if err != nil {
			srcFile.Close()
			return fileCount, totalSize, err
		}

		written, err := io.Copy(dstFile, srcFile)
		srcFile.Close()
		dstFile.Close()

		if err != nil {
			return fileCount, totalSize, err
		}

		fileCount++
		totalSize += written
	}

	// 清除进度行 / Clear progress line
	fmt.Print("\r" + strings.Repeat(" ", 80) + "\r")

	return fileCount, totalSize, nil
}

// === backup list 命令 / backup list command ===

// newBackupListCmd 创建备份列表命令
// newBackupListCmd creates the backup listing command
func newBackupListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list <backupdir>",
		Short: "列出可用备份 / List available backups",
		Long: `列出指定目录中的所有可用备份，显示日期、大小等信息。
优先从 manifest.json 读取元数据，否则从文件系统获取。
List all available backups in the specified directory with dates and sizes.
Reads metadata from manifest.json when available, otherwise from filesystem.`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runBackupList(args[0])
		},
	}

	return cmd
}

// runBackupList 执行备份列表
// runBackupList implements backup listing
func runBackupList(backupDir string) error {
	// 验证目录存在 / Verify directory exists
	if _, err := os.Stat(backupDir); err != nil {
		return fmt.Errorf("目录不存在 / Directory not found '%s': %w", backupDir, err)
	}

	headerColor := color.New(color.FgCyan)
	headerColor.Printf("=== 备份列表 / Available Backups in: %s ===\n\n", backupDir)

	// 查找清单文件 / Find manifest files
	manifests, err := filepath.Glob(filepath.Join(backupDir, "*.manifest.json"))
	if err != nil {
		return err
	}

	if len(manifests) > 0 {
		// 从清单文件显示备份信息 / Show backups from manifest files
		color.New(color.FgWhite, color.Bold).Printf("%-30s %-20s %-10s %-10s %s\n",
			"名称 / NAME", "创建时间 / CREATED", "文件数 / FILES", "大小 / SIZE", "压缩 / ZIP")
		fmt.Println(strings.Repeat("-", 90))

		for _, mf := range manifests {
			manifest, err := loadManifest(mf)
			if err != nil {
				color.New(color.FgYellow).Printf("  ⚠ 无法读取清单 / Cannot read manifest: %s\n", mf)
				continue
			}

			name := manifest.Name
			if len(name) > 28 {
				name = name[:25] + "..."
			}

			compressed := "否 / No"
			if manifest.Compressed {
				compressed = "是 / Yes"
			}

			fmt.Printf("%-30s %-20s %-10d %-10s %s\n",
				name,
				manifest.CreatedAt.Format("2006-01-02 15:04"),
				manifest.FileCount,
				formatBytes(manifest.TotalSize),
				compressed,
			)
		}
	} else {
		// 没有清单文件，扫描目录内容 / No manifests, scan directory contents
		color.New(color.FgYellow).Println("未找到备份清单文件，显示目录内容 / No manifests found, showing directory contents")
		fmt.Println()

		entries, err := os.ReadDir(backupDir)
		if err != nil {
			return err
		}

		color.New(color.FgWhite, color.Bold).Printf("%-40s %-20s %s\n",
			"名称 / NAME", "修改时间 / MODIFIED", "大小 / SIZE")
		fmt.Println(strings.Repeat("-", 70))

		for _, entry := range entries {
			info, err := entry.Info()
			if err != nil {
				continue
			}

			name := entry.Name()
			if len(name) > 38 {
				name = name[:35] + "..."
			}

			sizeStr := formatBytes(info.Size())
			if entry.IsDir() {
				sizeStr = "<DIR>"
				dirSize, _ := getDirSize(filepath.Join(backupDir, entry.Name()))
				if dirSize > 0 {
					sizeStr = fmt.Sprintf("<DIR> %s", formatBytes(dirSize))
				}
			}

			fmt.Printf("%-40s %-20s %s\n",
				name,
				info.ModTime().Format("2006-01-02 15:04"),
				sizeStr,
			)
		}
	}

	fmt.Printf("\n共计 / Total: %d 个备份 / backups\n", max(len(manifests), countEntries(backupDir)))
	return nil
}

// countEntries 统计目录条目数（不含清单文件）
// countEntries counts directory entries excluding manifest files
func countEntries(dir string) int {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0
	}
	count := 0
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".manifest.json") {
			count++
		}
	}
	return count
}

// getDirSize 递归计算目录大小
// getDirSize recursively calculates directory size
func getDirSize(path string) (int64, error) {
	var size int64
	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size, err
}

// === backup schedule 命令 / backup schedule command ===

// newBackupScheduleCmd 创建计划任务说明命令
// newBackupScheduleCmd creates the scheduled backup help command
func newBackupScheduleCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "schedule",
		Short: "设置自动备份计划 / Setup automated backup schedule",
		Long: `显示如何使用 Windows 任务计划程序设置自动备份的说明。
提供 schtasks 命令示例和 PowerShell 脚本模板。
Shows how to set up Windows Task Scheduler for automated backups.
Provides schtasks command examples and PowerShell script templates.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runBackupSchedule()
		},
	}

	return cmd
}

// runBackupSchedule 显示计划任务设置说明
// runBackupSchedule displays Task Scheduler setup instructions
func runBackupSchedule() error {
	headerColor := color.New(color.FgCyan)
	headerColor.Println("=== 自动备份计划设置 / Automated Backup Schedule Setup ===")
	fmt.Println()

	color.New(color.FgYellow, color.Bold).Println("方法一：使用 schtasks 命令 / Method 1: Using schtasks command")
	fmt.Println(strings.Repeat("-", 60))
	fmt.Println()
	fmt.Println("  每日备份（每天凌晨 2:00 执行）:")
	fmt.Println("  Daily backup (runs at 2:00 AM every day):")
	fmt.Println()
	color.New(color.FgGreen).Println(`  schtasks /create /tn "QingshanToolbox-Backup" /tr "qstoolbox backup create C:\Data D:\Backups --compress" /sc daily /st 02:00 /ru SYSTEM`)
	fmt.Println()

	fmt.Println("  每周备份（每周一凌晨 3:00 执行）:")
	fmt.Println("  Weekly backup (runs at 3:00 AM every Monday):")
	fmt.Println()
	color.New(color.FgGreen).Println(`  schtasks /create /tn "QingshanToolbox-WeeklyBackup" /tr "qstoolbox backup create C:\Data D:\Backups --compress --name weekly" /sc weekly /d MON /st 03:00 /ru SYSTEM`)
	fmt.Println()

	fmt.Println("  查看已创建的计划任务 / View created scheduled tasks:")
	fmt.Println()
	color.New(color.FgGreen).Println(`  schtasks /query /tn "QingshanToolbox-Backup" /v /fo LIST`)
	fmt.Println()

	fmt.Println("  删除计划任务 / Delete scheduled task:")
	fmt.Println()
	color.New(color.FgGreen).Println(`  schtasks /delete /tn "QingshanToolbox-Backup" /f`)
	fmt.Println()

	color.New(color.FgYellow, color.Bold).Println("方法二：PowerShell 脚本模板 / Method 2: PowerShell script template")
	fmt.Println(strings.Repeat("-", 60))
	fmt.Println()

	scriptTemplate := `# 备份脚本模板 / Backup script template
# 保存为 backup-task.ps1 / Save as backup-task.ps1

$Source = "C:\Data"
$Destination = "D:\Backups"
$LogFile = "D:\Backups\backup.log"
$MaxBackups = 30  # 保留最近30个备份 / Keep last 30 backups

# 执行备份 / Run backup
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $LogFile "$timestamp - 开始备份 / Starting backup..."

& qstoolbox backup create $Source $Destination --compress --exclude "*.tmp,*.log"

if ($LASTEXITCODE -eq 0) {
    Add-Content $LogFile "$timestamp - 备份成功 / Backup succeeded"
} else {
    Add-Content $LogFile "$timestamp - 备份失败 / Backup failed with code $LASTEXITCODE"
}

# 清理旧备份 / Clean up old backups
$backups = Get-ChildItem $Destination -Filter "*.zip" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt $MaxBackups) {
    $backups | Select-Object -Skip $MaxBackups | Remove-Item -Force
    Add-Content $LogFile "$timestamp - 已清理旧备份 / Old backups cleaned up"
}`

	color.New(color.FgGreen).Println(scriptTemplate)
	fmt.Println()

	fmt.Println("  使用 PowerShell 创建计划任务 / Create scheduled task with PowerShell:")
	fmt.Println()
	color.New(color.FgGreen).Println(`  $action = New-ScheduledTaskAction -Execute "powershell" -Argument "-File C:\Scripts\backup-task.ps1"`)
	color.New(color.FgGreen).Println(`  $trigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"`)
	color.New(color.FgGreen).Println(`  Register-ScheduledTask -TaskName "QingshanToolbox-Backup" -Action $action -Trigger $trigger -RunLevel Highest`)
	fmt.Println()

	return nil
}

// === 辅助函数 / Helper functions ===

// saveManifest 保存备份清单到 JSON 文件
// saveManifest saves a backup manifest to a JSON file
func saveManifest(path string, manifest models.BackupManifest) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(manifest)
}

// loadManifest 从 JSON 文件加载备份清单
// loadManifest loads a backup manifest from a JSON file
func loadManifest(path string) (*models.BackupManifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var manifest models.BackupManifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}

	return &manifest, nil
}

// formatBytes 将字节数格式化为人类可读的字符串
// formatBytes formats bytes into human-readable string
func formatBytes(bytes int64) string {
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

// truncatePath 截断路径字符串到指定长度
// truncatePath truncates a path string to the specified length
func truncatePath(path string, maxLen int) string {
	if len(path) <= maxLen {
		return path + strings.Repeat(" ", maxLen-len(path))
	}
	return "..." + path[len(path)-maxLen+3:]
}

// max 返回两个整数中的较大值
// max returns the larger of two integers
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
