import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import type { SxProps } from '@mui/material/styles';
import { DotsThreeVertical as DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import dayjs from 'dayjs';
import { Avatar } from '@mui/material';
import { deepOrange } from '@mui/material/colors';
import { Survey } from '../Panellist';

export interface LastestSurveysProps {
  surveys?: Survey[];
  sx?: SxProps;
}

const LastestSurveys:React.FC<LastestSurveysProps> = ({ surveys = [], sx }) => {
  const avatarColors = [
    'var(--avatar-color-primary)',
    'var(--avatar-color-secondary)',
    'var(--avatar-color-third)',
    'var(--avatar-color-forth)',
    'var(--avatar-color-fifth)',
    'var(--avatar-color-sixth)'];

  return (
    <Card sx={sx}>
      <CardHeader title="LASTEST SURVEYS" sx={{color: 'var(--font-fifth)'}}/>
      <Divider />
      <List>
        {surveys.map((survey, index) => (
          <ListItem divider={index < surveys.length - 1} key={survey.id}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: avatarColors[index] }}>{index + 1}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={survey.name}
              secondary={`Updated ${dayjs(survey.open_date).format('MMM D, YYYY')}`}
              slotProps={{ primary: { variant: 'subtitle1' }, secondary: { variant: 'body2' } }}
            />
            <IconButton edge="end">
              <DotsThreeVerticalIcon weight="bold" />
            </IconButton>
          </ListItem>
        ))}
      </List>
      {/* <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button
          color="inherit"
          endIcon={<ArrowRightIcon fontSize="var(--icon-fontSize-md)" />}
          size="small"
          variant="text"
        >
          View all
        </Button>
      </CardActions> */}
    </Card>
  );
}

export default LastestSurveys;
