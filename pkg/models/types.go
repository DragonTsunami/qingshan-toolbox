// Package models 提供青衫工具箱的共享类型定义
// Package models provides shared type definitions for qingshan-toolbox
package models

import "time"

// Status 表示健康检查状态枚举
// Status represents health check status enum
type Status string

const (
	// StatusHealthy 健康状态 / Healthy status
	StatusHealthy Status = "healthy"
	// StatusWarning 警告状态 / Warning status
	StatusWarning Status = "warning"
	// StatusCritical 严重状态 / Critical status
	StatusCritical Status = "critical"
	// StatusUnknown 未知状态 / Unknown status
	StatusUnknown Status = "unknown"
)

// HostInfo 主机信息结构体
// HostInfo represents information about a remote host
type HostInfo struct {
	// Hostname 主机名 / Hostname or IP address
	Hostname string `json:"hostname" yaml:"hostname"`
	// IP 地址 / IP address
	IP string `json:"ip" yaml:"ip"`
	// Port SSH端口 / SSH port
	Port int `json:"port" yaml:"port"`
	// User 登录用户名 / Login username
	User string `json:"user" yaml:"user"`
	// Group 主机分组 / Host group for batch operations
	Group string `json:"group" yaml:"group"`
	// OS 操作系统 / Operating system
	OS string `json:"os" yaml:"os"`
	// Arch 架构 / CPU architecture
	Arch string `json:"arch" yaml:"arch"`
	// LastSeen 最后在线时间 / Last seen timestamp
	LastSeen time.Time `json:"last_seen" yaml:"last_seen"`
	// Tags 标签 / Tags for categorization
	Tags []string `json:"tags,omitempty" yaml:"tags,omitempty"`
}

// ServiceInfo 服务信息结构体
// ServiceInfo represents information about a Windows service
type ServiceInfo struct {
	// Name 服务名称 / Service name (internal)
	Name string `json:"name" yaml:"name"`
	// DisplayName 显示名称 / Service display name
	DisplayName string `json:"display_name" yaml:"display_name"`
	// Status 运行状态 / Service status (Running, Stopped, etc.)
	Status string `json:"status" yaml:"status"`
	// StartType 启动类型 / Start type (Automatic, Manual, Disabled)
	StartType string `json:"start_type" yaml:"start_type"`
	// PID 进程ID / Process ID
	PID int `json:"pid" yaml:"pid"`
	// BinaryPath 可执行文件路径 / Path to the service binary
	BinaryPath string `json:"binary_path" yaml:"binary_path"`
	// Account 运行账户 / Service logon account
	Account string `json:"account" yaml:"account"`
	// Description 描述 / Service description
	Description string `json:"description,omitempty" yaml:"description,omitempty"`
}

// DiskInfo 磁盘信息结构体
// DiskInfo represents disk volume information
type DiskInfo struct {
	// Drive 盘符 / Drive letter (e.g., "C:")
	Drive string `json:"drive" yaml:"drive"`
	// Label 卷标 / Volume label
	Label string `json:"label,omitempty" yaml:"label,omitempty"`
	// FileSystem 文件系统 / File system type (NTFS, FAT32, etc.)
	FileSystem string `json:"file_system" yaml:"file_system"`
	// TotalBytes 总容量(字节) / Total capacity in bytes
	TotalBytes uint64 `json:"total_bytes" yaml:"total_bytes"`
	// FreeBytes 可用容量(字节) / Free space in bytes
	FreeBytes uint64 `json:"free_bytes" yaml:"free_bytes"`
	// UsedBytes 已用容量(字节) / Used space in bytes
	UsedBytes uint64 `json:"used_bytes" yaml:"used_bytes"`
	// UsedPercent 使用百分比 / Usage percentage
	UsedPercent float64 `json:"used_percent" yaml:"used_percent"`
	// Model 磁盘型号(物理磁盘) / Disk model (physical disk)
	Model string `json:"model,omitempty" yaml:"model,omitempty"`
}

