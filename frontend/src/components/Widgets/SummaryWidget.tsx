import '../../assets/css/components.css';
import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowDown as ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowUp as ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { Bank as Bank, Percent as Percent, CurrencyDollar as CurrencyDollar, MoneyWavy as MoneyWavy, Chats as Chats, UsersThree as UsersThree, ChartLineUp as ChartLineUp , Flag as Flag, Icon } from '@phosphor-icons/react';

export interface WidgetProps {
    title: string;
    widget_name: string;
    diff?: number;
    trend?: 'up' | 'down';
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
                <Stack spacing={2}>
                    {/* Hàng 1: Title + Icon */}
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Typography className='widget-title' variant="overline">
                        {title}
                        </Typography>
                        <Avatar
                        sx={{
                            bgcolor: avatarColor,
                            height: { xs: 36, sm: 48, md: 60 },
                            width: { xs: 36, sm: 48, md: 60 },
                            color: 'white'
                        }}
                        >
                        <WidgetIcon className='widget-icon' />
                        </Avatar>
                    </Stack>

                    {/* Hàng 2: Content */}
                    <Typography className='widget-content' variant="h4">
                        {value}
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default SummaryWidget;