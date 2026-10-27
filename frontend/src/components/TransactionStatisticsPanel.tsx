import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Grid, MenuItem, TextField, Typography } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import numeral from "numeral";
import { TransactionChannel, useTransactionStatistics } from "../hook/useTransactionStatistics";
import BarChartWidget from "../pages/TechcombankPanel/widgets/BarChartWidget";
import HourlyHistogramChart from "./Charts/HourlyHistogramChart";
import SearchDatePickerFromTo from "./SearchDatePickerFromTo";
import ReusableTable from "./Table/ReusableTable";
import { ColumnFormat } from "../config/ColumnConfig";

const GAP_ORDER = ["< 0 (bất thường)", "0 - 30 phút", "30 phút - 2 giờ", "2 - 24 giờ", "> 24 giờ"];

const CHANNEL_LABELS: Record<TransactionChannel, string> = {
  vinnet: "Vinnet",
  gotit: "GotIt",
  other: "Other"
};

const CHANNELS = Object.keys(CHANNEL_LABELS) as TransactionChannel[];

const toChartData = (buckets: Record<string, number> | undefined, order: string[]) =>
  order.map((name) => ({ name, value: buckets?.[name] ?? 0 }));

// An all-zero day is sent as empty so the chart shows its "no data" state instead of 24 flat bars.
const toHistogramData = (buckets: Record<string, number> | undefined) => {
  const data = Object.entries(buckets ?? {}).map(([name, value]) => ({ name, value }));
  return data.some((d) => d.value > 0) ? data : [];
};

const formatAmount = (value: number | undefined) => numeral(value ?? 0).format("0,0");

const formatDateTime = (value: string | null | undefined) =>
  value ? dayjs(value).format("DD/MM/YYYY HH:mm:ss") : "";

const formatMinutes = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return "—";

  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);

  if (abs < 60) return `${sign}${abs} phút`;
  if (abs < 1440) return `${sign}${Math.floor(abs / 60)} giờ ${abs % 60} phút`;

  return `${sign}${Math.floor(abs / 1440)} ngày ${Math.floor((abs % 1440) / 60)} giờ`;
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, caption, color = "inherit" }) => (
  <Card sx={{ height: "100%" }}>
    <CardContent>
      <Typography color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" color={color}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {caption}
        </Typography>
      )}
    </CardContent>
  </Card>
);

interface TransactionStatisticsPanelProps {
  projectId: number;
}

