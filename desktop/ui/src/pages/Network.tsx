import {
  ApiOutlined,
  CloudOutlined,
  CompassOutlined,
  GlobalOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { App, Button, Input, InputNumber, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { checkPort, listInterfaces, resolveHost } from "../api";
import { formatBytes } from "../format";
import type { DnsLookupResult, NetworkInterface, PortCheckResult } from "../types";

export default function NetworkPage() {
  const { message } = App.useApp();
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(true);

  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState<number>(443);
  const [checking, setChecking] = useState(false);
  const [portResult, setPortResult] = useState<PortCheckResult | null>(null);

  const [dnsHost, setDnsHost] = useState("github.com");
  const [resolving, setResolving] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsLookupResult | null>(null);

  const loadInterfaces = useCallback(async () => {
    try {
      setInterfaces(await listInterfaces());
    } catch (error) {
      message.error(String(error));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadInterfaces();
  }, [loadInterfaces]);

  const runPortCheck = async () => {
    if (!host.trim()) {
      message.warning("请输入主机地址");
      return;
    }
    setChecking(true);
    try {
      setPortResult(await checkPort(host.trim(), port, 1500));
    } catch (error) {
      message.error(String(error));
    } finally {
      setChecking(false);
    }
  };

  const runResolve = async () => {
    if (!dnsHost.trim()) {
      message.warning("请输入域名");
      return;
    }
    setResolving(true);
    try {
      setDnsResult(await resolveHost(dnsHost.trim()));
    } catch (error) {
      message.error(String(error));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="page-stack network-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>网络接口</h3>
            <p>{interfaces.length} 个活动接口 · 不含回环设备</p>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void loadInterfaces()} loading={loading}>
            重新扫描
          </Button>
        </div>

        <div className="interface-grid">
          {interfaces.map((item) => (
            <article className="interface-card" key={item.name}>
              <div className="interface-head">
                <span className={`interface-icon${item.isUp ? " up" : ""}`}>
                  {item.ipv4.length > 0 ? <WifiOutlined /> : <CloudOutlined />}
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <span className="mono">{item.mac}</span>
                </div>
                <Tag bordered={false} color={item.isUp ? "success" : "default"}>
                  {item.isUp ? "UP" : "DOWN"}
                </Tag>
              </div>
              <div className="interface-ips">
                {item.ipv4.map((ip) => (
                  <span className="ip-chip" key={ip}>
                    <GlobalOutlined /> {ip}
                  </span>
                ))}
                {item.ipv6.slice(0, 2).map((ip) => (
                  <span className="ip-chip ipv6" key={ip}>
                    {ip}
                  </span>
                ))}
                {item.ipv4.length === 0 && item.ipv6.length === 0 && (
                  <span className="muted">未分配 IP 地址</span>
                )}
              </div>
              <div className="interface-traffic">
                <span>接收 {formatBytes(item.totalReceived)}</span>
                <span>发送 {formatBytes(item.totalTransmitted)}</span>
              </div>
            </article>
          ))}
          {!loading && interfaces.length === 0 && (
            <div className="empty-state">未发现可用的网络接口</div>
          )}
        </div>
      </section>

      <div className="split-row network-tools">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>端口连通性</h3>
              <p>TCP 握手检测，适用于数据库、SSH、Web 服务</p>
            </div>
            <ThunderboltOutlined className="panel-icon" />
          </div>

          <div className="port-form">
            <Input
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="主机或域名"
              prefix={<CompassOutlined />}
              onPressEnter={() => void runPortCheck()}
            />
            <InputNumber
              value={port}
              min={1}
              max={65535}
              onChange={(value) => setPort(value ?? 443)}
              className="port-input"
            />
            <Button type="primary" loading={checking} onClick={() => void runPortCheck()}>
              检测
            </Button>
          </div>

          <div className="quick-targets">
            {[
              { label: "本机 443", host: "127.0.0.1", port: 443 },
              { label: "本机 3389", host: "127.0.0.1", port: 3389 },
              { label: "github.com:443", host: "github.com", port: 443 },
              { label: "内网数据库", host: "192.168.10.42", port: 5432 },
            ].map((target) => (
              <button
                type="button"
                key={target.label}
                className="quick-chip"
                onClick={() => {
                  setHost(target.host);
                  setPort(target.port);
                }}
              >
                {target.label}
              </button>
            ))}
          </div>

          {portResult && (
            <div className={`result-card${portResult.open ? " success" : " failure"}`}>
              <div className="result-head">
                <span className="result-status">
                  {portResult.open ? "端口开放" : "端口不可达"}
                </span>
                <span className="mono">
                  {portResult.host}:{portResult.port}
                </span>
              </div>
              <p>
                {portResult.open
                  ? `TCP 握手成功，耗时 ${portResult.latencyMs} ms。`
                  : portResult.error ?? "连接失败"}
              </p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>DNS 解析</h3>
              <p>验证域名在本机的解析结果</p>
            </div>
            <ApiOutlined className="panel-icon" />
          </div>

          <div className="dns-form">
            <Input
              value={dnsHost}
              onChange={(event) => setDnsHost(event.target.value)}
              placeholder="example.com"
              prefix={<SearchOutlined />}
              onPressEnter={() => void runResolve()}
            />
            <Button loading={resolving} onClick={() => void runResolve()}>
              解析
            </Button>
          </div>

          {dnsResult && (
            <div className={`result-card${dnsResult.error ? " failure" : " success"}`}>
              <div className="result-head">
                <span className="result-status">{dnsResult.error ? "解析失败" : "解析成功"}</span>
                <span className="mono">{dnsResult.latencyMs} ms</span>
              </div>
              {dnsResult.error ? (
                <p>{dnsResult.error}</p>
              ) : (
                <ul className="dns-list">
                  {dnsResult.addresses.map((address) => (
                    <li key={address} className="mono">
                      {address}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="table-note">
            <ApiOutlined /> 使用系统解析器（DNS Client / hosts），结果反映本机真实访问路径。
          </div>
        </section>
      </div>
    </div>
  );
}
