import { ColumnFormat } from "./ColumnConfig";

export const ModalAddRespondentConfig: ColumnFormat[] = [
  {
    label: "First Name",
    name: "first_name",
    type: "string",
  },
  {
    label: "Last Name",
    name: "last_name",
    type: "string",
  },
  {
    label: "Gender",
    name: "gender",
    type: "select",
    options: [
      { value: 1, label: 'Male' },
      { value: 2, label: 'Female' }
    ],
  },
  {
    label: "Date Of Birth",
    name: "date_of_birth",
    type: "date",
  },
  {
    label: "Team",
    name: "teams",
    type: "select",
    options: [],
  },
  {
    label: "Project Type",
    name: "project_types",
    type: "select",
    options: [],
  },
  {
    label: "Start FW",
    name: "planned_field_start",
    type: "date",
  },
  {
    label: "End FW",
    name: "planned_field_end",
    type: "date",
  },
];