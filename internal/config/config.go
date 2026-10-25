// Package config 提供配置管理功能。
// Package config provides configuration management.
package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config 是应用程序的完整配置结构。
// Config is the complete application configuration struct.
type Config struct {
	General       GeneralConfig       `yaml:"general"       mapstructure:"general"`
	Thresholds    ThresholdsConfig    `yaml:"thresholds"    mapstructure:"thresholds"`
	Hosts         []HostConfig        `yaml:"hosts"         mapstructure:"hosts"`
	Notifications NotificationsConfig `yaml:"notifications" mapstructure:"notifications"`
	DiskWatch     DiskWatchConfig     `yaml:"disk_watch"    mapstructure:"disk_watch"`
	Logging       LoggingConfig       `yaml:"logging"       mapstructure:"logging"`
	Backup        BackupConfig        `yaml:"backup"        mapstructure:"backup"`
}

// GeneralConfig 通用设置 / General settings.
type GeneralConfig struct {
	OutputFormat string `yaml:"output_format" mapstructure:"output_format"` // 输出格式: text, json, table
	Color        bool   `yaml:"color"         mapstructure:"color"`         // 是否启用颜色
	Verbose      bool   `yaml:"verbose"       mapstructure:"verbose"`       // 详细模式
}

// ThresholdsConfig 健康检查阈值 / Health check thresholds.
type ThresholdsConfig struct {
	CPU    ResourceThreshold `yaml:"cpu"    mapstructure:"cpu"`
	Memory ResourceThreshold `yaml:"memory" mapstructure:"memory"`
	Disk   ResourceThreshold `yaml:"disk"   mapstructure:"disk"`
}

// ResourceThreshold 资源使用率阈值 / Resource usage thresholds.
type ResourceThreshold struct {
	Warning  float64 `yaml:"warning"  mapstructure:"warning"`  // 警告阈值(%)
	Critical float64 `yaml:"critical" mapstructure:"critical"` // 严重阈值(%)
}

// HostConfig 主机配置 / Host configuration.
type HostConfig struct {
	Name string   `yaml:"name" mapstructure:"name"` // 主机名称
	Host string   `yaml:"host" mapstructure:"host"` // 主机地址
	Port int      `yaml:"port" mapstructure:"port"` // SSH 端口
	User string   `yaml:"user" mapstructure:"user"` // SSH 用户
	Tags []string `yaml:"tags" mapstructure:"tags"` // 标签
}

// NotificationsConfig 通知设置 / Notification settings.
type NotificationsConfig struct {
	Enabled bool          `yaml:"enabled" mapstructure:"enabled"`
	Email   EmailConfig   `yaml:"email"   mapstructure:"email"`
	Webhook WebhookConfig `yaml:"webhook" mapstructure:"webhook"`
}

// EmailConfig 邮件通知配置 / Email notification config.
type EmailConfig struct {
	SMTPHost string   `yaml:"smtp_host" mapstructure:"smtp_host"`
	SMTPPort int      `yaml:"smtp_port" mapstructure:"smtp_port"`
	From     string   `yaml:"from"      mapstructure:"from"`
	To       []string `yaml:"to"        mapstructure:"to"`
	Username string   `yaml:"username"  mapstructure:"username"`
	Password string   `yaml:"password"  mapstructure:"password"`
}

// WebhookConfig Webhook 通知配置 / Webhook notification config.
type WebhookConfig struct {
	URL  string `yaml:"url"  mapstructure:"url"`
	Type string `yaml:"type" mapstructure:"type"` // dingtalk, wecom, slack, custom
}

// DiskWatchConfig 磁盘监控配置 / Disk monitoring config.
type DiskWatchConfig struct {
	Interval  int      `yaml:"interval"  mapstructure:"interval"`  // 检查间隔(秒)
	Paths     []string `yaml:"paths"     mapstructure:"paths"`     // 监控路径
	Threshold float64  `yaml:"threshold" mapstructure:"threshold"` // 使用率阈值(%)
}

