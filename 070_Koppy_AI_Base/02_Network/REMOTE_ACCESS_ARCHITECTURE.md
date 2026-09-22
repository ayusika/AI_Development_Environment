# Koppy AI Base Remote Access Architecture

Version: v0.2
Status: ACTIVE
Date: 2026-09-22

## 1. Purpose

外出先のiPhone等から、Public InternetへKoppy Base ServerのServiceを直接公開せず、Private AccessするためのRemote Access設計を定義する。

主対象:

- MacBook Pro 2018 / Koppy Base Server
- iPhone / Koppy Pocket
- 将来のRTX830 Home Gateway

## 2. Current Network

現在のHome Internetでは、端末へ `172.16.15.x` のPrivate IPv4が配布されている。

```text
Internet
↓
Apartment upstream network / NAT
↓
Home network
↓
Koppy Base Server
```

このため、自宅側へGlobal IPv4が直接割り当てられている構成を前提にしない。

RTX830を設置するだけでInternet側からInbound VPNを受けられるとは扱わない。

## 3. Phase 1: Tailscale

RTX830 / Self-hosted VPNの回線条件が整うまで、Private Remote AccessとしてTailscaleを使用する。

```text
iPhone / Koppy Pocket
↓
Tailscale tailnet
↓
Koppy Base Server
↓
Private Web / required services
```

### Principles

- Public port forwardingを行わない
- SSHをPublic Internetへ直接公開しない
- Web ServerをPublic Internetへ直接公開しない
- DBをPublic Internetへ直接公開しない
- Tailscale Funnelを使用しない
- tailnet内だけで利用する
- Remote Access可能なServiceを必要最小限にする
- iPhoneから不要なLAN / Server管理領域へアクセスさせない
- 必要に応じてTailscaleのAccess Controlで到達範囲を制限する
- secret / password / tokenをGitHub正本へ保存しない

## 3.1 Current Kohaku Work Production Endpoint

2026-09-22 JST、Kohaku WorkはTailscale Serveをproduction private accessとして利用開始。

```text
iPhone 14
→ cellular
→ Tailscale tailnet
→ https://koppy-worker-pro.tailba49c0.ts.net/work/
→ nginx
→ Kohaku Work
```

Access ControlはiPhone 14 → Pro `tcp:443` のみ。
Public port forwarding / Funnel / Public SSH / Public DBは使用しない。

現在のTailscale HTTPS hostnameは暫定production endpointとして維持し、
見た目だけを理由に変更しない。

RTX830 / Self-hosted VPN migration時に以下を一体で再設計する。

- private / split DNS
- custom HTTPS hostname
- certificate management
- Tailscale exit / emergency fallback policy

## 4. Local Development Path

自宅でのAir ↔ Pro開発通信はTailscaleを主経路にしない。

```text
MacBook Air
10.77.0.1
↕
Thunderbolt Bridge
↕
MacBook Pro 2018
10.77.0.2
```

通常の自宅開発ではDirect Linkを優先し、家庭用Router性能やInternet回線への依存を避ける。

Tailscaleは主に外出先からのPrivate Remote Accessへ使用する。

## 5. Phase 2: RTX830

RTX830は以下の役割候補とする。

- Home Gateway
- Firewall
- Network segmentation
- 将来のSelf-hosted VPN endpoint

ただし、Current apartment networkにはupstream NATが存在するため、RTX830到着または設置だけをSelf-hosted VPN成立条件とはしない。

## 6. Self-hosted VPN Migration Gate

Self-hosted VPNへの移行は、少なくとも以下を確認してから行う。

- Internet側からInbound接続可能な回線条件を確保している
- Global IPv4等、採用VPN方式に必要な外部到達性を確認している
- RTX830のFirmware / Firewall / VPN設定を検証している
- Public Internetへ不要なServiceを公開していない
- iPhoneから必要Serviceへ到達できる
- Tailscaleからの移行または併存方針が確定している

条件を満たすまではTailscaleをPrivate Remote Accessとして継続利用できる。

## 7. Exposure Policy

Internetへ直接公開してよいことと、Private Network内で利用できることを分離する。

標準方針:

```text
Public Internet
→ VPN / Private Access入口以外は原則閉じる

Private Network / tailnet
→ 必要なWeb / SSH / API等のみ許可

Server Localhost
→ DB / internal service等、Remote Access不要なものを優先
```

Public Accessが必要なServiceを将来追加する場合は、本Architectureとは別にExposure / Authentication / Reverse Proxy等の設計を行う。

## 8. Dynamic Address Policy

Dynamic Public IP等の一時的な値はGitHub設計書へ固定しない。

接続先識別が必要な場合は、採用方式に応じてDNS / Device Name / VPN内Address等を使用する。

## 9. Related Source of Truth

- `070_Koppy_AI_Base/README.md`
- `070_Koppy_AI_Base/01_Overview/Architecture.md`
- `070_Koppy_AI_Base/CURRENT_STATUS.md`
- `070_Koppy_AI_Base/ROADMAP.md`
- `600_KoppyOS/protocols/FILE_EDIT_PROTOCOL.md`
