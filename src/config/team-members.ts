/**
 * 团队成员共享数据
 *
 * 从 LayoutA / LayoutB / LayoutC 三个布局的 team-section 合并去重，
 * 供后续布局组件统一引用（避免三处硬编码 / 各自维护一份 contributors）。
 *
 * 字段说明：
 * - name：成员显示名（与 GitHub 用户名可能不同，如 NaT_Jerry 的 githubLabel 是 NatJerry）
 * - avatar：头像 URL（当前统一使用 QQ 头像服务 https://q1.qlogo.cn/g?b=qq&nk=<QQ号>&s=0）
 * - roleKey：对应 i18n 的 home.team.roles.<key>（owner / survivalAdmin / admin / creativeAdmin / serverAdmin）
 * - githubHref：GitHub 主页链接
 * - githubLabel：GitHub 链接上显示的文字（通常等于 GitHub 用户名，可能与 name 不同）
 * - isOwner：是否为服主（仅 MrHua269 为 true）
 * - extraLinks：可选的额外链接（QQ / 邮箱），由布局组件按 type 渲染对应图标
 */
export interface Contributor {
    name: string
    avatar: string
    roleKey: string
    githubHref: string
    githubLabel: string
    isOwner: boolean
    extraLinks?: Array<{
        type: 'qq' | 'email'
        href: string
    }>
}

export const contributors: Contributor[] = [
    {
        name: 'MrHua269',
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=2506442080&s=0',
        roleKey: 'owner',
        githubHref: 'https://github.com/MrHua269',
        githubLabel: 'MrHua269',
        isOwner: true,
    },
    {
        name: 'NaT_Jerry',
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=1638465997&s=0',
        roleKey: 'survivalAdmin',
        githubHref: 'https://github.com/NatJerry',
        githubLabel: 'NatJerry',
        isOwner: false,
        extraLinks: [
            { type: 'qq', href: 'https://qm.qq.com/q/6IjUhdaTRe' },
            { type: 'email', href: 'mailto:xiaomajunqwq123@outlook.com' },
        ],
    },
    {
        name: 'Klop233',
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=3337913379&s=0',
        roleKey: 'admin',
        githubHref: 'https://github.com/Klop233/',
        githubLabel: 'Klop233',
        isOwner: false,
    },
    {
        name: 'IngilYing',
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=985526606&s=0',
        roleKey: 'survivalAdmin',
        githubHref: 'https://github.com/ingilying',
        githubLabel: 'ingilying',
        isOwner: false,
    },
    {
        name: 'xiaomu18',
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=3466829709&s=0',
        roleKey: 'creativeAdmin',
        githubHref: 'https://github.com/xiaomu18/',
        githubLabel: 'xiaomu18',
        isOwner: false,
    },
    {
        name: 'Narcssu',
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=1928325064&s=0',
        roleKey: 'serverAdmin',
        githubHref: 'https://github.com/NARCSSU',
        githubLabel: 'NARCSSU',
        isOwner: false,
        extraLinks: [{ type: 'email', href: 'mailto:goofygazer@gmail.com' }],
    },
]
