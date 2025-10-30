# 🧧 红包 dApp PRD（v0.2，基于用户取舍更新）

## 1. 背景与目标
- 定位：Base 链上的社交红包 dApp，深度集成 Farcaster Frames，实现“发-抢-邀-再发”的病毒闭环。
- 商业目标（8周 MVP）：验证 K>1 的增长闭环，沉淀高参与社交资产与平台手续费收入。
- 北极星指标：DSR（Daily Sent RedPackets，日均发红包数）。
- 次级指标：DAU、K-Factor、红包完成率、D1/D7/D30 留存、手续费收入。

## 2. 范围与优先级
### P0（MVP 必须）
- 钱包登录：SIWE + RainbowKit（不保留 Privy）。
- 发红包：测试阶段仅支持测试链的 USDC/USDT 测试币；固定/拼手气（随机）两种；金额上限与份数限制与合约一致；有效期≤7天；祝福语≤100字。
- 抢红包：Web + Frames；后端代理领取；幂等+锁；VRF 随机强制启用（可接受等待提示）。
- 红包详情：剩余份数/金额，领取记录，手气最佳标记。
- 实时通知：Socket.IO（Redis Adapter）。

### P1（应该有）
- 邀请奖励：直接邀请每人 $2 USDC；链下结算。
  - 预算与熔断：配置每日/每周预算上限与阈值，触达即自动降档或暂停；支持单用户累计与单日领取上限。
  - 风控口径：命中设备/IP/可疑分风控时延迟发放或进入人工复核。
- 助力抢红包：基础 50% + 邀请3人解锁剩余 50%（链下校验，P1 引入）。
- 排行榜：手气/慷慨/活跃；新增“群榜（Farcaster Channel 维度）”。
- 成就系统：3-5 个基础成就与炫耀卡片分享。
- 红包雨：定时发放与倒计时提醒。

### P2（可选）
- NFT 红包、定时红包。
- 代币经济与治理扩展（与 $PACKET 绑定的进阶功能）。

不纳入 MVP：AA 代付（本版明确不开启）。
发布策略：
- 测试阶段：仅测试链 USDC/USDT（测试币），提供内置代币选择器（USDC/USDT）。
- 正式版本：支持用户导入任意 ERC-20 代币合约地址发红包（自定义代币），默认推荐稳定币；配套代币元数据校验与风险提示。

## 3. 核心产品规则
### 3.1 发红包
- 字段：`金额(USDC, 6dec)`、`份数(1-200)`、`类型(固定/随机)`、`有效期(≤7天)`、`祝福语(≤100)`。
  - 祝福语长度校验在前端/后端/DB 三层一致生效。
- 代币选择：
  - 测试阶段：仅允许选择内置测试链代币 USDC/USDT（测试币）。
  - 正式版本：可输入 ERC-20 合约地址；前端读取 `symbol/decimals/name` 校验，显示余额与授权；后端复验合约接口与最小功能支持（`balanceOf/transfer/decimals/symbol`）。
- 手续费：默认 1%（平台费，Owner 可调，最高 5%）；活动期可配置白名单 0%。
- 成功提交后生成 `packetId(bytes32)` 并广播 `PacketCreated`。

### 3.2 随机红包（强制 VRF）
- VRF 请求在创建时触发，领取端若随机数未就绪显示等待提示与重试（指数退避）。
- 随机总和守恒，最小份额保护；最后一份领完剩余全部。
 - 等待体验：Frame 内首屏优先≤1s渲染；等待≤5s 后展示排队/稍后再试，支持一键重试与返回详情。
 - 降级策略：极端情况下仅调整交互提示为“稍后到账”，不改变链上随机与结算逻辑。

### 3.3 抢红包
- 前置校验：未过期、未抢完、该地址未领取。
- 领取成功触发 `PacketClaimed(packetId, claimer, amount, remainingCount)`；前端动画+实时刷新。
- Frames 路径由后端代理交易，使用分布式锁+幂等键，防并发重复。
 - 过期口径：以链上区块时间为准；前后端展示统一使用 UTC，界面在接近过期时给出倒计时与容差提示。

### 3.4 排行榜与群榜
- 手气榜（周）：单次领取最大金额排名。
- 慷慨榜（月）：创建红包总额排名。
- 活跃榜（实时）：参与次数排名。
- 群榜：按 Farcaster Channel 聚合（需记录 packet/channel 归属）。
 - 口径说明：默认排除官方运营红包；金额统一按 USDC 计量（未来多币种时做汇率归一）。时间窗按 UTC 00:00:00 计算。

### 3.5 邀请与助力
- 邀请奖励：直接邀请注册或首次交互即发 $2（不封顶，反女巫校验见风控）。
- 助力抢红包：领取后显示“邀请3人解锁剩余50%”，验证达到阈值后链下补发或链上二次领取（MVP 先链下结算）。

