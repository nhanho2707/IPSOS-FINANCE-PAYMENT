import { useState } from "react";
import { Box, Card, CardContent, Grid, MenuItem, TextField, Typography } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { useTransactionStatistics } from "../hook/useTransactionStatistics";
import BarChartWidget from "../pages/TechcombankPanel/widgets/BarChartWidget";
import HourlyHistogramChart from "./Charts/HourlyHistogramChart";
import SearchDatePickerFromTo from "./SearchDatePickerFromTo";
import ReusableTable from "./Table/ReusableTable";
import { ColumnFormat } from "../config/ColumnConfig";

const GAP_ORDER = ["< 0 (bất thường)", "0 - 30 phút", "30 phút - 2 giờ", "2 - 24 giờ", "> 24 giờ"];

const toChartData = (buckets: Record<string, number> | undefined, order: string[]) =>
  order.map((name) => ({ name, value: buckets?.[name] ?? 0 }));

const toHistogramData = (buckets: Record<string, number> | undefined) =>
  Object.entries(buckets ?? {}).map(([name, value]) => ({ name, value }));

interface TransactionStatisticsPanelProps {
  projectId: number;
}

const TransactionStatisticsPanel: React.FC<TransactionStatisticsPanelProps> = ({ projectId }) => {
  const {
    statistics,
    loading,
    error,
    message,
    channel,
    setChannel,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo
  } = useTransactionStatistics(projectId);

  const [anomalyPage, setAnomalyPage] = useState(0);
  const [anomalyRowsPerPage, setAnomalyRowsPerPage] = useState(10);

  const handleDateRangeChange = (from: Dayjs | null, to: Dayjs | null) => {
    setDateFrom(from ? from.format("YYYY-MM-DD") : null);
    setDateTo(to ? to.format("YYYY-MM-DD") : null);
  };

  const anomalies = statistics?.anomalies ?? [];
  const anomaliesTotal = statistics?.anomalies_total ?? 0;
  const pagedAnomalies = anomalies.slice(
    anomalyPage * anomalyRowsPerPage,
    anomalyPage * anomalyRowsPerPage + anomalyRowsPerPage
  );

  const anomalyColumns: ColumnFormat[] = [
    { label: "Respondent ID", name: "respondent_id", type: "string" },
    { label: "SĐT", name: "phone", type: "string" },
    { label: "Channel", name: "channel", type: "string" },
    { label: "PVV", name: "employee_name", type: "string" },
    { label: "Kết thúc PV", name: "interview_end", type: "string" },
    { label: "Nhận quà", name: "gift_time", type: "string" },
    {
      label: "Chênh lệch (phút)",
      name: "gap_minutes",
      type: "number",
      align: "right",
      renderCell: (row) => (
        <Typography component="span" color="error" fontWeight={600}>
          {row.gap_minutes}
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
          onChange={(e) => setChannel(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="vinnet">Vinnet</MenuItem>
          <MenuItem value="gotit">GotIt</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>

        <SearchDatePickerFromTo
          fromValue={dateFrom ? dayjs(dateFrom) : null}
          toValue={dateTo ? dayjs(dateTo) : null}
          buttonLabel="LỌC"
          loadingButton={loading}
          onSearchChange={handleDateRangeChange}
        />
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {message}
        </Typography>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Tổng số giao dịch thành công
              </Typography>
              <Typography variant="h4">{statistics?.total ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Số ca bất thường (nhận quà trước khi PV xong)
              </Typography>
              <Typography variant="h4" color={(statistics?.anomalies_total ?? 0) > 0 ? "error" : "inherit"}>
                {statistics?.anomalies_total ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <HourlyHistogramChart
            title="Khung giờ phỏng vấn"
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

      {anomalies.length > 0 && (
        <ReusableTable
          title={
            anomaliesTotal > anomalies.length
              ? `Danh sách cần kiểm tra (quà nhận trước khi phỏng vấn kết thúc) — hiển thị ${anomalies.length}/${anomaliesTotal} ca nặng nhất, thu hẹp bộ lọc để xem đủ`
              : "Danh sách cần kiểm tra (quà nhận trước khi phỏng vấn kết thúc)"
          }
          columns={anomalyColumns}
          data={pagedAnomalies}
          actionStatus={{ type: "fetch", loading, error, message }}
          page={anomalyPage}
          rowsPerPage={anomalyRowsPerPage}
          total={anomalies.length}
          onPageChange={(event, newPage) => setAnomalyPage(newPage)}
          onRowsPerPageChange={(event) => {
            setAnomalyRowsPerPage(parseInt(event.target.value, 10));
            setAnomalyPage(0);
          }}
        />
      )}
    </Box>
  );
};

export default TransactionStatisticsPanel;