// LoggingConfig 日志配置 / Logging config.
type LoggingConfig struct {
	File       string `yaml:"file"        mapstructure:"file"`        // 日志文件路径
	Level      string `yaml:"level"       mapstructure:"level"`       // 日志级别
	MaxSize    int    `yaml:"max_size"    mapstructure:"max_size"`    // 最大文件大小(MB)
	MaxBackups int    `yaml:"max_backups" mapstructure:"max_backups"` // 保留文件数量
}

// BackupConfig 备份配置 / Backup config.
type BackupConfig struct {
	Destination string `yaml:"destination" mapstructure:"destination"` // 备份目录
	Format      string `yaml:"format"      mapstructure:"format"`      // 压缩格式
	Keep        int    `yaml:"keep"        mapstructure:"keep"`        // 保留份数
}

// AppConfig 是全局配置实例 / Global config instance.
var AppConfig Config

// Init 初始化配置 / Initialize configuration.
// 如果 cfgFile 为空，则使用默认路径 ~/.qstoolbox/config.yaml
// If cfgFile is empty, uses default path ~/.qstoolbox/config.yaml
func Init(cfgFile string) error {
	if cfgFile != "" {
		// 使用指定的配置文件 / Use specified config file
		viper.SetConfigFile(cfgFile)
	} else {
		// 查找用户主目录 / Find user home directory
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("无法获取用户主目录 / cannot get user home directory: %w", err)
		}

		configDir := filepath.Join(home, ".qstoolbox")
		viper.AddConfigPath(configDir)
		viper.AddConfigPath(".")
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
	}

	// 设置默认值 / Set default values
	setDefaults()

	// 环境变量前缀 / Environment variable prefix
	viper.SetEnvPrefix("QSTOOLBOX")
	viper.AutomaticEnv()

	// 读取配置文件（不存在时使用默认值）
	// Read config file (use defaults if not found)
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return fmt.Errorf("读取配置文件失败 / failed to read config: %w", err)
		}
		// 配置文件不存在，使用默认值 / Config file not found, using defaults
	}

	// 解析到结构体 / Unmarshal to struct
	if err := viper.Unmarshal(&AppConfig); err != nil {
		return fmt.Errorf("解析配置失败 / failed to unmarshal config: %w", err)
	}

	return nil
}

// setDefaults 设置默认配置值 / Set default configuration values.
func setDefaults() {
	// 通用设置 / General settings
	viper.SetDefault("general.output_format", "text")
	viper.SetDefault("general.color", true)
	viper.SetDefault("general.verbose", false)

	// 阈值 / Thresholds
	viper.SetDefault("thresholds.cpu.warning", 80.0)
	viper.SetDefault("thresholds.cpu.critical", 95.0)
	viper.SetDefault("thresholds.memory.warning", 80.0)
	viper.SetDefault("thresholds.memory.critical", 95.0)
	viper.SetDefault("thresholds.disk.warning", 85.0)
	viper.SetDefault("thresholds.disk.critical", 95.0)

	// 磁盘监控 / Disk watch
	viper.SetDefault("disk_watch.interval", 60)
	viper.SetDefault("disk_watch.threshold", 90.0)

	// 日志 / Logging
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.max_size", 50)
	viper.SetDefault("logging.max_backups", 3)

	// 备份 / Backup
	viper.SetDefault("backup.format", "zip")
	viper.SetDefault("backup.keep", 5)
}

// GetThresholds 返回当前阈值配置 / Returns current threshold configuration.
func GetThresholds() ThresholdsConfig {
	return AppConfig.Thresholds
}

// GetHosts 返回主机清单 / Returns host inventory.
func GetHosts() []HostConfig {
	return AppConfig.Hosts
}

// GetOutputFormat 返回当前输出格式 / Returns current output format.
func GetOutputFormat() string {
	return AppConfig.General.OutputFormat
}

// IsVerbose 返回是否启用详细模式 / Returns whether verbose mode is enabled.
func IsVerbose() bool {
	return AppConfig.General.Verbose
}
