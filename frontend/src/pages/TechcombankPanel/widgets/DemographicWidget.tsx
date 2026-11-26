import React from "react";
import type { SxProps } from '@mui/material/styles';
import PieChart from "../../../components/Charts/PieChartComponent";
import ProgressBarChartComponent from "../../../components/Charts/ProgressBarChartComponent";
import { Card, CardContent, CardHeader } from "@mui/material";
import { useTranslation } from "react-i18next";
import { translateDataValue } from "../../../i18n/i18n";

interface Data {
    name: string,
    value: number,
}

interface DemographicWidgetProps {
    ageGroupData: Data[],
    genderData: Data[],
    provinceData: Data[],
}

const DemographicWidget: React.FC<DemographicWidgetProps> = ({ ageGroupData, genderData, provinceData }) => {
    const { t } = useTranslation();
    
    //Translate genderData
    const translateGenderData = genderData.map(item => ({
        ...item,
        name: translateDataValue('dashboard.gender_categories', String(item.name))
    }));
    
    return (
        <Card className="widget-container">
            <CardContent>
                <div className="widget-row-item">
                    <PieChart title={t('dashboard.gender')} data={translateGenderData} />
                    <PieChart title={t('dashboard.age_group')} data={ageGroupData} />
                </div>
                <div className="widget-row-item">
                    <ProgressBarChartComponent title={t('dashboard.province')} data={provinceData} />
                </div>
            </CardContent>
        </Card>
    );
}

export default DemographicWidget;