# 青衫工具箱 Makefile / QingShan Toolbox Makefile
# ================================================

APP_NAME := qstoolbox
MODULE := github.com/qingshan/toolbox
VERSION := v0.1.0
BUILD_DIR := bin
MAIN_PKG := ./cmd/qstoolbox

# 编译标志 / Build flags
LDFLAGS := -ldflags "-s -w -X $(MODULE)/internal/cli.Version=$(VERSION)"
GOFLAGS := -trimpath

.PHONY: all build build-linux test lint clean install fmt vet

# 默认目标 / Default target
all: clean build

# 编译 Windows 可执行文件 / Build Windows executable
build:
	@echo "==> 编译 Windows 版本 / Building for Windows..."
	SET GOOS=windows&& SET GOARCH=amd64&& go build $(GOFLAGS) $(LDFLAGS) -o $(BUILD_DIR)/$(APP_NAME).exe $(MAIN_PKG)
	@echo "==> 编译完成 / Build complete: $(BUILD_DIR)/$(APP_NAME).exe"

# 编译 Linux 可执行文件 / Build Linux executable
build-linux:
	@echo "==> 编译 Linux 版本 / Building for Linux..."
	SET GOOS=linux&& SET GOARCH=amd64&& go build $(GOFLAGS) $(LDFLAGS) -o $(BUILD_DIR)/$(APP_NAME)-linux $(MAIN_PKG)
	@echo "==> 编译完成 / Build complete: $(BUILD_DIR)/$(APP_NAME)-linux"

# 运行测试 / Run tests
test:
	@echo "==> 运行测试 / Running tests..."
	go test -v -race -coverprofile=coverage.out ./...
	@echo "==> 测试完成 / Tests complete"

# 代码检查 / Lint code
lint:
	@echo "==> 代码检查 / Linting..."
	golangci-lint run ./...

# 格式化代码 / Format code
fmt:
	@echo "==> 格式化代码 / Formatting..."
	gofmt -s -w .

# 静态分析 / Vet code
vet:
	@echo "==> 静态分析 / Vetting..."
	go vet ./...

# 清理编译产物 / Clean build artifacts
clean:
	@echo "==> 清理 / Cleaning..."
	IF EXIST $(BUILD_DIR) RMDIR /S /Q $(BUILD_DIR)
	IF EXIST coverage.out DEL coverage.out
	@echo "==> 清理完成 / Clean complete"

# 安装到 GOPATH/bin / Install to GOPATH/bin
install:
	@echo "==> 安装 / Installing..."
	go install $(GOFLAGS) $(LDFLAGS) $(MAIN_PKG)
	@echo "==> 安装完成 / Install complete"
