import { ColumnFormat } from "./ColumnConfig";

export const ProjectCellConfig: ColumnFormat[] = [
  {
    label: "Symphony",
    name: "symphony",
    type: "string"
  },
  {
    label: "Internal Code",
    name: "internal_code",
    type: "string"
  },
  {
    label: "Project Name",
    name: "project_name",
    type: "string"
  },
  {
    label: "Field Start",
    name: "planned_field_start",
    type: "date"
  },
  {
    label: "Field End",
    name: "planned_field_end",
    type: "date"
  },
];

export interface ProvinceData {
  id: string,
  name: string,
  sample_size_main: number,
  price_main: number,
  sample_size_booters: number,
  price_boosters: number
}

export interface ProjectData {
    id?: number,
    internal_code?: string;
    project_name: string;
    status?: string,
    symphony?: string;
    platform: string;
    teams: string[];
    project_types: string[];
    provinces?: ProvinceData[];
    planned_field_start: string;
    planned_field_end: string;
    actual_field_start?: string;
    actual_field_end?: string;
    project_objectives?: string,
    remember_token?: string,
    remember_uuid?: string,
    count_respondents?: number,
    count_employees?: number,
};

export const ProjectGeneralFieldsConfig: ColumnFormat[] = [
  {
    label: "Project Name",
    name: "project_name",
    type: "string",
    grid: 12,
    order: 3,
    visible: true
  },
  {
    label: "Platform",
    name: "platform",
    type: "select",
    options: [
      { value: 'iField', label: 'iField' },
      { value: 'Dimensions', label:  'Dimensions' },
      { value: 'Other', label: 'Other' }
    ],
    visible: false
  },
  {
    label: "Team",
    name: "teams",
    type: "select",
    options: [],
    visible: false
  },
  {
    label: "Project Types",
    name: "project_types",
    type: "select",
    options: [],
    visible: false
  },
  {
    label: "Planned Start FW",
    name: "planned_field_start",
    type: "date",
    visible: false
  },
  {
    label: "Planned End FW",
    name: "planned_field_end",
    type: "date",
    visible: false
  },
];

export const ProjectFieldsConfig: ColumnFormat[] = [
  ... ProjectGeneralFieldsConfig,
  {
    label: "Remember Token",
    name: "remember_token",
    type: "string",
    grid: 12,
    order: 4,
    visible: true
  },
  {
    label: "Actual Start FW",
    name: "actual_field_start",
    type: "date",
    visible: false
  },
  {
    label: "Actual End FW",
    name: "actual_field_end",
    type: "date",
    visible: false
  },
]