## 4. 非功能需求
- 性能：Frames 领取路径 P95 < 2s（不含链上确认）；1k rps 并发下无重复领取。
- 可用性：Frame 内≤2步完成领取；Web 内≤3步完成创建；Frame 首屏渲染 ≤ 1s。
- 可靠性：Postgres 每日备份；迁移前置；Sentry 错误追踪；结构化日志。
- 安全：合约重入/溢出/前置交易防护；服务端速率限制（claim/frame-claim 更严格）、幂等键、分布式锁、CSP/Helmet/JWT 过期。
- 合规：默认提供可开关的限额/KYC/地域限制（灰度开启），配合可审计日志与开关变更记录；按需启用。
 - 自定义代币安全：
   - 代币合约校验：必须实现标准 `ERC20` 接口；拒绝非标准转账逻辑（如手续费型/黑名单代币）或给出高风险提示与二次确认。
   - 小数与单位：基于 `decimals()` 动态格式化；防 0/超大/异常小数值。
   - 黑/白名单：后端维护黑名单（钓鱼/高风险代币），可运营下发白名单推荐集；Frames 内领取默认仅展示白名单代币以减轻钓鱼风险。

## 5. 技术方案（与现有文档对齐）
- 前端：Next.js 14、React 18、TS、Tailwind、RainbowKit、Wagmi v2、Viem、TanStack Query、Frog(Frames)、Zustand、Toast。
- 后端：Fastify 4、TS、Zod、Prisma(PostgreSQL)、Redis、Socket.IO(Redis Adapter)。
- 合约：Solidity 0.8.20、Foundry、OpenZeppelin、Chainlink VRF。
- 网络：开发/测试使用 Ethereum Sepolia；生产主网首发 Base。
- 鉴权：SIWE + JWT；Frames 使用 fid→address 解析 + 后端代理。
- 部署：pnpm monorepo、Docker Compose、Railway(API/DB/Redis)、Vercel(Web)、Nginx 反代。
  - 手续费治理：费率调整需提前公告；设置最短生效窗口与最大调幅，并保留公开变更记录。
 - 多币支持实现：
   - 前端：代币选择器（测试阶段固定 USDC/USDT；正式版可输入合约地址→读取 `symbol/decimals` 与余额、授权额度）；数额转换基于动态 `decimals`。
   - 后端：`createPacket` 入参包含 `token`；对照链上合约进行 `ERC20` 方法探测与缓存元数据（symbol/decimals/name）；为排行榜/统计提供统一 USD 归一（调用预言机/离线汇率，非 MVP）。
   - 数据：在 `Packet` 记录快照 `tokenSymbol`、`tokenDecimals` 以防代币后续变更影响展示。

## 6. 数据模型（摘要）
- `User(id, address, farcasterFid, inviteCode, ...)`
- `Packet(id, packetId, txHash, creatorId, token, tokenSymbol?, tokenDecimals?, totalAmount, count, isRandom, message, remainingAmount, remainingCount, expireTime, refunded)`
- `Claim(id, packetId, userId, amount, txHash, isBest, claimedAt)`
- `Invitation(id, inviterId, inviteeId, rewardPaid)`
- 可选：`UserBalance(userId, balance, pending)` 用于邀请奖励与助力补发的链下结算。

## 7. API 约定（Fastify + Zod）
- Auth：`GET /api/auth/siwe/nonce`、`POST /api/auth/siwe/verify`、`GET /api/auth/me`
- Packets：`POST /api/packets/create`（body 增加 `token` 合约地址，测试阶段仅允许 USDC/USDT）、`POST /api/packets/claim`、`GET /api/packets/:packetId`、`GET /api/packets/:packetId/claims`、`POST /api/packets/:packetId/refund`
- Growth：`POST /api/invite/accept`、`GET /api/invite/stats`、`GET /api/leaderboard`、`GET /api/achievements`
- Frames：`GET/POST /api/frame/:packetId`、`POST /api/frame/claim/:packetId`
- Headers：`Authorization: Bearer <token>`、`Idempotency-Key: <uuid>`

## 8. 埋点与指标
- 事件：`packet_created`、`packet_claimed`、`invite_accepted`、`assist_completed`、`leaderboard_update`、`achievement_unlocked`。
- 指标：
  - 核心：DSR、红包完成率、D1/D7/D30、API P95/P99、错误率、WS连接数、链上确认耗时。
  - 传播：K-Factor（区分含激励与去激励口径）。
  - 漏斗：曝光→Frame 点击→成功领取→再发红包→邀请转化（每日看板与阈值告警）。
  - 预算：邀请/红包雨/手续费收入的日周净现金流与 ROI 面板。
- 监控：接入 Prometheus + Grafana（API 延迟直方图、错误率、队列积压、VRF 回调延迟、WS在线数）；警报阈值（P95>2s、错误率>1%、领取失败率>5%）。

## 9. 风控与反女巫（仍保留但不作为“合规”）
- 多维限流：IP/Address/User 维度；关键接口（claim/frame-claim）更严格。
- 幂等+锁：Redis 幂等键（24h），`lock:packetId:userId` 防并发。
- 邀请反作弊：设备/IP 指纹去重；阈值达成后发放；异常行为熔断与灰度人工复核。
- 黑名单：地址/IP 黑名单；可疑分值累计。

细化策略：
- 同设备/同 IP 的同日激活上限；同邀请人同 IP 的多账号归并；钱包新旧度/链上活跃度阈值作为权重。
- 触发高危分值时冻结相关奖励并进入人工复核（SLA 可配置）。
 - 自定义代币风控：未知/高风险代币标红与二次确认；拒绝在 Frames 中直接展示未白名单代币；后端维度限流与阈值熔断防“假币薅羊毛”。

## 10. $PACKET 代币化方案（规划）
目标：在不过度金融化的前提下，增强留存与贡献者激励，形成可持续的产品内经济闭环。

### 10.1 设计原则
- 工具型与治理属性为主，不承诺收益；避免证券化叙事。
- 与“贡献”强绑定：发红包、被抢完、邀请有效转化、活动贡献等。
- 渐进引入：先积分（Points）→ 可兑换/映射为 $PACKET（TGE 后）。

### 10.2 代币用途（Utility）
- 手续费折扣：持有量/质押层级带来 0.1%—1% 折扣（不与活动白名单叠加，取最高优惠）。
- 高级功能：解锁稀有红包封面、群红包管理功能、专属成就徽章铸造。
- 治理：参数提案与投票（手续费率上限、排行榜规则、活动预算分配等）。
- 质押与优先权：质押可获得“红包雨”优先领取权/额度上限提升（不承诺收益）。

### 10.3 供给与分配（示例）
- 固定总量：1,000,000,000 枚。
- 分配建议：
  - 社区与生态激励 40%（线性 48 个月，每月释放；含活动、创作者基金、群榜激励）。
  - 团队 20%（12 个月悬崖+36 个月线性）。
  - 早期支持者 10%（6 个月线性）。
  - 国库 20%（由多签治理，活动预算与流动性管理）。
  - 流动性与合作 10%（按需安排，披露地址与目的）。

### 10.4 积分到代币映射（Points → $PACKET）
- 日常行为积分：
  - 发红包：按净额加权；被抢完额外乘数。
  - 抢红包：上限积分，防“薅”。
  - 邀请：有效转化（首次发或首次抢）方计分；二级不超过 0.2x。
  - 群榜贡献：群内活动积分池按贡献比例分配。
- 防刷：设备/IP/地址相似度检测；异常分值清零或降权；黑名单不计分。
- TGE 后兑换：按积分占比分配可兑额度，设置个人上限，开放周期分批释放。

### 10.5 合约与治理（阶段）
- 阶段1（MVP）：仅“积分账本”与“折扣规则”在链下实现，透明可查 API 与周报；$PACKET 信息披露与社区讨论。
- 阶段2（TGE 预备）：发行合约、代币治理框架、多签国库；兑换合约支持分批领取与防女巫校验。
- 阶段3（后续）：治理提案与投票上线；手续费折扣/高级功能的链上校验与授权。

### 10.6 法务与合规（约束）
- 叙事：工具与治理，不承诺收益；不进行公开募资；区域合规限制预留开关。
- 披露：分配、解锁与地址公开；大额转出提前公告；活动规则透明可复现。

## 11. 路线图（8周 MVP → 增长）
### W1-W2 基建
- 合约与测试（VRF/事件/费用）、Fastify API 骨架、Prisma Schema、Redis/Socket、SIWE。
### W3-W4 核心功能
- 发/抢/详情、Frames 集成、链上事件同步、实时推送、邀请绑定与奖励表。
### W5-W6 体验与增长
- UI 动效、群榜（Channel 维度）、成就墙、红包雨、监控看板（Prometheus/Grafana）。
### W7 稳定与安全
- 压测与性能优化、安全审查、Sentry 告警、备份演练、灰度发布。
### W8 测试网公测→主网准备
- ≥100 用户测试、修复与优化、准备 Base 主网首发与运营活动。

## 12. 验收标准
- 发/抢/退款全链路成功率 > 99%；Frame 首屏 ≤ 1s，领取 P95 < 2s（链外）。
- 并发 1k rps 无重复领取且错误率 < 1%；群榜稳定；邀请奖励/助力补发正确入账。
- 监控与告警有效（含转化漏斗与 ROI 阈值）；SLA 事件可回溯，有复盘材料与审计日志。

## 13. 开放问题（已采纳取舍后的跟踪）
- 预算管理：邀请奖励按配置执行每日/每周预算与熔断策略，支持灰度与动态调参。
- 群榜口径：Channel 归属规则与边界（跨频道分享是否计入）。
- $PACKET TGE 时间窗：待社区共识与指标达成后披露（不早于稳定增长阶段）。

— 完 —


