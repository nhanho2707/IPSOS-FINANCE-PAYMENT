
import { useEffect, useState } from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import axios from 'axios';
import { ApiConfig } from '../../config/ApiConfig';
import numeral from 'numeral';
import SummaryWidget from './widgets/SummaryWidget';
import DemographicWidget from './widgets/DemographicWidget';
import BarChartWidget from './widgets/BarChartWidget';
import RecruitmentWidget from './widgets/RecruitmentWidget';
import { useTranslation } from 'react-i18next';
import VennChartWidget from '../../components/Widgets/VennChartWidget';

export interface Survey {
    id: number,
    name: string,
    engagment: string,
    project_type: string,
    sent_out: number,
    respond: number,
    respond_rate: number,
    completed_qualified: number,
    cancellation: number,
    number_of_question: number,
    open_date: string,
    close_date: string,
    resource: string,
};

interface ChartData {
    name: string,
    value: number,
}

interface VennChartData {
    sets: string[]; 
    size: number
}

const Panellist:React.FC = () => {
    const { i18n, t } = useTranslation();
    
    const [statusMessage, setStatusMessage] = useState("");
    const [isError, setIsError] = useState<boolean | null>(null);

    const [ surveys, setSurveys ] = useState<Survey[]>([]);
    
    const [ dataTotalMembers, setTotalMembers ] = useState<string>('0');
    
    const [ resourceData, setResourceData] = useState<ChartData[]>([]);
    const [ genderDistributionData, setGenderDistributionData ] = useState<ChartData[]>([]);
    const [ provinceData, setProvinceData] = useState<ChartData[]>([]);
    const [ ageGroupData, setAgeGroupData] = useState<ChartData[]>([]);
    const [ occupationData, setOccupationData] = useState<ChartData[]>([]);
    const [ houseHoldIncomeData, setHouseHoldIncomeData] = useState<ChartData[]>([]);
    const [ aumData, setAUMData] = useState<ChartData[]>([]);
    const [ mainBankData, setMainBankData] = useState<ChartData[]>([]);
    const [ productsData, setProductsData] = useState<ChartData[]>([]);
    const [ vennProductsData, setVennProductsData] = useState<VennChartData[]>([]);
    const [ channelsData, setChannelsData] = useState<ChartData[]>([]);
    const [ panellistData, setPanellistData] = useState([]);

    useEffect(() => {
        const fetchTechcombankSurvey = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.viewTechcombankSurveys);
                const data: Survey[] = response.data.data;

                const uniqueSurveys = Array.from(new Map(data.map(survey => [survey.id, survey])).values());

                setSurveys(uniqueSurveys);
            } catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchTotalMembers = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getTotalMembers);

                setTotalMembers(numeral(response.data.count).format('0,000'));
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchPanellist = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getPanellist);

                setPanellistData(response.data);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchGenderDistribution = async () => {
            try{
                const url = ApiConfig.techcombank_panel.getCount.replace("{table_name}", "techcombank_panel").replace("{column_name}", "gender");
                const response = await axios.get(url);

                const apiData = response.data;

                const formattedData: ChartData[] = apiData.map((item: {gender: string, count: number}) => ({
                    name: item.gender,
                    value: item.count
                }));

                setGenderDistributionData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchResource = async () => {
            try{
                const url = ApiConfig.techcombank_panel.getCount.replace("{table_name}", "techcombank_panel").replace("{column_name}", "resource");
                const response = await axios.get(url);

                const apiData = response.data;

                const formattedData: ChartData[] = apiData.map((item: {resource: string, count: number}) => ({
                    name: item.resource,
                    value: item.count
                }));

                setResourceData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchProvince = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getProvince);

                const apiData = response.data;

                const formattedData: ChartData[] = apiData.map((item: {province_name: string, count: number}) => ({
                    name: item.province_name,
                    value: item.count
                }));

                setProvinceData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchAgeGroup = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getAgeGroup);

                const apiData = response.data;

                const formattedData: ChartData[] = Object.entries(apiData).map(([key, value]) => ({
                    name: key,
                    value: value as number
                }));

                setAgeGroupData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchHouseHoldIncome = async () => {
            try{
                const url = ApiConfig.techcombank_panel.getCount.replace("{table_name}", "techcombank_panel").replace("{column_name}", "householdincome");
                const response = await axios.get(url);

                const apiData = response.data;

                const formattedData: ChartData[] = apiData.map((item: {householdincome: string, count: number}) => ({
                    name: item.householdincome,
                    value: item.count
                }));

                setHouseHoldIncomeData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchOccupation = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getOccupation);

                const apiData = response.data;

                const formattedData: ChartData[] = Object.entries(apiData).map(([key, value]) => ({
                    name: key,
                    value: value as number
                }));

                setOccupationData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchAUM = async () => {
            try{
                const url = ApiConfig.techcombank_panel.getCount.replace("{table_name}", "techcombank_panel").replace("{column_name}", "AUM");
                const response = await axios.get(url);

                const apiData = response.data;

                const formattedData: ChartData[] = apiData.map((item: {AUM: string, count: number}) => ({
                    name: item.AUM,
                    value: item.count
                }));

                setAUMData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchMainBankData = async () => {
            try{
                const url = ApiConfig.techcombank_panel.getCount.replace("{table_name}", "techcombank_panel").replace("{column_name}", "Q4");
                const response = await axios.get(url);

                const apiData = response.data;

                const formattedData: ChartData[] = apiData.map((item: {Q4: string, count: number}) => ({
                    name: item.Q4,
                    value: item.count
                }));

                setMainBankData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchChannelData = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getChannels);

                const apiData = response.data;

                const attributesData: {[key: string]: number} = {};

                apiData.forEach((item: {category: string, attributes: { name: string, value: number }[]}) => {

                    if(Array.isArray(item.attributes)) {
                        item.attributes.forEach((attribute: { name: string, value: number }) => {
                            const { name, value } = attribute;
                            
                            if(attributesData[name])
                            {   
                                attributesData[name] += value;
                            }
                            else 
                            {
                                attributesData[name] = value;
                            }
                        });
                    };
                });
                
                const formattedData: ChartData[] = Object.keys(attributesData).map(key => ({
                    name: key,
                    value: attributesData[key]
                }));

                setChannelsData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchProductData = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getProducts);

                const apiData = response.data;

                const attributesData: {[key: string]: number} = {};

                apiData.forEach((item: {category: string, attributes: { name: string, value: number }[]}) => {

                    if(Array.isArray(item.attributes)) {
                        item.attributes.forEach((attribute: { name: string, value: number }) => {
                            const { name, value } = attribute;
                            
                            if(attributesData[name])
                            {   
                                attributesData[name] += value;
                            }
                            else 
                            {
                                attributesData[name] = value;
                            }
                        });
                    };
                });

                const formattedData: ChartData[] = Object.keys(attributesData).map(key => ({
                    name: key,
                    value: attributesData[key]
                }));

                setProductsData(formattedData);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }

        const fetchVennProductData = async () => {
            try{
                const response = await axios.get(ApiConfig.techcombank_panel.getVennProducts);
                setVennProductsData(response.data);
            }catch(error){
                if(axios.isAxiosError(error)){
                    console.error(error);
                    setIsError(true);
                    setStatusMessage(error.response?.data.message ?? error.message);
                }
            }
        }
        
        fetchPanellist();
        fetchTechcombankSurvey();
        fetchTotalMembers();
        fetchGenderDistribution();
        fetchResource();
        fetchProvince();
        fetchAgeGroup();
        fetchHouseHoldIncome();
        fetchOccupation();
        fetchAUM();
        fetchMainBankData();
        fetchChannelData();
        fetchProductData();
    }, []);

    const calculateAverageRespondRate = (data: {respond_rate: number}[]) => {
        const total = data.reduce((acc, item) => acc + item.respond_rate, 0);
        return total / data.length;
    }

    const calculateTotalSamplesize = (data: {completed_qualified: number}[]) => {
        return data.reduce((acc, item) => acc + item.completed_qualified, 0);
    }

    return (
        <Grid container spacing={3}>
            <Grid lg={3} sm={6} xs={12}>
                <SummaryWidget title={t('dashboard.total_members')} widget_name="user" trend="up" avatar_color_index={0} value={dataTotalMembers} />
            </Grid>
            <Grid lg={3} sm={6} xs={12}>
                <SummaryWidget title={t('dashboard.number_of_surveys')} widget_name="chat" trend='down' avatar_color_index={1} value={numeral(surveys.length).format('0,000')} />
            </Grid>
            <Grid lg={3} sm={6} xs={12}>
                <SummaryWidget title={t('dashboard.response_rate')} widget_name="percent" trend='down' avatar_color_index={2} value={numeral(calculateAverageRespondRate(surveys)).format('0.00%')} />
            </Grid>
            <Grid lg={3} sm={6} xs={12}>
                <SummaryWidget title={t('dashboard.completed_qualified')} widget_name="flag" trend='up' avatar_color_index={3} value={numeral(calculateTotalSamplesize(surveys)).format('0,000')} />
            </Grid>
            <Grid lg={6} xs={12}>
                <RecruitmentWidget title={t('dashboard.number_of_panelist')} data={panellistData} />
            </Grid>
            <Grid lg={6} md={6} xs={12}>
                <DemographicWidget ageGroupData={ageGroupData} genderData={genderDistributionData} provinceData={provinceData} />
            </Grid>
            <Grid lg={6} md={6} xs={12}>
                <BarChartWidget title={t('dashboard.house_hold_income')} legend_title='Thu nhập cá nhân' data={houseHoldIncomeData} sorted={false} sortedList={['Từ 12.5 triệu đến dưới 25 triệu VND/tháng','Từ 25 triệu đến dưới 35 triệu VND/tháng','Từ 35 triệu đến dưới 45 triệu VND/tháng','Từ 45 triệu đến dưới 60 triệu VND/tháng','Từ 60 triệu đến dưới 80 triệu VND/tháng','Từ 80 triệu đến dưới 110 triệu VND/tháng']} translate={true} />
            </Grid>
            <Grid lg={6} md={6} xs={12}>
                <BarChartWidget title={t('dashboard.occupation')} legend_title='Nghề nghiệp' data={occupationData} sorted={true} translate={true}/>
            </Grid>
            <Grid lg={6} md={6} xs={12}>
                <BarChartWidget title='AUM' legend_title='AUM' data={aumData} sorted={true} translate={true} />
            </Grid>
            <Grid lg={6} md={6} xs={12}>
                <BarChartWidget title={t('dashboard.main_bank')} legend_title='Main Bank' data={mainBankData} sorted={true} />
            </Grid>
            <Grid lg={6} md={6} xs={12}>
                <BarChartWidget title={t('dashboard.products')} legend_title='Products' data={productsData} sorted={true} />
            </Grid>
            <Grid lg={6} md={6} xs={12}>
                <BarChartWidget title={t('dashboard.channels')} legend_title='Channels' data={channelsData} sorted={true} />
            </Grid>
        </Grid>
    );
};

export default Panellist;