import axios from "axios";
import { useEffect, useState } from "react";
import { ApiConfig } from "../config/ApiConfig";
import { DepositVoidResult, GotItDeposit } from "../config/FinanceConfig";

interface gotitAccountData {
    deposited: number,
    spent: number,
    balance: number
}

const toAccount = (data: gotitAccountData): gotitAccountData => ({
    deposited: data.deposited,
    spent: data.spent,
    balance: data.balance
});

export function useGotItAccount(accountType: string){
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState(false);
    const [ message, setMessage ] = useState("");

    const [ gotitAccount, setGotItAccount ] = useState<gotitAccountData>({
        deposited: 0,
        spent: 0,
        balance: 0
    });

    const getAccount = async () => {
        try{
            if(!accountType) return;

            setError(false);
            setLoading(true);

            const token = localStorage.getItem('authToken');

            const res = await axios.get(ApiConfig.gotit.viewGotItAccount.replace("{accountType}", accountType), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });

            setGotItAccount(res.data);
        }catch(error){
            setError(true);
        } finally{
            setLoading(false);
        }
    }
    
    // Resolves to the saved deposit (so it can be undone), or null when it was not saved and the form should stay open.
    const addDeposit = async (amount: string, note: string): Promise<GotItDeposit | null> => {
        try{
            setError(false);
            setLoading(true);

            const token = localStorage.getItem('authToken');

            const res = await axios.post(ApiConfig.gotit.depositedAccount, {
                'account_type': 'gotit',
                'amount': amount,
                'note': note.trim() || null
            },{
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setGotItAccount(toAccount(res.data));
            return res.data.deposit;
        } catch(error){
            setError(true);
            return null;
        } finally {
            setLoading(false);
        }
    }

    const voidDeposit = async (depositId: number, reason: string): Promise<DepositVoidResult> => {
        try{
            setLoading(true);

            const token = localStorage.getItem('authToken');

            const res = await axios.post(ApiConfig.gotit.voidDeposit.replace('{depositId}', depositId.toString()), { reason }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setGotItAccount(toAccount(res.data));
            return "voided";
        } catch(error){
            if (axios.isAxiosError(error) && error.response?.status === 409) return "alreadyVoided";
            return "failed";
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getAccount();
    }, [accountType]);

    return {
        loading,
        gotitAccount,
        addDeposit,
        voidDeposit,
        getAccount
    }
}