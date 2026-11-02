import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import { Alert, Box, Button, Grid, MenuItem, TextField, Typography } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { TransactionChannel, useTransactionStatistics } from "../hook/useTransactionStatistics";
import HourlyHistogramChart from "./Charts/HourlyHistogramChart";
import SearchDatePickerFromTo from "./SearchDatePickerFromTo";
import ReusableTable from "./Table/ReusableTable";
import { ColumnFormat } from "../config/ColumnConfig";
import { formatDateTime, formatNumber, formatPercent } from "../utils/format";

const CHANNEL_LABELS: Record<TransactionChannel, string> = {
  vinnet: "Vinnet",
  gotit: "GotIt",
  other: "Other"
};

const CHANNELS = Object.keys(CHANNEL_LABELS) as TransactionChannel[];

// All-zero buckets are sent as empty so the chart shows its "no data" state instead of flat bars.
const toHistogramData = (buckets: Record<string, number> | undefined) => {
  const data = Object.entries(buckets ?? {}).map(([name, value]) => ({ name, value }));
  return data.some((d) => d.value > 0) ? data : [];
};

const formatMinutes = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return "—";

  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);

  if (abs < 60) return `${sign}${abs} min`;
  if (abs < 1440) return `${sign}${Math.floor(abs / 60)}h ${abs % 60}m`;

  return `${sign}${Math.floor(abs / 1440)}d ${Math.floor((abs % 1440) / 60)}h`;
};

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
  const gapOffline = statistics?.gap_offline ?? 0;
  const toleranceText = statistics ? ` > ${statistics.anomaly_tolerance_minutes} min` : "";
  const measuredTotal = total - gapUnknown - gapOffline;
  const gapExcludedCaption = [
    gapUnknown > 0 ? `${gapUnknown} interviews missing an end time` : null,
    gapOffline > 0 ? `${gapOffline} offline interviews (no actual interview time)` : null
  ].filter(Boolean).join(", ");
  const pagedAnomalies = anomalies.slice(
    anomalyPage * anomalyRowsPerPage,
    anomalyPage * anomalyRowsPerPage + anomalyRowsPerPage
  );

  const channelBreakdown = (field: "count" | "amount") =>
    CHANNELS.filter((c) => (statistics?.by_channel?.[c]?.count ?? 0) > 0)
      .map((c) => {
        const value = statistics?.by_channel[c][field] ?? 0;
        return `${CHANNEL_LABELS[c]}: ${field === "amount" ? formatNumber(value) : value}`;
      })
      .join(" · ");

  const anomalyColumns: ColumnFormat[] = [
    { label: "Respondent ID", name: "respondent_id", type: "string", width: 112 },
    { label: "Phone", name: "phone", type: "string", width: 116 },
    {
      label: "Channel",
      name: "channel",
      type: "string",
      width: 84,
      renderCell: (row) => CHANNEL_LABELS[row.channel as TransactionChannel] ?? row.channel
    },
    { label: "Interviewer ID", name: "employee_id", type: "string", width: 112 },
    { label: "PVV", name: "employee_name", type: "string" },
    {
      label: "Interview ended",
      name: "interview_end",
      type: "date",
      renderCell: (row) => formatDateTime(row.interview_end)
    },
    {
      label: "Gift received",
      name: "gift_time",
      type: "date",
      renderCell: (row) => formatDateTime(row.gift_time)
    },
    {
      label: "Gift value",
      name: "amount",
      type: "number",
      align: "right",
      width: 96,
      renderCell: (row) => formatNumber(row.amount)
    },
    {
      label: "Gap",
      name: "gap_minutes",
      type: "number",
      align: "right",
      width: 88,
      renderCell: (row) => (
        <Typography component="span" color="error" sx={{ fontWeight: 600, fontSize: "inherit" }}>
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
          <MenuItem value="">All</MenuItem>
          {CHANNELS.map((c) => (
            <MenuItem key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </MenuItem>
          ))}
        </TextField>

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Interview date:
        </Typography>

        <SearchDatePickerFromTo
          key={datePickerKey}
          fromValue={dateFrom ? dayjs(dateFrom) : null}
          toValue={dateTo ? dayjs(dateTo) : null}
          buttonLabel="Filter"
          loadingButton={actionState.loading}
          onSearchChange={handleDateRangeChange}
        />

        {(dateFrom || dateTo) && (
          <Button size="small" onClick={handleClearDates}>
            Clear date filter
          </Button>
        )}
      </Box>

      {actionState.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionState.message}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Respondents who received a gift"
            value={formatNumber(total)}
            caption={channelBreakdown("count")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total gift value (VND)"
            value={formatNumber(statistics?.total_amount)}
            caption={channelBreakdown("amount")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Median time: interview end → gift received"
            value={formatMinutes(statistics?.gap_median_minutes)}
            caption={gapExcludedCaption ? `Excludes: ${gapExcludedCaption}` : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={`Anomalies (gift received before interview ended${toleranceText})`}
            value={anomaliesTotal}
            tone={anomaliesTotal > 0 ? "danger" : "default"}
            caption={measuredTotal > 0 ? `${formatPercent(anomaliesTotal / measuredTotal)} of measurable interviews` : undefined}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={12}>
          <HourlyHistogramChart
            title="Interview start time (Vietnam time)"
            data={toHistogramData(statistics?.interview_time_buckets)}
            valueLabel="Interviews"
          />
        </Grid>
        <Grid size={12}>
          <HourlyHistogramChart
            title="Gift received time (Vietnam time)"
            data={toHistogramData(statistics?.gift_time_buckets)}
            valueLabel="Gifts received"
          />
        </Grid>
        <Grid size={12}>
          {/* The backend owns the bucket labels (they embed the tolerance) and sends them in display order. */}
          <HourlyHistogramChart
            title="Gap: interview end → gift received"
            data={toHistogramData(statistics?.gap_buckets)}
            valueLabel="Gifts received"
          />
        </Grid>
      </Grid>

      <ReusableTable
        topToolbar={
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Needs review (gift received before interview ended{toleranceText})
            </Typography>
            {anomaliesTotal > anomalies.length && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Showing the {anomalies.length}/{anomaliesTotal} largest gaps. Narrow the filters to see all.
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