const TransactionStatisticsPanel: React.FC<TransactionStatisticsPanelProps> = ({ projectId }) => {
  const {
    statistics,
    actionState,
    channel,
    setChannel,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo
  } = useTransactionStatistics(projectId);

  const [anomalyPage, setAnomalyPage] = useState(0);
  const [anomalyRowsPerPage, setAnomalyRowsPerPage] = useState(10);
  // SearchDatePickerFromTo keeps its own picker state, so it is remounted to clear the dates.
  const [datePickerKey, setDatePickerKey] = useState(0);

  useEffect(() => {
    setAnomalyPage(0);
  }, [statistics]);

  const handleDateRangeChange = (from: Dayjs | null, to: Dayjs | null) => {
    setDateFrom(from ? from.format("YYYY-MM-DD") : null);
    setDateTo(to ? to.format("YYYY-MM-DD") : null);
  };

  const handleClearDates = () => {
    setDateFrom(null);
    setDateTo(null);
    setDatePickerKey((key) => key + 1);
  };

  const total = statistics?.total ?? 0;
  const anomalies = statistics?.anomalies ?? [];
  const anomaliesTotal = statistics?.anomalies_total ?? 0;
  const gapUnknown = statistics?.gap_unknown ?? 0;
  const pagedAnomalies = anomalies.slice(
    anomalyPage * anomalyRowsPerPage,
    anomalyPage * anomalyRowsPerPage + anomalyRowsPerPage
  );

  const channelBreakdown = (field: "count" | "amount") =>
    CHANNELS.filter((c) => (statistics?.by_channel?.[c]?.count ?? 0) > 0)
      .map((c) => {
        const value = statistics?.by_channel[c][field] ?? 0;
        return `${CHANNEL_LABELS[c]}: ${field === "amount" ? formatAmount(value) : value}`;
      })
      .join(" · ");

  const anomalyColumns: ColumnFormat[] = [
    { label: "Respondent ID", name: "respondent_id", type: "string" },
    { label: "SĐT", name: "phone", type: "string" },
    {
      label: "Channel",
      name: "channel",
      type: "string",
      renderCell: (row) => CHANNEL_LABELS[row.channel as TransactionChannel] ?? row.channel
    },
    { label: "Mã PVV", name: "employee_id", type: "string" },
    { label: "PVV", name: "employee_name", type: "string" },
    {
      label: "Kết thúc PV",
      name: "interview_end",
      type: "date",
      renderCell: (row) => formatDateTime(row.interview_end)
    },
    {
      label: "Nhận quà",
      name: "gift_time",
      type: "date",
      renderCell: (row) => formatDateTime(row.gift_time)
    },
    {
      label: "Giá trị quà",
      name: "amount",
      type: "number",
      align: "right",
      renderCell: (row) => formatAmount(row.amount)
    },
    {
      label: "Chênh lệch",
      name: "gap_minutes",
      type: "number",
      align: "right",
      renderCell: (row) => (
        <Typography component="span" color="error" fontWeight={600} fontSize="inherit">
          {formatMinutes(row.gap_minutes)}
        </Typography>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 3, mt: 2 }}>
        <TextField
          select
          size="small"
          label="Channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as TransactionChannel | "")}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {CHANNELS.map((c) => (
            <MenuItem key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </MenuItem>
          ))}
        </TextField>

        <SearchDatePickerFromTo
          key={datePickerKey}
          fromValue={dateFrom ? dayjs(dateFrom) : null}
          toValue={dateTo ? dayjs(dateTo) : null}
          buttonLabel="LỌC"
          loadingButton={actionState.loading}
          onSearchChange={handleDateRangeChange}
        />

        {(dateFrom || dateTo) && (
          <Button size="small" onClick={handleClearDates}>
            Xoá lọc ngày
          </Button>
        )}
      </Box>

      {actionState.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionState.message}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Số đáp viên đã nhận quà"
            value={numeral(total).format("0,0")}
            caption={channelBreakdown("count")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Tổng giá trị quà (VNĐ)"
            value={formatAmount(statistics?.total_amount)}
            caption={channelBreakdown("amount")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Thời gian trung vị: kết thúc PV → nhận quà"
            value={formatMinutes(statistics?.gap_median_minutes)}
            caption={gapUnknown > 0 ? `${gapUnknown} ca thiếu thời gian kết thúc PV, không tính` : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Số ca bất thường (nhận quà trước khi PV xong)"
            value={anomaliesTotal}
            color={anomaliesTotal > 0 ? "error" : "inherit"}
            caption={total > 0 ? `${numeral(anomaliesTotal / total).format("0.[0]%")} tổng số đáp viên` : undefined}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <HourlyHistogramChart
            title="Khung giờ bắt đầu phỏng vấn"
            data={toHistogramData(statistics?.interview_time_buckets)}
            valueLabel="Số cuộc phỏng vấn"
          />
        </Grid>
        <Grid item xs={12}>
          <HourlyHistogramChart
            title="Khung giờ nhận quà"
            data={toHistogramData(statistics?.gift_time_buckets)}
            valueLabel="Số lượt nhận quà"
          />
        </Grid>
        <Grid item xs={12}>
          <BarChartWidget
            title="Khoảng cách: kết thúc PV → nhận quà"
            data={toChartData(statistics?.gap_buckets, GAP_ORDER)}
            sorted={false}
            sortedList={GAP_ORDER}
          />
        </Grid>
      </Grid>

      <ReusableTable
        topToolbar={
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Danh sách cần kiểm tra (quà nhận trước khi phỏng vấn kết thúc)
            </Typography>
            {anomaliesTotal > anomalies.length && (
              <Typography variant="body2" color="text.secondary">
                Hiển thị {anomalies.length}/{anomaliesTotal} ca chênh lệch lớn nhất, thu hẹp bộ lọc để xem đủ.
              </Typography>
            )}
          </Box>
        }
        columns={anomalyColumns}
        data={pagedAnomalies}
        actionStatus={{ type: actionState.type, loading: actionState.loading }}
        page={anomalyPage}
        rowsPerPage={anomalyRowsPerPage}
        total={anomalies.length}
        onPageChange={(event, newPage) => setAnomalyPage(newPage)}
        onRowsPerPageChange={(event) => {
          setAnomalyRowsPerPage(parseInt(event.target.value, 10));
          setAnomalyPage(0);
        }}
      />
    </Box>
  );
};

export default TransactionStatisticsPanel;