// BackupManifest 备份清单结构体
// BackupManifest records metadata about a backup operation
type BackupManifest struct {
	// ID 备份唯一标识 / Unique backup identifier
	ID string `json:"id" yaml:"id"`
	// Name 备份名称 / Backup name
	Name string `json:"name" yaml:"name"`
	// Source 源路径 / Source path that was backed up
	Source string `json:"source" yaml:"source"`
	// Destination 目标路径 / Destination path of the backup
	Destination string `json:"destination" yaml:"destination"`
	// CreatedAt 创建时间 / Timestamp when backup was created
	CreatedAt time.Time `json:"created_at" yaml:"created_at"`
	// FileCount 文件总数 / Total number of files in backup
	FileCount int `json:"file_count" yaml:"file_count"`
	// TotalSize 总大小(字节) / Total size in bytes
	TotalSize int64 `json:"total_size" yaml:"total_size"`
	// Compressed 是否压缩 / Whether the backup is compressed (zip)
	Compressed bool `json:"compressed" yaml:"compressed"`
	// Excludes 排除模式列表 / Patterns excluded from backup
	Excludes []string `json:"excludes,omitempty" yaml:"excludes,omitempty"`
	// Checksum 校验和 / Integrity checksum (SHA256)
	Checksum string `json:"checksum,omitempty" yaml:"checksum,omitempty"`
	// Hostname 主机名 / Hostname where backup was created
	Hostname string `json:"hostname" yaml:"hostname"`
	// Version 工具版本 / Toolbox version used for backup
	Version string `json:"version" yaml:"version"`
}

// CheckResult 检查结果结构体
// CheckResult represents the result of a system health check
type CheckResult struct {
	// Name 检查项名称 / Name of the check item
	Name string `json:"name" yaml:"name"`
	// Category 检查类别 / Check category (cpu, memory, disk, network, service)
	Category string `json:"category" yaml:"category"`
	// Status 检查状态 / Check status (healthy/warning/critical)
	Status Status `json:"status" yaml:"status"`
	// Message 检查结果描述 / Human-readable result message
	Message string `json:"message" yaml:"message"`
	// Value 检查值 / Raw value from the check
	Value string `json:"value,omitempty" yaml:"value,omitempty"`
	// Threshold 阈值 / Threshold that triggered the status
	Threshold string `json:"threshold,omitempty" yaml:"threshold,omitempty"`
	// Timestamp 检查时间 / When the check was performed
	Timestamp time.Time `json:"timestamp" yaml:"timestamp"`
}

// LogEntry 日志条目结构体
// LogEntry represents a parsed log entry
type LogEntry struct {
	// Timestamp 日志时间 / Log timestamp
	Timestamp time.Time `json:"timestamp" yaml:"timestamp"`
	// Level 日志级别 / Log level (ERROR, WARN, INFO, DEBUG)
	Level string `json:"level" yaml:"level"`
	// Source 来源 / Log source (filename, event source, etc.)
	Source string `json:"source" yaml:"source"`
	// Message 消息内容 / Log message content
	Message string `json:"message" yaml:"message"`
	// LineNumber 行号 / Line number in the source file
	LineNumber int `json:"line_number,omitempty" yaml:"line_number,omitempty"`
	// Fields 附加字段 / Additional structured fields
	Fields map[string]string `json:"fields,omitempty" yaml:"fields,omitempty"`
}

// SoftwareInfo 软件信息结构体
// SoftwareInfo represents information about an installed software package
type SoftwareInfo struct {
	// Name 软件名称 / Software display name
	Name string `json:"name" yaml:"name"`
	// Version 版本号 / Installed version
	Version string `json:"version" yaml:"version"`
	// Publisher 发布者 / Software publisher/vendor
	Publisher string `json:"publisher,omitempty" yaml:"publisher,omitempty"`
	// InstallDate 安装日期 / Installation date (YYYYMMDD)
	InstallDate string `json:"install_date,omitempty" yaml:"install_date,omitempty"`
	// InstallLocation 安装路径 / Installation directory
	InstallLocation string `json:"install_location,omitempty" yaml:"install_location,omitempty"`
	// EstimatedSize 估计大小(KB) / Estimated size in kilobytes
	EstimatedSize int64 `json:"estimated_size,omitempty" yaml:"estimated_size,omitempty"`
	// UninstallString 卸载命令 / Uninstall command string
	UninstallString string `json:"uninstall_string,omitempty" yaml:"uninstall_string,omitempty"`
	// Architecture 架构 / Software architecture (x86, x64)
	Architecture string `json:"architecture,omitempty" yaml:"architecture,omitempty"`
}

