import { useEffect, useState } from "react";
import Directional from "../../components/Directional/Directional";
import ListReportsTable from "./tables/ListReportsTable";
import { Survey } from "./Panellist";
import axios from "axios";
import { ApiConfig } from "../../config/ApiConfig";

const Products: React.FC = () => {
    const [statusMessage, setStatusMessage] = useState("");
    const [isError, setIsError] = useState<boolean | null>(null);
    
    const [ surveys, setSurveys ] = useState<Survey[]>([]);
    
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

        fetchTechcombankSurvey();
    },[]);
    
    return (
        <>
            <Directional title="Products" />
            <ListReportsTable surveys={surveys.filter((item) => item.engagment === 'Project')}></ListReportsTable>
        </>
    )
}

export default Products;