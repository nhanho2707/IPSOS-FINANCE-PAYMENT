import { useState, useEffect } from "react";
import axios from "axios";
import { Select, MenuItem, Box, Button, Card, CardContent, Typography, TextField, Menu, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, FormControl, InputLabel, Grid, Stack } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { ApiConfig } from "../../config/ApiConfig";
import ReusableTable from "../../components/Table/ReusableTable";
import { ColumnFormat } from "../../config/ColumnConfig";
import { MiniCATICellConfig } from "../../config/MiniCATIFieldsConfig";
import { FilterData, useCATIRespondents } from "../../hook/useCATIRespondents";



export default function MiniCATI() {
  const { options, currentRespondent, catiRespondents, actionState, page, rowsPerPage, searchTerm, total, setPage, setRowsPerPage, setSearchTerm, setCurrentRespondent, fetchCATISuppendedList, getCatiRespondent, updateStatus } = useCATIRespondents();

  const [filters, setFilters] = useState<FilterData>({
    filter_1: "",
    filter_2: "",
    filter_3: "",
    filter_4: ""
  });

  const statusOptions = [
      { value: "Done", label: "Thành công" },
      { value: "Suspended", label: "Hẹn gọi lại" },

      { value: "Reject_Industry", label: "Thuộc ngành cấm" },
      { value: "Reject_NoMemory", label: "Không nhớ giao dịch" },
      { value: "Reject_NoTransaction", label: "Không có giao dịch" },
      { value: "Reject_Refuse", label: "Từ chối tham gia" },
      { value: "Reject_WrongPhone", label: "Số điện thoại sai" },
      // { value: "Reject_NoAnswer", label: "Không nghe máy" },
  ];

  const columns: ColumnFormat[] = [
    ...MiniCATICellConfig,
    {
      label: "",
      name: "Action",
      type: "string",
      align: "center",
      renderAction: (row: any) => {
        return (
           <Button
            size="small"
            variant="outlined"
            onClick={() => setCurrentRespondent(row)}
          >
            Gọi lại
          </Button>
        )
      },
    }
  ];

  const handleNext = async () => {
    await getCatiRespondent(filters);
  }

  useEffect(() => {
    setCurrentRespondent(null);
  }, [filters]);

  const [status, setStatus] = useState("");
  const [comment, setComment] = useState("");
  
  const handleSubmit = async () => {
    if (!status || !currentRespondent) return;

    let finalStatus = status;
    let finalComment = "";

    const selected = statusOptions.find((s) => s.value === status);

    if (status === "Suspended") {
        if (!comment.trim()) return alert("Vui lòng nhập ghi chú");
        finalComment = comment;
    } else if (status.startsWith("Reject")) {
        finalComment = selected?.label || "";
    }

    await updateStatus(Number(currentRespondent.id), status, finalComment);

    // reset
    setStatus("");
    setComment("");
    setCurrentRespondent(null);

    await fetchCATISuppendedList();
  };

  const handleChangePage = (event: any, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  return (
    <Box p={3}>
      
      {/* ================= FILTER ================= */}
      <Grid container spacing={2}>
        {Object.entries(options || {
          filter_1: [],
          filter_2: [],
          filter_3: [],
          filter_4: []
        }).map(([key, values]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <div style={{ marginBottom: "1rem" }}>
              <Typography variant="body2" gutterBottom>
                  Filter {key.replace("filter_", "")}
              </Typography>
              <Select
                value={filters[key as keyof typeof filters]}
                displayEmpty
                fullWidth
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
              >
                <MenuItem value="">All</MenuItem>
                  {values.map((item: string) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
              </Select>
            </div>
          </Grid>
        ))}
      </Grid>

      <Box display="flex" gap={2} mb={2}>
        <Button 
            disabled={Boolean(currentRespondent)}
            variant="contained" 
            onClick={handleNext}
        >
            Next
        </Button>
      </Box>

      {/* ================= CALL SCREEN ================= */}
      {currentRespondent?.id ? (
        
        <Box>
            <Card sx={{ maxWidth: 900, margin: "auto", mt: 3, mb: 3, borderRadius: 3, boxShadow: 3 }}>
                <CardContent>

                    {/* 🔥 Title */}
                    <Typography variant="h6" fontWeight="bold" mb={2}>
                    Respondent Information
                    </Typography>

                    {/* 🔥 Info */}
                    <Box mb={2}>
                        <Typography>
                            <strong>ID:</strong> {currentRespondent.respondent_id}
                        </Typography>

                        <Typography>
                            <strong>Phone:</strong> {currentRespondent.phone}
                        </Typography>

                        <Typography color="error">
                            Vui lòng thực hiện phỏng vấn trực tiếp bên dưới (không mở link ngoài)
                        </Typography>
                    </Box>

                    <Box
                      sx={{
                        border: "1px solid #ddd",
                        borderRadius: 2,
                        overflow: "hidden",
                        mb: 3
                      }}
                    >
                      <iframe
                        key={currentRespondent.id}
                        src={currentRespondent.link}
                        width="100%"
                        height="600px"
                        style={{
                          border: "none"
                        }}
                      />
                    </Box>

                    {/* 🔥 Action buttons */}
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                    
                        {/* 🔽 Status Combobox */}
                        <TextField
                            select
                            label="Select Status"
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setComment("");
                            }}
                            fullWidth
                        >
                            {statusOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* 📝 Comment */}
                        {status === "Suspended" && (
                            <TextField
                                label="Comment (optional)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                            />
                        )}
                        
                        {/* 🚀 Submit */}
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={!status}
                            onClick={handleSubmit}
                        >
                            Submit
                        </Button>

                    </Box>

                </CardContent>
            </Card>
        </Box>
      ) : (
        <p>No sample available</p>
      )}
      
      <ReusableTable
        title="Danh sách hẹn gọi lại"
        columns={columns}
        data={catiRespondents}
        actionStatus={actionState}
        page = {page}
        rowsPerPage = {rowsPerPage}
        total = {total}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        topToolbar={
          <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ pt: 2, pb: 2 }}
          >
              <TextField
                label="Search phone"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(0);
                }}
                sx={{ width: "100%", maxWidth: 320 }}
              />
          </Stack>
        }
      />
    </Box>
  );
}