// RemoteResult 远程执行结果结构体
// RemoteResult represents the result of a remote command execution
type RemoteResult struct {
	// Host 目标主机 / Target host
	Host string `json:"host" yaml:"host"`
	// Status 执行状态 / Execution status (success/error)
	Status string `json:"status" yaml:"status"`
	// Output 输出内容 / Command output (stdout)
	Output string `json:"output" yaml:"output"`
	// Error 错误信息 / Error message if any
	Error string `json:"error,omitempty" yaml:"error,omitempty"`
	// ExitCode 退出码 / Command exit code
	ExitCode int `json:"exit_code" yaml:"exit_code"`
	// Duration 执行耗时 / Execution duration
	Duration time.Duration `json:"duration" yaml:"duration"`
}

// HardwareInfo 硬件信息结构体
// HardwareInfo represents hardware inventory data
type HardwareInfo struct {
	// CPUModel CPU型号 / CPU model name
	CPUModel string `json:"cpu_model" yaml:"cpu_model"`
	// CPUCores CPU核心数 / Number of CPU cores
	CPUCores int `json:"cpu_cores" yaml:"cpu_cores"`
	// CPUThreads CPU线程数 / Number of CPU threads
	CPUThreads int `json:"cpu_threads" yaml:"cpu_threads"`
	// TotalRAM 总内存(字节) / Total RAM in bytes
	TotalRAM uint64 `json:"total_ram" yaml:"total_ram"`
	// Disks 磁盘列表 / List of disk information
	Disks []DiskInfo `json:"disks" yaml:"disks"`
	// NICs 网卡列表 / Network interface cards
	NICs []NICInfo `json:"nics" yaml:"nics"`
	// OSName 操作系统名称 / OS name
	OSName string `json:"os_name" yaml:"os_name"`
	// OSVersion 操作系统版本 / OS version
	OSVersion string `json:"os_version" yaml:"os_version"`
	// OSBuild 操作系统构建号 / OS build number
	OSBuild string `json:"os_build" yaml:"os_build"`
	// Hostname 主机名 / Computer hostname
	Hostname string `json:"hostname" yaml:"hostname"`
	// SerialNumber 序列号 / System serial number
	SerialNumber string `json:"serial_number,omitempty" yaml:"serial_number,omitempty"`
	// Manufacturer 制造商 / System manufacturer
	Manufacturer string `json:"manufacturer,omitempty" yaml:"manufacturer,omitempty"`
	// Model 型号 / System model
	Model string `json:"model,omitempty" yaml:"model,omitempty"`
}

// NICInfo 网卡信息结构体
// NICInfo represents network interface card information
type NICInfo struct {
	// Name 网卡名称 / NIC name
	Name string `json:"name" yaml:"name"`
	// MACAddress MAC地址 / MAC address
	MACAddress string `json:"mac_address" yaml:"mac_address"`
	// IPAddresses IP地址列表 / List of IP addresses
	IPAddresses []string `json:"ip_addresses,omitempty" yaml:"ip_addresses,omitempty"`
	// Speed 速率 / Link speed
	Speed string `json:"speed,omitempty" yaml:"speed,omitempty"`
	// Status 状态 / Connection status
	Status string `json:"status" yaml:"status"`
}

// WindowsEvent Windows事件日志条目
// WindowsEvent represents a Windows Event Log entry
type WindowsEvent struct {
	// TimeCreated 事件创建时间 / Event creation timestamp
	TimeCreated time.Time `json:"time_created" yaml:"time_created"`
	// Level 事件级别 / Event level (Error, Warning, Information)
	Level string `json:"level" yaml:"level"`
	// Source 事件源 / Event source
	Source string `json:"source" yaml:"source"`
	// EventID 事件ID / Event ID number
	EventID int `json:"event_id" yaml:"event_id"`
	// Message 事件消息 / Event message
	Message string `json:"message" yaml:"message"`
	// LogName 日志名称 / Log name (Application, System, Security)
	LogName string `json:"log_name" yaml:"log_name"`
}
