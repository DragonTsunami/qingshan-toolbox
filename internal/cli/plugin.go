// Package cli 提供去中心化插件管理命令实现。
package cli

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

// pluginCmd 插件管理命令组
var pluginCmd = &cobra.Command{
	Use:   "plugin",
	Short: "去中心化插件扩展管理 / Decentralized plugin manager",
	Long: `青衫工具箱去中心化插件系统：
无需中央审核服务器或插件市场开销，直接通过 Git 仓库或 NPM 包管理本机扩展。
所有插件均存储在本地 ~/.qstoolbox/plugins/ 目录。`,
}

func getPluginsDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	dir := filepath.Join(home, ".qstoolbox", "plugins")
	_ = os.MkdirAll(dir, 0755)
	return dir
}

// pluginListCmd 列出本机已安装插件
var pluginListCmd = &cobra.Command{
	Use:   "list",
	Short: "展示本机已安装并加载的插件列表 / List locally installed plugins",
	Run: func(cmd *cobra.Command, args []string) {
		pluginsDir := getPluginsDir()
		color.Cyan("\n╔══════════════════════════════════════════════════╗")
		color.Cyan("║       青衫工具箱 · 本机已安装插件列表            ║")
		color.Cyan("╚══════════════════════════════════════════════════╝")
		fmt.Printf("📂 存储根目录: %s\n\n", pluginsDir)

		entries, err := os.ReadDir(pluginsDir)
		if err != nil || len(entries) == 0 {
			color.Yellow("暂无已安装的插件扩展。")
			fmt.Println("提示: 可使用 `qstoolbox plugin install <git-url | npm-pkg>` 安装扩展。")
			return
		}

		count := 0
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			count++
			pName := e.Name()
			manifestPath := filepath.Join(pluginsDir, pName, "package.json")
			version := "v1.0.0"
			desc := "本地自定义运维扩展"

			if data, err := os.ReadFile(manifestPath); err == nil {
				var pkg struct {
					Version     string `json:"version"`
					Description string `json:"description"`
				}
				if json.Unmarshal(data, &pkg) == nil {
					if pkg.Version != "" {
						version = "v" + strings.TrimPrefix(pkg.Version, "v")
					}
					if pkg.Description != "" {
						desc = pkg.Description
					}
				}
			}

			color.Green("  [%d] %-24s %-10s", count, pName, version)
			fmt.Printf("      描述: %s\n", desc)
			fmt.Printf("      路径: %s\n\n", filepath.Join(pluginsDir, pName))
		}

		fmt.Printf("总计加载 %d 个扩展。\n", count)
	},
}

// pluginInstallCmd 安装插件 (Git 或 NPM)
var pluginInstallCmd = &cobra.Command{
	Use:   "install [git-url | npm-package]",
	Short: "通过 Git 仓库克隆或 NPM 安装扩展 / Install via Git clone or NPM",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		target := strings.TrimSpace(args[0])
		pluginsDir := getPluginsDir()

		isGit := strings.HasPrefix(target, "http://") ||
			strings.HasPrefix(target, "https://") ||
			strings.HasPrefix(target, "git@") ||
			strings.HasSuffix(target, ".git")

		if isGit {
			// Git 安装逻辑
			repoName := filepath.Base(target)
			repoName = strings.TrimSuffix(repoName, ".git")
			dest := filepath.Join(pluginsDir, repoName)

			if _, err := os.Stat(dest); err == nil {
				return fmt.Errorf("插件目录已存在: %s", dest)
			}

			color.Cyan("➜ 正在从 Git 仓库克隆插件: %s", target)
			gitCmd := exec.Command("git", "clone", "--depth", "1", target, dest)
			gitCmd.Stdout = os.Stdout
			gitCmd.Stderr = os.Stderr
			if err := gitCmd.Run(); err != nil {
				return fmt.Errorf("git clone 失败: %w", err)
			}

			color.Green("✔ Git 扩展 [%s] 安装成功！已就绪。", repoName)
			return nil
		}

		// NPM 安装逻辑
		cleanName := strings.ReplaceAll(target, "/", "_")
		cleanName = strings.ReplaceAll(cleanName, "@", "")
		dest := filepath.Join(pluginsDir, cleanName)
		_ = os.MkdirAll(dest, 0755)

		color.Cyan("➜ 正在通过 NPM 安装插件包: %s", target)
		npmCmd := exec.Command("npm", "install", target, "--prefix", dest)
		npmCmd.Stdout = os.Stdout
		npmCmd.Stderr = os.Stderr
		if err := npmCmd.Run(); err != nil {
			return fmt.Errorf("npm install 失败: %w", err)
		}

		color.Green("✔ NPM 扩展 [%s] 安装成功！已就绪。", target)
		return nil
	},
}

// pluginUninstallCmd 卸载插件
var pluginUninstallCmd = &cobra.Command{
	Use:   "uninstall [plugin-name]",
	Short: "移除本机已安装的扩展插件 / Uninstall local plugin",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pName := args[0]
		targetDir := filepath.Join(getPluginsDir(), pName)

		if _, err := os.Stat(targetDir); os.IsNotExist(err) {
			return fmt.Errorf("未找到插件: %s", pName)
		}

		if err := os.RemoveAll(targetDir); err != nil {
			return fmt.Errorf("移除插件失败: %w", err)
		}

		color.Green("✔ 插件 [%s] 已从本机移除。", pName)
		return nil
	},
}

// pluginDirCmd 打开插件目录
var pluginDirCmd = &cobra.Command{
	Use:   "dir",
	Short: "查看或在文件管理器中打开本机插件根目录 / Open plugins folder",
	Run: func(cmd *cobra.Command, args []string) {
		dir := getPluginsDir()
		fmt.Printf("本机插件根目录: %s\n", dir)
		_ = exec.Command("explorer", dir).Start()
	},
}

func init() {
	pluginCmd.AddCommand(pluginListCmd)
	pluginCmd.AddCommand(pluginInstallCmd)
	pluginCmd.AddCommand(pluginUninstallCmd)
	pluginCmd.AddCommand(pluginDirCmd)
}
