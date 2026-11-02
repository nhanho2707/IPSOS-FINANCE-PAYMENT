import '../../../assets/css/components.css';
import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowDown as ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowUp as ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { Chats as Chats, UsersThree as UsersThree, ChartLineUp as ChartLineUp , Flag as Flag, Icon, CurrencyDollar, MoneyWavy, Percent, Bank } from '@phosphor-icons/react';

export interface WidgetProps {
    title: string;
    widget_name: string
    diff?: number;
    trend: 'up' | 'down';
    value: string;
    avatar_color_index: number;
}

const AVATAR_COLORS = [
    'var(--avatar-color-primary)',
    'var(--avatar-color-sixth)',
    'var(--avatar-color-forth)',
    'var(--avatar-color-third)'
];

const WIDGET_ICONS: {[key:string]: Icon} = {
    chat: Chats,
    flag: Flag,
    chart: ChartLineUp,
    user: UsersThree,
    dollar: CurrencyDollar,
    money: MoneyWavy,
    percent: Percent,
    bank: Bank
};

const SummaryWidget:React.FC<WidgetProps> = ({ title, widget_name, diff, trend, avatar_color_index, value }) => {
    const TrendIcon = trend === 'up' ? ArrowUpIcon : ArrowDownIcon;
    const trendColor = trend === 'up' ? 'var(--font-forth)' : 'var(--font-third)';
    
    const avatarColor = AVATAR_COLORS[avatar_color_index];
    const WidgetIcon = WIDGET_ICONS[widget_name];

    return (
        <Card className='widget-container'>
            <CardContent>
                <Stack spacing={3}>
                    <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }} spacing={3}>
                        <Stack spacing={2}>
                            <Typography sx={{
                                color: 'var(--font-primary)',
                                fontWeight: 500,
                                fontSize: '14px'
                            }} variant="overline">
                                {title}
                            </Typography>
                            <Typography sx={{
                                color: 'var(--font-fifth)',
                                fontWeight: 700,
                                fontSize: '2.50rem'
                            }} variant="h4">
                                {value}
                            </Typography>
                        </Stack>
                        <Avatar sx={{ bgcolor: avatarColor, height: '60px', width: '60px', color: 'white' }}>
                            <WidgetIcon size={32} />
                        </Avatar>
                    </Stack>
                    {diff ? (
                        <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
                        <Stack sx={{ alignItems: 'center' }} direction="row" spacing={0.5}>
                            <TrendIcon color={trendColor} fontSize="var(--icon-fontSize-md)" />
                            <Typography color={trendColor} variant="body2">
                            {diff}%
                            </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Since last month
                        </Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </CardContent>
        </Card>
    );
}

export default SummaryWidget;