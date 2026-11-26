import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
} from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, ResponsiveContainer } from "recharts";
import { BRAND, NEUTRAL } from "../../config/ThemeConfig";

// Mock data
const kpi = {
  progress: 75,
  quota: { completed: 120, total: 150 },
  daysLeft: 10,
  risk: 5,
};

const lineData = [
  { week: "Week 1", progress: 40 },
  { week: "Week 2", progress: 55 },
  { week: "Week 3", progress: 65 },
  { week: "Week 4", progress: 75 },
];

const barData = [
  { team: "Team A", completed: 80, remaining: 20 },
  { team: "Team B", completed: 65, remaining: 35 },
  { team: "Team C", completed: 90, remaining: 10 },
  { team: "Team D", completed: 40, remaining: 60 },
];

const tasks = [
  { name: "Task 1", team: "Team A", status: "On Track", start: "01/03", end: "15/03", progress: 100 },
  { name: "Task 2", team: "Team B", status: "Late", start: "05/03", end: "20/03", progress: 50 },
  { name: "Task 3", team: "Team C", status: "On Track", start: "10/03", end: "25/03", progress: 75 },
  { name: "Milestone X", team: "Team A", status: "On Track", start: "01/03", end: "30/03", progress: 85 },
  { name: "Milestone Y", team: "Team C", status: "Late", start: "05/03", end: "28/03", progress: 40 },
];

const DashboardProject: React.FC = () => {
  return (
    <Box sx={{ p: 3, fontFamily: "Roboto, sans-serif" }}>
      {/* KPI Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2">Project progress</Typography>
              <Typography variant="h5">{kpi.progress}%</Typography>
              <LinearProgress variant="determinate" value={kpi.progress} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2">Quota completed</Typography>
              <Typography variant="h5">
                {kpi.quota.completed} / {kpi.quota.total}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(kpi.quota.completed / kpi.quota.total) * 100}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2">Days left</Typography>
              <Typography variant="h5">{kpi.daysLeft} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2">Risks / Alerts</Typography>
              <Typography variant="h5" color="error">
                {kpi.risk}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Line chart: tiến độ theo tuần */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Weekly progress</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="progress" stroke={BRAND.accent} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Bar chart: quota theo team */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Quota theo team</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="team" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill={BRAND.main} name="Completed" />
                  <Bar dataKey="remaining" stackId="a" fill={NEUTRAL[200]} name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Task Table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Tasks / milestones
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Task / Milestone</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start date</TableCell>
                <TableCell>End date</TableCell>
                <TableCell>% Complete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task, idx) => (
                <TableRow key={idx}>
                  <TableCell>{task.name}</TableCell>
                  <TableCell>{task.team}</TableCell>
                  <TableCell sx={{ color: task.status === "Late" ? "red" : "green" }}>
                    {task.status}
                  </TableCell>
                  <TableCell>{task.start}</TableCell>
                  <TableCell>{task.end}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <LinearProgress
                        variant="determinate"
                        value={task.progress}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {task.progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardProject;