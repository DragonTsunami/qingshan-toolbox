# Dockerfile for QingShan Toolbox / 青衫工具箱 Docker 构建文件
# Multi-stage build for minimal image size / 多阶段构建，最小化镜像体积

# ============================================================
# Stage 1: Build / 构建阶段
# ============================================================
FROM golang:1.22-alpine AS builder

# Install build dependencies / 安装构建依赖
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory / 设置工作目录
WORKDIR /build

# Copy go.mod and go.sum first for better layer caching
# 先复制依赖文件以利用 Docker 层缓存
COPY go.mod go.sum ./
RUN go mod download

# Copy source code / 复制源代码
COPY . .

# Build the binary / 构建二进制文件
# CGO_ENABLED=0 for static linking / 静态链接
# -s -w to strip debug info / 去除调试信息以减小体积
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -X github.com/qingshan/toolbox/internal/config.Version=${VERSION}" \
    -o /build/qstoolbox \
    ./cmd/qstoolbox

# ============================================================
# Stage 2: Runtime / 运行阶段
# ============================================================
FROM alpine:3.20

# Add labels / 添加镜像标签
LABEL maintainer="QingShan Contributors"
LABEL org.opencontainers.image.title="QingShan Toolbox"
LABEL org.opencontainers.image.description="An all-in-one IT operations toolkit / 一站式 IT 运维工具箱"
LABEL org.opencontainers.image.source="https://github.com/qingshan/toolbox"
LABEL org.opencontainers.image.licenses="MIT"

# Install runtime dependencies / 安装运行时依赖
# ca-certificates: for HTTPS connections / 用于 HTTPS 连接
# tzdata: for timezone support / 用于时区支持
RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -h /home/qstoolbox qstoolbox

# Copy binary from builder / 从构建阶段复制二进制文件
COPY --from=builder /build/qstoolbox /usr/local/bin/qstoolbox

# Copy default config if exists / 复制默认配置（如有）
# COPY configs/qstoolbox.example.yaml /etc/qstoolbox/qstoolbox.yaml

# Use non-root user / 使用非 root 用户
USER qstoolbox
WORKDIR /home/qstoolbox

# Set entrypoint / 设置入口
ENTRYPOINT ["qstoolbox"]
CMD ["--help"]
