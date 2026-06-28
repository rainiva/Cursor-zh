/** @typedef {{ originalText: string, changeText: string, forceRuntime?: boolean }} UiTarget */

/** @type {UiTarget[]} */
const CRITICAL_GLASS_ROUND32_AUTOMATION_TEMPLATES = [
  {
    originalText: 'Scan codebase for vulnerabilities',
    changeText: '扫描代码库漏洞',
    forceRuntime: true,
  },
  {
    originalText:
      'Review the full repository on a schedule and alert on validated high-impact security issues',
    changeText: '按计划审查整个仓库，并对已验证的高影响安全问题发出告警',
    forceRuntime: true,
  },
  {
    originalText: 'Generate docs',
    changeText: '生成文档',
    forceRuntime: true,
  },
  {
    originalText:
      'Create and update developer documentation for recently changed or under-documented code',
    changeText: '为近期变更或文档不足的部分创建并更新开发者文档',
    forceRuntime: true,
  },
  {
    originalText: 'Add test coverage',
    changeText: '补充测试覆盖',
    forceRuntime: true,
  },
  {
    originalText:
      'Review recent changes and add tests for high-risk logic that lacks adequate coverage',
    changeText: '审查近期变更，为缺少充分覆盖的高风险逻辑添加测试',
    forceRuntime: true,
  },
  {
    originalText: 'Find vulnerabilities',
    changeText: '查找漏洞',
    forceRuntime: true,
  },
  {
    originalText:
      'Review pull requests for exploitable security issues and flag only validated findings before merge',
    changeText: '审查拉取请求中的可利用安全问题，仅在合并前标记已验证的发现',
    forceRuntime: true,
  },
  {
    originalText: 'Assign PR reviewers',
    changeText: '指派 PR 审查者',
    forceRuntime: true,
  },
  {
    originalText: 'Assign reviewers based on code changes and auto-approve low-risk PRs',
    changeText: '根据代码变更指派审查者，并自动批准低风险 PR',
    forceRuntime: true,
  },
  {
    originalText: 'Autofix PR review comments',
    changeText: '自动修复 PR 审查评论',
    forceRuntime: true,
  },
  {
    originalText: 'Take a first pass at addressing inline review comments on PR diffs',
    changeText: '先行处理 PR diff 中的行内审查评论',
    forceRuntime: true,
  },
  {
    originalText: 'Monitor engineering invariants',
    changeText: '监控工程不变量',
    forceRuntime: true,
  },
  {
    originalText:
      'Re-check critical repository invariants on a schedule and alert only when a rule regresses',
    changeText: '按计划重新检查关键仓库不变量，仅在规则退化时告警',
    forceRuntime: true,
  },
  {
    originalText: 'Fix bugs reported in Slack',
    changeText: '修复 Slack 报告的 Bug',
    forceRuntime: true,
  },
  {
    originalText:
      'Monitor a Slack channel for bug reports, investigate the codebase, and fix with a PR',
    changeText: '监控 Slack 频道的 bug 报告，调查代码库并通过 PR 修复',
    forceRuntime: true,
  },
  {
    originalText: 'Triage failed GitHub Actions',
    changeText: '分诊失败的 GitHub Actions',
    forceRuntime: true,
  },
  {
    originalText:
      'Investigate failed or cancelled workflow runs and report findings in Slack',
    changeText: '调查失败或取消的工作流运行，并在 Slack 中报告发现',
    forceRuntime: true,
  },
  {
    originalText: 'Fix CI failures',
    changeText: '修复 CI 失败',
    forceRuntime: true,
  },
  {
    originalText: 'Detect CI failures on main and automatically open PRs',
    changeText: '检测 main 分支上的 CI 失败并自动打开 PR',
    forceRuntime: true,
  },
  {
    originalText: 'Investigate PagerDuty incidents',
    changeText: '调查 PagerDuty 事件',
    forceRuntime: true,
  },
  {
    originalText: 'Investigate incidents using Datadog and code context',
    changeText: '使用 Datadog 和代码上下文调查事件',
    forceRuntime: true,
  },
  {
    originalText: 'Investigate Sentry issues',
    changeText: '调查 Sentry 问题',
    forceRuntime: true,
  },
  {
    originalText: 'Investigate errors from Sentry, identify root causes, and propose fixes',
    changeText: '调查 Sentry 错误，找出根因并提出修复方案',
    forceRuntime: true,
  },
  {
    originalText: 'Investigate top Datadog errors',
    changeText: '调查 Datadog 热点错误',
    forceRuntime: true,
  },
  {
    originalText:
      'Investigate recurring production errors from Datadog, identify root causes, and propose fixes',
    changeText: '调查 Datadog 中的反复出现的生产错误，找出根因并提出修复方案',
    forceRuntime: true,
  },
  {
    originalText: 'Triage Linear issues',
    changeText: '分诊 Linear 议题',
    forceRuntime: true,
  },
  {
    originalText:
      'Triage new issues by investigating bugs, planning feature requests, and opening PRs for easy fixes',
    changeText: '通过调查 bug、规划功能请求并为简单修复打开 PR 来分诊新议题',
    forceRuntime: true,
  },
  {
    originalText: 'Customer Health Monitoring Agent',
    changeText: '客户健康监控 Agent',
    forceRuntime: true,
  },
  {
    originalText:
      'Find at-risk customers using usage analytics, call notes, Slack escalations, and Linear blockers',
    changeText: '使用用量分析、通话记录、Slack 升级和 Linear 阻塞项找出高风险客户',
    forceRuntime: true,
  },
  {
    originalText: 'Product Analytics Agent',
    changeText: '产品分析 Agent',
    forceRuntime: true,
  },
  {
    originalText:
      'Weekly product usage, activation, retention, and feature adoption digest from Databricks',
    changeText: '来自 Databricks 的每周产品用量、激活、留存和功能采用摘要',
    forceRuntime: true,
  },
  {
    originalText: 'Product FAQ Agent',
    changeText: '产品 FAQ Agent',
    forceRuntime: true,
  },
  {
    originalText:
      'Answer product questions in a dedicated Slack channel using Slack, Notion, Linear, and GitHub context',
    changeText: '在专用 Slack 频道中，结合 Slack、Notion、Linear 和 GitHub 上下文回答产品问题',
    forceRuntime: true,
  },
  {
    originalText: 'Product Finance Agent',
    changeText: '产品财务 Agent',
    forceRuntime: true,
  },
  {
    originalText: 'Analyze Stripe revenue, churn signals, and product pricing opportunities',
    changeText: '分析 Stripe 收入、流失信号和产品定价机会',
    forceRuntime: true,
  },
  {
    originalText: 'Slack Digest Agent',
    changeText: 'Slack 摘要 Agent',
    forceRuntime: true,
  },
  {
    originalText:
      "Summarize important DMs, mentions, and the user's top active Slack channels",
    changeText: '汇总重要私信、提及和你最活跃的 Slack 频道',
    forceRuntime: true,
  },
];

module.exports = { CRITICAL_GLASS_ROUND32_AUTOMATION_TEMPLATES };
