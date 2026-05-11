import { useState } from "react";
import TablePagination from "@mui/material/TablePagination";
import {
  IconButton,
  TableCell,
  TableRow,
  TableBody,
  TableHead,
  Table,
  TableContainer,
  Paper,
  Button,
  Box,
  Popover,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import ModalAddProject from "../Modals/Project/ModalAddProject";
import SdCardAlertOutlinedIcon from '@mui/icons-material/SdCardAlertOutlined';
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../utils/DateUtils";
import logo from "../../assets/img/Ipsos logo.svg";
import { toProperCase } from "../../utils/format-text-functions";
import { useProjects } from "../../hook/useProjects";
import { useMetadata } from "../../hook/useMetadata";
import { useVisibility } from "../../hook/useVisibility";
import axios from "axios";
import useDialog from "../../hook/useDialog";
import AlertDialog from "../AlertDialog/AlertDialog";
import SearchTextBox from "../SearchTextBox";
import dayjs, { Dayjs } from 'dayjs';
import SearchDatePickerFromTo from "../SearchDatePickerFromTo";
import { ProjectCellConfig } from "../../config/ProjectFieldsConfig";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const TableProjects = () => {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const { canView } = useVisibility();
  const { open, title, message, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();

  // Define color mapping for each status
  const statusColors: { [key: string]: string } = {
    'planned': '#FFA500', // Orange
    'in coming': '#FFD700', // Gold
    'on going': '#00BFFF', // DeepSkyBlue
    'completed': '#32CD32', // LimeGreen
    'on hold': '#FF6347', // Tomato
    'cancelled': '#B22222', // FireBrick
  };

  // Define allowed transitions for each status
  const statusTransitions: { [key: string] : string[] } = {
    'planned' : ['in coming', 'cancelled'], 
    'in coming' : ['on going', 'on hold', 'cancelled'], 
    'on going' : ['completed', 'on hold', 'cancelled'], 
    'completed' : ['on going', 'on hold', 'cancelled'], 
    'on hold' : ['on going', 'completed', 'cancelled'], 
    'cancelled' : ['on going', 'on hold', 'cancelled']
  };

  const [anchorElStatus, setAnchorElStatus] = useState<HTMLElement | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const { projects, actionState, page, rowsPerPage, total, setPage, setRowsPerPage, searchTerm, setSearchTerm, searchFromDate, setSearchFromDate, searchToDate, setSearchToDate, updateProjectStatus } = useProjects();
  const { data, isLoading, isError } = useMetadata();

  const handleChangePage = (event: any, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value.toLocaleLowerCase());
    setPage(0);
  }

  const handleMenuStatusClose = () => {
    setAnchorElStatus(null);
    setSelectedProject(null);
  };
  
  const handleMenuStatusClick = (event: React.MouseEvent<HTMLElement>, project: any) => {
    setAnchorElStatus(event.currentTarget);
    setSelectedProject(project);
  };

  const handleUpdateStatus = async (project: any, status: string) => {
    if(project.count_employees == 0 && status === 'on going'){
      openDialog({
        title: "Update Status",
        message: 'Vui lòng cập nhật danh sách phỏng vấn viên trước khi "on going" dự án!',
        showConfirmButton: false
      });
      return;
    }
    
    openDialog({
      title: "Update Status",
      message: `Bạn có chắc chắn muốn thay đổi trạng thái dự án sang "${status}" không?`,
      showConfirmButton: true,
      onConfirm: async () => {
        try{
          await updateProjectStatus(project.id, status);
          console.log("Cập nhật status thành công.");
        } catch(error){
          console.log("Update status failed:", error);

          if(axios.isAxiosError(error) && error.response?.status === 403){
            openDialog({
              title: "Update Status",
              message: "Bạn không có quyền thay đổi trạng thái của dự án này.",
              showConfirmButton: false
            });
          } else {
            openDialog({
              title: "Update Status",
              message: "Có lỗi xảy ra khi cập nhật trạng thái của dự án. Vui lòng thử lại.",
              showConfirmButton: false
            });
          }
        }finally{
          handleMenuStatusClose();
        }
      }
    });
  }

  const [openModalAdd, setOpenModalAdd] = useState<boolean>(false);
  const [openModalEdit, setOpenModalEdit] = useState<boolean>(false);
  const [openModalReport, setOpenModalReport] = useState<boolean>(false);
  const [openModalConfirm, setOpenModalConfirm] = useState<boolean>(false);
  
  const handleCloseModal = () => {
    //setOpenImportExcelModal(false);
    setOpenModalAdd(false);
    setOpenModalEdit(false);
    setOpenModalReport(false);
    setOpenModalConfirm(false);
  };

  const handleOpenModalReport = (project: any) => {
    setSelectedProject(project);
    setOpenModalReport(true);
  };
  
  const renderContent = (item: any, project: any) => {
    switch(true){
      case item.label === 'Status':
        return `<div>
                  <span className="status-options">${project[item.name]}</span>
                </div>`
      default:
        switch(true){
          case item.type === 'date':
            return formatDate(project[item.name]);
          case item.type === 'string':
            return project[item.name];
        }
    }
  }

  const handleDateChange = (from: Dayjs | null, to: Dayjs | null) => {
    if (!from || !to) return;

    if (from && to) {
        setSearchFromDate(from);
        setSearchToDate(to);
    }
  };

  return (
    <>
      <Box className="box-table">
        <div className="filter">
          <div className="filter-left">
            <h2 className="filter-title">Projects</h2>
          </div>
          <div className="filter-right">
            {canView("projects.functions.visible_add_new_project") && (
              <Button className="btn btn-primary" onClick={() => setOpenModalAdd(true)}>
                Add New Project
              </Button>
            )}
          </div>
        </div>
        <div className="filter">
          {/* LEFT: Add button */}
          <div className="filter-left">
            <SearchDatePickerFromTo fromValue={searchFromDate} toValue={searchToDate} onSearchChange={handleDateChange}/>
          </div>

          {/* RIGHT: Search + Date filter */}
          <div className="filter-right">
            <SearchTextBox
              placeholder="Search project name, internal code,..."
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>
        
        { (actionState.error && isError) ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <SdCardAlertOutlinedIcon />
            <div>{actionState.error ?? isError}</div>
          </Box>
        ) : (
          (actionState.loading && isLoading) ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} className="table-container">
              <Table>
                <TableHead>
                  <TableRow className="header-table">
                    {ProjectCellConfig.map((item, index) => {
                      return <TableCell 
                              key={index}
                              align={ item.label === 'Status' ? 'center' : 'left' }
                              width={item.width}
                              >
                                {item.label}
                              </TableCell>;
                    })}
                    <TableCell sx={{
                      width: '50px',
                      textAlign: 'center'
                    }}> 
                      Sample Size
                    </TableCell>
                    <TableCell sx={{
                      width: '50px',
                      textAlign: 'center'
                    }}>Status</TableCell>
                    <TableCell sx={{
                      width: '50px',
                      textAlign: 'center'
                    }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
  
                <TableBody>
                  {projects
                    .map((project: any) => (
                      <TableRow key={project.id} className="table-row" hover={true}>
                        {ProjectCellConfig.map((item, index) => (
                          <TableCell 
                            key={item.name} 
                            className="table-cell"
                            width={item.width}
                            align={ item.label === 'Status' ? 'center' : 'left' }
                          >
                            { 
                              item.label === 'Status' ? (
                                <div>
                                  <span className={"txt-status-project " + project.status.toLocaleLowerCase().replace(" ", "-")} >{toProperCase(project[item.name])}</span>
                                </div>
                              ) : ((item.label.length == 0 && item.type === 'image' ? (
                                <div className="icon-project"><img src={logo}></img></div>
                              ) : (renderContent(item, project)))) 
                            }
                          </TableCell>
                        ))}
                        <TableCell
                          className="table-cell"
                          width={50}
                          align="center"
                        > 
                          {
                            (project.count_respondents || 0)
                          } /
                          {
                            project.provinces.reduce((sum: number, p: any) => {
                              return sum + (p.sample_size_main || 0) + (p.sample_size_booters || 0);
                            }, 0)
                          }
                        </TableCell>
                        <TableCell
                          className="table-cell"
                          width={50}
                          align="center"
                        >
                          <IconButton
                            aria-label="status"
                            size="small"
                            onClick={(event) => handleMenuStatusClick(event, project)} style={{ cursor: 'pointer', background: 'transparent'}}
                          >
                            <div className={"box-status-button " + project.status.toLocaleLowerCase().replace(" ", "-")}>
                              <div>{toProperCase(project.status)}</div>
                            </div>
                          </IconButton>
                          <Popover
                            id={`status-popover-${selectedProject?.id}`}
                            open={canView("projects.functions.visible_change_status_of_project") && Boolean(anchorElStatus) && selectedProject?.id === project.id}
                            anchorEl={anchorElStatus}
                            onClose={handleMenuStatusClose}
                            anchorOrigin={{
                              vertical: "bottom",
                              horizontal: "left",
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'center',
                            }}
                          >
                            <List>
                              {statusTransitions[project.status].map((status_item, status_index) => (
                                <ListItem 
                                  button 
                                  key={status_index}
                                  onClick= { () => handleUpdateStatus(selectedProject, status_item) }
                                >
                                  <ListItemText primary= {
                                    <div className="box-status-popover">
                                      <div className={"icon-status-project " + status_item.toLocaleLowerCase().replace(" ", "-")}></div>
                                      <div>{toProperCase(status_item)}</div>
                                    </div>
                                  }/>
                                </ListItem>
                              ))}
                            </List>
                          </Popover>
                        </TableCell>
                        <TableCell 
                          className="table-cell"
                          width={50}
                          align="center"
                        >
                          <IconButton
                            aria-label="actions"
                            onClick={() =>
                              navigate(`/project-management/projects/${project.id}/quotation`, )
                            }
                            sx={{
                              backgroundColor: '#f6f6f6', 
                              borderRadius: '8px',
                              border: '1px solid #e8e8e8',
                              '&:hover': {
                                backgroundColor: '#e0e0e0',
                              },
                              padding: '5px',
                            }}
                          >
                            <ArrowForwardIosIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[10, 20, 50]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ color: "var(--text-color)" }}
              />
            </TableContainer>
          )
        )}
      </Box>
      
      <AlertDialog
        open={open}
        title={title}
        message={message}
        showConfirmButton={showConfirmButton}
        onClose={closeDialog}
        onConfirm={confirmDialog}
      />

      {/* show Modal Add */}
      <ModalAddProject 
        openModal={openModalAdd} 
        onClose={handleCloseModal} 
        metadata={data}
      />
    </>
  );
};

export default TableProjects;
