import { useEffect, useState } from "react";
import axios from "axios";
import { InputProvider } from "../../contexts/InputContext";
import Directional from "../../components/Directional/Directional";
import MerchantInfor from "./MerchantInfor";
import TransactionsManager from "../Transaction/Transactions";
import { Box } from "@mui/material";
import Grid from '@mui/material/Grid';
import SummaryWidget from "../../components/Widgets/SummaryWidget";
import { ApiConfig } from "../../config/ApiConfig";
import numeral from "numeral";
import { useVisibility } from "../../hook/useVisibility";

interface VinnectAccountData {
  deposited: number,
  spent: number,
  balance: number
}

const VinnetManagement = () => {
  const token = localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const { canView } = useVisibility();
  
  
  const [isError, setIsError] = useState(false);
  const [statusMessage, setStatusMessage] = useState(''); 
  const [loading, setLoading] = useState(false);

  const [ vinnetAccount, setVinnetAccount ] = useState<VinnectAccountData>({
    deposited: 0,
    spent: 0,
    balance: 0
  });

  useEffect(() => {
    setLoading(true);

    const fetchMerchantAccount = async () => {
      try {
        const response = await axios.get(ApiConfig.vinnet.viewMerchantAccount, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });
        
        const rawAccountData: string = response.data.data;
        const parsedData = JSON.parse(rawAccountData);

        // "{"deposited":1.2E7,"spent":7317700.0,"balance":4682300.0}"
        const vinnetAccountData: VinnectAccountData = {
          deposited: Number(parsedData.deposited),
          spent: Number(parsedData.spent),
          balance: Number(parsedData.balance),
        };


        setVinnetAccount(vinnetAccountData);
      } catch(error){
        setIsError(true);

        let errorMessage = '';

        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data.message ?? error.message;
        } else {
            errorMessage = (error as Error).message;
        }

        setStatusMessage(errorMessage);
        console.error('Error:', errorMessage); 
      } finally {
        setLoading(false);
      }
    }

    fetchMerchantAccount();
  }, [])

  useEffect(() => {
  }, [vinnetAccount]); // This effect runs whenever vinnetAccount is updated


  return (
    <InputProvider>
      <Directional title="Vinnet Management" />
      <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={2}>
          {canView("transactions.components.visible_deposited") && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryWidget title='DEPOSITED' widget_name='bank' avatar_color_index={0} value={numeral(vinnetAccount.deposited).format('0,000') } />
            </Grid>
          )}
          {canView("transactions.components.visible_spent") && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryWidget title='SPENT' widget_name='money' avatar_color_index={1} value={numeral(vinnetAccount.spent).format('0,000') } />
            </Grid>
          )}
          {canView("transactions.components.visible_balance") && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryWidget title='BALANCE' widget_name='dollar' avatar_color_index={2} value={numeral(vinnetAccount.balance).format('0,000')} />
            </Grid>
          )}
          {canView("transactions.components.visible_transactions") && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryWidget title='TRANSACTIONS' widget_name='dollar' avatar_color_index={3} value={'1000'} />
            </Grid>
          )}
          {canView("transactions.components.visible_merchantinfor") && (
            <Grid size={{ xs: 6, md: 12 }}>
              <MerchantInfor />
            </Grid>
          )}
          {canView("transactions.components.visible_transactionsmanager") && (
            <Grid size={{ xs: 6, md: 12 }}>
              <TransactionsManager />
            </Grid>
          )}
        </Grid>
      </Box>
    </InputProvider>
  );
};

export default VinnetManagement;
