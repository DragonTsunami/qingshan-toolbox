// Package main 是青衫工具箱的入口点。
// Package main is the entry point for QingShan Toolbox.
package main

import (
	"os"

	"github.com/qingshan/toolbox/internal/cli"
)

func main() {
	// 执行根命令 / Execute the root command
	if err := cli.Execute(); err != nil {
		os.Exit(1)
	}
}
